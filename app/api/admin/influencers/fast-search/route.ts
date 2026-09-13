import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export interface FastSearchCreator {
  id: string
  name: string
  email: string
  instagram_username: string
  influencer_id: string
  followers: number
  avatar_url: string
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || (!hasModuleAccess(admin, 'campaigns') && !hasModuleAccess(admin, 'influencers'))) {
      return NextResponse.json({ error: 'Unauthorized: Access restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = (searchParams.get('search') || '').trim()
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10', 10), 1), 100)
    const fetchRecent = searchParams.get('recent') === 'true'

    // 1. If recent testers requested, fetch distinct pilot creators from recent pilot campaigns
    let recentCreators: FastSearchCreator[] = []
    if (fetchRecent) {
      try {
        const { data: campaigns } = await supabase
          .from('campaigns')
          .select('test_creators')
          .eq('is_test_mode', true)
          .order('updated_at', { ascending: false })
          .limit(10)

        if (campaigns && campaigns.length > 0) {
          const seen = new Set<string>()
          for (const camp of campaigns) {
            if (Array.isArray(camp.test_creators)) {
              for (const c of camp.test_creators) {
                if (c && c.id && !seen.has(c.id)) {
                  seen.add(c.id)
                  recentCreators.push({
                    id: c.id,
                    name: c.name || c.full_name || 'Creator',
                    email: c.email || '',
                    instagram_username: c.instagram_username || '',
                    influencer_id: c.influencer_id || '',
                    followers: c.followers || 0,
                    avatar_url: c.avatar_url || c.instagram_profile_pic || '',
                  })
                }
              }
            }
          }
        }
      } catch (recentErr) {
        console.warn('Could not fetch recent pilot creators from DB:', recentErr)
      }
    }

    // 2. Perform fast query on users using exact valid columns
    let creators: FastSearchCreator[] = []

    let query = supabase
      .from('users')
      .select('id, full_name, email, instagram_username, influencer_id, followers, instagram_profile_pic')
      .order('followers', { ascending: false })
      .limit(limit)

    if (search && search.length >= 1) {
      const sanitized = search.replace(/[%_,()]/g, ' ').trim()
      const term = `%${sanitized}%`
      query = query.or(`full_name.ilike.${term},email.ilike.${term},influencer_id.ilike.${term},instagram_username.ilike.${term}`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Fast search query error:', error)
      return NextResponse.json({ error: error.message, creators: [], recentCreators }, { status: 500 })
    }

    creators = (data || []).map((u: any) => ({
      id: u.id,
      name: u.full_name || 'Unnamed Creator',
      email: u.email || '',
      instagram_username: u.instagram_username || '',
      influencer_id: u.influencer_id || '',
      followers: u.followers || 0,
      avatar_url: u.instagram_profile_pic || '',
    }))

    return NextResponse.json({
      success: true,
      creators,
      recentCreators,
      totalCount: creators.length,
    })
  } catch (error: any) {
    console.error('API /admin/influencers/fast-search Error:', error)
    return NextResponse.json({ error: error?.message || 'Fast search failed', creators: [], recentCreators: [] }, { status: 500 })
  }
}
