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
      return NextResponse.json({
        stats: {
          pendingReview: 0,
          approvedCreators: 0,
          dispatchedSamples: 0,
          liveDeliverables: 0,
          totalCampaigns: 0,
        },
        campaigns: [],
      })
    }

    // 1. Fetch campaigns for this brand
    let campQuery = `
      SELECT 
        c.id,
        c.campaign_code,
        COALESCE(c.brand_name, 'Brand') as brand_name,
        COALESCE(NULLIF(c.campaign_code, ''), 'Campaign') as title,
        COALESCE(c.platform, 'Instagram') as platform,
        COALESCE(c.budget_type, 'Barter') as budget_type,
        COALESCE(c.status, 'Active') as status,
        COUNT(a.id) FILTER (WHERE a.brand_review_status = 'pending_brand_review')::int as pending_count,
        COUNT(a.id) FILTER (WHERE a.brand_review_status = 'brand_approved')::int as approved_count
      FROM public.campaigns c
      LEFT JOIN public.applications a ON a.campaign_id = c.id
      WHERE 1=1
    `
    const params: any[] = []

    if (brandId && brandName) {
      params.push(brandId, `%${brandName}%`)
      campQuery += ` AND (c.brand_id::text = $1 OR c.brand_name ILIKE $2)`
    } else if (brandId) {
      params.push(brandId)
      campQuery += ` AND c.brand_id::text = $1`
    } else if (brandName) {
      params.push(`%${brandName}%`)
      campQuery += ` AND c.brand_name ILIKE $1`
    }

    campQuery += `
      GROUP BY c.id
      ORDER BY c.created_at DESC
      LIMIT 10;
    `

    const campRes = await pool.query(campQuery, params)
    const campaigns = campRes.rows.map((r: any) => ({
      id: String(r.id),
      campaign_code: r.campaign_code || 'CAM-001',
      title: `${r.brand_name} ${r.campaign_code}`,
      platform: r.platform,
      budget_type: r.budget_type,
      pending_count: Number(r.pending_count) || 0,
      approved_count: Number(r.approved_count) || 0,
      status: r.status || 'Active',
    }))

    // 2. Aggregate stats across all campaigns for this brand
    let statsQuery = `
      SELECT 
        COUNT(DISTINCT c.id)::int as total_campaigns,
        COUNT(a.id) FILTER (WHERE a.brand_review_status = 'pending_brand_review')::int as pending_review,
        COUNT(a.id) FILTER (WHERE a.brand_review_status = 'brand_approved')::int as approved_creators,
        COUNT(a.id) FILTER (WHERE a.address_status = 'Approved')::int as dispatched_samples,
        COUNT(a.id) FILTER (
          WHERE a.brand_content_status = 'approved' 
          OR a.form_data->>'sample_reel_link' IS NOT NULL 
          OR a.form_data->>'sample_reel_url' IS NOT NULL
        )::int as live_deliverables
      FROM public.campaigns c
      LEFT JOIN public.applications a ON a.campaign_id = c.id
      WHERE 1=1
    `
    const statsParams: any[] = []
    if (brandId && brandName) {
      statsParams.push(brandId, `%${brandName}%`)
      statsQuery += ` AND (c.brand_id::text = $1 OR c.brand_name ILIKE $2);`
    } else if (brandId) {
      statsParams.push(brandId)
      statsQuery += ` AND c.brand_id::text = $1;`
    } else if (brandName) {
      statsParams.push(`%${brandName}%`)
      statsQuery += ` AND c.brand_name ILIKE $1;`
    } else {
      statsQuery += `;`
    }

    const statsRes = await pool.query(statsQuery, statsParams)
    const row = statsRes.rows[0] || {}

    return NextResponse.json({
      stats: {
        pendingReview: Number(row.pending_review) || 0,
        approvedCreators: Number(row.approved_creators) || 0,
        dispatchedSamples: Number(row.dispatched_samples) || 0,
        liveDeliverables: Number(row.live_deliverables) || 0,
        totalCampaigns: Number(row.total_campaigns) || 0,
      },
      campaigns,
    })
  } catch (error: any) {
    console.error('Error fetching brand dashboard stats:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch dashboard stats',
        stats: {
          pendingReview: 0,
          approvedCreators: 0,
          dispatchedSamples: 0,
          liveDeliverables: 0,
          totalCampaigns: 0,
        },
        campaigns: [],
      },
      { status: 500 }
    )
  }
}
