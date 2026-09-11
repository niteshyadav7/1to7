import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1371798394383152'
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const redirectUri = `${protocol}://${host}/api/auth/instagram/callback`

  if (!appId) {
    return NextResponse.json({ error: 'Meta App ID not configured' }, { status: 500 })
  }

  // Instagram Business Login (www.instagram.com)
  const scopes = 'instagram_business_basic'
  const instagramAuthUrl = `https://www.instagram.com/oauth/authorize?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code`

  return NextResponse.redirect(instagramAuthUrl)
}


