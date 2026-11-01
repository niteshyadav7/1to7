import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

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
      const { data: existingApps } = await supabase
        .from('applications')
        .select('id, status, form_data')
        .in('id', targetAppIds)

      for (const app of (existingApps || [])) {
        const formData = (app.form_data && typeof app.form_data === 'object') ? { ...app.form_data } : {}
        const restoredStatus = formData._pre_archive_status || 'Applied'
        delete formData._pre_archive_status

        await supabase
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
      const { data: existingApps } = await supabase
        .from('applications')
        .select('id, form_data')
        .in('id', targetAppIds)

      for (const app of (existingApps || [])) {
        const formData = (app.form_data && typeof app.form_data === 'object') ? { ...app.form_data } : {}
        formData.rejection_reason = cleanReason
        formData.allow_reapply = true

        await supabase
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
      const { data: existingApps } = await supabase
        .from('applications')
        .select('id, status, form_data')
        .in('id', targetAppIds)

      for (const app of (existingApps || [])) {
        const formData = (app.form_data && typeof app.form_data === 'object') ? { ...app.form_data } : {}
        if (!formData._pre_archive_status) {
          formData._pre_archive_status = app.status
        }

        await supabase
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

