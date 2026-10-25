import { NextResponse } from 'next/server'
import { getBrandFromRequest } from '@/lib/brand-auth'

export async function GET() {
  try {
    const brandUser = await getBrandFromRequest()

    if (!brandUser) {
      return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      authenticated: true,
      user: brandUser,
    })
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 })
  }
}
