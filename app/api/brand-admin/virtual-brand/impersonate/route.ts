import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'
import { encryptBrandToken, BRAND_COOKIE_NAME } from '@/lib/brand-auth'
import type { BrandPayload } from '@/types/brand'

export async function GET(request: Request) {
  try {
    const admin = (await getBrandAdminFromRequest()) || (await getAdminFromRequest())
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Brand Admin or Admin session required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const brandId = searchParams.get('brandId')?.trim()
    const redirectPath = searchParams.get('redirect') || '/brand/campaigns'

    if (!brandId) {
      return NextResponse.json({ error: 'brandId parameter is required' }, { status: 400 })
    }

    // 1. Find the target brand from public.brands (by ID, slug, or name)
    const brandRes = await pool.query(
      `SELECT id, name, slug, logo_url, primary_contact_email, primary_contact_name, organization_id 
       FROM public.brands 
       WHERE id::text = $1 OR slug = $1 OR LOWER(TRIM(name)) = LOWER(TRIM($1))
       LIMIT 1`,
      [brandId]
    )

    let targetBrand: any = null

    if (brandRes.rows.length > 0) {
      targetBrand = brandRes.rows[0]
    } else {
      // Fallback 1: check if brand exists in sample_lists
      const rosterBrandRes = await pool.query(
        `SELECT brand_id, brand_name FROM public.sample_lists WHERE brand_id = $1 OR LOWER(TRIM(brand_name)) = LOWER(TRIM($1)) LIMIT 1`,
        [brandId]
      )
      if (rosterBrandRes.rows.length > 0) {
        const bName = rosterBrandRes.rows[0].brand_name
        targetBrand = {
          id: rosterBrandRes.rows[0].brand_id || `virtual-${Date.now()}`,
          name: bName,
          slug: bName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          primary_contact_email: `reviewer@${bName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
          primary_contact_name: `${bName} Brand Lead`,
        }
      } else {
        // Fallback 2: check if brand exists in campaigns table
        const campRes = await pool.query(
          `SELECT DISTINCT brand_name FROM public.campaigns WHERE brand_name ILIKE $1 LIMIT 1`,
          [`%${brandId}%`]
        )
        if (campRes.rows.length > 0) {
          targetBrand = {
            id: `virtual-${Date.now()}`,
            name: campRes.rows[0].brand_name,
            slug: campRes.rows[0].brand_name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
            primary_contact_email: `reviewer@${campRes.rows[0].brand_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
            primary_contact_name: `${campRes.rows[0].brand_name} Brand Lead`,
          }
        }
      }
    }

    if (!targetBrand) {
      return NextResponse.json({ error: `Brand '${brandId}' not found` }, { status: 404 })
    }

    // 2. Build the authentic BrandPayload
    const payload: BrandPayload = {
      id: `virtual-user-${targetBrand.id}`,
      brand_id: String(targetBrand.id),
      organization_id: targetBrand.organization_id || null,
      email: targetBrand.primary_contact_email || `reviewer@${targetBrand.slug || 'brand'}.com`,
      full_name: targetBrand.primary_contact_name || `${targetBrand.name} (Reviewer)`,
      role: 'owner',
      brand_name: targetBrand.name,
      brand_slug: targetBrand.slug || targetBrand.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
      brand_logo_url: targetBrand.logo_url || null,
      is_virtual: true,
      admin_impersonator_id: admin.id,
    }

    // 3. Encrypt into 7-day session token
    const token = await encryptBrandToken(payload, '7d')

    // 4. Construct response redirecting to targetPath with brand_token cookie set
    const redirectUrl = new URL(redirectPath, request.url)
    const response = NextResponse.redirect(redirectUrl)
    response.cookies.set(BRAND_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    })

    return response
  } catch (error: any) {
    console.error('Error in virtual-brand impersonation route:', error)
    return NextResponse.json({ error: error.message || 'Failed to switch brand session' }, { status: 500 })
  }
}
