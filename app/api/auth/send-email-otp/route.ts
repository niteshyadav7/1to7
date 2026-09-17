import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { sendLoginOtpEmail, sendSignupOtpEmail } from '@/lib/mailer'

export async function POST(request: Request) {
  try {
    const { email, type = 'login' } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email address is required' }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    if (type === 'signup') {
      // 1. For signup: ensure email is not already taken
      const { data: existingUser, error: checkError } = await supabase
        .from('users')
        .select('id')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (checkError) {
        console.error('Supabase user check error:', checkError)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in instead.' },
          { status: 409 }
        )
      }
    } else {
      // 1. For login: verify user exists in database
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .ilike('email', cleanEmail)
        .maybeSingle()

      if (userError) {
        console.error('Supabase user check error:', userError)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      if (!user) {
        return NextResponse.json(
          { error: 'No account found with this email. Please sign up first.' },
          { status: 404 }
        )
      }
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

    // 3. Store in Supabase otps table
    const { error: otpError } = await supabase
      .from('otps')
      .insert([{ email: cleanEmail, otp, expires_at: expiresAt, is_used: false }])

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    // 4. Send email
    console.log(`[EMAIL OTP] (${type}) To: ${cleanEmail}, OTP: ${otp}`)
    if (type === 'signup') {
      await sendSignupOtpEmail(cleanEmail, otp)
    } else {
      await sendLoginOtpEmail(cleanEmail, otp)
    }

    return NextResponse.json({
      success: true,
      message: type === 'signup' ? 'Signup verification code sent to your email' : 'OTP sent to your email',
    })
  } catch (error) {
    console.error('API /auth/send-email-otp Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
