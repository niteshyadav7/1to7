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

    // Build the new request entry
    const newRequest: any = {
      id: `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      type: type || 'partial',
      amount: parseFloat(amount) || 0,
      reason: reason || '',
      status: 'pending', // pending | approved | rejected | processed
      submitted_at: new Date().toISOString(),
    }
    if (screenshot) newRequest.screenshot = screenshot

    // Append to existing requests array in form_data
    const currentFormData = application.form_data || {}
    const existingRequests = currentFormData.requests || []
    const updatedFormData = {
      ...currentFormData,
      requests: [...existingRequests, newRequest],
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
