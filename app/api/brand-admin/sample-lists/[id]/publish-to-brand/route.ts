import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'
import crypto from 'crypto'

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
    const {
      brand_id,
      brand_name,
      pitch_note_to_brand,
      visible_columns,
      allow_brand_shortlisting,
      mode = 'assign', // 'assign' updates current roster; 'clone' duplicates roster + items for another brand
      custom_title,
    } = body

    if (!brand_name?.trim()) {
      return NextResponse.json({ error: 'Target Brand Name is required' }, { status: 400 })
    }

    // Verify sample roster exists and fetch its metadata + items count
    const rosterCheck = await pool.query(
      `SELECT sl.*, COUNT(sli.id)::int as items_count 
       FROM public.sample_lists sl 
       LEFT JOIN public.sample_list_items sli ON sli.sample_list_id = sl.id 
       WHERE sl.id = $1 
       GROUP BY sl.id;`,
      [id]
    )

    if (rosterCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Sample roster not found' }, { status: 404 })
    }

    const sourceRoster = rosterCheck.rows[0]

    if (sourceRoster.items_count === 0) {
      return NextResponse.json(
        { error: 'Cannot send an empty roster to a Brand Portal. Please add creators inside the roster first.' },
        { status: 400 }
      )
    }

    const adminName = (admin as any).name || (admin as any).email || (admin as any).full_name || 'Brand Admin'

    let targetRoster: any = null

    if (mode === 'clone') {
      // Create a fresh duplicate of this roster specifically for the new client brand
      const shareToken = crypto.randomBytes(16).toString('hex')
      const clonedTitle = custom_title?.trim() || sourceRoster.title
      const colsToUse = visible_columns
        ? JSON.stringify(visible_columns)
        : JSON.stringify(sourceRoster.visible_columns || [
            'creator_name',
            'instagram_username',
            'followers',
            'avg_reels_views',
            'engagement_rate',
            'city',
            'sample_reel_url',
          ])

      const insertRes = await pool.query(
        `INSERT INTO public.sample_lists (
          title,
          brand_id,
          brand_name,
          category_niche,
          description,
          share_token,
          visible_columns,
          allow_brand_shortlisting,
          is_public_share_enabled,
          is_published_to_brand,
          published_at,
          published_by,
          pitch_note_to_brand,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, true, true, NOW(), $9, $10, $9)
        RETURNING *;`,
        [
          clonedTitle,
          brand_id || null,
          brand_name.trim(),
          sourceRoster.category_niche || null,
          sourceRoster.description || null,
          shareToken,
          colsToUse,
          allow_brand_shortlisting !== undefined ? Boolean(allow_brand_shortlisting) : Boolean(sourceRoster.allow_brand_shortlisting),
          adminName,
          pitch_note_to_brand?.trim() || sourceRoster.pitch_note_to_brand || null,
        ]
      )

      targetRoster = insertRes.rows[0]

      // Copy all creator items into the newly cloned roster
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
          admin_notes,
          sort_order
        )
        SELECT
          $1,
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
          sort_order
        FROM public.sample_list_items
        WHERE sample_list_id = $2;`,
        [targetRoster.id, id]
      )

      targetRoster.items_count = sourceRoster.items_count
    } else {
      // Assign / update existing roster and publish it to the selected brand
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
          allow_brand_shortlisting = COALESCE($6, allow_brand_shortlisting),
          updated_at = NOW()
        WHERE id = $7
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

      targetRoster = updateRes.rows[0]
      targetRoster.items_count = sourceRoster.items_count
    }

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
          mode === 'clone' ? 'sample_roster_cloned_and_published' : 'sample_roster_published_to_brand',
          targetRoster.id,
          JSON.stringify({
            roster_title: targetRoster.title,
            brand_name: targetRoster.brand_name,
            items_count: sourceRoster.items_count,
            pitch_note: pitch_note_to_brand || null,
            mode,
          }),
        ]
      )
    } catch {
      // Non-fatal if audit log table differs
    }

    return NextResponse.json({
      success: true,
      mode,
      message:
        mode === 'clone'
          ? `Created & sent a dedicated copy of "${targetRoster.title}" to ${targetRoster.brand_name}'s Brand Portal!`
          : `Sample roster "${targetRoster.title}" is now LIVE on ${targetRoster.brand_name}'s Brand Portal!`,
      roster: targetRoster,
    })
  } catch (error: any) {
    console.error('Error publishing sample roster to brand portal:', error)
    return NextResponse.json({ error: error.message || 'Failed to publish to brand portal' }, { status: 500 })
  }
}
