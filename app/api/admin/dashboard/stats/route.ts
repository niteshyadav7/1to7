import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'dashboard')) {
      return NextResponse.json({ error: 'Unauthorized: Access to dashboard is restricted' }, { status: 403 })
    }

    // Run consolidated stats count query and recent applications queries in parallel using pool
    const [statsRes, recentPendingRes, recentApprovedRes] = await Promise.all([
      pool.query(`
        SELECT 
          (SELECT COUNT(*) FROM public.campaigns)::int AS total_campaigns,
          (SELECT COUNT(*) FROM public.campaigns WHERE is_live = true)::int AS live_campaigns,
          (SELECT COUNT(*) FROM public.applications)::int AS total_applications,
          (SELECT COUNT(*) FROM public.applications WHERE status = 'Applied')::int AS pending_applications,
          (SELECT COUNT(*) FROM public.applications WHERE status = 'Approved')::int AS approved_applications,
          (SELECT COUNT(*) FROM public.applications WHERE status = 'Rejected')::int AS rejected_applications,
          (SELECT COUNT(*) FROM public.users)::int AS total_influencers
      `),
      pool.query(`
        SELECT 
          a.id, a.status, a.created_at,
          u.full_name, u.influencer_id, u.instagram_username,
          c.brand_name, c.platform, c.campaign_code
        FROM public.applications a
        JOIN public.users u ON a.user_id = u.id
        JOIN public.campaigns c ON a.campaign_id = c.id
        WHERE a.status = 'Applied'
        ORDER BY a.created_at DESC
        LIMIT 5
      `),
      pool.query(`
        SELECT 
          a.id, a.status, a.created_at, a.updated_at,
          u.full_name, u.influencer_id, u.instagram_username,
          c.brand_name, c.platform, c.campaign_code
        FROM public.applications a
        JOIN public.users u ON a.user_id = u.id
        JOIN public.campaigns c ON a.campaign_id = c.id
        WHERE a.status = 'Approved'
        ORDER BY a.updated_at DESC
        LIMIT 5
      `),
    ])

    const statsRow = statsRes.rows[0] || {}

    const recentPendingApplications = recentPendingRes.rows.map((row) => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      users: { full_name: row.full_name, influencer_id: row.influencer_id, instagram_username: row.instagram_username },
      campaigns: { brand_name: row.brand_name, platform: row.platform, campaign_code: row.campaign_code },
    }))

    const recentApprovedApplications = recentApprovedRes.rows.map((row) => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      users: { full_name: row.full_name, influencer_id: row.influencer_id, instagram_username: row.instagram_username },
      campaigns: { brand_name: row.brand_name, platform: row.platform, campaign_code: row.campaign_code },
    }))

    return NextResponse.json({
      stats: {
        totalCampaigns: statsRow.total_campaigns || 0,
        liveCampaigns: statsRow.live_campaigns || 0,
        totalApplications: statsRow.total_applications || 0,
        pendingApplications: statsRow.pending_applications || 0,
        approvedApplications: statsRow.approved_applications || 0,
        rejectedApplications: statsRow.rejected_applications || 0,
        totalInfluencers: statsRow.total_influencers || 0,
      },
      recentPendingApplications,
      recentApprovedApplications,
    })
  } catch (error) {
    console.error('API /admin/dashboard/stats Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
