import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  // Redirect to the mobile app's deep link handler
  // This bypasses email clients that block custom URL schemes
  const deepLink = `1to7media://magic-login?token=${token}`
  
  return NextResponse.redirect(deepLink)
}
