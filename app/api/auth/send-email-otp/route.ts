import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { Resend } from 'resend'

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

    // Send via Resend
    console.log(`[EMAIL OTP] To: ${email}, OTP: ${otp}`)
    
    // Initialize Resend here to capture environment variables dynamically
    const resendApiKey = process.env.RESEND_API_KEY;
    if (!resendApiKey) {
      console.error('Missing RESEND_API_KEY in environment variables');
      return NextResponse.json({ error: 'Email service configuration error' }, { status: 500 });
    }
    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: 'Acme <onboarding@resend.dev>',
      to: email,
      subject: 'Your 1to7 Login Verification Code',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">1to7</h1>
          </div>
          <div style="padding: 30px; background-color: #fafafa;">
            <p style="font-size: 16px; color: #333; margin-top: 0;">Hello!</p>
            <p style="font-size: 16px; color: #333;">Your verification code to securely login to 1to7 is:</p>
            
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 15px 25px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 5px; color: #4f46e5;">${otp}</span>
            </div>
            
            <p style="font-size: 14px; color: #64748b;">This code will expire in 5 minutes. If you did not request this, please ignore this email.</p>
          </div>
        </div>
      `
    })

    if (error) {
       console.error('Error sending email via Resend:', error)
       return NextResponse.json({ error: 'Failed to send OTP email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'OTP sent to email (check server console)' })
  } catch (error) {
    console.error('API /auth/send-email-otp Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
