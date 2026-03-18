import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Total campaigns
    const { count: totalCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })

    // Live campaigns
    const { count: liveCampaigns } = await supabase
      .from('campaigns')
      .select('*', { count: 'exact', head: true })
      .eq('is_live', true)

    // Total applications
    const { count: totalApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })

    // Pending applications (Applied status)
    const { count: pendingApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Applied')

    // Approved applications
    const { count: approvedApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Approved')

    // Rejected applications
    const { count: rejectedApplications } = await supabase
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Rejected')

    // Total influencers (users)
    const { count: totalInfluencers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Recent Pending applications (last 5)
    const { data: recentPendingApplications } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        users ( full_name, influencer_id, instagram_username ),
        campaigns ( brand_name, platform, campaign_code )
      `)
      .eq('status', 'Applied')
      .order('created_at', { ascending: false })
      .limit(5)

    // Recent Approved applications (last 5)
    const { data: recentApprovedApplications } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        users ( full_name, influencer_id, instagram_username ),
        campaigns ( brand_name, platform, campaign_code )
      `)
      .eq('status', 'Approved')
      .order('updated_at', { ascending: false })
      .limit(5)

    return NextResponse.json({
      stats: {
        totalCampaigns: totalCampaigns || 0,
        liveCampaigns: liveCampaigns || 0,
        totalApplications: totalApplications || 0,
        pendingApplications: pendingApplications || 0,
        approvedApplications: approvedApplications || 0,
        rejectedApplications: rejectedApplications || 0,
        totalInfluencers: totalInfluencers || 0,
      },
      recentPendingApplications: recentPendingApplications || [],
      recentApprovedApplications: recentApprovedApplications || [],
    })
  } catch (error) {
    console.error('API /admin/dashboard/stats Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
