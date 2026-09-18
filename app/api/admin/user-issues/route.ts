import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'user_issues')) {
      return NextResponse.json({ error: 'Unauthorized: Access to User Issues is restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const category = searchParams.get('category')
    const source = searchParams.get('source')
    const query = searchParams.get('q')

    let dbQuery = supabase
      .from('user_issues')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      dbQuery = dbQuery.eq('status', status)
    }

    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('issue_type', category)
    }

    if (source && source !== 'all') {
      dbQuery = dbQuery.eq('source_page', source)
    }

    if (query && query.trim()) {
      const q = `%${query.trim()}%`
      dbQuery = dbQuery.or(`ticket_id.ilike.${q},name.ilike.${q},email.ilike.${q},mobile.ilike.${q},description.ilike.${q}`)
    }

    const { data: issuesList, error } = await dbQuery

    if (error) {
      console.error('[GET /api/admin/user-issues] Supabase query error:', error)
      return NextResponse.json({ error: 'Failed to fetch user issues list' }, { status: 500 })
    }

    // Compute stats across all issues
    const { data: allStatsData } = await supabase
      .from('user_issues')
      .select('status')

    const stats = {
      total: allStatsData?.length || 0,
      pending: allStatsData?.filter(i => i.status === 'pending').length || 0,
      inProgress: allStatsData?.filter(i => i.status === 'in_progress').length || 0,
      resolved: allStatsData?.filter(i => i.status === 'resolved').length || 0,
      rejected: allStatsData?.filter(i => i.status === 'rejected').length || 0,
    }

    return NextResponse.json({
      issues: issuesList || [],
      stats,
    })
  } catch (err: any) {
    console.error('[GET /api/admin/user-issues] API error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
