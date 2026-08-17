import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'applications')) {
      return NextResponse.json({ error: 'Unauthorized: Access to applications is restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const campaign_id = searchParams.get('campaign_id')

    // Get campaign info if campaign_id is provided
    let campaign: any = null
    if (campaign_id) {
      const { data } = await supabase
        .from('campaigns')
        .select('brand_name, campaign_code, platform')
        .eq('id', campaign_id)
        .single()
      campaign = data
    }

    // Build applications query
    let query = supabase
      .from('applications')
      .select(`
        id,
        status,
        form_data,
        partial_payment,
        final_payment,
        pending_amount,
        manager_phone,
        created_at,
        updated_at,
        users (
          id,
          full_name,
          influencer_id,
          email,
          mobile,
          instagram_username,
          followers,
          state,
          city,
          gender,
          instagram_profile_pic
        ),
        campaigns (
          brand_name,
          campaign_code,
          platform,
          budget_amount,
          budget_type
        )
      `)

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id)
    }

    const { data: applications, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({
      campaign: campaign || null,
      applications: applications || [],
    })
  } catch (error) {
    console.error('API /admin/applications GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
