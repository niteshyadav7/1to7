import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import bcrypt from 'bcryptjs'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function POST() {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    // 1. Fetch available admins to assign as real KAMs
    const adminsRes = await pool.query(`
      SELECT id, name, email, COALESCE(brand_admin_role, 'viewer') as brand_admin_role
      FROM public.admins
      ORDER BY 
        CASE 
          WHEN brand_admin_role = 'brand_superadmin' THEN 0 
          WHEN brand_admin_role = 'kam_lead' THEN 1
          WHEN brand_admin_role = 'brand_ops' THEN 2
          ELSE 3
        END,
        name ASC
    `)

    const admins = adminsRes.rows
    const superAdmin = admins.find((a: any) => a.email === 'superadmin@gmail.com') || admins[0]
    const kamLead = admins.find((a: any) => a.brand_admin_role === 'kam_lead') || superAdmin
    const brandOps = admins.find((a: any) => a.brand_admin_role === 'brand_ops') || superAdmin

    const defaultPasswordHash = await bcrypt.hash('brand123', 10)

    const SEED_BRANDS = [
      {
        name: 'Mamaearth',
        slug: 'mamaearth',
        industry: 'Beauty & Skincare',
        primaryContactName: 'Ananya Sharma (Brand Head)',
        primaryContactEmail: 'ananya@mamaearth.in',
        loginEmails: ['ananya@mamaearth.in', 'demo@mamaearth.in'],
        phone: '+91 98765 43210',
        assignedKamId: kamLead?.id || superAdmin?.id,
      },
      {
        name: 'Plum Goodness',
        slug: 'plum-goodness',
        industry: '100% Vegan Beauty',
        primaryContactName: 'Rahul Sen (Marketing Lead)',
        primaryContactEmail: 'rahul@plumgoodness.com',
        loginEmails: ['rahul@plumgoodness.com', 'demo@plumgoodness.in'],
        phone: '+91 98111 22334',
        assignedKamId: brandOps?.id || superAdmin?.id,
      },
      {
        name: 'Sugar Cosmetics',
        slug: 'sugar-cosmetics',
        industry: 'Color Cosmetics',
        primaryContactName: 'Kavita Roy (Digital Lead)',
        primaryContactEmail: 'kavita@sugarcosmetics.com',
        loginEmails: ['kavita@sugarcosmetics.com', 'demo@sugarcosmetics.in'],
        phone: '+91 98222 33445',
        assignedKamId: superAdmin?.id,
      },
      {
        name: 'Minimalist Skincare',
        slug: 'minimalist-skincare',
        industry: 'Active Skincare',
        primaryContactName: 'Mohit Yadav (Brand Director)',
        primaryContactEmail: 'contact@beminimalist.co',
        loginEmails: ['contact@beminimalist.co'],
        phone: '+91 99887 76655',
        assignedKamId: kamLead?.id || superAdmin?.id,
      },
    ]

    for (const b of SEED_BRANDS) {
      const brandRes = await pool.query(
        `INSERT INTO public.brands (
          name, slug, industry, primary_contact_name, primary_contact_email,
          primary_contact_phone, assigned_1to7_kam_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          industry = EXCLUDED.industry,
          primary_contact_name = EXCLUDED.primary_contact_name,
          primary_contact_email = EXCLUDED.primary_contact_email,
          primary_contact_phone = EXCLUDED.primary_contact_phone,
          assigned_1to7_kam_id = EXCLUDED.assigned_1to7_kam_id,
          is_active = true
        RETURNING id`,
        [
          b.name,
          b.slug,
          b.industry,
          b.primaryContactName,
          b.primaryContactEmail,
          b.phone,
          b.assignedKamId,
        ]
      )

      const brandId = brandRes.rows[0].id

      for (const email of b.loginEmails) {
        await pool.query(
          `INSERT INTO public.brand_users (
            brand_id, email, password_hash, full_name, phone, role, is_active
          ) VALUES ($1, $2, $3, $4, $5, 'owner', true)
          ON CONFLICT (email) DO UPDATE SET
            brand_id = EXCLUDED.brand_id,
            password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            is_active = true`,
          [
            brandId,
            email.toLowerCase(),
            defaultPasswordHash,
            b.primaryContactName,
            b.phone,
          ]
        )
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded sample brands directly into PostgreSQL database!',
    })
  } catch (error: any) {
    console.error('Error seeding brands in DB:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to seed sample brands' },
      { status: 500 }
    )
  }
}
