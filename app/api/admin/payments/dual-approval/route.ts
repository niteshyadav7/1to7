import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'payments', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to manage payment approvals is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { application_id, action, amount, notes } = body // action: 'prepare' | 'approve' | 'reject'

    if (!application_id) {
      return NextResponse.json({ error: 'application_id is required' }, { status: 400 })
    }

    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select('id, form_data, status, pending_amount, partial_payment, final_payment, campaigns(brand_name, campaign_code)')
      .eq('id', application_id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const currentFormData = application.form_data || {}
    const currentInit = currentFormData.payment_initiation || {}
    const adminIdentifier = admin.id || admin.email || 'admin'
    const adminName = admin.full_name || admin.email || 'Admin'

    // ──────────────────────────────────────────────
    // 1. PREPARE / INITIATE PAYMENT DUAL APPROVAL
    // ──────────────────────────────────────────────
    if (action === 'prepare') {
      const numericAmount = parseFloat(amount) || application.pending_amount || 0
      if (numericAmount <= 0) {
        return NextResponse.json({ error: 'Please enter a valid payment amount' }, { status: 400 })
      }

      const updatedInit = {
        prepared_amount: numericAmount,
        prepared_by_id: adminIdentifier,
        prepared_by_name: adminName,
        prepared_at: new Date().toISOString(),
        notes: notes || '',
        status: 'pending_second_approval',
      }

      const updatedFormData = {
        ...currentFormData,
        payment_initiation: updatedInit,
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: updatedFormData,
          status: 'Payment Requested',
          updated_at: new Date().toISOString(),
        })
        .eq('id', application_id)

      if (updateErr) throw updateErr

      return NextResponse.json({
        success: true,
        message: `Payout of ₹${numericAmount.toLocaleString()} prepared! Awaiting second colleague approval before finance queue.`,
      })
    }

    // ──────────────────────────────────────────────
    // 2. SECOND ADMIN APPROVAL (MAKER-CHECKER)
    // ──────────────────────────────────────────────
    if (action === 'approve') {
      if (!currentInit || currentInit.status !== 'pending_second_approval') {
        return NextResponse.json({ error: 'No pending payment initiation found to approve' }, { status: 400 })
      }

      // Enforce Dual-Approval Guardrail
      if (currentInit.prepared_by_id === adminIdentifier) {
        return NextResponse.json({
          error: 'Maker-Checker Guardrail: You prepared this payout request. Another colleague must provide the second approval.',
        }, { status: 403 })
      }

      const approvedAmount = Number(currentInit.prepared_amount) || application.pending_amount || 0

      const updatedInit = {
        ...currentInit,
        status: 'approved_for_finance',
        second_approved_by_id: adminIdentifier,
        second_approved_by_name: adminName,
        second_approved_at: new Date().toISOString(),
        second_approval_notes: notes || '',
      }

      const updatedFormData = {
        ...currentFormData,
        payment_initiation: updatedInit,
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: updatedFormData,
          status: 'Payment Approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', application_id)

      if (updateErr) throw updateErr

      return NextResponse.json({
        success: true,
        message: `Payout of ₹${approvedAmount.toLocaleString()} approved by 2 admins! Moved to Finance Payout Queue.`,
      })
    }

    // ──────────────────────────────────────────────
    // 3. REJECT PAYMENT PREPARATION
    // ──────────────────────────────────────────────
    if (action === 'reject') {
      const updatedInit = {
        ...currentInit,
        status: 'rejected',
        rejected_by_id: adminIdentifier,
        rejected_by_name: adminName,
        rejected_at: new Date().toISOString(),
        rejection_notes: notes || '',
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: { ...currentFormData, payment_initiation: updatedInit },
          status: 'Approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', application_id)

      if (updateErr) throw updateErr

      return NextResponse.json({
        success: true,
        message: 'Payment preparation rejected and returned to Approved status.',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('Dual Approval Payment Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
