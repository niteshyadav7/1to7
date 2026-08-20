import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ notifications: [] })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ notifications: [] })

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [appsRes, campaignsRes] = await Promise.all([
      supabase
        .from('applications')
        .select('id, status, partial_payment, pending_amount, form_data, created_at, updated_at, campaigns(brand_name, campaign_code)')
        .eq('user_id', payload.id)
        .gte('updated_at', thirtyDaysAgo)
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase
        .from('campaigns')
        .select('id, brand_name, campaign_code, category, platform, is_live, created_at')
        .eq('is_live', true)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: false })
        .limit(20),
    ])

    if (appsRes.error) throw appsRes.error

    const notifications: any[] = []

    // 1. New live campaigns notifications
    for (const camp of (campaignsRes.data || [])) {
      notifications.push({
        id: `new_camp_${camp.id}`,
        type: 'new_campaign',
        title: '🚀 New Campaign Live!',
        message: `${camp.brand_name} launched a new ${camp.category || ''} campaign on ${camp.platform || 'social media'}`,
        link: '/dashboard',
        createdAt: camp.created_at,
      })
    }

    // 2. Application status notifications
    for (const app of (appsRes.data || [])) {
      const campaignName = (app.campaigns as any)?.brand_name || 'Campaign'

      // Application approved
      if (app.status === 'Approved') {
        notifications.push({
          id: `approved_${app.id}`,
          type: 'approved',
          title: 'Application Approved! 🎉',
          message: `Your application for ${campaignName} was approved`,
          link: '/dashboard/approved',
          createdAt: app.updated_at,
        })
      }

      // Payment initiated
      if (app.status === 'Payment Initiated') {
        const initiatedAmt = app.form_data?.payment_initiated?.amount
        notifications.push({
          id: `payment_init_${app.id}`,
          type: 'payment_initiated',
          title: 'Payment Initiated 💰',
          message: initiatedAmt
            ? `₹${Number(initiatedAmt).toLocaleString()} payment initiated for ${campaignName}`
            : `Payment initiated for ${campaignName}`,
          link: '/dashboard/approved',
          createdAt: app.updated_at,
        })
      }

      // Completed
      if (app.status === 'Completed') {
        notifications.push({
          id: `completed_${app.id}`,
          type: 'completed',
          title: 'Payment Completed ✅',
          message: `Payment for ${campaignName} has been completed`,
          link: '/dashboard/approved',
          createdAt: app.updated_at,
        })
      }

      // Check individual request statuses
      const requests = (app.form_data?.requests || []) as any[]
      for (const req of requests) {
        if (req.type === 'appeal') continue
        if (req.status === 'approved' && req.approved_at) {
          notifications.push({
            id: `req_approved_${app.id}_${req.id || '0'}`,
            type: 'partial_approved',
            title: 'Partial Request Approved ✅',
            message: `Your ₹${(req.approved_amount || req.amount || 0).toLocaleString()} request for ${campaignName} was approved`,
            link: '/dashboard/approved',
            createdAt: req.approved_at,
          })
        }
        if (req.status === 'rejected' && req.rejected_at) {
          notifications.push({
            id: `req_rejected_${app.id}_${req.id || '0'}`,
            type: 'partial_rejected',
            title: 'Partial Request Rejected',
            message: `Your ₹${(req.amount || 0).toLocaleString()} request for ${campaignName} was rejected`,
            link: '/dashboard/approved',
            createdAt: req.rejected_at,
          })
        }
      }
    }

    // Sort by date descending
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({ notifications: notifications.slice(0, 50) })
  } catch (err: any) {
    console.error('Dashboard notifications error:', err)
    return NextResponse.json({ notifications: [] })
  }
}
