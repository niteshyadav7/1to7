import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function GET(request: Request) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const q = (searchParams.get('q') || searchParams.get('search') || '').trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50', 10), 1), 100)

    let rows: any[] = []

    if (q) {
      // Clean query: remove leading @, strip wildcards %, and trim
      const cleanQ = q.replace(/^@/, '').replace(/[%]/g, '').trim()
      const term = `%${cleanQ}%`

      const queryText = `
        SELECT 
          id,
          full_name,
          instagram_username,
          followers,
          city,
          state,
          category,
          instagram_profile_pic,
          instagram_profiles
        FROM public.users
        WHERE 
          (instagram_username IS NOT NULL AND instagram_username != '')
          AND (
            full_name ILIKE $1 
            OR instagram_username ILIKE $1 
            OR category ILIKE $1 
            OR city ILIKE $1
            OR state ILIKE $1
          )
        ORDER BY 
          followers DESC NULLS LAST,
          full_name ASC
        LIMIT $2;
      `
      const res = await pool.query(queryText, [term, limit])
      rows = res.rows
    } else {
      // When no query is provided, return top verified creators ordered by follower count
      const queryText = `
        SELECT 
          id,
          full_name,
          instagram_username,
          followers,
          city,
          state,
          category,
          instagram_profile_pic,
          instagram_profiles
        FROM public.users
        WHERE (instagram_username IS NOT NULL AND instagram_username != '')
        ORDER BY 
          followers DESC NULLS LAST,
          full_name ASC
        LIMIT $1;
      `
      const res = await pool.query(queryText, [limit])
      rows = res.rows
    }

    const creators = rows.map((u) => {
      let sampleReel: string | null = null
      if (Array.isArray(u.instagram_profiles) && u.instagram_profiles.length > 0) {
        sampleReel = u.instagram_profiles[0]?.sample_reel || null
      }

      return {
        id: u.id,
        full_name: u.full_name || 'Creator',
        name: u.full_name || 'Creator',
        instagram_username: u.instagram_username || '',
        followers: Number(u.followers) || 0,
        city: u.city || u.state || null,
        state: u.state || null,
        category: u.category || null,
        niche: u.category || null,
        avatar_url: u.instagram_profile_pic || null,
        sample_reel_url: sampleReel,
        instagram_profiles: u.instagram_profiles || [],
      }
    })

    return NextResponse.json({
      success: true,
      creators,
      influencers: creators,
      total: creators.length,
    })
  } catch (error: any) {
    console.error('API /admin/influencers/search Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to search influencers', creators: [], influencers: [] },
      { status: 500 }
    )
  }
}
