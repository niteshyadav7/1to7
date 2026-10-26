import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandFromRequest } from '@/lib/brand-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const brandUser = await getBrandFromRequest()

    // 1. Fetch Roster Meta
    const rosterRes = await pool.query(
      `SELECT 
        id, 
        title, 
        brand_id, 
        brand_name, 
        category_niche, 
        description, 
        share_token, 
        visible_columns, 
        allow_brand_shortlisting, 
        status, 
        is_published_to_brand, 
        published_at, 
        published_by, 
        pitch_note_to_brand, 
        created_at 
       FROM public.sample_lists 
       WHERE id = $1 AND is_published_to_brand = true;`,
      [id]
    )

    if (rosterRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sample roster not found or not published to brand portal' }, { status: 404 })
    }

    const roster = rosterRes.rows[0]

    // 2. Fetch Creators - Strictly shield internal_cost and admin_notes
    const itemsRes = await pool.query(
      `SELECT 
        id, 
        sample_list_id, 
        creator_name, 
        instagram_username, 
        followers, 
        avg_reels_views, 
        engagement_rate, 
        city, 
        niche, 
        sample_reel_url, 
        brand_commercial, 
        sort_order, 
        created_at 
       FROM public.sample_list_items 
       WHERE sample_list_id = $1 
       ORDER BY sort_order ASC, created_at ASC;`,
      [id]
    )

    // Check if brand has already submitted a shortlist for this roster
    let existingShortlist = null
    try {
      const brandName = brandUser?.brand_name || roster.brand_name
      const shortlistRes = await pool.query(
        `SELECT id, shortlisted_item_ids, shortlisted_creators_count, status, submitted_at, brand_feedback_notes 
         FROM public.brand_shortlists 
         WHERE sample_list_id = $1 
         ORDER BY submitted_at DESC 
         LIMIT 1;`,
        [id]
      )
      if (shortlistRes.rows.length > 0) {
        existingShortlist = shortlistRes.rows[0]
      }
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      roster,
      items: itemsRes.rows,
      existing_shortlist: existingShortlist,
    })
  } catch (error: any) {
    console.error('Error fetching brand sample roster detail:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch roster detail' }, { status: 500 })
  }
}
