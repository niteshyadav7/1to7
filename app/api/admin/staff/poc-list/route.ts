import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/staff/poc-list
 * Returns active staff members eligible to be assigned as Point of Contact (POC) for campaigns.
 * Accessible to any authenticated admin with campaigns or staff module access.
 */
export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    // Accessible if user is super_admin, or has access to campaigns or staff
    const canAccess =
      admin.role === 'super_admin' ||
      Boolean(admin.is_super_admin) ||
      hasModuleAccess(admin, 'campaigns') ||
      hasModuleAccess(admin, 'staff')

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const res = await pool.query(`
      SELECT 
        a.id, 
        a.name, 
        a.email, 
        a.role, 
        a.avatar_url,
        COALESCE(r.display_name, a.role) AS role_display_name
      FROM public.admins a
      LEFT JOIN public.roles r ON a.role = r.name
      WHERE a.is_active = true 
        AND (a.approval_status = 'approved' OR a.approval_status IS NULL)
      ORDER BY 
        CASE 
          WHEN a.role = 'admin' THEN 1 
          WHEN a.role = 'campaign_manager' THEN 2 
          WHEN a.role = 'super_admin' THEN 3 
          ELSE 4 
        END,
        a.name ASC
    `)

    return NextResponse.json({
      success: true,
      pocs: res.rows.map(row => ({
        id: row.id,
        name: row.name || 'Team Member',
        email: row.email,
        role: row.role,
        roleDisplayName: row.role_display_name || 'Operations Admin',
        avatarUrl: row.avatar_url || null,
      })),
    })
  } catch (error) {
    console.error('API /admin/staff/poc-list GET Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
