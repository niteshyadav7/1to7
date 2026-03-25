import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all campaigns with application counts
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    // Get application counts per campaign
    const campaignsWithCounts = await Promise.all(
      (campaigns || []).map(async (campaign) => {
        const { count } = await supabase
          .from('applications')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id)

        return { ...campaign, application_count: count || 0 }
      })
    )

    return NextResponse.json({ campaigns: campaignsWithCounts })
  } catch (error) {
    console.error('API /admin/campaigns GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
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
    } = body

    if (!brand_name || !platform) {
      return NextResponse.json({ error: 'Brand name and platform are required' }, { status: 400 })
    }

    // Auto-generate campaign code
    const code = `CAM-${Date.now().toString(36).toUpperCase()}`

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({
        campaign_code: code,
        brand_name,
        category: category || null,
        platform,
        budget_type: budget_type || null,
        deliverables: deliverables || null,
        product_links: product_links || [],
        requirements: requirements || null,
        gender_required: gender_required || 'Any',
        location: location || null,
        looking_for: looking_for || null,
        followers: followers || null,
        additional_info: additional_info || null,
        collab_date: collab_date || null,
        form_link: form_link || null,
        form_fields: form_fields || [],
        status: 'Draft',
        is_live: false,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error('API /admin/campaigns POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
