import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandFromRequest } from '@/lib/brand-auth'

export async function GET() {
  try {
    const brandUser = await getBrandFromRequest()
    
    // In dev / virtual mode, if brandUser is not logged in, fallback to active brand or allow viewing
    const brandId = brandUser?.brand_id || null
    const brandName = brandUser?.brand_name || ''

    let queryText = `
      SELECT 
        sl.id,
        sl.title,
        sl.brand_id,
        sl.brand_name,
        sl.category_niche,
        sl.description,
        sl.share_token,
        sl.visible_columns,
        sl.allow_brand_shortlisting,
        sl.status,
        sl.is_published_to_brand,
        sl.published_at,
        sl.published_by,
        sl.pitch_note_to_brand,
        sl.created_at,
        COUNT(sli.id)::int as items_count,
        COALESCE(
          json_agg(
            json_build_object(
              'id', sli.id,
              'creator_name', sli.creator_name,
              'instagram_username', sli.instagram_username,
              'followers', sli.followers,
              'avg_reels_views', sli.avg_reels_views,
              'engagement_rate', sli.engagement_rate,
              'city', sli.city,
              'niche', sli.niche
            ) ORDER BY sli.sort_order ASC
          ) FILTER (WHERE sli.id IS NOT NULL),
          '[]'::json
        ) as preview_creators
      FROM public.sample_lists sl
      LEFT JOIN public.sample_list_items sli ON sli.sample_list_id = sl.id
      WHERE sl.is_published_to_brand = true
    `
    const params: any[] = []

    if (brandId && brandName) {
      params.push(brandId, `%${brandName}%`)
      queryText += ` AND (sl.brand_id = $1 OR sl.brand_name ILIKE $2 OR sl.brand_id IS NULL OR sl.brand_name = 'General Pitch')`
    } else if (brandName) {
      params.push(`%${brandName}%`)
      queryText += ` AND (sl.brand_name ILIKE $1 OR sl.brand_id IS NULL OR sl.brand_name = 'General Pitch')`
    }

    queryText += `
      GROUP BY sl.id
      ORDER BY sl.published_at DESC NULLS LAST, sl.created_at DESC;
    `

    const result = await pool.query(queryText, params)
    return NextResponse.json({ success: true, rosters: result.rows })
  } catch (error: any) {
    console.error('Error fetching brand sample rosters:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch sample rosters' }, { status: 500 })
  }
}
