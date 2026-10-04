import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission, hasModuleAccess } from '@/lib/admin-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || (!hasActionPermission(admin, 'feedback', 'edit') && !hasModuleAccess(admin, 'feedback'))) {
      return NextResponse.json({ error: 'Unauthorized: Permission to update feedback is required' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Feedback ID is required' }, { status: 400 })
    }

    const body = await request.json()
    const { status, admin_notes } = body

    const validStatuses = ['pending', 'resolved']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status value. Must be "pending" or "resolved"' }, { status: 400 })
    }

    const updatePayload: Record<string, any> = {}

    if (status) {
      updatePayload.status = status
      if (status === 'resolved') {
        updatePayload.resolved_at = new Date().toISOString()
        updatePayload.resolved_by = admin.name || admin.email
      } else {
        updatePayload.resolved_at = null
        updatePayload.resolved_by = null
      }
    }

    if (admin_notes !== undefined) {
      updatePayload.admin_notes = admin_notes
    }

    const { data, error } = await supabase
      .from('feedback')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('[PATCH /api/admin/feedback/[id]] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to update feedback status' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      feedback: data,
      message: status === 'resolved' ? 'Feedback marked as resolved' : 'Feedback marked as pending',
    })
  } catch (err) {
    console.error('[PATCH /api/admin/feedback/[id]] Exception:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
