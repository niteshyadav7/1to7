import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'applications')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin permission required to view archived records' },
        { status: 403 }
      )
    }

    // 1. Fetch archived applications with creator and campaign details
    const { data: archivedApps, error: appsErr } = await supabase
      .from('applications')
      .select(`
        id,
        user_id,
        campaign_id,
        status,
        form_data,
        is_archived,
        archived_at,
        archived_by,
        archive_reason,
        team_remark,
        created_at,
        updated_at,
        users (
          id,
          full_name,
          influencer_id,
          email,
          mobile,
          instagram_username,
          followers,
          instagram_profile_pic,
          gender,
          state,
          city
        ),
        campaigns (
          id,
          brand_name,
          campaign_code,
          platform,
          budget_amount,
          budget_type
        )
      `)
      .or('is_archived.eq.true,status.eq.Archived')
      .order('archived_at', { ascending: false, nullsFirst: false })

    if (appsErr) {
      console.error('[GET /api/admin/applications/archive] Apps error:', appsErr)
      throw appsErr
    }

    // 2. Fetch archived creators / influencers
    const { data: archivedCreators, error: creatorsErr } = await supabase
      .from('users')
      .select(`
        id,
        full_name,
        influencer_id,
        email,
        mobile,
        instagram_username,
        followers,
        instagram_profile_pic,
        gender,
        state,
        city,
        is_archived,
        archived_at,
        archived_by,
        archive_reason,
        created_at
      `)
      .eq('is_archived', true)
      .order('archived_at', { ascending: false, nullsFirst: false })

    if (creatorsErr) {
      console.error('[GET /api/admin/applications/archive] Creators error:', creatorsErr)
      throw creatorsErr
    }

    const appsList = archivedApps || []
    const creatorsList = archivedCreators || []

    return NextResponse.json({
      success: true,
      applications: appsList,
      creators: creatorsList,
      stats: {
        totalArchivedApplications: appsList.length,
        totalArchivedCreators: creatorsList.length
      }
    })
  } catch (error: any) {
    console.error('API /admin/applications/archive GET error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to retrieve archived records' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'applications')) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin permission required to manage applications archive' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      applicationIds,
      applicationId,
      action = 'archive', // 'archive' | 'unarchive'
      dynamic_mode = 'hold', // 'hold' | 'reapply' | 'reset'
      reason = ''
    } = body

    const targetAppIds: string[] = Array.isArray(applicationIds)
      ? applicationIds.filter(Boolean)
      : applicationId
      ? [applicationId]
      : []

    if (targetAppIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one application ID is required' },
        { status: 400 }
      )
    }

    const adminIdentity = admin.email || admin.name || 'admin'
    const nowIso = new Date().toISOString()
    const cleanReason = reason.trim() || 'Marked by operations team'

    if (action === 'unarchive') {
      // 1. Fetch current applications to restore their pre-archive status if available
      const { data: existingApps, error: fetchErr } = await supabase
        .from('applications')
        .select('id, status, form_data')
        .in('id', targetAppIds)

      if (fetchErr) {
        console.error('[ApplicationArchive] Fetch existing applications error:', fetchErr)
        throw fetchErr
      }

      for (const app of (existingApps || [])) {
        const formData = (app.form_data && typeof app.form_data === 'object') ? { ...app.form_data } : {}
        const restoredStatus = formData._pre_archive_status || 'Applied'
        delete formData._pre_archive_status

        const { error: unarchiveErr } = await supabase
          .from('applications')
          .update({
            is_archived: false,
            archived_at: null,
            archived_by: null,
            archive_reason: null,
            status: restoredStatus,
            form_data: formData,
            updated_at: nowIso
          })
          .eq('id', app.id)

        if (unarchiveErr) {
          console.error('[ApplicationArchive] Unarchive update error:', unarchiveErr)
          throw unarchiveErr
        }
      }

      return NextResponse.json({
        success: true,
        action: 'unarchive',
        count: targetAppIds.length,
        message: `Successfully unarchived and restored ${targetAppIds.length} application${targetAppIds.length > 1 ? 's' : ''}`
      })
    }

    // ─── ARCHIVE ACTION ───
    if (dynamic_mode === 'reset') {
      // MODE: RESET / DELETE FRESH
      // Completely remove the application rows so creator sees 'Apply Now' fresh from scratch
      const { error: deleteErr } = await supabase
        .from('applications')
        .delete()
        .in('id', targetAppIds)

      if (deleteErr) {
        console.error('[ApplicationArchive] Delete error:', deleteErr)
        throw deleteErr
      }

      return NextResponse.json({
        success: true,
        action: 'reset',
        count: targetAppIds.length,
        message: `Successfully reset and deleted ${targetAppIds.length} application${targetAppIds.length > 1 ? 's' : ''}. Creator can apply fresh.`
      })
    } else if (dynamic_mode === 'reapply') {
      // MODE: ALLOW RE-APPLY
      // Mark as Rejected, do not archive, store clean rejection reason so creator sees Re-Apply button
      const { data: existingApps, error: fetchErr } = await supabase
        .from('applications')
        .select('id, form_data')
        .in('id', targetAppIds)

      if (fetchErr) {
        console.error('[ApplicationArchive] Fetch error for reapply:', fetchErr)
        throw fetchErr
      }

      for (const app of (existingApps || [])) {
        const formData = (app.form_data && typeof app.form_data === 'object') ? { ...app.form_data } : {}
        formData.rejection_reason = cleanReason
        formData.allow_reapply = true

        const { error: reapplyErr } = await supabase
          .from('applications')
          .update({
            status: 'Rejected',
            is_archived: false,
            archived_at: null,
            archived_by: null,
            archive_reason: null,
            form_data: formData,
            team_remark: `Rejected (Re-apply Allowed): ${cleanReason}`,
            team_remark_by: adminIdentity,
            team_remark_updated_at: nowIso,
            updated_at: nowIso
          })
          .eq('id', app.id)

        if (reapplyErr) {
          console.error('[ApplicationArchive] Reapply error:', reapplyErr)
          throw reapplyErr
        }
      }

      return NextResponse.json({
        success: true,
        action: 'reapply',
        count: targetAppIds.length,
        message: `Marked ${targetAppIds.length} application${targetAppIds.length > 1 ? 's' : ''} as Rejected with Re-apply enabled.`
      })
    } else {
      // MODE: HOLD / ARCHIVED (Default)
      // Save pre-archive status, mark is_archived = true and status = 'Archived'
      // Completely hidden from creator frontend
      const { data: existingApps, error: fetchErr } = await supabase
        .from('applications')
        .select('id, status, form_data')
        .in('id', targetAppIds)

      if (fetchErr) {
        console.error('[ApplicationArchive] Fetch error for hold archive:', fetchErr)
        throw fetchErr
      }

      for (const app of (existingApps || [])) {
        const formData = (app.form_data && typeof app.form_data === 'object') ? { ...app.form_data } : {}
        if (!formData._pre_archive_status) {
          formData._pre_archive_status = app.status
        }

        const { error: archiveErr } = await supabase
          .from('applications')
          .update({
            is_archived: true,
            archived_at: nowIso,
            archived_by: adminIdentity,
            archive_reason: cleanReason,
            status: 'Archived',
            form_data: formData,
            team_remark: `Archived: ${cleanReason}`,
            team_remark_by: adminIdentity,
            team_remark_updated_at: nowIso,
            updated_at: nowIso
          })
          .eq('id', app.id)

        if (archiveErr) {
          console.error('[ApplicationArchive] Archive update error:', archiveErr)
          throw archiveErr
        }
      }

      return NextResponse.json({
        success: true,
        action: 'archive',
        dynamic_mode: 'hold',
        count: targetAppIds.length,
        message: `Successfully moved ${targetAppIds.length} application${targetAppIds.length > 1 ? 's' : ''} to Archived / Hold queue.`
      })
    }
  } catch (error: any) {
    console.error('API /admin/applications/archive error:', error)
    return NextResponse.json(
      { error: error?.message || 'Internal server error while archiving application' },
      { status: 500 }
    )
  }
}
