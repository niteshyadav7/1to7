import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { cookies } from 'next/headers'
import {
  evaluateBrandAdminAccess,
  encryptBrandAdminToken,
  BRAND_ADMIN_COOKIE_NAME,
} from '@/lib/brand-admin-auth'
import { MASTER_SUPERADMIN_EMAIL, isMasterSuperAdmin } from '@/types/brand-admin'

export async function POST(request: Request) {
  try {
    const { email, displayName, photoURL } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required for Google Sign-In' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const isMasterSuper = isMasterSuperAdmin(cleanEmail)

    // 1. Query if admin record exists
    let adminRecord: any = null
    try {
      const res = await pool.query('SELECT * FROM public.admins WHERE LOWER(email) = $1', [cleanEmail])
      adminRecord = res.rows[0]
    } catch (dbErr) {
      console.warn('DB query in brand-admin/auth/google failed, using fallback:', dbErr)
    }

    // 2. If user is superadmin@gmail.com, unconditionally guarantee master access
    if (isMasterSuper) {
      const superAdminData = {
        id: adminRecord?.id || 'superadmin-master-id',
        email: cleanEmail,
        name: adminRecord?.name || displayName || 'Super Admin',
        avatar_url: photoURL || adminRecord?.avatar_url || null,
        brand_admin_role: 'brand_superadmin' as const,
        brand_admin_status: 'approved' as const,
        is_super_admin: true,
      }

      // Sync to DB if pool is available
      try {
        if (!adminRecord) {
          await pool.query(
            `INSERT INTO public.admins 
              (name, email, avatar_url, role, brand_admin_access, brand_admin_role, brand_admin_status, auth_provider, created_at, updated_at)
             VALUES 
              ($1, $2, $3, 'super_admin', true, 'brand_superadmin', 'approved', 'google', NOW(), NOW())
             ON CONFLICT (email) DO UPDATE SET 
              brand_admin_access = true, brand_admin_role = 'brand_superadmin', brand_admin_status = 'approved'`,
            [superAdminData.name, cleanEmail, photoURL || null]
          )
        } else if (!adminRecord.brand_admin_access || adminRecord.brand_admin_status !== 'approved') {
          await pool.query(
            `UPDATE public.admins 
             SET brand_admin_access = true, brand_admin_role = 'brand_superadmin', brand_admin_status = 'approved'
             WHERE id = $1`,
            [adminRecord.id]
          )
        }
      } catch (e) {
        console.warn('Could not sync superadmin row to DB:', e)
      }

      const token = await encryptBrandAdminToken(superAdminData)
      const cookieStore = await cookies()
      cookieStore.set(BRAND_ADMIN_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      })

      return NextResponse.json({
        success: true,
        user: superAdminData,
        message: 'Welcome to Brand Operations Admin, Super Admin!',
      })
    }

    // 3. For any other user, evaluate RBAC
    if (adminRecord) {
      const evaluation = evaluateBrandAdminAccess(adminRecord)

      if (evaluation.status === 'rejected') {
        return NextResponse.json(
          {
            error:
              'Access to the Brand Admin Portal was rejected by an administrator. Please contact superadmin@gmail.com if you believe this is an error.',
          },
          { status: 403 }
        )
      }

      if (!evaluation.allowed) {
        // User exists in influencer admin, but has NOT been approved for brand admin!
        return NextResponse.json(
          {
            error:
              'Brand Operations Access Restricted. Access to this portal requires explicit authorization from Super Admin (superadmin@gmail.com).',
            pendingApproval: true,
            email: cleanEmail,
            name: adminRecord.name || displayName,
          },
          { status: 403 }
        )
      }

      // Approved brand admin user
      const userData = {
        id: adminRecord.id,
        email: cleanEmail,
        name: adminRecord.name || displayName || 'Brand Admin Staff',
        avatar_url: photoURL || adminRecord.avatar_url || null,
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
    }

    // 4. Brand new user requesting access
    try {
      await pool.query(
        `INSERT INTO public.admins 
          (name, email, avatar_url, role, brand_admin_access, brand_admin_role, brand_admin_status, auth_provider, approval_status, created_at, updated_at)
         VALUES 
          ($1, $2, $3, 'viewer', false, 'viewer', 'pending', 'google', 'pending', NOW(), NOW())
         ON CONFLICT (email) DO NOTHING`,
        [displayName || cleanEmail.split('@')[0], cleanEmail, photoURL || null]
      )
    } catch (insertErr) {
      console.warn('Could not record pending user in DB:', insertErr)
    }

    return NextResponse.json(
      {
        pendingApproval: true,
        message:
          'Your Google sign-in request has been received! Access to the Brand Operations Admin is restricted. superadmin@gmail.com has been notified to review and assign your RBAC permissions.',
        email: cleanEmail,
        name: displayName || cleanEmail.split('@')[0],
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('API /brand-admin/auth/google error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Google authentication failed' },
      { status: 500 }
    )
  }
}
