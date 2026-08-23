import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()
    const cleanOtp = String(otp).trim()

    // 1. Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .ilike('email', cleanEmail)
      .eq('otp', cleanOtp)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    // 2. Mark OTP as used
    await supabase
      .from('otps')
      .update({ is_used: true })
      .eq('id', otpData.id)

    // 3. Fetch user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (userError || !user) {
      return NextResponse.json({ error: 'User account not found' }, { status: 404 })
    }

    // 4. Mark user's email as verified
    if (!user.is_email_verified) {
      await supabase
        .from('users')
        .update({ is_email_verified: true })
        .eq('id', user.id)
    }

    // 5. Create JWT session token
    const token = await encrypt({
      id: user.id,
      mobile: user.mobile,
      influencer_id: user.influencer_id,
      email: user.email,
    })

    // 6. Set httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    // Don't expose password hash to client
    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({
      success: true,
      message: 'Logged in successfully via Email OTP',
      user: userWithoutPassword,
    })
  } catch (error) {
    console.error('API /auth/verify-email-otp Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
