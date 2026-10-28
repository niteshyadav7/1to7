import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandFromRequest } from '@/lib/brand-auth'

export async function GET() {
  try {
    const brandUser = await getBrandFromRequest()
    const brandId = brandUser?.brand_id || null
    const brandName = brandUser?.brand_name || ''

    if (!pool) {
      return NextResponse.json({ dispatches: [] })
    }

    let queryText = `
      SELECT 
        a.id,
        u.full_name as creator_name,
        u.instagram_username as handle,
        COALESCE(u.city, 'India') as city,
        c.campaign_code,
        c.brand_name,
        a.form_data,
        a.address_status,
        a.created_at,
        a.updated_at
      FROM public.applications a
      JOIN public.campaigns c ON a.campaign_id = c.id
      JOIN public.users u ON a.user_id = u.id
      WHERE (
        a.address_status = 'Approved'
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

    queryText += ` ORDER BY a.updated_at DESC LIMIT 50;`

    const res = await pool.query(queryText, params)
    const rows = res.rows || []

    const dispatches = rows.map((r: any) => {
      const formData = r.form_data || {}
      const sampleVariant =
        formData.sample_variant ||
        formData.order_details?.size ||
        formData.shade ||
        'Standard Product Sample'

      const courier = formData.courier_partner || 'Delhivery'
      const awb = formData.awb_number || `AWB-${String(r.id).slice(0, 8).toUpperCase()}`

      let status: 'Delivered' | 'In Transit' | 'Out for Delivery' | 'Packed' = 'Packed'
      if (formData.dispatch_status) {
        status = formData.dispatch_status
      } else if (r.address_status === 'Approved') {
        status = 'In Transit'
      }

      const dispatchedDate = r.updated_at
        ? new Date(r.updated_at).toISOString().split('T')[0]
        : new Date(r.created_at).toISOString().split('T')[0]

      return {
        id: String(r.id),
        creator_name: r.creator_name || 'Creator',
        handle: r.handle || 'creator',
        city: r.city,
        campaign: r.campaign_code
          ? `${r.brand_name || 'Brand'} • ${r.campaign_code}`
          : r.brand_name || 'Campaign',
        sample_choice: sampleVariant,
        courier_partner: courier,
        awb_number: awb,
        status,
        dispatched_at: dispatchedDate,
      }
    })

    return NextResponse.json({ dispatches })
  } catch (error: any) {
    console.error('Error fetching brand dispatches:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch dispatches', dispatches: [] },
      { status: 500 }
    )
  }
}
