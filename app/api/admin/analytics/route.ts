import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch counts
    const [usersRes, campaignsRes, applicationsRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('campaigns').select('id', { count: 'exact', head: true }).eq('status', 'Active'),
      supabase.from('applications').select('id, status, partial_payment, final_payment, pending_amount, created_at, updated_at, campaigns(brand_name)'),
    ])

    const totalInfluencers = usersRes.count || 0
    const activeCampaigns = campaignsRes.count || 0
    const allApplications = applicationsRes.data || []
    const totalApplications = allApplications.length

    // Status distribution
    const statusCounts: Record<string, number> = {}
    allApplications.forEach((app: any) => {
      statusCounts[app.status] = (statusCounts[app.status] || 0) + 1
    })

    // Revenue
    let totalPaid = 0
    let totalPending = 0
    allApplications.forEach((app: any) => {
      totalPaid += (app.partial_payment || 0) + (app.final_payment || 0)
      totalPending += app.pending_amount || 0
    })

    // Top campaigns by applications
    const campaignAppCounts: Record<string, { name: string; count: number }> = {}
    allApplications.forEach((app: any) => {
      const name = app.campaigns?.brand_name || 'Unknown'
      if (!campaignAppCounts[name]) campaignAppCounts[name] = { name, count: 0 }
      campaignAppCounts[name].count++
    })
    const topCampaigns = Object.values(campaignAppCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Recent activity (last 15 updated applications)
    const recentActivity = [...allApplications]
      .sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, 15)
      .map((app: any) => ({
        id: app.id,
        status: app.status,
        brand: app.campaigns?.brand_name || 'Unknown',
        updated_at: app.updated_at,
        created_at: app.created_at,
      }))

    // Monthly application trend (last 6 months)
    const monthlyTrend: { month: string; count: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      const count = allApplications.filter((app: any) => {
        const created = new Date(app.created_at)
        return `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}` === monthKey
      }).length
      monthlyTrend.push({ month: label, count })
    }

    return NextResponse.json({
      stats: {
        totalInfluencers,
        activeCampaigns,
        totalApplications,
        totalPaid,
        totalPending,
        totalRevenue: totalPaid + totalPending,
      },
      statusCounts,
      topCampaigns,
      recentActivity,
      monthlyTrend,
    })
  } catch (error) {
    console.error('API /admin/analytics GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
