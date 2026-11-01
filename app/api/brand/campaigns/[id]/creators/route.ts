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

    const { id: rawCampaignId } = await params
    const campaignId = rawCampaignId || 'all'
    const isAll = campaignId === 'all'
    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') || 'all' // 'pending', 'approved', 'rejected', 'all'
    const searchQuery = searchParams.get('q')?.toLowerCase().trim() || ''
    const specificCampaignFilter = searchParams.get('campaign_id') || (!isAll ? campaignId : null)

    const brandId = brandUser.brand_id || null
    const brandName = brandUser.brand_name || ''

    if (!pool) {
      return NextResponse.json({
        success: true,
        allow_brand_curation: true,
        campaigns: [],
        creators: [],
        counts: { total: 0, pending: 0, approved: 0, rejected: 0 }
      })
    }

    // 1. Fetch distinct campaigns list for this brand (for compact top campaign switcher)
    let campaignsList: Array<{
      id: string
      campaign_code: string
      title: string
      platform: string
      budget_type: string
      creator_count: number
      pending_count: number
    }> = []

    try {
      const campRes = await pool.query(
        `
        SELECT 
          c.id,
          c.campaign_code,
          COALESCE(c.brand_name, 'Brand') as brand_name,
          COALESCE(NULLIF(c.campaign_code, ''), 'Campaign') as code,
          COALESCE(NULLIF(c.campaign_code, ''), 'Campaign') as title,
          COALESCE(c.platform, 'Instagram') as platform,
          COALESCE(c.budget_type, 'Barter') as budget_type,
          COUNT(a.id)::int as creator_count,
          COUNT(a.id) FILTER (WHERE a.brand_review_status IN ('pending_brand_review', 'on_hold'))::int as pending_count
        FROM public.campaigns c
        LEFT JOIN public.applications a ON a.campaign_id = c.id
          AND a.brand_review_status IN ('pending_brand_review', 'brand_approved', 'brand_rejected', 'changes_requested', 'on_hold')
        WHERE (c.brand_id::text = $1 OR c.brand_name ILIKE $2)
        GROUP BY c.id
        ORDER BY c.created_at DESC;
        `,
        [brandId || '', `%${brandName || brandId || ''}%`]
      )
      campaignsList = campRes.rows.map((r: any) => ({
        id: String(r.id),
        campaign_code: r.campaign_code || 'CAM-001',
        title: r.title ? `${r.brand_name} ${r.title}` : `${r.brand_name} ${r.campaign_code}`,
        platform: r.platform || 'Instagram',
        budget_type: r.budget_type || 'Barter',
        creator_count: Number(r.creator_count) || 0,
        pending_count: Number(r.pending_count) || 0,
      }))
    } catch (e: any) {
      console.warn('DB warning fetching brand campaigns list:', e.message)
    }

    // 2. Query applications for creator review
    let rows: any[] = []
    let campaignAllowCuration = true

    try {
      if (specificCampaignFilter && specificCampaignFilter !== 'all') {
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
            COALESCE(NULLIF(c.campaign_code, ''), 'Campaign') as campaign_title,
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
        const res = await pool.query(query, [String(specificCampaignFilter)])
        rows = res.rows
      } else {
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
            COALESCE(NULLIF(c.campaign_code, ''), 'Campaign') as campaign_title,
            c.deliverables,
            c.budget_type,
            COALESCE(c.allow_brand_curation, true) as allow_brand_curation
          FROM public.applications a
          JOIN public.users u ON a.user_id = u.id
          JOIN public.campaigns c ON a.campaign_id = c.id
          WHERE (c.brand_id::text = $1 OR c.brand_name ILIKE $2)
            AND a.brand_review_status IN ('pending_brand_review', 'brand_approved', 'brand_rejected', 'changes_requested', 'on_hold')
          ORDER BY a.brand_pitched_at DESC NULLS LAST, a.created_at DESC
        `
        const res = await pool.query(query, [brandId || '', `%${brandName || brandId || ''}%`])
        rows = res.rows
      }

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
      campaigns: campaignsList,
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
           OR id IN (SELECT campaign_id FROM public.applications WHERE id::text = ANY($2::text[]))
        LIMIT 1;
        `,
        [String(campaignId), application_ids.map(String)]
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
        const safeBrandId = isValidUuid(brandUser.brand_id) ? brandUser.brand_id : null
        const safeUserId = isValidUuid(brandUser.id) ? brandUser.id : null

        if (safeBrandId) {
          const auditValues: any[] = []
          const placeholders: string[] = []

          application_ids.forEach((appId, index) => {
            const offset = index * 6
            placeholders.push(
              `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`
            )
            auditValues.push(
              safeBrandId,
              safeUserId,
              brandUser.email || null,
              isApprove ? 'creator_approved' : 'creator_rejected',
              appId,
              JSON.stringify({
                action,
                reason: reason || null,
                notes: notes || null,
                reviewer: reviewerName,
                timestamp,
              })
            )
          })

          const auditQuery = `
            INSERT INTO public.brand_audit_logs 
              (brand_id, user_id, user_email, action, target_id, metadata)
            VALUES ${placeholders.join(', ')};
          `
          await pool.query(auditQuery, auditValues)
        }
      } catch (auditErr: any) {
        console.warn('Brand audit log warning (non-fatal):', auditErr.message)
      }

      return NextResponse.json({
        success: true,
        action,
        updated_count: affectedCount,
        message: isApprove
          ? `Successfully approved ${affectedCount} creator(s)`
          : `Successfully rejected ${affectedCount} creator(s)`,
      })
    } catch (dbErr: any) {
      console.error('Database update error in brand decision:', dbErr)
      return NextResponse.json(
        { error: 'Failed to record brand decision. Please try again.' },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('Brand Decision POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
