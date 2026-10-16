import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { sendDeliverableOverdueEmail } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  return handleReminders(request)
}

export async function POST(request: Request) {
  return handleReminders(request)
}

async function handleReminders(request: Request) {
  try {
    // Optional secret verification
    const cronSecret = process.env.CRON_SECRET
    const authHeader = request.headers.get('authorization')
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(request.url)
      const queryKey = url.searchParams.get('key')
      if (queryKey !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized: Invalid CRON_SECRET' }, { status: 401 })
      }
    }

    // 1. Fetch overdue approved applications awaiting deliverable submission
    const overdueQuery = `
      SELECT 
        app.id,
        app.user_id,
        app.campaign_id,
        app.completion_deadline,
        app.is_ghosted,
        app.is_delay_exempted,
        app.overdue_reminder_count,
        app.last_overdue_reminder_at,
        u.email AS user_email,
        u.full_name AS user_name,
        c.brand_name,
        c.campaign_code,
        c.manager_phone,
        c.poc_admin_ids
      FROM public.applications app
      INNER JOIN public.users u ON u.id = app.user_id
      INNER JOIN public.campaigns c ON c.id = app.campaign_id
      WHERE app.status = 'Approved'
        AND app.is_ghosted = false
        AND (app.is_delay_exempted IS NULL OR app.is_delay_exempted = false)
        AND app.completion_submitted_at IS NULL
        AND (app.form_data->'payment_request' IS NULL)
        AND app.completion_deadline IS NOT NULL
        AND app.completion_deadline < NOW()
        AND (app.overdue_reminder_count IS NULL OR app.overdue_reminder_count < 3)
        AND (app.last_overdue_reminder_at IS NULL OR app.last_overdue_reminder_at < NOW() - INTERVAL '20 hours')
      ORDER BY app.completion_deadline ASC
      LIMIT 100
    `

    const res = await pool.query(overdueQuery)
    const overdueApps = res.rows

    if (overdueApps.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No overdue deliverable reminders pending at this time',
        count: 0,
      })
    }

    // 2. Pre-fetch POC admins for manager contact details
    const pocMap = new Map<string, { name: string; phone: string | null; email: string | null }>()
    const allPocIds = new Set<string>()

    for (const app of overdueApps) {
      const ids: string[] = Array.isArray(app.poc_admin_ids) ? app.poc_admin_ids : []
      if (ids[0]) allPocIds.add(ids[0])
    }

    if (allPocIds.size > 0) {
      const pocQuery = `
        SELECT id, name, phone, email 
        FROM public.admins 
        WHERE id = ANY($1::uuid[])
      `
      const pocRes = await pool.query(pocQuery, [Array.from(allPocIds)])
      for (const p of pocRes.rows) {
        pocMap.set(p.id, { name: p.name, phone: p.phone, email: p.email })
      }
    }

    const now = Date.now()
    let sentCount = 0
    let skippedCount = 0
    const errors: Array<{ id: string; error: string }> = []

    for (const app of overdueApps) {
      const deadline = new Date(app.completion_deadline).getTime()
      const daysOverdue = Math.max(1, Math.floor((now - deadline) / (24 * 60 * 60 * 1000)))
      const currentReminderCount = app.overdue_reminder_count || 0

      // Remind cadence:
      // Reminder 1: Day 1+ overdue (count = 0)
      // Reminder 2: Day 3+ overdue (count = 1)
      // Reminder 3: Day 7+ overdue (count = 2)
      let shouldSend = false
      if (currentReminderCount === 0 && daysOverdue >= 1) {
        shouldSend = true
      } else if (currentReminderCount === 1 && daysOverdue >= 3) {
        shouldSend = true
      } else if (currentReminderCount === 2 && daysOverdue >= 7) {
        shouldSend = true
      }

      if (!shouldSend) {
        skippedCount++
        continue
      }

      // Resolve POC contact
      const firstPocId = Array.isArray(app.poc_admin_ids) ? app.poc_admin_ids[0] : null
      const poc = firstPocId ? pocMap.get(firstPocId) : null
      const pocName = poc?.name || 'Campaign Manager'
      const pocPhone = poc?.phone || app.manager_phone || null

      try {
        if (app.user_email) {
          await sendDeliverableOverdueEmail(
            app.user_email,
            app.user_name || 'Creator',
            app.brand_name || 'Campaign',
            app.campaign_code || '',
            daysOverdue,
            pocName,
            pocPhone
          )
        }

        // Update reminder count & timestamp
        await pool.query(
          `
          UPDATE public.applications
          SET 
            overdue_reminder_count = COALESCE(overdue_reminder_count, 0) + 1,
            last_overdue_reminder_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
          `,
          [app.id]
        )

        sentCount++
      } catch (err: any) {
        console.error(`Failed to send overdue reminder for application ${app.id}:`, err)
        errors.push({ id: app.id, error: err.message || 'Email delivery failed' })
      }
    }

    return NextResponse.json({
      success: true,
      processed: overdueApps.length,
      sent: sentCount,
      skipped: skippedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 5),
    })
  } catch (error: any) {
    console.error('API /cron/deliverable-reminders Error:', error)
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 })
  }
}
