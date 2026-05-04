import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { SignJWT } from 'jose'
import { sendEmail } from '@/lib/mailer'

const secretKey = process.env.JWT_SECRET_KEY || 'default_super_secret_dev_key_1to7'
const key = new TextEncoder().encode(secretKey)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists
    const { data: user, error } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('email', email)
      .single()

    if (error || !user) {
      // Return success anyway to prevent email enumeration attacks
      return NextResponse.json({ success: true })
    }

    // Generate a short-lived token specifically for magic link login (15 mins)
    const magicToken = await new SignJWT({ id: user.id, email })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m')
      .sign(key)

    // The verification URL that redirects to the app
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/api/mobile/verify-magic?token=${magicToken}`

    // Send email
    await sendEmail({
      to: email,
      subject: 'Login to 1to7 Media 🚀',
      html: `
        <div style="font-family: sans-serif; padding: 20px; text-align: center;">
          <h2>Hello ${user.full_name.split(' ')[0] || 'Creator'}!</h2>
          <p>Click the button below to magically log in to the 1to7 Media app. This link expires in 15 minutes.</p>
          <a href="${verificationUrl}" style="display: inline-block; padding: 12px 24px; background-color: #a855f7; color: #fff; text-decoration: none; border-radius: 8px; font-weight: bold; margin-top: 20px;">
            Log in to App
          </a>
          <p style="margin-top: 30px; font-size: 12px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true, message: 'Magic link sent' })
  } catch (err: any) {
    console.error('Magic link error:', err)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
