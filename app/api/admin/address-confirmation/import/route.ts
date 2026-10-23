import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

// Normalization utilities
const cleanPhone = (p: any): string => (p ? String(p).replace(/\D/g, '').slice(-10) : '')

const cleanHandle = (h: any): string => {
  if (!h) return ''
  let handle = String(h).trim().toLowerCase()
  // Strip URL if present
  handle = handle.replace(/^(https?:\/\/)?(www\.)?instagram\.com\//i, '')
  handle = handle.replace(/^@/, '').split('/')[0].split('?')[0].trim()
  return handle
}

const cleanEmail = (e: any): string => (e ? String(e).toLowerCase().trim() : '')

function sanitizeText(str: any): string {
  if (!str) return ''
  return String(str)
    .replace(/\r\n/g, ', ')
    .replace(/[\r\n]+/g, ', ')
    .replace(/\s+/g, ' ')
    .trim()
}

function cleanPincode(pin: any): string {
  if (!pin) return ''
  const digits = String(pin).replace(/\D/g, '')
  const match = digits.match(/\d{6}/)
  return match ? match[0] : digits.slice(0, 6)
}

// Flexible header resolver: searches row for matching candidate keys (case-insensitive & fuzzy)
function extractField(row: Record<string, any>, candidateKeys: string[]): string {
  if (!row || typeof row !== 'object') return ''
  const rowKeys = Object.keys(row)
  
  // 1. Direct exact or lower-case match
  for (const cand of candidateKeys) {
    const candLower = cand.toLowerCase().trim()
    for (const rk of rowKeys) {
      if (rk.toLowerCase().trim() === candLower) {
        const val = row[rk]
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim()
        }
      }
    }
  }

  // 2. Partial substring match
  for (const cand of candidateKeys) {
    const candLower = cand.toLowerCase().trim()
    for (const rk of rowKeys) {
      const rkLower = rk.toLowerCase().trim()
      if (rkLower.includes(candLower) || candLower.includes(rkLower)) {
        const val = row[rk]
        if (val !== undefined && val !== null && String(val).trim() !== '') {
          return String(val).trim()
        }
      }
    }
  }

  return ''
}

