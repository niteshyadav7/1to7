import { NextResponse } from 'next/server'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'
import pool from '@/lib/db'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || (!currentAdmin.is_super_admin && !hasActionPermission(currentAdmin, 'staff', 'edit'))) {
      return NextResponse.json({ error: 'Unauthorized: Only Super Admins can approve employee requests' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { role = 'admin', permissions = {}, is_active = true } = body

    // 1. Verify employee exists
    const existing = await pool.query('SELECT * FROM public.admins WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    // 2. Fetch role defaults if permissions is empty
    let finalPermissions = permissions
    let roleDisplayName = role
    const roleCheck = await pool.query('SELECT * FROM public.roles WHERE name = $1', [role])
    if (roleCheck.rows.length > 0) {
      roleDisplayName = roleCheck.rows[0].display_name
      if (!finalPermissions || Object.keys(finalPermissions).length === 0) {
        finalPermissions = roleCheck.rows[0].permissions || {}
      }
    }

    // 3. Update staff to approved
    const updateRes = await pool.query(
      `UPDATE public.admins
       SET 
         approval_status = 'approved',
         role = $1,
         permissions = $2,
         is_active = $3,
         approved_by = $4,
         approved_at = NOW(),
         updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, email, avatar_url, role, permissions, is_active, approval_status, auth_provider, approved_at, last_login, created_at`,
      [role, JSON.stringify(finalPermissions), is_active, currentAdmin.id, id]
    )

    const approvedStaff = updateRes.rows[0]

    return NextResponse.json({
      success: true,
      message: `Employee "${approvedStaff.name || approvedStaff.email}" approved successfully as ${roleDisplayName}`,
      staff: {
        ...approvedStaff,
        roleDisplayName,
        effectivePermissions: finalPermissions,
      },
    })
  } catch (error) {
    console.error('API /admin/staff/[id]/approve Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error during approval' },
      { status: 500 }
    )
  }
}
