import { NextResponse } from 'next/server'
import { getBrandFromRequest, encryptBrandToken } from '@/lib/brand-auth'

export async function GET(request: Request) {
  try {
    const brandUser = await getBrandFromRequest(request)

    if (!brandUser) {
      return NextResponse.json({ authenticated: false, error: 'Unauthorized' }, { status: 401 })
    }

    const token = await encryptBrandToken(brandUser, '30d')

    return NextResponse.json({
      authenticated: true,
      user: brandUser,
      token,
    })
  } catch (error: any) {
    return NextResponse.json({ authenticated: false, error: error.message }, { status: 500 })
  }
}
