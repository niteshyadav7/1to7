import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export async function GET() {
  try {
    const admin = (await getAdminFromRequest()) || (await getBrandAdminFromRequest())
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin session required' }, { status: 401 })
    }

    // Fetch active brands from public.brands
    try {
      const result = await pool.query(`
        SELECT 
          id, 
          name, 
          slug, 
          logo_url, 
          industry, 
          primary_contact_name, 
          primary_contact_email 
        FROM public.brands 
        WHERE is_active = true 
        ORDER BY name ASC;
      `)

      return NextResponse.json({ success: true, brands: result.rows || [] })
    } catch (dbErr: any) {
      console.error('Error querying public.brands:', dbErr)
      return NextResponse.json({ success: true, brands: [] })
    }
  } catch (error: any) {
    console.error('Error fetching brands list:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch brands' }, { status: 500 })
  }
}

