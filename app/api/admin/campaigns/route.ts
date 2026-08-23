import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'

export async function GET() {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL environment variable')
    return NextResponse.json({ error: 'Server configuration error: Database URL not found' }, { status: 500 })
  }
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'campaigns')) {
      return NextResponse.json({ error: 'Unauthorized: Access to campaigns is restricted' }, { status: 403 })
    }

    await client.connect()

    // Get all campaigns sorted by display order
    const campaignsRes = await client.query(`
      SELECT * FROM public.campaigns 
      ORDER BY COALESCE(display_order, 999999) ASC, created_at DESC
    `)
    const campaigns = campaignsRes.rows

    // Get application counts per campaign
    const campaignsWithCounts = await Promise.all(
      campaigns.map(async (campaign) => {
        const countRes = await client.query(
          'SELECT COUNT(*) FROM public.applications WHERE campaign_id = $1',
          [campaign.id]
        )
        return { ...campaign, application_count: parseInt(countRes.rows[0].count) || 0 }
      })
    )

    return NextResponse.json({ campaigns: campaignsWithCounts })
  } catch (error) {
    console.error('API /admin/campaigns GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await client.end()
  }
}

export async function POST(request: Request) {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL environment variable')
    return NextResponse.json({ error: 'Server configuration error: Database URL not found' }, { status: 500 })
  }
  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'campaigns', 'create')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to create campaigns is denied' }, { status: 403 })
    }

    const body = await request.json()
    const {
      campaign_code,
      brand_name,
      category,
      platform,
      budget_type,
      budget_amount,
      partial_payment_enabled,
      partial_payment_config,
      deliverables,
      product_links,
      requirements,
      gender_required,
      location,
      location_type,
      target_states,
      target_cities,
      store_locations,
      enforce_location,
      looking_for,
      followers,
      min_followers,
      enforce_followers,
      additional_info,
      collab_date,
      form_link,
      form_fields,
      order_form,
      order_form_fields,
      show_order_form,
      payment_form_fields,
      brief_document_url,
      completion_days,
      completion_deadline,
      enforce_completion_deadline,
      display_order,
    } = body

    if (!brand_name || !platform) {
      return NextResponse.json({ error: 'Brand name and platform are required' }, { status: 400 })
    }

    // Use provided code or auto-generate
    const code =
      campaign_code && campaign_code.trim() !== ''
        ? campaign_code.trim().toUpperCase()
        : `CAM-${Date.now().toString(36).toUpperCase()}`

    await client.connect()

    // Calculate next order if not specified
    let targetOrder = display_order ? parseInt(display_order) : null
    if (!targetOrder) {
      const orderRes = await client.query('SELECT COALESCE(MAX(display_order), 0) + 1 AS next_order FROM public.campaigns')
      targetOrder = parseInt(orderRes.rows[0]?.next_order) || 1
    }

    const query = `
      INSERT INTO public.campaigns (
        campaign_code, brand_name, category, platform, budget_type, 
        budget_amount, partial_payment_enabled, partial_payment_config,
        deliverables, product_links, requirements, gender_required, 
        location, location_type, target_states, target_cities, store_locations, enforce_location,
        looking_for, followers, min_followers, enforce_followers, additional_info, 
        collab_date, form_link, form_fields, order_form, 
        order_form_fields, show_order_form, payment_form_fields, status, is_live, 
        completion_days, completion_deadline, enforce_completion_deadline, display_order, brief_document_url
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32, $33, $34, $35, $36, $37
      ) RETURNING *
    `
    const values = [
      code,
      brand_name,
      category || null,
      platform,
      budget_type || null,
      budget_amount || 0,
      partial_payment_enabled || false,
      JSON.stringify(partial_payment_config || {}),
      deliverables || null,
      product_links || [],
      requirements || null,
      gender_required || 'Any',
      location || null,
      location_type || 'PAN_INDIA',
      Array.isArray(target_states) ? target_states : [],
      Array.isArray(target_cities) ? target_cities : [],
      JSON.stringify(Array.isArray(store_locations) ? store_locations : []),
      Boolean(enforce_location),
      looking_for || null,
      followers || null,
      min_followers !== undefined && min_followers !== null ? parseInt(min_followers, 10) || 0 : 0,
      Boolean(enforce_followers),
      additional_info || null,
      collab_date || null,
      form_link || null,
      JSON.stringify(form_fields || []),
      order_form || false,
      JSON.stringify(order_form_fields || []),
      show_order_form !== false,
      JSON.stringify(payment_form_fields || []),
      'Active',
      true,
      completion_days !== undefined && completion_days !== null ? parseInt(completion_days, 10) || 7 : 7,
      completion_deadline || null,
      enforce_completion_deadline !== false,
      targetOrder,
      brief_document_url || null,
    ]

    const res = await client.query(query, values)
    const campaign = res.rows[0]

    return NextResponse.json({ success: true, campaign })
  } catch (error: any) {
    console.error('API /admin/campaigns POST Error:', error)
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Campaign ID already exists. Please use a unique ID.' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await client.end()
  }
}
