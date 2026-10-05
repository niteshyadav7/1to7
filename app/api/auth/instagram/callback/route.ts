import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt, verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const baseUrl = host.includes('localhost') ? `${protocol}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`)
  const appUrl = baseUrl

  if (error || !code) {
    console.error('Instagram OAuth Error:', error, errorDescription)
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(errorDescription || 'Authentication canceled or failed')}`)
  }

  try {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1371798394383152'
    const appSecret = process.env.META_APP_SECRET || 'f4dfcefc05f4174cba89a792d2251541'
    const redirectUri = `${baseUrl}/api/auth/instagram/callback`

    // Check if user is currently logged in via session cookie
    const cookieStore = await cookies()
    const currentAuthToken = cookieStore.get('auth_token')?.value
    let currentUserId: string | null = null
    if (currentAuthToken) {
      const payload = await verifyToken(currentAuthToken)
      if (payload && payload.id) {
        currentUserId = payload.id
      }
    }

    // 1. Exchange code for short-lived access token via Instagram API
    const cleanCode = code ? code.replace(/#_.*$/, '').trim() : ''
    const formData = new URLSearchParams()
    formData.append('client_id', appId || '')
    formData.append('client_secret', appSecret || '')
    formData.append('grant_type', 'authorization_code')
    formData.append('redirect_uri', redirectUri)
    formData.append('code', cleanCode)

    const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData
    })
    const tokenData = await tokenRes.json()

    console.log('\n========== INSTAGRAM CALLBACK DEBUG ==========')
    console.log('[STEP 1] Token Exchange Response:', tokenRes.status, JSON.stringify(tokenData))

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Instagram Token Exchange Error:', tokenData)
      throw new Error(tokenData.error_message || 'Failed to exchange Instagram auth code')
    }

    let accessToken = tokenData.access_token
    const userId = String(tokenData.user_id || '')

    // 2. Exchange for long-lived token
    try {
      const longTokenRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${accessToken}`
      )
      const longTokenData = await longTokenRes.json()
      if (longTokenData.access_token) {
        accessToken = longTokenData.access_token
      }
    } catch (err) {
      console.warn('[STEP 2] Long-lived token exchange failed, using short-lived token', err)
    }

    // 3. Fetch Instagram profile
    let profileData: any = {}

    // Query 1: v21.0 Extended fields (guaranteed to work for Creator / Business Instagram accounts)
    try {
      const res = await fetch(`https://graph.instagram.com/v21.0/me?fields=id,username,name,account_type,profile_picture_url,followers_count,media_count,biography,website&access_token=${accessToken}`)
      const data = await res.json()
      console.log('[STEP 3a] v21.0 extended fields response:', JSON.stringify(data))
      if (data && !data.error && (data.username || data.id)) {
        profileData = { ...profileData, ...data }
      }
    } catch (e) {
      console.warn('[STEP 3a] v21.0 query failed:', e)
    }

    // Query 2: Fallback query without version prefix
    if (!profileData.username || !profileData.followers_count) {
      try {
        const res = await fetch(`https://graph.instagram.com/me?fields=id,username,name,account_type,profile_picture_url,followers_count,media_count,biography,website&access_token=${accessToken}`)
        const data = await res.json()
        console.log('[STEP 3b] Fallback /me fields response:', JSON.stringify(data))
        if (data && !data.error && (data.username || data.id)) {
          profileData = { ...profileData, ...data }
        }
      } catch (e) {
        console.warn('[STEP 3b] Fallback query failed:', e)
      }
    }

    // Query 3: By user ID if /me didn't yield full fields
    if (userId && (!profileData.username || !profileData.followers_count)) {
      try {
        const res = await fetch(`https://graph.instagram.com/v21.0/${userId}?fields=id,username,name,account_type,profile_picture_url,followers_count,media_count,biography,website&access_token=${accessToken}`)
        const data = await res.json()
        console.log('[STEP 3c] By userId response:', JSON.stringify(data))
        if (data && !data.error && (data.username || data.id)) {
          profileData = { ...profileData, ...data }
        }
      } catch (e) {
        console.warn('[STEP 3c] Query by userId failed:', e)
      }
    }

    console.log('[STEP 3 FINAL] Resolved profileData:', JSON.stringify(profileData))

    const instaId = profileData.user_id || profileData.id || userId

    // If Meta didn't return username, check if user already has an established Instagram handle
    let instaUsername = profileData.username
    if (!instaUsername && currentUserId) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('instagram_username')
        .eq('id', currentUserId)
        .maybeSingle()
      if (existingUser?.instagram_username && !existingUser.instagram_username.startsWith('insta_')) {
        instaUsername = existingUser.instagram_username
      }
    }

    // STRICT: Never generate dummy insta_12345 handles!
    if (!instaUsername) {
      console.error('[Instagram Callback] No valid username returned from Meta API')
      return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent('Could not retrieve your Instagram username. Please ensure your account is an Instagram Creator or Business account.')}`)
    }

    const metaName = profileData.name || instaUsername
    const instaPic = profileData.profile_picture_url || ''
    const instaFollowers = typeof profileData.followers_count === 'number' ? profileData.followers_count : 0
    const instaMediaCount = typeof profileData.media_count === 'number' ? profileData.media_count : 0
    const instaBio = profileData.biography || ''
    const instaWebsite = profileData.website || ''
    const instaAccountType = profileData.account_type || ''

    console.log('\n======================================================')
    console.log('📸 [INSTAGRAM OAUTH PROFILE RESOLVED]:')
    console.log(JSON.stringify({
      instaId,
      instaUsername,
      metaName,
      instaFollowers,
      instaMediaCount,
      instaAccountType
    }, null, 2))
    console.log('======================================================\n')

    // Read pending verified mobile from cookie (from /login flow)
    const pendingMobile = cookieStore.get('pending_instagram_mobile')?.value || cookieStore.get('pending_mobile')?.value || null
    if (pendingMobile) {
      cookieStore.delete('pending_instagram_mobile')
      cookieStore.delete('pending_mobile')
    }

    // STRICT: Require either an active logged-in user or a verified mobile session
    if (!currentUserId && !pendingMobile) {
      console.warn('[Instagram Callback] Neither currentUserId nor verified mobile cookie found')
      return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent('Please enter and verify your mobile number on the login page before continuing with Instagram.')}`)
    }

    // Find the real target user in database
    let targetUser: any = null
    if (currentUserId) {
      const { data: userById } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .maybeSingle()
      targetUser = userById
    } else if (pendingMobile) {
      const { data: userByMobile } = await supabase
        .from('users')
        .select('*')
        .eq('mobile', pendingMobile)
        .maybeSingle()
      targetUser = userByMobile
    }

    if (!targetUser) {
      return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent('No registered creator account found for this mobile number. Please sign up first.')}`)
    }

    // Check if this Instagram username is already registered to a DIFFERENT user
    const { checkInstagramHandleAvailability, syncUserInstagramState } = await import('@/lib/instagram-utils')
    const avail = await checkInstagramHandleAvailability(instaUsername, targetUser.id)
    if (!avail.available) {
      return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(avail.message || `Instagram @${instaUsername} is already registered with another account.`)}`)
    }

    // Update the real existing user with authentic Instagram data (never touches mobile, email, or influencer_id!)
    const updates: Record<string, any> = {
      instagram_id: instaId,
      instagram_username: instaUsername,
      instagram_access_token: accessToken,
      instagram_profile_pic: instaPic,
      instagram_biography: instaBio,
      instagram_website: instaWebsite,
      instagram_followers_count: instaFollowers,
      followers: instaFollowers,
      instagram_media_count: instaMediaCount,
      instagram_account_type: instaAccountType,
      is_instagram_verified: true,
      updated_at: new Date().toISOString()
    }

    if ((!targetUser.full_name || targetUser.full_name === 'Guest Creator' || targetUser.full_name === 'Creator') && profileData.name) {
      updates.full_name = profileData.name
    }

    await supabase
      .from('users')
      .update(updates)
      .eq('id', targetUser.id)

    // Update user_instagram_profiles table and synchronize state
    const { data: existingProfile } = await supabase
      .from('user_instagram_profiles')
      .select('id')
      .eq('user_id', targetUser.id)
      .eq('normalized_username', instaUsername.toLowerCase())
      .maybeSingle()

    if (existingProfile) {
      await supabase
        .from('user_instagram_profiles')
        .update({
          username: instaUsername,
          normalized_username: instaUsername.toLowerCase(),
          followers: instaFollowers,
          profile_pic: instaPic,
          is_verified: true,
          is_primary: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id)
    } else {
      await supabase
        .from('user_instagram_profiles')
        .insert([{
          user_id: targetUser.id,
          username: instaUsername,
          normalized_username: instaUsername.toLowerCase(),
          followers: instaFollowers,
          profile_pic: instaPic,
          is_verified: true,
          is_primary: true
        }])
    }

    await syncUserInstagramState(targetUser.id)

    // Issue standard session JWT token & set httpOnly auth_token cookie
    const token = await encrypt({
      id: targetUser.id,
      mobile: targetUser.mobile || '',
      influencer_id: targetUser.influencer_id
    })

    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    return NextResponse.redirect(`${appUrl}/dashboard?login=success&provider=instagram`)
  } catch (err: any) {
    console.error('API /auth/instagram/callback Error:', err)
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(err.message || 'Instagram authentication failed')}`)
  }
}
