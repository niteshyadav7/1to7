import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

// Default password hash for imported users ('12345') - they can change it later
const DEFAULT_PASSWORD_HASH = '$2b$10$rgMNYfe45OpevM8273RF2uFRjsAxq4ScGzgGOBtaywvDNKpqFJ7Wm'

function parseFollowersCount(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') return isNaN(val) ? null : val
  const str = String(val).trim().toUpperCase()
  if (!str) return null
  if (str.endsWith('K')) {
    const num = parseFloat(str.replace('K', ''))
    return isNaN(num) ? null : Math.round(num * 1000)
  }
  if (str.endsWith('M')) {
    const num = parseFloat(str.replace('M', ''))
    return isNaN(num) ? null : Math.round(num * 1000000)
  }
  const cleaned = str.replace(/[^0-9.]/g, '')
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}

function cleanPincode(p: any): string | null {
  if (!p) return null
  const d = String(p).replace(/\D/g, '')
  const m = d.match(/\d{6}/)
  return m ? m[0] : (d.length >= 6 ? d.slice(0, 6) : null)
}

function sanitizeAddress(str: any): string {
  if (!str) return ''
  return String(str).replace(/\r\n/g, ', ').replace(/[\r\n]+/g, ', ').replace(/\s+/g, ' ').trim()
}

