import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { SignJWT } from 'jose'
import { sendNotificationEmail } from '@/lib/mailer'

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

    // Send email using existing mailer
    await sendNotificationEmail({
      to: email,
      subject: 'Login to 1to7 Media 🚀',
      bodyHtml: `
        <p style="font-size: 16px; color: #333; margin-top: 0;">Hello ${user.full_name?.split(' ')[0] || 'Creator'}! 👋</p>
        <p style="font-size: 16px; color: #333;">Click the button below to magically log in to the 1to7 Media app. This link expires in <strong>15 minutes</strong>.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="display: inline-block; padding: 14px 28px; background-color: #a855f7; color: #fff; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 15px;">
            Log in to App
          </a>
        </div>
        <p style="font-size: 13px; color: #94a3b8;">If you didn't request this, you can safely ignore this email.</p>
      `,
    })

    return NextResponse.json({ success: true, message: 'Magic link sent' })
  } catch (err: any) {
    console.error('Magic link error:', err)
    return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 })
  }
}
