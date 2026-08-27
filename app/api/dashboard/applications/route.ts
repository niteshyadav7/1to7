import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // Optional: 'Applied', 'Approved', etc.

    let query = supabase
      .from('applications')
      .select(`
        id,
        status,
        form_data,
        partial_payment,
        final_payment,
        pending_amount,
        created_at,
        updated_at,
        campaigns (
          id,
          campaign_code,
          brand_name,
          category,
          platform,
          budget_type,
          budget_amount,
          deliverables,
          requirements,
          looking_for,
          additional_info,
          collab_date,
          product_links,
          brief_document_url,
          location,
          location_type,
          target_states,
          target_cities,
          store_locations,
          completion_days,
          completion_deadline,
          enforce_completion_deadline,
          gender_required,
          followers,
          min_followers,
          order_form,
          order_form_fields,
          payment_form_fields,
          form_fields
        )
      `)
      .eq('user_id', payload.id)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: applications, error } = await query

    if (error) throw error

    return NextResponse.json({ applications: applications || [] })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
