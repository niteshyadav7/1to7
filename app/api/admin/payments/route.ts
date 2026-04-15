import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch applications that have any payment activity:
    // either admin-set payment fields > 0 or influencer-submitted payment_request
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
          gender,
          account_name,
          account_number,
          ifsc_code
        ),
        campaigns (
          brand_name,
          campaign_code,
          platform
        )
      `)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Show all applications that are Approved, Payment Initiated, or Completed
    // so admin can enter/edit payment details for any relevant application
    const payments = (applications || []).filter((app: any) => {
      const hasAdminPayment = (app.partial_payment > 0) || (app.final_payment > 0) || (app.pending_amount > 0)
      const hasPaymentRequest = app.form_data?.payment_request && Object.keys(app.form_data.payment_request).length > 0
      const hasPartialRequests = Array.isArray(app.form_data?.requests) && app.form_data.requests.length > 0
      const isPaymentRelevant = ['Approved', 'Payment Requested', 'Payment Initiated', 'Completed'].includes(app.status)
      return hasAdminPayment || hasPaymentRequest || hasPartialRequests || isPaymentRelevant
    })

    return NextResponse.json({ payments })
  } catch (error) {
    console.error('API /admin/payments GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
