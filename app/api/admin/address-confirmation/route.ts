import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || (!hasModuleAccess(admin, 'applications') && !hasModuleAccess(admin, 'order_details'))) {
      return NextResponse.json({ error: 'Unauthorized: Access to address confirmation is restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id') || ''
    const statusFilter = searchParams.get('status') || 'All'
    const search = (searchParams.get('search') || '').trim().toLowerCase()
    const limit = Math.min(Math.max(1, parseInt(searchParams.get('limit') || '5000', 10)), 10000)

    let query = `
      SELECT 
        a.id,
        a.status,
        a.address_status,
        a.address_verified_at,
        a.address_verified_by,
        a.form_data,
        a.partial_payment,
        a.final_payment,
        a.pending_amount,
        a.created_at,
        a.updated_at,
        json_build_object(
          'id', c.id,
          'campaign_code', c.campaign_code,
          'brand_name', c.brand_name,
          'category', c.category,
          'platform', c.platform,
          'deliverables', c.deliverables,
          'address_required', c.address_required,
          'order_form', c.order_form,
          'order_form_fields', c.order_form_fields
        ) AS campaigns,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'influencer_id', u.influencer_id,
          'email', u.email,
          'mobile', u.mobile,
          'instagram_username', u.instagram_username,
          'followers', u.followers,
          'city', u.city,
          'state', u.state,
          'pincode', u.pincode,
          'profile_photo', u.instagram_profile_pic,
          'instagram_profile_pic', u.instagram_profile_pic,
          'shipping_addresses', u.shipping_addresses
        ) AS users
      FROM public.applications a
      JOIN public.campaigns c ON a.campaign_id = c.id
      JOIN public.users u ON a.user_id = u.id
      WHERE (
        c.address_required = true 
        OR a.address_status IS NOT NULL 
        OR (a.form_data->>'address_confirmed')::boolean = true
        OR (a.form_data->'shipping_address') IS NOT NULL
      )
    `

    const params: any[] = []

    if (campaignId && campaignId !== 'all') {
      params.push(campaignId)
      query += ` AND a.campaign_id = $${params.length}`
    }

    if (statusFilter && statusFilter !== 'All') {
      if (statusFilter === 'Pending') {
        query += ` AND (a.address_status = 'Pending' OR (a.address_status IS NULL AND (a.form_data->>'address_confirmed')::boolean = true))`
      } else if (statusFilter === 'Approved') {
        query += ` AND (a.address_status = 'Approved' OR (a.form_data->>'address_verified')::boolean = true)`
      } else if (statusFilter === 'Rejected') {
        query += ` AND (a.address_status = 'Rejected' OR a.form_data->>'address_status' = 'Rejected')`
      } else if (statusFilter === 'Not Submitted') {
        query += ` AND a.address_status IS NULL AND COALESCE((a.form_data->>'address_confirmed')::boolean, false) = false`
      }
    }

    if (search) {
      params.push(`%${search}%`)
      const pIdx = params.length
      query += ` AND (
        LOWER(u.full_name) LIKE $${pIdx}
        OR LOWER(COALESCE(u.influencer_id, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(u.instagram_username, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(u.mobile, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(c.brand_name, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(c.campaign_code, '')) LIKE $${pIdx}
        OR LOWER(COALESCE(a.form_data->'shipping_address'->>'city', '')) LIKE $${pIdx}
        OR LOWER(COALESCE(a.form_data->'shipping_address'->>'state', '')) LIKE $${pIdx}
        OR LOWER(COALESCE(a.form_data->'shipping_address'->>'pincode', '')) LIKE $${pIdx}
      )`
    }

    params.push(limit)
    query += ` ORDER BY a.updated_at DESC LIMIT $${params.length}`

    const res = await pool.query(query, params)

    return NextResponse.json({
      success: true,
      addresses: res.rows,
      total: res.rows.length,
    })
  } catch (error: any) {
    console.error('API /admin/address-confirmation GET Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || (!hasActionPermission(admin, 'applications', 'update') && !hasActionPermission(admin, 'order_details', 'update'))) {
      return NextResponse.json({ error: 'Unauthorized: Permission to update address verification is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { application_id, action, reason } = body

    if (!application_id || !action) {
      return NextResponse.json({ error: 'application_id and action are required' }, { status: 400 })
    }

    // Fetch existing application
    const appRes = await pool.query('SELECT id, form_data, status FROM public.applications WHERE id = $1', [application_id])
    if (appRes.rows.length === 0) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const currentApp = appRes.rows[0]
    const currentFd = currentApp.form_data || {}
    const nowIso = new Date().toISOString()

    let newStatus = currentApp.status
    let newAddressStatus = ''
    let updatedFd = { ...currentFd }

    if (action === 'approve') {
      newAddressStatus = 'Approved'
      updatedFd = {
        ...updatedFd,
        address_status: 'Approved',
        address_verified: true,
        address_verified_at: nowIso,
        address_verified_by_admin: admin.name || admin.full_name || 'Admin',
        address_rejection_reason: null,
      }
    } else if (action === 'reject') {
      newAddressStatus = 'Rejected'
      updatedFd = {
        ...updatedFd,
        address_status: 'Rejected',
        address_verified: false,
        address_confirmed: false, // Allows creator to open modal and re-submit
        address_rejected_at: nowIso,
        address_rejection_reason: reason || 'Address incomplete or unreachable. Please update and re-submit.',
      }
    } else {
      return NextResponse.json({ error: 'Invalid action. Must be approve or reject.' }, { status: 400 })
    }

    const updateRes = await pool.query(`
      UPDATE public.applications 
      SET 
        address_status = $1,
        address_verified_at = $2,
        address_verified_by = $3,
        form_data = $4,
        updated_at = $5
      WHERE id = $6
      RETURNING *
    `, [
      newAddressStatus,
      action === 'approve' ? nowIso : null,
      action === 'approve' ? admin.id : null,
      JSON.stringify(updatedFd),
      nowIso,
      application_id
    ])

    return NextResponse.json({
      success: true,
      message: action === 'approve' ? 'Address verified and approved!' : 'Address rejected and update requested.',
      application: updateRes.rows[0],
    })
  } catch (error: any) {
    console.error('API /admin/address-confirmation POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
