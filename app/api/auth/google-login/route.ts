import { NextResponse } from 'next/server'
import { encrypt, verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { resolveOrCreateUserIdentity } from '@/lib/auth-linker'
import { supabase } from '@/lib/supabase'
import { maskEmail } from '@/lib/user-utils'

export async function POST(request: Request) {
  try {
    const { email, displayName, mobile } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : null

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

    // ─── VALIDATE EMAIL & MOBILE MATCHING ───
    if (cleanMobile) {
      const { data: userByMobile, error: mobileError } = await supabase
        .from('users')
        .select('id, email, mobile')
        .eq('mobile', cleanMobile)
        .maybeSingle()

      if (mobileError) {
        console.error('Supabase query error (google-login mobile check):', mobileError)
        return NextResponse.json({ error: 'Database query error' }, { status: 500 })
      }

      if (userByMobile) {
        const registeredEmail = userByMobile.email ? userByMobile.email.trim().toLowerCase() : ''
        const isPlaceholderEmail = !registeredEmail || registeredEmail.endsWith('@instagram.1to7.com')

        // If the mobile user already has a real registered email, it MUST match the Google account email!
        if (!isPlaceholderEmail && registeredEmail !== cleanEmail) {
          return NextResponse.json({
            error: `The selected Google account (${email}) does not match the registered email (${maskEmail(userByMobile.email)}) for mobile number +91 ${cleanMobile}. Please sign in with the correct Google account.`
          }, { status: 400 })
        }

        // If the mobile user has a placeholder email, ensure the incoming Google email isn't already used by someone else
        if (isPlaceholderEmail) {
          const { data: userByEmail } = await supabase
            .from('users')
            .select('id, email, mobile')
            .eq('email', cleanEmail)
            .maybeSingle()

          if (userByEmail && userByEmail.id !== userByMobile.id) {
            return NextResponse.json({
              error: `This Google account (${email}) is already registered to a different account.`
            }, { status: 400 })
          }
        }
      }
    }

    // Resolve or Link identity across login methods
    const { user, isNewUser } = await resolveOrCreateUserIdentity({
      currentUserId,
      fullName: displayName,
      email: cleanEmail,
      mobile: cleanMobile,
      isEmailVerified: true,
      isMobileVerified: !!cleanMobile
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
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 400 })
  }
}

