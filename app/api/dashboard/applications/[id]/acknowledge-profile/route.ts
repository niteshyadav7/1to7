import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { InstagramLogService } from '@/lib/services/instagram-log.service'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select('id, user_id, campaign_id, form_data')
      .eq('id', id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentFormData = application.form_data || {}
    const override = currentFormData.profile_override

    if (!override) {
      return NextResponse.json({ message: 'No override pending acknowledgement' })
    }

    const ackTime = new Date().toISOString()
    const updatedFormData = {
      ...currentFormData,
      profile_override: {
        ...override,
        acknowledged_at: ackTime
      }
    }

    await supabase
      .from('applications')
      .update({ form_data: updatedFormData, updated_at: ackTime })
      .eq('id', id)

    InstagramLogService.log({
      event_type: 'CREATOR_ACKNOWLEDGED_CHANGE',
      user_id: payload.id,
      application_id: id,
      campaign_id: application.campaign_id,
      new_username: override.new_username,
      actor: { type: 'creator', id: payload.id },
      metadata: { override },
      request
    }).catch(() => {})

    return NextResponse.json({ success: true, message: 'Profile change acknowledged' })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to acknowledge profile change' }, { status: 500 })
  }
}
