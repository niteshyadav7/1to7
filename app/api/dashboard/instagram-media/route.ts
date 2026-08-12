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
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Fetch user's stored Instagram access token & followers count from Supabase
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, instagram_access_token, instagram_followers_count, followers, instagram_username')
      .eq('id', payload.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.instagram_access_token) {
      return NextResponse.json({
        connected: false,
        message: 'Instagram account not connected or access token expired. Connect Instagram to view media & engagement analytics.',
        media: [],
        stats: null
      })
    }

    // Fetch user's recent media (Posts & Reels) via Instagram Graph API
    const fields = [
      'id',
      'caption',
      'media_type',
      'media_url',
      'permalink',
      'thumbnail_url',
      'timestamp',
      'like_count',
      'comments_count'
    ].join(',')

    let mediaUrl = `https://graph.instagram.com/me/media?fields=${fields}&limit=12&access_token=${user.instagram_access_token}`
    let mediaRes = await fetch(mediaUrl)
    let mediaData = await mediaRes.json()

    console.log('[InstagramMedia API] Response status:', mediaRes.status)
    if (!mediaRes.ok || mediaData.error) {
      console.warn('[InstagramMedia API] First attempt error:', mediaData.error)
      
      // Fallback query with basic media fields
      const fallbackFields = ['id', 'caption', 'media_type', 'media_url', 'permalink', 'thumbnail_url', 'timestamp'].join(',')
      mediaUrl = `https://graph.instagram.com/me/media?fields=${fallbackFields}&limit=12&access_token=${user.instagram_access_token}`
      mediaRes = await fetch(mediaUrl)
      mediaData = await mediaRes.json()
      
      console.log('[InstagramMedia API] Fallback response status:', mediaRes.status)
      if (!mediaRes.ok || mediaData.error) {
        console.error('[InstagramMedia API] Fallback attempt error:', mediaData.error)
        return NextResponse.json({
          connected: false,
          error: mediaData.error?.message || 'Failed to fetch Instagram media from Meta API',
          media: [],
          stats: null
        })
      }
    }

    const mediaItems = mediaData.data || []
    const followers = user.instagram_followers_count || user.followers || 0

    // Calculate Engagement Statistics
    let totalLikes = 0
    let totalComments = 0
    let validPostCount = 0

    mediaItems.forEach((item: any) => {
      const likes = typeof item.like_count === 'number' ? item.like_count : 0
      const comments = typeof item.comments_count === 'number' ? item.comments_count : 0
      totalLikes += likes
      totalComments += comments
      validPostCount++
    })

    const avgLikes = validPostCount > 0 ? Math.round(totalLikes / validPostCount) : 0
    const avgComments = validPostCount > 0 ? Math.round(totalComments / validPostCount) : 0
    
    // Engagement Rate % = ((Avg Likes + Avg Comments) / Followers) * 100
    let engagementRate = 0
    if (followers > 0 && validPostCount > 0) {
      const totalAvgInteractions = (totalLikes + totalComments) / validPostCount
      engagementRate = Number(((totalAvgInteractions / followers) * 100).toFixed(2))
    }

    return NextResponse.json({
      connected: true,
      username: user.instagram_username,
      followers,
      media: mediaItems,
      stats: {
        totalPostsFetched: validPostCount,
        totalLikes,
        totalComments,
        avgLikes,
        avgComments,
        engagementRate
      }
    })
  } catch (err: any) {
    console.error('API /dashboard/instagram-media Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to process request' }, { status: 500 })
  }
}
