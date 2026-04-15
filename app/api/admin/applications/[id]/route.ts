import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { sendApplicationApprovedEmail, sendApplicationRejectedEmail } from '@/lib/mailer'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const allowedFields = [
      'status', 'partial_payment', 'final_payment',
      'pending_amount', 'manager_phone', 'form_data'
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }
    updates.updated_at = new Date().toISOString()

    const { data: application, error } = await supabase
      .from('applications')
      .update(updates)
      .eq('id', id)
      .select('*, users ( email, full_name ), campaigns ( brand_name, campaign_code )')
      .single()

    if (error) throw error

    // Send email notification on status change (fire-and-forget)
    const newStatus = body.status
    const userEmail = application?.users?.email
    const userName = application?.users?.full_name || 'Creator'
    const brandName = application?.campaigns?.brand_name || 'Campaign'
    const campaignCode = application?.campaigns?.campaign_code || ''

    if (userEmail && newStatus === 'Approved') {
      sendApplicationApprovedEmail(userEmail, userName, brandName, campaignCode)
    } else if (userEmail && newStatus === 'Rejected') {
      sendApplicationRejectedEmail(userEmail, userName, brandName, campaignCode)
    }

    return NextResponse.json({ success: true, application })
  } catch (error) {
    console.error('API /admin/applications/[id] PUT Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

