import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'
import { applyFinalApprove, applyFinalReject, applyOnHold } from '@/lib/campaign-pitch-curation'

export async function POST(request: Request) {
  try {
    const admin = (await getBrandAdminFromRequest()) || (await getAdminFromRequest())
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Brand Admin or Admin session required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      action,
      applicationIds,
      campaignId,
      brandName,
      allowBrandCuration,
      reason,
      notes,
    } = body

    const reviewerName = admin.name || admin.email || 'Brand Operations'

    // 1. Toggle Brand Curation Power (YES: Can Approve vs NO: View-Only Catalog)
    if (action === 'toggle_brand_power') {
      const allow = Boolean(allowBrandCuration)
      let updatedCampaigns = 0

      if (campaignId && campaignId !== 'all') {
        const campRes = await pool.query(
          `
          UPDATE public.campaigns
          SET allow_brand_curation = $1, updated_at = NOW()
          WHERE id::text = $2 OR campaign_code = $2
          RETURNING id;
          `,
          [allow, String(campaignId)]
        )
        updatedCampaigns = campRes.rowCount || 0

        await pool.query(
          `
          UPDATE public.applications
          SET form_data = jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{brand_curation}',
            COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
              'allow_brand_curation', $1::boolean,
              'power_updated_by', $2::text,
              'power_updated_at', NOW()
            ),
            true
          ),
          updated_at = NOW()
          WHERE campaign_id::text = $3
            OR campaign_id IN (SELECT id FROM public.campaigns WHERE campaign_code = $3);
          `,
          [allow, reviewerName, String(campaignId)]
        )
      } else if (Array.isArray(applicationIds) && applicationIds.length > 0) {
        const campRes = await pool.query(
          `
          UPDATE public.campaigns
          SET allow_brand_curation = $1, updated_at = NOW()
          WHERE id IN (
            SELECT DISTINCT campaign_id FROM public.applications WHERE id::text = ANY($2::text[])
          )
          RETURNING id;
          `,
          [allow, applicationIds.map(String)]
        )
        updatedCampaigns = campRes.rowCount || 0

        await pool.query(
          `
          UPDATE public.applications
          SET form_data = jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{brand_curation}',
            COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
              'allow_brand_curation', $1::boolean,
              'power_updated_by', $2::text,
              'power_updated_at', NOW()
            ),
            true
          ),
          updated_at = NOW()
          WHERE id::text = ANY($3::text[]);
          `,
          [allow, reviewerName, applicationIds.map(String)]
        )
      } else if (brandName && brandName !== 'all') {
        const campRes = await pool.query(
          `
          UPDATE public.campaigns
          SET allow_brand_curation = $1, updated_at = NOW()
          WHERE LOWER(brand_name) = LOWER($2)
          RETURNING id;
          `,
          [allow, String(brandName)]
        )
        updatedCampaigns = campRes.rowCount || 0

        await pool.query(
          `
          UPDATE public.applications a
          SET form_data = jsonb_set(
            COALESCE(a.form_data, '{}'::jsonb),
            '{brand_curation}',
            COALESCE(a.form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
              'allow_brand_curation', $1::boolean,
              'power_updated_by', $2::text,
              'power_updated_at', NOW()
            ),
            true
          ),
          updated_at = NOW()
          FROM public.campaigns c
          WHERE a.campaign_id = c.id AND LOWER(c.brand_name) = LOWER($3);
          `,
          [allow, reviewerName, String(brandName)]
        )
      } else {
        // Update all active pitched campaigns
        const campRes = await pool.query(
          `
          UPDATE public.campaigns
          SET allow_brand_curation = $1, updated_at = NOW()
          WHERE id IN (
            SELECT DISTINCT campaign_id FROM public.applications
            WHERE brand_review_status IS NOT NULL AND brand_review_status != 'unpitched'
          )
          RETURNING id;
          `,
          [allow]
        )
        updatedCampaigns = campRes.rowCount || 0

        await pool.query(
          `
          UPDATE public.applications
          SET form_data = jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{brand_curation}',
            COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
              'allow_brand_curation', $1::boolean,
              'power_updated_by', $2::text,
              'power_updated_at', NOW()
            ),
            true
          ),
          updated_at = NOW()
          WHERE brand_review_status IS NOT NULL AND brand_review_status != 'unpitched';
          `,
          [allow, reviewerName]
        )
      }

      return NextResponse.json({
        success: true,
        allowBrandCuration: allow,
        updatedCampaigns,
        message: allow
          ? 'Brand Approval Power enabled: Client can now Approve / Reject creators in Brand Portal.'
          : 'Switched to View-Only Mode: Brand can view profiles, while your internal team controls approvals.',
      })
    }

    // 2. Creator Status & Finalization Decisions
    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: 'applicationIds array is required' },
        { status: 400 }
      )
    }

    const ids = applicationIds.map(String)

    if (action === 'final_approve') {
      const count = await applyFinalApprove(pool, ids, reviewerName, notes)
      return NextResponse.json({
        success: true,
        updatedCount: count,
        message: `Final Approved ${count} creator${count > 1 ? 's' : ''} & synced 'Approved' status to Influencer Admin Panel!`,
      })
    }

    if (action === 'final_reject') {
      const count = await applyFinalReject(pool, ids, reviewerName, reason, notes)
      return NextResponse.json({
        success: true,
        updatedCount: count,
        message: `Final Rejected ${count} creator${count > 1 ? 's' : ''} & synced 'Rejected' status to Influencer Admin Panel.`,
      })
    }

    if (action === 'on_hold') {
      const count = await applyOnHold(pool, ids, reviewerName, reason, notes)
      return NextResponse.json({
        success: true,
        updatedCount: count,
        message: `Placed ${count} creator${count > 1 ? 's' : ''} On Hold / Backup list.`,
      })
    }

    if (action === 'unfinalize') {
      const updateRes = await pool.query(
        `
        UPDATE public.applications
        SET
          status = 'Applied'::application_status,
          form_data = jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{brand_curation}',
            COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
              'is_finalized', false,
              'final_status', null,
              'unfinalized_by', $1::text,
              'unfinalized_at', NOW()
            ),
            true
          ),
          updated_at = NOW()
        WHERE id::text = ANY($2::text[])
        RETURNING id;
        `,
        [reviewerName, ids]
      )
      const count = updateRes.rowCount || 0
      return NextResponse.json({
        success: true,
        updatedCount: count,
        message: `Unlocked ${count} creator${count > 1 ? 's' : ''} and reverted Influencer Admin status back to Applied.`,
      })
    }

    return NextResponse.json(
      { error: `Unknown curation action: ${action}` },
      { status: 400 }
    )
  } catch (error: any) {
    console.error('Curation Decision POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error processing curation decision' },
      { status: 500 }
    )
  }
}
