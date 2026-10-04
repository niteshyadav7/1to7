import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

interface TimeBucketRow {
  time_bucket: string
  poc_id: string
  poc_name: string
  apps_received: number
  approvals_count: number
  completions_count: number
  payout_volume: number
}

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
      // Monday as first day of week
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
    case '30d':
      start.setDate(now.getDate() - 30)
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
 * GET /api/admin/poc-dashboard/team
 * Super Admin team performance overview with Days-wise and Weeks-wise statistics.
 */
export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const canView =
      admin.role === 'super_admin' ||
      Boolean(admin.is_super_admin) ||
      hasModuleAccess(admin, 'poc_dashboard') ||
      hasModuleAccess(admin, 'campaigns')

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Access restricted to admins' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || 'this_week'
    const granularity = searchParams.get('granularity') === 'week' ? 'week' : 'day'
    const customStart = searchParams.get('startDate') || undefined
    const customEnd = searchParams.get('endDate') || undefined

    const { start, end } = getDateRange(range, customStart, customEnd)

    // Calculate previous period for Week-over-Week (WoW) comparison
    const periodDurationMs = new Date(end).getTime() - new Date(start).getTime()
    const prevStart = new Date(new Date(start).getTime() - periodDurationMs).toISOString()
    const prevEnd = new Date(new Date(start).getTime() - 1).toISOString()

    // 1. Fetch all active staff with role info
    const staffRes = await pool.query(`
      SELECT 
        a.id, 
        a.name, 
        a.email, 
        a.role, 
        a.avatar_url,
        COALESCE(r.display_name, a.role) AS role_display_name
      FROM public.admins a
      LEFT JOIN public.roles r ON a.role = r.name
      WHERE a.is_active = true 
        AND (a.approval_status = 'approved' OR a.approval_status IS NULL)
      ORDER BY a.name ASC
    `)

    // 2. Fetch cumulative metrics per POC for the current time period
    const currentMetricsRes = await pool.query(
      `
      SELECT 
        poc_id,
        COUNT(DISTINCT c.id) AS campaign_count,
        COUNT(app.id) AS total_applications,
        COUNT(app.id) FILTER (WHERE app.status::text NOT IN ('Applied', 'Rejected', 'Under Process', 'Under Review')) AS approved_count,
        COUNT(app.id) FILTER (WHERE app.status::text NOT IN ('Applied', 'Rejected', 'Under Process', 'Under Review') AND (app.status = 'Completed' OR app.completion_submitted_at IS NOT NULL)) AS completed_count,
        COALESCE(SUM(COALESCE(app.partial_payment, 0) + COALESCE(app.final_payment, 0) + COALESCE(app.payment_amount, 0)), 0) AS total_paid
      FROM (
        SELECT id, unnest(poc_admin_ids) AS poc_id 
        FROM public.campaigns 
        WHERE poc_admin_ids IS NOT NULL AND array_length(poc_admin_ids, 1) > 0
      ) c
      LEFT JOIN public.applications app 
        ON app.campaign_id = c.id 
        AND (
          (app.created_at >= $1 AND app.created_at <= $2)
          OR (app.updated_at >= $1 AND app.updated_at <= $2)
        )
      GROUP BY poc_id
    `,
      [start, end]
    )

    // 3. Fetch cumulative metrics for the previous period (for WoW growth)
    const prevMetricsRes = await pool.query(
      `
      SELECT 
        poc_id,
        COUNT(app.id) FILTER (WHERE app.status::text NOT IN ('Applied', 'Rejected')) AS prev_approved_count
      FROM (
        SELECT id, unnest(poc_admin_ids) AS poc_id 
        FROM public.campaigns 
        WHERE poc_admin_ids IS NOT NULL AND array_length(poc_admin_ids, 1) > 0
      ) c
      LEFT JOIN public.applications app 
        ON app.campaign_id = c.id 
        AND (
          (app.created_at >= $1 AND app.created_at <= $2)
          OR (app.updated_at >= $1 AND app.updated_at <= $2)
        )
      GROUP BY poc_id
    `,
      [prevStart, prevEnd]
    )

    // 4. Fetch time-series trend data grouped by (day or week) + poc_id
    const timeSeriesRes = await pool.query(
      `
      SELECT 
        TO_CHAR(DATE_TRUNC($1, COALESCE(app.updated_at, app.created_at)), 'YYYY-MM-DD') AS time_bucket,
        poc_id,
        a.name AS poc_name,
        COUNT(app.id) AS apps_received,
        COUNT(app.id) FILTER (WHERE app.status::text NOT IN ('Applied', 'Rejected')) AS approvals_count,
        COUNT(app.id) FILTER (WHERE app.completion_submitted_at IS NOT NULL) AS completions_count,
        COALESCE(SUM(COALESCE(app.partial_payment, 0) + COALESCE(app.final_payment, 0) + COALESCE(app.payment_amount, 0)), 0) AS payout_volume
      FROM (
        SELECT id, unnest(poc_admin_ids) AS poc_id 
        FROM public.campaigns 
        WHERE poc_admin_ids IS NOT NULL AND array_length(poc_admin_ids, 1) > 0
      ) c
      JOIN public.applications app ON app.campaign_id = c.id
      JOIN public.admins a ON a.id = c.poc_id
      WHERE (
        (app.created_at >= $2 AND app.created_at <= $3)
        OR (app.updated_at >= $2 AND app.updated_at <= $3)
      )
      GROUP BY time_bucket, poc_id, a.name
      ORDER BY time_bucket ASC
    `,
      [granularity, start, end]
    )

    // 5. Fetch Best Day per POC
    const bestDayRes = await pool.query(
      `
      WITH daily_poc AS (
        SELECT 
          poc_id,
          TO_CHAR(COALESCE(app.updated_at, app.created_at), 'YYYY-MM-DD') as day_date,
          TO_CHAR(COALESCE(app.updated_at, app.created_at), 'Dy') as day_name,
          COUNT(app.id) FILTER (WHERE app.status::text NOT IN ('Applied', 'Rejected')) as approvals
        FROM (
          SELECT id, unnest(poc_admin_ids) AS poc_id 
          FROM public.campaigns 
          WHERE poc_admin_ids IS NOT NULL AND array_length(poc_admin_ids, 1) > 0
        ) c
        JOIN public.applications app ON app.campaign_id = c.id
        WHERE (
          (app.created_at >= $1 AND app.created_at <= $2)
          OR (app.updated_at >= $1 AND app.updated_at <= $2)
        )
        GROUP BY poc_id, day_date, day_name
      )
      SELECT DISTINCT ON (poc_id)
        poc_id,
        day_date,
        day_name,
        approvals
      FROM daily_poc
      WHERE approvals > 0
      ORDER BY poc_id, approvals DESC, day_date DESC
    `,
      [start, end]
    )

    // Maps for fast aggregation
    const currentMetricsMap = new Map<string, any>()
    currentMetricsRes.rows.forEach(r => currentMetricsMap.set(r.poc_id, r))

    const prevMetricsMap = new Map<string, number>()
    prevMetricsRes.rows.forEach(r => prevMetricsMap.set(r.poc_id, parseInt(r.prev_approved_count) || 0))

    const bestDayMap = new Map<string, any>()
    bestDayRes.rows.forEach(r =>
      bestDayMap.set(r.poc_id, {
        date: r.day_date,
        dayName: r.day_name,
        approvals: parseInt(r.approvals) || 0,
      })
    )

    // Assemble Team Members metrics
    const members = staffRes.rows.map(staff => {
      const stats = currentMetricsMap.get(staff.id) || {}
      const prevApprovals = prevMetricsMap.get(staff.id) || 0

      const campaignCount = parseInt(stats.campaign_count) || 0
      const totalApplications = parseInt(stats.total_applications) || 0
      const approvedCount = parseInt(stats.approved_count) || 0
      const completedCount = parseInt(stats.completed_count) || 0
      const totalPaid = parseFloat(stats.total_paid) || 0

      const completionRate =
        approvedCount > 0 ? Math.round((completedCount / approvedCount) * 1000) / 10 : 0

      // WoW growth calculation
      let wowGrowth = 0
      if (prevApprovals > 0) {
        wowGrowth = Math.round(((approvedCount - prevApprovals) / prevApprovals) * 1000) / 10
      } else if (approvedCount > 0) {
        wowGrowth = 100
      }

      const bestDay = bestDayMap.get(staff.id) || null

      return {
        id: staff.id,
        name: staff.name || 'Team Member',
        email: staff.email,
        role: staff.role,
        roleDisplayName: staff.role_display_name || 'Operations Admin',
        avatarUrl: staff.avatar_url || null,
        campaignCount,
        totalApplications,
        approvedCount,
        completedCount,
        completionRate,
        totalPaid,
        wowGrowth,
        bestDay: bestDay
          ? `${bestDay.dayName} (${bestDay.approvals})`
          : '—',
        rawBestDay: bestDay,
      }
    })

    // Sort members by total approved creators descending, then applications, then campaigns
    members.sort((a, b) => b.approvedCount - a.approvedCount || b.totalApplications - a.totalApplications || b.campaignCount - a.campaignCount)

    // Calculate Team Podium / Highlights without mutating members array
    const topApprover =
      [...members].filter(m => m.approvedCount > 0).sort((a, b) => b.approvedCount - a.approvedCount)[0] ||
      [...members].filter(m => m.totalApplications > 0).sort((a, b) => b.totalApplications - a.totalApplications)[0] ||
      members[0] ||
      null

    const bestCompletion =
      [...members]
        .filter(m => m.approvedCount >= 1 && m.completionRate > 0)
        .sort((a, b) => b.completionRate - a.completionRate || b.completedCount - a.completedCount)[0] ||
      [...members].filter(m => m.approvedCount > 0)[0] ||
      members[0] ||
      null

    const topVolume =
      [...members].sort((a, b) => b.totalApplications - a.totalApplications || b.campaignCount - a.campaignCount)[0] ||
      members[0] ||
      null

    // Transform timeSeriesRes into Recharts friendly format
    const timelineBucketsMap = new Map<string, any>()
    timeSeriesRes.rows.forEach((row: TimeBucketRow) => {
      const bucket = row.time_bucket
      if (!timelineBucketsMap.has(bucket)) {
        timelineBucketsMap.set(bucket, {
          bucket,
          label: formatBucketLabel(bucket, granularity),
          totalApps: 0,
          totalApprovals: 0,
          totalCompletions: 0,
          totalPayouts: 0,
        })
      }
      const item = timelineBucketsMap.get(bucket)
      const apps = parseInt(String(row.apps_received)) || 0
      const approvals = parseInt(String(row.approvals_count)) || 0
      const completions = parseInt(String(row.completions_count)) || 0
      const payouts = parseFloat(String(row.payout_volume)) || 0

      item.totalApps += apps
      item.totalApprovals += approvals
      item.totalCompletions += completions
      item.totalPayouts += payouts

      // Attach per-POC metric for individual line charts
      const pocKey = row.poc_name || 'Unknown'
      item[pocKey] = (item[pocKey] || 0) + approvals
    })

    const trendData = Array.from(timelineBucketsMap.values())

    // Overall Team Peak Day
    let peakDay: { date: string; label: string; approvals: number; payouts: number } | null = null
    if (trendData.length > 0) {
      const sortedByApprovals = [...trendData].sort((a, b) => b.totalApprovals - a.totalApprovals)
      if (sortedByApprovals[0].totalApprovals > 0) {
        peakDay = {
          date: sortedByApprovals[0].bucket,
          label: sortedByApprovals[0].label,
          approvals: sortedByApprovals[0].totalApprovals,
          payouts: sortedByApprovals[0].totalPayouts,
        }
      }
    }

    return NextResponse.json({
      success: true,
      granularity,
      range,
      timeframe: { start, end },
      podium: {
        topApprover,
        bestCompletion,
        topVolume,
        peakDay,
      },
      members,
      trendData,
    })
  } catch (error) {
    console.error('API /admin/poc-dashboard/team Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

function formatBucketLabel(dateStr: string, granularity: string): string {
  try {
    const d = new Date(dateStr)
    if (granularity === 'week') {
      return `Wk of ${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    }
    return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch {
    return dateStr
  }
}
