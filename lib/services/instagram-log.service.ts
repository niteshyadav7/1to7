import { supabase } from '@/lib/supabase'

export type InstagramEventType =
  | 'PROFILE_LINKED'
  | 'PROFILE_UNLINKED'
  | 'PROFILE_UNLINK_BLOCKED'
  | 'PROFILE_PRIMARY_CHANGED'
  | 'APPLICATION_PROFILE_LOCKED'
  | 'COMPLETION_PROFILE_CONFIRMED'
  | 'COMPLETION_BLOCKED_MISMATCH'
  | 'ADMIN_APPLICATION_PROFILE_CHANGED'
  | 'CREATOR_ACKNOWLEDGED_CHANGE'
  | 'BACKFILL_LOCKED'
  | 'BACKFILL_RELINKED'
  | 'BACKFILL_FLAGGED'

export interface InstagramLogEntry {
  event_type: InstagramEventType
  user_id: string
  application_id?: string | null
  campaign_id?: string | null
  profile_id?: string | null
  old_username?: string | null
  new_username?: string | null
  actor: {
    type: 'creator' | 'admin' | 'system' | 'oauth'
    id?: string | null
    name?: string | null
  }
  reason?: string | null
  metadata?: Record<string, any>
  request?: Request
}

export class InstagramLogService {
  /**
   * Logs an Instagram event into instagram_profile_logs table safely
   */
  static async log(entry: InstagramLogEntry): Promise<void> {
    try {
      const meta = { ...(entry.metadata || {}) }

      // Extract client network info if request is provided
      if (entry.request) {
        const forwarded = entry.request.headers.get('x-forwarded-for')
        const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
        const userAgent = entry.request.headers.get('user-agent') || 'unknown'
        meta.ip = ip
        meta.user_agent = userAgent
      }

      const payload = {
        event_type: entry.event_type,
        user_id: entry.user_id,
        application_id: entry.application_id || null,
        campaign_id: entry.campaign_id || null,
        profile_id: entry.profile_id || null,
        old_username: entry.old_username ? entry.old_username.replace(/^@/, '').trim().toLowerCase() : null,
        new_username: entry.new_username ? entry.new_username.replace(/^@/, '').trim().toLowerCase() : null,
        actor_type: entry.actor.type,
        actor_id: entry.actor.id ? String(entry.actor.id) : null,
        actor_name: entry.actor.name || null,
        reason: entry.reason || null,
        metadata: meta,
        created_at: new Date().toISOString()
      }

      const { error } = await supabase.from('instagram_profile_logs').insert([payload])
      if (error) {
        console.error('[InstagramLogService] DB insert error:', error.message, error.details)
      }
    } catch (err) {
      console.error('[InstagramLogService] Unexpected error inserting log:', err)
    }
  }

  /**
   * Fetch logs for a specific application
   */
  static async getLogsForApplication(applicationId: string) {
    const { data, error } = await supabase
      .from('instagram_profile_logs')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[InstagramLogService] Fetch application logs error:', error)
      return []
    }
    return data || []
  }

  /**
   * Fetch logs for a specific user
   */
  static async getLogsForUser(userId: string) {
    const { data, error } = await supabase
      .from('instagram_profile_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[InstagramLogService] Fetch user logs error:', error)
      return []
    }
    return data || []
  }
}
