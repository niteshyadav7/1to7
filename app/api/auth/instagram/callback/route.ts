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
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1064686976510393'
    const appSecret = process.env.META_APP_SECRET || 'd496bc9e45b4a3a38304ddac64873253'
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

    // 1. Exchange code for access token via Meta Graph API (or Instagram fallback)
    let accessToken: string = ''
    let userId: string = ''
    let profileData: any = {}

    // Try Meta Graph Facebook OAuth token exchange first
    const fbTokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    const fbTokenRes = await fetch(fbTokenUrl)
    const fbTokenData = await fbTokenRes.json()

    if (fbTokenRes.ok && fbTokenData.access_token) {
      accessToken = fbTokenData.access_token
      // Fetch user profile from Meta Graph API
      const meRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${accessToken}`)
      profileData = await meRes.json()
    } else {
      // Fallback: Exchange code via Instagram API
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

      if (!tokenRes.ok || !tokenData.access_token) {
        console.error('Meta Token Exchange Error:', fbTokenData, tokenData)
        throw new Error(tokenData.error_message || fbTokenData.error?.message || 'Failed to exchange Meta auth code')
      }

      accessToken = tokenData.access_token
      userId = String(tokenData.user_id || '')
    }

    if (!profileData.id) {
      const validFields = [
        'user_id',
        'username',
        'name',
        'biography',
        'website',
        'account_type',
        'profile_picture_url',
        'followers_count',
        'media_count',
      ].join(',')
      const profileUrl = `https://graph.instagram.com/me?fields=${validFields}&access_token=${accessToken}`
      let profileRes = await fetch(profileUrl)
      profileData = await profileRes.json()

      if (profileData.error) {
        console.warn('Extended profile fetch returned error, falling back to basic fields:', profileData.error)
        const fallbackUrl = `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`
        const fallbackRes = await fetch(fallbackUrl)
        profileData = await fallbackRes.json()
      }
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
