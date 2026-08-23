import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'applications')) {
      return NextResponse.json({ error: 'Unauthorized: Access to applications is restricted' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const {
      is_delay_exempted,
      delay_exemption_reason,
      completion_deadline,
      extend_days,
    } = body

    // 1. Fetch current application & campaign
    const { data: app, error: fetchErr } = await supabase
      .from('applications')
      .select('id, completion_deadline, created_at, updated_at, is_delay_exempted, delay_exemption_reason')
      .eq('id', id)
      .single()

    if (fetchErr || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // Toggle Delay Exemption
    if (typeof is_delay_exempted === 'boolean') {
      updatePayload.is_delay_exempted = is_delay_exempted
      updatePayload.delay_exemption_reason = is_delay_exempted ? (delay_exemption_reason || 'Brand delay / Admin exempted') : null
    }

    // Explicit custom deadline date
    if (completion_deadline) {
      const d = new Date(completion_deadline)
      if (!isNaN(d.getTime())) {
        updatePayload.completion_deadline = d.toISOString()
      }
    }

    // Quick extend days (+3, +7, +14, etc.)
    if (typeof extend_days === 'number' && extend_days > 0) {
      const currentDeadline = app.completion_deadline ? new Date(app.completion_deadline) : new Date()
      const baseTime = isNaN(currentDeadline.getTime()) || currentDeadline < new Date() ? new Date() : currentDeadline
      const newDeadline = new Date(baseTime.getTime() + extend_days * 24 * 60 * 60 * 1000)
      updatePayload.completion_deadline = newDeadline.toISOString()
    }

    const { data: updatedApp, error: updateErr } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single()

    if (updateErr) throw updateErr

    return NextResponse.json({
      success: true,
      application: updatedApp,
      message: is_delay_exempted
        ? 'Creator delay exempted successfully (unblocked from applying).'
        : 'Application timeline updated successfully.',
    })
  } catch (error: any) {
    console.error('API /admin/applications/[id]/timeline PUT Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
