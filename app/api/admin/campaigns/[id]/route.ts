import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'
import { computeCampaignDiff, CampaignEditLogEntry } from '@/lib/utils/campaign-audit-diff'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'campaigns')) {
      return NextResponse.json({ error: 'Unauthorized: Access to campaigns is restricted' }, { status: 403 })
    }

    const { id } = await params

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('API /admin/campaigns/[id] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'campaigns', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to edit campaigns is denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Fetch existing campaign snapshot to compute exact field-level diff
    const { data: existingCampaign, error: fetchError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !existingCampaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const adminName = admin.full_name || admin.name || 'Admin'
    const adminEmail = admin.email || ''

    // 0. Dedicated Operational Handler for Live / Offline Publication Toggle
    // Triggered when admin toggles the Live/Offline switch on campaign cards.
    // Unlike specification edits (which require 2nd-admin review), toggling an already-approved
    // campaign online or offline is an operational switch that must persist immediately to PostgreSQL.
    const bodyKeys = Object.keys(body).filter(k => k !== 'id')
    const isLiveToggleOnly = body.is_live !== undefined && bodyKeys.length === 1 && bodyKeys[0] === 'is_live'

    if (isLiveToggleOnly) {
      const targetIsLive = Boolean(body.is_live)
      const isSuperAdmin = admin.role === 'super_admin' || Boolean(admin.is_super_admin)
      const isApproved = existingCampaign.approval_status === 'Approved' || existingCampaign.approval_status === null
      const isPilot = Boolean(existingCampaign.is_test_mode)

      // Guard: Strict Maker-Checker dual control governance
      // Unapproved/Rejected public campaigns CANNOT be toggled Live without 2nd admin approval (unless Super Admin)
      if (targetIsLive && !isApproved && !isPilot && !isSuperAdmin) {
        return NextResponse.json({
          error: 'Dual control policy: Cannot publish campaign live without 2nd Admin approval.'
        }, { status: 403 })
      }

      const toggleUpdates: Record<string, any> = {
        is_live: targetIsLive,
        last_edited_by_admin_id: admin.id,
        last_edited_by_admin_name: adminName,
        last_edited_by_admin_email: adminEmail,
        last_edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // If bringing live, ensure status is 'Active'
      if (targetIsLive) {
        toggleUpdates.status = 'Active'
        if (!isApproved && isSuperAdmin) {
          toggleUpdates.approval_status = 'Approved'
          toggleUpdates.approved_by_admin_id = admin.id
          toggleUpdates.approved_by_admin_name = adminName
          toggleUpdates.approved_by_admin_email = adminEmail
          toggleUpdates.approved_at = new Date().toISOString()
        }
      }

      // Record operational toggle in edit history
      if (existingCampaign.is_live !== targetIsLive) {
        const diffEntry: CampaignEditLogEntry = {
          id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          timestamp: new Date().toISOString(),
          edited_by_admin_id: admin.id,
          edited_by_admin_name: adminName,
          edited_by_admin_email: adminEmail,
          summary: targetIsLive ? 'Published Campaign Live' : 'Took Campaign Offline (Paused)',
          changes_count: 1,
          changes: [{
            field: 'is_live',
            label: 'Live Publication Status',
            category: 'general',
            old_value: existingCampaign.is_live,
            new_value: targetIsLive,
            old_display: existingCampaign.is_live ? 'Live' : 'Offline',
            new_display: targetIsLive ? 'Live' : 'Offline',
          }],
        }
        const existingHistory: CampaignEditLogEntry[] = Array.isArray(existingCampaign.edit_history)
          ? existingCampaign.edit_history
          : []
        toggleUpdates.edit_history = [diffEntry, ...existingHistory].slice(0, 30)
      }

      const { data: campaign, error } = await supabase
        .from('campaigns')
        .update(toggleUpdates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      return NextResponse.json({
        success: true,
        message: targetIsLive ? 'Campaign is now live!' : 'Campaign taken offline.',
        campaign,
      })
    }

    // Only allow updating campaign content/configuration fields
    // is_live and status are strictly managed through the dual-approval workflow
    const allowedFields = [
      'campaign_code', 'brand_name', 'category', 'platform', 'budget_type',
      'budget_amount', 'partial_payment_enabled', 'partial_payment_config',
      'deliverables', 'product_links', 'requirements',
      'gender_required',
      'location', 'location_type', 'target_states', 'target_cities', 'store_locations', 'enforce_location',
      'looking_for', 'followers', 'min_followers', 'enforce_followers', 'additional_info',
      'collab_date', 'form_link', 'form_fields',
      'order_form', 'order_form_fields', 'show_order_form', 'payment_form_fields',
      'address_required',
      'completion_days', 'completion_deadline', 'enforce_completion_deadline',
      'display_order', 'brief_document_url',
      'is_test_mode', 'test_user_ids', 'test_creators',
      'poc_admin_ids', 'manager_phone'
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid campaign fields provided for update.' }, { status: 400 })
    }

    // Auto-sync manager_phone if poc_admin_ids changed and manager_phone was not explicitly specified
    if (updates.poc_admin_ids !== undefined && body.manager_phone === undefined) {
      if (Array.isArray(updates.poc_admin_ids) && updates.poc_admin_ids.length > 0) {
        try {
          const pocRes = await pool.query('SELECT phone, creator_view_phone FROM public.admins WHERE id = $1', [updates.poc_admin_ids[0]])
          if (pocRes.rows[0]?.creator_view_phone || pocRes.rows[0]?.phone) {
            updates.manager_phone = pocRes.rows[0].creator_view_phone || pocRes.rows[0].phone
          }
        } catch (err) {
          console.warn('Non-fatal error resolving POC phone during campaign update:', err)
        }
      }
    }

    // Sanitize and validate campaign_code if provided
    if (body.campaign_code !== undefined) {
      const cleanCode = String(body.campaign_code).trim().toUpperCase()
      if (!cleanCode) {
        return NextResponse.json({ error: 'Campaign ID / Code cannot be empty' }, { status: 400 })
      }
      if (cleanCode !== existingCampaign.campaign_code) {
        const { data: codeConflict } = await supabase
          .from('campaigns')
          .select('id')
          .eq('campaign_code', cleanCode)
          .neq('id', id)
          .maybeSingle()

        if (codeConflict) {
          return NextResponse.json({ error: `Campaign Code "${cleanCode}" is already in use by another campaign.` }, { status: 400 })
        }
        updates.campaign_code = cleanCode
      }
    }

    // Strict Maker-Checker Rule for Public Campaigns:
    // Any detail edit IMMEDIATELY revokes approval and requires clean 2nd admin approval before Go Live.
    // In Pilot Test Mode, campaign stays active so test creators can continue end-to-end verification.
    // POC assignment changes alone do NOT revoke live status, ensuring production campaigns remain operational.
    const isPocOnlyEdit = Object.keys(updates).every(k => k === 'poc_admin_ids' || k === 'manager_phone')
    const isPilot = updates.is_test_mode !== undefined ? Boolean(updates.is_test_mode) : Boolean(existingCampaign.is_test_mode)

    if (isPocOnlyEdit) {
      // Retain existing approval status when only updating assigned POCs
      updates.approval_status = existingCampaign.approval_status
      updates.status = existingCampaign.status
      updates.is_live = existingCampaign.is_live
    } else if (isPilot) {
      updates.approval_status = 'Approved'
      updates.status = 'Active'
      updates.is_live = true
    } else {
      updates.approval_status = 'Pending Approval'
      updates.status = 'Review'
      updates.is_live = false
      updates.approved_by_admin_id = null
      updates.approved_by_admin_name = null
      updates.approved_by_admin_email = null
      updates.approved_at = null
      updates.rejection_reason = null
    }

    // Track the latest editor
    updates.last_edited_by_admin_id = admin.id
    updates.last_edited_by_admin_name = adminName
    updates.last_edited_by_admin_email = adminEmail
    updates.last_edited_at = new Date().toISOString()
    updates.updated_at = new Date().toISOString()

    // Compute diff and record audit log
    const diffEntry = computeCampaignDiff(existingCampaign, updates, admin)
    if (diffEntry) {
      const existingHistory: CampaignEditLogEntry[] = Array.isArray(existingCampaign.edit_history)
        ? existingCampaign.edit_history
        : []
      // Prepend latest diff (keep up to 30 historical edits)
      updates.edit_history = [diffEntry, ...existingHistory].slice(0, 30)
    }

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // If campaign_code changed, cascade update to apply_form_config
    if (updates.campaign_code && existingCampaign.campaign_code && updates.campaign_code !== existingCampaign.campaign_code) {
      await supabase
        .from('apply_form_config')
        .update({ campaign_code: updates.campaign_code })
        .eq('campaign_code', existingCampaign.campaign_code)
    }

    return NextResponse.json({
      success: true,
      message: 'Campaign updated and submitted for 2nd Admin Approval.',
      campaign,
      diff: diffEntry
    })
  } catch (error) {
    console.error('API /admin/campaigns/[id] PUT Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'campaigns', 'delete')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to delete campaigns is denied' }, { status: 403 })
    }

    const { id } = await params

    // 1. Delete associated applications first to handle FK constraint
    await supabase.from('applications').delete().eq('campaign_id', id)

    // 2. Delete campaign record from DB
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Campaign deleted permanently' })
  } catch (error: any) {
    console.error('API /admin/campaigns/[id] DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete campaign' }, { status: 500 })
  }
}
