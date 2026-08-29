import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || (!hasModuleAccess(admin, 'applications') && !hasModuleAccess(admin, 'order_details'))) {
      return NextResponse.json({ error: 'Unauthorized: Access to completion details is restricted' }, { status: 403 })
    }

    // Fetch all applications that have completion_submitted_at or completion_submission in form_data
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
        completion_submitted_at,
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
          instagram_profile_pic
        ),
        campaigns (
          id,
          brand_name,
          campaign_code,
          platform,
          budget_amount,
          budget_type,
          deliverables,
          completion_days,
          collab_date
        )
      `)
      .or('completion_submitted_at.not.is.null,form_data->completion_submission.not.is.null,form_data->payment_request.not.is.null')
      .order('updated_at', { ascending: false })

    if (error) throw error

    // Filter to ensure only applications with genuine completion data are returned
    const completions = (applications || []).filter((app: any) => {
      const sub = app.form_data?.completion_submission
      const payReq = app.form_data?.payment_request
      const hasDirectCompletion = Boolean(app.completion_submitted_at || sub)
      const hasLiveProof = Boolean(sub?.live_date || sub?.deliverable_link || sub?.supporting_document || payReq?.live_date || payReq?.supporting_document)
      return hasDirectCompletion || hasLiveProof
    })

    return NextResponse.json({ completions })
  } catch (error: any) {
    console.error('API /admin/completion-details GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
