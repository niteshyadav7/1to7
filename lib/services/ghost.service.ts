import pool from '@/lib/db'
import type { AdminPayload } from '@/types/admin'
import { hasActionPermission } from '@/lib/admin-auth'
import {
  sendCreatorActionRequiredGhostedEmail,
  sendCreatorCollaborationRestoredEmail,
} from '@/lib/mailer'

export interface GhostEventRecord {
  id: string
  application_id: string
  user_id: string
  campaign_id: string
  action: 'ghosted' | 'unghosted'
  reason_category: string
  comment: string
  proof_urls: string[]
  batch_id: string | null
  actor_admin_id: string
  actor_name: string | null
  actor_role: string | null
  created_at: string
  brand_name?: string
  campaign_code?: string
}

export interface UserGhostSummary {
  activeGhostedCount: number
  totalLifetimeGhostEvents: number
  lastGhostedAt: string | null
  isCurrentlyGhosted: boolean
}

export class GhostService {
  /**
   * Evaluates if the admin has authorization to ghost/un-ghost creators for this campaign.
   * Allowed if:
   * 1. Super Admin
   * 2. The admin is an assigned POC for the campaign (c.poc_admin_ids contains admin.id)
   * 3. The admin has the explicit 'applications.ghost' permission
   */
  static canManageGhost(
    admin: AdminPayload,
    campaign?: { poc_admin_ids?: string[] | null } | null
  ): boolean {
    if (!admin) return false
    if (admin.role === 'super_admin' || Boolean(admin.is_super_admin)) return true

    if (campaign?.poc_admin_ids && Array.isArray(campaign.poc_admin_ids)) {
      if (campaign.poc_admin_ids.includes(admin.id)) {
        return true
      }
    }

    return hasActionPermission(admin, 'applications', 'ghost')
  }

