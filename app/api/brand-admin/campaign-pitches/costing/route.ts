import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function POST(request: Request) {
  try {
    const admin = (await getBrandAdminFromRequest()) || (await getAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const body = await request.json()
    const { application_ids, client_commercial, internal_cost, is_commercial_pitch } = body

    if (!Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json({ error: 'application_ids array is required' }, { status: 400 })
    }

    const commVal =
      client_commercial !== undefined && client_commercial !== null && client_commercial !== ''
        ? Number(client_commercial)
        : null
    const costVal =
      internal_cost !== undefined && internal_cost !== null && internal_cost !== ''
        ? Number(internal_cost)
        : null
    const isCommercial =
      is_commercial_pitch !== undefined
        ? Boolean(is_commercial_pitch)
        : commVal !== null && commVal > 0

    // NOTE: jsonb_set() is STRICT — passing a NULL new_value makes the whole
    // expression NULL and would wipe form_data (brand curation, address meta, etc.).
    // COALESCE(to_jsonb(...), 'null'::jsonb) stores a JSON null instead.
    const updateQuery = `
      UPDATE public.applications
      SET 
        client_commercial = $1,
        internal_cost = $2,
        is_commercial_pitch = $3,
        form_data = jsonb_set(
          jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{client_commercial}',
            COALESCE(to_jsonb($1::numeric), 'null'::jsonb)
          ),
          '{internal_cost}',
          COALESCE(to_jsonb($2::numeric), 'null'::jsonb)
        ),
        updated_at = NOW()
      WHERE id::text = ANY($4::text[])
      RETURNING id, client_commercial, internal_cost, is_commercial_pitch;
    `

    const res = await pool.query(updateQuery, [
      commVal,
      costVal,
      isCommercial,
      application_ids.map(String),
    ])

    return NextResponse.json({
      success: true,
      updated_count: res.rowCount,
      items: res.rows,
      message: `Updated costing for ${res.rowCount} creator${res.rowCount > 1 ? 's' : ''}!`,
    })
  } catch (error: any) {
    console.error('Error updating application costing:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to update costing' },
      { status: 500 }
    )
  }
}
