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
    const rawCampaignId = searchParams.get('campaign_id')?.trim() || null

    // Get campaign info if campaign_id / campaign_code is provided
    let campaign: any = null
    let resolvedCampaignId: string | null = null

    if (rawCampaignId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawCampaignId)
      let campQuery = supabase
        .from('campaigns')
        .select('id, brand_name, campaign_code, platform, budget_amount, budget_type, location, location_type, store_locations, completion_days, completion_deadline, enforce_completion_deadline, manager_phone, form_fields')

      if (isUuid) {
        campQuery = campQuery.eq('id', rawCampaignId)
      } else {
        campQuery = campQuery.eq('campaign_code', rawCampaignId)
      }

      const { data: campData } = await campQuery.maybeSingle()
      campaign = campData
      resolvedCampaignId = campaign ? campaign.id : (isUuid ? rawCampaignId : null)
    }

    // Build applications query with chunked fetching to bypass Supabase 1,000 row hard limit
    const SELECT_FIELDS = `
      id,
      user_id,
      campaign_id,
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
      is_ghosted,
      ghosted_at,
      team_remark,
      team_remark_by,
      team_remark_updated_at,
      brand_review_status,
      brand_pitch_batch_name,
      brand_pitch_notes,
      brand_pitched_at,
      brand_pitched_by,
      brand_reviewed_at,
      brand_reviewed_by,
      brand_rejection_reason,
      brand_feedback_notes,
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
        shipping_addresses,
        is_instagram_verified,
        instagram_followers_count,
        instagram_media_count,
        instagram_account_type,
        instagram_biography,
        instagram_website,
        instagram_profiles
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
        enforce_completion_deadline,
        manager_phone,
        form_fields
      )
    `

    // Step 1: Count exact total records
    let countQuery = supabase.from('applications').select('*', { count: 'exact', head: true })
    if (resolvedCampaignId) {
      countQuery = countQuery.eq('campaign_id', resolvedCampaignId)
    }
    const { count: totalApplicationsCount, error: countErr } = await countQuery
    if (countErr) throw countErr

    const totalCount = totalApplicationsCount || 0
    const CHUNK_SIZE = 1000
    const chunksNeeded = Math.max(1, Math.ceil(totalCount / CHUNK_SIZE))

    // Step 2: Parallel fetch all chunks so no rows are ever dropped
    const chunkPromises: PromiseLike<any>[] = []
    for (let i = 0; i < chunksNeeded; i++) {
      const from = i * CHUNK_SIZE
      const to = from + CHUNK_SIZE - 1
      let chunkQuery = supabase
        .from('applications')
        .select(SELECT_FIELDS)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (resolvedCampaignId) {
        chunkQuery = chunkQuery.eq('campaign_id', resolvedCampaignId)
      }
      chunkPromises.push(chunkQuery)
    }

    const chunkResults = await Promise.all(chunkPromises)
    const applications: any[] = []
    for (const res of chunkResults) {
      if (res.error) throw res.error
      if (res.data) applications.push(...res.data)
    }

    // Step 3: Efficient user history lookup
    const userHistoryMap: Record<string, any[]> = {}

    if (!resolvedCampaignId) {
      // For all-applications query: We already loaded all applications across all campaigns!
      // Group them directly by user_id in-memory to save heavy database roundtrip.
      for (const app of applications) {
        const uId = app.user_id || app.users?.id
        if (uId) {
          if (!userHistoryMap[uId]) userHistoryMap[uId] = []
          userHistoryMap[uId].push(app)
        }
      }
    } else {
      // For single-campaign query: Fetch collaborator histories for applicants of this campaign
      const userIds = Array.from(
        new Set(
          applications
            .map((a: any) => a.user_id || (a.users && typeof a.users === 'object' ? a.users.id : null))
            .filter(Boolean)
        )
      )

      if (userIds.length > 0) {
        const USER_BATCH_SIZE = 100
        const historyPromises: PromiseLike<any>[] = []
        for (let i = 0; i < userIds.length; i += USER_BATCH_SIZE) {
          const batch = userIds.slice(i, i + USER_BATCH_SIZE)
          historyPromises.push(
            supabase
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
                is_ghosted,
                ghosted_at,
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
              .in('user_id', batch)
              .range(0, 999)
          )
        }
        const histResults = await Promise.all(historyPromises)
        for (const res of histResults) {
          if (!res.error && res.data) {
            for (const app of res.data) {
              if (!userHistoryMap[app.user_id]) {
                userHistoryMap[app.user_id] = []
              }
              userHistoryMap[app.user_id].push(app)
            }
          }
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
            is_ghosted: Boolean(other.is_ghosted),
            ghosted_at: other.ghosted_at || null,
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
        manager_phone: app.manager_phone || app.campaigns?.manager_phone || '',
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
