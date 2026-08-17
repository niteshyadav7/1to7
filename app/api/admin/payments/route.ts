import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'payments')) {
      return NextResponse.json({ error: 'Unauthorized: Access to payments is restricted' }, { status: 403 })
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
          ifsc_code,
          instagram_profile_pic
        ),
        campaigns (
          brand_name,
          campaign_code,
          platform,
          budget_amount,
          budget_type
        )
      `)
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Show applications ONLY when they have submitted the payment form
    // or when payment is already initiated/completed.
    const payments = (applications || []).filter((app: any) => {
      const hasPaymentRequest = app.form_data?.payment_request && Object.keys(app.form_data.payment_request).length > 0
      const hasPartialRequests = Array.isArray(app.form_data?.requests) && app.form_data.requests.length > 0
      const isPaymentStatus = ['Payment Requested', 'Payment Initiated', 'Completed'].includes(app.status)
      
      return hasPaymentRequest || hasPartialRequests || isPaymentStatus
    })

    return NextResponse.json({ payments })
  } catch (error) {
    console.error('API /admin/payments GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
