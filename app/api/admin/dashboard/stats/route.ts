import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL environment variable');
    return NextResponse.json({ error: 'Server configuration error: Database URL not found' }, { status: 500 })
  }
  const client = new Client({ 
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  })
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await client.connect()

    // 1. Total campaigns
    const totalCampaignsRes = await client.query('SELECT COUNT(*) FROM public.campaigns')
    const totalCampaigns = parseInt(totalCampaignsRes.rows[0].count)

    // 2. Live campaigns
    const liveCampaignsRes = await client.query('SELECT COUNT(*) FROM public.campaigns WHERE is_live = true')
    const liveCampaigns = parseInt(liveCampaignsRes.rows[0].count)

    // 3. Total applications
    const totalAppsRes = await client.query('SELECT COUNT(*) FROM public.applications')
    const totalApplications = parseInt(totalAppsRes.rows[0].count)

    // 4. Pending applications
    const pendingAppsRes = await client.query("SELECT COUNT(*) FROM public.applications WHERE status = 'Applied'")
    const pendingApplications = parseInt(pendingAppsRes.rows[0].count)

    // 5. Approved applications
    const approvedAppsRes = await client.query("SELECT COUNT(*) FROM public.applications WHERE status = 'Approved'")
    const approvedApplications = parseInt(approvedAppsRes.rows[0].count)

    // 6. Rejected applications
    const rejectedAppsRes = await client.query("SELECT COUNT(*) FROM public.applications WHERE status = 'Rejected'")
    const rejectedApplications = parseInt(rejectedAppsRes.rows[0].count)

    // 7. Total influencers
    const totalInfluencersRes = await client.query('SELECT COUNT(*) FROM public.users')
    const totalInfluencers = parseInt(totalInfluencersRes.rows[0].count)

    // 8. Recent Pending applications
    const recentPendingRes = await client.query(`
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
    `)
    const recentPendingApplications = recentPendingRes.rows.map(row => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      users: { full_name: row.full_name, influencer_id: row.influencer_id, instagram_username: row.instagram_username },
      campaigns: { brand_name: row.brand_name, platform: row.platform, campaign_code: row.campaign_code }
    }))

    // 9. Recent Approved applications
    const recentApprovedRes = await client.query(`
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
    `)
    const recentApprovedApplications = recentApprovedRes.rows.map(row => ({
      id: row.id,
      status: row.status,
      created_at: row.created_at,
      users: { full_name: row.full_name, influencer_id: row.influencer_id, instagram_username: row.instagram_username },
      campaigns: { brand_name: row.brand_name, platform: row.platform, campaign_code: row.campaign_code }
    }))

    return NextResponse.json({
      stats: {
        totalCampaigns,
        liveCampaigns,
        totalApplications,
        pendingApplications,
        approvedApplications,
        rejectedApplications,
        totalInfluencers,
      },
      recentPendingApplications,
      recentApprovedApplications,
    })
  } catch (error) {
    console.error('API /admin/dashboard/stats Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await client.end()
  }
}
