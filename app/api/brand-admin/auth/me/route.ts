import { NextResponse } from 'next/server'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function GET() {
  try {
    const admin = await getBrandAdminFromRequest()

    if (!admin) {
      return NextResponse.json({ authenticated: false, user: null }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: admin,
    })
  } catch (error) {
    return NextResponse.json({ authenticated: false, error: 'Session verification failed' }, { status: 500 })
  }
}
