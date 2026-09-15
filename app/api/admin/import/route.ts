import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'
import { generateSequentialInfluencerId } from '@/lib/user-utils'

// Default password hash for imported users ('12345') - they can change it later
const DEFAULT_PASSWORD_HASH = '$2b$10$rgMNYfe45OpevM8273RF2uFRjsAxq4ScGzgGOBtaywvDNKpqFJ7Wm'

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
  status?: string
  form_data?: Record<string, any>
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

    let campaign: { id: string; campaign_code: string; brand_name: string } | null = null
    if (campaign_id) {
      // Verify the campaign exists
      const { data, error: campaignError } = await supabase
        .from('campaigns')
        .select('id, campaign_code, brand_name')
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
        .select('id, mobile, influencer_id, account_number, account_name, ifsc_code, category, full_name, instagram_username, gender, state, city, followers')
        .in('mobile', mobiles)
      
      byMobiles?.forEach(u => {
        if (u.mobile) existingUsersMap.set(`m:${u.mobile}`, u)
        if (u.influencer_id) existingUsersMap.set(`id:${u.influencer_id}`, u)
      })
    }

    if (influencerIds.length > 0) {
      const { data: byIds } = await supabase
        .from('users')
        .select('id, mobile, influencer_id, account_number, account_name, ifsc_code, category, full_name, instagram_username, gender, state, city, followers')
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

    // Helper for generating sequential IDs for new users without a specified ID
    let currentSequence = 0
    const needsNewSequentialId = validRows.length > 0

    if (needsNewSequentialId) {
      // 1. Fetch counter from influencer_id_counter
      const { data: counter } = await supabase
        .from('influencer_id_counter')
        .select('last_number')
        .eq('id', 1)
        .single()
      
      const counterNum = counter?.last_number || 10000

      // 2. Fetch the latest registered users to ensure counter is NEVER behind actual database max
      const { data: latestUsers } = await supabase
        .from('users')
        .select('influencer_id')
        .order('created_at', { ascending: false })
        .limit(20)

      let latestUserMaxNum = 0
      if (latestUsers && latestUsers.length > 0) {
        for (const u of latestUsers) {
          if (u.influencer_id && u.influencer_id.startsWith('HY')) {
            const parsed = parseInt(u.influencer_id.replace('HY', ''), 10)
            // Filter out timestamp-based outliers (> 1,000,000)
            if (!isNaN(parsed) && parsed > latestUserMaxNum && parsed < 1000000) {
              latestUserMaxNum = parsed
            }
          }
        }
      }

      const safeCounter = (counterNum > 0 && counterNum < 1000000) ? counterNum : 24642
      currentSequence = Math.max(safeCounter, latestUserMaxNum, 10000)
    }

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
        if (!existing.followers && row.followers) {
          const parsed = parseInt(String(row.followers), 10)
          if (!isNaN(parsed)) updates.followers = parsed
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
        if (row.followers) {
          const parsed = parseInt(String(row.followers), 10)
          if (!isNaN(parsed)) previous.followers = parsed
        }
      } else {
        // Brand new user
        let finalInfluencerId = influencerId
        if (!finalInfluencerId) {
          currentSequence++
          finalInfluencerId = `HY${currentSequence}`
        }

        const finalMobile = mobile || `import_${Date.now()}_${Math.floor(Math.random() * 10000)}`
        const email = row.email?.trim() || `${finalMobile}@import.1to7.com`

        const newUserData = {
          full_name: row.full_name?.trim() || 'Imported Creator',
          mobile: finalMobile,
          email: email,
          password_hash: DEFAULT_PASSWORD_HASH,
          influencer_id: finalInfluencerId,
          is_mobile_verified: false,
          is_email_verified: false,
          instagram_username: row.instagram_username?.trim() || null,
          followers: row.followers ? parseInt(String(row.followers), 10) || 0 : 0,
          gender: row.gender?.trim() || null,
          state: row.state?.trim() || null,
          city: row.city?.trim() || null,
          account_name: row.account_name?.trim() || null,
          account_number: row.account_number?.trim() || null,
          ifsc_code: row.ifsc_code?.trim() || null,
          category: row.category?.trim() || null,
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

          // If influencer_id conflict, dynamically generate a fresh verified unique ID and retry
          if (singleError && (singleError.message?.toLowerCase().includes('influencer_id') || singleError.message?.includes('users_influencer_id_key'))) {
            const freshInfluencerId = await generateSequentialInfluencerId()
            const retryRes = await supabase
              .from('users')
              .insert([{ ...item.userData, influencer_id: freshInfluencerId }])
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

      // Update sequence counter if new sequential IDs were generated
      if (needsNewSequentialId && currentSequence > 0) {
        await supabase
          .from('influencer_id_counter')
          .upsert({ id: 1, last_number: currentSequence }, { onConflict: 'id' })
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
          if (row.final_payment !== undefined && !formData.agreed_commercial) {
            formData.agreed_commercial = row.final_payment
          }

          if (existingApp) {
            const updatePayload: Record<string, any> = {
              status: applicationStatus,
              updated_at: new Date().toISOString(),
            }
            if (row.partial_payment !== undefined) updatePayload.partial_payment = row.partial_payment
            if (row.final_payment !== undefined) updatePayload.final_payment = row.final_payment
            if (row.pending_amount !== undefined) updatePayload.pending_amount = row.pending_amount

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
              status: applicationStatus,
              form_data: formData,
            }
            if (row.partial_payment !== undefined) appPayload.partial_payment = row.partial_payment
            if (row.final_payment !== undefined) appPayload.final_payment = row.final_payment
            if (row.pending_amount !== undefined) appPayload.pending_amount = row.pending_amount

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
