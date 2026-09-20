import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'
import { isStandardProfileField } from '@/lib/utils/profile-sync-utils'

// ─── GET: Fetch data for any user (profile, stats, applications, feedback) ───
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'influencers')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'profile'

    switch (action) {
      case 'profile': {
        const { data: user, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', userId)
          .single()

        if (error || !user) {
          return NextResponse.json({ error: 'User not found' }, { status: 404 })
        }

        // Self-heal followers from primary instagram profile
        if ((!user.followers || user.followers === 0) && Array.isArray(user.instagram_profiles) && user.instagram_profiles.length > 0) {
          const primary = user.instagram_profiles.find((p: any) => p.is_primary) || user.instagram_profiles[0]
          if (primary && typeof primary.followers === 'number' && primary.followers > 0) {
            user.followers = primary.followers
            user.instagram_followers_count = primary.followers
            supabase.from('users').update({ followers: primary.followers, instagram_followers_count: primary.followers }).eq('id', user.id).then(() => {})
          }
        }

        return NextResponse.json({ user })
      }

      case 'stats': {
        const [totalRes, approvedRes, pendingRes, completedRes, rejectedRes] = await Promise.all([
          supabase.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Approved'),
          supabase.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Applied'),
          supabase.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Completed'),
          supabase.from('applications').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Rejected'),
        ])

        return NextResponse.json({
          stats: {
            total: totalRes.count || 0,
            approved: approvedRes.count || 0,
            pending: pendingRes.count || 0,
            completed: completedRes.count || 0,
            rejected: rejectedRes.count || 0,
          }
        })
      }

      case 'applications': {
        const statusFilter = searchParams.get('status')
        let query = supabase
          .from('applications')
          .select(`
            id,
            status,
            form_data,
            partial_payment,
            final_payment,
            pending_amount,
            created_at,
            updated_at,
            campaigns (
              id,
              campaign_code,
              brand_name,
              category,
              platform,
              budget_type,
              budget_amount,
              deliverables,
              requirements,
              looking_for,
              additional_info,
              collab_date,
              product_links,
              brief_document_url,
              location,
              location_type,
              target_states,
              target_cities,
              store_locations,
              completion_days,
              completion_deadline,
              enforce_completion_deadline,
              gender_required,
              followers,
              min_followers,
              order_form,
              order_form_fields,
              payment_form_fields,
              form_fields
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (statusFilter) {
          query = query.eq('status', statusFilter)
        }

        const { data: applications, error } = await query
        if (error) throw error

        return NextResponse.json({ applications: applications || [] })
      }

      case 'feedback': {
        const { data: feedback, error } = await supabase
          .from('feedback')
          .select('id, rating, category, message, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) throw error
        return NextResponse.json({ feedback: feedback || [] })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('Admin Virtual Profile GET Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}

// ─── PUT: Update user profile (admin editing on behalf) ───
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'influencers', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to edit influencer profiles is denied' }, { status: 403 })
    }

    const { userId } = await params
    const body = await request.json()

    // Fetch current user
    const { data: currentUser, error: userFetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userFetchError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Same allowedFields as dashboard profile PUT
    const allowedFields = [
      'full_name', 'instagram_username', 'gender', 'category', 'languages',
      'state', 'city', 'pincode', 'followers',
      'dob', 'alt_mobile', 'tshirt_size', 'shoe_size', 'bio', 'youtube',
      'custom_attributes',
      'account_name', 'account_number', 'ifsc_code', 'pan_card', 'pan_card_image',
      'shipping_addresses', 'address_remarks'
    ]

    const updateData: Record<string, any> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key]
      }
    }

    // Sanitize PAN Card
    if (body.pan_card !== undefined) {
      if (body.pan_card === null || String(body.pan_card).trim() === '') {
        updateData.pan_card = null
      } else {
        updateData.pan_card = String(body.pan_card).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
      }
    }
    if (body.pan_card_image !== undefined) {
      updateData.pan_card_image = body.pan_card_image ? String(body.pan_card_image).trim() : null
    }

    // Cleanse custom_attributes
    if (updateData.custom_attributes && typeof updateData.custom_attributes === 'object') {
      const sanitized: Record<string, any> = {}
      for (const [k, v] of Object.entries(updateData.custom_attributes)) {
        const label = typeof v === 'object' && v !== null ? (v as any).label || k : k
        if (!isStandardProfileField(k) && !isStandardProfileField(label)) {
          sanitized[k] = v
        }
      }
      updateData.custom_attributes = sanitized
    }

    // Validate shipping addresses
    if (body.shipping_addresses !== undefined) {
      if (Array.isArray(body.shipping_addresses)) {
        if (body.shipping_addresses.length > 6) {
          return NextResponse.json({ error: 'Maximum limit of 6 delivery addresses allowed.' }, { status: 400 })
        }
        for (const addr of body.shipping_addresses) {
          if (addr.pincode) {
            const cleanPin = String(addr.pincode).replace(/\D/g, '')
            if (cleanPin.length !== 6) {
              return NextResponse.json({ error: `Invalid PIN code "${addr.pincode}". Must be exactly 6 digits.` }, { status: 400 })
            }
            addr.pincode = cleanPin
          }
        }
        updateData.shipping_addresses = body.shipping_addresses
      }
    }

    if (body.pincode !== undefined && body.pincode !== null && body.pincode !== '') {
      const cleanPincode = String(body.pincode).replace(/\D/g, '')
      if (cleanPincode.length > 0 && cleanPincode.length !== 6) {
        return NextResponse.json({ error: 'Postal PIN code must be exactly 6 digits.' }, { status: 400 })
      }
      updateData.pincode = cleanPincode
    }

    // Handle Instagram Username changes
    if (body.instagram_username !== undefined) {
      const { extractInstagramUsername, normalizeInstagramUsername, checkInstagramHandleAvailability } = await import('@/lib/instagram-utils')
      const cleaned = extractInstagramUsername(body.instagram_username)
      const currentHandle = extractInstagramUsername(currentUser.instagram_username)

      if (cleaned) {
        if (cleaned.toLowerCase() !== currentHandle.toLowerCase()) {
          const availability = await checkInstagramHandleAvailability(cleaned, userId)
          if (!availability.available) {
            return NextResponse.json({
              error: availability.message || `Instagram profile (@${cleaned}) is already linked to another account.`
            }, { status: 409 })
          }
        }
        updateData.instagram_username = cleaned

        const normalized = normalizeInstagramUsername(cleaned)
        const followers = body.followers !== undefined ? (typeof body.followers === 'number' ? body.followers : parseInt(body.followers || '0', 10) || 0) : undefined

        const { data: existingProfiles } = await supabase
          .from('user_instagram_profiles')
          .select('id, is_primary, is_verified, followers')
          .eq('user_id', userId)

        const primaryProfile = existingProfiles?.find(p => p.is_primary) || existingProfiles?.[0]

        if (primaryProfile) {
          const profileFollowers = primaryProfile.is_verified
            ? primaryProfile.followers
            : (followers !== undefined ? followers : primaryProfile.followers)

          await supabase
            .from('user_instagram_profiles')
            .update({
              username: cleaned,
              normalized_username: normalized,
              followers: profileFollowers,
              updated_at: new Date().toISOString()
            })
            .eq('id', primaryProfile.id)

          if (primaryProfile.is_verified) {
            updateData.followers = primaryProfile.followers
            updateData.instagram_followers_count = primaryProfile.followers
          }
        } else {
          await supabase
            .from('user_instagram_profiles')
            .insert([{
              user_id: userId,
              username: cleaned,
              normalized_username: normalized,
              followers: followers || 0,
              is_primary: true
            }])
        }

        const { data: allProfiles } = await supabase
          .from('user_instagram_profiles')
          .select('*')
          .eq('user_id', userId)
          .order('is_primary', { ascending: false })
          .order('created_at', { ascending: true })

        if (allProfiles) {
          updateData.instagram_profiles = allProfiles.map(p => ({
            id: p.id,
            username: p.username,
            normalized_username: p.normalized_username,
            followers: p.followers,
            category: p.category,
            profile_pic: p.profile_pic,
            is_primary: p.is_primary,
            is_verified: p.is_verified,
            created_at: p.created_at
          }))
        }
      } else {
        updateData.instagram_username = null
      }
    }

    // Auto-compile address_remarks
    if (body.shipping_addresses && Array.isArray(body.shipping_addresses)) {
      updateData.shipping_addresses = body.shipping_addresses
      const compiledRemarks = body.shipping_addresses.map((addr: any) => {
        const isPrimary = addr.is_default ? '[PRIMARY] ' : ''
        const title = addr.title ? `[${addr.title}] ` : ''
        const recipient = addr.recipient_name ? `${addr.recipient_name} (Ph: ${addr.mobile || 'N/A'})` : ''
        const lines = [addr.address_line1, addr.address_line2, addr.landmark ? `Near: ${addr.landmark}` : '', addr.city, addr.state, addr.pincode ? `PIN: ${addr.pincode}` : ''].filter(Boolean).join(', ')
        const note = addr.delivery_remarks ? ` | Note: ${addr.delivery_remarks}` : ''
        return `${isPrimary}${title}${recipient} - ${lines}${note}`
      }).join('\n---\n')

      updateData.address_remarks = body.address_remarks || compiledRemarks

      const defaultAddr = body.shipping_addresses.find((a: any) => a.is_default) || body.shipping_addresses[0]
      if (defaultAddr) {
        if (defaultAddr.state && !body.state) updateData.state = defaultAddr.state
        if (defaultAddr.city && !body.city) updateData.city = defaultAddr.city
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    updateData.updated_at = new Date().toISOString()
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Audit log with admin attribution (fire-and-forget)
    Promise.resolve().then(async () => {
      try {
        const logEntries: any[] = []
        for (const [field, newValue] of Object.entries(updateData)) {
          if (field === 'updated_at') continue
          const oldValue = (currentUser as any)[field]
          if (String(oldValue) !== String(newValue)) {
            logEntries.push({
              user_id: userId,
              changed_field: field,
              old_value: String(oldValue || ''),
              new_value: String(newValue || ''),
              changed_by: `admin:${admin.id}`,
              admin_name: admin.name || admin.email,
            })
          }
        }
        if (logEntries.length > 0) {
          await supabase.from('profile_logs').insert(logEntries)
        }
      } catch (logErr) {
        console.error('Background admin profile_logs error:', logErr)
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully (by admin)',
      user: updatedUser
    })
  } catch (err: any) {
    console.error('Admin Virtual Profile PUT Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 })
  }
}
