import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

// POST /api/admin/campaigns/[id]/approve - Approve or Reject a Campaign (Dual Admin Governance)
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
    const { action, rejection_reason } = body

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: 'Invalid action. Must be "approve" or "reject"' }, { status: 400 })
    }

    await client.connect()

    // 1. Fetch current campaign
    const campRes = await client.query('SELECT * FROM public.campaigns WHERE id = $1', [id])
    if (campRes.rows.length === 0) {
      await client.end()
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaign = campRes.rows[0]
    const isSuperAdmin = admin.role === 'super_admin' || Boolean(admin.is_super_admin)

    // 2. Maker-Checker Rule: Creator cannot self-approve unless Super Admin
    if (!isSuperAdmin && campaign.created_by_admin_id && campaign.created_by_admin_id === admin.id) {
      await client.end()
      return NextResponse.json({
        error: 'Dual control required: You created this campaign and cannot self-approve. Another admin or Super Admin must review and approve it.'
      }, { status: 403 })
    }

    const adminName = admin.full_name || admin.name || (isSuperAdmin ? 'Super Admin' : 'Admin')
    const adminEmail = admin.email || ''

    if (action === 'approve') {
      const updateRes = await client.query(
        `
        UPDATE public.campaigns
        SET 
          approval_status = 'Approved',
          status = 'Active',
          is_live = true,
          approved_by_admin_id = $1,
          approved_by_admin_name = $2,
          approved_by_admin_email = $3,
          approved_at = NOW(),
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE id = $4
        RETURNING *;
        `,
        [admin.id, adminName, adminEmail, id]
      )

      await client.end()
      return NextResponse.json({
        success: true,
        message: `Campaign "${campaign.brand_name}" (${campaign.campaign_code}) approved and published live!`,
        campaign: updateRes.rows[0]
      })
    } else {
      // Reject
      const reason = rejection_reason || 'Rejected by Admin during review'
      const updateRes = await client.query(
        `
        UPDATE public.campaigns
        SET 
          approval_status = 'Rejected',
          status = 'Review',
          is_live = false,
          rejection_reason = $1,
          updated_at = NOW()
        WHERE id = $2
        RETURNING *;
        `,
        [reason, id]
      )

      await client.end()
      return NextResponse.json({
        success: true,
        message: `Campaign "${campaign.brand_name}" (${campaign.campaign_code}) marked as Rejected.`,
        campaign: updateRes.rows[0]
      })
    }
  } catch (error) {
    console.error('API /admin/campaigns/[id]/approve Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    try {
      await client.end()
    } catch {}
  }
}
