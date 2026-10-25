import { NextResponse } from 'next/server'
import { BRAND_COOKIE_NAME } from '@/lib/brand-auth'

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Logged out successfully from Brand Workspace',
  })

  response.cookies.set(BRAND_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })

  return response
}
