import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Flatten: extract requests from form_data and attach application/user/campaign info
    const allRequests: any[] = []
    for (const app of (applications || [])) {
      const requests = app.form_data?.requests || []
      for (const req of requests) {
        allRequests.push({
          ...req,
          application_id: app.id,
          application_status: app.status,
          partial_payment: app.partial_payment,
          final_payment: app.final_payment,
          pending_amount: app.pending_amount,
          manager_phone: app.manager_phone,
          user: app.users,
          campaign: app.campaigns,
        })
      }
    }

    // Sort by submitted date (newest first)
    allRequests.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())

    return NextResponse.json({ requests: allRequests })
  } catch (error) {
    console.error('API /admin/requests GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Update a request's status (approve/reject/process)
export async function PUT(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { applicationId, requestId, newStatus, paymentField, paymentAmount } = body

    // Fetch the application
    const { data: app, error: fetchErr } = await supabase
      .from('applications')
      .select('form_data, partial_payment, final_payment, pending_amount')
      .eq('id', applicationId)
      .single()

    if (fetchErr || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Update the request status in form_data.requests
    const formData = app.form_data || {}
    const requests = formData.requests || []
    const updatedRequests = requests.map((r: any) => {
      if (r.id === requestId) {
        return {
          ...r,
          status: newStatus,
          processed_at: new Date().toISOString(),
          processed_amount: paymentAmount || r.amount,
        }
      }
      return r
    })

    const updatePayload: Record<string, any> = {
      form_data: { ...formData, requests: updatedRequests },
      updated_at: new Date().toISOString(),
    }

    // If admin is processing the request, update payment fields
    if (newStatus === 'processed' && paymentAmount > 0) {
      if (paymentField === 'partial_payment') {
        updatePayload.partial_payment = (app.partial_payment || 0) + paymentAmount
      } else if (paymentField === 'final_payment') {
        updatePayload.final_payment = (app.final_payment || 0) + paymentAmount
      }
      // Reduce pending amount
      const newPending = Math.max(0, (app.pending_amount || 0) - paymentAmount)
      updatePayload.pending_amount = newPending
    }

    const { error: updateErr } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('id', applicationId)

    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API /admin/requests PUT Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
