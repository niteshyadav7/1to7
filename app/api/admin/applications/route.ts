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
        .select('brand_name, campaign_code, platform, budget_amount, budget_type, location, location_type, store_locations')
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
        selected_store,
        partial_payment,
        final_payment,
        pending_amount,
        manager_phone,
        completion_deadline,
        is_delay_exempted,
        delay_exemption_reason,
        completion_submitted_at,
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
          instagram_profile_pic,
          shipping_addresses
        ),
        campaigns (
          id,
          brand_name,
          campaign_code,
          platform,
          budget_amount,
          budget_type,
          location,
          location_type,
          store_locations,
          completion_days,
          completion_deadline,
          enforce_completion_deadline
        )
      `)

    if (campaign_id) {
      query = query.eq('campaign_id', campaign_id)
    }

    const { data: rawApplications, error } = await query.order('created_at', { ascending: false })

    if (error) throw error

    const applications = rawApplications || []

    // Fetch all user collaboration histories across all campaigns for shortlisting intelligence
    const userIds = Array.from(
      new Set(
        applications
          .map((a: any) => (a.users && typeof a.users === 'object' ? a.users.id : null))
          .filter(Boolean)
      )
    )

    const userHistoryMap: Record<string, any[]> = {}

    if (userIds.length > 0) {
      const { data: allUserApps, error: histErr } = await supabase
        .from('applications')
        .select(`
          id,
          user_id,
          campaign_id,
          status,
          form_data,
          partial_payment,
          final_payment,
          pending_amount,
          completion_deadline,
          is_delay_exempted,
          delay_exemption_reason,
          completion_submitted_at,
          created_at,
          updated_at,
          campaigns (
            id,
            brand_name,
            campaign_code,
            platform,
            budget_type,
            budget_amount,
            collab_date,
            completion_days,
            completion_deadline,
            enforce_completion_deadline
          )
        `)
        .in('user_id', userIds)

      if (!histErr && allUserApps) {
        for (const app of allUserApps) {
          if (!userHistoryMap[app.user_id]) {
            userHistoryMap[app.user_id] = []
          }
          userHistoryMap[app.user_id].push(app)
        }
      }
    }

    // Enrich each application with detailed influencer collaboration history and active workload
    const enrichedApplications = applications.map((app: any) => {
      const uId = app.users?.id
      const allAppsForUser = uId && userHistoryMap[uId] ? userHistoryMap[uId] : []

      // Other applications (excluding current application)
      const otherApps = allAppsForUser.filter((other: any) => other.id !== app.id)

      // Active status classifications
      const activeStatuses = ['Approved', 'Payment Initiated', 'Under Process', 'Under Review', 'Live', 'Order Placed']
      const activeCampaigns = otherApps
        .filter((other: any) => activeStatuses.includes(other.status) || (other.status === 'Applied' && other.campaign_id !== app.campaign_id))
        .map((other: any) => {
          // Calculate deadline & overdue status for this active campaign
          const baseDate = other.updated_at ? new Date(other.updated_at) : new Date(other.created_at)
          const days = other.campaigns?.completion_days || 7
          const effectiveDeadline = other.completion_deadline ? new Date(other.completion_deadline) : new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000)
          const isOverdue = other.status === 'Approved' && !other.form_data?.payment_request && new Date() > effectiveDeadline
          const isExempted = Boolean(other.is_delay_exempted)

          return {
            application_id: other.id,
            campaign_id: other.campaign_id,
            brand_name: other.campaigns?.brand_name || 'Campaign',
            campaign_code: other.campaigns?.campaign_code || '',
            platform: other.campaigns?.platform || 'Instagram',
            status: other.status,
            budget_type: other.campaigns?.budget_type,
            budget_amount: other.campaigns?.budget_amount,
            collab_date: other.campaigns?.collab_date,
            completion_deadline: effectiveDeadline.toISOString(),
            is_overdue: isOverdue,
            is_delay_exempted: isExempted,
            delay_exemption_reason: other.delay_exemption_reason || null,
            created_at: other.created_at,
          }
        })

      // Completed past campaigns
      const completedStatuses = ['Completed', 'Paid', 'Closed']
      const pastCampaigns = otherApps
        .filter((other: any) => completedStatuses.includes(other.status))
        .map((other: any) => ({
          application_id: other.id,
          campaign_id: other.campaign_id,
          brand_name: other.campaigns?.brand_name || 'Campaign',
          campaign_code: other.campaigns?.campaign_code || '',
          platform: other.campaigns?.platform || 'Instagram',
          status: other.status,
          budget_type: other.campaigns?.budget_type,
          budget_amount: other.campaigns?.budget_amount,
          completed_at: other.updated_at || other.created_at,
          created_at: other.created_at,
        }))

      const influencerHistory = {
        total_collaborations: allAppsForUser.length,
        active_campaigns_count: activeCampaigns.length,
        completed_campaigns_count: pastCampaigns.length,
        is_first_collab: allAppsForUser.length <= 1,
        active_campaigns: activeCampaigns,
        past_campaigns: pastCampaigns,
      }

      return {
        ...app,
        influencer_history: influencerHistory,
      }
    })

    return NextResponse.json({
      campaign: campaign || null,
      applications: enrichedApplications,
    })
  } catch (error) {
    console.error('API /admin/applications GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
