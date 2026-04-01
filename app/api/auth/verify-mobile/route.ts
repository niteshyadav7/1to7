import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { mobile } = await request.json()

    if (!mobile) {
      return NextResponse.json({ error: 'Mobile number is required' }, { status: 400 })
    }

    // Update user's mobile verification status
    const { error } = await supabase
      .from('users')
      .update({ is_mobile_verified: true })
      .eq('id', payload.id)

    if (error) {
      console.error('Error updating mobile verification:', error)
      return NextResponse.json({ error: 'Failed to update verification status' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Mobile number verified successfully' })
  } catch (error) {
    console.error('API /auth/verify-mobile Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