  /**
   * Mark one or multiple applications as ghosted with screenshots and comments inside a transaction.
   */
  static async ghostApplications(
    applicationIds: string[],
    payload: {
      reason_category: string
      comment: string
      proof_urls: string[]
    },
    admin: AdminPayload,
    batchId?: string
  ): Promise<{
    succeeded: string[]
    skipped: { id: string; reason: string }[]
  }> {
    if (!applicationIds || applicationIds.length === 0) {
      return { succeeded: [], skipped: [] }
    }

    const client = await pool.connect()
    const succeeded: string[] = []
    const skipped: { id: string; reason: string }[] = []
    const emailsToSend: Array<{
      email: string
      name: string
      brandName: string
      campaignCode: string
      pocName?: string | null
      pocPhone?: string | null
    }> = []

    try {
      await client.query('BEGIN')

      // Fetch all target applications with campaign & user details with row locks
      const appsRes = await client.query(
        `
        SELECT 
          a.id,
          a.user_id,
          a.campaign_id,
          a.status,
          a.is_ghosted,
          a.form_data,
          a.completion_submitted_at,
          c.brand_name,
          c.campaign_code,
          c.poc_admin_ids,
          c.manager_phone,
          u.email,
          u.full_name,
          u.mobile
        FROM public.applications a
        JOIN public.campaigns c ON a.campaign_id = c.id
        JOIN public.users u ON a.user_id = u.id
        WHERE a.id = ANY($1)
        FOR UPDATE OF a
        `,
        [applicationIds]
      )

      const appMap = new Map<string, any>()
      for (const row of appsRes.rows) {
        appMap.set(row.id, row)
      }

      for (const appId of applicationIds) {
        const row = appMap.get(appId)
        if (!row) {
          skipped.push({ id: appId, reason: 'Application not found' })
          continue
        }

        // Check POC / Admin permission
        const isAuthorized = this.canManageGhost(admin, {
          poc_admin_ids: row.poc_admin_ids,
        })
        if (!isAuthorized) {
          skipped.push({
            id: appId,
            reason: 'You are not assigned as POC for this campaign and lack ghost permission',
          })
          continue
        }

        // Check if already ghosted
        if (row.is_ghosted) {
          skipped.push({ id: appId, reason: 'Already marked as ghosted' })
          continue
        }

        // Validate not completed / already paid
        const isCompleted =
          row.status === 'Completed' ||
          Boolean(row.completion_submitted_at) ||
          Boolean(row.form_data?.completion_submission)
        if (isCompleted) {
          skipped.push({
            id: appId,
            reason: 'Creator has already completed deliverables or been paid',
          })
          continue
        }

        // 1. Create a dedicated broadcast alert popup for this creator
        const alertRes = await client.query(
          `
          INSERT INTO public.broadcast_alerts (
            title,
            message,
            type,
            target_type,
            target_user_id,
            action_label,
            action_url,
            allow_dismiss,
            is_active,
            created_by
          )
          VALUES ($1, $2, 'critical', 'specific_user', $3, 'Submit Deliverable', '/dashboard/approved', false, true, $4)
          RETURNING id
          `,
          [
            `Action Required: Deliverable Overdue (${row.brand_name})`,
            `Your collaboration deliverables for ${row.brand_name} (${row.campaign_code}) are overdue. Please complete the form or reach out to your POC to unblock your account.`,
            row.user_id,
            admin.email,
          ]
        )
        const alertId = alertRes.rows[0]?.id || null

        // 2. Update application status flags
        await client.query(
          `
          UPDATE public.applications
          SET 
            is_ghosted = true,
            ghosted_at = timezone('utc'::text, now()),
            ghosted_by = $1,
            ghost_alert_id = $2,
            updated_at = timezone('utc'::text, now())
          WHERE id = $3
          `,
          [admin.id, alertId, appId]
        )

        // 3. Insert append-only immutable ghost event
        await client.query(
          `
          INSERT INTO public.application_ghost_events (
            application_id,
            user_id,
            campaign_id,
            action,
            reason_category,
            comment,
            proof_urls,
            batch_id,
            actor_admin_id,
            actor_name,
            actor_role
          )
          VALUES ($1, $2, $3, 'ghosted', $4, $5, $6, $7, $8, $9, $10)
          `,
          [
            appId,
            row.user_id,
            row.campaign_id,
            payload.reason_category,
            payload.comment,
            payload.proof_urls,
            batchId || null,
            admin.id,
            admin.name || admin.email,
            admin.role || 'poc',
          ]
        )

        succeeded.push(appId)

        // Prepare email to send after commit
        if (row.email) {
          emailsToSend.push({
            email: row.email,
            name: row.full_name || 'Creator',
            brandName: row.brand_name || 'Campaign',
            campaignCode: row.campaign_code || 'N/A',
            pocName: admin.name || 'Campaign POC',
            pocPhone: row.manager_phone || null,
          })
        }
      }

      await client.query('COMMIT')
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }

    // Fire off notification emails asynchronously without blocking response
    for (const em of emailsToSend) {
      sendCreatorActionRequiredGhostedEmail(
        em.email,
        em.name,
        em.brandName,
        em.campaignCode,
        em.pocName,
        em.pocPhone
      ).catch(e => console.error('Failed to send ghosted email notification:', e))
    }

    return { succeeded, skipped }
  }

  /**
   * Reverse ghosting status with verified reason, comment, and proof screenshots.
   */
  static async unghostApplication(
    applicationId: string,
    payload: {
      reason_category: string
      comment: string
      proof_urls: string[]
    },
    admin: AdminPayload
  ): Promise<{ success: boolean; message: string }> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const appRes = await client.query(
        `
        SELECT 
          a.id,
          a.user_id,
          a.campaign_id,
          a.is_ghosted,
          a.ghost_alert_id,
          c.brand_name,
          c.campaign_code,
          c.poc_admin_ids,
          u.email,
          u.full_name
        FROM public.applications a
        JOIN public.campaigns c ON a.campaign_id = c.id
        JOIN public.users u ON a.user_id = u.id
        WHERE a.id = $1
        FOR UPDATE OF a
        `,
        [applicationId]
      )

      if (appRes.rows.length === 0) {
        throw new Error('Application not found')
      }

      const row = appRes.rows[0]

      // Check POC / Admin authorization
      const isAuthorized = this.canManageGhost(admin, {
        poc_admin_ids: row.poc_admin_ids,
      })
      if (!isAuthorized) {
        throw new Error(
          'You are not assigned as POC for this campaign and lack un-ghost permission'
        )
      }

      if (!row.is_ghosted) {
        throw new Error('This creator application is not currently marked as ghosted')
      }

      // 1. Deactivate creator broadcast alert if one was created
      if (row.ghost_alert_id) {
        await client.query(
          `
          UPDATE public.broadcast_alerts
          SET is_active = false, updated_at = timezone('utc'::text, now())
          WHERE id = $1
          `,
          [row.ghost_alert_id]
        )
      }

