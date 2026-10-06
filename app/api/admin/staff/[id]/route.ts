import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

interface Params {
  params: Promise<{ id: string }>
}

// GET /api/admin/staff/[id] - Fetch single staff member details
export async function GET(request: Request, { params }: Params) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const { id } = await params

    const res = await pool.query(
      `SELECT 
        a.id, a.email, a.name, a.phone, a.creator_view_name, a.creator_view_phone,
        a.role, a.permissions, a.is_active, a.last_login, a.created_at, a.plain_password,
        a.auth_provider, a.avatar_url, a.approval_status, a.approved_at, a.approved_by,
        r.display_name as role_display_name, r.permissions as role_permissions
       FROM public.admins a
       LEFT JOIN public.roles r ON a.role = r.name
       WHERE a.id = $1`,
      [id]
    )

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const staffRow = res.rows[0]
    return NextResponse.json({
      staff: {
        ...staffRow,
        password: staffRow.role === 'super_admin' ? null : (staffRow.plain_password || null),
      },
    })
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
      return NextResponse.json({ error: 'Unauthorized: Permission to edit employee is denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      name,
      email,
      phone,
      creator_view_name,
      creator_view_phone,
      role,
      permissions,
      is_active
    } = body

    const phoneProvided = phone !== undefined
    const cleanPhone = phone ? String(phone).replace(/[^\d+]/g, '').trim() : null

    const creatorPhoneProvided = creator_view_phone !== undefined
    const cleanCreatorPhone = creator_view_phone ? String(creator_view_phone).replace(/[^\d+]/g, '').trim() : null

    const creatorNameProvided = creator_view_name !== undefined
    const cleanCreatorName = creator_view_name ? String(creator_view_name).trim() : null

    // Verify staff exists
    const existing = await pool.query('SELECT * FROM public.admins WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const targetStaff = existing.rows[0]

    // Safeguard: Cannot demote or deactivate the last active Super Admin
    const isDemotingSuperAdmin = role !== undefined && role !== 'super_admin' && targetStaff.role === 'super_admin'
    const isDeactivatingSuperAdmin = is_active === false && targetStaff.role === 'super_admin' && targetStaff.is_active === true

    if (isDemotingSuperAdmin || isDeactivatingSuperAdmin) {
      const countRes = await pool.query("SELECT COUNT(*) FROM public.admins WHERE role = 'super_admin' AND is_active = true")
      const superAdminCount = parseInt(countRes.rows[0].count, 10)
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: 'Cannot deactivate or change the role of the last active Super Admin' }, { status: 400 })
      }
    }

    // Check email uniqueness if email is changed
    if (email && email.toLowerCase().trim() !== targetStaff.email) {
      const emailCheck = await pool.query('SELECT id FROM public.admins WHERE email = $1 AND id != $2', [
        email.toLowerCase().trim(),
        id,
      ])
      if (emailCheck.rows.length > 0) {
        return NextResponse.json({ error: 'This email is already in use by another admin' }, { status: 409 })
      }
    }

    // If role changed to super_admin, clear plain_password
    const finalRole = role ?? targetStaff.role
    const shouldClearPlainPass = finalRole === 'super_admin'

    const updatedRes = await pool.query(
      `UPDATE public.admins 
       SET 
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         role = COALESCE($3, role),
         permissions = COALESCE($4, permissions),
         is_active = COALESCE($5, is_active),
         plain_password = CASE WHEN $6 = true THEN NULL ELSE plain_password END,
         approval_status = COALESCE($7, approval_status),
         phone = CASE WHEN $8::boolean = true THEN $9 ELSE phone END,
         creator_view_name = CASE WHEN $10::boolean = true THEN $11 ELSE creator_view_name END,
         creator_view_phone = CASE WHEN $12::boolean = true THEN $13 ELSE creator_view_phone END,
         updated_at = NOW()
       WHERE id = $14
       RETURNING id, name, email, phone, creator_view_name, creator_view_phone, role, permissions, is_active, plain_password, auth_provider, avatar_url, approval_status, updated_at`,
      [
        name?.trim() ?? null,
        email ? email.toLowerCase().trim() : null,
        role ?? null,
        permissions !== undefined ? JSON.stringify(permissions) : null,
        is_active !== undefined ? is_active : null,
        shouldClearPlainPass,
        body.approval_status ?? null,
        phoneProvided,
        cleanPhone,
        creatorNameProvided,
        cleanCreatorName,
        creatorPhoneProvided,
        cleanCreatorPhone,
        id,
      ]
    )

    const updatedStaff = updatedRes.rows[0]
    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully',
      staff: {
        ...updatedStaff,
        password: updatedStaff.role === 'super_admin' ? null : (updatedStaff.plain_password || null),
      },
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
      return NextResponse.json({ error: 'Unauthorized: Permission to delete employee is denied' }, { status: 403 })
    }

    const { id } = await params

    if (currentAdmin.id === id) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 })
    }

    const existing = await pool.query('SELECT * FROM public.admins WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const targetStaff = existing.rows[0]

    // Safeguard: Cannot delete the last active Super Admin
    if (targetStaff.role === 'super_admin') {
      const countRes = await pool.query("SELECT COUNT(*) FROM public.admins WHERE role = 'super_admin'")
      const superAdminCount = parseInt(countRes.rows[0].count, 10)
      if (superAdminCount <= 1) {
        return NextResponse.json({ error: 'Cannot delete the last Super Admin' }, { status: 400 })
      }
    }

    await pool.query('DELETE FROM public.admins WHERE id = $1', [id])

    return NextResponse.json({
      success: true,
      message: 'Employee account deleted permanently',
    })
  } catch (error) {
    console.error('API /admin/staff/[id] DELETE Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
