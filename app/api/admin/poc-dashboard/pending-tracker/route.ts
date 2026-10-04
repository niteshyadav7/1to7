import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export interface AssignedPocInfo {
  id: string
  name: string
  email: string
  role: string
  avatarUrl: string | null
  roleDisplayName: string
}

export interface CampaignPendingItem {
  id: string
  brandName: string
  campaignCode: string
  platform: string
  category: string
  budgetType: string
  status: string
  isLive: boolean
  createdAt: string
  assignedPocs: AssignedPocInfo[]
  pendingOrders: number
  pendingDeliverables: number
  pendingPayments: number
  pendingApplications: number
  totalCriticalPending: number
  isClear: boolean
  quickLinks: {
    ordersUrl: string
    completionUrl: string
    paymentsUrl: string
    applicationsUrl: string
  }
}

export interface PendingTrackerResponse {
  success: boolean
  summary: {
    totalAssignedCampaigns: number
    totalPendingOrders: number
    totalPendingDeliverables: number
    totalPendingPayments: number
    totalPendingApplications: number
    totalCriticalPending: number
    isAllClear: boolean
  }
  campaigns: CampaignPendingItem[]
  allStaff: AssignedPocInfo[]
  selectedPoc: AssignedPocInfo | null
}

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
      hasModuleAccess(admin, 'campaigns') ||
      hasModuleAccess(admin, 'order_details') ||
      hasModuleAccess(admin, 'applications')

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden: Access restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const pocIdParam = searchParams.get('pocId')
    const search = searchParams.get('search')?.trim().toLowerCase() || ''
    const onlyPending = searchParams.get('onlyPending') === 'true'

    // Determine target POC filter
    // If not super admin and no specific permission, force viewing assigned campaigns
    const isSuperAdmin = admin.role === 'super_admin' || Boolean(admin.is_super_admin)
    let targetPocId = pocIdParam

    if (!targetPocId) {
      targetPocId = isSuperAdmin ? 'all' : admin.id
    }

    // 1. Fetch active staff
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
      ORDER BY a.name ASC
    `)

    const staffMap = new Map<string, AssignedPocInfo>()
    const allStaff: AssignedPocInfo[] = staffRes.rows.map(staff => {
      const info: AssignedPocInfo = {
        id: staff.id,
        name: staff.name || 'Team Member',
        email: staff.email,
        role: staff.role,
        avatarUrl: staff.avatar_url || null,
        roleDisplayName: staff.role_display_name || 'Brand Manager',
      }
      staffMap.set(staff.id, info)
      return info
    })

    const selectedPoc = targetPocId && targetPocId !== 'all' ? (staffMap.get(targetPocId) || null) : null

    // 2. Query campaigns and aggregate pending items
    const queryParams: any[] = []
    let whereClauses: string[] = []

    if (targetPocId && targetPocId !== 'all') {
      queryParams.push(targetPocId)
      whereClauses.push(`$${queryParams.length} = ANY(c.poc_admin_ids)`)
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const campaignsQuery = `
      SELECT 
        c.id,
        c.brand_name,
        c.campaign_code,
        c.platform,
        c.category,
        c.budget_type,
        c.status,
        c.is_live,
        c.poc_admin_ids,
        c.created_at,
        COUNT(app.id) FILTER (
          WHERE app.form_data->>'order_details' IS NOT NULL 
          AND (app.form_data->>'order_details_approved' IS NULL OR app.form_data->>'order_details_approved' != 'true')
          AND app.status != 'Rejected'
        ) AS pending_orders,
        COUNT(app.id) FILTER (
          WHERE (
            app.completion_submitted_at IS NOT NULL 
            OR app.form_data->'completion_submission' IS NOT NULL
            OR (app.form_data->'payment_request' IS NOT NULL AND (
              app.form_data->'payment_request'->>'Post Link' IS NOT NULL 
              OR app.form_data->'payment_request'->>'supporting_document' IS NOT NULL 
              OR app.form_data->'payment_request'->>'live_date' IS NOT NULL
            ))
          )
          AND app.status != 'Completed'
          AND (app.form_data->>'completion_approved' IS NULL OR app.form_data->>'completion_approved' != 'true')
        ) AS pending_deliverables,
        COUNT(app.id) FILTER (
          WHERE app.form_data->'payment_request' IS NOT NULL
          AND (app.form_data->'payment_initiated' IS NULL OR app.form_data->'payment_initiated'->>'status' = 'rejected')
          AND app.form_data->'finance_payout_completed' IS NULL
          AND app.status != 'Rejected'
        ) AS pending_payments,
        COUNT(app.id) FILTER (
          WHERE app.status IN ('Applied', 'Under Review', 'Under Process')
        ) AS pending_applications,
        COUNT(app.id) AS total_applications
      FROM public.campaigns c
      LEFT JOIN public.applications app ON app.campaign_id = c.id
      ${whereSQL}
      GROUP BY c.id
      ORDER BY (
        COUNT(app.id) FILTER (
          WHERE app.form_data->>'order_details' IS NOT NULL 
          AND (app.form_data->>'order_details_approved' IS NULL OR app.form_data->>'order_details_approved' != 'true')
          AND app.status != 'Rejected'
        ) +
        COUNT(app.id) FILTER (
          WHERE (
            app.completion_submitted_at IS NOT NULL 
            OR app.form_data->'completion_submission' IS NOT NULL
            OR (app.form_data->'payment_request' IS NOT NULL AND (
              app.form_data->'payment_request'->>'Post Link' IS NOT NULL 
              OR app.form_data->'payment_request'->>'supporting_document' IS NOT NULL 
              OR app.form_data->'payment_request'->>'live_date' IS NOT NULL
            ))
          )
          AND app.status != 'Completed'
          AND (app.form_data->>'completion_approved' IS NULL OR app.form_data->>'completion_approved' != 'true')
        ) +
        COUNT(app.id) FILTER (
          WHERE app.form_data->'payment_request' IS NOT NULL
          AND (app.form_data->'payment_initiated' IS NULL OR app.form_data->'payment_initiated'->>'status' = 'rejected')
          AND app.form_data->'finance_payout_completed' IS NULL
          AND app.status != 'Rejected'
        )
      ) DESC, c.created_at DESC
    `

    const res = await pool.query(campaignsQuery, queryParams)

    let totalPendingOrders = 0
    let totalPendingDeliverables = 0
    let totalPendingPayments = 0
    let totalPendingApplications = 0

    let items: CampaignPendingItem[] = res.rows.map(row => {
      const rawPocIds: string[] = Array.isArray(row.poc_admin_ids) ? row.poc_admin_ids : []
      const assignedPocs: AssignedPocInfo[] = rawPocIds
        .map(id => staffMap.get(id))
        .filter((poc): poc is AssignedPocInfo => Boolean(poc))

      const pendingOrders = parseInt(row.pending_orders) || 0
      const pendingDeliverables = parseInt(row.pending_deliverables) || 0
      const pendingPayments = parseInt(row.pending_payments) || 0
      const pendingApplications = parseInt(row.pending_applications) || 0

      totalPendingOrders += pendingOrders
      totalPendingDeliverables += pendingDeliverables
      totalPendingPayments += pendingPayments
      totalPendingApplications += pendingApplications

      const totalCriticalPending = pendingOrders + pendingDeliverables + pendingPayments
      const isClear = totalCriticalPending === 0

      return {
        id: row.id,
        brandName: row.brand_name || 'Untitled Campaign',
        campaignCode: row.campaign_code || '—',
        platform: row.platform || 'Instagram',
        category: row.category || 'General',
        budgetType: row.budget_type || 'Barter',
        status: row.status || 'Active',
        isLive: Boolean(row.is_live),
        createdAt: row.created_at,
        assignedPocs,
        pendingOrders,
        pendingDeliverables,
        pendingPayments,
        pendingApplications,
        totalCriticalPending,
        isClear,
        quickLinks: {
          ordersUrl: `/admin/order-details?status=Pending&brand=${encodeURIComponent(row.brand_name || '')}&campaignCode=${encodeURIComponent(row.campaign_code || '')}`,
          completionUrl: `/admin/completion-details?tab=pending&brand=${encodeURIComponent(row.brand_name || '')}&search=${encodeURIComponent(row.campaign_code || row.brand_name || '')}`,
          paymentsUrl: `/admin/payments?status=Payment+Requested&brand=${encodeURIComponent(row.brand_name || '')}&search=${encodeURIComponent(row.campaign_code || row.brand_name || '')}`,
          applicationsUrl: `/admin/applications?status=Applied&campaign=${encodeURIComponent(row.campaign_code || row.brand_name || '')}`,
        }
      }
    })

    // Filter by search query if provided
    if (search) {
      items = items.filter(
        c =>
          c.brandName.toLowerCase().includes(search) ||
          c.campaignCode.toLowerCase().includes(search) ||
          c.assignedPocs.some(p => p.name.toLowerCase().includes(search))
      )
    }

    // Filter by only pending if toggled
    if (onlyPending) {
      items = items.filter(c => c.totalCriticalPending > 0)
    }

    const totalCriticalPending = totalPendingOrders + totalPendingDeliverables + totalPendingPayments
    const isAllClear = totalCriticalPending === 0

    return NextResponse.json({
      success: true,
      summary: {
        totalAssignedCampaigns: items.length,
        totalPendingOrders,
        totalPendingDeliverables,
        totalPendingPayments,
        totalPendingApplications,
        totalCriticalPending,
        isAllClear,
      },
      campaigns: items,
      allStaff,
      selectedPoc,
    })
  } catch (error: any) {
    console.error('API /admin/poc-dashboard/pending-tracker Error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}
