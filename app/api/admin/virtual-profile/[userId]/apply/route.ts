import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'
import { checkFollowerEligibility, getEffectiveUserFollowers } from '@/lib/utils/follower-utils'
import { checkCampaignLocationEligibility } from '@/lib/utils/location-utils'
import { extractProfileUpdatesFromFormData } from '@/lib/utils/profile-sync-utils'
import { InstagramLogService } from '@/lib/services/instagram-log.service'
import { sendApplicationSubmittedEmail } from '@/lib/mailer'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'influencers')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // STRICT RBAC: Only Super Admins can apply on behalf of creators
    if (!admin.is_super_admin) {
      return NextResponse.json({
        error: 'Access Denied: Only Super Administrators have permission to apply on behalf of creators.'
      }, { status: 403 })
    }

    const { userId } = await params
    const body = await request.json()
    const { campaignId, formData, selectedStore, selectedInstagramProfile } = body

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Concurrent check: fetch creator user and campaign details
    const [
      { data: user, error: userError },
      { data: campaign, error: campaignError },
      { data: existing }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, full_name, followers, instagram_username, instagram_profiles, state, city, shipping_addresses, dob, custom_attributes, gender, pincode, alt_mobile, shoe_size, tshirt_size, bio, youtube, languages')
        .eq('id', userId)
        .single(),
      supabase
        .from('campaigns')
        .select('id, status, is_live, brand_name, campaign_code, min_followers, enforce_followers, followers, location, location_type, target_states, target_cities, enforce_location, form_fields, is_test_mode, test_user_ids, manager_phone')
        .eq('id', campaignId)
        .single(),
      supabase
        .from('applications')
        .select('id, status')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .maybeSingle()
    ])

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Creator not found' },
        { status: 404 }
      )
    }

    if (campaignError || !campaign || campaign.status !== 'Active' || !campaign.is_live) {
      return NextResponse.json(
        { error: 'This campaign is no longer accepting applications' },
        { status: 400 }
      )
    }

    // Resolve and validate creator's Instagram profile
    let verifiedSelectedProfile: { id?: string | null; username: string; followers: number } | null = null

    const { data: dbUserProfiles } = await supabase
      .from('user_instagram_profiles')
      .select('id, username, followers, is_primary')
      .eq('user_id', userId)

    if (selectedInstagramProfile) {
      const targetUser = String(selectedInstagramProfile.username || '').replace(/^@/, '').trim().toLowerCase()
      const match = dbUserProfiles?.find(
        p => (selectedInstagramProfile.id && p.id === selectedInstagramProfile.id) ||
             (targetUser && p.username.toLowerCase() === targetUser)
      )
      if (match) {
        verifiedSelectedProfile = {
          id: match.id,
          username: match.username,
          followers: match.followers || 0
        }
      } else if (selectedInstagramProfile.username) {
        if (user.instagram_username && user.instagram_username.toLowerCase() === targetUser) {
          verifiedSelectedProfile = {
            id: null,
            username: user.instagram_username,
            followers: user.followers || 0
          }
        }
      }
    }

    // Default fallback to primary profile if none selected
    if (!verifiedSelectedProfile && dbUserProfiles && dbUserProfiles.length > 0) {
      const primary = dbUserProfiles.find(p => p.is_primary) || dbUserProfiles[0]
      verifiedSelectedProfile = {
        id: primary.id,
        username: primary.username,
        followers: primary.followers || 0
      }
    } else if (!verifiedSelectedProfile && user.instagram_username) {
      verifiedSelectedProfile = {
        id: null,
        username: user.instagram_username,
        followers: user.followers || 0
      }
    }

    let effectiveFollowers = verifiedSelectedProfile?.followers ?? getEffectiveUserFollowers(
      user,
      selectedInstagramProfile?.id || selectedInstagramProfile?.username
    )
    if (selectedInstagramProfile && selectedInstagramProfile.followers !== undefined && selectedInstagramProfile.followers !== null) {
      const parsedSelected = typeof selectedInstagramProfile.followers === 'number'
        ? selectedInstagramProfile.followers
        : (parseInt(String(selectedInstagramProfile.followers).replace(/\D/g, ''), 10) || 0)
      if (parsedSelected > 0) {
        effectiveFollowers = parsedSelected
      }
    }

    // Enforce follower minimum if campaign enforces it
    if (campaign.enforce_followers) {
      const eligibility = checkFollowerEligibility(effectiveFollowers, campaign)
      if (!eligibility.eligible) {
        return NextResponse.json(
          { error: eligibility.message || 'Creator does not meet minimum follower requirements for this campaign' },
          { status: 400 }
        )
      }
    }

    // Enforce location requirements if campaign enforces it
    if (campaign.enforce_location) {
      const locationEligibility = checkCampaignLocationEligibility(campaign, user)
      if (!locationEligibility.isEligible) {
        return NextResponse.json(
          { error: locationEligibility.reason || `This campaign is restricted to creators with an address in ${locationEligibility.requiredLocationText}` },
          { status: 400 }
        )
      }
    }

    // Enrich form_data with locked Instagram profile details and admin attribution
    const lockedAt = new Date().toISOString()
    const enrichedFormData = {
      ...(formData || {}),
      applied_by_admin: true,
      applied_by_admin_id: admin.id,
      applied_by_admin_name: admin.name || 'Super Admin',
      applied_by_admin_email: admin.email,
      applied_via: 'virtual_profile',
      ...(verifiedSelectedProfile ? {
        applied_instagram_username: verifiedSelectedProfile.username,
        applied_instagram_profile_id: verifiedSelectedProfile.id || null,
        applied_instagram_followers: verifiedSelectedProfile.followers,
        applied_instagram_locked_at: lockedAt,
      } : {})
    }

    // Handle existing application
    if (existing) {
      if (existing.status === 'Rejected') {
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            form_data: enrichedFormData,
            selected_store: selectedStore || (formData?.preferred_store ? { name: formData.preferred_store } : null),
            status: 'Applied',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateError) throw updateError

        if (verifiedSelectedProfile) {
          InstagramLogService.log({
            event_type: 'APPLICATION_PROFILE_LOCKED',
            user_id: userId,
            application_id: existing.id,
            campaign_id: campaignId,
            profile_id: verifiedSelectedProfile.id || null,
            new_username: verifiedSelectedProfile.username,
            actor: {
              type: 'admin',
              id: admin.id,
              name: admin.name || 'Super Admin'
            },
            metadata: {
              followers: verifiedSelectedProfile.followers,
              campaign_code: campaign.campaign_code,
              brand_name: campaign.brand_name,
              is_reapply: true,
              applied_by_admin: true,
              admin_email: admin.email
            },
            request
          }).catch(err => console.error('[Virtual Profile Apply] Failed to log profile lock:', err))
        }

        return NextResponse.json({
          success: true,
          applicationId: existing.id,
          message: 'Application re-submitted successfully on behalf of creator!'
        })
      }

      return NextResponse.json(
        { error: 'This creator has already applied to this campaign' },
        { status: 409 }
      )
    }

    // Insert new application for the target creator userId
    const { data: application, error: insertError } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        form_data: enrichedFormData,
        selected_store: selectedStore || (formData?.preferred_store ? { name: formData.preferred_store } : null),
        status: 'Applied',
        manager_phone: campaign?.manager_phone || null,
      })
      .select('id')
      .single()

    if (insertError) throw insertError

    if (verifiedSelectedProfile) {
      InstagramLogService.log({
        event_type: 'APPLICATION_PROFILE_LOCKED',
        user_id: userId,
        application_id: application.id,
        campaign_id: campaignId,
        profile_id: verifiedSelectedProfile.id || null,
        new_username: verifiedSelectedProfile.username,
        actor: {
          type: 'admin',
          id: admin.id,
          name: admin.name || 'Super Admin'
        },
        metadata: {
          followers: verifiedSelectedProfile.followers,
          campaign_code: campaign.campaign_code,
          brand_name: campaign.brand_name,
          is_reapply: false,
          applied_by_admin: true,
          admin_email: admin.email
        },
        request
      }).catch(err => console.error('[Virtual Profile Apply] Failed to log profile lock:', err))
    }

    // Background non-blocking sync: Auto-sync answers to Creator Profile & send email
    Promise.resolve().then(async () => {
      try {
        if (formData && typeof formData === 'object' && Object.keys(formData).length > 0) {
          const { profileUpdates, hasChanges } = extractProfileUpdatesFromFormData(formData, user, campaign.form_fields)
          if (hasChanges && Object.keys(profileUpdates).length > 0) {
            profileUpdates.updated_at = new Date().toISOString()
            await supabase.from('users').update(profileUpdates).eq('id', userId)
          }
        }
        if (user?.email) {
          await sendApplicationSubmittedEmail(
            user.email,
            user.full_name || 'Creator',
            campaign.brand_name,
            campaign.campaign_code
          )
        }
      } catch (bgErr) {
        console.error('[Virtual Profile Apply] Background post-process error:', bgErr)
      }
    })

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully on behalf of creator!'
    })
  } catch (err: any) {
    console.error('API /admin/virtual-profile/[userId]/apply Error:', err)
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'This creator has already applied to this campaign' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: err.message || 'Failed to submit application on behalf of creator' },
      { status: 500 }
    )
  }
}
