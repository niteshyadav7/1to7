import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch alerts along with acknowledgement & resolution stats
    const res = await pool.query(`
      SELECT 
        b.*,
        COUNT(a.id) FILTER (WHERE a.resolved = true) AS resolved_count,
        COUNT(a.id) AS total_acknowledged
      FROM public.broadcast_alerts b
      LEFT JOIN public.alert_acknowledgements a ON b.id = a.alert_id
      GROUP BY b.id
      ORDER BY b.created_at DESC
    `)

    // Also get quick stats: count of creators with missing bank details
    const missingBankRes = await pool.query(`
      SELECT COUNT(*)::int AS count 
      FROM public.users 
      WHERE (account_number IS NULL OR TRIM(account_number) = '' OR ifsc_code IS NULL OR TRIM(ifsc_code) = '')
    `)

    const missingBankCount = missingBankRes.rows[0]?.count || 0

    return NextResponse.json({
      alerts: res.rows,
      missingBankCount,
    })
  } catch (error: any) {
    console.error('API /admin/broadcasts GET Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      title,
      message,
      type = 'warning',
      target_type = 'all',
      target_user_id = null,
      target_user_identifier = null,
      action_label = 'Resolve Issue',
      action_url = '/dashboard/profile',
      auto_duration_seconds = 8,
      allow_dismiss = true,
      auto_resolve_on_bank = true,
    } = body

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
    }

    let resolvedUserId: string | null = target_user_id || null
    let resolvedIdentifier: string | null = target_user_identifier ? String(target_user_identifier).trim() : null

    if (target_type === 'specific_user') {
      if (!resolvedIdentifier && !resolvedUserId) {
        return NextResponse.json(
          { error: 'Creator ID, phone number, email, or user ID is required for specific creator alerts' },
          { status: 400 }
        )
      }

      if (resolvedIdentifier && !resolvedUserId) {
        const userLookup = await pool.query(
          `SELECT id, influencer_id, mobile, email FROM public.users 
           WHERE LOWER(TRIM(influencer_id)) = LOWER(TRIM($1))
              OR TRIM(mobile) = TRIM($1)
              OR LOWER(TRIM(email)) = LOWER(TRIM($1))
              OR id::text = TRIM($1)
           LIMIT 1`,
          [resolvedIdentifier]
        )

        if (userLookup.rows.length === 0) {
          return NextResponse.json(
            { error: `No creator found matching "${resolvedIdentifier}". Please verify the Influencer ID, phone, or email.` },
            { status: 404 }
          )
        }

        const matched = userLookup.rows[0]
        resolvedUserId = matched.id
        resolvedIdentifier = matched.influencer_id || resolvedIdentifier
      }
    } else {
      resolvedUserId = null
      resolvedIdentifier = null
    }

    const adminName = admin.name || admin.email || 'Admin'

    const insertRes = await pool.query(
      `
      INSERT INTO public.broadcast_alerts (
        title, message, type, target_type, target_user_id, target_user_identifier,
        action_label, action_url, auto_duration_seconds, allow_dismiss, auto_resolve_on_bank,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
      `,
      [
        title.trim(),
        message.trim(),
        type,
        target_type,
        resolvedUserId,
        resolvedIdentifier,
        (action_label || '').trim(),
        (action_url || '').trim(),
        Number(auto_duration_seconds) || 8,
        Boolean(allow_dismiss),
        Boolean(auto_resolve_on_bank),
        adminName,
      ]
    )

    return NextResponse.json({
      success: true,
      alert: insertRes.rows[0],
      message: 'Broadcast alert created successfully',
    })
  } catch (error: any) {
    console.error('API /admin/broadcasts POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, is_active } = body

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const res = await pool.query(
      `
      UPDATE public.broadcast_alerts
      SET is_active = $1, updated_at = timezone('utc'::text, now())
      WHERE id = $2
      RETURNING *
      `,
      [Boolean(is_active), id]
    )

    if (res.rowCount === 0) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, alert: res.rows[0] })
  } catch (error: any) {
    console.error('API /admin/broadcasts PATCH Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    await pool.query('DELETE FROM public.broadcast_alerts WHERE id = $1', [id])

    return NextResponse.json({ success: true, message: 'Alert deleted successfully' })
  } catch (error: any) {
    console.error('API /admin/broadcasts DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
