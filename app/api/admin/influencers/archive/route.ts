import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || (!hasModuleAccess(admin, 'influencers') && !hasModuleAccess(admin, 'applications'))) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin permission required to archive creators' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const {
      userIds,
      userId,
      action = 'archive', // 'archive' | 'unarchive'
      reason = '',
      cancel_applications = true
    } = body

    const targetUserIds: string[] = Array.isArray(userIds)
      ? userIds.filter(Boolean)
      : userId
      ? [userId]
      : []

    if (targetUserIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one user ID is required to perform archive action' },
        { status: 400 }
      )
    }

    const adminIdentity = admin.email || admin.name || 'admin'
    const nowIso = new Date().toISOString()

    if (action === 'archive') {
      const cleanReason = reason.trim() || 'Marked as inactive / archived by operations team'

      // 1. Update users table
      const { error: userUpdateErr } = await supabase
        .from('users')
        .update({
          is_archived: true,
          archived_at: nowIso,
          archived_by: adminIdentity,
          archive_reason: cleanReason
        })
        .in('id', targetUserIds)

      if (userUpdateErr) {
        console.error('[ArchiveAPI] Error archiving users:', userUpdateErr)
        throw userUpdateErr
      }

      // 2. Also mark pending applications as archived/cancelled if requested
      if (cancel_applications) {
        await supabase
          .from('applications')
          .update({
            is_archived: true,
            archived_at: nowIso,
            archived_by: adminIdentity,
            archive_reason: cleanReason,
            status: 'Rejected',
            team_remark: `Archived Creator: ${cleanReason}`
          })
          .in('user_id', targetUserIds)
          .in('status', ['Applied', 'Under Process', 'Under Review'])
      }

      return NextResponse.json({
        success: true,
        action: 'archive',
        count: targetUserIds.length,
        message: `Successfully archived ${targetUserIds.length} creator${targetUserIds.length > 1 ? 's' : ''}`
      })
    } else {
      // action === 'unarchive'
      const { error: userRestoreErr } = await supabase
        .from('users')
        .update({
          is_archived: false,
          archived_at: null,
          archived_by: null,
          archive_reason: null
        })
        .in('id', targetUserIds)

      if (userRestoreErr) {
        console.error('[ArchiveAPI] Error unarchiving users:', userRestoreErr)
        throw userRestoreErr
      }

      // Restore applications archive flag
      await supabase
        .from('applications')
        .update({
          is_archived: false,
          archived_at: null,
          archived_by: null,
          archive_reason: null
        })
        .in('user_id', targetUserIds)

      return NextResponse.json({
        success: true,
        action: 'unarchive',
        count: targetUserIds.length,
        message: `Successfully restored ${targetUserIds.length} creator${targetUserIds.length > 1 ? 's' : ''} to active pool`
      })
    }
  } catch (error: any) {
    console.error('API /admin/influencers/archive error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error while archiving creators' },
      { status: 500 }
    )
  }
}

