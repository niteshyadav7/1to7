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
      .select('user_id, form_data, pending_amount')
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
    const updatedFormData = {
      ...currentFormData,
      payment_request: {
        ...body,
        submitted_at: new Date().toISOString(),
      }
    }

    // Build the update object: save form_data + set status to Payment Requested
    const updatePayload: Record<string, any> = {
      form_data: updatedFormData,
      status: 'Payment Requested',
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
