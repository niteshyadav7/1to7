import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function GET(request: Request) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const brand = searchParams.get('brand')?.trim() || ''
    const search = searchParams.get('search')?.trim() || ''

    let queryText = `
      SELECT 
        bs.*,
        sl.title as sample_list_title,
        sl.category_niche,
        sl.share_token
      FROM public.brand_shortlists bs
      LEFT JOIN public.sample_lists sl ON sl.id = bs.sample_list_id
      WHERE 1=1
    `
    const params: any[] = []

    if (status && status !== 'all') {
      params.push(status)
      queryText += ` AND bs.status = $${params.length}`
    }

    if (brand && brand !== 'all') {
      params.push(`%${brand}%`)
      queryText += ` AND bs.brand_name ILIKE $${params.length}`
    }

    if (search) {
      params.push(`%${search}%`)
      queryText += ` AND (bs.brand_name ILIKE $${params.length} OR bs.brand_poc_name ILIKE $${params.length} OR bs.brand_poc_email ILIKE $${params.length} OR bs.brand_feedback_notes ILIKE $${params.length} OR sl.title ILIKE $${params.length})`
    }

    queryText += ` ORDER BY bs.submitted_at DESC`

    const result = await pool.query(queryText, params)
    const shortlists = result.rows

    // Fetch items for each shortlist
    for (const s of shortlists) {
      const itemIds: string[] = Array.isArray(s.shortlisted_item_ids) ? s.shortlisted_item_ids : []
      if (itemIds.length > 0) {
        const itemsRes = await pool.query(
          `SELECT * FROM public.sample_list_items WHERE id = ANY($1::uuid[]);`,
          [itemIds]
        )
        s.shortlisted_items = itemsRes.rows
      } else {
        s.shortlisted_items = []
      }
    }

    // Get list of unique brands for filter dropdown
    const brandsRes = await pool.query(
      `SELECT DISTINCT brand_name FROM public.brand_shortlists ORDER BY brand_name ASC;`
    )

    return NextResponse.json({
      success: true,
      shortlists,
      brands: brandsRes.rows.map((r) => r.brand_name),
    })
  } catch (error: any) {
    console.error('Error fetching brand shortlists:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch brand shortlists' }, { status: 500 })
  }
}
