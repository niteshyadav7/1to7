import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { BRAND_ADMIN_COOKIE_NAME } from '@/lib/brand-admin-auth'

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete(BRAND_ADMIN_COOKIE_NAME)

  return NextResponse.json({
    success: true,
    message: 'Logged out of Brand Operations Admin successfully',
  })
}
