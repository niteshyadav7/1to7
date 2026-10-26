import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const listRes = await pool.query(
      `SELECT id, title, brand_name, category_niche, description, visible_columns, allow_brand_shortlisting, is_public_share_enabled, created_at
       FROM public.sample_lists
       WHERE share_token = $1;`,
      [token]
    )

    if (listRes.rows.length === 0) {
      return NextResponse.json({ error: 'Roster presentation not found or link has expired' }, { status: 404 })
    }

    const roster = listRes.rows[0]

    if (!roster.is_public_share_enabled) {
      return NextResponse.json({ error: 'This sample roster presentation link has been deactivated by the agency' }, { status: 403 })
    }

    // Increment view count asynchronously
    pool.query(`UPDATE public.sample_lists SET view_count = view_count + 1, last_viewed_at = NOW() WHERE id = $1;`, [roster.id]).catch(() => {})

    // Fetch items
    const itemsRes = await pool.query(
      `SELECT 
        id,
        creator_name,
        instagram_username,
        followers,
        avg_reels_views,
        engagement_rate,
        city,
        niche,
        sample_reel_url,
        brand_commercial
       FROM public.sample_list_items
       WHERE sample_list_id = $1
       ORDER BY sort_order ASC, created_at DESC;`,
      [roster.id]
    )

    // Strictly enforce visible columns (Privacy & Margin Shield)
    const visibleCols: string[] = Array.isArray(roster.visible_columns) ? roster.visible_columns : [
      'creator_name', 'instagram_username', 'followers', 'avg_reels_views', 'engagement_rate', 'city', 'sample_reel_url'
    ]

    const sanitizedItems = itemsRes.rows.map((row: any) => {
      const clean: Record<string, any> = { id: row.id }
      if (visibleCols.includes('creator_name')) clean.creator_name = row.creator_name
      if (visibleCols.includes('instagram_username')) clean.instagram_username = row.instagram_username
      if (visibleCols.includes('followers')) clean.followers = row.followers
      if (visibleCols.includes('avg_reels_views')) clean.avg_reels_views = row.avg_reels_views
      if (visibleCols.includes('engagement_rate')) clean.engagement_rate = row.engagement_rate
      if (visibleCols.includes('city')) clean.city = row.city
      if (visibleCols.includes('niche')) clean.niche = row.niche
      if (visibleCols.includes('sample_reel_url')) clean.sample_reel_url = row.sample_reel_url
      if (visibleCols.includes('brand_commercial')) clean.brand_commercial = row.brand_commercial
      return clean
    })

    return NextResponse.json({
      success: true,
      roster: {
        id: roster.id,
        title: roster.title,
        brand_name: roster.brand_name,
        category_niche: roster.category_niche,
        description: roster.description,
        visible_columns: visibleCols,
        allow_brand_shortlisting: roster.allow_brand_shortlisting,
        created_at: roster.created_at,
      },
      items: sanitizedItems,
    })
  } catch (error: any) {
    console.error('Error fetching public roster presentation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
