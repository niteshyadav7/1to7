import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function proxy(request: NextRequest) {
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
    } catch (error) {
      console.error('Middleware Auth Error:', error)
      const response = NextResponse.redirect(new URL('/signup', request.url))
      response.cookies.delete('auth_token')
      return response
    }
  }

  // 2. Admin Protection (supports all dynamic admin and staff roles)
  if (pathname.startsWith('/admin') && pathname !== '/admin') {
    const adminToken = request.cookies.get('admin_token')?.value
    if (!adminToken) {
      return NextResponse.redirect(new URL('/admin', request.url))
    }

    try {
      const payload = await decrypt(adminToken)
      if (!payload?.id || !payload?.email || !payload?.role) {
        throw new Error('Invalid admin token structure')
      }
      if (payload.is_active === false) {
        throw new Error('Deactivated admin token')
      }
    } catch (error) {
      console.error('Admin Middleware Auth Error:', error)
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
