import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { identifier, password } = await request.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Identifier and Password are required' }, { status: 400 })
    }

    // Find user by email, mobile, or influencer_id
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq."${identifier}",mobile.eq."${identifier}",influencer_id.eq."${identifier}"`)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create JWT token
    const token = await encrypt({ id: user.id, mobile: user.mobile, influencer_id: user.influencer_id })

    // Set httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    // Don't send password hash to client
    const { password_hash, ...userWithoutPassword } = user

    return NextResponse.json({ success: true, user: userWithoutPassword })
  } catch (error) {
    console.error('API /auth/login Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
