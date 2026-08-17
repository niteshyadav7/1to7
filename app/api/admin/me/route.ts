import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { Client } from 'pg'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      `SELECT a.id, a.email, a.name, a.role, a.permissions, a.is_active, a.last_login, r.display_name as role_display_name, r.permissions as role_permissions 
       FROM public.admins a 
       LEFT JOIN public.roles r ON a.role = r.name 
       WHERE a.id = $1`,
      [admin.id]
    )
    await client.end()

    const row = res.rows[0]
    if (!row || row.is_active === false) {
      return NextResponse.json({ error: 'Account not found or inactive' }, { status: 403 })
    }

    let effectivePermissions = row.permissions || {}
    if (!effectivePermissions || Object.keys(effectivePermissions).length === 0) {
      effectivePermissions = row.role_permissions || {}
    }

    const isSuperAdmin = row.role === 'super_admin'

    return NextResponse.json({
      admin: {
        id: row.id,
        email: row.email,
        name: row.name || 'Admin',
        role: row.role,
        roleDisplayName: row.role_display_name || row.role,
        is_active: row.is_active,
        permissions: effectivePermissions,
        is_super_admin: isSuperAdmin,
        last_login: row.last_login,
      },
    })
  } catch (error) {
    console.error('API /admin/me Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
