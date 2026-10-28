import { NextResponse } from 'next/server'
import pool from '@/lib/db'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()
    const {
      shortlisted_item_ids,
      brand_poc_name,
      brand_poc_email,
      brand_poc_phone,
      brand_feedback_notes,
    } = body

    if (!Array.isArray(shortlisted_item_ids) || shortlisted_item_ids.length === 0) {
      return NextResponse.json({ error: 'Please select at least one creator for your shortlist' }, { status: 400 })
    }

    // Verify roster by token
    const listRes = await pool.query(
      `SELECT id, title, brand_name, allow_brand_shortlisting FROM public.sample_lists WHERE share_token = $1;`,
      [token]
    )

    if (listRes.rows.length === 0) {
      return NextResponse.json({ error: 'Roster presentation not found' }, { status: 404 })
    }

    const roster = listRes.rows[0]

    if (!roster.allow_brand_shortlisting) {
      return NextResponse.json({ error: 'Online shortlisting is disabled for this presentation' }, { status: 403 })
    }

    // Insert inbound shortlist record
    const insertQuery = `
      INSERT INTO public.brand_shortlists (
        sample_list_id,
        brand_name,
        brand_poc_name,
        brand_poc_email,
        brand_poc_phone,
        shortlisted_item_ids,
        shortlisted_creators_count,
        brand_feedback_notes,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new')
      RETURNING *;
    `

    const result = await pool.query(insertQuery, [
      roster.id,
      roster.brand_name,
      brand_poc_name?.trim() || null,
      brand_poc_email?.trim() || null,
      brand_poc_phone?.trim() || null,
      JSON.stringify(shortlisted_item_ids),
      shortlisted_item_ids.length,
      brand_feedback_notes?.trim() || null,
    ])

    return NextResponse.json({
      success: true,
      message: `Your shortlist of ${shortlisted_item_ids.length} creators has been submitted to TheHype Campaign Operations team!`,
      shortlist: result.rows[0],
    })
  } catch (error: any) {
    console.error('Error submitting brand shortlist:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit shortlist' }, { status: 500 })
  }
}
