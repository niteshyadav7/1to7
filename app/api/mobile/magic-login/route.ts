import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { jwtVerify, SignJWT } from 'jose'

const secretKey = process.env.JWT_SECRET_KEY || 'default_super_secret_dev_key_1to7'
const key = new TextEncoder().encode(secretKey)

export async function POST(request: Request) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 })
    }

    // Verify the short-lived magic token
    const { payload } = await jwtVerify(token, key, { algorithms: ['HS256'] })
    
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Fetch user details
    const { data: user, error } = await supabase
      .from('users')
      .select('id, influencer_id, full_name, mobile, email, instagram_username, gender, category, profile_strength, is_email_verified, is_mobile_verified, role')
      .eq('id', payload.id)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Create the long-lived real auth token (30 days)
    const authToken = await new SignJWT({
      id: user.id,
      mobile: user.mobile,
      influencer_id: user.influencer_id,
      email: user.email,
      role: user.role || 'influencer',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30d')
      .sign(key)

    return NextResponse.json({
      success: true,
      token: authToken,
      user
    })

  } catch (err: any) {
    console.error('Magic login error:', err)
    return NextResponse.json({ error: 'Invalid or expired link' }, { status: 401 })
  }
}
