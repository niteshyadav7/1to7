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

    // Query real pending batches from database
    const query = `
      SELECT 
        c.id as campaign_id,
        COALESCE(c.brand_name, b.name, 'Brand') as brand_name,
        COALESCE(c.category, c.brand_name, c.campaign_code, 'Campaign') as campaign_name,
        b.id as brand_id,
        COALESCE(b.primary_contact_name, 'Brand POC') as brand_contact_name,
        COALESCE(b.primary_contact_phone, '') as brand_phone,
        COALESCE(b.primary_contact_email, '') as brand_email,
        COALESCE(adm.name, 'Unassigned') as assigned_kam,
        COUNT(a.id)::int as shortlisted_count,
        MIN(COALESCE(a.brand_pitched_at, a.created_at)) as earliest_pitched_at,
        EXTRACT(EPOCH FROM (NOW() - MIN(COALESCE(a.brand_pitched_at, a.created_at)))) / 3600 as hours_elapsed
      FROM public.applications a
      JOIN public.campaigns c ON a.campaign_id = c.id
      LEFT JOIN public.brands b ON c.brand_id = b.id
      LEFT JOIN public.admins adm ON b.assigned_1to7_kam_id = adm.id
      WHERE a.brand_review_status = 'pending_brand_review'
      GROUP BY c.id, c.brand_name, c.category, c.campaign_code, b.id, b.name, b.primary_contact_name, b.primary_contact_phone, b.primary_contact_email, adm.name
      ORDER BY hours_elapsed DESC;
    `

    const res = await pool.query(query)

    const batches = (res.rows || []).map((row: any, index: number) => {
      const hoursElapsed = Math.round(Number(row.hours_elapsed) || 0)
      let status: 'on_track' | 'warning' | 'breached' = 'on_track'
      if (hoursElapsed > 48) {
        status = 'breached'
      } else if (hoursElapsed > 24) {
        status = 'warning'
      }

      const submittedDate = row.earliest_pitched_at
        ? new Date(row.earliest_pitched_at).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'Recently Submitted'

      return {
        id: `batch-${row.campaign_id || index}`,
        brandName: row.brand_name,
        campaignName: row.campaign_name,
        shortlistedCount: row.shortlisted_count,
        submittedAt: submittedDate,
        hoursElapsed,
        status,
        brandId: row.brand_id ? String(row.brand_id) : '',
        brandContactName: row.brand_contact_name,
        brandPhone: row.brand_phone,
        brandEmail: row.brand_email,
        assignedKam: row.assigned_kam,
      }
    })

    return NextResponse.json({ success: true, batches })
  } catch (error: any) {
    console.error('Error fetching SLA review batches from DB:', error)
    return NextResponse.json({ success: true, batches: [] })
  }
}
