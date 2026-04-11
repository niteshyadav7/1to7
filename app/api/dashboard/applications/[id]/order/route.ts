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
    const { orderFormData } = body

    if (!orderFormData) {
      return NextResponse.json({ error: 'Order details are required' }, { status: 400 })
    }

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

    // Merge new order details into form_data
    const currentFormData = application.form_data || {}
    const updatedFormData = {
      ...currentFormData,
      order_details: orderFormData
    }

    const { error: updateErr } = await supabase
      .from('applications')
      .update({ form_data: updatedFormData })
      .eq('id', id)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true, message: 'Order details saved successfully' })
  } catch (err: any) {
    console.error('Update Order Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to save order details' }, { status: 500 })
  }
}
