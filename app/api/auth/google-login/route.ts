import { NextResponse } from 'next/server'
import { encrypt, verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { resolveOrCreateUserIdentity } from '@/lib/auth-linker'

export async function POST(request: Request) {
  try {
    const { email, displayName, mobile } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user is currently logged in via session cookie
    const cookieStore = await cookies()
    const currentAuthToken = cookieStore.get('auth_token')?.value
    let currentUserId: string | null = null
    if (currentAuthToken) {
      const payload = await verifyToken(currentAuthToken)
      if (payload && payload.id) {
        currentUserId = payload.id
      }
    }

    // Resolve or Link identity across login methods
    const { user, isNewUser } = await resolveOrCreateUserIdentity({
      currentUserId,
      fullName: displayName,
      email: email,
      mobile: mobile || null,
      isEmailVerified: true,
      isMobileVerified: !!mobile
    })

    // Auto-login user via session token & httpOnly cookie
    const token = await encrypt({
      id: user.id,
      mobile: user.mobile || '',
      influencer_id: user.influencer_id
    })

    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    })

    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      needsMobileVerification: !user.is_mobile_verified,
      isNewUser
    })
  } catch (error: any) {
    console.error('API /auth/google-login Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

