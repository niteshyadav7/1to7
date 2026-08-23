import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function POST(request: Request) {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL environment variable')
    return NextResponse.json({ error: 'Server configuration error: Database URL not found' }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
  })

  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { campaigns } = body

    if (!Array.isArray(campaigns) || campaigns.length === 0) {
      return NextResponse.json({ error: 'Invalid payload: campaigns array is required and cannot be empty' }, { status: 400 })
    }

    await client.connect()

    const inserted: any[] = []
    const errors: { row: number; brand_name?: string; error: string }[] = []

    for (let i = 0; i < campaigns.length; i++) {
      const item = campaigns[i]
      const rowNum = i + 1

      const brand_name = item.brand_name?.toString().trim()
      const platform = item.platform?.toString().trim()

      if (!brand_name || !platform) {
        errors.push({
          row: rowNum,
          brand_name,
          error: 'Brand Name and Platform are required fields'
        })
        continue
      }

      const campaign_code = item.campaign_code?.toString().trim() !== ''
        ? item.campaign_code.toString().trim().toUpperCase()
        : `CAM-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`

      const category = item.category?.toString().trim() || null
      const budget_type = item.budget_type?.toString().trim() || null
      const budget_amount = parseFloat(item.budget_amount) || 0
      const partial_payment_enabled = item.partial_payment_enabled === true || item.partial_payment_enabled === 'true'
      const deliverables = item.deliverables?.toString().trim() || null
      const rawProductLinks = Array.isArray(item.product_links) 
        ? item.product_links 
        : (item.product_links ? item.product_links.toString().split('\n') : [])
      const product_links = rawProductLinks
        .map((l: any) => (typeof l === 'string' ? l.trim() : ''))
        .filter((l: string) => l && l.toLowerCase() !== 'na' && l.toLowerCase() !== 'n/a')
      const requirements = item.requirements?.toString().trim() || null
      const gender_required = item.gender_required?.toString().trim() || 'Any'
      const location = item.location?.toString().trim() || null
      const looking_for = item.looking_for?.toString().trim() || null
      const followers = item.followers?.toString().trim() || null
      const additional_info = item.additional_info?.toString().trim() || null
      const collab_date = item.collab_date?.toString().trim() || null
      const form_link = item.form_link?.toString().trim() || null
      const status = ['Draft', 'Active', 'Review', 'Closed', 'Completed'].includes(item.status?.toString().trim())
        ? item.status.toString().trim()
        : 'Draft'
      const is_live = item.is_live === true || item.is_live === 'true'

      const query = `
        INSERT INTO public.campaigns (
          campaign_code, brand_name, category, platform, budget_type, 
          budget_amount, partial_payment_enabled, partial_payment_config,
          deliverables, product_links, requirements, gender_required, 
          location, looking_for, followers, additional_info, 
          collab_date, form_link, form_fields, order_form, 
          order_form_fields, show_order_form, payment_form_fields, status, is_live
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25
        ) RETURNING *
      `
      const values = [
        campaign_code, brand_name, category, platform, budget_type,
        budget_amount, partial_payment_enabled, JSON.stringify({}),
        deliverables, product_links, requirements, gender_required,
        location, looking_for, followers, additional_info,
        collab_date, form_link, JSON.stringify([]), false,
        JSON.stringify([]), true, JSON.stringify([]), status, is_live
      ]

      try {
        const res = await client.query(query, values)
        inserted.push(res.rows[0])
      } catch (err: any) {
        let errMessage = 'Failed to insert campaign'
        if (err.code === '23505') {
          errMessage = `Campaign code "${campaign_code}" already exists`
        } else if (err.message) {
          errMessage = err.message
        }
        errors.push({
          row: rowNum,
          brand_name,
          error: errMessage
        })
      }
    }

    return NextResponse.json({
      success: true,
      insertedCount: inserted.length,
      failedCount: errors.length,
      inserted,
      errors
    })
  } catch (error: any) {
    console.error('API /admin/campaigns/bulk POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await client.end()
  }
}
