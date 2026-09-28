import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

function getDateRange(rangeParam: string, customStart?: string, customEnd?: string) {
  const now = new Date()
  let start = new Date()
  let end = new Date(now)

  switch (rangeParam) {
    case 'today':
      start.setHours(0, 0, 0, 0)
      break
    case 'yesterday': {
      start.setDate(now.getDate() - 1)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setHours(23, 59, 59, 999)
      break
    }
    case '7d':
      start.setDate(now.getDate() - 7)
      start.setHours(0, 0, 0, 0)
      break
    case 'this_week': {
      const day = now.getDay()
      const diff = (day === 0 ? -6 : 1) - day
      start.setDate(now.getDate() + diff)
      start.setHours(0, 0, 0, 0)
      break
    }
    case 'last_week': {
      const day = now.getDay()
      const diff = (day === 0 ? -6 : 1) - day - 7
      start.setDate(now.getDate() + diff)
      start.setHours(0, 0, 0, 0)
      end = new Date(start)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
      break
    }
    case 'this_month':
      start.setDate(1)
      start.setHours(0, 0, 0, 0)
      break
    case 'custom':
      if (customStart) start = new Date(customStart)
      if (customEnd) end = new Date(customEnd)
      break
    case 'all':
    default:
      start = new Date('2024-01-01')
      break
  }

  return { start: start.toISOString(), end: end.toISOString() }
}

/**
 * GET /api/admin/poc-dashboard
 * Individual POC metrics, assigned campaigns, and creator deliverables.
 */
