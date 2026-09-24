import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ alerts: [] })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ alerts: [] })

    // Check creator's bank details status
    const userRes = await pool.query(
      `SELECT id, account_number, ifsc_code FROM public.users WHERE id = $1`,
      [payload.id]
    )

    if (userRes.rows.length === 0) return NextResponse.json({ alerts: [] })

    const user = userRes.rows[0]
    const hasBankDetails = Boolean(user.account_number?.trim() && user.ifsc_code?.trim())

    // Fetch active alerts that target this user and have not been resolved by this user
    const alertsRes = await pool.query(
      `
      SELECT 
        b.id,
        b.title,
        b.message,
        b.type,
        b.target_type,
        b.action_label,
        b.action_url,
        b.auto_duration_seconds,
        b.allow_dismiss,
        b.auto_resolve_on_bank,
        b.created_at,
        COALESCE(ack.resolved, false) AS user_resolved,
        ack.dismissed_at
      FROM public.broadcast_alerts b
      LEFT JOIN public.alert_acknowledgements ack 
        ON b.id = ack.alert_id AND ack.user_id = $1
      WHERE b.is_active = true
        AND (
          b.target_type = 'all'
          OR (b.target_type = 'missing_bank' AND $2 = false)
          OR (b.target_type = 'specific_user' AND b.target_user_id = $1)
        )
        AND (ack.resolved IS NULL OR ack.resolved = false)
      ORDER BY b.created_at DESC
      LIMIT 5
      `,
      [payload.id, hasBankDetails]
    )

    // Filter out alerts where auto_resolve_on_bank is true and the user now has bank details
    const activeAlerts = alertsRes.rows.filter(alert => {
      if (alert.auto_resolve_on_bank && hasBankDetails && alert.target_type === 'missing_bank') {
        return false
      }
      return true
    })

    return NextResponse.json({ alerts: activeAlerts, hasBankDetails })
  } catch (error: any) {
    console.error('API /dashboard/alerts GET Error:', error)
    return NextResponse.json({ alerts: [] })
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { alert_id, resolved = false } = body

    if (!alert_id) {
      return NextResponse.json({ error: 'alert_id is required' }, { status: 400 })
    }

    await pool.query(
      `
      INSERT INTO public.alert_acknowledgements (alert_id, user_id, resolved, resolved_at, dismissed_at)
      VALUES ($1, $2, $3, CASE WHEN $3 = true THEN timezone('utc'::text, now()) ELSE NULL END, timezone('utc'::text, now()))
      ON CONFLICT (alert_id, user_id)
      DO UPDATE SET 
        resolved = EXCLUDED.resolved,
        resolved_at = CASE WHEN EXCLUDED.resolved = true THEN timezone('utc'::text, now()) ELSE public.alert_acknowledgements.resolved_at END,
        dismissed_at = timezone('utc'::text, now())
      `,
      [alert_id, payload.id, Boolean(resolved)]
    )

    return NextResponse.json({ success: true, message: 'Alert acknowledged' })
  } catch (error: any) {
    console.error('API /dashboard/alerts POST Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
