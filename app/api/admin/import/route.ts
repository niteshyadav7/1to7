import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { generateSequentialInfluencerId } from '@/lib/user-utils'

// Default password hash for imported users (they can reset later)
const DEFAULT_PASSWORD_HASH = '$2b$10$vysFdPLELlPEvtXf1B5kneSq1OV0iEtxOUlf4LpwKfGXmenL1jUpm'

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
}

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { rows, campaign_id } = body as { rows: ImportRow[]; campaign_id: string }

    if (!campaign_id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
    }
    if (rows.length > 1000) {
      return NextResponse.json({ error: 'Maximum 1000 rows per import' }, { status: 400 })
    }

    // Verify the campaign exists
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('id, campaign_code, brand_name')
      .eq('id', campaign_id)
      .single()

    if (campaignError || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
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

    // Process rows in chunks of 10 to avoid overwhelming the DB
    const CHUNK_SIZE = 10
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE)

      await Promise.all(
        chunk.map(async (row, chunkIndex) => {
          const rowIndex = i + chunkIndex + 1 // 1-indexed for user-friendly display
          const mobile = row.mobile?.toString().trim()
          const influencerIdInput = row.influencer_id?.toString().trim()

          if (!mobile && !influencerIdInput) {
            results.errors.push({ row: rowIndex, mobile: '(empty)', error: 'Mobile or User ID is required' })
            results.skipped++
            return
          }

          try {
            // 1. Find or create user by influencer_id or mobile
            let userId: string

            let existingUser: { id: string } | null = null
            
            if (influencerIdInput) {
              const { data } = await supabase.from('users').select('id').eq('influencer_id', influencerIdInput).single()
              existingUser = data
            }
            if (!existingUser && mobile) {
              const { data } = await supabase.from('users').select('id').eq('mobile', mobile).single()
              existingUser = data
            }

            if (existingUser) {
              userId = existingUser.id
              results.existing_users++

              // Optionally update user profile fields if provided and non-empty
              const updates: Record<string, any> = {}
              if (row.full_name?.trim()) updates.full_name = row.full_name.trim()
              if (row.instagram_username?.trim()) updates.instagram_username = row.instagram_username.trim()
              if (row.gender?.trim()) updates.gender = row.gender.trim()
              if (row.state?.trim()) updates.state = row.state.trim()
              if (row.city?.trim()) updates.city = row.city.trim()
              if (row.followers) {
                const parsed = parseInt(String(row.followers), 10)
                if (!isNaN(parsed)) updates.followers = parsed
              }

              if (Object.keys(updates).length > 0) {
                updates.updated_at = new Date().toISOString()
                await supabase.from('users').update(updates).eq('id', userId)
              }
            } else {
              // Create a new lightweight user profile
              const influencerId = influencerIdInput || await generateSequentialInfluencerId()
              const fullName = row.full_name?.trim() || 'Imported Creator'
              const finalMobile = mobile || `import_${Date.now()}_${Math.floor(Math.random() * 1000)}`
              const email = row.email?.trim() || `${finalMobile}@import.1to7.com`

              const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{
                  full_name: fullName,
                  mobile: finalMobile,
                  email: email,
                  password_hash: DEFAULT_PASSWORD_HASH,
                  influencer_id: influencerId,
                  is_mobile_verified: false,
                  is_email_verified: false,
                  instagram_username: row.instagram_username?.trim() || null,
                  followers: row.followers ? parseInt(String(row.followers), 10) || 0 : 0,
                  gender: row.gender?.trim() || null,
                  state: row.state?.trim() || null,
                  city: row.city?.trim() || null,
                }])
                .select('id')
                .single()

              if (insertError) {
                // Handle duplicate email scenario
                if (insertError.code === '23505' && insertError.message?.includes('email')) {
                  // Try with a unique email
                  const uniqueEmail = `${finalMobile}_${Date.now()}@import.1to7.com`
                  const { data: retryUser, error: retryError } = await supabase
                    .from('users')
                    .insert([{
                      full_name: fullName,
                      mobile: finalMobile,
                      email: uniqueEmail,
                      password_hash: DEFAULT_PASSWORD_HASH,
                      influencer_id: influencerId,
                      is_mobile_verified: false,
                      is_email_verified: false,
                      instagram_username: row.instagram_username?.trim() || null,
                      followers: row.followers ? parseInt(String(row.followers), 10) || 0 : 0,
                      gender: row.gender?.trim() || null,
                      state: row.state?.trim() || null,
                      city: row.city?.trim() || null,
                    }])
                    .select('id')
                    .single()

                  if (retryError || !retryUser) {
                    results.errors.push({ row: rowIndex, mobile: finalMobile, error: `Failed to create user: ${retryError?.message || 'Unknown error'}` })
                    results.skipped++
                    return
                  }
                  userId = retryUser.id
                } else {
                  results.errors.push({ row: rowIndex, mobile: finalMobile, error: `Failed to create user: ${insertError.message}` })
                  results.skipped++
                  return
                }
              } else {
                userId = newUser!.id
              }

              results.created_users++
            }

            // 2. Determine application status
            const status = row.status?.trim()
            const applicationStatus = validStatuses.includes(status || '') ? status! : 'Applied'

            // 3. Check if application already exists for this user + campaign
            const { data: existingApp } = await supabase
              .from('applications')
              .select('id, form_data')
              .eq('user_id', userId)
              .eq('campaign_id', campaign_id)
              .single()

            // Prepare form data including order_details if needed
            const formData = row.form_data || {}
            if (row.order_id) {
              formData.order_details = formData.order_details || {}
              formData.order_details.orderId = row.order_id
              formData.order_details_approved = true // Auto-approve imported orders
            }

            if (existingApp) {
              // Update existing application
              const updatePayload: Record<string, any> = {
                status: applicationStatus,
                updated_at: new Date().toISOString(),
              }
              
              if (row.partial_payment !== undefined) updatePayload.partial_payment = row.partial_payment
              if (row.final_payment !== undefined) updatePayload.final_payment = row.final_payment
              if (row.pending_amount !== undefined) updatePayload.pending_amount = row.pending_amount

              if (Object.keys(formData).length > 0) {
                // Merge with existing form_data
                const existingFormData = typeof existingApp.form_data === 'object' && existingApp.form_data !== null ? existingApp.form_data : {}
                updatePayload.form_data = { ...existingFormData, ...formData }
                // Merge nested order_details specifically
                if (formData.order_details && existingFormData.order_details) {
                  updatePayload.form_data.order_details = { ...existingFormData.order_details, ...formData.order_details }
                }
              }

              await supabase
                .from('applications')
                .update(updatePayload)
                .eq('id', existingApp.id)

              results.applications_updated++
            } else {
              // Create new application
              const appPayload: Record<string, any> = {
                user_id: userId,
                campaign_id: campaign_id,
                status: applicationStatus,
                form_data: formData,
              }

              if (row.partial_payment !== undefined) appPayload.partial_payment = row.partial_payment
              if (row.final_payment !== undefined) appPayload.final_payment = row.final_payment
              if (row.pending_amount !== undefined) appPayload.pending_amount = row.pending_amount

              const { error: appError } = await supabase
                .from('applications')
                .insert(appPayload)

              if (appError) {
                results.errors.push({ row: rowIndex, mobile: mobile || influencerIdInput || 'Unknown', error: `Failed to create application: ${appError.message}` })
                results.skipped++
                return
              }

              results.applications_created++
            }
          } catch (err: any) {
            results.errors.push({ row: rowIndex, mobile: mobile || influencerIdInput || 'Unknown', error: err.message || 'Unknown error' })
            results.skipped++
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      campaign: { code: campaign.campaign_code, name: campaign.brand_name },
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
