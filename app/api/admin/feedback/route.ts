import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'feedback')) {
      return NextResponse.json({ error: 'Unauthorized: Access to feedback is restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const rating = searchParams.get('rating')
    const query = searchParams.get('q')

    let dbQuery = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })

    if (category && category !== 'all') {
      dbQuery = dbQuery.eq('category', category)
    }

    if (rating && rating !== 'all') {
      dbQuery = dbQuery.eq('rating', Number(rating))
    }

    if (query && query.trim()) {
      const q = `%${query.trim()}%`
      dbQuery = dbQuery.or(`full_name.ilike.${q},email.ilike.${q},influencer_id.ilike.${q},message.ilike.${q}`)
    }

    const { data: feedbackList, error } = await dbQuery

    if (error) {
      console.error('[GET /api/admin/feedback] Supabase error:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback entries' }, { status: 500 })
    }

    // Compute Summary Statistics
    const total = feedbackList?.length || 0
    let totalRatingSum = 0
    const categoryCounts: Record<string, number> = {}
    const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

    for (const item of feedbackList || []) {
      totalRatingSum += item.rating || 0
      ratingCounts[item.rating] = (ratingCounts[item.rating] || 0) + 1
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
    }

    const avgRating = total > 0 ? Number((totalRatingSum / total).toFixed(1)) : 0

    return NextResponse.json({
      feedback: feedbackList || [],
      stats: {
        total,
        avgRating,
        categoryCounts,
        ratingCounts,
      },
    })
  } catch (err) {
    console.error('[GET /api/admin/feedback] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
  }
}
