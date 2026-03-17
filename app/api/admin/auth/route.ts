import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    // Find admin by email
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .single()

    if (adminError || !admin) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash)
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create JWT token
    const token = await encrypt({ id: admin.id, email: admin.email, role: 'admin' })

    // Set httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days for admin
    })

    return NextResponse.json({
      success: true,
      admin: { id: admin.id, name: admin.name, email: admin.email }
    })
  } catch (error) {
    console.error('API /admin/auth Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
