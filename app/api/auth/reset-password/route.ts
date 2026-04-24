import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return NextResponse.json({ error: 'Email, OTP, and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // 1. Verify OTP
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

    // 2. Mark OTP as used
    await supabase
      .from('otps')
      .update({ is_used: true })
      .eq('id', otpData.id)

    // 3. Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // 4. Update user's password and mark email as verified
    //    (user proved email ownership by receiving and entering the OTP)
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword, is_email_verified: true })
      .eq('email', email)

    if (updateError) {
      console.error('Error updating password:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('API /auth/reset-password Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
