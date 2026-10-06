import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'
import {
  extractInstagramUsername,
  normalizeInstagramUsername,
  checkInstagramHandleAvailability,
  getAppliedProfile,
  ensureProfileLinked,
  isProfileLinkedToUser
} from '@/lib/instagram-utils'
import { InstagramLogService } from '@/lib/services/instagram-log.service'

// ─── GET: Fetch profile consistency details & history for an application ───
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const { data: application, error } = await supabase
      .from('applications')
      .select(`
        id,
        user_id,
        campaign_id,
        status,
        form_data,
        campaigns (
          id,
          brand_name,
          campaign_code
        ),
        users (
          id,
          full_name,
          mobile,
          instagram_username,
          instagram_profiles
        )
      `)
      .eq('id', id)
      .single()

    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const applied = getAppliedProfile(application)

    // Fetch user's currently linked profiles from user_instagram_profiles table
    const { data: linkedProfiles } = await supabase
      .from('user_instagram_profiles')
      .select('*')
      .eq('user_id', application.user_id)
      .order('is_primary', { ascending: false })

    const { linked } = await isProfileLinkedToUser(application.user_id, {
      username: applied.username,
      profileId: applied.profileId
    })

    const user: any = Array.isArray(application.users) ? application.users[0] : application.users

    const isMismatch = Boolean(applied.username && !linked)
    const isDifferentFromPrimary = Boolean(
      applied.normalized &&
      user?.instagram_username &&
      applied.normalized !== normalizeInstagramUsername(user.instagram_username)
    )

    // Fetch logs for this application
    const logs = await InstagramLogService.getLogsForApplication(id)

    return NextResponse.json({
      applicationId: id,
      userId: application.user_id,
      creatorName: user?.full_name,
      creatorMobile: user?.mobile,
      applied,
      primaryUsername: user?.instagram_username || null,
      isMismatch,
      isDifferentFromPrimary,
      linkedProfiles: linkedProfiles || [],
      logs
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch profile details' }, { status: 500 })
  }
}

// ─── PUT: Admin overrides the application's Instagram profile ───
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { username, reason, make_primary } = body

    if (!username || !username.trim()) {
      return NextResponse.json({ error: 'Instagram username is required' }, { status: 400 })
    }

    if (!reason || reason.trim().length < 4) {
      return NextResponse.json({
        error: 'A detailed reason (at least 4 characters) is required for audit compliance.'
      }, { status: 400 })
    }

    const cleanedUsername = extractInstagramUsername(username)
    const normalizedUsername = normalizeInstagramUsername(cleanedUsername)

    if (!cleanedUsername) {
      return NextResponse.json({ error: 'Invalid Instagram username' }, { status: 400 })
    }

    // 1. Fetch current application
    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select(`
        id,
        user_id,
        campaign_id,
        status,
        form_data,
        campaigns (
          id,
          brand_name,
          campaign_code
        ),
        users (
          id,
          full_name,
          instagram_username
        )
      `)
      .eq('id', id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const oldApplied = getAppliedProfile(application)

    // 2. Check cross-account uniqueness
    const availability = await checkInstagramHandleAvailability(cleanedUsername, application.user_id)
    if (!availability.available) {
      return NextResponse.json({
        error: availability.message || `Instagram handle (@${cleanedUsername}) is already linked to another creator.`
      }, { status: 409 })
    }

    // 3. Ensure profile is linked to the creator in user_instagram_profiles & users table
    const linkResult = await ensureProfileLinked(
      application.user_id,
      cleanedUsername,
      `admin:${admin.id}`,
      { makePrimary: Boolean(make_primary) }
    )

    if (!linkResult.success || !linkResult.profile) {
      return NextResponse.json({
        error: linkResult.error || 'Failed to link Instagram profile to creator account'
      }, { status: 500 })
    }

    const linkedProfile = linkResult.profile

    // 4. Update application's form_data
    const currentFormData = application.form_data || {}
    const existingOverrideHistory = Array.isArray(currentFormData.profile_override_history)
      ? currentFormData.profile_override_history
      : []

    const overrideRecord = {
      changed_by_id: admin.id,
      changed_by_name: admin.name || admin.email,
      changed_at: new Date().toISOString(),
      reason: reason.trim(),
      old_username: oldApplied.username,
      new_username: cleanedUsername,
      new_profile_id: linkedProfile.id,
      acknowledged_at: null
    }

    const updatedFormData = {
      ...currentFormData,
      applied_instagram_username: cleanedUsername,
      applied_instagram_profile_id: linkedProfile.id,
      applied_instagram_followers: linkedProfile.followers || 0,
      applied_instagram_locked_at: new Date().toISOString(),
      profile_override: overrideRecord,
      profile_override_history: [...existingOverrideHistory, overrideRecord]
    }

    const { error: updateErr } = await supabase
      .from('applications')
      .update({
        form_data: updatedFormData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    // 5. Await the primary audit log entry for this admin action
    await InstagramLogService.log({
      event_type: 'ADMIN_APPLICATION_PROFILE_CHANGED',
      user_id: application.user_id,
      application_id: id,
      campaign_id: application.campaign_id,
      profile_id: linkedProfile.id,
      old_username: oldApplied.username,
      new_username: cleanedUsername,
      actor: {
        type: 'admin',
        id: admin.id,
        name: admin.name || admin.email
      },
      reason: reason.trim(),
      metadata: {
        makePrimary: Boolean(make_primary),
        campaign_code: (application.campaigns as any)?.campaign_code,
        brand_name: (application.campaigns as any)?.brand_name,
        isNewProfileToUser: linkResult.isNew
      },
      request
    })

    // If it was newly linked to the user, log that event too
    if (linkResult.isNew) {
      InstagramLogService.log({
        event_type: 'PROFILE_LINKED',
        user_id: application.user_id,
        profile_id: linkedProfile.id,
        new_username: cleanedUsername,
        actor: {
          type: 'admin',
          id: admin.id,
          name: admin.name || admin.email
        },
        metadata: {
          added_for_application_id: id,
          source: 'admin_application_override'
        },
        request
      }).catch(() => {})
    }

    return NextResponse.json({
      success: true,
      message: `Application Instagram profile updated to @${cleanedUsername} and linked to creator's Profile section.`,
      applied: {
        username: cleanedUsername,
        profileId: linkedProfile.id,
        followers: linkedProfile.followers
      },
      profile: linkedProfile
    })
  } catch (err: any) {
    console.error('Admin profile override error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update Instagram profile' }, { status: 500 })
  }
}