      // 2. Clear application ghosted flags
      await client.query(
        `
        UPDATE public.applications
        SET 
          is_ghosted = false,
          ghosted_at = null,
          ghosted_by = null,
          ghost_alert_id = null,
          updated_at = timezone('utc'::text, now())
        WHERE id = $1
        `,
        [applicationId]
      )

      // 3. Append immutable unghost event to audit log
      await client.query(
        `
        INSERT INTO public.application_ghost_events (
          application_id,
          user_id,
          campaign_id,
          action,
          reason_category,
          comment,
          proof_urls,
          actor_admin_id,
          actor_name,
          actor_role
        )
        VALUES ($1, $2, $3, 'unghosted', $4, $5, $6, $7, $8, $9)
        `,
        [
          applicationId,
          row.user_id,
          row.campaign_id,
          payload.reason_category,
          payload.comment,
          payload.proof_urls,
          admin.id,
          admin.name || admin.email,
          admin.role || 'poc',
        ]
      )

      await client.query('COMMIT')

      // Notify creator that collaboration has been restored
      if (row.email) {
        sendCreatorCollaborationRestoredEmail(
          row.email,
          row.full_name || 'Creator',
          row.brand_name || 'Campaign',
          row.campaign_code || 'N/A'
        ).catch(e => console.error('Failed to send unghosted restoration email:', e))
      }

