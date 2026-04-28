import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

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
      .select('user_id, form_data, pending_amount, partial_payment, final_payment')
      .eq('id', id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Merge payment request into form_data
    const currentFormData = application.form_data || {}
    // Calculate and preserve the actual Total Deal BEFORE mutating pending_amount
    const oldPending = application.pending_amount || 0;
    const existingTotalDeal = currentFormData.total_deal 
      ? parseFloat(currentFormData.total_deal) 
      : (oldPending + (application.partial_payment || 0) + (application.final_payment || 0));

    const updatedFormData = {
      ...currentFormData,
      total_deal: existingTotalDeal, // Securely lock in the Total Deal so it doesn't mutate
      payment_request: {
        ...body,
        submitted_at: new Date().toISOString(),
      }
    }

    // Now safely mutate pending_amount to the requested amount (capped by Total Deal)
    let newPending = oldPending;
    const requestedAmount = parseFloat(body.payment_amount) || 0;
    
    if (requestedAmount > 0) {
      if (existingTotalDeal > 0) {
        newPending = Math.min(requestedAmount, existingTotalDeal);
      } else {
        newPending = requestedAmount;
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
