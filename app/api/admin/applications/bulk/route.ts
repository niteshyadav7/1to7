import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { sendApplicationApprovedEmail, sendApplicationRejectedEmail } from '@/lib/mailer'

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { applicationIds, status, rejection_reason, send_email } = body

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: 'applicationIds array is required' }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    let targetApplicationIds = applicationIds
    let skippedCount = 0

    if (status === 'Approved') {
      const { data: appsToCheck, error: checkErr } = await supabase
        .from('applications')
        .select('id, form_data, campaigns ( budget_type )')
        .in('id', applicationIds)

      if (!checkErr && appsToCheck) {
        const eligibleIds: string[] = []
        for (const app of appsToCheck) {
          const isPaidVar = String((app as any).campaigns?.budget_type || '').toLowerCase().includes('variable')
          const negotiation = (app.form_data as any)?.negotiation
          if (isPaidVar && negotiation?.status !== 'approved') {
            skippedCount++
          } else {
            eligibleIds.push(app.id)
          }
        }
        targetApplicationIds = eligibleIds
      }

      if (targetApplicationIds.length === 0) {
        return NextResponse.json({
          error: 'None of the selected applications could be approved. Paid Variable campaigns require a negotiated deal approved by a colleague.',
          updatedCount: 0,
          skippedCount
        }, { status: 400 })
      }
    }

    let data: any[] = []

    if (status === 'Rejected' && rejection_reason) {
      // Fetch existing applications to preserve existing form_data while appending rejection_reason
      const { data: existingApps, error: fetchErr } = await supabase
        .from('applications')
        .select('id, form_data')
        .in('id', applicationIds)

      if (fetchErr) {
        console.error('Fetch error during bulk reject:', fetchErr)
      }

      // Update each application with merged form_data
      const updatePromises = (existingApps || []).map(app => {
        const currForm = (app.form_data && typeof app.form_data === 'object') ? app.form_data : {}
        const mergedForm = {
          ...currForm,
          rejection_reason,
          revocation_note: rejection_reason,
          revoked_at: new Date().toISOString(),
        }
        return supabase
          .from('applications')
          .update({
            status: 'Rejected',
            form_data: mergedForm,
            updated_at: new Date().toISOString()
          })
          .eq('id', app.id)
          .select('id, status, form_data, users ( email, full_name ), campaigns ( brand_name, campaign_code )')
          .single()
      })

      const results = await Promise.all(updatePromises)
      data = results.filter(r => r.data).map(r => r.data)
    } else {
      // Standard bulk update
      const { data: bulkData, error } = await supabase
        .from('applications')
        .update({ status, updated_at: new Date().toISOString() })
        .in('id', targetApplicationIds)
        .select('id, status, form_data, users ( email, full_name ), campaigns ( brand_name, campaign_code )')

      if (error) {
        console.error('Supabase bulk update error:', error)
        throw error
      }
      data = bulkData || []
    }

    // Send email notifications for Approved/Rejected (fire-and-forget)
    if (data && (status === 'Approved' || status === 'Rejected') && send_email !== false) {
      for (const app of data) {
        const userEmail = (app as any).users?.email
        const userName = (app as any).users?.full_name || 'Creator'
        const brandName = (app as any).campaigns?.brand_name || 'Campaign'
        const campaignCode = (app as any).campaigns?.campaign_code || ''

        if (userEmail) {
          if (status === 'Approved') {
            sendApplicationApprovedEmail(userEmail, userName, brandName, campaignCode)
          } else {
            sendApplicationRejectedEmail(userEmail, userName, brandName, campaignCode, rejection_reason)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      updatedCount: data ? data.length : 0,
      skippedCount,
      message: skippedCount > 0
        ? `Successfully updated ${data ? data.length : 0} applications. ${skippedCount} application(s) skipped because Paid Variable campaigns require colleague approval on negotiated commercial.`
        : undefined,
      data
    })
  } catch (error) {
    console.error('API /admin/applications/bulk POST Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}

