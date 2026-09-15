import { NextResponse } from 'next/server'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'
import pool from '@/lib/db'

// GET /api/admin/roles - List all roles
export async function GET() {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || (!hasModuleAccess(currentAdmin, 'roles') && !hasModuleAccess(currentAdmin, 'staff'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const res = await pool.query('SELECT * FROM public.roles ORDER BY is_system DESC, created_at ASC')
    return NextResponse.json({ roles: res.rows })
  } catch (error) {
    console.error('API /admin/roles GET Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// POST /api/admin/roles - Create a new custom role
export async function POST(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasActionPermission(currentAdmin, 'roles', 'create')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to create roles is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, display_name, description, permissions = {} } = body

    if (!name || !display_name) {
      return NextResponse.json({ error: 'Role identifier and display name are required' }, { status: 400 })
    }

    const roleName = name.toLowerCase().trim().replace(/[^a-z0-9_]/g, '_')

    // Check duplicate
    const existing = await pool.query('SELECT id FROM public.roles WHERE name = $1', [roleName])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'A role with this identifier already exists' }, { status: 409 })
    }

    const insertRes = await pool.query(
      `INSERT INTO public.roles (name, display_name, description, permissions, is_system)
       VALUES ($1, $2, $3, $4, false)
       RETURNING *`,
      [roleName, display_name.trim(), description?.trim() || null, JSON.stringify(permissions)]
    )

    return NextResponse.json({
      success: true,
      role: insertRes.rows[0],
      message: 'Custom role created successfully',
    })
  } catch (error) {
    console.error('API /admin/roles POST Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/admin/roles - Update a role
export async function PUT(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasActionPermission(currentAdmin, 'roles', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to edit roles is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { id, display_name, description, permissions } = body

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 })
    }

    const check = await pool.query('SELECT * FROM public.roles WHERE id = $1', [id])
    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    const role = check.rows[0]
    if (role.name === 'super_admin') {
      return NextResponse.json({ error: 'The Super Admin system role permissions cannot be modified' }, { status: 400 })
    }

    const updateRes = await pool.query(
      `UPDATE public.roles 
       SET 
         display_name = COALESCE($1, display_name),
         description = COALESCE($2, description),
         permissions = COALESCE($3, permissions),
         updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [
        display_name?.trim() ?? null,
        description !== undefined ? description?.trim() : null,
        permissions !== undefined ? JSON.stringify(permissions) : null,
        id,
      ]
    )

    return NextResponse.json({
      success: true,
      role: updateRes.rows[0],
      message: 'Role updated successfully',
    })
  } catch (error) {
    console.error('API /admin/roles PUT Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/roles - Delete a custom role
export async function DELETE(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasActionPermission(currentAdmin, 'roles', 'delete')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to delete roles is denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Role ID is required' }, { status: 400 })
    }

    const check = await pool.query('SELECT * FROM public.roles WHERE id = $1', [id])
    if (check.rows.length === 0) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    const role = check.rows[0]
    if (role.is_system) {
      return NextResponse.json({ error: 'System roles cannot be deleted' }, { status: 400 })
    }

    // Check if any admin currently uses this role
    const adminCount = await pool.query('SELECT COUNT(*) FROM public.admins WHERE role = $1', [role.name])
    if (parseInt(adminCount.rows[0].count, 10) > 0) {
      return NextResponse.json({ error: `Cannot delete role '${role.display_name}' because ${adminCount.rows[0].count} staff member(s) are assigned to it.` }, { status: 400 })
    }

    await pool.query('DELETE FROM public.roles WHERE id = $1', [id])

    return NextResponse.json({
      success: true,
      message: 'Custom role deleted successfully',
    })
  } catch (error) {
    console.error('API /admin/roles DELETE Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
