import { NextResponse } from 'next/server'
import pool, { ensurePocMigration } from '@/lib/db'
import {
  verifyBrandReviewToken,
  encryptBrandToken,
  BRAND_COOKIE_NAME,
} from '@/lib/brand-auth'
import type { BrandPayload } from '@/types/brand'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params
    const trimmedCode = (code || '').trim()

    if (!trimmedCode) {
      return NextResponse.redirect(new URL('/brand/login', request.url))
    }

    await ensurePocMigration()

    // 1. Fetch link record from DB
    const result = await pool.query(
      `SELECT * FROM public.brand_magic_links WHERE code = $1 LIMIT 1`,
      [trimmedCode]
    )

    if (result.rows.length === 0) {
      const errorMsg = 'This review link does not exist or has been removed. Please ask your TheHype Account Manager for a fresh link.'
      return NextResponse.redirect(new URL(`/brand/review?error=${encodeURIComponent(errorMsg)}`, request.url))
    }

    const link = result.rows[0]

    // 2. Check if active
    if (link.is_active === false) {
      const errorMsg = 'This review link has been deactivated by the agency administrator.'
      return NextResponse.redirect(new URL(`/brand/review?error=${encodeURIComponent(errorMsg)}`, request.url))
    }

    // 3. Check expiration
    if (new Date(link.expires_at) < new Date()) {
      const errorMsg = 'This review link has expired. Please ask your TheHype Account Manager for a fresh link.'
      return NextResponse.redirect(new URL(`/brand/review?error=${encodeURIComponent(errorMsg)}`, request.url))
    }

    // 4. Update click metrics asynchronously
    pool.query(
      `UPDATE public.brand_magic_links 
       SET clicks_count = COALESCE(clicks_count, 0) + 1, last_accessed_at = NOW() 
       WHERE id = $1`,
      [link.id]
    ).catch(() => {})

    // 5. Verify the token or create brand session
    let tokenPayload: any = null
    if (link.token) {
      tokenPayload = await verifyBrandReviewToken(link.token)
    }

    const brandPayload: BrandPayload = {
      id: tokenPayload?.id || `brand-user-${link.brand_slug}`,
      brand_id: link.brand_id || tokenPayload?.brand_id,
      organization_id: tokenPayload?.organization_id || null,
      email: link.contact_email || tokenPayload?.email || `reviewer@${link.brand_slug}.com`,
      full_name: link.contact_name || tokenPayload?.full_name || `${link.brand_name} Brand Partner`,
      role: 'reviewer',
      brand_name: link.brand_name || tokenPayload?.brand_name || 'Brand Workspace',
      brand_slug: link.brand_slug || tokenPayload?.brand_slug || 'brand',
      brand_logo_url: tokenPayload?.brand_logo_url || null,
    }

    // 6. Generate 30-day session JWT
    const sessionToken = await encryptBrandToken(brandPayload, '30d')

    // 7. Determine target redirect URL
    const targetDest = (link.target_page || link.destination || tokenPayload?.target_page || tokenPayload?.destination || '').toLowerCase().trim()
    const targetBatch = link.batch_name || tokenPayload?.batch_name

    let redirectUrl = '/brand/campaigns'

    if (targetDest === 'dispatch' || targetDest.includes('dispatch')) {
      redirectUrl = '/brand/dispatch'
    } else if (targetDest === 'creators' || targetDest === 'campaigns' || targetDest.includes('campaign')) {
      redirectUrl = '/brand/campaigns'
    } else if (targetDest === 'sample_rosters' || targetDest === 'rosters' || targetDest.includes('roster') || targetDest.includes('pitch')) {
      redirectUrl = targetBatch ? `/brand/sample-rosters?batch=${encodeURIComponent(targetBatch)}` : '/brand/sample-rosters'
    } else if (link.destination && link.destination.startsWith('/')) {
      redirectUrl = link.destination
    } else if (targetBatch) {
      redirectUrl = `/brand/sample-rosters?batch=${encodeURIComponent(targetBatch)}`
    } else {
      // Smart Auto-detect: check dispatch first, then creators, then rosters
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

    // 8. Log audit record (non-blocking)
    try {
      await pool.query(
        `INSERT INTO public.brand_audit_logs (brand_id, user_id, user_email, action, metadata)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          brandPayload.brand_id,
          brandPayload.id,
          brandPayload.email,
          'magic_link_short_url_access',
          JSON.stringify({
            code: trimmedCode,
            batch_name: targetBatch || null,
            target_page: targetDest,
            ip: request.headers.get('x-forwarded-for') || 'local',
            user_agent: request.headers.get('user-agent') || 'unknown',
          }),
        ]
      )
    } catch {
      // Non-fatal
    }

    // 9. Redirect with HttpOnly session cookie
    const redirectResponse = NextResponse.redirect(new URL(redirectUrl, request.url), 302)
    redirectResponse.cookies.set(BRAND_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60, // 30 days
    })

    return redirectResponse
  } catch (error: any) {
    console.error('Short Link Redirection Error:', error)
    return NextResponse.redirect(
      new URL(`/brand/review?error=${encodeURIComponent('Failed to authenticate this link. Please try again.')}`, request.url)
    )
  }
}

