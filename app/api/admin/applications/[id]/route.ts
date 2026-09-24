import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'
import { sendApplicationApprovedEmail, sendApplicationRejectedEmail } from '@/lib/mailer'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'applications', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to update applications is denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedFields = [
      'status', 'partial_payment', 'final_payment',
      'pending_amount', 'manager_phone', 'form_data',
      'team_remark', 'team_remark_by', 'team_remark_updated_at'
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    // Check if this update is for order verification (which requires only single admin approval, NO 2nd approval required)
    const isOrderVerification = Boolean(
      body.form_data?.order_details_approved === true ||
      updates.form_data?.order_details_approved === true
    )

    // Guardrail: Paid Variable campaigns require colleague approval on negotiated commercial before initial profile approval
    // Order verification does NOT require a 2nd approval / peer approval.
    if (body.status === 'Approved' && !isOrderVerification) {
      const { data: appRecord, error: checkErr } = await supabase
        .from('applications')
        .select('status, form_data, campaigns ( budget_type )')
        .eq('id', id)
        .single()

      if (!checkErr && appRecord && appRecord.status !== 'Approved') {
        const campaignData: any = Array.isArray(appRecord.campaigns) ? appRecord.campaigns[0] : appRecord.campaigns
        const budgetType = String(campaignData?.budget_type || '').toLowerCase()
        if (budgetType.includes('variable')) {
          const formData: any = appRecord.form_data || {}
          const negotiation = formData.negotiation
          if (!negotiation || negotiation.status !== 'approved') {
            return NextResponse.json({
              error: 'Paid Variable campaigns require a negotiated commercial deal approved by a colleague before profile approval.',
              requires_peer_approval: true,
              negotiation_status: negotiation?.status || 'none'
            }, { status: 400 })
          }
        }
      }
    }
    // Fetch current form_data to safely merge rejection/revocation reason if provided
    if (body.rejection_reason) {
      const { data: curr } = await supabase.from('applications').select('form_data').eq('id', id).single()
      const currentForm = (curr?.form_data && typeof curr.form_data === 'object') ? curr.form_data : {}
      updates.form_data = {
        ...currentForm,
        ...(updates.form_data || {}),
        rejection_reason: body.rejection_reason,
        revocation_note: body.rejection_reason,
        revoked_at: new Date().toISOString(),
      }
    }

    // Automatically stamp order approver name & ID if approving order details
    if (updates.form_data && updates.form_data.order_details_approved === true) {
      if (!updates.form_data.order_details_approved_by_name && admin?.name) {
        updates.form_data.order_details_approved_by_name = admin.name
        updates.form_data.order_details_approved_by_id = admin.id || admin.email
        updates.form_data.order_details_approved_at = new Date().toISOString()
      }
    }

    const { data: application, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select('*, users ( email, full_name ), campaigns ( brand_name, campaign_code )')
      .single()

    if (error) throw error

    // Send email notification on status change (fire-and-forget)
    const newStatus = body.status
    const userEmail = application?.users?.email
    const userName = application?.users?.full_name || 'Creator'
    const brandName = application?.campaigns?.brand_name || 'Campaign'
    const campaignCode = application?.campaigns?.campaign_code || ''

    if (userEmail && body.send_email !== false) {
      if (newStatus === 'Approved') {
        sendApplicationApprovedEmail(userEmail, userName, brandName, campaignCode)
      } else if (newStatus === 'Rejected' && body.is_revert !== true) {
        sendApplicationRejectedEmail(userEmail, userName, brandName, campaignCode)
      }
    }

    return NextResponse.json({ success: true, application })
  } catch (error) {
    console.error('API /admin/applications/[id] PUT Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'applications', 'delete')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to delete applications is denied' }, { status: 403 })
    }

    const { id } = await params
    const { error } = await supabase.from('applications').delete().eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true, message: 'Application deleted' })
  } catch (error) {
    console.error('API /admin/applications/[id] DELETE Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
