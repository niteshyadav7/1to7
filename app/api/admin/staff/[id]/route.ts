import { NextResponse } from 'next/server'
import { getAdminFromRequest, hasActionPermission, hasModuleAccess } from '@/lib/admin-auth'
import { Client } from 'pg'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/admin/staff/[id] - Fetch single staff member
export async function GET(request: Request, { params }: Params) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasModuleAccess(currentAdmin, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    const res = await client.query(
      `SELECT 
        a.id, a.email, a.name, a.role, a.permissions, a.is_active, a.last_login, a.created_at,
        r.display_name as role_display_name, r.permissions as role_permissions
       FROM public.admins a
       LEFT JOIN public.roles r ON a.role = r.name
       WHERE a.id = $1`,
      [id]
    )
    await client.end()

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    return NextResponse.json({ staff: res.rows[0] })
  } catch (error) {
    console.error('API /admin/staff/[id] GET Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/staff/[id] - Update staff member
export async function PUT(request: Request, { params }: Params) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasActionPermission(currentAdmin, 'staff', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to edit staff is denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { name, email, role, permissions, is_active } = body

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    // Verify staff exists
    const existing = await client.query('SELECT * FROM public.admins WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      await client.end()
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const targetStaff = existing.rows[0]

    // Safeguard: Cannot demote or deactivate the last Super Admin
    if (targetStaff.role === 'super_admin' && (role !== 'super_admin' || is_active === false)) {
      const countRes = await client.query("SELECT COUNT(*) FROM public.admins WHERE role = 'super_admin' AND is_active = true")
      const superAdminCount = parseInt(countRes.rows[0].count, 10)
      if (superAdminCount <= 1) {
        await client.end()
        return NextResponse.json({ error: 'Cannot deactivate or change the role of the last active Super Admin' }, { status: 400 })
      }
    }

    // Check email uniqueness if email is changed
    if (email && email.toLowerCase().trim() !== targetStaff.email) {
      const emailCheck = await client.query('SELECT id FROM public.admins WHERE email = $1 AND id != $2', [
        email.toLowerCase().trim(),
        id,
      ])
      if (emailCheck.rows.length > 0) {
        await client.end()
        return NextResponse.json({ error: 'This email is already in use by another admin' }, { status: 409 })
      }
    }

    const updatedRes = await client.query(
      `UPDATE public.admins 
       SET 
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         role = COALESCE($3, role),
         permissions = COALESCE($4, permissions),
         is_active = COALESCE($5, is_active),
         updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, role, permissions, is_active, updated_at`,
      [
        name?.trim() ?? null,
        email ? email.toLowerCase().trim() : null,
        role ?? null,
        permissions !== undefined ? JSON.stringify(permissions) : null,
        is_active !== undefined ? is_active : null,
        id,
      ]
    )
    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Staff updated successfully',
      staff: updatedRes.rows[0],
    })
  } catch (error) {
    console.error('API /admin/staff/[id] PUT Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/staff/[id] - Delete staff account
export async function DELETE(request: Request, { params }: Params) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasActionPermission(currentAdmin, 'staff', 'delete')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to delete staff is denied' }, { status: 403 })
    }

    const { id } = await params

    // Prevent self-deletion
    if (currentAdmin.id === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    // Verify staff exists
    const existing = await client.query('SELECT * FROM public.admins WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      await client.end()
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 })
    }

    const targetStaff = existing.rows[0]

    // Safeguard: Cannot delete the last Super Admin
    if (targetStaff.role === 'super_admin') {
      const countRes = await client.query("SELECT COUNT(*) FROM public.admins WHERE role = 'super_admin'")
      const superAdminCount = parseInt(countRes.rows[0].count, 10)
      if (superAdminCount <= 1) {
        await client.end()
        return NextResponse.json({ error: 'Cannot delete the only Super Admin account' }, { status: 400 })
      }
    }

    await client.query('DELETE FROM public.admins WHERE id = $1', [id])
    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Staff member deleted successfully',
    })
  } catch (error) {
    console.error('API /admin/staff/[id] DELETE Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
