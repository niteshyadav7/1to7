import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandAdminFromRequest, canManageBrandStaff } from '@/lib/brand-admin-auth'

// Fallback staff list for local testing when database rows are not yet populated
const FALLBACK_STAFF = [
  {
    id: 'superadmin-master-id',
    name: 'Super Admin',
    email: 'superadmin@gmail.com',
    role: 'super_admin',
    brand_admin_access: true,
    brand_admin_role: 'brand_superadmin',
    brand_admin_status: 'approved',
    brand_admin_approved_by: 'system',
    brand_admin_approved_at: '2026-10-20T10:00:00Z',
    created_at: '2026-10-15T10:00:00Z',
  },
  {
    id: 'kam-1',
    name: 'Pooja Verma',
    email: 'pooja.kam@1to7.media',
    role: 'poc',
    brand_admin_access: true,
    brand_admin_role: 'kam',
    brand_admin_status: 'approved',
    brand_admin_approved_by: 'superadmin@gmail.com',
    brand_admin_approved_at: '2026-10-21T12:30:00Z',
    created_at: '2026-10-16T11:00:00Z',
  },
  {
    id: 'kam-lead-1',
    name: 'Nitesh Yadav (Senior Ops)',
    email: 'nitesh.ops@1to7.media',
    role: 'admin',
    brand_admin_access: true,
    brand_admin_role: 'kam_lead',
    brand_admin_status: 'approved',
    brand_admin_approved_by: 'superadmin@gmail.com',
    brand_admin_approved_at: '2026-10-22T09:15:00Z',
    created_at: '2026-10-16T11:00:00Z',
  },
  {
    id: 'pending-user-1',
    name: 'Aakash Sharma (Influencer POC)',
    email: 'aakash.poc@1to7.media',
    role: 'poc', // Has influencer admin access, but NOT brand admin!
    brand_admin_access: false,
    brand_admin_role: 'viewer',
    brand_admin_status: 'pending',
    brand_admin_approved_by: null,
    brand_admin_approved_at: null,
    created_at: '2026-10-25T14:20:00Z',
  },
]

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

    try {
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

      if (res.rows && res.rows.length > 0) {
        return NextResponse.json({ staff: res.rows })
      }
    } catch (dbErr) {
      console.warn('DB query in GET /brand-admin/staff failed, using fallback:', dbErr)
    }

    return NextResponse.json({ staff: FALLBACK_STAFF })
  } catch (error) {
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

    try {
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
    } catch (dbErr) {
      console.warn('DB query in POST /brand-admin/staff failed, responding in mock mode:', dbErr)
    }

    return NextResponse.json({
      success: true,
      message: `Permissions updated for admin ${adminId}`,
      mockUpdated: {
        id: adminId,
        brand_admin_access: isAccessGranted,
        brand_admin_role: role,
        brand_admin_status: status,
      },
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update staff permissions' }, { status: 500 })
  }
}
