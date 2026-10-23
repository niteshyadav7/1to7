import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'
import { CampaignEditLogEntry } from '@/lib/utils/campaign-audit-diff'

// POST /api/admin/campaigns/[id]/lifecycle
// Actions: 'close' | 'complete' | 'reopen'
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!process.env.POSTGRES_URL) {
    return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })

  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'campaigns')) {
      return NextResponse.json({ error: 'Unauthorized: Permission denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, reject_pending, rejection_reason } = body

    if (!['close', 'complete', 'reopen'].includes(action)) {
      return NextResponse.json({
        error: 'Invalid action. Supported actions are "close", "complete", "reopen".'
      }, { status: 400 })
    }

    await client.connect()

    // 1. Fetch current campaign
    const campRes = await client.query('SELECT * FROM public.campaigns WHERE id = $1', [id])
    if (campRes.rows.length === 0) {
      await client.end()
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaign = campRes.rows[0]
    const adminName = admin.full_name || admin.name || (admin.role === 'super_admin' ? 'Super Admin' : 'Admin')
    const adminEmail = admin.email || ''

    let newStatus = campaign.status
    let newIsLive = false
    let summaryText = ''
    let queryUpdates = ''
    const queryParams: any[] = [admin.id]

    let rejectedCount = 0

    if (action === 'close') {
      newStatus = 'Closed'
      newIsLive = false
      summaryText = 'Campaign Closed (Intake Stopped)'
      queryUpdates = `
        status = 'Closed',
        is_live = false,
        closed_at = NOW(),
        closed_by_admin_id = $1,
        last_edited_by_admin_id = $1,
        last_edited_by_admin_name = $2,
        last_edited_by_admin_email = $3,
        last_edited_at = NOW(),
        updated_at = NOW()
      `
      queryParams.push(adminName, adminEmail)

      // Optionally reject remaining pending applications
      if (reject_pending) {
        const defaultReason = rejection_reason || 'Campaign closed - application intake concluded.'
        const rejectRes = await client.query(
          `
          UPDATE public.applications
          SET 
            status = 'Rejected',
            updated_at = NOW()
          WHERE campaign_id = $1 AND status = 'Applied'
          RETURNING id;
          `,
          [id]
        )
        rejectedCount = rejectRes.rowCount || 0
      }
    } else if (action === 'complete') {
      newStatus = 'Completed'
      newIsLive = false
      summaryText = 'Campaign Marked as Completed'
      queryUpdates = `
        status = 'Completed',
        is_live = false,
        completed_at = NOW(),
        completed_by_admin_id = $1,
        last_edited_by_admin_id = $1,
        last_edited_by_admin_name = $2,
        last_edited_by_admin_email = $3,
        last_edited_at = NOW(),
        updated_at = NOW()
      `
      queryParams.push(adminName, adminEmail)

      // Optionally reject remaining pending applications if requested
      if (reject_pending) {
        const defaultReason = rejection_reason || 'Campaign concluded and marked as completed.'
        const rejectRes = await client.query(
          `
          UPDATE public.applications
          SET 
            status = 'Rejected',
            updated_at = NOW()
          WHERE campaign_id = $1 AND status = 'Applied'
          RETURNING id;
          `,
          [id]
        )
        rejectedCount = rejectRes.rowCount || 0
      }
    } else if (action === 'reopen') {
      newStatus = 'Active'
      // When reopening, keep is_live false by default so admin can review specs before going live
      newIsLive = false
      summaryText = 'Campaign Reopened / Reactivated to Active'
      queryUpdates = `
        status = 'Active',
        is_live = false,
        last_edited_by_admin_id = $1,
        last_edited_by_admin_name = $2,
        last_edited_by_admin_email = $3,
        last_edited_at = NOW(),
        updated_at = NOW()
      `
      queryParams.push(adminName, adminEmail)
    }

    // Prepare audit diff entry
    const diffEntry: CampaignEditLogEntry = {
      id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      edited_by_admin_id: admin.id,
      edited_by_admin_name: adminName,
      edited_by_admin_email: adminEmail,
      summary: rejectedCount > 0 ? `${summaryText} (${rejectedCount} unreviewed applicants marked Rejected)` : summaryText,
      changes_count: campaign.is_live !== newIsLive ? 2 : 1,
      changes: [
        {
          field: 'status',
          label: 'Campaign Lifecycle Status',
          category: 'general',
          old_value: campaign.status,
          new_value: newStatus,
          old_display: campaign.status,
          new_display: newStatus,
        },
        ...(campaign.is_live !== newIsLive ? [{
          field: 'is_live',
          label: 'Live Publication Status',
          category: 'general' as const,
          old_value: campaign.is_live,
          new_value: newIsLive,
          old_display: campaign.is_live ? 'Live' : 'Offline',
          new_display: newIsLive ? 'Live' : 'Offline',
        }] : [])
      ],
    }

    const existingHistory = Array.isArray(campaign.edit_history) ? campaign.edit_history : []
    const updatedHistory = [diffEntry, ...existingHistory].slice(0, 30)

    queryParams.push(JSON.stringify(updatedHistory))
    const historyParamIdx = queryParams.length
    queryParams.push(id)
    const idParamIdx = queryParams.length

    const updateQuery = `
      UPDATE public.campaigns
      SET 
        ${queryUpdates},
        edit_history = $${historyParamIdx}::jsonb
      WHERE id = $${idParamIdx}
      RETURNING *;
    `

    const updateRes = await client.query(updateQuery, queryParams)
    await client.end()

    let friendlyMessage = ''
    if (action === 'close') {
      friendlyMessage = `Campaign "${campaign.brand_name}" closed successfully.`
      if (rejectedCount > 0) {
        friendlyMessage += ` ${rejectedCount} pending applicants marked as Rejected.`
      }
    } else if (action === 'complete') {
      friendlyMessage = `Campaign "${campaign.brand_name}" marked as Completed.`
      if (rejectedCount > 0) {
        friendlyMessage += ` ${rejectedCount} pending applicants marked as Rejected.`
      }
    } else {
      friendlyMessage = `Campaign "${campaign.brand_name}" reopened and moved to Active. (Live toggle is Offline for review).`
    }

    return NextResponse.json({
      success: true,
      message: friendlyMessage,
      campaign: updateRes.rows[0],
      rejected_count: rejectedCount
    })
  } catch (error: any) {
    console.error('API /admin/campaigns/[id]/lifecycle Error:', error)
    try { await client.end() } catch {}
    return NextResponse.json({
      error: error.message || 'Failed to update campaign lifecycle status'
    }, { status: 500 })
  }
}
