import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let { data: campaign, error } = isUuid
      ? await supabase.from('campaigns').select('*').eq('id', id).maybeSingle()
      : await supabase.from('campaigns').select('*').ilike('campaign_code', id).maybeSingle()

    // If UUID lookup failed or returned nothing, attempt fallback to campaign_code lookup
    if (!campaign && isUuid) {
      const { data: codeMatch } = await supabase
        .from('campaigns')
        .select('*')
        .ilike('campaign_code', id)
        .maybeSingle()
      if (codeMatch) campaign = codeMatch
    }

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Check if current logged in user has applied
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    let applied = false
    let application_status: string | null = null
    let application_id: string | null = null
    let applied_at: string | null = null
    let rejection_reason: string | null = null
    let app_form_data: any = null

    if (token) {
      const payload = await verifyToken(token)
      if (payload && payload.id && campaign.id) {
        const { data: app } = await supabase
          .from('applications')
          .select('id, status, created_at, form_data')
          .eq('user_id', payload.id)
          .eq('campaign_id', campaign.id)
          .maybeSingle()

        if (app) {
          applied = true
          application_status = app.status
          application_id = app.id
          applied_at = app.created_at
          rejection_reason = app.form_data?.rejection_reason || app.form_data?.revocation_note || null
          app_form_data = app.form_data || null
        }
      }
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        applied,
        application_status,
        application_id,
        applied_at,
        rejection_reason,
        form_data: app_form_data
      }
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}
