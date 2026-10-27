import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandAdminFromRequest, canManageBrandStaff } from '@/lib/brand-admin-auth'

export async function GET() {
  try {
    const admin = await getBrandAdminFromRequest()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageBrandStaff(admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can manage Brand Admin RBAC permissions.' },
        { status: 403 }
      )
    }

    const res = await pool.query(
      `SELECT id, name, email, avatar_url, role, 
              COALESCE(brand_admin_access, false) as brand_admin_access,
              COALESCE(brand_admin_role, 'viewer') as brand_admin_role,
              COALESCE(brand_admin_status, 'pending') as brand_admin_status,
              brand_admin_approved_by, brand_admin_approved_at, created_at, last_login
       FROM public.admins
       ORDER BY 
        CASE WHEN brand_admin_status = 'pending' THEN 0 ELSE 1 END,
        created_at DESC`
    )

    return NextResponse.json({ staff: res.rows || [] })
  } catch (error: any) {
    console.error('Error loading brand admin staff from DB:', error)
    return NextResponse.json({ error: 'Failed to load brand admin staff' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const admin = await getBrandAdminFromRequest()

    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!canManageBrandStaff(admin)) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Admin can approve or assign Brand Admin roles.' },
        { status: 403 }
      )
    }

    const { adminId, brand_admin_access, brand_admin_role, brand_admin_status } =
      await request.json()

    if (!adminId) {
      return NextResponse.json({ error: 'adminId is required' }, { status: 400 })
    }

    const isAccessGranted = Boolean(brand_admin_access)
    const status = brand_admin_status || (isAccessGranted ? 'approved' : 'rejected')
    const role = brand_admin_role || 'viewer'

    const res = await pool.query(
      `UPDATE public.admins
       SET brand_admin_access = $1,
           brand_admin_role = $2,
           brand_admin_status = $3,
           brand_admin_approved_by = $4,
           brand_admin_approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, name, email, brand_admin_access, brand_admin_role, brand_admin_status`,
      [isAccessGranted, role, status, admin.email, adminId]
    )

    if (res.rows && res.rows.length > 0) {
      return NextResponse.json({
        success: true,
        updatedStaff: res.rows[0],
        message: `Successfully updated permissions for ${res.rows[0].email}`,
      })
    }

    return NextResponse.json({ error: 'Admin record not found' }, { status: 404 })
  } catch (error: any) {
    console.error('Error updating staff permissions in DB:', error)
    return NextResponse.json({ error: 'Failed to update staff permissions' }, { status: 500 })
  }
}

