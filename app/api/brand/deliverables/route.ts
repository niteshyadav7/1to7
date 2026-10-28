import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandFromRequest } from '@/lib/brand-auth'
import { formatFollowerCount } from '@/lib/utils/brand-privacy-utils'

// Helper for relative time string
function formatRelativeTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return 'Recently'
  const date = new Date(dateInput)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  if (diffHours < 1) return 'Just now'
  if (diffHours === 1) return '1 hour ago'
  if (diffHours < 24) return `${diffHours} hours ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays === 1) return '1 day ago'
  return `${diffDays} days ago`
}

export async function GET() {
  try {
    const brandUser = await getBrandFromRequest()
    const brandId = brandUser?.brand_id || null
    const brandName = brandUser?.brand_name || ''

    if (!pool) {
      return NextResponse.json({ deliverables: [] })
    }

    let queryText = `
      SELECT 
        a.id,
        u.full_name as creator_name,
        u.instagram_username as handle,
        u.followers,
        c.campaign_code,
        c.brand_name,
        a.form_data,
        a.brand_content_status,
        a.brand_reviewed_at,
        a.created_at,
        a.updated_at
      FROM public.applications a
      JOIN public.campaigns c ON a.campaign_id = c.id
      JOIN public.users u ON a.user_id = u.id
      WHERE (
        a.brand_content_status IS NOT NULL 
        OR a.form_data->>'sample_reel_link' IS NOT NULL 
        OR a.form_data->>'sample_reel_url' IS NOT NULL 
        OR a.form_data->>'past_work_link' IS NOT NULL
        OR a.brand_review_status = 'brand_approved'
      )
    `
    const params: any[] = []

    if (brandId && brandName) {
      params.push(brandId, `%${brandName}%`)
      queryText += ` AND (c.brand_id::text = $1 OR c.brand_name ILIKE $2)`
    } else if (brandId) {
      params.push(brandId)
      queryText += ` AND c.brand_id::text = $1`
    } else if (brandName) {
      params.push(`%${brandName}%`)
      queryText += ` AND c.brand_name ILIKE $1`
    }

    queryText += ` ORDER BY a.updated_at DESC, a.created_at DESC LIMIT 50;`

    const res = await pool.query(queryText, params)
    const rows = res.rows || []

    const deliverables = rows.map((r: any) => {
      const formData = r.form_data || {}
      const reelUrl =
        formData.sample_reel_link ||
        formData.sample_reel_url ||
        formData.past_work_link ||
        `https://instagram.com/${r.handle || ''}`

      let status: 'pending_brand_review' | 'approved' | 'revision_requested' = 'pending_brand_review'
      if (r.brand_content_status === 'approved') {
        status = 'approved'
      } else if (r.brand_content_status === 'revision_requested') {
        status = 'revision_requested'
      }

      const followersNum = Number(r.followers) || 0
      const approxViews = Math.max(1200, Math.round(followersNum * 0.35))
      const viewsEstimate =
        formData.views_estimate ||
        `${(approxViews >= 1000 ? `${(approxViews / 1000).toFixed(1)}K` : approxViews)} Views`

      return {
        id: String(r.id),
        creator_name: r.creator_name || 'Creator',
        handle: r.handle || 'creator',
        followers: formatFollowerCount(followersNum),
        campaign: r.campaign_code
          ? `${r.brand_name || 'Brand'} • ${r.campaign_code}`
          : r.brand_name || 'Brand Campaign',
        reel_url: reelUrl,
        submitted_at: formatRelativeTime(r.updated_at || r.created_at),
        status,
        views_estimate: viewsEstimate,
      }
    })

    return NextResponse.json({ deliverables })
  } catch (error: any) {
    console.error('Error fetching brand deliverables:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deliverables', deliverables: [] },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const brandUser = await getBrandFromRequest()
    if (!brandUser) {
      return NextResponse.json({ error: 'Unauthorized: Brand session required' }, { status: 401 })
    }

    if (!pool) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 500 })
    }

    const body = await request.json()
    const { id, ids, status, notes } = body

    const targetStatus = status === 'approved' ? 'approved' : 'revision_requested'
    const targetIds: string[] = Array.isArray(ids) ? ids : id ? [id] : []

    if (targetIds.length === 0) {
      return NextResponse.json({ error: 'id or ids array required' }, { status: 400 })
    }

    await pool.query(
      `
      UPDATE public.applications
      SET 
        brand_content_status = $1,
        brand_feedback_notes = COALESCE($2, brand_feedback_notes),
        updated_at = NOW()
      WHERE id::text = ANY($3::text[]);
      `,
      [targetStatus, notes || null, targetIds.map(String)]
    )

    return NextResponse.json({
      success: true,
      message: `Updated ${targetIds.length} deliverable(s) to ${targetStatus}`,
    })
  } catch (error: any) {
    console.error('Error updating brand deliverable status:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update deliverable' },
      { status: 500 }
    )
  }
}
