import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { decrypt } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const { pathname } = request.nextUrl

  // ─── 0. TheHype Brand Portal Subdomain Isolation ───
  const isBrandHost =
    host.startsWith('brand.') ||
    host.includes('thehype.in') ||
    (process.env.BRAND_PORTAL_HOST && host === process.env.BRAND_PORTAL_HOST)

  if (isBrandHost) {
    // Root route on brand domain: Check if brand_token cookie exists
    if (pathname === '/') {
      const brandToken = request.cookies.get('brand_token')?.value
      const url = request.nextUrl.clone()
      url.pathname = brandToken ? '/brand/campaigns' : '/brand/login'
      return NextResponse.redirect(url)
    }

    // Prevent brand clients from hitting 1to7 creator auth / dashboard routes on brand.thehype.in
    if (
      pathname === '/login' ||
      pathname === '/signup' ||
      pathname === '/forgot-password' ||
      pathname === '/verify-mobile' ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/admin')
    ) {
      const url = request.nextUrl.clone()
      url.pathname = '/brand/login'
      return NextResponse.redirect(url)
    }
  }

  // ─── 1. Dashboard User Protection ───
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('auth_token')?.value

    const buildLoginRedirect = () => {
      const loginUrl = new URL('/login', request.url)
      const target = request.nextUrl.pathname + request.nextUrl.search
      if (target && target !== '/dashboard') {
        loginUrl.searchParams.set('redirect', target)
      }
      return loginUrl
    }

    if (!token) {
      return NextResponse.redirect(buildLoginRedirect())
    }

    try {
      const payload = await decrypt(token)
      if (!payload) throw new Error('Invalid token')
    } catch (error) {
      console.error('Proxy Auth Error:', error)
      const response = NextResponse.redirect(buildLoginRedirect())
      response.cookies.delete('auth_token')
      return response
    }
  }

  // ─── 2. Admin Protection (supports all dynamic admin and staff roles) ───
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
      console.error('Admin Proxy Auth Error:', error)
      const response = NextResponse.redirect(new URL('/admin', request.url))
      response.cookies.delete('admin_token')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - metadata/asset files (favicon.ico, thehype-logo.png, etc.)
     */
    '/((?!_next/static|_next/image|thehype-logo.png|logo-icon.svg|favicon.ico).*)',
  ],
}
