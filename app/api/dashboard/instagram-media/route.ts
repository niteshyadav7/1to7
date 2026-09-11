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
      .select('id, instagram_access_token, instagram_followers_count, followers, instagram_username, instagram_profile_pic')
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

    // Also query primary profile handle from user_instagram_profiles to avoid displaying raw insta_ ID
    let displayUsername = user.instagram_username
    const { data: primaryProfile } = await supabase
      .from('user_instagram_profiles')
      .select('username, followers, profile_pic')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .maybeSingle()

    if (primaryProfile?.username && (!displayUsername || displayUsername.startsWith('insta_'))) {
      displayUsername = primaryProfile.username
    }

    // Fetch user's recent media (Posts & Reels) and fresh followers via Instagram Graph API
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

    let mediaItems: any[] = []
    let validPostCount = 0
    let totalLikes = 0
    let totalComments = 0
    let liveFollowers = user.instagram_followers_count || user.followers || 0

    try {
      // 1. Concurrently fetch fresh follower count from Meta Graph API
      try {
        const profileRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username,followers_count,media_count,profile_picture_url&access_token=${user.instagram_access_token}`)
        const profileData = await profileRes.json()
        if (profileData && !profileData.error) {
          if (profileData.username && !profileData.username.startsWith('insta_')) {
            displayUsername = profileData.username
          }
          if (typeof profileData.followers_count === 'number') {
            liveFollowers = profileData.followers_count
            // Update in database in background
            await supabase
              .from('users')
              .update({
                instagram_followers_count: liveFollowers,
                followers: liveFollowers,
                instagram_username: displayUsername,
                instagram_profile_pic: profileData.profile_picture_url || user.instagram_profile_pic,
                is_instagram_verified: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', user.id)
          }
        }
      } catch (profErr) {
        console.warn('[InstagramMedia API] Profile refresh warning:', profErr)
      }

      // 2. Fetch media items
      let mediaUrl = `https://graph.instagram.com/v21.0/me/media?fields=${fields}&limit=12&access_token=${user.instagram_access_token}`
      let mediaRes = await fetch(mediaUrl)
      let mediaData = await mediaRes.json()

      if (mediaData.error) {
        // Try without v21.0 version prefix
        mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp&limit=12&access_token=${user.instagram_access_token}`
        mediaRes = await fetch(mediaUrl)
        mediaData = await mediaRes.json()
      }

      if (mediaData.data && Array.isArray(mediaData.data)) {
        mediaItems = mediaData.data
      }
    } catch (mediaErr) {
      console.warn('[InstagramMedia API] Media fetch warning:', mediaErr)
    }

    const followers = liveFollowers || primaryProfile?.followers || 0

    // Calculate Engagement Statistics
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
      username: displayUsername,
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
