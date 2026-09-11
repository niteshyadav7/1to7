import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { extractInstagramUsername, normalizeInstagramUsername, syncUserInstagramState } from '@/lib/instagram-utils'

export async function POST() {
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

    // 1. Fetch user's stored Instagram token
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, instagram_access_token, instagram_username, instagram_id, followers, instagram_followers_count')
      .eq('id', payload.id)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!user.instagram_access_token) {
      return NextResponse.json({
        error: 'No connected Instagram account found. Please link your Instagram via Login with Instagram.',
        connected: false
      }, { status: 400 })
    }

    // 2. Fetch fresh profile data directly from Meta Graph API
    let profileData: any = null
    const accessToken = user.instagram_access_token

    // Try v21.0 endpoint
    try {
      const res = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,profile_picture_url,followers_count,media_count,biography,website&access_token=${accessToken}`)
      const data = await res.json()
      if (data && !data.error && (data.username || data.id)) {
        profileData = data
      }
    } catch (err) {
      console.warn('[instagram-sync] v21.0 fetch error:', err)
    }

    // Fallback without version prefix
    if (!profileData) {
      try {
        const res = await fetch(`https://graph.instagram.com/me?fields=id,username,name,account_type,profile_picture_url,followers_count,media_count,biography,website&access_token=${accessToken}`)
        const data = await res.json()
        if (data && !data.error && (data.username || data.id)) {
          profileData = data
        } else if (data?.error) {
          // Token is likely invalid or expired
          return NextResponse.json({
            error: data.error.message || 'Instagram connection expired. Please reconnect Instagram.',
            expired: true
          }, { status: 401 })
        }
      } catch (err) {
        console.warn('[instagram-sync] Fallback fetch error:', err)
      }
    }

    if (!profileData) {
      return NextResponse.json({
        error: 'Unable to reach Instagram API. Please check your network or reconnect Instagram.',
        expired: true
      }, { status: 502 })
    }

    // 3. Update public.users table
    const updates: Record<string, any> = {
      is_instagram_verified: true,
      updated_at: new Date().toISOString()
    }

    if (profileData.username && !profileData.username.startsWith('insta_')) {
      updates.instagram_username = profileData.username
    }
    if (typeof profileData.followers_count === 'number') {
      updates.followers = profileData.followers_count
      updates.instagram_followers_count = profileData.followers_count
    }
    if (typeof profileData.media_count === 'number') {
      updates.instagram_media_count = profileData.media_count
    }
    if (profileData.profile_picture_url) {
      updates.instagram_profile_pic = profileData.profile_picture_url
    }
    if (profileData.biography) {
      updates.instagram_biography = profileData.biography
    }
    if (profileData.website) {
      updates.instagram_website = profileData.website
    }
    if (profileData.account_type) {
      updates.instagram_account_type = profileData.account_type
    }

    await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)

    // 4. Update user_instagram_profiles table
    const targetHandle = extractInstagramUsername(profileData.username || user.instagram_username)
    const normHandle = normalizeInstagramUsername(targetHandle)

    if (targetHandle && !targetHandle.startsWith('insta_')) {
      const { data: existingProfiles } = await supabase
        .from('user_instagram_profiles')
        .select('*')
        .eq('user_id', user.id)

      const match = existingProfiles?.find(p => p.normalized_username === normHandle) || existingProfiles?.find(p => p.is_primary)

      if (match) {
        await supabase
          .from('user_instagram_profiles')
          .update({
            username: targetHandle,
            normalized_username: normHandle,
            followers: typeof profileData.followers_count === 'number' ? profileData.followers_count : match.followers,
            profile_pic: profileData.profile_picture_url || match.profile_pic,
            is_verified: true,
            is_primary: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', match.id)
      } else {
        await supabase
          .from('user_instagram_profiles')
          .insert([{
            user_id: user.id,
            username: targetHandle,
            normalized_username: normHandle,
            followers: typeof profileData.followers_count === 'number' ? profileData.followers_count : 0,
            profile_pic: profileData.profile_picture_url || '',
            is_primary: true,
            is_verified: true
          }])
      }

      await syncUserInstagramState(user.id)
    }

    return NextResponse.json({
      success: true,
      message: 'Instagram profile & followers synchronized with Meta!',
      followers: profileData.followers_count ?? user.followers,
      mediaCount: profileData.media_count ?? 0,
      username: targetHandle || user.instagram_username,
      profilePic: profileData.profile_picture_url || ''
    })
  } catch (err: any) {
    console.error('[instagram-sync] Handler error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
