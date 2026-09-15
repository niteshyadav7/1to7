import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, displayName, photoURL } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required for Google Sign-In' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()

    // 1. Check if an admin record exists for this email
    const res = await pool.query('SELECT * FROM public.admins WHERE email = $1', [cleanEmail])
    const admin = res.rows[0]

    // 2. Case: Existing admin found
    if (admin) {
      const approvalStatus = admin.approval_status || 'approved'

      if (approvalStatus === 'pending') {
        return NextResponse.json(
          {
            error: 'Your Google account access request is pending Super Admin review. Please contact your administrator.',
            pendingApproval: true,
            email: cleanEmail,
            name: admin.name || displayName || 'Employee',
          },
          { status: 403 }
        )
      }

      if (approvalStatus === 'rejected') {
        return NextResponse.json(
          { error: 'Your access request was rejected by an administrator. Please contact support if you believe this is an error.' },
          { status: 403 }
        )
      }

      if (admin.is_active === false) {
        return NextResponse.json(
          { error: 'This employee account has been deactivated. Please contact a Super Admin to restore access.' },
          { status: 403 }
        )
      }

      // Update last_login, and sync avatar if available
      await pool.query(
        `UPDATE public.admins 
         SET last_login = NOW(), 
             avatar_url = COALESCE($1, avatar_url),
             updated_at = NOW()
         WHERE id = $2`,
        [photoURL || null, admin.id]
      )

      // Resolve permissions & role display name
      let permissions = admin.permissions || {}
      let roleDisplayName = admin.role

      const roleRes = await pool.query('SELECT * FROM public.roles WHERE name = $1', [admin.role])
      if (roleRes.rows.length > 0) {
        const roleRow = roleRes.rows[0]
        roleDisplayName = roleRow.display_name
        if (!permissions || Object.keys(permissions).length === 0) {
          permissions = roleRow.permissions || {}
        }
      }

      const isSuperAdmin = admin.role === 'super_admin'

      // Generate secure session token
      const token = await encrypt({
        id: admin.id,
        email: admin.email,
        name: admin.name || displayName || 'Admin',
        role: admin.role,
        roleDisplayName,
        is_active: true,
        permissions,
        is_super_admin: isSuperAdmin,
      })

      // Set cookie
      const cookieStore = await cookies()
      cookieStore.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      return NextResponse.json({
        success: true,
        admin: {
          id: admin.id,
          name: admin.name || displayName || 'Admin',
          email: admin.email,
          avatar_url: photoURL || admin.avatar_url,
          role: admin.role,
          roleDisplayName,
          permissions,
          is_super_admin: isSuperAdmin,
        },
      })
    }

    // 3. Case: Brand new Google user requesting access
    const insertRes = await pool.query(
      `INSERT INTO public.admins 
        (name, email, avatar_url, role, permissions, is_active, approval_status, auth_provider, password_hash, created_at, updated_at)
       VALUES 
        ($1, $2, $3, 'viewer', '{}'::jsonb, false, 'pending', 'google', NULL, NOW(), NOW())
       RETURNING id, name, email, avatar_url, role, approval_status, created_at`,
      [
        displayName?.trim() || cleanEmail.split('@')[0] || 'Employee',
        cleanEmail,
        photoURL || null,
      ]
    )

    const newRequest = insertRes.rows[0]

    return NextResponse.json(
      {
        success: false,
        pendingApproval: true,
        message: 'Your Google sign-in request has been submitted! A Super Admin will review your account and assign your role before you can access the management console.',
        user: {
          name: newRequest.name,
          email: newRequest.email,
          avatar_url: newRequest.avatar_url,
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('API /admin/auth/google Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error during Google sign-in' },
      { status: 500 }
    )
  }
}
