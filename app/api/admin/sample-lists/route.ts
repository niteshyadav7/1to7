import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'
import crypto from 'crypto'

export async function GET(request: Request) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'active'
    const search = searchParams.get('search')?.trim() || ''

    let queryText = `
      SELECT 
        sl.*,
        COUNT(sli.id)::int as items_count,
        COALESCE(bs.shortlisted_creators_count, 0)::int as shortlisted_creators_count,
        bs.shortlisted_item_ids as shortlisted_item_ids,
        bs.brand_feedback_notes as brand_feedback_notes,
        bs.submitted_at as latest_shortlist_at,
        bs.status as shortlist_status
      FROM public.sample_lists sl
      LEFT JOIN public.sample_list_items sli ON sli.sample_list_id = sl.id
      LEFT JOIN LATERAL (
        SELECT shortlisted_creators_count, shortlisted_item_ids, brand_feedback_notes, submitted_at, status
        FROM public.brand_shortlists
        WHERE sample_list_id = sl.id
        ORDER BY submitted_at DESC
        LIMIT 1
      ) bs ON true
      WHERE sl.status = $1
    `
    const params: any[] = [status]

    if (search) {
      params.push(`%${search}%`)
      queryText += ` AND (sl.title ILIKE $${params.length} OR sl.brand_name ILIKE $${params.length} OR sl.category_niche ILIKE $${params.length})`
    }

    queryText += `
      GROUP BY sl.id, bs.shortlisted_creators_count, bs.shortlisted_item_ids, bs.brand_feedback_notes, bs.submitted_at, bs.status
      ORDER BY sl.created_at DESC
    `

    const result = await pool.query(queryText, params)
    return NextResponse.json({ success: true, lists: result.rows })
  } catch (error: any) {
    console.error('Error fetching sample lists:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch sample lists' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const body = await request.json()
    const { title, brand_id, brand_name, category_niche, description, visible_columns, allow_brand_shortlisting } = body

    if (!title?.trim() || !brand_name?.trim()) {
      return NextResponse.json({ error: 'Title and Brand Name are required' }, { status: 400 })
    }

    const shareToken = crypto.randomBytes(16).toString('hex')
    const createdBy = (admin as any).name || (admin as any).email || (admin as any).full_name || 'Admin'

    const defaultColumns = visible_columns || [
      'creator_name',
      'instagram_username',
      'followers',
      'avg_reels_views',
      'engagement_rate',
      'city',
      'sample_reel_url',
    ]

    const queryText = `
      INSERT INTO public.sample_lists (
        title,
        brand_id,
        brand_name,
        category_niche,
        description,
        share_token,
        visible_columns,
        allow_brand_shortlisting,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `

    const result = await pool.query(queryText, [
      title.trim(),
      brand_id || null,
      brand_name.trim(),
      category_niche?.trim() || null,
      description?.trim() || null,
      shareToken,
      JSON.stringify(defaultColumns),
      allow_brand_shortlisting ?? true,
      createdBy,
    ])

    return NextResponse.json({ success: true, list: result.rows[0] })
  } catch (error: any) {
    console.error('Error creating sample list:', error)
    return NextResponse.json({ error: error.message || 'Failed to create sample list' }, { status: 500 })
  }
}
