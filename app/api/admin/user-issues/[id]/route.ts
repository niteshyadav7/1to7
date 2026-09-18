import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'user_issues', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to resolve issues is required' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { status, admin_notes } = body

    const validStatuses = ['pending', 'in_progress', 'resolved', 'rejected']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    if (status) {
      updatePayload.status = status
      if (status === 'resolved') {
        updatePayload.resolved_at = new Date().toISOString()
        updatePayload.resolved_by = admin.name || admin.email
      }
    }

    if (admin_notes !== undefined) {
      updatePayload.admin_notes = admin_notes
    }

    const { data, error } = await supabase
      .from('user_issues')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[PATCH /api/admin/user-issues/[id]] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      issue: data,
      message: 'Issue updated successfully',
    })
  } catch (err: any) {
    console.error('[PATCH /api/admin/user-issues/[id]] Exception:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'user_issues', 'delete')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to delete issues is required' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Issue ID is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_issues')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[DELETE /api/admin/user-issues/[id]] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to delete issue report' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Issue report deleted successfully',
    })
  } catch (err: any) {
    console.error('[DELETE /api/admin/user-issues/[id]] Exception:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
