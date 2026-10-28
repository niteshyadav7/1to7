import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import {
  verifyBrandReviewToken,
  encryptBrandToken,
  BRAND_COOKIE_NAME,
} from '@/lib/brand-auth'
import type { BrandPayload } from '@/types/brand'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const token = body.token?.trim()

    if (!token) {
      return NextResponse.json({ error: 'Review token is required' }, { status: 400 })
    }

    // 1. Verify cryptographic signature & expiration of review token
    const tokenPayload = await verifyBrandReviewToken(token)
    if (!tokenPayload || !tokenPayload.brand_id) {
      return NextResponse.json(
        { error: 'This review link is invalid or has expired. Please contact your TheHype Account Manager for a fresh link.' },
        { status: 401 }
      )
    }

    // 2. Build authenticated BrandPayload
    const brandPayload: BrandPayload = {
      id: tokenPayload.id || `brand-user-${tokenPayload.brand_slug}`,
      brand_id: tokenPayload.brand_id,
      organization_id: tokenPayload.organization_id || null,
      email: tokenPayload.email || `reviewer@${tokenPayload.brand_slug}.com`,
      full_name: tokenPayload.full_name || `${tokenPayload.brand_name} Brand Partner`,
      role: tokenPayload.role || 'reviewer',
      brand_name: tokenPayload.brand_name || 'Brand Workspace',
      brand_slug: tokenPayload.brand_slug || 'brand',
      brand_logo_url: tokenPayload.brand_logo_url || null,
    }

    // 3. Generate 30-day session JWT
    const sessionToken = await encryptBrandToken(brandPayload, '30d')

    // 4. Log audit record (non-blocking)
    try {
      await pool.query(
        `INSERT INTO public.brand_audit_logs (brand_id, user_id, user_email, action, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          brandPayload.brand_id,
          brandPayload.id,
          brandPayload.email,
          'magic_link_review_access',
          JSON.stringify({
            batch_name: tokenPayload.batch_name || body.batch || null,
            campaign_id: tokenPayload.campaign_id || null,
            ip: request.headers.get('x-forwarded-for') || 'local',
            user_agent: request.headers.get('user-agent') || 'unknown',
          }),
        ]
      )
    } catch {
      // In case table or migrations are pending
    }

    // 5. Determine target redirect URL
    const targetBatch = body.batch || tokenPayload.batch_name
    let redirectUrl = '/brand/sample-rosters'
    if (targetBatch) {
      redirectUrl = `/brand/sample-rosters?batch=${encodeURIComponent(targetBatch)}`
    } else if (tokenPayload.campaign_id) {
      redirectUrl = `/brand/campaigns`
    }

    const response = NextResponse.json({
      success: true,
      user: brandPayload,
      redirectUrl,
      batch_name: targetBatch || null,
    })

    // Set secure HttpOnly session cookie
    response.cookies.set(BRAND_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return response
  } catch (error: any) {
    console.error('Verify Review Token Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to authenticate review link' },
      { status: 500 }
    )
  }
}
