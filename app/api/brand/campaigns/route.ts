import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandFromRequest } from '@/lib/brand-auth'

export async function GET() {
  try {
    const brandUser = await getBrandFromRequest()
    if (!brandUser) {
      return NextResponse.json({ error: 'Unauthorized: Brand session required' }, { status: 401 })
    }

    const brandId = brandUser.brand_id || null
    const brandName = brandUser.brand_name || ''

    if (!pool) {
      return NextResponse.json({ campaigns: [] })
    }

    let queryText = `
      SELECT 
        c.id,
        c.campaign_code,
        COALESCE(c.brand_name, 'Brand') as brand_name,
        COALESCE(NULLIF(c.campaign_code, ''), 'Campaign') as title,
        COALESCE(c.platform, 'Instagram Reels') as platform,
        COALESCE(c.budget_type, 'Barter') as budget_type,
        COALESCE(c.category, 'General') as category,
        COALESCE(c.status, 'Active') as status,
        COUNT(a.id)::int as total_applied,
        COUNT(a.id) FILTER (WHERE a.brand_review_status = 'pending_brand_review')::int as pending_review,
        COUNT(a.id) FILTER (WHERE a.brand_review_status = 'brand_approved')::int as approved,
        COUNT(a.id) FILTER (WHERE a.address_status = 'Approved')::int as dispatched,
        COUNT(a.id) FILTER (
          WHERE a.brand_content_status = 'approved' 
          OR a.form_data->>'sample_reel_link' IS NOT NULL 
          OR a.form_data->>'sample_reel_url' IS NOT NULL
        )::int as live_reels
      FROM public.campaigns c
      LEFT JOIN public.applications a ON a.campaign_id = c.id
      WHERE (c.brand_id::text = $1 OR c.brand_name ILIKE $2)
    `
    const params: any[] = [brandId || '', `%${brandName || brandId || ''}%`]

    queryText += `
      GROUP BY c.id
      ORDER BY c.created_at DESC;
    `

    const res = await pool.query(queryText, params)
    const campaigns = res.rows.map((r: any) => ({
      id: String(r.id),
      campaign_code: r.campaign_code || 'CAM-001',
      title: `${r.brand_name} ${r.campaign_code}`,
      platform: r.platform,
      budget_type: r.budget_type,
      category: r.category,
      total_applied: Number(r.total_applied) || 0,
      pending_review: Number(r.pending_review) || 0,
      approved: Number(r.approved) || 0,
      dispatched: Number(r.dispatched) || 0,
      live_reels: Number(r.live_reels) || 0,
      status: r.status === 'Closed' ? 'Closed' : r.pending_review > 0 ? 'Review' : 'Active',
    }))

    return NextResponse.json({ campaigns })
  } catch (error: any) {
    console.error('Error fetching brand campaigns:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch brand campaigns', campaigns: [] },
      { status: 500 }
    )
  }
}
