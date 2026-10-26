import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { id } = await params
    const listRes = await pool.query(`SELECT * FROM public.sample_lists WHERE id = $1;`, [id])
    if (listRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sample roster not found' }, { status: 404 })
    }

    const itemsRes = await pool.query(
      `SELECT * FROM public.sample_list_items WHERE sample_list_id = $1 ORDER BY sort_order ASC, created_at DESC;`,
      [id]
    )

    return NextResponse.json({
      success: true,
      list: listRes.rows[0],
      items: itemsRes.rows,
    })
  } catch (error: any) {
    console.error('Error fetching sample roster details:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch sample roster' }, { status: 500 })
  }
}

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
    const {
      title,
      brand_name,
      category_niche,
      description,
      visible_columns,
      allow_brand_shortlisting,
      is_public_share_enabled,
      status,
    } = body

    const queryText = `
      UPDATE public.sample_lists
      SET 
        title = COALESCE($1, title),
        brand_name = COALESCE($2, brand_name),
        category_niche = COALESCE($3, category_niche),
        description = COALESCE($4, description),
        visible_columns = COALESCE($5, visible_columns),
        allow_brand_shortlisting = COALESCE($6, allow_brand_shortlisting),
        is_public_share_enabled = COALESCE($7, is_public_share_enabled),
        status = COALESCE($8, status),
        updated_at = NOW()
      WHERE id = $9
      RETURNING *;
    `

    const result = await pool.query(queryText, [
      title ? title.trim() : null,
      brand_name ? brand_name.trim() : null,
      category_niche !== undefined ? category_niche : null,
      description !== undefined ? description : null,
      visible_columns ? JSON.stringify(visible_columns) : null,
      allow_brand_shortlisting !== undefined ? allow_brand_shortlisting : null,
      is_public_share_enabled !== undefined ? is_public_share_enabled : null,
      status || null,
      id,
    ])

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Sample roster not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, list: result.rows[0] })
  } catch (error: any) {
    console.error('Error updating sample roster:', error)
    return NextResponse.json({ error: error.message || 'Failed to update sample roster' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { id } = await params
    await pool.query(`DELETE FROM public.sample_lists WHERE id = $1;`, [id])

    return NextResponse.json({ success: true, message: 'Sample roster deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting sample roster:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete sample roster' }, { status: 500 })
  }
}
