import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import nodemailer from 'nodemailer'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    // 1. Check if user exists with this email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('email', email)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'No account found with this email' }, { status: 404 })
    }

    // 2. Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes

    // 3. Store OTP in Supabase
    const { error: otpError } = await supabase
      .from('otps')
      .insert([{ email, otp, expires_at: expiresAt }])

    if (otpError) {
      console.error('Error storing OTP:', otpError)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    // 4. Send OTP email via Nodemailer (Gmail)
    console.log(`[FORGOT PASSWORD OTP] To: ${email}, OTP: ${otp}`)

    const gmailUser = process.env.GMAIL_USER
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

    if (!gmailUser || !gmailAppPassword) {
      console.error('Missing GMAIL_USER or GMAIL_APP_PASSWORD in environment variables')
      return NextResponse.json({ error: 'Email service configuration error' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    })

    await transporter.sendMail({
      from: `"1to7" <${gmailUser}>`,
      to: email,
      subject: 'Reset Your 1to7 Password',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background-color: #0f172a; padding: 20px; text-align: center;">
            <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">1to7</h1>
          </div>
          <div style="padding: 30px; background-color: #fafafa;">
            <p style="font-size: 16px; color: #333; margin-top: 0;">Hello, ${user.full_name}!</p>
            <p style="font-size: 16px; color: #333;">We received a request to reset your password. Use this verification code:</p>
            
            <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 15px 25px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 5px; color: #4f46e5;">${otp}</span>
            </div>
            
            <p style="font-size: 14px; color: #64748b;">This code will expire in 5 minutes. If you did not request a password reset, please ignore this email.</p>
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
              <p style="font-size: 13px; color: #94a3b8; margin: 0;">– Team 1to7</p>
            </div>
          </div>
        </div>
      `
    })

    return NextResponse.json({ success: true, message: 'Password reset OTP sent to email' })
  } catch (error) {
    console.error('API /auth/forgot-password Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}























































































