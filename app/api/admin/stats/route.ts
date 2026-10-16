import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

interface TimeRangeConfig {
  appIntervalSql: string
  userIntervalSql: string
  params: any[]
}

function parseTimeRange(range: string): TimeRangeConfig {
  switch (range) {
    case 'today':
      return {
        appIntervalSql: 'created_at >= CURRENT_DATE',
        userIntervalSql: 'created_at >= CURRENT_DATE',
        params: [],
      }
    case 'yesterday':
      return {
        appIntervalSql: "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE",
        userIntervalSql: "created_at >= CURRENT_DATE - INTERVAL '1 day' AND created_at < CURRENT_DATE",
        params: [],
      }
    case '7d':
      return {
        appIntervalSql: "created_at >= NOW() - INTERVAL '7 days'",
        userIntervalSql: "created_at >= NOW() - INTERVAL '7 days'",
        params: [],
      }
    case '90d':
      return {
        appIntervalSql: "created_at >= NOW() - INTERVAL '90 days'",
        userIntervalSql: "created_at >= NOW() - INTERVAL '90 days'",
        params: [],
      }
    case 'this_month':
      return {
        appIntervalSql: "created_at >= DATE_TRUNC('month', CURRENT_DATE)",
        userIntervalSql: "created_at >= DATE_TRUNC('month', CURRENT_DATE)",
        params: [],
      }
    case 'all':
      return {
        appIntervalSql: '1=1',
        userIntervalSql: '1=1',
        params: [],
      }
    case '30d':
    default:
      return {
        appIntervalSql: "created_at >= NOW() - INTERVAL '30 days'",
        userIntervalSql: "created_at >= NOW() - INTERVAL '30 days'",
        params: [],
      }
  }
}

