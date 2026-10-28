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

    // 2. Fallback Brand Mock Profiles for seamless login to any brand workspace
    if (!userRow) {
      const isDemoPass = password === 'brand123' || password === 'admin123' || password === 'password123'
      
      const BRAND_CATALOG: Record<string, { brand_id: string; brand_name: string; brand_slug: string; full_name: string; role: 'owner' | 'admin' | 'reviewer' }> = {
        // Mamaearth
        'demo@mamaearth.in': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'Pooja Verma (Mamaearth Lead)', role: 'owner' },
        'mamaearth@brand.com': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'Mamaearth Marketing Director', role: 'owner' },
        'marketing@mamaearth.in': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'Mamaearth Brand Ops', role: 'admin' },
        
        // Plum Goodness
        'demo@plumgoodness.in': { brand_id: 'b-plum', brand_name: 'Plum Goodness', brand_slug: 'plumgoodness', full_name: 'Plum Brand Director', role: 'owner' },
        'plum@brand.com': { brand_id: 'b-plum', brand_name: 'Plum Goodness', brand_slug: 'plumgoodness', full_name: 'Plum Marketing Lead', role: 'owner' },
        'demo@plum.in': { brand_id: 'b-plum', brand_name: 'Plum Goodness', brand_slug: 'plumgoodness', full_name: 'Plum Goodness Partner', role: 'owner' },
        
        // Sugar Cosmetics
        'demo@sugarcosmetics.in': { brand_id: 'b-sugar', brand_name: 'Sugar Cosmetics', brand_slug: 'sugarcosmetics', full_name: 'Sugar Brand Director', role: 'owner' },
        'sugar@brand.com': { brand_id: 'b-sugar', brand_name: 'Sugar Cosmetics', brand_slug: 'sugarcosmetics', full_name: 'Sugar Marketing Manager', role: 'owner' },
        'demo@sugar.in': { brand_id: 'b-sugar', brand_name: 'Sugar Cosmetics', brand_slug: 'sugarcosmetics', full_name: 'Sugar Cosmetics Partner', role: 'owner' },
        
        // Generic 1to7 Brand Partner
        'brand@thehype.in': { brand_id: 'b-thehype', brand_name: 'TheHype Demo', brand_slug: 'thehype', full_name: 'TheHype Brand Director', role: 'owner' },
        'brand@1to7.in': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'TheHype Brand Partner', role: 'owner' },
      }

      const matchedBrand = BRAND_CATALOG[cleanEmail]
      if (matchedBrand) {
        if (!isDemoPass) {
          return NextResponse.json({ error: 'Invalid brand credentials. Use brand123' }, { status: 401 })
        }
        userRow = {
          id: `brand-user-${matchedBrand.brand_slug}`,
          brand_id: matchedBrand.brand_id,
          organization_id: null,
          email: cleanEmail,
          full_name: matchedBrand.full_name,
          role: matchedBrand.role,
          is_active: true,
          brand_name: matchedBrand.brand_name,
          brand_slug: matchedBrand.brand_slug,
          brand_logo_url: null,
        }
      } else if (cleanEmail.includes('@') && isDemoPass) {
        // Dynamic Brand Resolution for ANY custom brand email: e.g. nykaa@brand.com, wow@brand.com
        const prefix = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9]/g, '')
        const domain = cleanEmail.split('@')[1].split('.')[0].replace(/[^a-zA-Z0-9]/g, '')
        const brandKey = domain !== 'brand' && domain !== 'gmail' && domain !== 'company' && domain !== '1to7' ? domain : prefix
        const formattedBrandName = brandKey.charAt(0).toUpperCase() + brandKey.slice(1)
        
        userRow = {
          id: `brand-user-${brandKey.toLowerCase()}`,
          brand_id: `b-${brandKey.toLowerCase()}`,
          organization_id: null,
          email: cleanEmail,
          full_name: `${formattedBrandName} Director`,
          role: 'owner',
          is_active: true,
          brand_name: formattedBrandName,
          brand_slug: brandKey.toLowerCase(),
          brand_logo_url: null,
        }
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
      return NextResponse.json({ error: 'Brand account is suspended or inactive. Contact TheHype support.' }, { status: 403 })
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
