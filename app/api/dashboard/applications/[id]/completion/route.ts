import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { checkLiveDateMaturation, getRequiredMaturationDays } from '@/lib/utils/completion-timeline-utils'
import { getAppliedProfile, isProfileLinkedToUser } from '@/lib/instagram-utils'
import { InstagramLogService } from '@/lib/services/instagram-log.service'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { live_date, deliverable_link, supporting_document, notes, views_count, custom_responses, confirmed_instagram_username } = body

    if (!live_date) {
      return NextResponse.json({ error: 'Live date is required' }, { status: 400 })
    }

    if (!deliverable_link && !supporting_document) {
      return NextResponse.json({ error: 'At least one deliverable live link or proof document is required' }, { status: 400 })
    }

    // Verify application ownership and fetch campaign timeline settings
    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select(`
        id,
        user_id,
        form_data,
        status,
        campaigns (
          id,
          brand_name,
          campaign_code,
          completion_days
        ),
        users (
          instagram_username
        )
      `)
      .eq('id', id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const campaignConfig = Array.isArray(application.campaigns)
      ? application.campaigns[0]
      : application.campaigns

    // Enforce Live Date Maturation Gap based on campaign settings
    const minMaturationDays = getRequiredMaturationDays(campaignConfig)
    const maturation = checkLiveDateMaturation(live_date, minMaturationDays)
    if (!maturation.canSubmit) {
      return NextResponse.json({ error: maturation.message }, { status: 400 })
    }

    // ─── INSTAGRAM PROFILE CONSISTENCY VERIFICATION ───
    const applied = getAppliedProfile(application)

    if (applied.username) {
      // 1. Verify creator still has this profile actively linked
      const { linked, profile: linkedProfile } = await isProfileLinkedToUser(payload.id, {
        username: applied.username,
        profileId: applied.profileId
      })

      if (!linked) {
        const { data: userProfiles } = await supabase
          .from('user_instagram_profiles')
          .select('username')
          .eq('user_id', payload.id)

        const currentHandles = userProfiles?.map(p => `@${p.username}`) || []

        InstagramLogService.log({
          event_type: 'COMPLETION_BLOCKED_MISMATCH',
          user_id: payload.id,
          application_id: id,
          campaign_id: campaignConfig?.id,
          old_username: applied.username,
          actor: { type: 'creator', id: payload.id },
          reason: `Applied profile @${applied.username} is not actively linked to creator account`,
          metadata: { linkedHandles: currentHandles, deliverable_link },
          request
        }).catch(() => {})

        return NextResponse.json({
          code: 'PROFILE_MISMATCH',
          error: `This campaign was applied with Instagram profile @${applied.username}, which is not currently linked in your Profile. Please link @${applied.username} in your profile or contact your campaign manager to update your profile.`,
          appliedUsername: applied.username,
          linkedProfiles: currentHandles
        }, { status: 409 })
      }

      // 2. If deliverable link contains a username prefix, check for match
      if (deliverable_link) {
        const urlMatch = String(deliverable_link).match(/instagram\.com\/([A-Za-z0-9._]+)\/(reel|p|tv)\//i)
        if (urlMatch) {
          const urlUser = urlMatch[1].toLowerCase()
          if (!['reel', 'p', 'tv', 'reels', 'stories'].includes(urlUser)) {
            if (applied.normalized && urlUser !== applied.normalized) {
              InstagramLogService.log({
                event_type: 'COMPLETION_BLOCKED_MISMATCH',
                user_id: payload.id,
                application_id: id,
                campaign_id: campaignConfig?.id,
                old_username: applied.username,
                actor: { type: 'creator', id: payload.id },
                reason: `Deliverable link belongs to @${urlUser}, but application was locked to @${applied.username}`,
                metadata: { urlUser, deliverable_link },
                request
              }).catch(() => {})

              return NextResponse.json({
                code: 'PROFILE_MISMATCH',
                error: `Deliverable link is from Instagram account @${urlUser}, but your approved application is locked to @${applied.username}. Please post from @${applied.username} or contact your campaign manager.`,
                appliedUsername: applied.username,
                postedUsername: urlUser
              }, { status: 409 })
            }
          }
        }
      }
    }

    const currentFormData = application.form_data || {}
    const existingSubmission = currentFormData.completion_submission
    const existingHistory = Array.isArray(currentFormData.completion_history)
      ? currentFormData.completion_history
      : []

    const updatedHistory = [...existingHistory]
    if (existingSubmission && (existingSubmission.live_date || existingSubmission.deliverable_link || existingSubmission.supporting_document)) {
      updatedHistory.push({
        ...existingSubmission,
        archived_at: new Date().toISOString(),
        attempt: existingHistory.length + 1,
        rejection_reason: currentFormData.rejection_reason || undefined,
        previous_status: application.status,
      })
    }

    const updatedFormData = {
      ...currentFormData,
      completion_submission: {
        live_date,
        deliverable_link: deliverable_link || '',
        supporting_document: supporting_document || '',
        views_count: views_count || '',
        notes: notes || '',
        custom_responses: custom_responses || {},
        posted_from_handle: applied.username || null,
        posted_from_profile_id: applied.profileId || null,
        verification_method: 'self_declared',
        submitted_at: new Date().toISOString(),
        attempt: updatedHistory.length + 1,
      },
      completion_history: updatedHistory,
      completion_approved: null,
      rejection_reason: null,
    }

    const { error: updateErr } = await supabase
      .from('applications')
      .update({
        form_data: updatedFormData,
        completion_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    InstagramLogService.log({
      event_type: 'COMPLETION_PROFILE_CONFIRMED',
      user_id: payload.id,
      application_id: id,
      campaign_id: campaignConfig?.id,
      new_username: applied.username,
      profile_id: applied.profileId,
      actor: { type: 'creator', id: payload.id },
      metadata: {
        deliverable_link,
        live_date,
        views_count,
        attempt: updatedHistory.length + 1
      },
      request
    }).catch(() => {})

    return NextResponse.json({
      success: true,
      message: 'Campaign completion deliverables submitted successfully!',
    })
  } catch (err: any) {
    console.error('Completion Submission Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to submit completion' }, { status: 500 })
  }
}