interface ImportRow {
  influencer_id?: string
  mobile?: string
  full_name?: string
  email?: string
  instagram_username?: string
  followers?: string | number
  gender?: string
  state?: string
  city?: string
  address?: string
  pincode?: string
  alt_mobile?: string
  recipient_name?: string
  address_status?: string
  status?: string
  form_data?: Record<string, any>
  agreed_commercial?: number
  partial_payment?: number
  final_payment?: number
  pending_amount?: number
  order_id?: string
  account_name?: string
  account_number?: string
  ifsc_code?: string
  category?: string
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || (!hasActionPermission(admin, 'import', 'create') && !hasActionPermission(admin, 'applications', 'create'))) {
      return NextResponse.json({ error: 'Unauthorized: Permission to import is denied' }, { status: 403 })
    }

    const body = await request.json()
    const { rows, campaign_id } = body as { rows: ImportRow[]; campaign_id: string }

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }
    if (rows.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 rows per import' }, { status: 400 })
    }

    let campaign: { id: string; campaign_code: string; brand_name: string; deliverables?: string } | null = null
    if (campaign_id) {
      // Verify the campaign exists
      const { data, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, campaign_code, brand_name, deliverables')
        .eq('id', campaign_id)
        .single()

      if (campaignError || !data) {
        return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
      }
      campaign = data
    }

    // Valid application statuses
    const validStatuses = ['Applied', 'Approved', 'Rejected', 'Completed', 'Payment Initiated', 'Payment Requested']

    const results = {
      total: rows.length,
      created_users: 0,
      existing_users: 0,
      applications_created: 0,
      applications_updated: 0,
      skipped: 0,
      errors: [] as { row: number; mobile: string; error: string }[],
    }

    // 1. Gather all mobiles and influencer_ids in this batch
    const validRows: { row: ImportRow; rowIndex: number; mobile: string; influencerId?: string }[] = []
    const mobiles: string[] = []
    const influencerIds: string[] = []

    rows.forEach((row, idx) => {
      const rowIndex = idx + 1
      let mobile = row.mobile ? String(row.mobile).replace(/[\s\-\+\(\)]/g, '').trim() : ''
      if (mobile.startsWith('91') && mobile.length === 12) {
        mobile = mobile.slice(2)
      } else if (mobile.startsWith('0') && mobile.length === 11) {
        mobile = mobile.slice(1)
      }
      const influencerId = row.influencer_id ? String(row.influencer_id).trim() : undefined

      if (!mobile && !influencerId) {
        results.errors.push({ row: rowIndex, mobile: '(empty)', error: 'Mobile or User ID is required' })
        results.skipped++
        return
      }

      validRows.push({ row, rowIndex, mobile, influencerId })
      if (mobile) mobiles.push(mobile)
      if (influencerId) influencerIds.push(influencerId)
    })

    if (validRows.length === 0) {
      return NextResponse.json({ success: true, results })
    }

    // 2. Fetch all existing users in ONE query (or two if influencerIds exist)
    const existingUsersMap = new Map<string, any>() // key by mobile AND by influencer_id

    if (mobiles.length > 0) {
      const { data: byMobiles } = await supabase
        .from('users')
        .select('id, mobile, influencer_id, account_number, account_name, ifsc_code, category, full_name, instagram_username, gender, state, city, followers, dob, pincode, shoe_size, tshirt_size, alt_mobile, shipping_addresses')
        .in('mobile', mobiles)
      
      byMobiles?.forEach(u => {
        if (u.mobile) existingUsersMap.set(`m:${u.mobile}`, u)
        if (u.influencer_id) existingUsersMap.set(`id:${u.influencer_id}`, u)
      })
    }

    if (influencerIds.length > 0) {
      const { data: byIds } = await supabase
        .from('users')
        .select('id, mobile, influencer_id, account_number, account_name, ifsc_code, category, full_name, instagram_username, gender, state, city, followers, dob, pincode, shoe_size, tshirt_size, alt_mobile, shipping_addresses')
        .in('influencer_id', influencerIds)
      
      byIds?.forEach(u => {
        if (u.mobile) existingUsersMap.set(`m:${u.mobile}`, u)
        if (u.influencer_id) existingUsersMap.set(`id:${u.influencer_id}`, u)
      })
    }

    // 3. Separate into existing users vs new users with in-batch duplicate merging
    const toUpdateUsers: { userId: string; updates: Record<string, any>; rowItem: typeof validRows[0] }[] = []
    const toCreateUsers: { rowItem: typeof validRows[0]; userData: any }[] = []
    const inBatchCreatedMobiles = new Map<string, any>()

    for (const item of validRows) {
      const { row, mobile, influencerId } = item
      const existingByMobile = mobile ? existingUsersMap.get(`m:${mobile}`) : null
      const existingById = influencerId ? existingUsersMap.get(`id:${influencerId}`) : null

      let existing: any = null

      if (existingByMobile) {
        // Matched by verified mobile - legitimate existing creator
        existing = existingByMobile
      } else if (existingById) {
        // Matched only by influencer_id (e.g. HY24611 from CSV)
        // Check for conflicts: if phone or name is completely different, this is NOT the same person!
        const isPhoneConflict = mobile && existingById.mobile && mobile !== existingById.mobile
        const isNameConflict = existingById.full_name && 
                               existingById.full_name !== 'Imported Creator' && 
                               row.full_name?.trim() && 
                               row.full_name.trim().toLowerCase() !== existingById.full_name.toLowerCase()

        if (isPhoneConflict || isNameConflict) {
          // Conflict detected! Do NOT overwrite existing user! Instead, generate a fresh unique sequential ID.
          existing = null
          item.influencerId = undefined
        } else {
          existing = existingById
        }
      }

      // Extract any profile canonical answers from form_data if present
      const fd = (row.form_data && typeof row.form_data === 'object') ? row.form_data : {}
      const findFdVal = (patterns: RegExp[]): string | null => {
        for (const [key, value] of Object.entries(fd)) {
          if (patterns.some(p => p.test(key.trim()))) {
            const val = String(value || '').trim()
            if (val) return val
          }
        }
        return null
      }

      const dobVal = findFdVal([/^(dob|d\.o\.b\.?|date\s*of\s*birth|birth\s*date|birthday)$/i])
      const pincodeVal = cleanPincode(row.pincode) || cleanPincode(findFdVal([/^(pincode|pin\s*code|zip|zipcode|postal\s*code|delivery\s*pincode)$/i]))
      const shoeVal = findFdVal([/^(shoe\s*size|footwear\s*size)$/i])
      const tshirtVal = findFdVal([/^(t-?shirt\s*size|shirt\s*size|clothing\s*size|cloth\s*size)$/i])
      const altMobileVal = row.alt_mobile || findFdVal([/^(alt(ernate)?\s*(mobile|phone|contact|number)|whatsapp(\s*(number|no))?)$/i])
      const addressVal = sanitizeAddress(row.address || findFdVal([/^(complete\s*delivery\s*address|delivery\s*address|shipping\s*address|street\s*address|address\s*line\s*1|address)$/i]))
      const recipientNameVal = sanitizeAddress(row.recipient_name || row.full_name || findFdVal([/^(recipient\s*name|contact\s*person)$/i]))

      let shippingAddressObj: any = null
      if (addressVal) {
        const addrId = `addr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
        const recipient = recipientNameVal || (existing?.full_name && existing.full_name !== 'Imported Creator' ? existing.full_name : '') || row.full_name?.trim() || 'Creator'
        const phone = mobile || existing?.mobile || ''
        const city = row.city?.trim() || existing?.city || ''
        const state = (row.state?.trim() || existing?.state || '').toUpperCase()
        const pin = pincodeVal || existing?.pincode || ''

        shippingAddressObj = {
          id: addrId,
          title: 'Home',
          recipient_name: recipient,
          name: recipient,
          mobile: phone,
          ...(altMobileVal ? { alt_mobile: altMobileVal } : {}),
          address_line1: addressVal,
          address_line2: '',
          landmark: '',
          city: city,
          state: state,
          pincode: pin,
          delivery_remarks: 'Imported via Admin Portal',
          is_default: true,
          address_type: 'home',
          created_at: new Date().toISOString(),
          confirmed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      }
      (item as any).shippingAddressObj = shippingAddressObj

      if (existing) {
        // User already exists in DB - safely update missing fields only (never overwrite existing real data)
        const updates: Record<string, any> = {}
        if (!existing.account_name && row.account_name) updates.account_name = row.account_name
        if (!existing.account_number && row.account_number) updates.account_number = row.account_number
        if (!existing.ifsc_code && row.ifsc_code) updates.ifsc_code = row.ifsc_code
        if (!existing.category && row.category) updates.category = row.category
        
        // Only update full_name if existing is blank or placeholder
        if ((!existing.full_name || existing.full_name === 'Imported Creator') && row.full_name?.trim()) {
          updates.full_name = row.full_name.trim()
        }
        // Only update instagram_username if existing is blank
        if (!existing.instagram_username && row.instagram_username?.trim()) {
          updates.instagram_username = row.instagram_username.trim()
        }
        if (!existing.gender && row.gender?.trim()) updates.gender = row.gender.trim()
        if (!existing.state && row.state?.trim()) updates.state = row.state.trim()
        if (!existing.city && row.city?.trim()) updates.city = row.city.trim()
        if (row.followers !== undefined && row.followers !== null && row.followers !== '') {
          const parsedFollowers = parseFollowersCount(row.followers)
          if (parsedFollowers !== null && parsedFollowers > 0) {
            updates.followers = parsedFollowers
            if (!existing.instagram_followers_count || existing.instagram_followers_count === 0) {
              updates.instagram_followers_count = parsedFollowers
            }
          }
        }
        if (!existing.dob && dobVal) updates.dob = dobVal
        if (!existing.pincode && pincodeVal) updates.pincode = pincodeVal
        if (!existing.shoe_size && shoeVal) updates.shoe_size = shoeVal
        if (!existing.tshirt_size && tshirtVal) updates.tshirt_size = tshirtVal
        if (!existing.alt_mobile && altMobileVal) updates.alt_mobile = altMobileVal

        if (shippingAddressObj) {
          let existingAddresses = Array.isArray(existing.shipping_addresses) ? [...existing.shipping_addresses] : []
          existingAddresses = existingAddresses.map((a: any) => ({ ...a, is_default: false }))
          existingAddresses.unshift(shippingAddressObj)
          if (existingAddresses.length > 5) existingAddresses = existingAddresses.slice(0, 5)
          updates.shipping_addresses = existingAddresses
          if (row.city?.trim()) updates.city = row.city.trim()
          if (row.state?.trim()) updates.state = row.state.trim()
          if (pincodeVal) updates.pincode = pincodeVal
        }

        toUpdateUsers.push({ userId: existing.id, updates, rowItem: item })
      } else if (mobile && inBatchCreatedMobiles.has(mobile)) {
        // User is a duplicate within the same batch! Merge fields into the previous record
        const previous = inBatchCreatedMobiles.get(mobile)
        if (row.full_name?.trim()) previous.full_name = row.full_name.trim()
        if (row.instagram_username?.trim()) previous.instagram_username = row.instagram_username.trim()
        if (row.account_name?.trim()) previous.account_name = row.account_name.trim()
        if (row.account_number?.trim()) previous.account_number = row.account_number.trim()
        if (row.ifsc_code?.trim()) previous.ifsc_code = row.ifsc_code.trim()
        if (row.category?.trim()) previous.category = row.category.trim()
        if (row.state?.trim()) previous.state = row.state.trim()
        if (row.city?.trim()) previous.city = row.city.trim()
        if (row.followers !== undefined && row.followers !== null && row.followers !== '') {
          const parsedFollowers = parseFollowersCount(row.followers)
          if (parsedFollowers !== null && parsedFollowers > 0) {
            previous.followers = parsedFollowers
            previous.instagram_followers_count = parsedFollowers
          }
        }
        if (dobVal && !previous.dob) previous.dob = dobVal
        if (pincodeVal && !previous.pincode) previous.pincode = pincodeVal
        if (shoeVal && !previous.shoe_size) previous.shoe_size = shoeVal
        if (tshirtVal && !previous.tshirt_size) previous.tshirt_size = tshirtVal
        if (altMobileVal && !previous.alt_mobile) previous.alt_mobile = altMobileVal

        if (shippingAddressObj) {
          previous.shipping_addresses = [shippingAddressObj]
          if (row.city?.trim()) previous.city = row.city.trim()
          if (row.state?.trim()) previous.state = row.state.trim()
          if (pincodeVal) previous.pincode = pincodeVal
        }
      } else {
        // Brand new user
        const finalMobile = mobile || `import_${Date.now()}_${Math.floor(Math.random() * 10000)}`
        const email = row.email?.trim() || `${finalMobile}@import.1to7.com`

        const initialFollowers = parseFollowersCount(row.followers) || 0
        const newUserData: Record<string, any> = {
          full_name: row.full_name?.trim() || 'Imported Creator',
          mobile: finalMobile,
          email: email,
          password_hash: DEFAULT_PASSWORD_HASH,
          is_mobile_verified: false,
          is_email_verified: false,
          instagram_username: row.instagram_username?.trim() || null,
          followers: initialFollowers,
          instagram_followers_count: initialFollowers,
          gender: row.gender?.trim() || null,
          state: row.state?.trim() || null,
          city: row.city?.trim() || null,
          account_name: row.account_name?.trim() || null,
          account_number: row.account_number?.trim() || null,
          ifsc_code: row.ifsc_code?.trim() || null,
          category: row.category?.trim() || null,
          dob: dobVal || null,
          pincode: pincodeVal || null,
          shoe_size: shoeVal || null,
          tshirt_size: tshirtVal || null,
          alt_mobile: altMobileVal || null,
          shipping_addresses: shippingAddressObj ? [shippingAddressObj] : []
        }

        // If explicit influencer ID provided from CSV, preserve it; otherwise DB trigger assigns sequentially
        if (influencerId) {
          newUserData.influencer_id = influencerId
        }

        if (mobile) inBatchCreatedMobiles.set(mobile, newUserData)
        toCreateUsers.push({ rowItem: item, userData: newUserData })
      }
    }

    // 4. Batch insert new users with graceful conflict recovery
    const userMapForApps = new Map<string, string>() // rowIndex -> userId

    if (toCreateUsers.length > 0) {
      const insertPayload = toCreateUsers.map(u => u.userData)
      const { data: insertedUsers, error: insertError } = await supabase
        .from('users')
        .insert(insertPayload)
        .select('id, mobile, influencer_id')

      if (insertError) {
        // Fallback: insert one-by-one with automatic conflict resolution
        for (const item of toCreateUsers) {
          let { data: singleUser, error: singleError } = await supabase
            .from('users')
            .insert([item.userData])
            .select('id')
            .single()
          
          // If email conflict, retry with unique guaranteed email
          if (singleError && singleError.message?.toLowerCase().includes('email')) {
            const uniqueEmail = `${item.userData.mobile}_${Date.now()}@import.1to7.com`
            const retryRes = await supabase
              .from('users')
              .insert([{ ...item.userData, email: uniqueEmail }])
              .select('id')
              .single()
            singleUser = retryRes.data
            singleError = retryRes.error
          }

          // If mobile conflict (already created in earlier batch), fetch existing and treat as success
          if (singleError && singleError.message?.toLowerCase().includes('mobile')) {
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .eq('mobile', item.userData.mobile)
              .maybeSingle()
            if (existingUser) {
              singleUser = existingUser
              singleError = null
              results.existing_users++
            }
          }

          // If influencer_id conflict, omit influencer_id to let DB trigger assign a fresh unique sequential ID
          if (singleError && (singleError.message?.toLowerCase().includes('influencer_id') || singleError.message?.includes('users_influencer_id_key'))) {
            const { influencer_id: _, ...userDataWithoutId } = item.userData
            const retryRes = await supabase
              .from('users')
              .insert([userDataWithoutId])
              .select('id')
              .single()
            singleUser = retryRes.data
            singleError = retryRes.error
          }

          if (singleError) {
            results.errors.push({
              row: item.rowItem.rowIndex,
              mobile: item.rowItem.mobile || item.rowItem.influencerId || 'Unknown',
              error: singleError.message
            })
            results.skipped++
          } else if (singleUser) {
            results.created_users++
            userMapForApps.set(String(item.rowItem.rowIndex), singleUser.id)
          }
        }
      } else if (insertedUsers) {
        results.created_users += insertedUsers.length
        insertedUsers.forEach((u, i) => {
          userMapForApps.set(String(toCreateUsers[i].rowItem.rowIndex), u.id)
        })
      }
    }

    // 5. Update existing users
    if (toUpdateUsers.length > 0) {
      await Promise.all(
        toUpdateUsers.map(async item => {
          userMapForApps.set(String(item.rowItem.rowIndex), item.userId)
          results.existing_users++

          if (Object.keys(item.updates).length > 0) {
            item.updates.updated_at = new Date().toISOString()
            await supabase.from('users').update(item.updates).eq('id', item.userId)
          }
        })
      )
    }

    // 6. Handle Campaign Applications if campaign_id is present
    if (campaign_id) {
      const allUserIds = Array.from(userMapForApps.values())

      if (allUserIds.length > 0) {
        const { data: existingApps } = await supabase
          .from('applications')
          .select('id, user_id, form_data')
          .eq('campaign_id', campaign_id)
          .in('user_id', allUserIds)

        const existingAppsMap = new Map<string, any>()
        existingApps?.forEach(app => existingAppsMap.set(app.user_id, app))

        for (const item of validRows) {
          const userId = userMapForApps.get(String(item.rowIndex))
          if (!userId) continue

          const row = item.row
          const status = row.status?.trim()
          const applicationStatus = validStatuses.includes(status || '') ? status! : 'Applied'
          const existingApp = existingAppsMap.get(userId)

          const formData = row.form_data || {}
          if (row.order_id) {
            formData.order_details = formData.order_details || {}
            formData.order_details.orderId = row.order_id
            formData.order_details_approved = true
          }

          // Commercial resolution: map fee/quote to agreed_commercial & pending_amount
          const rawCommercial = row.agreed_commercial !== undefined
            ? Number(row.agreed_commercial)
            : (row.final_payment !== undefined ? Number(row.final_payment) : undefined)

          if (rawCommercial !== undefined && !isNaN(rawCommercial) && rawCommercial > 0) {
            if (!formData.agreed_commercial) {
              formData.agreed_commercial = rawCommercial
            }
            if (row.pending_amount === undefined) {
              row.pending_amount = rawCommercial
            }
          }

          // Enrich application form_data with locked followers & handle for card rendering
          if (row.followers !== undefined && row.followers !== null && row.followers !== '') {
            const parsedF = parseFollowersCount(row.followers)
            if (parsedF !== null && parsedF > 0 && !formData.applied_instagram_followers) {
              formData.applied_instagram_followers = parsedF
            }
          }
          if (row.instagram_username && !formData.applied_instagram_username) {
            formData.applied_instagram_username = row.instagram_username
          }

          // Financial Invariant: For non-completed applications, money has NOT been disbursed yet
          const finalPaymentToSave = applicationStatus === 'Completed'
            ? (row.final_payment !== undefined ? row.final_payment : 0)
            : 0

          const shippingAddressObj = (item as any).shippingAddressObj
          if (shippingAddressObj) {
            formData.shipping_address = shippingAddressObj
            const formattedAddr = `${shippingAddressObj.address_line1}, ${shippingAddressObj.city}, ${shippingAddressObj.state} - ${shippingAddressObj.pincode} (Recipient: ${shippingAddressObj.recipient_name}, Ph: ${shippingAddressObj.mobile})`
            formData.formatted_shipping_address = formattedAddr
            formData.address_status = 'Approved'
            formData.address_verified = true
            formData.address_confirmed = true
            formData.address_verified_at = new Date().toISOString()
            formData.address_confirmed_at = new Date().toISOString()
            formData.address_verified_by_admin = admin.name || 'Admin'
          }
          if (!formData.deliverables && campaign?.deliverables) {
            formData.deliverables = campaign.deliverables
          }

          if (existingApp) {
            const updatePayload: Record<string, any> = {
              status: applicationStatus,
              updated_at: new Date().toISOString(),
            }
            if (row.partial_payment !== undefined) updatePayload.partial_payment = row.partial_payment
            updatePayload.final_payment = finalPaymentToSave
            if (row.pending_amount !== undefined) updatePayload.pending_amount = row.pending_amount

            if (shippingAddressObj) {
              updatePayload.address_status = 'Approved'
              updatePayload.address_verified_at = new Date().toISOString()
              updatePayload.address_verified_by = admin.id
              // If status was not explicitly specified and application was in Applied state, upgrade to Approved
              if (!row.status && existingApp.status === 'Applied') {
                updatePayload.status = 'Approved'
              }
            }

            if (Object.keys(formData).length > 0) {
              const existingFormData = typeof existingApp.form_data === 'object' && existingApp.form_data !== null ? existingApp.form_data : {}
              updatePayload.form_data = { ...existingFormData, ...formData }
            }

            await supabase.from('applications').update(updatePayload).eq('id', existingApp.id)
            results.applications_updated++
          } else {
            const appPayload: Record<string, any> = {
              user_id: userId,
              campaign_id: campaign_id,
              status: (shippingAddressObj && !row.status) ? 'Approved' : applicationStatus,
              form_data: formData,
              final_payment: finalPaymentToSave,
              pending_amount: row.pending_amount !== undefined ? row.pending_amount : (rawCommercial || 0),
              partial_payment: row.partial_payment !== undefined ? row.partial_payment : 0,
            }

            if (shippingAddressObj) {
              appPayload.address_status = 'Approved'
              appPayload.address_verified_at = new Date().toISOString()
              appPayload.address_verified_by = admin.id
            }

            const { error: appError } = await supabase.from('applications').insert(appPayload)
            if (appError) {
              results.errors.push({ row: item.rowIndex, mobile: item.mobile || 'Unknown', error: `App creation failed: ${appError.message}` })
            } else {
              results.applications_created++
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      campaign: campaign ? { code: campaign.campaign_code, name: campaign.brand_name } : undefined,
      results,
    })
  } catch (error: any) {
    console.error('API /admin/import POST Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
