import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'applications', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to update team remark is denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const rawRemark = typeof body.remark === 'string' ? body.remark.trim() : ''

    const adminName = admin.name || admin.email || 'Admin'
    const now = new Date().toISOString()

    // If empty string, user is clearing the remark
    const teamRemark = rawRemark.length > 0 ? rawRemark : null
    const teamRemarkBy = rawRemark.length > 0 ? adminName : null
    const teamRemarkUpdatedAt = rawRemark.length > 0 ? now : null

    // Get current form_data to mirror team_remark for backwards compatibility
    const { data: currentApp } = await supabase
      .from('applications')
      .select('form_data')
      .eq('id', id)
      .single()

    const currentFormData = (currentApp?.form_data && typeof currentApp.form_data === 'object')
      ? currentApp.form_data
      : {}

    const updatedFormData = {
      ...currentFormData,
      team_remark: teamRemark,
      team_remark_by: teamRemarkBy,
      team_remark_updated_at: teamRemarkUpdatedAt,
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from('applications')
      .update({
        team_remark: teamRemark,
        team_remark_by: teamRemarkBy,
        team_remark_updated_at: teamRemarkUpdatedAt,
        form_data: updatedFormData,
      })
      .eq('id', id)
      .select('id, team_remark, team_remark_by, team_remark_updated_at, form_data')
      .single()

    if (updateError) {
      console.error('Failed to update team remark:', updateError)
      return NextResponse.json({ error: 'Failed to update team remark' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: teamRemark ? 'Team remark updated' : 'Team remark cleared',
      application: updatedApp,
    })
  } catch (err: any) {
    console.error('Error updating team remark:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
