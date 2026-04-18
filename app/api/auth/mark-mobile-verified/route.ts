import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { mobile } = await request.json()

    if (!mobile) {
      return NextResponse.json({ error: 'Mobile is required' }, { status: 400 })
    }

    // Instantly mark mobile as verified in the background 
    // after successful Firebase OTP validation on the frontend
    const { error } = await supabase
      .from('users')
      .update({ is_mobile_verified: true })
      .eq('mobile', mobile)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('API /auth/mark-mobile-verified Error:', error)
    return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
  }
}
