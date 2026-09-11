import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'
import { sendApplicationApprovedEmail } from '@/lib/mailer'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'applications', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to update commercials is denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { action, amount, notes } = body // action: 'propose' | 'approve' | 'reject'

    // Fetch existing application
    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select('id, form_data, status, pending_amount, campaigns(brand_name, campaign_code, budget_type, budget_amount)')
      .eq('id', id)
      .single()

    if (fetchErr) {
      console.error('Fetch application error in admin commercial:', fetchErr)
      if (fetchErr.code === 'PGRST116') {
        return NextResponse.json({ error: 'Application not found' }, { status: 404 })
      }
      return NextResponse.json({ error: fetchErr.message || 'Database query error' }, { status: 500 })
    }

    if (!application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const currentFormData = application.form_data || {}
    const currentNegotiation = currentFormData.negotiation || {}
    const adminIdentifier = admin.id || admin.email || 'admin'
    const adminName = admin.full_name || admin.name || admin.email || 'Admin'
    const adminEmail = admin.email || ''

    // ──────────────────────────────────────────────
    // 1. PROPOSE / UPDATE NEGOTIATED COMMERCIAL
    // ──────────────────────────────────────────────
    if (action === 'propose') {
      const numericAmount = parseFloat(amount)
      if (isNaN(numericAmount) || numericAmount < 0) {
        return NextResponse.json({ error: 'Please enter a valid commercial amount' }, { status: 400 })
      }

      const updatedNegotiation = {
        proposed_amount: numericAmount,
        proposed_by_id: adminIdentifier,
        proposed_by_name: adminName,
        proposed_by_email: adminEmail,
        proposed_at: new Date().toISOString(),
        notes: notes || '',
        status: 'pending_peer_approval',
        history: [
          ...(currentNegotiation.history || []),
          {
            amount: numericAmount,
            by_id: adminIdentifier,
            by_name: adminName,
            by_email: adminEmail,
            at: new Date().toISOString(),
            notes: notes || '',
            action: 'proposed',
          },
        ],
      }

      const updatedFormData = {
        ...currentFormData,
        negotiation: updatedNegotiation,
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: updatedFormData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw updateErr

      return NextResponse.json({
        success: true,
        message: `Negotiated commercial quote of ₹${numericAmount.toLocaleString()} proposed! Waiting for peer approval.`,
      })
    }

    // ──────────────────────────────────────────────
    // 2. APPROVE NEGOTIATED COMMERCIAL (MAKER-CHECKER)
    // ──────────────────────────────────────────────
    if (action === 'approve') {
      if (!currentNegotiation || currentNegotiation.status !== 'pending_peer_approval') {
        return NextResponse.json({ error: 'No pending commercial quote to approve' }, { status: 400 })
      }

      // Enforce Dual-Approval Guardrail (Maker cannot approve their own quote)
      const currentProposerId = currentNegotiation.proposed_by_id
      const currentProposerEmail = currentNegotiation.proposed_by_email || currentNegotiation.proposed_by_name
      const normalizedAdminEmail = adminEmail.toLowerCase()
      const adminId = admin.id || ''

      const isSameProposer =
        (currentProposerId && (currentProposerId === adminId || currentProposerId === admin.email)) ||
        (currentProposerEmail && (
          currentProposerEmail.toLowerCase() === normalizedAdminEmail ||
          (admin.name && currentProposerEmail.toLowerCase() === admin.name.toLowerCase()) ||
          (admin.full_name && currentProposerEmail.toLowerCase() === admin.full_name.toLowerCase())
        ))

      if (isSameProposer) {
        return NextResponse.json({
          error: 'Maker-Checker Guardrail: You proposed this commercial quote. Another colleague/admin must review and approve it.',
        }, { status: 403 })
      }

      const finalAmount = Number(currentNegotiation.proposed_amount) || 0

      const updatedNegotiation = {
        ...currentNegotiation,
        status: 'approved',
        approved_by_id: adminIdentifier,
        approved_by_name: adminName,
        approved_by_email: adminEmail,
        approved_at: new Date().toISOString(),
        approval_notes: notes || '',
        history: [
          ...(currentNegotiation.history || []),
          {
            amount: finalAmount,
            by_id: adminIdentifier,
            by_name: adminName,
            by_email: adminEmail,
            at: new Date().toISOString(),
            notes: notes || '',
            action: 'approved',
          },
        ],
      }

      const updatedFormData = {
        ...currentFormData,
        total_deal: finalAmount,
        agreed_commercial: finalAmount,
        commercial_amount: finalAmount,
        negotiation: updatedNegotiation,
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: updatedFormData,
          pending_amount: finalAmount,
          status: 'Approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw updateErr

      // Send approval notification email
      const { data: appWithUser } = await supabase
        .from('applications')
        .select('users ( email, full_name ), campaigns ( brand_name, campaign_code )')
        .eq('id', id)
        .single()

      if (appWithUser) {
        const userEmail = (appWithUser as any)?.users?.email
        const userName = (appWithUser as any)?.users?.full_name || 'Creator'
        const brandName = (appWithUser as any)?.campaigns?.brand_name || 'Campaign'
        const campaignCode = (appWithUser as any)?.campaigns?.campaign_code || ''

        if (userEmail) {
          sendApplicationApprovedEmail(userEmail, userName, brandName, campaignCode)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Commercial of ₹${finalAmount.toLocaleString()} approved by ${adminName}! Application is now Approved.`,
      })
    }

    // ──────────────────────────────────────────────
    // 3. REJECT NEGOTIATED COMMERCIAL
    // ──────────────────────────────────────────────
    if (action === 'reject') {
      const updatedNegotiation = {
        ...currentNegotiation,
        status: 'rejected',
        rejected_by_id: adminIdentifier,
        rejected_by_name: adminName,
        rejected_at: new Date().toISOString(),
        rejection_notes: notes || '',
        history: [
          ...(currentNegotiation.history || []),
          {
            by_id: adminIdentifier,
            by_name: adminName,
            at: new Date().toISOString(),
            notes: notes || '',
            action: 'rejected',
          },
        ],
      }

      const { error: updateErr } = await supabase
        .from('applications')
        .update({
          form_data: { ...currentFormData, negotiation: updatedNegotiation },
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)

      if (updateErr) throw updateErr

      return NextResponse.json({
        success: true,
        message: 'Negotiated commercial quote rejected.',
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    console.error('API /admin/applications/[id]/commercial Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
