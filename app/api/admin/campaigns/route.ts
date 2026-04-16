import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL environment variable');
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

    await client.connect()
    
    // Get all campaigns
    const campaignsRes = await client.query(`
      SELECT * FROM public.campaigns 
      ORDER BY created_at DESC
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
    console.error('Missing POSTGRES_URL environment variable');
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
    const {
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
      looking_for,
      followers,
      additional_info,
      collab_date,
      form_link,
      form_fields,
      order_form,
      order_form_fields,
      show_order_form,
      payment_form_fields,
    } = body

    if (!brand_name || !platform) {
      return NextResponse.json({ error: 'Brand name and platform are required' }, { status: 400 })
    }

    // Auto-generate campaign code
    const code = `CAM-${Date.now().toString(36).toUpperCase()}`

    await client.connect()
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
      code, brand_name, category || null, platform, budget_type || null,
      budget_amount || 0, partial_payment_enabled || false, JSON.stringify(partial_payment_config || {}),
      deliverables || null, product_links || [], requirements || null, gender_required || 'Any',
      location || null, looking_for || null, followers || null, additional_info || null,
      collab_date || null, form_link || null, JSON.stringify(form_fields || []), order_form || false,
      JSON.stringify(order_form_fields || []), show_order_form !== false, JSON.stringify(payment_form_fields || []), 'Draft', false
    ]

    const res = await client.query(query, values)
    const campaign = res.rows[0]

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error('API /admin/campaigns POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  } finally {
    await client.end()
  }
}
