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
    const { items } = body

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items array is required' }, { status: 400 })
    }

    // Verify roster exists
    const checkRes = await pool.query(`SELECT id FROM public.sample_lists WHERE id = $1;`, [id])
    if (checkRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sample roster not found' }, { status: 404 })
    }

    let insertedCount = 0

    for (const item of items) {
      const creatorName = item.creator_name?.trim() || item.full_name?.trim() || 'Creator'
      const rawHandle = item.instagram_username || item.handle || ''
      const cleanHandle = String(rawHandle).trim().replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, '').split(/[/?#]/)[0].replace(/^@/, '').trim()

      if (!cleanHandle) continue

      // Follower parsing
      let followersNum = 0
      if (typeof item.followers === 'number') {
        followersNum = item.followers
      } else if (typeof item.followers === 'string') {
        const raw = item.followers.toUpperCase().trim()
        if (raw.endsWith('K')) {
          followersNum = Math.round(parseFloat(raw.replace('K', '')) * 1000)
        } else if (raw.endsWith('M')) {
          followersNum = Math.round(parseFloat(raw.replace('M', '')) * 1000000)
        } else {
          followersNum = parseInt(raw.replace(/,/g, ''), 10) || 0
        }
      }

      // Avg reels views parsing
      let viewsNum = 0
      if (typeof item.avg_reels_views === 'number') {
        viewsNum = item.avg_reels_views
      } else if (typeof item.avg_reels_views === 'string') {
        const raw = item.avg_reels_views.toUpperCase().trim()
        if (raw.endsWith('K')) {
          viewsNum = Math.round(parseFloat(raw.replace('K', '')) * 1000)
        } else if (raw.endsWith('M')) {
          viewsNum = Math.round(parseFloat(raw.replace('M', '')) * 1000000)
        } else {
          viewsNum = parseInt(raw.replace(/,/g, ''), 10) || 0
        }
      }

      const engRate = parseFloat(String(item.engagement_rate || 0)) || 0

      // Skip duplicates inside same list
      const dupRes = await pool.query(
        `SELECT id FROM public.sample_list_items WHERE sample_list_id = $1 AND instagram_username ILIKE $2;`,
        [id, cleanHandle]
      )

      if (dupRes.rows.length === 0) {
        await pool.query(
          `INSERT INTO public.sample_list_items (
            sample_list_id,
            user_id,
            creator_name,
            instagram_username,
            followers,
            avg_reels_views,
            engagement_rate,
            city,
            niche,
            sample_reel_url,
            brand_commercial,
            internal_cost,
            admin_notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
          [
            id,
            item.user_id || null,
            creatorName,
            cleanHandle,
            followersNum,
            viewsNum,
            engRate,
            item.city?.trim() || null,
            item.niche?.trim() || item.category?.trim() || null,
            item.sample_reel_url?.trim() || item.reel_url?.trim() || null,
            item.brand_commercial ? Number(item.brand_commercial) : null,
            item.internal_cost ? Number(item.internal_cost) : null,
            item.admin_notes?.trim() || null,
          ]
        )
        insertedCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${insertedCount} creators to the sample roster.`,
      inserted_count: insertedCount,
    })
  } catch (error: any) {
    console.error('Error bulk adding items to sample roster:', error)
    return NextResponse.json({ error: error.message || 'Failed to add items' }, { status: 500 })
  }
}
