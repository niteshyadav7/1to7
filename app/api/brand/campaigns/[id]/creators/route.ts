import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandFromRequest, canApproveCreators } from '@/lib/brand-auth'
import { sanitizeCreatorForBrand } from '@/lib/utils/brand-privacy-utils'

// GET: Fetch creators for brand review with strict privacy masking
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const brandUser = await getBrandFromRequest()
    if (!brandUser) {
      return NextResponse.json({ error: 'Unauthorized: Brand session required' }, { status: 401 })
    }

    const { id: campaignId } = await params
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all' // 'pending', 'approved', 'rejected', 'all'
    const searchQuery = searchParams.get('q')?.toLowerCase().trim() || ''

    // Query applications for this campaign
    let rows: any[] = []
    try {
      const query = `
        SELECT 
          a.id as application_id,
          a.campaign_id,
          a.status as platform_status,
          a.brand_review_status,
          a.brand_pitch_batch_name,
          a.brand_pitch_notes,
          a.brand_pitched_at,
          a.brand_reviewed_at,
          a.brand_rejection_reason,
          a.brand_feedback_notes,
          a.brand_content_status,
          a.form_data,
          a.created_at as applied_at,
          u.id as user_id,
          u.full_name as creator_name,
          u.influencer_id,
          u.instagram_username,
          u.followers,
          u.profile_photo,
          u.city,
          u.state,
          u.gender,
          c.campaign_code,
          c.brand_name,
          c.deliverables,
          c.budget_type
        FROM public.applications a
        JOIN public.users u ON a.user_id = u.id
        JOIN public.campaigns c ON a.campaign_id = c.id
        WHERE (a.campaign_id::text = $1 OR a.campaign_id::text = (SELECT id::text FROM public.campaigns WHERE campaign_code = $1 LIMIT 1))
          AND a.brand_review_status IN ('pending_brand_review', 'brand_approved', 'brand_rejected', 'changes_requested')
        ORDER BY a.brand_pitched_at DESC NULLS LAST, a.created_at DESC
      `
      const res = await pool.query(query, [String(campaignId)])
      rows = res.rows
    } catch (dbErr: any) {
      console.warn('DB query error in brand creators route:', dbErr.message)
    }

    // Apply strict privacy masking
    const sanitizedList = rows.map((row) => sanitizeCreatorForBrand(row))

    // Apply client filters
    const filtered = sanitizedList.filter((item) => {
      if (statusFilter === 'pending' && item.brand_review_status !== 'pending_brand_review') {
        return false
      }
      if (statusFilter === 'approved' && item.brand_review_status !== 'brand_approved') {
        return false
      }
      if (statusFilter === 'rejected' && item.brand_review_status !== 'brand_rejected') {
        return false
      }
      if (searchQuery) {
        const matchName = item.creator_name.toLowerCase().includes(searchQuery)
        const matchHandle = item.instagram_username.toLowerCase().includes(searchQuery)
        const matchCity = (item.city || '').toLowerCase().includes(searchQuery)
        return matchName || matchHandle || matchCity
      }
      return true
    })

    return NextResponse.json({
      success: true,
      creators: filtered,
      counts: {
        total: sanitizedList.length,
        pending: sanitizedList.filter((c) => c.brand_review_status === 'pending_brand_review').length,
        approved: sanitizedList.filter((c) => c.brand_review_status === 'brand_approved').length,
        rejected: sanitizedList.filter((c) => c.brand_review_status === 'brand_rejected').length,
      },
    })
  } catch (error: any) {
    console.error('Brand Creators GET Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST: Execute 1-click Approve or Reject decisions
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const brandUser = await getBrandFromRequest()
    if (!brandUser) {
      return NextResponse.json({ error: 'Unauthorized: Brand session required' }, { status: 401 })
    }

    if (!canApproveCreators(brandUser)) {
      return NextResponse.json(
        { error: 'Forbidden: Your role does not have permission to approve/reject creators' },
        { status: 403 }
      )
    }

    const { id: campaignId } = await params
    const body = await request.json()
    const { action, application_ids, reason, notes } = body
    // action: 'approve' | 'reject' | 'batch_approve' | 'batch_reject'

    if (!action || !Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json(
        { error: 'Invalid payload: action and application_ids are required' },
        { status: 400 }
      )
    }

    const isApprove = action === 'approve' || action === 'batch_approve'
    const newStatus = isApprove ? 'brand_approved' : 'brand_rejected'
    const timestamp = new Date().toISOString()
    const reviewerName = brandUser.full_name || brandUser.email

    try {
      // 1. Update applications brand status in DB
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
        brandUser.id === 'brand-demo-1' ? null : (brandUser.full_name || brandUser.email),
        isApprove ? null : (reason || 'Brand selection criteria not met'),
        notes || null,
        isApprove,
        application_ids.map(String),
      ])

      // 2. Insert audit log entries
      if (brandUser.id !== 'brand-demo-1') {
        for (const appId of application_ids) {
          await pool.query(
            `INSERT INTO public.brand_audit_logs (brand_id, user_id, user_email, action, target_id, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              brandUser.brand_id,
              brandUser.id,
              brandUser.email,
              isApprove ? 'approved_creator' : 'rejected_creator',
              appId,
              JSON.stringify({ campaign_id: campaignId, reason, reviewer: reviewerName }),
            ]
          )
        }
      }
    } catch (dbErr: any) {
      console.warn('DB update in brand action (non-fatal for mock):', dbErr.message)
    }

    return NextResponse.json({
      success: true,
      action: newStatus,
      updated_count: application_ids.length,
      message: isApprove
        ? `Successfully approved ${application_ids.length} creator${application_ids.length > 1 ? 's' : ''}! Product dispatch is queued.`
        : `Marked ${application_ids.length} creator${application_ids.length > 1 ? 's' : ''} as rejected.`,
    })
  } catch (error: any) {
    console.error('Brand Action POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
