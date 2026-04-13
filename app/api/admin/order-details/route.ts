import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all applications that have order_details in form_data
    const { data: applications, error } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        form_data,
        partial_payment,
        final_payment,
        pending_amount,
        manager_phone,
        created_at,
        updated_at,
        users (
          id,
          full_name,
          influencer_id,
          email,
          mobile,
          instagram_username,
          followers,
          state,
          city,
          gender
        ),
        campaigns (
          brand_name,
          campaign_code,
          platform
        )
      `)
      .not('form_data->order_details', 'is', null)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Filter out entries where order_details is empty or not an object
    const orders = (applications || []).filter((app: any) => {
      const od = app.form_data?.order_details
      return od && typeof od === 'object' && Object.keys(od).length > 0
    })

    return NextResponse.json({ orders })
  } catch (error) {
    console.error('API /admin/order-details GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
