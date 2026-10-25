import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import {
  evaluateBrandAdminAccess,
  encryptBrandAdminToken,
  BRAND_ADMIN_COOKIE_NAME,
} from '@/lib/brand-admin-auth'
import { isMasterSuperAdmin, MASTER_SUPERADMIN_EMAIL } from '@/types/brand-admin'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const isMasterSuper = isMasterSuperAdmin(cleanEmail)

    // Master Super Admin bypass for superadmin@gmail.com
    // In dev or live, if password is superadmin123 or matches DB hash
    let adminRecord: any = null
    try {
      const res = await pool.query('SELECT * FROM public.admins WHERE LOWER(email) = $1', [cleanEmail])
      adminRecord = res.rows[0]
    } catch (e) {
      console.warn('DB query in brand-admin/auth/login failed:', e)
    }

    if (isMasterSuper) {
      let passwordValid = false

      if (adminRecord?.password_hash) {
        passwordValid = await bcrypt.compare(password, adminRecord.password_hash)
      }

      // Allow master dev password fallback if hash doesn't match or table is empty
      if (!passwordValid && (password === 'superadmin123' || password === 'admin123' || process.env.NODE_ENV !== 'production')) {
        passwordValid = true
      }

      if (!passwordValid) {
        return NextResponse.json({ error: 'Invalid password for Super Admin' }, { status: 401 })
      }

      const superAdminData = {
        id: adminRecord?.id || 'superadmin-master-id',
        email: cleanEmail,
        name: adminRecord?.name || 'Super Admin',
        avatar_url: adminRecord?.avatar_url || null,
        brand_admin_role: 'brand_superadmin' as const,
        brand_admin_status: 'approved' as const,
        is_super_admin: true,
      }

      const token = await encryptBrandAdminToken(superAdminData)
      const cookieStore = await cookies()
      cookieStore.set(BRAND_ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })

      return NextResponse.json({
        success: true,
        user: superAdminData,
        message: 'Welcome back Super Admin!',
      })
    }

    // Standard Staff User verification
    if (!adminRecord) {
      return NextResponse.json({ error: 'Account not found. Please contact superadmin@gmail.com.' }, { status: 404 })
    }

    if (!adminRecord.password_hash) {
      return NextResponse.json(
        { error: 'This account is configured for Google Sign-In. Please sign in with Google.' },
        { status: 400 }
      )
    }

    const isMatch = await bcrypt.compare(password, adminRecord.password_hash)
    if (!isMatch) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    // Evaluate Brand Admin RBAC
    const evaluation = evaluateBrandAdminAccess(adminRecord)
    if (!evaluation.allowed) {
      return NextResponse.json(
        {
          error:
            'Brand Operations Access Restricted. Access to this portal requires explicit authorization from Super Admin (superadmin@gmail.com).',
          pendingApproval: evaluation.status === 'pending',
        },
        { status: 403 }
      )
    }

    const userData = {
      id: adminRecord.id,
      email: cleanEmail,
      name: adminRecord.name || 'Brand Admin Staff',
      avatar_url: adminRecord.avatar_url || null,
      brand_admin_role: evaluation.role,
      brand_admin_status: 'approved' as const,
      is_super_admin: evaluation.isSuperAdmin,
    }

    const token = await encryptBrandAdminToken(userData)
    const cookieStore = await cookies()
    cookieStore.set(BRAND_ADMIN_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    })

    return NextResponse.json({
      success: true,
      user: userData,
      message: `Welcome back, ${userData.name}!`,
    })
  } catch (error) {
    console.error('API /brand-admin/auth/login error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal login error' },
      { status: 500 }
    )
  }
}
