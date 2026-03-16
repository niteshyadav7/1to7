import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { mobile, otp } = await request.json()

    if (!mobile || !otp) {
      return NextResponse.json({ error: 'Mobile and OTP are required' }, { status: 400 })
    }

    // 1. Validate OTP from otps table
    const { data: record, error } = await supabase
      .from('otps')
      .select('id, expires_at, is_used')
      .eq('mobile', mobile)
      .eq('otp', otp)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error || !record) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    if (record.is_used) {
      return NextResponse.json({ error: 'OTP has already been used' }, { status: 400 })
    }

    if (new Date() > new Date(record.expires_at)) {
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 })
    }

    // 2. Mark OTP as used
    await supabase.from('otps').update({ is_used: true }).eq('id', record.id)

    // 3. Query user details
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', mobile)
      .single()

    if (userError || !user) {
      // Technically should never happen if they reached here via login flow,
      // but if user doesn't exist, we should tell frontend to send them to signup.
      return NextResponse.json({ error: 'User not found. Please sign up.' }, { status: 404 })
    }

    // 4. Create JWT token
    const token = await encrypt({ id: user.id, mobile: user.mobile, influencer_id: user.influencer_id })

    // 5. Set httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('API /auth/verify-otp Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
