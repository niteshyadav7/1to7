import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
// import { Redis } from '@upstash/redis' // Uncomment when Upstash is configured

// const redis = Redis.fromEnv() // Uncomment when Upstash is configured

export async function POST(request: Request) {
  try {
    const { mobile } = await request.json()

    if (!mobile || mobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 })
    }

    // Rate Limiting (Mocked for now)
    // In production, check Redis for requests in the last 10 minutes
    // const rateLimitKey = `otp_ratelimit_${mobile}`
    // const count = await redis.incr(rateLimitKey)
    // if (count === 1) await redis.expire(rateLimitKey, 600) // 10 minutes
    // if (count > 3) return NextResponse.json({ error: 'Rate limit exceeded. Try again in 10 minutes.' }, { status: 429 })

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString()

    // Expiration time (5 minutes from now)
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString()

    // Insert into Supabase otps table
    const { error } = await supabase
      .from('otps')
      .insert([
        { mobile, otp, expires_at: expiresAt }
      ])

    if (error) {
      console.error('Error saving OTP to db:', error)
      return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 })
    }

    // MOCK Sending SMS (Replace with Fast2SMS integration)
    console.log(`\n\n===========================================`)
    console.log(`[MOCK SMS] OTP for ${mobile} is: ${otp}`)
    console.log(`===========================================\n\n`)
    
    // Example Fast2SMS Request (Commented out):
    /*
    const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        'authorization': process.env.FAST2SMS_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        route: 'otp',
        variables_values: otp,
        numbers: mobile,
      })
    })
    */

    return NextResponse.json({ success: true, message: 'OTP sent successfully (mocked in console)' })
  } catch (error) {
    console.error('API /auth/send-otp Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
