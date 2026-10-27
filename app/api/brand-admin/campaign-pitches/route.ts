import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'
import type { CampaignPitchItem } from '@/types/campaign-pitch'

export async function GET(request: Request) {
  try {
    const admin = (await getBrandAdminFromRequest()) || (await getAdminFromRequest())
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Brand Admin or Admin session required' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const brandFilter = searchParams.get('brand') || 'all'
    const campaignFilter = searchParams.get('campaign') || 'all'
    const batchFilter = searchParams.get('batch') || 'all'
    const statusFilter = searchParams.get('status') || 'all'
    const search = searchParams.get('search')?.trim().toLowerCase() || ''

    // 1. Fetch available brands and campaigns for the filter dropdowns
    const filterMetadataRes = await pool.query(`
      SELECT DISTINCT 
        c.id as campaign_id,
        c.campaign_code,
        COALESCE(c.category, c.brand_name, c.campaign_code, 'Campaign') as campaign_title,
        c.brand_name
      FROM public.campaigns c
      ORDER BY c.brand_name ASC, c.campaign_code ASC;
    `)

    const brandsSet = new Set<string>()
    const campaignsList: Array<{ id: string; campaign_code: string; title: string; brand_name: string }> = []

    filterMetadataRes.rows.forEach((row) => {
      if (row.brand_name) brandsSet.add(row.brand_name)
      campaignsList.push({
        id: String(row.campaign_id),
        campaign_code: row.campaign_code || '',
        title: row.campaign_title || row.campaign_code || 'Untitled Campaign',
        brand_name: row.brand_name || 'Unassigned',
      })
    })

    // 1.5 Query registered client brand workspaces from public.brands (created in Brand Admin)
    let registeredBrands: Array<{ id: string; name: string; slug: string; assignedKam?: string }> = []
    try {
      const regRes = await pool.query(`
        SELECT 
          b.id, 
          b.name, 
          b.slug,
          COALESCE(adm.name, 'Unassigned') as assigned_kam
        FROM public.brands b
        LEFT JOIN public.admins adm ON b.assigned_1to7_kam_id = adm.id
        WHERE b.status = 'active'
        ORDER BY b.name ASC;
      `)
      registeredBrands = regRes.rows.map(r => ({
        id: String(r.id),
        name: r.name,
        slug: r.slug,
        assignedKam: r.assigned_kam,
      }))
    } catch {
      // Non-fatal if table is uninitialized
    }

    // 2. Fetch pitched / queued applications
    const query = `
      SELECT 
        a.id as application_id,
        a.campaign_id,
        a.status as application_status,
        a.address_status,
        a.address_verified_at,
        c.campaign_code,
        COALESCE(c.category, c.brand_name, c.campaign_code, 'Campaign') as campaign_title,
        COALESCE(c.brand_name, 'Brand') as brand_name,
        c.deliverables,
        a.user_id,
        COALESCE(u.full_name, 'Creator') as creator_name,
        COALESCE(u.influencer_id, '') as influencer_id,
        COALESCE(u.instagram_username, '') as instagram_username,
        COALESCE(u.followers, 0) as followers,
        u.city,
        u.state,
        u.pincode,
        u.mobile,
        u.shipping_addresses,
        u.gender,
        COALESCE(u.instagram_profile_pic, '') as profile_photo,
        COALESCE(a.brand_review_status, 'unpitched') as brand_review_status,
        a.brand_pitch_batch_name,
        a.brand_pitch_notes,
        a.brand_pitched_at,
        a.brand_pitched_by,
        a.brand_reviewed_at,
        a.brand_reviewed_by,
        a.brand_rejection_reason,
        a.brand_feedback_notes,
        a.created_at as applied_at,
        a.form_data
      FROM public.applications a
      JOIN public.campaigns c ON c.id = a.campaign_id
      LEFT JOIN public.users u ON u.id = a.user_id
      WHERE (a.brand_review_status IS NOT NULL AND a.brand_review_status != 'unpitched')
      ORDER BY a.brand_pitched_at DESC NULLS LAST, a.created_at DESC;
    `

    const res = await pool.query(query)
    const rawRows = res.rows || []

    const batchesSet = new Set<string>()

    // Transform and normalize items
    const allItems = rawRows.map((r: any) => {
      const batchName = r.brand_pitch_batch_name || r.form_data?.sent_to_brand_admin?.batch_label || r.form_data?.sent_to_brand?.batch_label || 'Unassigned Batch'
      if (batchName) batchesSet.add(batchName)

      const variant = r.form_data?.sample_variant || r.form_data?.order_details?.size || r.form_data?.shade || null
      const reelLink = r.form_data?.sample_reel_link || r.form_data?.sample_reel_url || r.form_data?.past_work_link || null
      const clientComm = r.form_data?.client_commercial ? Number(r.form_data.client_commercial) : null
      const internalCost = r.form_data?.internal_payout_cost || r.form_data?.internal_cost || r.partial_payment || null

      // Address verification resolution (Strict gatekeeper: Verified ONLY if approved at address desk)
      const formData = r.form_data || {}
      const addrObj = formData.shipping_address || (Array.isArray(r.shipping_addresses) ? r.shipping_addresses[0] : null) || null
      const isVerified = (r.address_status === 'Approved' || formData.address_verified === true)
      const isRejected = (r.address_status === 'Rejected' || formData.address_status === 'Rejected')
      const hasSubmittedAddress = Boolean(formData.address_confirmed === true || addrObj?.address_line1 || r.address_status === 'Pending')

      let addressVerificationStatus: 'Verified' | 'Pending' | 'Rejected' | 'Not Submitted' = 'Not Submitted'
      if (isVerified) {
        addressVerificationStatus = 'Verified'
      } else if (isRejected) {
        addressVerificationStatus = 'Rejected'
      } else if (hasSubmittedAddress) {
        addressVerificationStatus = 'Pending'
      }

      const isReadyForBrandDispatch = (r.application_status === 'Approved' || r.brand_review_status === 'brand_approved') && isVerified

      // Compute structured logistics string ONLY if verified
      let verifiedAddressDetails: CampaignPitchItem['verified_address_details'] = null
      if (isVerified && addrObj) {
        const recipientName = addrObj.recipient_name || addrObj.name || r.creator_name || 'Creator'
        const contactPhone = addrObj.mobile || r.mobile || 'N/A'
        const altPhone = addrObj.alt_mobile || null
        const line1 = addrObj.address_line1 || ''
        const line2 = addrObj.address_line2 || ''
        const landmark = addrObj.landmark || ''
        const city = addrObj.city || r.city || ''
        const state = addrObj.state || r.state || ''
        const pincode = addrObj.pincode || r.pincode || ''
        const deliverableSku = variant || r.deliverables || 'Standard Sample'
        
        const streetDisplay = [line1, line2, landmark ? `Near ${landmark}` : null].filter(Boolean).join(', ')
        const locationDisplay = `${city}${state ? `, ${state}` : ''} — ${pincode}`
        
        const courierCopyText = [
          `📦 RECIPIENT: ${recipientName} (Ph: ${contactPhone}${altPhone ? ` / ${altPhone}` : ''})`,
          `📍 ADDRESS: ${streetDisplay}`,
          `🏙️ LOCATION: ${locationDisplay}`,
          `🏷️ DELIVERABLE / SKU: ${deliverableSku}`,
        ].join('\n')

        verifiedAddressDetails = {
          recipient_name: recipientName,
          phone: contactPhone,
          alt_phone: altPhone,
          street: streetDisplay,
          landmark: landmark || null,
          city,
          state,
          pincode,
          deliverable_sku: deliverableSku,
          courier_copy_text: courierCopyText,
          verified_at: r.address_verified_at || null,
        }
      }

      return {
        application_id: String(r.application_id),
        campaign_id: String(r.campaign_id),
        campaign_code: r.campaign_code,
        campaign_title: r.campaign_title,
        brand_name: r.brand_name,
        user_id: String(r.user_id),
        creator_name: r.creator_name,
        influencer_id: r.influencer_id,
        instagram_username: String(r.instagram_username).replace(/^@/, ''),
        followers: Number(r.followers) || 0,
        city: r.city,
        state: r.state,
        gender: r.gender,
        profile_photo: r.profile_photo,
        brand_review_status: r.brand_review_status,
        brand_pitch_batch_name: batchName,
        brand_pitch_notes: r.brand_pitch_notes,
        brand_pitched_at: r.brand_pitched_at,
        brand_pitched_by: r.brand_pitched_by,
        brand_reviewed_at: r.brand_reviewed_at,
        brand_reviewed_by: r.brand_reviewed_by,
        brand_rejection_reason: r.brand_rejection_reason,
        brand_feedback_notes: r.brand_feedback_notes,
        selected_variant: variant,
        sample_reel_link: reelLink,
        client_commercial: clientComm,
        internal_payout_cost: internalCost ? Number(internalCost) : null,
        applied_at: r.applied_at,
        custom_form_data: r.form_data || {},
        address_verification_status: addressVerificationStatus,
        is_address_verified: isVerified,
        is_ready_for_brand_dispatch: isReadyForBrandDispatch,
        verified_address_details: verifiedAddressDetails,
      }
    })

    // Compute status counts across all items
    const counts = {
      all: allItems.length,
      queued_for_brand_admin: allItems.filter((i) => i.brand_review_status === 'queued_for_brand_admin').length,
      pending_brand_review: allItems.filter((i) => i.brand_review_status === 'pending_brand_review').length,
      brand_approved: allItems.filter((i) => i.brand_review_status === 'brand_approved').length,
      brand_rejected: allItems.filter((i) => i.brand_review_status === 'brand_rejected').length,
      internal_rejected: allItems.filter((i) => i.brand_review_status === 'internal_rejected').length,
    }

    // Apply filters
    const filteredItems = allItems.filter((item) => {
      if (brandFilter !== 'all' && item.brand_name.toLowerCase() !== brandFilter.toLowerCase()) {
        return false
      }
      if (campaignFilter !== 'all' && item.campaign_id !== campaignFilter && item.campaign_code !== campaignFilter) {
        return false
      }
      if (batchFilter !== 'all' && item.brand_pitch_batch_name !== batchFilter) {
        return false
      }
      if (statusFilter !== 'all' && item.brand_review_status !== statusFilter) {
        return false
      }
      if (search) {
        const target = `${item.creator_name} ${item.instagram_username} ${item.influencer_id} ${item.city || ''} ${item.brand_pitch_batch_name || ''} ${item.brand_name || ''} ${item.campaign_code || ''} ${item.campaign_title || ''} ${item.verified_address_details?.pincode || ''} ${item.verified_address_details?.street || ''}`.toLowerCase()
        if (!target.includes(search)) return false
      }
      return true
    })

    return NextResponse.json({
      applications: filteredItems,
      brands: Array.from(brandsSet),
      registeredBrands,
      campaigns: campaignsList,
      batches: Array.from(batchesSet),
      counts,
    })
  } catch (error: any) {
    console.error('Campaign Pitches GET Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error fetching pitches' },
      { status: 500 }
    )
  }
}
