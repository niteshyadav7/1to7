import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const userId = payload.userId

    // Get all application counts in parallel
    const [totalRes, approvedRes, pendingRes, completedRes, rejectedRes] = await Promise.all([
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Approved'),
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Applied'),
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Completed'),
      supabase
        .from('applications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'Rejected'),
    ])

    return NextResponse.json({
      stats: {
        total: totalRes.count || 0,
        approved: approvedRes.count || 0,
        pending: pendingRes.count || 0,
        completed: completedRes.count || 0,
        rejected: rejectedRes.count || 0,
      }
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
