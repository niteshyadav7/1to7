import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 })
    }

    // Verify OTP
    const { data: otpData, error: otpError } = await supabase
      .from('otps')
      .select('*')
      .eq('email', email)
      .eq('otp', otp)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (otpError || !otpData) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    // Mark OTP as used
    await supabase
      .from('otps')
      .update({ is_used: true })
      .eq('id', otpData.id)

    // Mark user's email as verified (they proved ownership by entering the OTP)
    await supabase
      .from('users')
      .update({ is_email_verified: true })
      .eq('email', email)

    return NextResponse.json({ success: true, message: 'Email verified successfully' })
  } catch (error) {
    console.error('API /auth/verify-email-otp Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
