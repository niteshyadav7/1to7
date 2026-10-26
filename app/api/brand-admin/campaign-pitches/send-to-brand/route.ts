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
    const { applicationIds, campaignId, visibleColumns, kamNotes } = body

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

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Successfully dispatched ${updatedCount} creator profile${updatedCount > 1 ? 's' : ''} to Brand Portal!`,
    })
  } catch (error: any) {
    console.error('Send to Brand POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error dispatching to brand' },
      { status: 500 }
    )
  }
}
