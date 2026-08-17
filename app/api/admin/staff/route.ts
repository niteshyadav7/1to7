import { NextResponse } from 'next/server'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'
import { Client } from 'pg'
import bcrypt from 'bcryptjs'

// GET /api/admin/staff - List all staff accounts
export async function GET() {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasModuleAccess(currentAdmin, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized: Access to Staff Management is restricted' }, { status: 403 })
    }

    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 })
    }

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    const res = await client.query(
      `SELECT 
        a.id, 
        a.email, 
        a.name, 
        a.role, 
        a.permissions, 
        a.is_active, 
        a.last_login, 
        a.created_at,
        r.display_name as role_display_name,
        r.permissions as role_permissions
       FROM public.admins a
       LEFT JOIN public.roles r ON a.role = r.name
       ORDER BY a.created_at DESC`
    )
    await client.end()

    const staffList = res.rows.map((row) => {
      let effectivePerms = row.permissions || {}
      if (!effectivePerms || Object.keys(effectivePerms).length === 0) {
        effectivePerms = row.role_permissions || {}
      }
      return {
        id: row.id,
        email: row.email,
        name: row.name || 'Staff Member',
        role: row.role || 'staff',
        roleDisplayName: row.role_display_name || row.role,
        permissions: row.permissions || {},
        effectivePermissions: effectivePerms,
        is_active: row.is_active ?? true,
        last_login: row.last_login,
        created_at: row.created_at,
      }
    })

    return NextResponse.json({ staff: staffList })
  } catch (error) {
    console.error('API /admin/staff GET Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/staff - Create new staff account
export async function POST(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasActionPermission(currentAdmin, 'staff', 'create')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to create staff is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role = 'admin', permissions = {}, is_active = true } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    // Check if email already exists
    const existing = await client.query('SELECT id FROM public.admins WHERE email = $1', [email.toLowerCase().trim()])
    if (existing.rows.length > 0) {
      await client.end()
      return NextResponse.json({ error: 'An admin or staff account with this email already exists' }, { status: 409 })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)

    // Insert staff
    const insertRes = await client.query(
      `INSERT INTO public.admins (name, email, password_hash, role, permissions, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, role, permissions, is_active, created_at`,
      [name?.trim() || 'Staff Member', email.toLowerCase().trim(), passwordHash, role, JSON.stringify(permissions), is_active]
    )
    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Staff account created successfully',
      staff: insertRes.rows[0],
    })
  } catch (error) {
    console.error('API /admin/staff POST Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
