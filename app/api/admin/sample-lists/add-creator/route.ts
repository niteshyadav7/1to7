import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'
import crypto from 'crypto'

export async function POST(request: Request) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const body = await request.json()
    const {
      sample_list_id,
      new_list_title,
      new_list_brand_name,
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
      admin_notes,
    } = body

    if (!creator_name || !instagram_username) {
      return NextResponse.json({ error: 'Creator name and Instagram username are required' }, { status: 400 })
    }

    let targetListId = sample_list_id
    let listTitle = ''

    // If admin is creating a new list on the fly
    if (!targetListId && new_list_title) {
      const shareToken = crypto.randomBytes(16).toString('hex')
      const createdBy = (admin as any).name || (admin as any).email || (admin as any).full_name || 'Admin'
      const brandName = new_list_brand_name?.trim() || 'General Pitch'

      const insertListRes = await pool.query(
        `INSERT INTO public.sample_lists (
          title, brand_name, category_niche, share_token, created_by
        ) VALUES ($1, $2, $3, $4, $5) RETURNING id, title;`,
        [new_list_title.trim(), brandName, niche || null, shareToken, createdBy]
      )
      targetListId = insertListRes.rows[0].id
      listTitle = insertListRes.rows[0].title
    } else if (targetListId) {
      const listRes = await pool.query(`SELECT id, title FROM public.sample_lists WHERE id = $1;`, [targetListId])
      if (listRes.rows.length === 0) {
        return NextResponse.json({ error: 'Selected sample roster does not exist' }, { status: 404 })
      }
      listTitle = listRes.rows[0].title
    } else {
      return NextResponse.json({ error: 'Please select an existing roster or provide a new title' }, { status: 400 })
    }

    const cleanHandle = String(instagram_username).replace(/^@/, '').trim()

    // Check if creator is already in this roster
    const checkRes = await pool.query(
      `SELECT id FROM public.sample_list_items WHERE sample_list_id = $1 AND (instagram_username ILIKE $2 OR (user_id IS NOT NULL AND user_id = $3));`,
      [targetListId, cleanHandle, user_id || null]
    )

    if (checkRes.rows.length > 0) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message: `${creator_name} is already in "${listTitle}"`,
        sample_list_id: targetListId,
        list_title: listTitle,
      })
    }

    // Insert item
    const queryText = `
      INSERT INTO public.sample_list_items (
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
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `

    const itemRes = await pool.query(queryText, [
      targetListId,
      user_id || null,
      creator_name.trim(),
      cleanHandle,
      Number(followers) || 0,
      Number(avg_reels_views) || 0,
      Number(engagement_rate) || 0,
      city?.trim() || null,
      niche?.trim() || null,
      sample_reel_url?.trim() || null,
      brand_commercial ? Number(brand_commercial) : null,
      internal_cost ? Number(internal_cost) : null,
      admin_notes?.trim() || null,
    ])

    return NextResponse.json({
      success: true,
      message: `Successfully added ${creator_name} to "${listTitle}"!`,
      item: itemRes.rows[0],
      sample_list_id: targetListId,
      list_title: listTitle,
    })
  } catch (error: any) {
    console.error('Error adding creator to sample list:', error)
    return NextResponse.json({ error: error.message || 'Failed to add creator to sample list' }, { status: 500 })
  }
}
