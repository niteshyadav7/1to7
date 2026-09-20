import { supabase } from '@/lib/supabase'
import type { AdminPayload } from '@/types/admin'

export class AuditService {
  /**
   * Logs modified fields to profile_logs with admin attribution
   */
  static async logProfileChanges(
    userId: string,
    oldUser: Record<string, any>,
    updateData: Record<string, any>,
    admin: AdminPayload
  ): Promise<void> {
    try {
      const logEntries: any[] = []
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field === 'updated_at') continue
        const oldValue = oldUser?.[field]
        if (String(oldValue || '') !== String(newValue || '')) {
          logEntries.push({
            user_id: userId,
            changed_field: field,
            old_value: String(oldValue || ''),
            new_value: String(newValue || ''),
            changed_by: `admin:${admin.id}`,
            admin_name: admin.name || admin.email,
          })
        }
      }

      if (logEntries.length > 0) {
        await supabase.from('profile_logs').insert(logEntries)
      }
    } catch (err) {
      console.error('AuditService: Failed to insert profile_logs:', err)
    }
  }
}
