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

    // Total influencers (users)
    const { count: totalInfluencers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })

    // Recent applications (last 10)
    const { data: recentApplications } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        created_at,
        users ( full_name, influencer_id, instagram_username ),
        campaigns ( brand_name, platform, campaign_code )
      `)
      .order('created_at', { ascending: false })
      .limit(10)

    return NextResponse.json({
      stats: {
        totalCampaigns: totalCampaigns || 0,
        liveCampaigns: liveCampaigns || 0,
        totalApplications: totalApplications || 0,
        pendingApplications: pendingApplications || 0,
        approvedApplications: approvedApplications || 0,
        totalInfluencers: totalInfluencers || 0,
      },
      recentApplications: recentApplications || [],
    })
  } catch (error) {
    console.error('API /admin/dashboard/stats Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
