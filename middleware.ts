import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Dashboard User Protection
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      return NextResponse.redirect(new URL('/signup', request.url))
    }

    try {
      const payload = await decrypt(token)
      if (!payload) throw new Error('Invalid token')
      // Validated. (You can also pass headers here if needed by downstream API)
    } catch (error) {
      console.error('Middleware Auth Error:', error)
      // Invalid token -> Clear it and redirect
      const response = NextResponse.redirect(new URL('/signup', request.url))
      response.cookies.delete('auth_token')
      return response
    }
  }

  // 2. Admin Protection (Skeleton for Sprint 4)
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const adminToken = request.cookies.get('admin_token')?.value
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