      return {
        success: true,
        message: 'Creator successfully un-ghosted and unblocked from new campaigns.',
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Retrieves all ghost events for an application, creator, or campaign
   */
  static async getGhostHistory(params: {
    applicationId?: string
    userId?: string
    campaignId?: string
  }): Promise<GhostEventRecord[]> {
    const conditions: string[] = []
    const values: any[] = []

    if (params.applicationId) {
      values.push(params.applicationId)
      conditions.push(`e.application_id = $${values.length}`)
    }
    if (params.userId) {
      values.push(params.userId)
      conditions.push(`e.user_id = $${values.length}`)
    }
    if (params.campaignId) {
      values.push(params.campaignId)
      conditions.push(`e.campaign_id = $${values.length}`)
    }

    if (conditions.length === 0) {
      return []
    }

    const query = `
      SELECT 
        e.id,
        e.application_id,
        e.user_id,
        e.campaign_id,
        e.action,
        e.reason_category,
        e.comment,
        e.proof_urls,
        e.batch_id,
        e.actor_admin_id,
        e.actor_name,
        e.actor_role,
        e.created_at,
        COALESCE(c.brand_name, 'Account Direct Action') as brand_name,
        COALESCE(c.campaign_code, 'USER-LEVEL') as campaign_code
      FROM public.application_ghost_events e
      LEFT JOIN public.campaigns c ON e.campaign_id = c.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY e.created_at DESC
    `

    const res = await pool.query(query, values)
    return res.rows
  }

  /**
   * Retrieves overall ghost statistics for a creator across their entire history
   */
  /**
   * Mark a creator/user account directly as ghosted (account-wide).
   * Also updates any currently active applications for this user so all gates close.
   */
  static async ghostUser(
    userId: string,
    payload: {
      reason_category: string
      comment: string
      proof_urls: string[]
    },
    admin: AdminPayload
  ): Promise<{ success: boolean; message: string }> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      // Check if user exists
      const userRes = await client.query(
        `SELECT id, full_name, email, is_ghosted FROM public.users WHERE id = $1 FOR UPDATE`,
        [userId]
      )
      if (userRes.rows.length === 0) {
        throw new Error('User not found')
      }
      const user = userRes.rows[0]

      if (user.is_ghosted) {
        throw new Error('This creator account is already marked as ghosted')
      }

      // 1. Update user account ghosting flags
      await client.query(
        `UPDATE public.users 
         SET is_ghosted = true, 
             ghosted_at = timezone('utc'::text, now()), 
             ghosted_by = $2, 
             ghost_reason = $3
         WHERE id = $1`,
        [userId, admin.id, payload.reason_category]
      )

      // 2. Also flag any active/ongoing applications
      await client.query(
        `UPDATE public.applications 
         SET is_ghosted = true, 
             ghosted_at = timezone('utc'::text, now()), 
             ghosted_by = $2
         WHERE user_id = $1 AND is_ghosted = false`,
        [userId, admin.id]
      )

      // 3. Record immutable audit event in application_ghost_events
      await client.query(
        `INSERT INTO public.application_ghost_events (
          user_id,
          application_id,
          campaign_id,
          action,
          reason_category,
          comment,
          proof_urls,
          actor_admin_id,
          actor_name,
          actor_role
        ) VALUES ($1, null, null, 'ghosted', $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          payload.reason_category,
          payload.comment,
          payload.proof_urls,
          admin.id,
          admin.name || admin.email,
          admin.role || 'admin',
        ]
      )

      await client.query('COMMIT')

      return {
        success: true,
        message: 'Creator account has been marked as ghosted with proof. Future applications are blocked.',
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Un-ghost a creator/user account directly.
   * Restores user account and clears ghost flags on applications.
   */
  static async unghostUser(
    userId: string,
    payload: {
      reason_category: string
      comment: string
      proof_urls: string[]
    },
    admin: AdminPayload
  ): Promise<{ success: boolean; message: string }> {
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      const userRes = await client.query(
        `SELECT id, full_name, email, is_ghosted FROM public.users WHERE id = $1 FOR UPDATE`,
        [userId]
      )
      if (userRes.rows.length === 0) {
        throw new Error('User not found')
      }
      const user = userRes.rows[0]

      // Check if user or any of their applications are ghosted
      const ghostedAppsRes = await client.query(
        `SELECT id FROM public.applications WHERE user_id = $1 AND is_ghosted = true`,
        [userId]
      )

      if (!user.is_ghosted && ghostedAppsRes.rows.length === 0) {
        throw new Error('This creator is not currently marked as ghosted')
      }

      // 1. Restore user account
      await client.query(
        `UPDATE public.users 
         SET is_ghosted = false, 
             ghosted_at = null, 
             ghosted_by = null, 
             ghost_reason = null
         WHERE id = $1`,
        [userId]
      )

      // 2. Restore all applications
      await client.query(
        `UPDATE public.applications 
         SET is_ghosted = false, 
             ghosted_at = null, 
             ghosted_by = null
         WHERE user_id = $1 AND is_ghosted = true`,
        [userId]
      )

      // 3. Append immutable unghost event to audit log
      await client.query(
        `INSERT INTO public.application_ghost_events (
          user_id,
          application_id,
          campaign_id,
          action,
          reason_category,
          comment,
          proof_urls,
          actor_admin_id,
          actor_name,
          actor_role
        ) VALUES ($1, null, null, 'unghosted', $2, $3, $4, $5, $6, $7)`,
        [
          userId,
          payload.reason_category,
          payload.comment,
          payload.proof_urls,
          admin.id,
          admin.name || admin.email,
          admin.role || 'admin',
        ]
      )

      await client.query('COMMIT')

      return {
        success: true,
        message: 'Creator account successfully un-ghosted and unblocked from campaigns.',
      }
    } catch (err) {
      await client.query('ROLLBACK')
      throw err
    } finally {
      client.release()
    }
  }

  /**
   * Retrieves overall ghost statistics for a creator across their entire history
   */
  static async getUserGhostSummary(userId: string): Promise<UserGhostSummary> {
    const [userRes, activeRes, historyRes] = await Promise.all([
      pool.query(`SELECT is_ghosted, ghosted_at FROM public.users WHERE id = $1`, [userId]),
      pool.query(
        `SELECT COUNT(*) FROM public.applications WHERE user_id = $1 AND is_ghosted = true`,
        [userId]
      ),
      pool.query(
        `SELECT COUNT(*) as total_events, MAX(created_at) as last_ghosted_at 
         FROM public.application_ghost_events 
         WHERE user_id = $1 AND action = 'ghosted'`,
        [userId]
      ),
    ])

    const isUserAccountGhosted = Boolean(userRes.rows[0]?.is_ghosted)
    const appGhostedCount = parseInt(activeRes.rows[0]?.count || '0', 10)
    const activeGhostedCount = appGhostedCount + (isUserAccountGhosted && appGhostedCount === 0 ? 1 : 0)
    const totalLifetimeGhostEvents = parseInt(
      historyRes.rows[0]?.total_events || '0',
      10
    )
    const lastGhostedAt = historyRes.rows[0]?.last_ghosted_at
      ? new Date(historyRes.rows[0].last_ghosted_at).toISOString()
      : (userRes.rows[0]?.ghosted_at ? new Date(userRes.rows[0].ghosted_at).toISOString() : null)

    return {
      activeGhostedCount,
      totalLifetimeGhostEvents,
      lastGhostedAt,
      isCurrentlyGhosted: isUserAccountGhosted || appGhostedCount > 0,
    }
  }
}