export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const targetPocId = searchParams.get('pocId') || admin.id
    const range = searchParams.get('range') || 'this_week'
    const customStart = searchParams.get('startDate') || undefined
    const customEnd = searchParams.get('endDate') || undefined

    const isSuperAdmin = admin.role === 'super_admin' || Boolean(admin.is_super_admin)

    // Verify permission: Operations admin can see their own, Super Admin can see anyone
    if (!isSuperAdmin && targetPocId !== admin.id) {
      const hasViewAll = hasModuleAccess(admin, 'poc_dashboard') || hasModuleAccess(admin, 'staff')
      if (!hasViewAll) {
        return NextResponse.json({ error: 'Forbidden: Cannot view another POC stats' }, { status: 403 })
      }
    }

    const { start, end } = getDateRange(range, customStart, customEnd)

    // 1. Fetch POC staff info
    const pocRes = await pool.query(
      `
      SELECT 
        a.id, 
        a.name, 
        a.email, 
        a.role, 
        a.avatar_url,
        COALESCE(r.display_name, a.role) AS role_display_name
      FROM public.admins a
      LEFT JOIN public.roles r ON a.role = r.name
      WHERE a.id = $1
    `,
      [targetPocId]
    )

    if (pocRes.rows.length === 0) {
      return NextResponse.json({ error: 'POC staff member not found' }, { status: 404 })
    }

    const pocInfo = pocRes.rows[0]

    // 2. Fetch Assigned Campaigns with aggregated metrics
    const campaignsRes = await pool.query(
      `
      SELECT 
        c.id,
        c.brand_name,
        c.campaign_code,
        c.platform,
        c.budget_type,
        c.budget_amount,
        c.status,
        c.is_live,
        c.created_at,
        COUNT(app.id) AS total_applications,
        COUNT(app.id) FILTER (WHERE app.status::text NOT IN ('Applied', 'Rejected')) AS approved_count,
        COUNT(app.id) FILTER (WHERE app.completion_submitted_at IS NOT NULL) AS completed_count,
        COALESCE(SUM(COALESCE(app.partial_payment, 0) + COALESCE(app.final_payment, 0) + COALESCE(app.payment_amount, 0)), 0) AS total_paid
      FROM public.campaigns c
      LEFT JOIN public.applications app 
        ON app.campaign_id = c.id 
        AND (
          (app.created_at >= $1 AND app.created_at <= $2)
          OR (app.updated_at >= $1 AND app.updated_at <= $2)
        )
      WHERE $3 = ANY(c.poc_admin_ids)
      GROUP BY c.id
      ORDER BY total_applications DESC, c.created_at DESC
    `,
      [start, end, targetPocId]
    )

    const assignedCampaigns = campaignsRes.rows.map(row => {
      const totalApps = parseInt(row.total_applications) || 0
      const approved = parseInt(row.approved_count) || 0
      const completed = parseInt(row.completed_count) || 0
      const totalPaid = parseFloat(row.total_paid) || 0
      const completionRate =
        approved > 0 ? Math.round((completed / approved) * 1000) / 10 : 0

      return {
        id: row.id,
        brandName: row.brand_name,
        campaignCode: row.campaign_code,
        platform: row.platform,
        budgetType: row.budget_type,
        budgetAmount: row.budget_amount,
        status: row.status,
        isLive: row.is_live,
        createdAt: row.created_at,
        totalApplications: totalApps,
        approvedCount: approved,
        completedCount: completed,
        completionRate,
        totalPaid,
      }
    })

    // 3. Compute overall overview metrics
    let totalApps = 0
    let totalApproved = 0
    let totalCompleted = 0
    let totalPaid = 0

    assignedCampaigns.forEach(c => {
      totalApps += c.totalApplications
      totalApproved += c.approvedCount
      totalCompleted += c.completedCount
      totalPaid += c.totalPaid
    })

    const overallCompletionRate =
      totalApproved > 0 ? Math.round((totalCompleted / totalApproved) * 1000) / 10 : 0

    // 4. Fetch Daily Timeline for this POC in range
    const timelineRes = await pool.query(
      `
      SELECT 
        TO_CHAR(DATE_TRUNC('day', COALESCE(app.updated_at, app.created_at)), 'YYYY-MM-DD') AS day_date,
        COUNT(app.id) AS total_apps,
        COUNT(app.id) FILTER (WHERE app.status::text NOT IN ('Applied', 'Rejected')) AS approvals,
        COUNT(app.id) FILTER (WHERE app.completion_submitted_at IS NOT NULL) AS completions,
        COALESCE(SUM(COALESCE(app.partial_payment, 0) + COALESCE(app.final_payment, 0) + COALESCE(app.payment_amount, 0)), 0) AS payouts
      FROM public.campaigns c
      JOIN public.applications app ON app.campaign_id = c.id
      WHERE $1 = ANY(c.poc_admin_ids)
        AND (
          (app.created_at >= $2 AND app.created_at <= $3)
          OR (app.updated_at >= $2 AND app.updated_at <= $3)
        )
      GROUP BY day_date
      ORDER BY day_date ASC
    `,
      [targetPocId, start, end]
    )

    const timeline = timelineRes.rows.map(r => ({
      date: r.day_date,
      label: new Date(r.day_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }),
      totalApps: parseInt(r.total_apps) || 0,
      approvals: parseInt(r.approvals) || 0,
      completions: parseInt(r.completions) || 0,
      payouts: parseFloat(r.payouts) || 0,
    }))

    // Best Day for this POC
    let bestDay = null
    if (timeline.length > 0) {
      const sorted = [...timeline].sort((a, b) => b.approvals - a.approvals)
      if (sorted[0].approvals > 0) {
        bestDay = sorted[0]
      }
    }

    // 5. Fetch Recent Creators under this POC's assigned campaigns (up to 50)
    const creatorsRes = await pool.query(
      `
      SELECT 
        app.id AS application_id,
        app.status,
        app.created_at,
        app.live_date,
        COALESCE(app.partial_payment, 0) + COALESCE(app.final_payment, 0) + COALESCE(app.payment_amount, 0) AS payout,
        c.id AS campaign_id,
        c.brand_name,
        c.campaign_code,
        u.id AS user_id,
        u.full_name,
        u.instagram_username,
        u.mobile
      FROM public.campaigns c
      JOIN public.applications app ON app.campaign_id = c.id
      LEFT JOIN public.users u ON app.user_id = u.id
      WHERE $1 = ANY(c.poc_admin_ids)
        AND (
          (app.created_at >= $2 AND app.created_at <= $3)
          OR (app.updated_at >= $2 AND app.updated_at <= $3)
        )
      ORDER BY app.created_at DESC
      LIMIT 50
    `,
      [targetPocId, start, end]
    )

    const recentCreators = creatorsRes.rows.map(r => ({
      applicationId: r.application_id,
      campaignId: r.campaign_id,
      brandName: r.brand_name,
      campaignCode: r.campaign_code,
      userId: r.user_id,
      creatorName: r.full_name || 'Creator',
      instagramUsername: r.instagram_username || null,
      mobile: r.mobile || null,
      status: r.status,
      appliedAt: r.created_at,
      liveDate: r.live_date || null,
      payout: parseFloat(r.payout) || 0,
    }))

    return NextResponse.json({
      success: true,
      pocInfo: {
        id: pocInfo.id,
        name: pocInfo.name || 'Team Member',
        email: pocInfo.email,
        role: pocInfo.role,
        roleDisplayName: pocInfo.role_display_name || 'Operations Admin',
        avatarUrl: pocInfo.avatar_url,
      },
      timeframe: { start, end, range },
      overview: {
        assignedCampaignsCount: assignedCampaigns.length,
        totalApplications: totalApps,
        approvedCreators: totalApproved,
        completedDeliverables: totalCompleted,
        completionRate: overallCompletionRate,
        totalPaidOut: totalPaid,
        bestDay,
      },
      campaigns: assignedCampaigns,
      recentCreators,
      timeline,
    })
  } catch (error) {
    console.error('API /admin/poc-dashboard GET Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
