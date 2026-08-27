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

    // If user is logged in, attach their applied status for each campaign
    if (userId && campaigns && campaigns.length > 0) {
      const campaignIds = campaigns.map((c: any) => c.id)
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

      const enrichedCampaigns = campaigns.map((c: any) => {
        const app = appMap.get(c.id)
        return {
          ...c,
          applied: !!app,
          application_status: app ? app.status : null,
          application_id: app ? app.id : null,
          applied_at: app ? app.created_at : null
        }
      })

      return NextResponse.json({ campaigns: enrichedCampaigns })
    }

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
