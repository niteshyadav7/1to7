import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

// GET /api/brand-admin/brands - List all brands directly from PostgreSQL
export async function GET() {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const query = `
      SELECT 
        b.id,
        b.name,
        b.slug,
        b.industry,
        b.logo_url,
        b.primary_contact_name,
        b.primary_contact_email,
        b.primary_contact_phone,
        b.is_active,
        b.sla_review_hours,
        b.created_at,
        COALESCE(adm.name, 'Pooja Verma (KAM)') as assigned_kam,
        COALESCE(bu.email, b.primary_contact_email) as email,
        COALESCE(bu.phone, b.primary_contact_phone) as phone,
        COALESCE(bu.full_name, b.primary_contact_name) as primary_contact,
        (SELECT COUNT(*)::int FROM public.campaigns c WHERE c.brand_id = b.id) as active_campaigns,
        (SELECT COUNT(*)::int FROM public.applications a 
         JOIN public.campaigns c ON a.campaign_id = c.id 
         WHERE c.brand_id = b.id AND a.brand_review_status = 'pending_brand_review') as pending_reviews
      FROM public.brands b
      LEFT JOIN public.admins adm ON b.assigned_1to7_kam_id = adm.id
      LEFT JOIN LATERAL (
        SELECT email, phone, full_name 
        FROM public.brand_users bu 
        WHERE bu.brand_id = b.id 
        ORDER BY bu.created_at ASC 
        LIMIT 1
      ) bu ON true
      ORDER BY b.created_at DESC;
    `

    const res = await pool.query(query)

    const formattedBrands = (res.rows || []).map((row: any) => {
      const initials = (row.name || 'BR').substring(0, 2).toUpperCase()
      return {
        id: row.id,
        name: row.name,
        slug: row.slug,
        industry: row.industry || 'Consumer Goods',
        initials,
        color: 'from-amber-500 to-yellow-600',
        assignedKam: row.assigned_kam || 'Pooja Verma (KAM)',
        primaryContact: row.primary_contact || row.primary_contact_name || 'Brand POC',
        email: row.email || row.primary_contact_email || '',
        phone: row.phone || row.primary_contact_phone || undefined,
        activeCampaigns: row.active_campaigns || 0,
        pendingReviews: row.pending_reviews || 0,
        status: row.is_active ? 'active' : 'paused',
        createdAt: row.created_at,
      }
    })

    return NextResponse.json({ success: true, brands: formattedBrands })
  } catch (error: any) {
    console.error('Error fetching brands from DB:', error)
    return NextResponse.json({ success: true, brands: [] })
  }
}

// POST /api/brand-admin/brands - Create a new Brand Workspace in PostgreSQL
export async function POST(request: Request) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const body = await request.json()
    const { name, industry, primaryContact, email, phone, password, assignedKam } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Brand name and login email are required' }, { status: 400 })
    }

    const cleanEmail = email.toLowerCase().trim()
    const baseSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'brand'
    const slug = `${baseSlug}-${Date.now().toString(36)}`
    const rawPassword = (password || 'brand123').trim()
    const passwordHash = await bcrypt.hash(rawPassword, 10)

    // 1. Insert into public.brands
    const brandInsertRes = await pool.query(
      `INSERT INTO public.brands (
        name,
        slug,
        industry,
        primary_contact_name,
        primary_contact_email,
        primary_contact_phone,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, true)
      RETURNING *`,
      [
        name.trim(),
        slug,
        industry?.trim() || 'Consumer Goods',
        primaryContact?.trim() || 'Brand POC',
        cleanEmail,
        phone?.trim() || null,
      ]
    )

    const newBrand = brandInsertRes.rows[0]

    // 2. Insert into public.brand_users
    await pool.query(
      `INSERT INTO public.brand_users (
        brand_id,
        email,
        password_hash,
        full_name,
        phone,
        role,
        is_active
      ) VALUES ($1, $2, $3, $4, $5, 'owner', true)
      ON CONFLICT (email) DO UPDATE 
      SET brand_id = EXCLUDED.brand_id, 
          password_hash = EXCLUDED.password_hash,
          full_name = EXCLUDED.full_name,
          is_active = true`,
      [
        newBrand.id,
        cleanEmail,
        passwordHash,
        primaryContact?.trim() || 'Brand Director',
        phone?.trim() || null,
      ]
    )

    const initials = name.substring(0, 2).toUpperCase()

    return NextResponse.json({
      success: true,
      brand: {
        id: newBrand.id,
        name: newBrand.name,
        slug: newBrand.slug,
        industry: newBrand.industry,
        initials,
        color: 'from-amber-500 to-yellow-600',
        assignedKam: assignedKam || 'Pooja Verma (KAM)',
        primaryContact: newBrand.primary_contact_name,
        email: cleanEmail,
        phone: newBrand.primary_contact_phone || undefined,
        password: rawPassword,
        activeCampaigns: 0,
        pendingReviews: 0,
        status: 'active',
        createdAt: newBrand.created_at,
      },
    })
  } catch (error: any) {
    console.error('Error creating brand workspace in DB:', error)
    return NextResponse.json({ error: error.message || 'Failed to create brand workspace' }, { status: 500 })
  }
}

// PATCH /api/brand-admin/brands - Update brand status or password in PostgreSQL
export async function PATCH(request: Request) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const body = await request.json()
    const { id, status, password } = body

    if (!id) {
      return NextResponse.json({ error: 'Brand id is required' }, { status: 400 })
    }

    // Status toggle
    if (status !== undefined) {
      const isActive = status === 'active'
      await pool.query(`UPDATE public.brands SET is_active = $1, updated_at = NOW() WHERE id = $2`, [isActive, id])
      await pool.query(`UPDATE public.brand_users SET is_active = $1, updated_at = NOW() WHERE brand_id = $2`, [isActive, id])
    }

    // Password update
    if (password) {
      const rawPassword = password.trim()
      const passwordHash = await bcrypt.hash(rawPassword, 10)
      await pool.query(
        `UPDATE public.brand_users SET password_hash = $1, updated_at = NOW() WHERE brand_id = $2`,
        [passwordHash, id]
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error updating brand in DB:', error)
    return NextResponse.json({ error: error.message || 'Failed to update brand' }, { status: 500 })
  }
}

// DELETE /api/brand-admin/brands - Delete brand workspace from PostgreSQL (cascades to brand_users)
export async function DELETE(request: Request) {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (id) {
      // Single delete
      await pool.query(`DELETE FROM public.brands WHERE id = $1`, [id])
      return NextResponse.json({ success: true, deleted: [id] })
    }

    // Bulk delete via request body
    const body = await request.json().catch(() => ({}))
    const ids = body.ids

    if (Array.isArray(ids) && ids.length > 0) {
      await pool.query(`DELETE FROM public.brands WHERE id = ANY($1)`, [ids])
      return NextResponse.json({ success: true, deleted: ids })
    }

    return NextResponse.json({ error: 'Brand id or ids array required' }, { status: 400 })
  } catch (error: any) {
    console.error('Error deleting brand from DB:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete brand' }, { status: 500 })
  }
}
