import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/staff
 * Returns all admin/staff users with their assigned roles and permissions.
 */
export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const res = await pool.query(
      `SELECT 
        a.id, 
        a.email, 
        a.name, 
        a.phone,
        a.creator_view_name,
        a.creator_view_phone,
        a.role, 
        a.permissions, 
        a.is_active, 
        a.last_login, 
        a.created_at,
        a.plain_password,
        a.auth_provider,
        a.avatar_url,
        a.approval_status,
        a.approved_at,
        a.approved_by,
        approver.name as approved_by_name,
        r.display_name as role_display_name,
        r.permissions as role_permissions
       FROM public.admins a
       LEFT JOIN public.roles r ON a.role = r.name
       LEFT JOIN public.admins approver ON a.approved_by = approver.id
       ORDER BY 
         CASE WHEN a.approval_status = 'pending' THEN 0 ELSE 1 END,
         a.created_at DESC`
    )

    const staffList = res.rows.map((row) => {
      let effectivePerms = row.permissions || {}
      if (!effectivePerms || Object.keys(effectivePerms).length === 0) {
        effectivePerms = row.role_permissions || {}
      }
      return {
        id: row.id,
        email: row.email,
        name: row.name || 'Employee',
        phone: row.phone || null,
        creator_view_name: row.creator_view_name || null,
        creator_view_phone: row.creator_view_phone || null,
        role: row.role || 'staff',
        roleDisplayName: row.role_display_name || row.role,
        permissions: row.permissions || {},
        effectivePermissions: effectivePerms,
        is_active: row.is_active ?? true,
        last_login: row.last_login,
        created_at: row.created_at,
        password: row.role === 'super_admin' ? null : (row.plain_password || null),
        auth_provider: row.auth_provider || 'credentials',
        avatar_url: row.avatar_url || null,
        approval_status: row.approval_status || 'approved',
        approved_at: row.approved_at,
        approved_by: row.approved_by,
        approved_by_name: row.approved_by_name,
      }
    })

    return NextResponse.json({ staff: staffList })
  } catch (error) {
    console.error('API /admin/staff GET Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/admin/staff
 * Creates a new employee/admin account directly.
 */
export async function POST(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasActionPermission(currentAdmin, 'staff', 'create')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to create employee is denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      email,
      password,
      phone,
      creator_view_name,
      creator_view_phone,
      role = 'admin',
      permissions = {},
      is_active = true
    } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Check if email already exists
    const existing = await pool.query('SELECT id FROM public.admins WHERE email = $1', [email.toLowerCase().trim()])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    // Clean phone numbers if provided
    const cleanPhone = phone ? String(phone).replace(/[^\d+]/g, '').trim() : null
    const cleanCreatorPhone = creator_view_phone ? String(creator_view_phone).replace(/[^\d+]/g, '').trim() : null
    const cleanCreatorName = creator_view_name?.trim() || null

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)
    const plainPassToStore = role === 'super_admin' ? null : password

    // Insert staff
    const insertRes = await pool.query(
      `INSERT INTO public.admins 
        (name, email, password_hash, plain_password, phone, creator_view_name, creator_view_phone, role, permissions, is_active, approval_status, auth_provider, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved', 'credentials', $11, NOW())
       RETURNING id, name, email, phone, creator_view_name, creator_view_phone, role, permissions, is_active, created_at, plain_password, auth_provider, avatar_url, approval_status`,
      [
        name?.trim() || 'Employee',
        email.toLowerCase().trim(),
        passwordHash,
        plainPassToStore,
        cleanPhone,
        cleanCreatorName,
        cleanCreatorPhone,
        role,
        JSON.stringify(permissions),
        is_active,
        currentAdmin.id,
      ]
    )

    const createdStaff = insertRes.rows[0]
    return NextResponse.json({
      success: true,
      message: 'Employee account created successfully',
      staff: {
        ...createdStaff,
        password: createdStaff.role === 'super_admin' ? null : (createdStaff.plain_password || null),
      },
    })
  } catch (error) {
    console.error('API /admin/staff POST Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
