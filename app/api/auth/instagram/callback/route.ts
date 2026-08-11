import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'
import { generateSequentialInfluencerId } from '@/lib/user-utils'

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
    const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1321783783073243'
    const appSecret = process.env.META_APP_SECRET || '366ff23ff99c9a13538d3b49e99b3838'
    const redirectUri = `${protocol}://${host}/api/auth/instagram/callback`

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

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error('Instagram Token Exchange Error:', tokenData)
      throw new Error(tokenData.error_message || 'Failed to exchange Instagram auth code')
    }

    const shortLivedToken = tokenData.access_token
    const userId = String(tokenData.user_id || '')

    // 2. Exchange short-lived token for long-lived token
    let accessToken = shortLivedToken
    try {
      const longTokenRes = await fetch(
        `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${appSecret}&access_token=${shortLivedToken}`
      )
      const longTokenData = await longTokenRes.json()
      if (longTokenData.access_token) {
        accessToken = longTokenData.access_token
      }
    } catch (err) {
      console.warn('Long-lived token exchange failed, using short-lived token', err)
    }

    // 3. Fetch Instagram profile using the new Instagram API
    const profileRes = await fetch(
      `https://graph.instagram.com/me?fields=user_id,username,name,biography,website,account_type,profile_picture_url,followers_count,media_count&access_token=${accessToken}`
    )
    const profileData = await profileRes.json()

    const instaId = profileData.user_id || userId
    const instaUsername = profileData.username || `insta_${instaId}`
    const metaName = profileData.name || instaUsername
    const instaPic = profileData.profile_picture_url || ''
    const instaFollowers = profileData.followers_count || 0
    const metaEmail = `${instaUsername}@instagram.1to7.com`

    // 4. Check if user exists in Supabase by instagram_id, instagram_username, or email
    const { data: userByInstaId } = await supabase
      .from('users')
      .select('*')
      .eq('instagram_id', instaId)
      .maybeSingle()

    const { data: userByUsername } = await supabase
      .from('users')
      .select('*')
      .eq('instagram_username', instaUsername)
      .maybeSingle()

    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', metaEmail)
      .maybeSingle()

    const existingUser = userByInstaId || userByUsername || userByEmail
    const cookieStore = await cookies()

    if (existingUser) {
      // Update existing user with fresh Instagram data
      const updates: any = {
        instagram_id: instaId,
        instagram_username: instaUsername || existingUser.instagram_username || existingUser.full_name,
        instagram_access_token: accessToken,
        instagram_followers_count: instaFollowers || existingUser.instagram_followers_count || 0,
        instagram_profile_pic: instaPic || existingUser.instagram_profile_pic || '',
        followers: instaFollowers || existingUser.followers || 0,
        is_instagram_verified: true,
        is_email_verified: true
      }

      if ((!existingUser.full_name || existingUser.full_name === 'Guest Creator') && metaName) {
        updates.full_name = metaName
      }

      await supabase.from('users').update(updates).eq('id', existingUser.id)

      const token = await encrypt({
        id: existingUser.id,
        mobile: existingUser.mobile || '',
        influencer_id: existingUser.influencer_id
      })

      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      })

      return NextResponse.redirect(`${appUrl}/dashboard?login=success&provider=instagram`)
    }

    // 5. Create new user
    const newInfluencerId = await generateSequentialInfluencerId()

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        full_name: metaName,
        email: metaEmail,
        mobile: null,
        password_hash: '$2b$10$vysFdPLELlPEvtXf1B5kneSq1OV0iEtxOUlf4LpwKfGXmenL1jUpm',
        influencer_id: newInfluencerId,
        instagram_id: instaId,
        instagram_username: instaUsername || metaName.toLowerCase().replace(/\s+/g, '_'),
        instagram_access_token: accessToken,
        instagram_followers_count: instaFollowers,
        instagram_profile_pic: instaPic,
        followers: instaFollowers,
        is_instagram_verified: true,
        is_email_verified: true,
        is_mobile_verified: false
      }])
      .select('*')
      .single()

    if (insertError) {
      console.error('Instagram signup insert error:', insertError)
      return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(insertError.message || 'Failed to create account with Instagram')}`)
    }

    const token = await encrypt({
      id: newUser.id,
      mobile: newUser.mobile || '',
      influencer_id: newUser.influencer_id
    })

    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    })

    return NextResponse.redirect(`${appUrl}/dashboard?login=success&provider=instagram&new=true`)
  } catch (err: any) {
    console.error('API /auth/instagram/callback Error:', err)
    return NextResponse.redirect(`${appUrl}/login?error=${encodeURIComponent(err.message || 'Instagram authentication failed')}`)
  }
}
