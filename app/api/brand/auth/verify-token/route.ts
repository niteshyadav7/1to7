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
    const targetDest = (body.dest || body.destination || tokenPayload.target_page || tokenPayload.destination || '').toLowerCase().trim()

    let redirectUrl = '/brand/campaigns'

    if (targetDest === 'dispatch' || targetDest.includes('dispatch')) {
      redirectUrl = '/brand/dispatch'
    } else if (targetDest === 'creators' || targetDest === 'campaigns' || targetDest.includes('campaign')) {
      redirectUrl = '/brand/campaigns'
    } else if (targetDest === 'sample_rosters' || targetDest === 'rosters' || targetDest.includes('roster') || targetDest.includes('pitch')) {
      redirectUrl = targetBatch ? `/brand/sample-rosters?batch=${encodeURIComponent(targetBatch)}` : '/brand/sample-rosters'
    } else if (targetDest.startsWith('/')) {
      redirectUrl = targetDest
    } else if (targetBatch) {
      redirectUrl = `/brand/sample-rosters?batch=${encodeURIComponent(targetBatch)}`
    } else if (tokenPayload.campaign_id) {
      redirectUrl = `/brand/campaigns`
    } else {
      // 6. Smart Auto-Detect: land on the tab where the brand actually has live records
      try {
        const dispatchCheck = await pool.query(
          `SELECT 1 FROM public.applications a
           JOIN public.campaigns c ON a.campaign_id = c.id
           WHERE (
             COALESCE((a.form_data->'brand_dispatch'->>'is_released')::boolean, false) = true
             OR (
               (a.status = 'Approved'::application_status OR a.brand_review_status = 'brand_approved')
               AND COALESCE((a.form_data->'brand_curation'->>'is_finalized')::boolean, false) = true
               AND a.address_status = 'Approved'
             )
           ) AND (
             c.brand_id = $1
             OR LOWER(TRIM(COALESCE(c.brand_name, ''))) = LOWER(TRIM($2))
             OR LOWER(TRIM(COALESCE(a.form_data->'brand_dispatch'->>'target_brand', ''))) = LOWER(TRIM($2))
             OR LOWER(TRIM(COALESCE(a.form_data->'sent_to_brand'->>'target_brand', ''))) = LOWER(TRIM($2))
           ) LIMIT 1`,
          [brandPayload.brand_id, brandPayload.brand_name || '']
        )
        if (dispatchCheck.rows.length > 0) {
          redirectUrl = '/brand/dispatch'
        } else {
          const creatorsCheck = await pool.query(
            `SELECT 1 FROM public.applications a
             JOIN public.campaigns c ON a.campaign_id = c.id
             WHERE (a.brand_review_status IS NOT NULL AND a.brand_review_status != 'unpitched')
               AND (c.brand_id = $1 OR LOWER(TRIM(COALESCE(c.brand_name, ''))) = LOWER(TRIM($2)))
             LIMIT 1`,
            [brandPayload.brand_id, brandPayload.brand_name || '']
          )
          if (creatorsCheck.rows.length > 0) {
            redirectUrl = '/brand/campaigns'
          } else {
            const rosterCheck = await pool.query(
              `SELECT 1 FROM public.sample_shared_lists WHERE brand_id = $1 OR LOWER(TRIM(client_brand_name)) = LOWER(TRIM($2)) LIMIT 1`,
              [brandPayload.brand_id, brandPayload.brand_name || '']
            )
            redirectUrl = rosterCheck.rows.length > 0 ? '/brand/sample-rosters' : '/brand/campaigns'
          }
        }
      } catch {
        redirectUrl = '/brand/campaigns'
      }
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