export async function GET(req: NextRequest) {
  try {
    // 1. Strict Admin Authentication & Authorization check
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'analytics')) {
      return NextResponse.json(
        { error: 'Unauthorized: Access to platform stats is restricted' },
        { status: 403 }
      )
    }

    if (!pool) {
      return NextResponse.json(
        { error: 'Database connection pool unavailable' },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(req.url)
    const range = searchParams.get('range') || '30d'
    const granularity = searchParams.get('granularity') === 'week' ? 'week' : searchParams.get('granularity') === 'month' ? 'month' : 'day'
    const campaignId = searchParams.get('campaign_id') || null

    const timeRange = parseTimeRange(range)

    // Build conditions safely
    let appCondition = timeRange.appIntervalSql
    const appParams: any[] = []

    if (campaignId && campaignId !== 'all') {
      appParams.push(campaignId)
      appCondition += ` AND campaign_id = $${appParams.length}`
    }

    const userCondition = timeRange.userIntervalSql

    // Format & Truncation for Date Series
    let dateTruncSql = "DATE_TRUNC('day', created_at)"
    let dateFormatSql = 'YYYY-MM-DD'
    if (granularity === 'week') {
      dateTruncSql = "DATE_TRUNC('week', created_at)"
      dateFormatSql = 'YYYY-MM-DD'
    } else if (granularity === 'month') {
      dateTruncSql = "DATE_TRUNC('month', created_at)"
      dateFormatSql = 'YYYY-MM'
    }

    // ─── Parallel PostgreSQL Aggregations ──────────────────────────

    // 1. Hero KPI totals for current filtered timeframe
    const heroPromise = pool.query(`
      SELECT 
        COUNT(*) as total_apps,
        COUNT(CASE WHEN status::text = 'Applied' THEN 1 END) as applied_count,
        COUNT(CASE WHEN status::text = 'Under Process' THEN 1 END) as under_process_count,
        COUNT(CASE WHEN status::text = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status::text = 'Completed' THEN 1 END) as completed_count,
        COUNT(CASE WHEN status::text = 'Rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status::text IN ('Payment Requested', 'Payment Initiated', 'Payment Approved') THEN 1 END) as paid_count,
        COUNT(CASE WHEN is_ghosted = true THEN 1 END) as ghosted_count,
        COALESCE(SUM(COALESCE(partial_payment, 0) + COALESCE(final_payment, 0)), 0) as total_payout_disbursed,
        COALESCE(SUM(COALESCE(pending_amount, 0)), 0) as total_pending_liability
      FROM applications
      WHERE ${appCondition}
    `, appParams)

    // 2. All-Time totals (baseline comparison)
    const allTimePromise = pool.query(`
      SELECT 
        COUNT(*) as all_time_apps,
        COALESCE(SUM(COALESCE(partial_payment, 0) + COALESCE(final_payment, 0)), 0) as all_time_payout,
        COUNT(CASE WHEN is_ghosted = true THEN 1 END) as all_time_ghosted
      FROM applications
      ${campaignId && campaignId !== 'all' ? 'WHERE campaign_id = $1' : ''}
    `, campaignId && campaignId !== 'all' ? [campaignId] : [])

    // 3. Platform Creator & Campaign counters
    const platformCountersPromise = pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM users) as all_time_creators,
        (SELECT COUNT(*) FROM users WHERE ${userCondition}) as period_creators,
        (SELECT COUNT(*) FROM campaigns WHERE status = 'Active') as active_campaigns,
        (SELECT COUNT(*) FROM campaigns) as total_campaigns
    `)

    // 4. Time Series Trend: Applications velocity & financial volume
    const timeSeriesPromise = pool.query(`
      SELECT 
        TO_CHAR(${dateTruncSql}, '${dateFormatSql}') as period,
        COUNT(*) as total_apps,
        COUNT(CASE WHEN status::text = 'Approved' THEN 1 END) as approved_apps,
        COUNT(CASE WHEN status::text = 'Completed' THEN 1 END) as completed_apps,
        COUNT(CASE WHEN status::text = 'Rejected' THEN 1 END) as rejected_apps,
        COALESCE(SUM(COALESCE(partial_payment, 0) + COALESCE(final_payment, 0)), 0) as payout_volume
      FROM applications
      WHERE ${appCondition}
      GROUP BY ${dateTruncSql}
      ORDER BY period ASC
    `, appParams)

    // 5. Time Series Trend: Creator onboardings
    const creatorSeriesPromise = pool.query(`
      SELECT 
        TO_CHAR(${dateTruncSql}, '${dateFormatSql}') as period,
        COUNT(*) as new_creators
      FROM users
      WHERE ${userCondition}
      GROUP BY ${dateTruncSql}
      ORDER BY period ASC
    `)

    // 6. Creator Follower Tiers distribution
    const tiersPromise = pool.query(`
      SELECT 
        COUNT(CASE WHEN COALESCE(followers, 0) < 10000 THEN 1 END) as nano,
        COUNT(CASE WHEN COALESCE(followers, 0) >= 10000 AND COALESCE(followers, 0) < 50000 THEN 1 END) as micro,
        COUNT(CASE WHEN COALESCE(followers, 0) >= 50000 AND COALESCE(followers, 0) < 200000 THEN 1 END) as mid,
        COUNT(CASE WHEN COALESCE(followers, 0) >= 200000 AND COALESCE(followers, 0) < 1000000 THEN 1 END) as macro,
        COUNT(CASE WHEN COALESCE(followers, 0) >= 1000000 THEN 1 END) as mega
      FROM users
    `)

    // 7. Creator Gender distribution
    const genderPromise = pool.query(`
      SELECT 
        LOWER(COALESCE(gender, 'unspecified')) as gender,
        COUNT(*) as count
      FROM users
      GROUP BY LOWER(COALESCE(gender, 'unspecified'))
      ORDER BY count DESC
    `)

    // 8. Campaign Budget Type distribution
    const budgetTypesPromise = pool.query(`
      SELECT 
        COALESCE(budget_type, 'Unspecified') as budget_type,
        COUNT(*) as count
      FROM campaigns
      GROUP BY budget_type
      ORDER BY count DESC
    `)

    // 9. Top 8 Campaigns by total applications
    const topCampaignsPromise = pool.query(`
      SELECT 
        c.id,
        c.campaign_code,
        c.brand_name,
        c.budget_type,
        c.status,
        COUNT(a.id) as total_applications,
        COUNT(CASE WHEN a.status::text = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN a.status::text = 'Completed' THEN 1 END) as completed_count,
        COALESCE(SUM(COALESCE(a.partial_payment, 0) + COALESCE(a.final_payment, 0)), 0) as total_payout
      FROM campaigns c
      LEFT JOIN applications a ON a.campaign_id = c.id
      GROUP BY c.id, c.campaign_code, c.brand_name, c.budget_type, c.status
      ORDER BY total_applications DESC
      LIMIT 8
    `)

    // 10. Top States distribution
    const topStatesPromise = pool.query(`
      SELECT 
        COALESCE(NULLIF(TRIM(state), ''), 'Not Specified') as state,
        COUNT(*) as count
      FROM users
      GROUP BY state
      ORDER BY count DESC
      LIMIT 7
    `)

    // 11. Quick list of campaigns for the filter dropdown
    const campaignsListPromise = pool.query(`
      SELECT id, campaign_code, brand_name 
      FROM campaigns 
      ORDER BY brand_name ASC
    `)

    // Await all independent aggregations concurrently
    const [
      heroRes,
      allTimeRes,
      platformCountersRes,
      timeSeriesRes,
      creatorSeriesRes,
      tiersRes,
      genderRes,
      budgetTypesRes,
      topCampaignsRes,
      topStatesRes,
      campaignsListRes,
    ] = await Promise.all([
      heroPromise,
      allTimePromise,
      platformCountersPromise,
      timeSeriesPromise,
      creatorSeriesPromise,
      tiersPromise,
      genderPromise,
      budgetTypesPromise,
      topCampaignsPromise,
      topStatesPromise,
      campaignsListPromise,
    ])

    // ─── Post-Process & Transform into Clean JSON ──────────────────

    const heroRow = heroRes.rows[0] || {}
    const allTimeRow = allTimeRes.rows[0] || {}
    const countersRow = platformCountersRes.rows[0] || {}

    const totalApps = Number(heroRow.total_apps || 0)
    const completedApps = Number(heroRow.completed_count || 0)
    const ghostedApps = Number(heroRow.ghosted_count || 0)
    const completionRate = totalApps > 0 ? Number(((completedApps / totalApps) * 100).toFixed(1)) : 0
    const ghostedRate = totalApps > 0 ? Number(((ghostedApps / totalApps) * 100).toFixed(1)) : 0

    // Combine time series dates (merge app counts and creator signups)
    const seriesMap = new Map<string, {
      period: string
      label: string
      totalApps: number
      approvedApps: number
      completedApps: number
      rejectedApps: number
      payoutVolume: number
      newCreators: number
    }>()

    timeSeriesRes.rows.forEach((r: any) => {
      seriesMap.set(r.period, {
        period: r.period,
        label: formatPeriodLabel(r.period, granularity),
        totalApps: Number(r.total_apps || 0),
        approvedApps: Number(r.approved_apps || 0),
        completedApps: Number(r.completed_apps || 0),
        rejectedApps: Number(r.rejected_apps || 0),
        payoutVolume: Number(r.payout_volume || 0),
        newCreators: 0,
      })
    })

    creatorSeriesRes.rows.forEach((r: any) => {
      const existing = seriesMap.get(r.period)
      if (existing) {
        existing.newCreators = Number(r.new_creators || 0)
      } else {
        seriesMap.set(r.period, {
          period: r.period,
          label: formatPeriodLabel(r.period, granularity),
          totalApps: 0,
          approvedApps: 0,
          completedApps: 0,
          rejectedApps: 0,
          payoutVolume: 0,
          newCreators: Number(r.new_creators || 0),
        })
      }
    })

    const sortedTimeSeries = Array.from(seriesMap.values()).sort((a, b) => a.period.localeCompare(b.period))

    // Application funnel
    const appliedCount = Number(heroRow.applied_count || 0)
    const underProcessCount = Number(heroRow.under_process_count || 0)
    const approvedCount = Number(heroRow.approved_count || 0)
    const paidCount = Number(heroRow.paid_count || 0)
    const rejectedCount = Number(heroRow.rejected_count || 0)

    const funnel = [
      { stage: 'Applied', count: appliedCount, color: '#38bdf8', percentage: totalApps > 0 ? Math.round((appliedCount / totalApps) * 100) : 0 },
      { stage: 'Under Process', count: underProcessCount, color: '#fbbf24', percentage: totalApps > 0 ? Math.round((underProcessCount / totalApps) * 100) : 0 },
      { stage: 'Approved', count: approvedCount, color: '#a855f7', percentage: totalApps > 0 ? Math.round((approvedCount / totalApps) * 100) : 0 },
      { stage: 'Completed', count: completedApps, color: '#10b981', percentage: totalApps > 0 ? Math.round((completedApps / totalApps) * 100) : 0 },
      { stage: 'Paid Stages', count: paidCount, color: '#06b6d4', percentage: totalApps > 0 ? Math.round((paidCount / totalApps) * 100) : 0 },
      { stage: 'Rejected', count: rejectedCount, color: '#ef4444', percentage: totalApps > 0 ? Math.round((rejectedCount / totalApps) * 100) : 0 },
    ]

    // Creator follower tiers
    const tierRow = tiersRes.rows[0] || {}
    const totalTierUsers = Number(countersRow.all_time_creators || 1)
    const tiers = [
      { tier: 'nano', label: 'Nano Creators', range: '< 10K', count: Number(tierRow.nano || 0), percentage: Number(((Number(tierRow.nano || 0) / totalTierUsers) * 100).toFixed(1)), color: '#38bdf8' },
      { tier: 'micro', label: 'Micro Creators', range: '10K - 50K', count: Number(tierRow.micro || 0), percentage: Number(((Number(tierRow.micro || 0) / totalTierUsers) * 100).toFixed(1)), color: '#818cf8' },
      { tier: 'mid', label: 'Mid-Tier Creators', range: '50K - 200K', count: Number(tierRow.mid || 0), percentage: Number(((Number(tierRow.mid || 0) / totalTierUsers) * 100).toFixed(1)), color: '#a855f7' },
      { tier: 'macro', label: 'Macro Creators', range: '200K - 1M', count: Number(tierRow.macro || 0), percentage: Number(((Number(tierRow.macro || 0) / totalTierUsers) * 100).toFixed(1)), color: '#f43f5e' },
      { tier: 'mega', label: 'Mega / Celebs', range: '> 1M', count: Number(tierRow.mega || 0), percentage: Number(((Number(tierRow.mega || 0) / totalTierUsers) * 100).toFixed(1)), color: '#f59e0b' },
    ]

    // Gender breakdown
    const genderTotal = genderRes.rows.reduce((acc: number, r: any) => acc + Number(r.count || 0), 0)
    const gender = genderRes.rows.map((r: any) => {
      const raw = String(r.gender || 'unspecified').toLowerCase()
      let name = 'Unspecified'
      let color = '#94a3b8'
      if (raw.includes('female') || raw === 'f') {
        name = 'Female'
        color = '#ec4899'
      } else if (raw.includes('male') || raw === 'm') {
        name = 'Male'
        color = '#3b82f6'
      }
      return {
        name,
        count: Number(r.count || 0),
        percentage: genderTotal > 0 ? Number(((Number(r.count || 0) / genderTotal) * 100).toFixed(1)) : 0,
        color,
      }
    })

    // Budget Types
    const totalCampaignsCount = Number(countersRow.total_campaigns || 1)
    const budgetTypes = budgetTypesRes.rows.map((r: any) => ({
      type: r.budget_type || 'Unspecified',
      count: Number(r.count || 0),
      percentage: Math.round((Number(r.count || 0) / totalCampaignsCount) * 100),
    }))

    // Top campaigns transformed
    const topCampaigns = topCampaignsRes.rows.map((c: any) => {
      const total = Number(c.total_applications || 0)
      const comp = Number(c.completed_count || 0)
      return {
        id: c.id,
        campaign_code: c.campaign_code || '',
        brand_name: c.brand_name || 'Campaign',
        budget_type: c.budget_type || 'Barter',
        status: c.status || 'Active',
        total_applications: total,
        approved_count: Number(c.approved_count || 0),
        completed_count: comp,
        completion_rate: total > 0 ? Number(((comp / total) * 100).toFixed(1)) : 0,
        total_payout: Number(c.total_payout || 0),
      }
    })

    // Top States
    const totalStatesCount = topStatesRes.rows.reduce((acc: number, r: any) => acc + Number(r.count || 0), 0)
    const topStates = topStatesRes.rows.map((r: any) => ({
      state: r.state,
      count: Number(r.count || 0),
      percentage: totalStatesCount > 0 ? Number(((Number(r.count || 0) / totalStatesCount) * 100).toFixed(1)) : 0,
    }))

    const campaignsList = campaignsListRes.rows.map((c: any) => ({
      id: c.id,
      code: c.campaign_code || '',
      brand: c.brand_name || '',
    }))

    return NextResponse.json({
      kpis: {
        totalApps,
        allTimeApps: Number(allTimeRow.all_time_apps || 0),
        appliedCount,
        underProcessCount,
        approvedCount,
        completedCount: completedApps,
        rejectedCount,
        paidCount,
        completionRate,
        ghostedCount: ghostedApps,
        ghostedRate,
        totalPayoutDisbursed: Number(heroRow.total_payout_disbursed || 0),
        allTimePayoutDisbursed: Number(allTimeRow.all_time_payout || 0),
        totalPendingLiability: Number(heroRow.total_pending_liability || 0),
        activeCampaigns: Number(countersRow.active_campaigns || 0),
        totalCampaigns: Number(countersRow.total_campaigns || 0),
        periodCreators: Number(countersRow.period_creators || 0),
        allTimeCreators: Number(countersRow.all_time_creators || 0),
      },
      timeSeries: sortedTimeSeries,
      funnel,
      tiers,
      gender,
      budgetTypes,
      topCampaigns,
      topStates,
      campaignsList,
      meta: {
        range,
        granularity,
        campaignId,
        generatedAt: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('[API Admin Stats] Error:', error)
    return NextResponse.json(
      { error: 'Failed to aggregate platform statistics', details: error.message },
      { status: 500 }
    )
  }
}

function formatPeriodLabel(periodStr: string, granularity: string): string {
  try {
    if (granularity === 'month') {
      const [year, month] = periodStr.split('-')
      const d = new Date(Number(year), Number(month) - 1, 1)
      return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    }
    const d = new Date(periodStr)
    if (granularity === 'week') {
      return `Wk of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    }
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  } catch {
    return periodStr
  }
}
