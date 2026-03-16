import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

    // Store in Supabase
    const { error: otpError } = await supabase
      .from('otps')
      .insert([{ email, otp, expires_at: expiresAt }])

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    // Send via Resend (Mock for now if no key provided)
    console.log(`[EMAIL OTP] To: ${email}, OTP: ${otp}`)
    
    // In production:
    // await resend.emails.send({
    //   from: 'onboarding@resend.dev',
    //   to: email,
    //   subject: 'Verification Code',
    //   text: `Your verification code is: ${otp}`
    // })

    return NextResponse.json({ success: true, message: 'OTP sent to email (check server console)' })
  } catch (error) {
    console.error('API /auth/send-email-otp Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
