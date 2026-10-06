import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const applicationId = searchParams.get('application_id')
    const userId = searchParams.get('user_id')
    const campaignId = searchParams.get('campaign_id')
    const eventType = searchParams.get('event_type')
    const actorType = searchParams.get('actor_type')
    const search = searchParams.get('search')?.trim().toLowerCase()
    const isExport = searchParams.get('export') === 'true'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))

    let query = supabase
      .from('instagram_profile_logs')
      .select(`
        id,
        event_type,
        user_id,
        application_id,
        campaign_id,
        profile_id,
        old_username,
        new_username,
        actor_type,
        actor_id,
        actor_name,
        reason,
        metadata,
        created_at
      `, { count: 'exact' })
      .order('created_at', { ascending: false })

    if (applicationId) query = query.eq('application_id', applicationId)
    if (userId) query = query.eq('user_id', userId)
    if (campaignId) query = query.eq('campaign_id', campaignId)
    if (eventType) query = query.eq('event_type', eventType)
    if (actorType) query = query.eq('actor_type', actorType)

    if (search) {
      query = query.or(`old_username.ilike.%${search}%,new_username.ilike.%${search}%,actor_name.ilike.%${search}%`)
    }

    if (isExport) {
      const { data, error } = await query.limit(1000)
      if (error) throw error

      // Convert to CSV
      const headers = ['Timestamp', 'Event', 'User ID', 'App ID', 'Old Handle', 'New Handle', 'Actor Type', 'Actor Name', 'Reason']
      const rows = (data || []).map(r => [
        new Date(r.created_at).toISOString(),
        r.event_type,
        r.user_id,
        r.application_id || '',
        r.old_username || '',
        r.new_username || '',
        r.actor_type,
        `"${(r.actor_name || '').replace(/"/g, '""')}"`,
        `"${(r.reason || '').replace(/"/g, '""')}"`
      ])

      const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')

      return new Response(csvContent, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="instagram_logs_${new Date().toISOString().slice(0, 10)}.csv"`
        }
      })
    }

    const from = (page - 1) * limit
    const to = from + limit - 1
    const { data: logs, count, error } = await query.range(from, to)

    if (error) throw error

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch logs' }, { status: 500 })
  }
}