// GET: Return list of campaigns for the Import Modal dropdown
export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const campaignsRes = await pool.query(`
      SELECT 
        id, 
        campaign_code, 
        brand_name, 
        deliverables, 
        address_required, 
        order_form,
        created_at
      FROM public.campaigns
      ORDER BY created_at DESC
    `)

    return NextResponse.json({
      success: true,
      campaigns: campaignsRes.rows
    })
  } catch (error: any) {
    console.error('API /admin/address-confirmation/import GET Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

// POST: Intelligent Ingestion (Dry Run or Live Commit)
export async function POST(request: Request) {
  let client: any = null
  try {
    const admin = await getAdminFromRequest()
    if (!admin || (!hasActionPermission(admin, 'applications', 'update') && !hasActionPermission(admin, 'order_details', 'update'))) {
      return NextResponse.json({ error: 'Unauthorized: Permission to import and verify addresses is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { campaign_id, rows, options = {} } = body

    if (!campaign_id) {
      return NextResponse.json({ error: 'campaign_id is required' }, { status: 400 })
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided in import file' }, { status: 400 })
    }

    const autoApproveCampaign = options.auto_approve_campaign !== false // default: true
    const autoApproveAddress = options.auto_approve_address !== false // default: true
    const isDryRun = Boolean(options.dry_run)

    client = await pool.connect()

    // 1. Fetch Campaign
    const campRes = await client.query(
      'SELECT id, campaign_code, brand_name, deliverables FROM public.campaigns WHERE id = $1',
      [campaign_id]
    )
    if (campRes.rows.length === 0) {
      return NextResponse.json({ error: 'Selected campaign not found' }, { status: 404 })
    }
    const campaign = campRes.rows[0]

    // 2. Fetch All Platform Users for Lookup Maps
    const usersRes = await client.query(`
      SELECT 
        id, full_name, influencer_id, email, mobile, 
        instagram_username, followers, city, state, pincode, 
        shipping_addresses 
      FROM public.users
    `)

    const userByPhone = new Map<string, any>()
    const userByHandle = new Map<string, any>()
    const userByEmail = new Map<string, any>()

    usersRes.rows.forEach(u => {
      if (u.mobile) {
        const ph = cleanPhone(u.mobile)
        if (ph.length >= 10) userByPhone.set(ph, u)
      }
      if (u.instagram_username) {
        const h = cleanHandle(u.instagram_username)
        if (h) userByHandle.set(h, u)
      }
      if (u.email) {
        const em = cleanEmail(u.email)
        if (em) userByEmail.set(em, u)
      }
    })

    // 3. Fetch Existing Applications for this campaign
    const existingAppsRes = await client.query(
      'SELECT id, user_id, campaign_id, status, address_status, form_data FROM public.applications WHERE campaign_id = $1',
      [campaign.id]
    )
    const existingAppByUserId = new Map<string, any>()
    existingAppsRes.rows.forEach(a => existingAppByUserId.set(a.user_id, a))

    // 4. Candidate Identification & In-Batch Deduplication
    const candidates = new Map<string, any>()
    const unmatchedRows: any[] = []

    rows.forEach((row, idx) => {
      const rawPhone = extractField(row, [
        'Mobile Number', 'Contact Mobile', 'Phone Number', 'Mobile', 
        'Phone', 'Contact Number', 'WhatsApp Number', 'Primary Phone'
      ])
      const rawAltPhone = extractField(row, [
        'Altername Number (If any)', 'Alternate Number', 'Alternate Phone', 
        'Secondary Phone', 'Alt Mobile', 'Alt Phone'
      ])
      const rawHandle = extractField(row, [
        'User Name', 'Instagram Username', 'Instagram Handle', 
        'Instagram', 'IG Handle', 'Handle', 'Username'
      ])
      const rawEmail = extractField(row, ['Email Id', 'Email', 'Email Address'])
      const rawName = extractField(row, ['Full Name', 'Name', 'Recipient Name', 'Creator Name', 'Influencer Name'])
      const rawAddress = extractField(row, [
        'Complete Delivery Address', 'Delivery Address', 'Address', 
        'Street Address', 'Shipping Address', 'Address Line 1'
      ])
      const rawLandmark = extractField(row, ['Landmark', 'Near Landmark', 'Land Mark'])
      const rawCity = extractField(row, ['City', 'Town', 'District'])
      const rawState = extractField(row, ['State', 'Province'])
      const rawPincode = extractField(row, ['Pincode', 'PIN Code', 'Postal Code', 'Zip', 'Zip Code', 'Pincode (6 Digit)'])
      const rawRemarks = extractField(row, ['Delivery Remarks', 'Remarks', 'Courier Remarks', 'Notes', 'Delivery Notes'])

      const phone = cleanPhone(rawPhone)
      const altPhone = cleanPhone(rawAltPhone)
      const handle = cleanHandle(rawHandle)
      const email = cleanEmail(rawEmail)

      // Fallback matching cascade: Phone -> Instagram Handle -> Email
      const matchedUser = 
        (phone.length >= 10 ? userByPhone.get(phone) : null) ||
        (handle ? userByHandle.get(handle) : null) ||
        (email ? userByEmail.get(email) : null)

      if (!matchedUser) {
        unmatchedRows.push({
          row_index: idx + 1,
          name: rawName || 'Unknown',
          mobile: rawPhone || 'N/A',
          instagram_username: rawHandle || 'N/A',
          email: rawEmail || 'N/A',
          city: rawCity || 'N/A',
          state: rawState || 'N/A',
          pincode: rawPincode || 'N/A',
          reason: 'No registered creator found with matching phone, handle, or email'
        })
        return
      }

      // Deduplicate in batch: keep latest submission per matched creator
      candidates.set(matchedUser.id, {
        row_index: idx + 1,
        raw_row: row,
        user: matchedUser,
        existing_app: existingAppByUserId.get(matchedUser.id) || null,
        parsed: {
          recipient_name: sanitizeText(rawName || matchedUser.full_name || 'Creator'),
          mobile: phone || cleanPhone(matchedUser.mobile),
          alt_mobile: altPhone && altPhone !== phone ? altPhone : undefined,
          address_line1: sanitizeText(rawAddress),
          landmark: sanitizeText(rawLandmark),
          city: sanitizeText(rawCity || matchedUser.city || ''),
          state: sanitizeText(rawState || matchedUser.state || '').toUpperCase(),
          pincode: cleanPincode(rawPincode || matchedUser.pincode),
          delivery_remarks: sanitizeText(rawRemarks) || `Imported via Admin Address Desk (${new Date().toISOString().slice(0, 10)})`
        }
      })
    })

    // 5. Categorize candidate actions
    const exactDuplicates: any[] = []
    const upgrades: any[] = []
    const newApplications: any[] = []

    candidates.forEach((cand) => {
      const existing = cand.existing_app
      if (existing && existing.status === 'Approved' && existing.address_status === 'Approved') {
        exactDuplicates.push({
          user_id: cand.user.id,
          name: cand.user.full_name,
          handle: cand.user.instagram_username,
          phone: cand.user.mobile,
          reason: 'Already Approved for this Campaign with Verified Address'
        })
      } else if (existing) {
        upgrades.push({
          user_id: cand.user.id,
          application_id: existing.id,
          name: cand.user.full_name,
          handle: cand.user.instagram_username,
          current_campaign_status: existing.status,
          current_address_status: existing.address_status || 'Pending',
          candidate: cand
        })
      } else {
        newApplications.push({
          user_id: cand.user.id,
          name: cand.user.full_name,
          handle: cand.user.instagram_username,
          candidate: cand
        })
      }
    })

    // If Dry Run: Return preview without mutating database
    if (isDryRun) {
      return NextResponse.json({
        success: true,
        dry_run: true,
        summary: {
          totalRowsInFile: rows.length,
          uniqueMatchedCandidates: candidates.size,
          upgradesCount: upgrades.length,
          newApplicationsCount: newApplications.length,
          exactDuplicatesSkipped: exactDuplicates.length,
          unmatchedCount: unmatchedRows.length
        },
        breakdown: {
          campaign: {
            id: campaign.id,
            brand_name: campaign.brand_name,
            campaign_code: campaign.campaign_code
          },
          will_upgrade_sample: upgrades.slice(0, 10).map(u => ({
            name: u.name,
            handle: u.handle,
            from_status: `${u.current_campaign_status} / ${u.current_address_status}`,
            to_status: `${autoApproveCampaign ? 'Approved' : u.current_campaign_status} / ${autoApproveAddress ? 'Approved' : 'Pending'}`
          })),
          will_insert_sample: newApplications.slice(0, 10).map(n => ({
            name: n.name,
            handle: n.handle,
            new_status: `${autoApproveCampaign ? 'Approved' : 'Applied'} / ${autoApproveAddress ? 'Approved' : 'Pending'}`
          })),
          exact_duplicates_sample: exactDuplicates.slice(0, 10).map(d => ({
            name: d.name,
            handle: d.handle,
            status: 'Skipping (Already Approved & Verified)'
          })),
          unmatched_sample: unmatchedRows.slice(0, 20)
        }
      })
    }

    // 6. Execution: Run within Database Transaction
    await client.query('BEGIN')

    let profilesUpdatedCount = 0
    let applicationsUpdatedCount = 0
    let applicationsInsertedCount = 0
    const nowIso = new Date().toISOString()
    const adminIdentifier = admin.name || admin.email || 'Admin'

    for (const [, cand] of candidates.entries()) {
      const u = cand.user
      const p = cand.parsed
      const existing = cand.existing_app

      // Skip exact duplicates safely
      if (existing && existing.status === 'Approved' && existing.address_status === 'Approved') {
        continue
      }

      // Generate structured shipping address object
      const shippingAddressId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
      const shippingAddressObj = {
        id: shippingAddressId,
        title: 'Home',
        recipient_name: p.recipient_name,
        name: p.recipient_name,
        mobile: p.mobile,
        alt_mobile: p.alt_mobile,
        address_line1: p.address_line1,
        address_line2: '',
        landmark: p.landmark,
        city: p.city,
        state: p.state,
        pincode: p.pincode,
        delivery_remarks: p.delivery_remarks,
        address_type: 'home',
        is_default: true,
        created_at: nowIso,
        updated_at: nowIso,
        confirmed_at: nowIso
      }

      const formattedAddress = `${p.address_line1}${p.landmark ? `, Near ${p.landmark}` : ''}, ${p.city}, ${p.state} - ${p.pincode} (Recipient: ${p.recipient_name}, Ph: ${p.mobile})`

      // 1. Sync User Profile Address Book
      let existingAddresses = Array.isArray(u.shipping_addresses) ? [...u.shipping_addresses] : []
      existingAddresses = existingAddresses.map((a: any) => ({ ...a, is_default: false }))
      existingAddresses.unshift(shippingAddressObj)
      if (existingAddresses.length > 5) existingAddresses = existingAddresses.slice(0, 5)

      await client.query(`
        UPDATE public.users
        SET
          shipping_addresses = $1,
          city = COALESCE(NULLIF(city, ''), $2),
          state = COALESCE(NULLIF(state, ''), $3),
          pincode = COALESCE(NULLIF(pincode, ''), $4),
          updated_at = $5
        WHERE id = $6
      `, [JSON.stringify(existingAddresses), p.city, p.state, p.pincode, nowIso, u.id])
      profilesUpdatedCount++

      // 2. Sync Campaign Application
      if (existing) {
        // Upgrade existing application in-place
        const currentFd = existing.form_data || {}
        const updatedFd = {
          ...currentFd,
          shipping_address: shippingAddressObj,
          formatted_shipping_address: formattedAddress,
          address_status: autoApproveAddress ? 'Approved' : (existing.address_status || 'Pending'),
          address_verified: autoApproveAddress ? true : Boolean(currentFd.address_verified),
          address_confirmed: true,
          address_verified_at: autoApproveAddress ? nowIso : (existing.address_verified_at || null),
          address_confirmed_at: nowIso,
          address_verified_by_admin: autoApproveAddress ? adminIdentifier : (currentFd.address_verified_by_admin || null),
          address_rejection_reason: null,
          imported_at: nowIso
        }

        await client.query(`
          UPDATE public.applications
          SET
            status = $1,
            address_status = $2,
            address_verified_at = $3,
            address_verified_by = $4,
            form_data = $5,
            updated_at = $6
          WHERE id = $7
        `, [
          autoApproveCampaign ? 'Approved' : existing.status,
          autoApproveAddress ? 'Approved' : existing.address_status,
          autoApproveAddress ? nowIso : existing.address_verified_at,
          autoApproveAddress ? admin.id : existing.address_verified_by,
          JSON.stringify(updatedFd),
          nowIso,
          existing.id
        ])
        applicationsUpdatedCount++
      } else {
        // Insert new approved application
        const newFd = {
          shipping_address: shippingAddressObj,
          formatted_shipping_address: formattedAddress,
          address_status: autoApproveAddress ? 'Approved' : 'Pending',
          address_verified: autoApproveAddress,
          address_confirmed: true,
          address_verified_at: autoApproveAddress ? nowIso : null,
          address_confirmed_at: nowIso,
          address_verified_by_admin: autoApproveAddress ? adminIdentifier : null,
          applied_instagram_username: u.instagram_username || cleanHandle(p.recipient_name),
          applied_instagram_followers: u.followers || 0,
          deliverables: campaign.deliverables || '1 Reel + 1 Story',
          'Are you comfortable with deliverables?': 'Yes',
          'Do you agree to do this campaign on Barter Collaboration?': 'Yes',
          imported_at: nowIso,
          source: 'Admin Address Desk File Import'
        }

        await client.query(`
          INSERT INTO public.applications (
            user_id,
            campaign_id,
            status,
            address_status,
            address_verified_at,
            address_verified_by,
            form_data,
            created_at,
            updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          u.id,
          campaign.id,
          autoApproveCampaign ? 'Approved' : 'Applied',
          autoApproveAddress ? 'Approved' : 'Pending',
          autoApproveAddress ? nowIso : null,
          autoApproveAddress ? admin.id : null,
          JSON.stringify(newFd),
          nowIso,
          nowIso
        ])
        applicationsInsertedCount++
      }
    }

    await client.query('COMMIT')

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${candidates.size} creators! Upgraded ${applicationsUpdatedCount}, inserted ${applicationsInsertedCount}, skipped ${exactDuplicates.length} duplicates.`,
      stats: {
        totalRowsInFile: rows.length,
        uniqueCandidates: candidates.size,
        applicationsUpdated: applicationsUpdatedCount,
        applicationsInserted: applicationsInsertedCount,
        profilesUpdated: profilesUpdatedCount,
        exactDuplicatesSkipped: exactDuplicates.length,
        unmatchedCount: unmatchedRows.length
      },
      unmatchedRows: unmatchedRows.slice(0, 50)
    })
  } catch (error: any) {
    if (client) {
      try {
        await client.query('ROLLBACK')
      } catch (rbErr) {
        console.error('Rollback error:', rbErr)
      }
    }
    console.error('API /admin/address-confirmation/import POST Error:', error)
    return NextResponse.json({ error: error.message || 'Import transaction failed' }, { status: 500 })
  } finally {
    if (client) client.release()
  }
}
