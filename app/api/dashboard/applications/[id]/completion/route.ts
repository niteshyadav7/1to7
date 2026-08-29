import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { checkLiveDateMaturation } from '@/lib/utils/completion-timeline-utils'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { live_date, deliverable_link, supporting_document, notes, views_count, custom_responses } = body

    if (!live_date) {
      return NextResponse.json({ error: 'Live date is required' }, { status: 400 })
    }

    if (!deliverable_link && !supporting_document) {
      return NextResponse.json({ error: 'At least one deliverable live link or proof document is required' }, { status: 400 })
    }

    // Enforce 7-Day Live Date Maturation Gap
    const maturation = checkLiveDateMaturation(live_date, 7)
    if (!maturation.canSubmit) {
      return NextResponse.json({ error: maturation.message }, { status: 400 })
    }

    // Verify application ownership
    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select('id, user_id, form_data, status')
      .eq('id', id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentFormData = application.form_data || {}
    const existingSubmission = currentFormData.completion_submission
    const existingHistory = Array.isArray(currentFormData.completion_history)
      ? currentFormData.completion_history
      : []

    const updatedHistory = [...existingHistory]
    if (existingSubmission && (existingSubmission.live_date || existingSubmission.deliverable_link || existingSubmission.supporting_document)) {
      updatedHistory.push({
        ...existingSubmission,
        archived_at: new Date().toISOString(),
        attempt: existingHistory.length + 1,
        rejection_reason: currentFormData.rejection_reason || undefined,
        previous_status: application.status,
      })
    }

    const updatedFormData = {
      ...currentFormData,
      completion_submission: {
        live_date,
        deliverable_link: deliverable_link || '',
        supporting_document: supporting_document || '',
        views_count: views_count || '',
        notes: notes || '',
        custom_responses: custom_responses || {},
        submitted_at: new Date().toISOString(),
        attempt: updatedHistory.length + 1,
      },
      completion_history: updatedHistory,
      completion_approved: null,
      rejection_reason: null,
    }

    const { error: updateErr } = await supabase
      .from('applications')
      .update({
        form_data: updatedFormData,
        completion_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) throw updateErr

    return NextResponse.json({
      success: true,
      message: 'Campaign completion deliverables submitted successfully!',
    })
  } catch (err: any) {
    console.error('Completion Submission Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to submit completion' }, { status: 500 })
  }
}
