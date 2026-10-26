import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin session required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { campaignId, applicationIds, batchName, curationNotes } = body

    if (!campaignId || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: 'campaignId and applicationIds array are required' },
        { status: 400 }
      )
    }

    const defaultBatchName =
      batchName?.trim() ||
      `Batch - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    const notes = curationNotes?.trim() || null
    const adminIdentifier = admin.name || admin.email || 'Influencer Ops'

    let queuedCount = 0

    const query = `
      UPDATE public.applications
      SET 
        brand_review_status = 'queued_for_brand_admin',
        brand_pitch_batch_name = $1,
        brand_pitch_notes = $2,
        brand_pitched_at = NOW(),
        brand_pitched_by = $3,
        form_data = jsonb_set(
          COALESCE(form_data, '{}'::jsonb),
          '{sent_to_brand_admin}',
          jsonb_build_object(
            'is_queued', true,
            'queued_at', NOW(),
            'queued_by', $3,
            'batch_label', $1,
            'notes', COALESCE($2, '')
          ),
          true
        ),
        updated_at = NOW()
      WHERE (campaign_id::text = $4 OR campaign_id::text = (SELECT id::text FROM public.campaigns WHERE campaign_code = $4 OR id::text = $4 LIMIT 1))
        AND (id::text = ANY($5::text[]))
      RETURNING id;
    `

    const result = await pool.query(query, [
      defaultBatchName,
      notes,
      adminIdentifier,
      String(campaignId),
      applicationIds.map(String),
    ])

    queuedCount = result.rowCount || result.rows.length

    return NextResponse.json({
      success: true,
      queuedCount,
      batchName: defaultBatchName,
      message: `Successfully forwarded ${queuedCount} application${queuedCount > 1 ? 's' : ''} to Brand Admin curation desk.`,
    })
  } catch (error: any) {
    console.error('Queue for Brand Admin Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error queueing applications' },
      { status: 500 }
    )
  }
}
