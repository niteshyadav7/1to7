import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { mobile } = await request.json()
    const cleanMobile = mobile ? String(mobile).replace(/\D/g, '') : ''

    if (!cleanMobile || cleanMobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 })
    }

    // Verify user exists in the database
    const { data: user, error } = await supabase
      .from('users')
      .select('id, mobile, is_mobile_verified')
      .eq('mobile', cleanMobile)
      .maybeSingle()

    if (error || !user) {
      return NextResponse.json({ error: 'No registered user found with this mobile number. Please sign up first.' }, { status: 404 })
    }

    if (!user.is_mobile_verified) {
      return NextResponse.json({ error: 'Mobile number must be verified via OTP first.' }, { status: 403 })
    }

    // Set secure httpOnly cookie with the verified mobile (valid for 10 minutes)
    const cookieStore = await cookies()
    cookieStore.set('pending_instagram_mobile', cleanMobile, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10 // 10 minutes
    })

    return NextResponse.json({
      success: true,
      redirectUrl: '/api/auth/instagram/login'
    })
  } catch (error: any) {
    console.error('API /auth/instagram/init Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
