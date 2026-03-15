import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // VERY BASIC SKELETON: Redirect from protected routes if not authenticated
  // We will fully implement JWT checks in Sprint 1

  const hasToken = request.cookies.has('auth_token') // Placeholder cookie name
  const hasAdminToken = request.cookies.has('admin_token') // Placeholder cookie name

  if (pathname.startsWith('/dashboard') && !hasToken) {
    return NextResponse.redirect(new URL('/signup', request.url))
  }

  if (pathname.startsWith('/admin') && pathname !== '/admin' && !hasAdminToken) {
    return NextResponse.redirect(new URL('/admin', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*'],
}
