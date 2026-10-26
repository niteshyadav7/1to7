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
    const { applicationIds, campaignId, visibleColumns, kamNotes, targetBrand } = body

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: 'applicationIds array is required' },
        { status: 400 }
      )
    }

    const reviewerName = admin.name || admin.email || 'Brand Operations'

    // 1. Update applications status to pending_brand_review
    const updateRes = await pool.query(
      `
      UPDATE public.applications
      SET 
        brand_review_status = 'pending_brand_review',
        brand_pitched_at = NOW(),
        brand_pitched_by = $1,
        brand_pitch_notes = COALESCE($2, brand_pitch_notes),
        updated_at = NOW()
      WHERE id::text = ANY($3::text[])
      RETURNING id;
      `,
      [reviewerName, kamNotes || null, applicationIds.map(String)]
    )

    const updatedCount = updateRes.rowCount || updateRes.rows.length

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
    try {
      await pool.query(
        `INSERT INTO public.brand_audit_logs (
          brand_id, user_id, user_name, event_type, entity_id, details
        ) VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          targetBrand?.toLowerCase() || 'unassigned',
          (admin as any).id || null,
          reviewerName,
          'campaign_creators_dispatched_to_brand',
          String(campaignId || 'campaign_batch'),
          JSON.stringify({
            target_brand: targetBrand || 'Unspecified',
            count: updatedCount,
            application_ids: applicationIds,
            kam_notes: kamNotes || null,
          }),
        ]
      )
    } catch {
      // Non-fatal if audit logging encounters a schema variant
    }

    const brandDisplay = targetBrand ? `${targetBrand} ` : ''
    return NextResponse.json({
      success: true,
      updatedCount,
      targetBrand: targetBrand || null,
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
