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
    const { type, amount, reason, screenshot } = body // type: 'partial' | 'payment' | 'appeal'

    // Verify ownership
    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select('user_id, form_data')
      .eq('id', id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (type === 'partial' || type === 'payment') {
      const { data: creatorUser } = await supabase
        .from('users')
        .select('account_number, ifsc_code')
        .eq('id', payload.id)
        .single()

      if (!creatorUser?.account_number?.trim() || !creatorUser?.ifsc_code?.trim()) {
        return NextResponse.json(
          { error: 'Bank details missing! Please add your Account Number and IFSC Code in your profile before requesting a payment release.' },
          { status: 400 }
        )
      }
    }

    const currentFormData = application.form_data || {}
    const existingRequests = Array.isArray(currentFormData.requests) ? currentFormData.requests : []

    // ── Appeal Handling: Guardrail & History Preservation ──
    if (type === 'appeal') {
      const activePendingAppeal = existingRequests.find(
        (r: any) => r.type === 'appeal' && r.status === 'pending'
      )

      if (activePendingAppeal) {
        return NextResponse.json(
          { error: 'You already have an active appeal under review by our Finance team. Please wait until it is resolved before submitting a new appeal.' },
          { status: 400 }
        )
      }

      const newAppeal: any = {
        id: `appeal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        type: 'appeal',
        amount: 0,
        reason: (reason || '').trim(),
        screenshot: screenshot || undefined,
        status: 'pending', // pending | resolved | rejected
        submitted_at: new Date().toISOString(),
      }

      const updatedFormData = {
        ...currentFormData,
        requests: [...existingRequests, newAppeal],
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: updatedFormData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw updateErr

      return NextResponse.json({ success: true, request: newAppeal })
    }

    // ── Partial / Payment Request Handling ──
    const newRequest: any = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: type || 'partial',
      amount: parseFloat(amount) || 0,
      reason: reason || '',
      status: 'pending', // pending | approved | rejected | processed
      submitted_at: new Date().toISOString(),
    }
    if (screenshot) newRequest.screenshot = screenshot

    // Dedup: if a pending request with same type & amount exists, increment its count
    const existingMatch = existingRequests.find(
      (r: any) => r.type === newRequest.type && r.amount === newRequest.amount && r.status === 'pending'
    )

    let updatedRequests
    if (existingMatch) {
      updatedRequests = existingRequests.map((r: any) =>
        r.id === existingMatch.id
          ? { ...r, count: (r.count || 1) + 1, reason: newRequest.reason || r.reason, submitted_at: newRequest.submitted_at }
          : r
      )
    } else {
      updatedRequests = [...existingRequests, { ...newRequest, count: 1 }]
    }

    const updatedFormData = {
      ...currentFormData,
      requests: updatedRequests,
    }

    const { error: updateErr } = await supabase
      .from('applications')
      .update({
        form_data: updatedFormData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, request: newRequest })
  } catch (err: any) {
    console.error('Request Submission Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to submit request' }, { status: 500 })
  }
}
