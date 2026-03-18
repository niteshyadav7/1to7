import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    // Verify user is logged in
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json(
        { error: 'You must be logged in to apply' },
        { status: 401 }
      )
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json(
        { error: 'Invalid session. Please log in again.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { campaignId, formData } = body

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Check if user already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', payload.id)
      .eq('campaign_id', campaignId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 409 }
      )
    }

    // Check campaign exists and is active
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, status, is_live')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.status !== 'Active' || !campaign.is_live) {
      return NextResponse.json(
        { error: 'This campaign is no longer accepting applications' },
        { status: 400 }
      )
    }

    // Insert application
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        user_id: payload.id,
        campaign_id: campaignId,
        form_data: formData || {},
        status: 'Applied'
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully!'
    })
  } catch (err: any) {
    // Handle unique constraint violation
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 409 }
      )
    }
    return NextResponse.json(
      { error: err.message || 'Failed to submit application' },
      { status: 500 }
    )
  }
}
