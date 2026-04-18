import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***.com'
  const [local, domain] = email.split('@')
  if (local.length <= 2) return `${local[0]}***@${domain}`
  return `${local.slice(0, 2)}${'*'.repeat(Math.min(local.length - 2, 5))}@${domain}`
}

export async function POST(request: Request) {
  try {
    const { mobile, email } = await request.json()

    if (!mobile || mobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 })
    }

    // Query Supabase for the user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, is_mobile_verified')
      .eq('mobile', mobile)
      .single()

    // If an error occurs that is not "Row not found", it's a server error
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase query error (check-mobile):', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    if (!user) {
      return NextResponse.json({ exists: false, isVerified: false })
    }

    // If email was provided, verify it matches (for the email challenge)
    if (email) {
      const isMatch = user.email?.toLowerCase() === email.toLowerCase()
      return NextResponse.json({ exists: true, emailVerified: isMatch, userId: isMatch ? user.id : undefined, isVerified: user.is_mobile_verified })
    }
    // Return data directly (skip masking since we bypass email challenge entirely now for direct apply)
    return NextResponse.json({ 
      exists: true, 
      userId: user.id, // Exposing ID so the frontend can bypass identity check
      maskedEmail: maskEmail(user.email || ''), 
      isVerified: user.is_mobile_verified 
    })
  } catch (error) {
    console.error('API /auth/check-mobile Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
