import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { sendApplicationSubmittedEmail } from '@/lib/mailer'
import { checkFollowerEligibility } from '@/lib/utils/follower-utils'
import { checkCampaignLocationEligibility } from '@/lib/utils/location-utils'
import { checkCreatorCompletionEligibility } from '@/lib/utils/completion-timeline-utils'
import { generateSequentialInfluencerId } from '@/lib/user-utils'
import { extractProfileUpdatesFromFormData } from '@/lib/utils/profile-sync-utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { campaignId, formData, mobile, verifiedUserId, guestProfile, selectedStore, selectedInstagramProfile } = body

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Verify user is logged in
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    let userId = ''

    if (token) {
      const payload = await verifyToken(token)
      if (!payload || !payload.id) {
        return NextResponse.json(
          { error: 'Invalid session. Please log in again.' },
          { status: 401 }
        )
      }
      userId = payload.id

      // Verify the user actually still exists in DB (handle stale cookies from deleted accounts)
      const { data: dbUser } = await supabase.from('users').select('id').eq('id', userId).single()
      if (!dbUser) {
        return NextResponse.json(
          { error: 'Your account appears to have been deleted. Please clear your cookies/return to home page.' },
          { status: 401 }
        )
      }
    } else if (verifiedUserId) {
      // Existing user who passed the email challenge
      userId = verifiedUserId
      
      // Auto-login the verified user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, mobile, influencer_id')
        .eq('id', verifiedUserId)
        .single()
      
      if (existingUser) {
        const { encrypt } = await import('@/lib/auth')
        const newToken = await encrypt({ id: existingUser.id, mobile: existingUser.mobile, influencer_id: existingUser.influencer_id })
        cookieStore.set('auth_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30
        })
      } else {
        return NextResponse.json({ error: 'Session mismatch: User was deleted or not found. Please refresh and try again.' }, { status: 400 })
      }
    } else if (mobile) {
      // Guest Checkout Logic — New user with profile data
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('mobile', mobile)
        .single()
        
      if (existingUser) {
        userId = existingUser.id
      } else {
        // Generate a sequential, unique influencer ID checking against the DB
        const newInfluencerId = await generateSequentialInfluencerId()
        
        // Check Instagram handle availability if provided
        let cleanedInsta = ''
        let normalizedInsta = ''
        if (guestProfile?.instagram_username) {
          const { extractInstagramUsername, checkInstagramHandleAvailability } = await import('@/lib/instagram-utils')
          cleanedInsta = extractInstagramUsername(guestProfile.instagram_username)
          if (cleanedInsta) {
            const avail = await checkInstagramHandleAvailability(cleanedInsta)
            if (!avail.available) {
              return NextResponse.json({
                error: avail.message || `Instagram profile (@${cleanedInsta}) is already registered with another account.`
              }, { status: 409 })
            }
            normalizedInsta = avail.normalized
          }
        }

        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{
             full_name: guestProfile?.full_name || 'Guest Creator',
             mobile: mobile,
             email: guestProfile?.email || `${mobile}@guest.1to7.com`,
             password_hash: '$2b$10$vysFdPLELlPEvtXf1B5kneSq1OV0iEtxOUlf4LpwKfGXmenL1jUpm',
             influencer_id: newInfluencerId,
             is_mobile_verified: false,
             is_email_verified: false,
             instagram_username: cleanedInsta || null,
             followers: guestProfile?.followers ? parseInt(guestProfile.followers, 10) : 0,
             gender: guestProfile?.gender || null,
             state: guestProfile?.state || null,
             city: guestProfile?.city || null
          }])
          .select('id, influencer_id, mobile')
          .single()

        if (insertError) {
          console.error('CRITICAL GUEST INSERT ERROR:', insertError)
          throw new Error(`DB Error: ${insertError.message} (Code: ${insertError.code})`)
        }
        
        userId = newUser.id

        // Link in user_instagram_profiles
        if (cleanedInsta && normalizedInsta && newUser?.id) {
          const { data: newProfile } = await supabase
            .from('user_instagram_profiles')
            .insert([{
              user_id: newUser.id,
              username: cleanedInsta,
              normalized_username: normalizedInsta,
              followers: guestProfile?.followers ? parseInt(guestProfile.followers, 10) : 0,
              is_primary: true
            }])
            .select()
            .single()

          if (newProfile) {
            await supabase
              .from('users')
              .update({
                instagram_profiles: [
                  {
                    id: newProfile.id,
                    username: newProfile.username,
                    normalized_username: newProfile.normalized_username,
                    followers: newProfile.followers,
                    is_primary: true,
                    created_at: newProfile.created_at
                  }
                ]
              })
              .eq('id', newUser.id)
          }
        }
        
        // Auto-login newly created user
        const { encrypt } = await import('@/lib/auth')
        const newToken = await encrypt({ id: newUser.id, mobile: newUser.mobile, influencer_id: newUser.influencer_id })
        cookieStore.set('auth_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30
        })
      }
    } else {
      return NextResponse.json(
        { error: 'You must be logged in or provide a mobile number to apply' },
        { status: 401 }
      )
    }    // Execute all necessary verification reads in a single concurrent Promise.all batch
    const [
      { data: user, error: userError },
      { data: campaign, error: campaignError },
      { data: userActiveApps },
      { data: existing }
    ] = await Promise.all([
      supabase
        .from('users')
        .select('id, email, full_name, followers, instagram_username, instagram_profiles, state, city, shipping_addresses, dob, custom_attributes, gender, pincode, alt_mobile, shoe_size, tshirt_size, bio, youtube, languages')
        .eq('id', userId)
        .single(),
      supabase
        .from('campaigns')
        .select('id, status, is_live, brand_name, campaign_code, min_followers, enforce_followers, followers, location, location_type, target_states, target_cities, enforce_location, form_fields')
        .eq('id', campaignId)
        .single(),
      supabase
        .from('applications')
        .select(`
          id,
          campaign_id,
          status,
          form_data,
          completion_deadline,
          is_delay_exempted,
          delay_exemption_reason,
          completion_submitted_at,
          created_at,
          updated_at,
          campaigns (
            id,
            brand_name,
            campaign_code,
            completion_days,
            completion_deadline,
            enforce_completion_deadline
          )
        `)
        .eq('user_id', userId)
        .in('status', ['Approved', 'Order Placed']),
      supabase
        .from('applications')
        .select('id, status')
        .eq('user_id', userId)
        .eq('campaign_id', campaignId)
        .single()
    ])

    // Verify user exists
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Your account appears to have been deleted. Please clear your cookies/return to home page.' },
        { status: 401 }
      )
    }

    // Check campaign exists and is active
    if (!campaign || campaign.status !== 'Active' || !campaign.is_live) {
      return NextResponse.json(
        { error: 'This campaign is no longer accepting applications' },
        { status: 400 }
      )
    }

    // Check if creator is blocked due to overdue completion submissions
    if (userActiveApps && userActiveApps.length > 0) {
      const completionEligibility = checkCreatorCompletionEligibility(userActiveApps as any)
      if (!completionEligibility.isEligible) {
        return NextResponse.json(
          {
            error: completionEligibility.message,
            code: 'COMPLETION_OVERDUE',
            overdueCampaigns: completionEligibility.blockedApplications,
          },
          { status: 403 }
        )
      }
    }

    // Determine effective followers based on creator's selected Instagram account
    let effectiveFollowers = user.followers || 0
    if (selectedInstagramProfile && selectedInstagramProfile.followers !== undefined && selectedInstagramProfile.followers !== null) {
      effectiveFollowers = typeof selectedInstagramProfile.followers === 'number'
        ? selectedInstagramProfile.followers
        : (parseInt(String(selectedInstagramProfile.followers), 10) || 0)
    }

    // Check follower requirements if campaign strictly enforces follower minimum
    if (campaign.enforce_followers) {
      const eligibility = checkFollowerEligibility(effectiveFollowers, campaign)
      if (!eligibility.eligible) {
        return NextResponse.json(
          { error: eligibility.message || 'You do not meet the minimum followers requirement for this campaign' },
          { status: 400 }
        )
      }
    }

    // Check location requirements if campaign strictly enforces location
    if (campaign.enforce_location) {
      const locationEligibility = checkCampaignLocationEligibility(campaign, user)
      if (!locationEligibility.isEligible) {
        return NextResponse.json(
          { error: locationEligibility.reason || `This campaign is restricted to creators with an address in ${locationEligibility.requiredLocationText}` },
          { status: 400 }
        )
      }
    }

    // Enrich form_data with selected Instagram profile details for admin and brand visibility
    const enrichedFormData = {
      ...(formData || {}),
      ...(selectedInstagramProfile ? {
        applied_instagram_username: selectedInstagramProfile.username,
        applied_instagram_followers: selectedInstagramProfile.followers,
      } : {})
    }

    // Handle existing application
    if (existing) {
      if (existing.status === 'Rejected') {
        // If rejected, allow re-application by updating the existing record
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

        // Background non-blocking: Auto-sync answers to Creator Profile & send email
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
            console.error('Background apply post-process error (Re-apply):', bgErr)
          }
        })
        
        return NextResponse.json({
          success: true,
          applicationId: existing.id,
          message: 'Application re-submitted successfully!'
        })
      }

      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 409 }
      )
    }

    // Insert new application
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        form_data: enrichedFormData,
        selected_store: selectedStore || (formData?.preferred_store ? { name: formData.preferred_store } : null),
        status: 'Applied'
      })
      .select('id')
      .single()

    if (error) throw error

    // Background non-blocking: Auto-sync answers to Creator Profile & send confirmation email
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
        console.error('Background apply post-process error:', bgErr)
      }
    })

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully!'
    })
  } catch (err: any) {
    console.error('API /apply CRITICAL ERROR:', err)
    
    // Handle unique constraint violation
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: err.message || 'Failed to submit application', details: err.toString() },
      { status: 500 }
    )
  }
}

