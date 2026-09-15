import { NextResponse } from 'next/server'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'

// GET /api/admin/staff - List all staff accounts
export async function GET() {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasModuleAccess(currentAdmin, 'staff')) {
      return NextResponse.json({ error: 'Unauthorized: Access to Staff Management is restricted' }, { status: 403 })
    }

    const res = await pool.query(
      `SELECT 
        a.id, 
        a.email, 
        a.name, 
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

// POST /api/admin/staff - Create new staff account
export async function POST(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || !hasActionPermission(currentAdmin, 'staff', 'create')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to create employee is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { name, email, password, role = 'admin', permissions = {}, is_active = true } = body

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

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(password, salt)
    const plainPassToStore = role === 'super_admin' ? null : password

    // Insert staff
    const insertRes = await pool.query(
      `INSERT INTO public.admins 
        (name, email, password_hash, plain_password, role, permissions, is_active, approval_status, auth_provider, approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'approved', 'credentials', $8, NOW())
       RETURNING id, name, email, role, permissions, is_active, created_at, plain_password, auth_provider, avatar_url, approval_status`,
      [
        name?.trim() || 'Employee',
        email.toLowerCase().trim(),
        passwordHash,
        plainPassToStore,
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
