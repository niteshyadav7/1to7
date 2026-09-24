import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { getApplicationCommercialAmount } from '@/lib/utils/commercial-utils'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()

    // Verify ownership
    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select('user_id, form_data, pending_amount, partial_payment, final_payment, campaigns(budget_amount, budget_type)')
      .eq('id', id)
      .single()

    if (fetchErr) {
      console.error('Fetch application error in payment-request:', fetchErr)
      if (fetchErr.code === 'PGRST116') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchErr.message || 'Database query error' }, { status: 500 })
    }

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify creator has valid bank details before accepting payment request
    const { data: creatorUser } = await supabase
      .from('users')
      .select('account_number, ifsc_code')
      .eq('id', payload.id)
      .single()

    if (!creatorUser?.account_number?.trim() || !creatorUser?.ifsc_code?.trim()) {
      return NextResponse.json(
        { error: 'Bank details missing! Please add your Account Number and IFSC Code in your profile before submitting a payment request.' },
        { status: 400 }
      )
    }

    // Merge payment request into form_data
    const currentFormData = application.form_data || {}
    // Calculate and preserve the immutable true Total Deal
    const resolvedTotalDeal = getApplicationCommercialAmount(application)
    const existingTotalDeal = currentFormData.total_deal 
      ? parseFloat(currentFormData.total_deal) 
      : resolvedTotalDeal

    const updatedFormData = {
      ...currentFormData,
      payment_rejection: null, // Clear any previous rejection banner upon re-submission
      total_deal: existingTotalDeal > 0 ? existingTotalDeal : resolvedTotalDeal,
      payment_request: {
        ...body,
        submitted_at: new Date().toISOString(),
      }
    }

    const currentReceived = (application.partial_payment || 0) + (application.final_payment || 0)
    const actualDeal = existingTotalDeal > 0 ? existingTotalDeal : resolvedTotalDeal
    const maxRemaining = Math.max(0, actualDeal - currentReceived)

    // Safely cap pending_amount to the remaining balance
    const requestedAmount = parseFloat(body.payment_amount) || 0
    let newPending = maxRemaining > 0 ? maxRemaining : application.pending_amount || 0
    if (requestedAmount > 0) {
      if (maxRemaining > 0) {
        newPending = Math.min(requestedAmount, maxRemaining)
      } else {
        newPending = requestedAmount
      }
    }

    // Build the update object: save form_data + set status to Payment Requested
    const updatePayload: Record<string, any> = {
      form_data: updatedFormData,
      status: 'Payment Requested',
      pending_amount: newPending,
      updated_at: new Date().toISOString(),
    }

    const { error: updateErr } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('id', id)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, message: 'Payment request submitted successfully' })
  } catch (err: any) {
    console.error('Payment Request Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to submit payment request' }, { status: 500 })
  }
}
