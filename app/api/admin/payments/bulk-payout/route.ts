import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'payments', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to execute finance payouts is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { application_ids, utr_number, batch_id, payment_mode, notes } = body

    if (!Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json({ error: 'Please select at least one application for bulk payout' }, { status: 400 })
    }

    const adminName = admin.full_name || admin.email || 'Finance Team'
    const generatedBatchId = batch_id || `BATCH-${Date.now().toString().slice(-6)}`
    const executedAt = new Date().toISOString()

    const { data: applications, error: fetchErr } = await supabase
      .from('applications')
      .select('id, form_data, pending_amount, partial_payment, final_payment, status, users(full_name, email, mobile, account_number, ifsc_code)')
      .in('id', application_ids)

    if (fetchErr || !applications) {
      return NextResponse.json({ error: 'Failed to retrieve applications' }, { status: 500 })
    }

    // Validate all applications have valid bank details before proceeding with disbursement
    const missingBankApps = applications.filter(a => {
      const u = (a as any).users
      return !Boolean(u?.account_number?.trim() && u?.ifsc_code?.trim())
    })

    if (missingBankApps.length > 0) {
      const names = missingBankApps.map(a => (a as any).users?.full_name || 'Creator').join(', ')
      return NextResponse.json({
        error: `Cannot disburse payout: Bank details missing for ${missingBankApps.length} creator(s) (${names}). Please ensure all creators have registered bank details first.`,
      }, { status: 400 })
    }

    let totalAmountDisbursed = 0
    const processedIds: string[] = []

    for (const app of applications) {
      const currentFormData = app.form_data || {}
      const payoutAmount = Number(
        currentFormData.payment_initiation?.prepared_amount ||
        currentFormData.payment_initiated?.amount ||
        (Number(app.pending_amount) > 0 ? app.pending_amount : (app.partial_payment || 0))
      )
      totalAmountDisbursed += payoutAmount

      const newTransaction = {
        transaction_id: `TXN-${Date.now().toString().slice(-8)}`,
        batch_id: generatedBatchId,
        utr_number: utr_number || '',
        payment_mode: payment_mode || 'NEFT',
        amount: payoutAmount,
        executed_by: adminName,
        executed_at: executedAt,
        notes: notes || '',
      }

      const existingTransactions = currentFormData.payment_transactions || []
      const updatedFormData = {
        ...currentFormData,
        payment_transactions: [...existingTransactions, newTransaction],
        payment_initiated: {
          ...(currentFormData.payment_initiated || {}),
          bank_code: utr_number || currentFormData.payment_initiated?.bank_code || '',
        },
        finance_payout_completed: {
          batch_id: generatedBatchId,
          utr_number: utr_number || '',
          executed_at: executedAt,
          executed_by: adminName,
          amount_paid: payoutAmount,
        },
      }

      const pendingAmt = Number(app.pending_amount) || 0
      const newPartial = pendingAmt > 0 ? (Number(app.partial_payment) || 0) + payoutAmount : (Number(app.partial_payment) || payoutAmount)
      const newPending = Math.max(0, pendingAmt - (pendingAmt > 0 ? payoutAmount : 0))

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: updatedFormData,
          partial_payment: newPartial,
          pending_amount: newPending,
          status: 'Completed',
          updated_at: executedAt,
        })
        .eq('id', app.id)

      if (!updateErr) {
        processedIds.push(app.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk payout completed for ${processedIds.length} creators! Total Disbursed: ₹${totalAmountDisbursed.toLocaleString()}`,
      batch_id: generatedBatchId,
      processed_count: processedIds.length,
      total_amount: totalAmountDisbursed,
    })
  } catch (error: any) {
    console.error('Bulk Payout API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
