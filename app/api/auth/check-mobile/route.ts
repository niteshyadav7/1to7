import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { maskEmail } from '@/lib/user-utils'

export async function POST(request: Request) {
  try {
    const { mobile, email } = await request.json()

    if (!mobile || mobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 })
    }

    // Query Supabase for the user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_mobile_verified, is_email_verified')
      .eq('mobile', mobile)
      .single()

    // If an error occurs that is not "Row not found", it's a server error
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase query error (check-mobile):', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ exists: false, isVerified: false, isMobileVerified: false, isEmailVerified: false })
    }

    const isPlaceholderEmail = !user.email || user.email.endsWith('@instagram.1to7.com')
    const emailVerified = isPlaceholderEmail ? true : !!user.is_email_verified
    const mobileVerified = !!user.is_mobile_verified

    // Return sanitized status without exposing internal database userId
    return NextResponse.json({ 
      exists: true, 
      maskedEmail: maskEmail(user.email || ''), 
      email: user.email,
      isVerified: mobileVerified && emailVerified, 
      isMobileVerified: mobileVerified,
      isEmailVerified: emailVerified
    })
  } catch (error) {
    console.error('API /auth/check-mobile Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
