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

    // Calculate pagination range (0-indexed)
    const from = (page - 1) * limit
    const to = from + limit - 1

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' }) // Get count for pagination

    if (search) {
      // Create an explicit search term for ILIKE matches
      const searchTerm = `%${search}%`
      query = query.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},influencer_id.ilike.${searchTerm},instagram_username.ilike.${searchTerm}`)
    }

    // Apply pagination and ordering
    const { data: influencers, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Supabase query error:', error)
      throw error
    }

    return NextResponse.json({
      influencers: influencers || [],
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
