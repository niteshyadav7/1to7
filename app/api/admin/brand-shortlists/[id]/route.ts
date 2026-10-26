import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { status, converted_campaign_id } = body

    const reviewer = (admin as any).name || (admin as any).email || (admin as any).full_name || 'Admin'

    const queryText = `
      UPDATE public.brand_shortlists
      SET 
        status = COALESCE($1, status),
        converted_campaign_id = COALESCE($2, converted_campaign_id),
        reviewed_by = $3,
        reviewed_at = NOW(),
        updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `

    const result = await pool.query(queryText, [status || null, converted_campaign_id || null, reviewer, id])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Shortlist not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, shortlist: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating brand shortlist:', error)
    return NextResponse.json({ error: error.message || 'Failed to update shortlist' }, { status: 500 })
  }
}
