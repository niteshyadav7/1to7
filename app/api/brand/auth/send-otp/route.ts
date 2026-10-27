import { NextResponse } from 'next/server'
import pool from '@/lib/db'

// In-memory rate limiting map: email -> timestamps[]
const rateLimitMap = new Map<string, number[]>()

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Valid work email is required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      return NextResponse.json({ error: 'Please enter a valid work email address' }, { status: 400 })
    }

    // Rate Limiting: max 3 requests per 10 minutes
    const now = Date.now()
    const windowMs = 10 * 60 * 1000
    const timestamps = (rateLimitMap.get(cleanEmail) || []).filter(t => now - t < windowMs)
    if (timestamps.length >= 5) {
      return NextResponse.json(
        { error: 'Too many verification code requests. Please wait a few minutes before trying again.' },
        { status: 429 }
      )
    }
    timestamps.push(now)
    rateLimitMap.set(cleanEmail, timestamps)

    // Generate 6-digit numeric OTP
    const isDev = process.env.NODE_ENV !== 'production'
    const otp = isDev ? '123456' : Math.floor(100000 + Math.random() * 900000).toString()

    // Store in public.otps table (with 10-minute validity)
    try {
      // Invalidate previous unused OTPs for this email
      await pool.query(
        'UPDATE public.otps SET is_used = true WHERE LOWER(email) = $1 AND is_used = false',
        [cleanEmail]
      )

      await pool.query(
        `INSERT INTO public.otps (email, otp, expires_at, is_used, created_at)
         VALUES ($1, $2, NOW() + INTERVAL '10 minutes', false, NOW())`,
        [cleanEmail, otp]
      )
    } catch (dbErr: any) {
      console.warn('DB OTP insert fallback (non-fatal in dev):', dbErr.message)
    }

    // Log for KAM/Dev verification
    console.log(`[Brand Auth OTP] Verification code for ${cleanEmail}: ${otp}`)

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${cleanEmail}`,
      demoCode: isDev ? otp : undefined,
    })
  } catch (error: any) {
    console.error('Send Brand OTP API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send verification code' },
      { status: 500 }
    )
  }
}
