import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function GET(request: Request) {
  try {
    const admin = (await getBrandAdminFromRequest()) || (await getAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')?.trim() || ''
    const brandName = searchParams.get('brandName')?.trim() || ''

    if (!brandId && !brandName) {
      return NextResponse.json({ creators: [] })
    }

    const query = `
      SELECT 
        a.id,
        a.id as application_id,
        a.campaign_id,
        c.campaign_code,
        c.brand_name,
        COALESCE(c.category, c.brand_name, c.campaign_code, 'Campaign') as campaign_title,
        COALESCE(u.full_name, 'Creator') as name,
        COALESCE(u.instagram_username, '') as handle,
        COALESCE(u.followers, 0) as followers,
        COALESCE(u.city, 'Pan India') as city,
        COALESCE(
          a.form_data->>'sample_variant',
          a.form_data->'order_details'->>'variant',
          a.form_data->'order_details'->>'size',
          'Standard Sample'
        ) as sample,
        CASE 
          WHEN a.brand_review_status = 'brand_approved' THEN 'approved'
          WHEN a.brand_review_status = 'brand_rejected' THEN 'rejected'
          ELSE 'pending'
        END as status,
        a.brand_rejection_reason as "rejectionReason",
        a.client_commercial,
        a.is_commercial_pitch
      FROM public.applications a
      JOIN public.campaigns c ON a.campaign_id = c.id
      LEFT JOIN public.users u ON a.user_id = u.id
      WHERE (c.brand_id::text = $1 OR c.brand_name ILIKE $2)
        AND a.brand_review_status IN ('pending_brand_review', 'brand_approved', 'brand_rejected')
      ORDER BY a.created_at DESC;
    `
    const res = await pool.query(query, [brandId, `%${brandName || brandId}%`])

    return NextResponse.json({
      success: true,
      creators: res.rows || [],
    })
  } catch (error: any) {
    console.error('Error in virtual-brand creators route:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = (await getBrandAdminFromRequest()) || (await getAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const body = await request.json()
    const { action, application_ids, reason, notes, brand_name, brand_id } = body

    if (!action || !Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json({ error: 'Invalid payload: action and application_ids required' }, { status: 400 })
    }

    const isApprove = action === 'approve' || action === 'batch_approve'
    const newStatus = isApprove ? 'brand_approved' : 'brand_rejected'
    const timestamp = new Date().toISOString()
    const reviewerName = `[KAM Proxy] ${admin.name || admin.email}`

    const updateQuery = `
      UPDATE public.applications
      SET 
        brand_review_status = $1,
        brand_reviewed_at = $2,
        brand_reviewed_by = $3,
        brand_rejection_reason = $4,
        brand_feedback_notes = $5,
        status = CASE WHEN $6 = true THEN 'Approved'::application_status ELSE status END,
        updated_at = NOW()
      WHERE id::text = ANY($7::text[])
    `
    await pool.query(updateQuery, [
      newStatus,
      timestamp,
      reviewerName,
      isApprove ? null : (reason || 'Declined during KAM review'),
      notes || null,
      isApprove,
      application_ids.map(String),
    ])

    return NextResponse.json({ success: true, count: application_ids.length })
  } catch (err: any) {
    console.error('Error updating proxy creator decision:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
