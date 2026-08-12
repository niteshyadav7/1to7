import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt, verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { resolveOrCreateUserIdentity } from '@/lib/auth-linker'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const appUrl = `${protocol}://${host}`

  if (error || !code) {
    console.error('Instagram OAuth Error:', error, errorDescription)
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(errorDescription || 'Authentication canceled or failed')}`)
  }

  try {
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1371798394383152'
    const appSecret = process.env.META_APP_SECRET || 'f4dfcefc05f4174cba89a792d2251541'
    const redirectUri = `${protocol}://${host}/api/auth/instagram/callback`

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
    const formData = new URLSearchParams()
    formData.append('client_id', appId || '')
    formData.append('client_secret', appSecret || '')
    formData.append('grant_type', 'authorization_code')
    formData.append('redirect_uri', redirectUri)
    formData.append('code', code)

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
    const profileUrl = `https://graph.instagram.com/v21.0/me?fields=user_id,username,name,account_type,profile_picture_url,followers_count,media_count&access_token=${accessToken}`
    const profileRes = await fetch(profileUrl)
    profileData = await profileRes.json()

    if (profileData.error) {
      console.warn('Profile fetch error, trying basic fields:', profileData.error)
      const fallbackRes = await fetch(`https://graph.instagram.com/v21.0/me?fields=user_id,username&access_token=${accessToken}`)
      profileData = await fallbackRes.json()
    }

    const instaId = profileData.user_id || profileData.id || userId
    const instaUsername = profileData.username || `insta_${instaId}`
    const metaName = profileData.name || instaUsername
    const instaPic = profileData.profile_picture_url || ''
    const instaFollowers = profileData.followers_count || 0
    const instaMediaCount = profileData.media_count || 0
    const instaBio = profileData.biography || ''
    const instaWebsite = profileData.website || ''
    const instaAccountType = profileData.account_type || ''
    const metaEmail = `${instaUsername}@instagram.1to7.com`

    // Read pending verified mobile from cookie if user verified mobile before Instagram OAuth
    const pendingMobile = cookieStore.get('pending_mobile')?.value || null
    if (pendingMobile) {
      cookieStore.delete('pending_mobile')
    }

    // 4. Resolve or Link identity across login methods
    const { user, isNewUser } = await resolveOrCreateUserIdentity({
      currentUserId,
      fullName: metaName,
      email: metaEmail,
      mobile: pendingMobile,
      instagramId: instaId,
      instagramUsername: instaUsername,
      instagramAccessToken: accessToken,
      instagramProfilePic: instaPic,
      instagramBiography: instaBio,
      instagramWebsite: instaWebsite,
      instagramFollowersCount: instaFollowers,
      instagramMediaCount: instaMediaCount,
      instagramAccountType: instaAccountType,
      isInstagramVerified: true,
      isEmailVerified: true,
      isMobileVerified: !!pendingMobile
    })

    // 5. Encrypt session token & set httpOnly cookie
    const token = await encrypt({
      id: user.id,
      mobile: user.mobile || '',
      influencer_id: user.influencer_id
    })

    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    })

    // 6. Store Instagram raw debug cookie
    const igDebugData = JSON.stringify({
      raw_profile_from_instagram: profileData,
      parsed: { instaId, instaUsername, metaName, instaPic, instaFollowers, metaEmail },
      fields_available: Object.keys(profileData),
      timestamp: new Date().toISOString()
    })
    cookieStore.set('instagram_debug', igDebugData, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 5
    })

    return NextResponse.redirect(`${appUrl}/dashboard?login=success&provider=instagram${isNewUser ? '&new=true' : ''}`)
  } catch (err: any) {
    console.error('API /auth/instagram/callback Error:', err)
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(err.message || 'Instagram authentication failed')}`)
  }
}
