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

export interface AssignedPoc {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  roleDisplayName: string
}

export interface CampaignPocSummary {
  id: string
  brandName: string
  campaignCode: string
  platform: string
  category: string
  budgetType: string
  budgetAmount: number
  status: string
  isLive: boolean
  createdAt: string
  pocAdminIds: string[]
  assignedPocs: AssignedPoc[]
  totalApplications: number
  approvedCount: number
  completedCount: number
  completionRate: number
  totalPaid: number
}

/**
 * GET /api/admin/poc-dashboard/campaigns
 * Returns all campaigns with their assigned POCs and performance metrics for the selected time range.
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
    const range = searchParams.get('range') || 'this_month'
    const customStart = searchParams.get('startDate') || undefined
    const customEnd = searchParams.get('endDate') || undefined

    const { start, end } = getDateRange(range, customStart, customEnd)

    // 1. Fetch active admin staff to map POC details
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
    `)

    const staffMap = new Map<string, AssignedPoc>()
    staffRes.rows.forEach(staff => {
      staffMap.set(staff.id, {
        id: staff.id,
        name: staff.name || 'Staff Member',
        email: staff.email,
        role: staff.role,
        avatarUrl: staff.avatar_url || null,
        roleDisplayName: staff.role_display_name || 'Operations Admin',
      })
    })

    // 2. Fetch campaigns and aggregate applications metrics for the date range
    const campaignsRes = await pool.query(
      `
      SELECT 
        c.id,
        c.brand_name,
        c.campaign_code,
        c.platform,
        c.category,
        c.budget_type,
        c.budget_amount,
        c.status,
        c.is_live,
        c.poc_admin_ids,
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
      GROUP BY c.id
      ORDER BY total_applications DESC, c.created_at DESC
    `,
      [start, end]
    )

    let totalCampaignsCount = 0
    let assignedCampaignsCount = 0
    let unassignedCampaignsCount = 0
    let totalAppsSum = 0
    let totalApprovedSum = 0
    let totalCompletedSum = 0
    let totalPaidSum = 0

    const campaigns: CampaignPocSummary[] = campaignsRes.rows.map(row => {
      totalCampaignsCount++
      const rawPocIds: string[] = Array.isArray(row.poc_admin_ids) ? row.poc_admin_ids : []
      const assignedPocs: AssignedPoc[] = rawPocIds
        .map(id => staffMap.get(id))
        .filter((poc): poc is AssignedPoc => Boolean(poc))

      if (assignedPocs.length > 0) {
        assignedCampaignsCount++
      } else {
        unassignedCampaignsCount++
      }

      const totalApplications = parseInt(row.total_applications) || 0
      const approvedCount = parseInt(row.approved_count) || 0
      const completedCount = parseInt(row.completed_count) || 0
      const totalPaid = parseFloat(row.total_paid) || 0

      totalAppsSum += totalApplications
      totalApprovedSum += approvedCount
      totalCompletedSum += completedCount
      totalPaidSum += totalPaid

      const completionRate =
        approvedCount > 0 ? Math.round((completedCount / approvedCount) * 1000) / 10 : 0

      return {
        id: row.id,
        brandName: row.brand_name || 'Untitled Campaign',
        campaignCode: row.campaign_code || '—',
        platform: row.platform || 'Instagram',
        category: row.category || 'General',
        budgetType: row.budget_type || 'Barter',
        budgetAmount: parseFloat(row.budget_amount) || 0,
        status: row.status || 'Active',
        isLive: Boolean(row.is_live),
        createdAt: row.created_at,
        pocAdminIds: rawPocIds,
        assignedPocs,
        totalApplications,
        approvedCount,
        completedCount,
        completionRate,
        totalPaid,
      }
    })

    return NextResponse.json({
      success: true,
      range,
      period: { start, end },
      summary: {
        totalCampaigns: totalCampaignsCount,
        assignedCount: assignedCampaignsCount,
        unassignedCount: unassignedCampaignsCount,
        totalApplications: totalAppsSum,
        totalApproved: totalApprovedSum,
        totalCompleted: totalCompletedSum,
        totalPaid: totalPaidSum,
        overallCompletionRate:
          totalApprovedSum > 0 ? Math.round((totalCompletedSum / totalApprovedSum) * 1000) / 10 : 0,
      },
      allStaff: Array.from(staffMap.values()).map(s => ({ id: s.id, name: s.name })),
      campaigns,
    })
  } catch (error: any) {
    console.error('Error fetching POC campaigns matrix:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to load campaigns analytics' },
      { status: 500 }
    )
  }
}
