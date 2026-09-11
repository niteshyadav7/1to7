import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    let userId: string | null = null

    if (token) {
      const payload = await verifyToken(token)
      if (payload && payload.id) {
        userId = payload.id
      }
    }

    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_live', true)
      .eq('status', 'Active')
      .or('approval_status.eq.Approved,approval_status.is.null')
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (error) throw error

    // Filter by Pre-Launch Pilot Mode:
    // If a campaign has is_test_mode === true:
    // - If visitor is not logged in (userId is null): exclude campaign
    // - If visitor is logged in: include ONLY if userId is in campaign.test_user_ids
    const visibleCampaigns = (campaigns || []).filter((c: any) => {
      if (c.is_test_mode) {
        if (!userId) return false
        const allowedUsers: string[] = Array.isArray(c.test_user_ids) ? c.test_user_ids : []
        return allowedUsers.includes(userId)
      }
      return true
    })

    // If user is logged in, attach their applied status for each campaign
    if (userId && visibleCampaigns.length > 0) {
      const campaignIds = visibleCampaigns.map((c: any) => c.id)
      const { data: userApplications } = await supabase
        .from('applications')
        .select('id, campaign_id, status, created_at')
        .eq('user_id', userId)
        .in('campaign_id', campaignIds)

      const appMap = new Map<string, any>()
      if (userApplications) {
        userApplications.forEach((app: any) => {
          appMap.set(app.campaign_id, app)
        })
      }

      const enrichedCampaigns = visibleCampaigns.map((c: any) => {
        const app = appMap.get(c.id)
        return {
          ...c,
          applied: !!app,
          application_status: app ? app.status : null,
          application_id: app ? app.id : null,
          applied_at: app ? app.created_at : null,
          rejection_reason: app ? (app.form_data?.rejection_reason || app.form_data?.revocation_note || null) : null,
          form_data: app ? app.form_data : null
        }
      })

      return NextResponse.json({ campaigns: enrichedCampaigns })
    }

    return NextResponse.json({ campaigns: visibleCampaigns })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
