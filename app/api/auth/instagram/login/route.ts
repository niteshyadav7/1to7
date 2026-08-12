import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const appId = process.env.NEXT_PUBLIC_META_APP_ID || '1064686976510393'
  const host = request.headers.get('host') || 'localhost:3000'
  const protocol = request.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https')
  const redirectUri = `${protocol}://${host}/api/auth/instagram/callback`

  if (!appId) {
    return NextResponse.json({ error: 'Meta App ID not configured' }, { status: 500 })
  }

  const metaAuthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=public_profile,email&response_type=code`

  return NextResponse.redirect(metaAuthUrl)
}

