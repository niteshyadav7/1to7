import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch recent applications with relevant data
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

    const { data: applications, error } = await supabase
      .from('applications')
      .select('id, status, partial_payment, pending_amount, form_data, created_at, updated_at, users(full_name), campaigns(brand_name, campaign_code)')
      .gte('updated_at', sevenDaysAgo)
      .order('updated_at', { ascending: false })
      .limit(100)

    if (error) throw error

    const notifications: any[] = []

    for (const app of (applications || [])) {
      const userName = (app.users as any)?.full_name || 'Unknown'
      const campaignName = (app.campaigns as any)?.brand_name || 'Campaign'

      // New applications (Pending)
      if (app.status === 'Pending') {
        notifications.push({
          id: `app_pending_${app.id}`,
          type: 'new_application',
          title: 'New Application',
          message: `${userName} applied for ${campaignName}`,
          link: '/admin/applications',
          createdAt: app.created_at,
        })
      }

      // Payment form submitted (Payment Requested)
      if (app.status === 'Payment Requested') {
        notifications.push({
          id: `app_payment_req_${app.id}`,
          type: 'payment_requested',
          title: 'Payment Form Submitted',
          message: `${userName} submitted payment form for ${campaignName}`,
          link: '/admin/payments',
          createdAt: app.updated_at,
        })
      }

      // Check for pending partial requests and appeals
      const requests = (app.form_data?.requests || []) as any[]
      for (const req of requests) {
        if (req.status === 'pending' && req.type !== 'appeal') {
          notifications.push({
            id: `partial_${app.id}_${req.id || '0'}`,
            type: 'partial_request',
            title: 'Partial Payment Request',
            message: `${userName} requested ₹${(req.amount || 0).toLocaleString()} for ${campaignName}`,
            link: '/admin/payments',
            createdAt: req.submitted_at || app.updated_at,
          })
        }
        if (req.status === 'pending' && req.type === 'appeal') {
          notifications.push({
            id: `appeal_${app.id}_${req.id || '0'}`,
            type: 'appeal',
            title: 'Appeal Raised',
            message: `${userName} raised an appeal for ${campaignName}`,
            link: '/admin/payments',
            createdAt: req.submitted_at || app.updated_at,
          })
        }
      }
    }

    // Sort by date descending
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ notifications: notifications.slice(0, 50) })
  } catch (err: any) {
    console.error('Admin notifications error:', err)
    return NextResponse.json({ notifications: [] })
  }
}
