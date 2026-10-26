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
    const { applicationIds, reason, notes } = body

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json(
        { error: 'applicationIds array is required' },
        { status: 400 }
      )
    }

    const reviewerName = admin.name || admin.email || 'Brand Operations'
    const combinedNotes = [reason, notes].filter(Boolean).join(' - ') || 'Internal curation drop'

    const updateRes = await pool.query(
      `
      UPDATE public.applications
      SET 
        brand_review_status = 'internal_rejected',
        brand_rejection_reason = $1,
        brand_reviewed_by = $2,
        brand_reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id::text = ANY($3::text[])
      RETURNING id;
      `,
      [combinedNotes, reviewerName, applicationIds.map(String)]
    )

    const updatedCount = updateRes.rowCount || updateRes.rows.length

    return NextResponse.json({
      success: true,
      updatedCount,
      message: `Internally dropped ${updatedCount} creator profile${updatedCount > 1 ? 's' : ''} from brand pitch queue.`,
    })
  } catch (error: any) {
    console.error('Internal Drop POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error dropping applications' },
      { status: 500 }
    )
  }
}
