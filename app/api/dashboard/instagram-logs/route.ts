import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { data: logs, error } = await supabase
      .from('instagram_profile_logs')
      .select('id, event_type, old_username, new_username, actor_type, actor_name, reason, created_at')
      .eq('user_id', payload.id)
      .in('event_type', [
        'PROFILE_LINKED',
        'PROFILE_UNLINKED',
        'PROFILE_PRIMARY_CHANGED',
        'APPLICATION_PROFILE_LOCKED',
        'ADMIN_APPLICATION_PROFILE_CHANGED',
        'COMPLETION_PROFILE_CONFIRMED'
      ])
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return NextResponse.json({ logs: logs || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch profile history' }, { status: 500 })
  }
}
