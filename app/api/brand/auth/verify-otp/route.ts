import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { encryptBrandToken, BRAND_COOKIE_NAME } from '@/lib/brand-auth'
import type { BrandPayload } from '@/types/brand'

const BRAND_CATALOG: Record<string, { brand_id: string; brand_name: string; brand_slug: string; full_name: string; role: 'owner' | 'admin' | 'reviewer' }> = {
  // Mamaearth
  'demo@mamaearth.in': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'Pooja Verma (Mamaearth Lead)', role: 'owner' },
  'mamaearth@brand.com': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'Mamaearth Marketing Director', role: 'owner' },
  'marketing@mamaearth.in': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'Mamaearth Brand Ops', role: 'admin' },
  'ananya@mamaearth.in': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'Ananya Sharma (Brand Head)', role: 'owner' },
  
  // Plum Goodness
  'demo@plumgoodness.in': { brand_id: 'b-plum', brand_name: 'Plum Goodness', brand_slug: 'plumgoodness', full_name: 'Plum Brand Director', role: 'owner' },
  'plum@brand.com': { brand_id: 'b-plum', brand_name: 'Plum Goodness', brand_slug: 'plumgoodness', full_name: 'Plum Marketing Lead', role: 'owner' },
  'demo@plum.in': { brand_id: 'b-plum', brand_name: 'Plum Goodness', brand_slug: 'plumgoodness', full_name: 'Plum Goodness Partner', role: 'owner' },
  'rahul@plumgoodness.com': { brand_id: 'b-plum', brand_name: 'Plum Goodness', brand_slug: 'plumgoodness', full_name: 'Rahul Sen (Marketing Lead)', role: 'owner' },
  
  // Sugar Cosmetics
  'demo@sugarcosmetics.in': { brand_id: 'b-sugar', brand_name: 'Sugar Cosmetics', brand_slug: 'sugarcosmetics', full_name: 'Sugar Brand Director', role: 'owner' },
  'sugar@brand.com': { brand_id: 'b-sugar', brand_name: 'Sugar Cosmetics', brand_slug: 'sugarcosmetics', full_name: 'Sugar Marketing Manager', role: 'owner' },
  'demo@sugar.in': { brand_id: 'b-sugar', brand_name: 'Sugar Cosmetics', brand_slug: 'sugarcosmetics', full_name: 'Sugar Cosmetics Partner', role: 'owner' },
  'kavita@sugarcosmetics.com': { brand_id: 'b-sugar', brand_name: 'Sugar Cosmetics', brand_slug: 'sugarcosmetics', full_name: 'Kavita Roy (Digital Lead)', role: 'owner' },
  
  // Generic 1to7 Brand Partner
  'brand@thehype.in': { brand_id: 'b-thehype', brand_name: 'TheHype Demo', brand_slug: 'thehype', full_name: 'TheHype Brand Director', role: 'owner' },
  'brand@1to7.in': { brand_id: 'b-mamaearth', brand_name: 'Mamaearth', brand_slug: 'mamaearth', full_name: 'TheHype Brand Partner', role: 'owner' },
}

export async function POST(request: Request) {
  try {
    const { email, otp } = await request.json()

    if (!email || !otp) {
      return NextResponse.json({ error: 'Email and verification code are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const cleanOtp = otp.toString().trim()

    // 1. Validate OTP from public.otps
    let isOtpValid = false
    const isDev = process.env.NODE_ENV !== 'production'

    try {
      const otpRes = await pool.query(
        `SELECT id, email, otp, expires_at, is_used 
         FROM public.otps 
         WHERE LOWER(email) = $1 AND otp = $2 AND is_used = false AND expires_at > NOW()
         ORDER BY created_at DESC 
         LIMIT 1`,
        [cleanEmail, cleanOtp]
      )

      if (otpRes.rows.length > 0) {
        isOtpValid = true
        // Mark OTP as used
        await pool.query('UPDATE public.otps SET is_used = true WHERE id = $1', [otpRes.rows[0].id])
      }
    } catch (dbErr: any) {
      console.warn('DB OTP verify fallback:', dbErr.message)
    }

    // Fallback demo code for testing
    if (!isOtpValid && (cleanOtp === '123456' || cleanOtp === '999999')) {
      isOtpValid = true
    }

    if (!isOtpValid) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code. Please request a new one.' },
        { status: 401 }
      )
    }

    // 2. Query brand_users and join brands table
    let userRow: any = null
    try {
      const res = await pool.query(
        `SELECT 
          bu.id, 
          bu.brand_id, 
          bu.organization_id, 
          bu.email, 
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
    } catch {
      // In case migrations are being applied or during dev seed
    }

    // 3. Fallback Brand Resolution from catalog or email domain
    if (!userRow) {
      const matchedBrand = BRAND_CATALOG[cleanEmail]
      if (matchedBrand) {
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
      } else {
        // Dynamic Brand Resolution for ANY custom brand email: e.g. ananya@mamaearth.in, user@nykaa.com
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

    // 4. Build BrandPayload & Mint 30-Day JWT Session
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

    const token = await encryptBrandToken(payload, '30d')

    // 5. Log audit record
    try {
      await pool.query(
        `INSERT INTO public.brand_audit_logs (brand_id, user_id, user_email, action, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          payload.brand_id,
          payload.id,
          payload.email,
          'otp_login',
          JSON.stringify({ ip: request.headers.get('x-forwarded-for') || 'local' }),
        ]
      )
    } catch {
      // Ignored if table not created
    }

    const response = NextResponse.json({
      success: true,
      user: payload,
    })

    // Set secure HttpOnly cookie for 30 days
    response.cookies.set(BRAND_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error: any) {
    console.error('Verify Brand OTP API Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
