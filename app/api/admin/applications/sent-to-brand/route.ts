import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'applications', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Admin permission required' }, { status: 403 })
    }

    const body = await request.json()
    const { application_ids, batch_label, notes, action } = body // action: 'mark_sent' | 'unmark_sent'

    if (!Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json({ error: 'Please select at least one application' }, { status: 400 })
    }

    const adminName = admin.full_name || admin.email || 'Admin'
    const timestamp = new Date().toISOString()
    const label = batch_label || `Batch on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`

    const { data: applications, error: fetchErr } = await supabase
      .from('applications')
      .select('id, form_data')
      .in('id', application_ids)

    if (fetchErr || !applications) {
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    let updatedCount = 0

    for (const app of applications) {
      const currentFormData = app.form_data || {}
      
      const updatedFormData = {
        ...currentFormData,
        sent_to_brand: action === 'unmark_sent' ? null : {
          is_sent: true,
          sent_at: timestamp,
          sent_by: adminName,
          batch_label: label,
          notes: notes || '',
        },
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: updatedFormData,
          updated_at: timestamp,
        })
        .eq('id', app.id)

      if (!updateErr) {
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: action === 'unmark_sent'
        ? `Reset 'Sent to Brand' for ${updatedCount} profiles`
        : `Marked ${updatedCount} profiles as Sent to Brand (${label})`,
      updated_count: updatedCount,
    })
  } catch (error: any) {
    console.error('Sent to Brand API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
