import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandFromRequest } from '@/lib/brand-auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const brandUser = await getBrandFromRequest()

    const body = await request.json()
    const {
      selected_item_ids,
      brand_feedback_notes,
      brand_poc_name,
      brand_poc_email,
      brand_poc_phone,
    } = body

    if (!Array.isArray(selected_item_ids) || selected_item_ids.length === 0) {
      return NextResponse.json({ error: 'Please select at least 1 creator to shortlist' }, { status: 400 })
    }

    // Verify roster exists
    const rosterRes = await pool.query(
      `SELECT id, title, brand_id, brand_name, allow_brand_shortlisting FROM public.sample_lists WHERE id = $1;`,
      [id]
    )

    if (rosterRes.rows.length === 0) {
      return NextResponse.json({ error: 'Sample roster not found' }, { status: 404 })
    }

    const roster = rosterRes.rows[0]
    if (roster.allow_brand_shortlisting === false) {
      return NextResponse.json({ error: 'Shortlisting is currently closed for this roster' }, { status: 403 })
    }

    // Prefer the roster's dedicated target brand if set (prevents multi-tab cookie collisions)
    const rosterTargetBrand =
      roster.brand_name && roster.brand_name.trim().toLowerCase() !== 'general pitch'
        ? roster.brand_name.trim()
        : null
    const effectiveBrandName = rosterTargetBrand || brandUser?.brand_name || 'Brand Partner'
    const pocName = brand_poc_name?.trim() || brandUser?.full_name || `${effectiveBrandName} Reviewer`
    const pocEmail = brand_poc_email?.trim() || brandUser?.email || null
    const pocPhone = brand_poc_phone?.trim() || null

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

    const insertRes = await pool.query(insertQuery, [
      id,
      effectiveBrandName,
      pocName,
      pocEmail,
      pocPhone,
      JSON.stringify(selected_item_ids),
      selected_item_ids.length,
      brand_feedback_notes?.trim() || null,
    ])

    const shortlist = insertRes.rows[0]

    // Create audit log
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
          roster.brand_id || brandUser?.brand_id || 'brand_direct',
          brandUser?.id || null,
          pocEmail,
          'sample_roster_shortlist_submitted',
          shortlist.id,
          JSON.stringify({
            sample_list_id: id,
            roster_title: roster.title,
            brand_name: effectiveBrandName,
            count: selected_item_ids.length,
            notes: brand_feedback_notes || null,
          }),
        ]
      )
    } catch {
      // Non-fatal
    }

    return NextResponse.json({
      success: true,
      message: `Successfully submitted ${selected_item_ids.length} creators to TheHype team!`,
      shortlist,
    })
  } catch (error: any) {
    console.error('Error submitting in-portal brand shortlist:', error)
    return NextResponse.json({ error: error.message || 'Failed to submit shortlist' }, { status: 500 })
  }
}
