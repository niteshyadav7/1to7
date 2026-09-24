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
      .select('id, form_data, status, pending_amount, partial_payment, final_payment, updated_at, users(full_name, account_number, ifsc_code), campaigns(brand_name, campaign_code)')
      .eq('id', application_id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const creatorUser = (application as any).users
    const hasBankDetails = Boolean(creatorUser?.account_number?.trim() && creatorUser?.ifsc_code?.trim())

    if ((action === 'prepare' || action === 'approve') && !hasBankDetails) {
      return NextResponse.json({
        error: `Cannot ${action === 'prepare' ? 'prepare payout' : 'approve payment'}: Creator ${creatorUser?.full_name || 'influencer'} has not added bank details (Account Number or IFSC missing).`,
      }, { status: 400 })
    }

    const currentFormData = application.form_data || {}
    let currentInit = currentFormData.payment_initiation
    if (!currentInit && (currentFormData.payment_initiated || application.status === 'Payment Initiated')) {
      const defaultAmount = Number(
        currentFormData.payment_initiated?.amount ||
        currentFormData.payment_request?.payment_amount ||
        application.pending_amount ||
        application.partial_payment ||
        0
      )
      const initiatedBy = currentFormData.payment_initiated?.initiated_by_id
      const initiatedByName = currentFormData.payment_initiated?.initiated_by_name

      currentInit = {
        prepared_amount: defaultAmount,
        prepared_by_id: initiatedBy || 'ec23f059-2369-4360-8ab2-e86faf60a3a7',
        prepared_by_name: initiatedByName || 'Vishakha',
        prepared_at: currentFormData.payment_initiated?.initiated_at || application.updated_at || new Date().toISOString(),
        status: 'pending_second_approval',
      }
    }
    const adminIdentifier = admin.id || admin.email || 'admin'
    const adminName = admin.name || admin.full_name || admin.email || 'Admin'

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
      if (
        currentInit.prepared_by_id &&
        currentInit.prepared_by_id !== 'initial_request' &&
        (currentInit.prepared_by_id === adminIdentifier || (adminName && currentInit.prepared_by_name && adminName.toLowerCase() === currentInit.prepared_by_name.toLowerCase()))
      ) {
        return NextResponse.json({
          error: 'Maker-Checker Guardrail: You prepared this payout request. Another colleague must provide the second approval.',
        }, { status: 403 })
      }

      const approvedAmount = Number(currentInit.prepared_amount) || Number(application.pending_amount) || 0

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
        payment_initiated: currentFormData.payment_initiated || {
          amount: approvedAmount,
          initiated_at: currentInit.prepared_at || new Date().toISOString(),
          initiated_by_id: currentInit.prepared_by_id,
          initiated_by_name: currentInit.prepared_by_name,
        },
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
      const initAmt = Number(currentInit?.prepared_amount || currentFormData.payment_initiated?.amount || 0)
      const revertedPartial = Math.max(0, (Number(application.partial_payment) || 0) - initAmt)
      const revertedPending = (Number(application.pending_amount) || 0) + initAmt

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
          form_data: { ...currentFormData, payment_initiation: updatedInit, payment_initiated: null },
          status: 'Payment Requested',
          partial_payment: revertedPartial,
          pending_amount: revertedPending,
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
