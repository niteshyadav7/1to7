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
    let campaignAllowCuration = true
    try {
      const campRes = await pool.query(
        `
        SELECT COALESCE(allow_brand_curation, true) as allow_brand_curation
        FROM public.campaigns
        WHERE id::text = $1 OR campaign_code = $1
        LIMIT 1;
        `,
        [String(campaignId)]
      )
      if (campRes.rows[0]) {
        campaignAllowCuration = Boolean(campRes.rows[0].allow_brand_curation)
      }

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
          a.client_commercial,
          a.is_commercial_pitch,
          a.address_status,
          a.address_verified_at,
          u.shipping_addresses,
          a.form_data,
          a.created_at as applied_at,
          u.id as user_id,
          u.full_name as creator_name,
          u.influencer_id,
          u.instagram_username,
          u.followers,
          COALESCE(u.instagram_profile_pic, '') as profile_photo,
          u.instagram_profile_pic,
          u.city,
          u.state,
          u.gender,
          c.campaign_code,
          c.brand_name,
          c.deliverables,
          c.budget_type,
          COALESCE(c.allow_brand_curation, true) as allow_brand_curation
        FROM public.applications a
        JOIN public.users u ON a.user_id = u.id
        JOIN public.campaigns c ON a.campaign_id = c.id
        WHERE (a.campaign_id::text = $1 OR a.campaign_id::text = (SELECT id::text FROM public.campaigns WHERE campaign_code = $1 LIMIT 1))
          AND a.brand_review_status IN ('pending_brand_review', 'brand_approved', 'brand_rejected', 'changes_requested', 'on_hold')
        ORDER BY a.brand_pitched_at DESC NULLS LAST, a.created_at DESC
      `
      const res = await pool.query(query, [String(campaignId)])
      rows = res.rows
      if (rows.length > 0) {
        const firstMeta = rows[0].form_data?.brand_curation
        if (firstMeta && firstMeta.allow_brand_curation !== undefined) {
          campaignAllowCuration = Boolean(firstMeta.allow_brand_curation)
        } else {
          campaignAllowCuration = Boolean(rows[0].allow_brand_curation !== false)
        }
      }
    } catch (dbErr: any) {
      console.warn('DB query error in brand creators route:', dbErr.message)
    }

    // Apply strict privacy masking
    const sanitizedList = rows.map((row) => sanitizeCreatorForBrand(row))

    // Apply client filters
    const filtered = sanitizedList.filter((item) => {
      if (statusFilter === 'pending' && item.brand_review_status !== 'pending_brand_review' && item.brand_review_status !== 'on_hold') {
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
      allow_brand_curation: campaignAllowCuration,
      creators: filtered,
      counts: {
        total: sanitizedList.length,
        pending: sanitizedList.filter((c) => c.brand_review_status === 'pending_brand_review' || c.brand_review_status === 'on_hold').length,
        approved: sanitizedList.filter((c) => c.brand_review_status === 'brand_approved').length,
        rejected: sanitizedList.filter((c) => c.brand_review_status === 'brand_rejected').length,
      },
    })
  } catch (error: any) {
    console.error('Brand Creators GET Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST: Execute 1-click Approve or Reject decisions from Brand Portal
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

    // Verify if campaign is in View-Only mode or auto-approves to admin
    let autoApproveOnBrandSelection = false
    try {
      const checkRes = await pool.query(
        `
        SELECT COALESCE(allow_brand_curation, true) as allow_brand_curation,
               COALESCE(auto_approve_on_brand_selection, false) as auto_approve_on_brand_selection
        FROM public.campaigns
        WHERE id::text = $1 OR campaign_code = $1
        LIMIT 1;
        `,
        [String(campaignId)]
      )
      if (checkRes.rows[0]) {
        if (checkRes.rows[0].allow_brand_curation === false) {
          return NextResponse.json(
            {
              error:
                'This campaign is in View-Only mode. Creator shortlisting and approvals are managed by your Account Manager.',
            },
            { status: 403 }
          )
        }
        autoApproveOnBrandSelection = Boolean(checkRes.rows[0].auto_approve_on_brand_selection)
      }
    } catch {
      // Non-fatal fallback
    }

    const isApprove = action === 'approve' || action === 'batch_approve'
    const newStatus = isApprove ? 'brand_approved' : 'brand_rejected'
    const timestamp = new Date().toISOString()
    const reviewerName = brandUser.full_name || brandUser.email || 'Brand Reviewer'

    try {
      // 1. Update applications brand_review_status (and sync platform status if auto_approve_on_brand_selection is active)
      const updateQuery = `
        UPDATE public.applications
        SET 
          brand_review_status = $1,
          brand_reviewed_at = $2::timestamptz,
          brand_reviewed_by = $3,
          brand_rejection_reason = $4,
          brand_feedback_notes = $5,
          status = CASE 
            WHEN $7 = true AND $1 = 'brand_approved' THEN 'Approved'::application_status 
            WHEN $7 = true AND $1 = 'brand_rejected' THEN 'Rejected'::application_status
            ELSE status 
          END,
          form_data = jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{brand_curation}',
            COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
              'brand_decision', $1::text,
              'brand_decided_by', $3::text,
              'brand_decided_at', $2::text,
              'is_finalized', $7::boolean
            ),
            true
          ),
          updated_at = NOW()
        WHERE id::text = ANY($6::text[])
        RETURNING id;
      `
      const updateResult = await pool.query(updateQuery, [
        newStatus,
        timestamp,
        reviewerName,
        isApprove ? null : (reason || 'Brand selection criteria not met'),
        notes || null,
        application_ids.map(String),
        autoApproveOnBrandSelection,
      ])

      const affectedCount = updateResult.rowCount || 0
      if (affectedCount === 0) {
        console.warn(`No application rows updated for IDs: ${application_ids.join(', ')}`)
      }

      // 2. Insert audit log entries (safely isolated so audit failure never rolls back the decision)
      try {
        const isValidUuid = (val?: string | null): boolean => {
          if (!val) return false
          return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)
        }

        const validBrandId = isValidUuid(brandUser.brand_id) ? brandUser.brand_id : null
        const validUserId = isValidUuid(brandUser.id) ? brandUser.id : null

        if (validBrandId) {
          for (const appId of application_ids) {
            const validTargetId = isValidUuid(appId) ? appId : null
            await pool.query(
              `INSERT INTO public.brand_audit_logs (brand_id, user_id, user_email, action, target_id, metadata)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [
                validBrandId,
                validUserId,
                brandUser.email || reviewerName,
                isApprove ? 'approved_creator' : 'rejected_creator',
                validTargetId,
                JSON.stringify({ campaign_id: campaignId, reason, notes, reviewer: reviewerName }),
              ]
            )
          }
        }
      } catch (auditErr: any) {
        console.warn('brand_audit_logs insert warning:', auditErr?.message)
      }
    } catch (dbErr: any) {
      console.error('CRITICAL DB update error in brand creators POST:', dbErr)
      return NextResponse.json(
        { error: `Database error updating creator status: ${dbErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      action,
      new_status: newStatus,
      updated_ids: application_ids,
      reviewed_at: timestamp,
      reviewed_by: reviewerName,
    })
  } catch (error: any) {
    console.error('Brand Creators POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
