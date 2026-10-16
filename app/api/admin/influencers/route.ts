import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'influencers')) {
      return NextResponse.json({ error: 'Unauthorized: Access to influencers is restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const search = searchParams.get('search') || ''
    const gender = searchParams.get('gender') || ''
    const category = searchParams.get('category') || ''
    const rawSort = searchParams.get('sort') || 'influencer_seq_num'
    const sortOrder = searchParams.get('order') || 'desc'

    // Route influencer_id or empty default to the indexed numerical column influencer_seq_num for true numerical sorting
    let sortBy = rawSort
    if (rawSort === 'influencer_id' || !rawSort) {
      sortBy = 'influencer_seq_num'
    }

    // Calculate pagination range (0-indexed)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' }) // Get count for pagination

    if (search) {
      // Create an explicit search term for ILIKE matches (including category/niche and languages)
      const searchTerm = `%${search}%`
      query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},influencer_id.ilike.${searchTerm},instagram_username.ilike.${searchTerm},mobile.ilike.${searchTerm},category.ilike.${searchTerm},languages.ilike.${searchTerm}`)
    }

    if (gender && gender !== 'All') {
      query = query.eq('gender', gender)
    }

    if (category && category !== 'All') {
      query = query.ilike('category', `%${category}%`)
    }

    // Apply primary sorting and tie-breaker
    let orderedQuery = query.order(sortBy as string, { ascending: sortOrder === 'asc' })
    if (sortBy !== 'influencer_seq_num') {
      orderedQuery = orderedQuery.order('influencer_seq_num', { ascending: false })
    }

    const { data: influencers, count, error } = await orderedQuery.range(from, to)

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    // Enrich with ghosting status and lifetime counts
    const userIds = (influencers || []).map((u: any) => u.id).filter(Boolean)
    const ghostedUserMap: Record<string, { activeGhostCount: number; lifetimeGhostCount: number }> = {}

    if (userIds.length > 0) {
      const [ghostedAppsRes, ghostEventsRes] = await Promise.all([
        supabase
          .from('applications')
          .select('id, user_id')
          .eq('is_ghosted', true)
          .in('user_id', userIds),
        supabase
          .from('application_ghost_events')
          .select('id, user_id, event_type')
          .eq('event_type', 'ghosted')
          .in('user_id', userIds),
      ])

      if (ghostedAppsRes.data) {
        for (const g of ghostedAppsRes.data) {
          if (!ghostedUserMap[g.user_id]) {
            ghostedUserMap[g.user_id] = { activeGhostCount: 0, lifetimeGhostCount: 0 }
          }
          ghostedUserMap[g.user_id].activeGhostCount++
        }
      }

      if (ghostEventsRes.data) {
        for (const ev of ghostEventsRes.data) {
          if (!ghostedUserMap[ev.user_id]) {
            ghostedUserMap[ev.user_id] = { activeGhostCount: 0, lifetimeGhostCount: 0 }
          }
          ghostedUserMap[ev.user_id].lifetimeGhostCount++
        }
      }
    }

    const enrichedInfluencers = (influencers || []).map((u: any) => ({
      ...u,
      is_ghosted: (ghostedUserMap[u.id]?.activeGhostCount || 0) > 0,
      active_ghost_count: ghostedUserMap[u.id]?.activeGhostCount || 0,
      lifetime_ghost_count: ghostedUserMap[u.id]?.lifetimeGhostCount || 0,
    }))

    // Get global stats (total count, verified email count, etc)
    const { count: totalInfluencers } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: verifiedInfluencers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_email_verified', true)

    return NextResponse.json({
      influencers: enrichedInfluencers,
      stats: {
        total: totalInfluencers || 0,
        verified: verifiedInfluencers || 0,
      },
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0,
      },
    })
  } catch (error) {
    console.error('API /admin/influencers GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
