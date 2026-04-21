import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { mobile } = await request.json()

    if (!mobile || mobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 })
    }

    // Find user by mobile
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Ensure mobile is marked as verified (OTP was already confirmed by Firebase on frontend)
    if (!user.is_mobile_verified) {
      await supabase
        .from('users')
        .update({ is_mobile_verified: true })
        .eq('id', user.id)
    }

    // Create JWT token
    const token = await encrypt({ id: user.id, mobile: user.mobile, influencer_id: user.influencer_id })

    // Set httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    // Don't send password hash to client
    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({ success: true, user: userWithoutPassword })
  } catch (error) {
    console.error('API /auth/otp-login Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
