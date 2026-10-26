import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { id, itemId } = await params
    await pool.query(`DELETE FROM public.sample_list_items WHERE id = $1 AND sample_list_id = $2;`, [itemId, id])

    return NextResponse.json({ success: true, message: 'Item removed from roster' })
  } catch (error: any) {
    console.error('Error removing item from sample roster:', error)
    return NextResponse.json({ error: error.message || 'Failed to remove item' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { id, itemId } = await params
    const body = await request.json()
    const { brand_commercial, internal_cost, admin_notes, sample_reel_url } = body

    const queryText = `
      UPDATE public.sample_list_items
      SET 
        brand_commercial = COALESCE($1, brand_commercial),
        internal_cost = COALESCE($2, internal_cost),
        admin_notes = COALESCE($3, admin_notes),
        sample_reel_url = COALESCE($4, sample_reel_url)
      WHERE id = $5 AND sample_list_id = $6
      RETURNING *;
    `

    const res = await pool.query(queryText, [
      brand_commercial !== undefined ? Number(brand_commercial) : null,
      internal_cost !== undefined ? Number(internal_cost) : null,
      admin_notes !== undefined ? admin_notes : null,
      sample_reel_url !== undefined ? sample_reel_url : null,
      itemId,
      id,
    ])

    return NextResponse.json({ success: true, item: res.rows[0] })
  } catch (error: any) {
    console.error('Error updating sample roster item:', error)
    return NextResponse.json({ error: error.message || 'Failed to update item' }, { status: 500 })
  }
}
