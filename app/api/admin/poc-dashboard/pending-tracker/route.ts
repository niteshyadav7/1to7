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
  brandId?: string | null
  brandName: string
  campaignCode: string
  platform: string
  category: string
  budgetType: string
  status: string
  isLive: boolean
  createdAt: string
  orderFormRequired: boolean
  assignedPocs: AssignedPocInfo[]
  // Creator actions
  pendingOrders: number
  pendingDeliverables: number
  pendingPayments: number
  pendingApplications: number
  pendingGhosted: number
  totalCriticalPending: number
  isClear: boolean
  // Brand & KAM actions
  brandPitched: number
  brandApproved: number
  brandRejected: number
  brandSlaWarnings: number
  brandSlaBreaches: number
  brandDispatchPending: number
  brandContentPending: number
  brandContactName?: string | null
  brandContactPhone?: string | null
  totalBrandCriticalPending: number
  isBrandClear: boolean
  // 360 combined pending
  totalCombinedPending: number
  quickLinks: {
    ordersUrl: string
    completionUrl: string
    paymentsUrl: string
    applicationsUrl: string
    ghostedUrl?: string
    brandPitchesUrl: string
    brandDispatchUrl: string
    brandSlaUrl: string
  }
}

export interface PendingTrackerResponse {
  success: boolean
  summary: {
    totalAssignedCampaigns: number
    // Creator metrics
    totalPendingOrders: number
    totalPendingDeliverables: number
    totalPendingPayments: number
    totalPendingApplications: number
    totalPendingGhosted: number
    totalCriticalPending: number
    isAllClear: boolean
    // Brand metrics
    totalBrandPitched: number
    totalBrandApproved: number
    totalBrandRejected: number
    totalBrandSlaWarnings: number
    totalBrandSlaBreaches: number
    totalBrandDispatchPending: number
    totalBrandContentPending: number
    totalBrandCriticalPending: number
    isBrandAllClear: boolean
    // Combined 360
    totalCombinedPending: number
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

    // 2. Query campaigns and aggregate pending items for both Creator and Brand operations
    const queryParams: any[] = []
    let whereClauses: string[] = []

    if (targetPocId && targetPocId !== 'all') {
      queryParams.push(targetPocId)
      whereClauses.push(`($${queryParams.length} = ANY(c.poc_admin_ids) OR b.assigned_1to7_kam_id = $${queryParams.length})`)
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const campaignsQuery = `
      SELECT 
        c.id,
        c.brand_id,
        COALESCE(b.name, c.brand_name) AS brand_name,
        c.campaign_code,
        c.platform,
        c.category,
        c.budget_type,
        c.status,
        c.is_live,
        c.order_form,
        c.poc_admin_ids,
        c.created_at,
        b.primary_contact_name,
        b.primary_contact_phone,
        -- Creator Action Form Submissions (Strictly gated by c.order_form and non-empty JSONB)
        COUNT(app.id) FILTER (
          WHERE COALESCE(c.order_form, false) = true
          AND app.form_data->'order_details' IS NOT NULL 
          AND app.form_data->'order_details' != '{}'::jsonb
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
        COUNT(app.id) FILTER (
          WHERE app.is_ghosted = true
        ) AS pending_ghosted,
        -- Brand & KAM Operations
        COUNT(app.id) FILTER (
          WHERE app.brand_review_status = 'pending_brand_review'
        ) AS brand_pitched,
        COUNT(app.id) FILTER (
          WHERE app.brand_review_status = 'brand_approved'
        ) AS brand_approved,
        COUNT(app.id) FILTER (
          WHERE app.brand_review_status = 'brand_rejected'
        ) AS brand_rejected,
        COUNT(app.id) FILTER (
          WHERE app.brand_review_status = 'pending_brand_review'
          AND COALESCE(app.brand_pitched_at, (app.form_data->'sent_to_brand'->>'sent_at')::timestamptz, app.created_at) < NOW() - INTERVAL '48 hours'
        ) AS brand_sla_breaches,
        COUNT(app.id) FILTER (
          WHERE app.brand_review_status = 'pending_brand_review'
          AND COALESCE(app.brand_pitched_at, (app.form_data->'sent_to_brand'->>'sent_at')::timestamptz, app.created_at) >= NOW() - INTERVAL '48 hours'
          AND COALESCE(app.brand_pitched_at, (app.form_data->'sent_to_brand'->>'sent_at')::timestamptz, app.created_at) < NOW() - INTERVAL '24 hours'
        ) AS brand_sla_warnings,
        COUNT(app.id) FILTER (
          WHERE app.brand_review_status = 'brand_approved'
          AND (app.address_status IS NULL OR app.address_status != 'Verified')
        ) AS brand_dispatch_pending,
        COUNT(app.id) FILTER (
          WHERE app.brand_content_status = 'pending'
          AND (app.completion_submitted_at IS NOT NULL OR app.form_data->'completion_submission' IS NOT NULL)
        ) AS brand_content_pending,
        COUNT(app.id) AS total_applications
      FROM public.campaigns c
      LEFT JOIN public.brands b ON c.brand_id = b.id
      LEFT JOIN (
        public.applications app
        JOIN public.users u ON app.user_id = u.id AND COALESCE(u.is_archived, false) = false
      ) ON app.campaign_id = c.id
        AND COALESCE(app.is_archived, false) = false
        AND app.status != 'Archived'
      ${whereSQL}
      GROUP BY c.id, c.order_form, b.id, b.name, b.primary_contact_name, b.primary_contact_phone
      ORDER BY (
        COUNT(app.id) FILTER (
          WHERE COALESCE(c.order_form, false) = true
          AND app.form_data->'order_details' IS NOT NULL 
          AND app.form_data->'order_details' != '{}'::jsonb
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
          WHERE app.brand_review_status = 'pending_brand_review'
          AND COALESCE(app.brand_pitched_at, (app.form_data->'sent_to_brand'->>'sent_at')::timestamptz, app.created_at) < NOW() - INTERVAL '48 hours'
        )
      ) DESC, c.created_at DESC
    `

    const res = await pool.query(campaignsQuery, queryParams)

    let totalPendingOrders = 0
    let totalPendingDeliverables = 0
    let totalPendingPayments = 0
    let totalPendingApplications = 0
    let totalPendingGhosted = 0

    let totalBrandPitched = 0
    let totalBrandApproved = 0
    let totalBrandRejected = 0
    let totalBrandSlaWarnings = 0
    let totalBrandSlaBreaches = 0
    let totalBrandDispatchPending = 0
    let totalBrandContentPending = 0

    let items: CampaignPendingItem[] = res.rows.map(row => {
      const rawPocIds: string[] = Array.isArray(row.poc_admin_ids) ? row.poc_admin_ids : []
      const assignedPocs: AssignedPocInfo[] = rawPocIds
        .map(id => staffMap.get(id))
        .filter((poc): poc is AssignedPocInfo => Boolean(poc))

      const orderFormRequired = Boolean(row.order_form)

      // Creator Metrics
      const pendingOrders = orderFormRequired ? (parseInt(row.pending_orders) || 0) : 0
      const pendingDeliverables = parseInt(row.pending_deliverables) || 0
      const pendingPayments = parseInt(row.pending_payments) || 0
      const pendingApplications = parseInt(row.pending_applications) || 0
      const pendingGhosted = parseInt(row.pending_ghosted) || 0

      totalPendingOrders += pendingOrders
      totalPendingDeliverables += pendingDeliverables
      totalPendingPayments += pendingPayments
      totalPendingApplications += pendingApplications
      totalPendingGhosted += pendingGhosted

      // Brand & KAM Metrics
      const brandPitched = parseInt(row.brand_pitched) || 0
      const brandApproved = parseInt(row.brand_approved) || 0
      const brandRejected = parseInt(row.brand_rejected) || 0
      const brandSlaBreaches = parseInt(row.brand_sla_breaches) || 0
      const brandSlaWarnings = parseInt(row.brand_sla_warnings) || 0
      const brandDispatchPending = parseInt(row.brand_dispatch_pending) || 0
      const brandContentPending = parseInt(row.brand_content_pending) || 0

      totalBrandPitched += brandPitched
      totalBrandApproved += brandApproved
      totalBrandRejected += brandRejected
      totalBrandSlaBreaches += brandSlaBreaches
      totalBrandSlaWarnings += brandSlaWarnings
      totalBrandDispatchPending += brandDispatchPending
      totalBrandContentPending += brandContentPending

      const totalCriticalPending = pendingOrders + pendingDeliverables + pendingPayments
      const isClear = totalCriticalPending === 0

      const totalBrandCriticalPending = brandPitched + brandSlaBreaches + brandDispatchPending
      const isBrandClear = totalBrandCriticalPending === 0

      const totalCombinedPending = totalCriticalPending + totalBrandCriticalPending

      return {
        id: row.id,
        brandId: row.brand_id ? String(row.brand_id) : null,
        brandName: row.brand_name || 'Untitled Campaign',
        campaignCode: row.campaign_code || '—',
        platform: row.platform || 'Instagram',
        category: row.category || 'General',
        budgetType: row.budget_type || 'Barter',
        status: row.status || 'Active',
        isLive: Boolean(row.is_live),
        orderFormRequired,
        createdAt: row.created_at,
        assignedPocs,
        // Creator
        pendingOrders,
        pendingDeliverables,
        pendingPayments,
        pendingApplications,
        pendingGhosted,
        totalCriticalPending,
        isClear,
        // Brand
        brandPitched,
        brandApproved,
        brandRejected,
        brandSlaWarnings,
        brandSlaBreaches,
        brandDispatchPending,
        brandContentPending,
        brandContactName: row.primary_contact_name || null,
        brandContactPhone: row.primary_contact_phone || null,
        totalBrandCriticalPending,
        isBrandClear,
        totalCombinedPending,
        quickLinks: {
          ordersUrl: `/admin/order-details?status=Pending&brand=${encodeURIComponent(row.brand_name || '')}&campaignCode=${encodeURIComponent(row.campaign_code || '')}`,
          completionUrl: `/admin/completion-details?tab=pending&brand=${encodeURIComponent(row.brand_name || '')}&search=${encodeURIComponent(row.campaign_code || row.brand_name || '')}`,
          paymentsUrl: `/admin/payments?status=Payment+Requested&brand=${encodeURIComponent(row.brand_name || '')}&search=${encodeURIComponent(row.campaign_code || row.brand_name || '')}`,
          applicationsUrl: `/admin/applications?status=Applied&campaign=${encodeURIComponent(row.campaign_code || row.brand_name || '')}`,
          ghostedUrl: `/admin/poc-dashboard?tab=ghosted&campaign=${encodeURIComponent(row.campaign_code || row.brand_name || '')}`,
          brandPitchesUrl: `/brand-admin/campaign-pitches?campaignId=${encodeURIComponent(row.id)}`,
          brandDispatchUrl: `/brand-admin/brand-dispatch?campaign=${encodeURIComponent(row.id)}`,
          brandSlaUrl: `/brand-admin/reviews-sla`,
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
      items = items.filter(c => c.totalCombinedPending > 0)
    }

    const totalCriticalPending = totalPendingOrders + totalPendingDeliverables + totalPendingPayments
    const isAllClear = totalCriticalPending === 0

    const totalBrandCriticalPending = totalBrandPitched + totalBrandSlaBreaches + totalBrandDispatchPending
    const isBrandAllClear = totalBrandCriticalPending === 0

    const totalCombinedPending = totalCriticalPending + totalBrandCriticalPending

    return NextResponse.json({
      success: true,
      summary: {
        totalAssignedCampaigns: items.length,
        // Creator metrics
        totalPendingOrders,
        totalPendingDeliverables,
        totalPendingPayments,
        totalPendingApplications,
        totalPendingGhosted,
        totalCriticalPending,
        isAllClear,
        // Brand metrics
        totalBrandPitched,
        totalBrandApproved,
        totalBrandRejected,
        totalBrandSlaWarnings,
        totalBrandSlaBreaches,
        totalBrandDispatchPending,
        totalBrandContentPending,
        totalBrandCriticalPending,
        isBrandAllClear,
        // Combined
        totalCombinedPending,
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
