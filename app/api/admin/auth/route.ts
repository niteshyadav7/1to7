import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (!process.env.POSTGRES_URL) {
      console.error('Missing POSTGRES_URL environment variable')
      return NextResponse.json({ error: 'Server configuration error: Database URL not found' }, { status: 500 })
    }

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    // Fetch admin details
    const res = await client.query('SELECT * FROM public.admins WHERE email = $1', [email.toLowerCase().trim()])
    const admin = res.rows[0]

    if (!admin) {
      await client.end()
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if account is active
    if (admin.is_active === false) {
      await client.end()
      return NextResponse.json({ error: 'Account has been deactivated. Please contact an administrator.' }, { status: 403 })
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password_hash)
    if (!isPasswordValid) {
      await client.end()
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Resolve permissions
    let permissions = admin.permissions || {}
    let roleDisplayName = admin.role

    // Fetch role permissions if custom permissions are empty or to merge
    const roleRes = await client.query('SELECT * FROM public.roles WHERE name = $1', [admin.role])
    if (roleRes.rows.length > 0) {
      const roleRow = roleRes.rows[0]
      roleDisplayName = roleRow.display_name
      if (!permissions || Object.keys(permissions).length === 0) {
        permissions = roleRow.permissions || {}
      }
    }

    // Update last_login
    await client.query('UPDATE public.admins SET last_login = NOW() WHERE id = $1', [admin.id])
    await client.end()

    const isSuperAdmin = admin.role === 'super_admin'

    // Create JWT token with rich permissions
    const token = await encrypt({
      id: admin.id,
      email: admin.email,
      name: admin.name || 'Admin',
      role: admin.role,
      roleDisplayName,
      is_active: true,
      permissions,
      is_super_admin: isSuperAdmin,
    })

    // Set httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days for admin
    })

    return NextResponse.json({
      success: true,
      admin: {
        id: admin.id,
        name: admin.name || 'Admin',
        email: admin.email,
        role: admin.role,
        roleDisplayName,
        permissions,
        is_super_admin: isSuperAdmin,
      },
    })
  } catch (error) {
    console.error('API /admin/auth Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
