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
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const search = searchParams.get('search') || ''
    const gender = searchParams.get('gender') || ''
    const sortBy = searchParams.get('sort') || 'created_at'
    const sortOrder = searchParams.get('order') || 'desc'

    // Calculate pagination range (0-indexed)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' }) // Get count for pagination

    if (search) {
      // Create an explicit search term for ILIKE matches
      const searchTerm = `%${search}%`
      query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},influencer_id.ilike.${searchTerm},instagram_username.ilike.${searchTerm},mobile.ilike.${searchTerm}`)
    }

    if (gender && gender !== 'All') {
      query = query.eq('gender', gender)
    }

    // Apply sorting and pagination
    const { data: influencers, count, error } = await query
      .order(sortBy as string, { ascending: sortOrder === 'asc' })
      .range(from, to)

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    // Get global stats (total count, verified email count, etc) - optional but nice
    const { count: totalInfluencers } = await supabase.from('users').select('*', { count: 'exact', head: true })
    const { count: verifiedInfluencers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_email_verified', true)

    return NextResponse.json({
      influencers: influencers || [],
      stats: {
        total: totalInfluencers || 0,
        verified: verifiedInfluencers || 0,
      },
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    })
  } catch (error) {
    console.error('API /admin/influencers GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
