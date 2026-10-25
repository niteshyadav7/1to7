import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/db'
import { encryptBrandToken, BRAND_COOKIE_NAME } from '@/lib/brand-auth'
import type { BrandPayload } from '@/types/brand'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()

    // 1. Query brand_users and join brands table
    let userRow: any = null
    try {
      const res = await pool.query(
        `SELECT 
          bu.id, 
          bu.brand_id, 
          bu.organization_id, 
          bu.email, 
          bu.password_hash, 
          bu.full_name, 
          bu.role, 
          bu.is_active,
          b.name as brand_name,
          b.slug as brand_slug,
          b.logo_url as brand_logo_url
        FROM public.brand_users bu
        JOIN public.brands b ON bu.brand_id = b.id
        WHERE LOWER(bu.email) = $1
        LIMIT 1`,
        [cleanEmail]
      )
      if (res.rows.length > 0) {
        userRow = res.rows[0]
      }
    } catch (dbErr: any) {
      // In case migrations are being applied or during dev seed
      console.warn('Brand login DB query fallback:', dbErr.message)
    }

    // 2. Fallback Mock User for seamless dev preview if DB record not yet inserted
    if (!userRow && (cleanEmail === 'demo@mamaearth.in' || cleanEmail === 'brand@1to7.in')) {
      const isDemoPass = password === 'brand123' || password === 'admin123'
      if (!isDemoPass) {
        return NextResponse.json({ error: 'Invalid brand credentials' }, { status: 401 })
      }
      userRow = {
        id: 'brand-demo-user-1',
        brand_id: 'brand-demo-id-101',
        organization_id: null,
        email: cleanEmail,
        full_name: 'Brand Marketing Manager',
        role: 'owner',
        is_active: true,
        brand_name: 'Mamaearth',
        brand_slug: 'mamaearth',
        brand_logo_url: null,
      }
    }

    if (!userRow) {
      return NextResponse.json({ error: 'Invalid brand credentials or account not found' }, { status: 401 })
    }

    // 3. Verify Password (if real user with password_hash)
    if (userRow.password_hash) {
      const isValid = await bcrypt.compare(password, userRow.password_hash)
      if (!isValid) {
        return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
      }
    }

    if (!userRow.is_active) {
      return NextResponse.json({ error: 'Brand account is suspended or inactive. Contact 1to7 support.' }, { status: 403 })
    }

    // 4. Update last_login timestamp and log audit (non-blocking)
    try {
      if (userRow.id !== 'brand-demo-user-1') {
        await pool.query('UPDATE public.brand_users SET last_login = NOW() WHERE id = $1', [userRow.id])
        await pool.query(
          `INSERT INTO public.brand_audit_logs (brand_id, user_id, user_email, action, metadata)
           VALUES ($1, $2, $3, $4, $5)`,
          [userRow.brand_id, userRow.id, userRow.email, 'login', JSON.stringify({ ip: request.headers.get('x-forwarded-for') || 'local' })]
        )
      }
    } catch (logErr) {
      console.error('Failed to log brand login audit:', logErr)
    }

    // 5. Generate Brand JWT Token
    const payload: BrandPayload = {
      id: userRow.id,
      brand_id: userRow.brand_id,
      organization_id: userRow.organization_id || null,
      email: userRow.email,
      full_name: userRow.full_name,
      role: userRow.role || 'reviewer',
      brand_name: userRow.brand_name || 'Brand Workspace',
      brand_slug: userRow.brand_slug || 'brand',
      brand_logo_url: userRow.brand_logo_url || null,
    }

    const token = await encryptBrandToken(payload)

    const response = NextResponse.json({
      success: true,
      user: payload,
    })

    // Set secure HttpOnly cookie for 7 days
    response.cookies.set(BRAND_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    })

    return response
  } catch (error: any) {
    console.error('Brand Login API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
