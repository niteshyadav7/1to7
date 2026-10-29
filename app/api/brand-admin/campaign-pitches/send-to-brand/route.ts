import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

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
    const { applicationIds, campaignId, visibleColumns, kamNotes, targetBrand, includeCommercials, allowBrandApproval } = body
    const allowCuration = allowBrandApproval !== false

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: 'applicationIds array is required' },
        { status: 400 }
      )
    }

    // Verify targetBrand corresponds to a registered Brand Workspace in public.brands
    let verifiedBrandName = targetBrand ? String(targetBrand).trim() : null
    let matchedBrandId: string | null = null
    try {
      const brandsRes = await pool.query(
        `SELECT id, name, slug, COALESCE(is_active, true) as is_active FROM public.brands;`
      )
      if (brandsRes.rows.length === 0) {
        return NextResponse.json(
          {
            error:
              'No registered Client Brand Workspaces found. Please create the brand workspace in Brand Admin before dispatching creators to the Client Portal.',
          },
          { status: 400 }
        )
      }
      if (!verifiedBrandName) {
        return NextResponse.json(
          { error: 'A valid target Brand Workspace is required for dispatch.' },
          { status: 400 }
        )
      }
      const matched = brandsRes.rows.find(
        (b: any) =>
          b.name.toLowerCase() === verifiedBrandName!.toLowerCase() ||
          b.slug.toLowerCase() === verifiedBrandName!.toLowerCase() ||
          String(b.id) === verifiedBrandName
      )
      if (!matched) {
        return NextResponse.json(
          {
            error: `Brand '${verifiedBrandName}' is not a registered Brand Workspace in Brand Admin. Please select from registered brand workspaces.`,
          },
          { status: 400 }
        )
      }
      if (!matched.is_active) {
        return NextResponse.json(
          {
            error: `Brand workspace '${matched.name}' is currently PAUSED. Creators cannot be dispatched to a paused brand. Please activate this brand workspace in Brand Admin first.`,
          },
          { status: 400 }
        )
      }
      verifiedBrandName = matched.name
      matchedBrandId = String(matched.id)
    } catch (dbErr: any) {
      // If table is missing in tests/fallback, allow proceeding with fallback
      if (dbErr?.code !== '42P01') {
        // Not 'relation does not exist'
        console.warn('Brand verification warning:', dbErr?.message)
      }
    }

    const reviewerName = admin.name || admin.email || 'Brand Operations'

    // 1. Update applications status to pending_brand_review and sync commercial + brand curation power flag
    const updateRes = await pool.query(
      `
      UPDATE public.applications
      SET 
        brand_review_status = 'pending_brand_review',
        brand_pitched_at = NOW(),
        brand_pitched_by = $1,
        brand_pitch_notes = COALESCE($2, brand_pitch_notes),
        is_commercial_pitch = CASE WHEN $3 = true THEN true ELSE is_commercial_pitch END,
        form_data = jsonb_set(
          COALESCE(form_data, '{}'::jsonb),
          '{brand_curation}',
          COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
            'allow_brand_curation', $5::boolean,
            'dispatched_by', $1::text,
            'dispatched_at', NOW()
          ),
          true
        ),
        updated_at = NOW()
      WHERE id::text = ANY($4::text[])
      RETURNING id;
      `,
      [reviewerName, kamNotes || null, Boolean(includeCommercials), applicationIds.map(String), allowCuration]
    )

    // 1.2 Sync allow_brand_curation onto parent campaign(s)
    try {
      await pool.query(
        `
        UPDATE public.campaigns
        SET allow_brand_curation = $1, updated_at = NOW()
        WHERE id IN (
          SELECT DISTINCT campaign_id FROM public.applications WHERE id::text = ANY($2::text[])
        );
        `,
        [allowCuration, applicationIds.map(String)]
      )
    } catch (cErr: any) {
      console.warn('Campaign allow_brand_curation update warning:', cErr?.message)
    }

    const updatedCount = updateRes.rowCount || updateRes.rows.length

    // 1.5 Associate campaign(s) of the dispatched applications with target brand workspace
    if (matchedBrandId) {
      try {
        await pool.query(
          `
          UPDATE public.campaigns
          SET 
            brand_id = $1,
            brand_name = COALESCE(NULLIF(brand_name, ''), $2),
            updated_at = NOW()
          WHERE id IN (
            SELECT DISTINCT campaign_id 
            FROM public.applications 
            WHERE id::text = ANY($3::text[])
          ) AND (brand_id IS NULL OR brand_id::text = $1);
          `,
          [matchedBrandId, verifiedBrandName || 'Client Brand', applicationIds.map(String)]
        )
      } catch (campErr: any) {
        console.warn('Campaign brand linking warning:', campErr?.message)
      }
    }

    // 2. Optionally update campaign's brand visible columns if provided
    if (campaignId && Array.isArray(visibleColumns) && visibleColumns.length > 0) {
      await pool.query(
        `
        UPDATE public.campaigns
        SET brand_visible_columns = $1::jsonb, updated_at = NOW()
        WHERE id::text = $2 OR campaign_code = $2;
        `,
        [JSON.stringify(visibleColumns), String(campaignId)]
      )
    }

    // 3. Write audit log event
    if (matchedBrandId) {
      try {
        const isValidUuid = (val: any): boolean =>
          typeof val === 'string' &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val)

        const adminUserId = isValidUuid((admin as any).id) ? (admin as any).id : null
        const targetCampaignUuid = isValidUuid(campaignId) ? String(campaignId) : null
        const userEmail = (admin as any).email || (admin as any).name || reviewerName

        await pool.query(
          `INSERT INTO public.brand_audit_logs (
            brand_id, user_id, user_email, action, target_id, metadata
          ) VALUES ($1, $2, $3, $4, $5, $6);`,
          [
            matchedBrandId,
            adminUserId,
            userEmail,
            'campaign_creators_dispatched_to_brand',
            targetCampaignUuid,
            JSON.stringify({
              target_brand: verifiedBrandName || targetBrand || 'Unspecified',
              brand_id: matchedBrandId,
              count: updatedCount,
              application_ids: applicationIds,
              kam_notes: kamNotes || null,
            }),
          ]
        )
      } catch (auditErr: any) {
        console.warn('brand_audit_logs insert warning:', auditErr?.message)
      }
    }

    const brandDisplay = verifiedBrandName ? `${verifiedBrandName} ` : targetBrand ? `${targetBrand} ` : ''
    return NextResponse.json({
      success: true,
      updatedCount,
      targetBrand: verifiedBrandName || targetBrand || null,
      brandId: matchedBrandId || null,
      message: `Successfully dispatched ${updatedCount} creator profile${updatedCount > 1 ? 's' : ''} to ${brandDisplay}Brand Portal!`,
    })
  } catch (error: any) {
    console.error('Send to Brand POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error dispatching to brand' },
      { status: 500 }
    )
  }
}
