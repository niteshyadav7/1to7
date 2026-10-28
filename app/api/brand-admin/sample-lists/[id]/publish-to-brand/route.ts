import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function POST(
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
    const { brand_id, brand_name, pitch_note_to_brand, visible_columns, allow_brand_shortlisting } = body

    if (!brand_name?.trim()) {
      return NextResponse.json({ error: 'Target Brand Name is required' }, { status: 400 })
    }

    // Verify sample roster exists and has items
    const rosterCheck = await pool.query(
      `SELECT sl.id, sl.title, COUNT(sli.id)::int as items_count 
       FROM public.sample_lists sl 
       LEFT JOIN public.sample_list_items sli ON sli.sample_list_id = sl.id 
       WHERE sl.id = $1 
       GROUP BY sl.id;`,
      [id]
    )

    if (rosterCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Sample roster not found' }, { status: 404 })
    }

    if (rosterCheck.rows[0].items_count === 0) {
      return NextResponse.json({ error: 'Cannot send an empty roster. Please add creators first.' }, { status: 400 })
    }

    const adminName = (admin as any).name || (admin as any).email || (admin as any).full_name || 'Brand Admin'

    const updateQuery = `
      UPDATE public.sample_lists
      SET
        brand_id = $1,
        brand_name = $2,
        is_published_to_brand = true,
        published_at = NOW(),
        published_by = $3,
        pitch_note_to_brand = $4,
        visible_columns = COALESCE($5::jsonb, visible_columns),
        updated_at = NOW()
      WHERE id = $6
      RETURNING *;
    `

    const updateRes = await pool.query(updateQuery, [
      brand_id || null,
      brand_name.trim(),
      adminName,
      pitch_note_to_brand?.trim() || null,
      visible_columns ? JSON.stringify(visible_columns) : null,
      allow_brand_shortlisting !== undefined ? Boolean(allow_brand_shortlisting) : null,
      id,
    ])

    const updatedRoster = updateRes.rows[0]

    // Create an audit log record
    try {
      await pool.query(
        `INSERT INTO public.brand_audit_logs (
          brand_id,
          user_id,
          user_email,
          action,
          target_id,
          metadata
        ) VALUES ($1, $2, $3, $4, $5, $6);`,
        [
          brand_id || 'unassigned',
          (admin as any).id || null,
          adminName,
          'sample_roster_published_to_brand',
          id,
          JSON.stringify({
            roster_title: updatedRoster.title,
            brand_name: updatedRoster.brand_name,
            items_count: rosterCheck.rows[0].items_count,
            pitch_note: pitch_note_to_brand || null,
          }),
        ]
      )
    } catch {
      // Non-fatal if audit log table differs
    }

    return NextResponse.json({
      success: true,
      message: `Sample roster "${updatedRoster.title}" is now LIVE on ${updatedRoster.brand_name}'s Brand Portal!`,
      roster: updatedRoster,
    })
  } catch (error: any) {
    console.error('Error publishing sample roster to brand portal:', error)
    return NextResponse.json({ error: error.message || 'Failed to publish to brand portal' }, { status: 500 })
  }
}
