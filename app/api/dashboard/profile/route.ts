import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { isStandardProfileField } from '@/lib/utils/profile-sync-utils'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.id)
      .single()

    console.log('[DEBUG] Profile query for user id:', payload.id)
    console.log('[DEBUG] Supabase error:', error ? JSON.stringify(error) : 'none')
    console.log('[DEBUG] Fetched user from Supabase:', JSON.stringify(user, null, 2))

    if (error || !user) {
      // Fallback: try select(*) to check if user exists but column names are wrong
      const { data: fallbackUser, error: fallbackError } = await supabase
        .from('users')
        .select('*')
        .eq('id', payload.id)
        .single()

      console.log('[DEBUG] Fallback query result:', fallbackUser ? 'FOUND' : 'NOT FOUND', 'error:', fallbackError ? JSON.stringify(fallbackError) : 'none')
      
      if (fallbackUser) {
        // User exists! The column-specific query failed - return with select(*)
        console.log('[DEBUG] User found with select(*), column name issue detected. Keys:', Object.keys(fallbackUser))
        return NextResponse.json({ user: fallbackUser })
      }

      return NextResponse.json({ 
        error: 'User not found', 
        debug: {
          supabaseError: error?.message,
          supabaseHint: error?.hint,
          supabaseCode: error?.code,
          payloadId: payload.id,
          fallbackError: fallbackError?.message
        }
      }, { status: 404 })
    }

    // Self-heal followers count if 0 or null but primary Instagram profile has followers
    if ((!user.followers || user.followers === 0) && Array.isArray(user.instagram_profiles) && user.instagram_profiles.length > 0) {
      const primary = user.instagram_profiles.find((p: any) => p.is_primary) || user.instagram_profiles[0]
      if (primary && typeof primary.followers === 'number' && primary.followers > 0) {
        user.followers = primary.followers
        user.instagram_followers_count = primary.followers
        // Persist to database in background
        supabase.from('users').update({ followers: primary.followers, instagram_followers_count: primary.followers }).eq('id', user.id).then(() => {})
      }
    }

    return NextResponse.json({ user })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
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

    // 1. Fetch current user in a single quick query
    const { data: currentUser, error: userFetchError } = await supabase
      .from('users')
      .select('*')
      .eq('id', payload.id)
      .single()

    if (userFetchError || !currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Only allow updating these fields
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

    // Sanitize PAN Card and PAN Card image
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

    // Cleanse custom_attributes of standard profile fields to prevent duplication
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

    // Validate shipping addresses count and PIN codes (max 6 addresses limit)
    if (body.shipping_addresses !== undefined) {
      if (Array.isArray(body.shipping_addresses)) {
        if (body.shipping_addresses.length > 6) {
          return NextResponse.json({
            error: 'Maximum limit of 6 delivery addresses allowed.'
          }, { status: 400 })
        }
        for (const addr of body.shipping_addresses) {
          if (addr.pincode) {
            const cleanPin = String(addr.pincode).replace(/\D/g, '')
            if (cleanPin.length !== 6) {
              return NextResponse.json({
                error: `Invalid PIN code "${addr.pincode}". Postal PIN code must be exactly 6 digits.`
              }, { status: 400 })
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
        return NextResponse.json({
          error: 'Postal PIN code must be exactly 6 digits.'
        }, { status: 400 })
      }
      updateData.pincode = cleanPincode
    }

    // Handle Instagram Username Uniqueness and Sync ONLY if handle changed
    if (body.instagram_username !== undefined) {
      const { extractInstagramUsername, normalizeInstagramUsername, checkInstagramHandleAvailability } = await import('@/lib/instagram-utils')
      const cleaned = extractInstagramUsername(body.instagram_username)
      const currentHandle = extractInstagramUsername(currentUser.instagram_username)
      
      if (cleaned) {
        // Only run cross-account availability check if user actually changed the handle
        if (cleaned.toLowerCase() !== currentHandle.toLowerCase()) {
          const availability = await checkInstagramHandleAvailability(cleaned, payload.id)
          if (!availability.available) {
            return NextResponse.json({
              error: availability.message || `Instagram profile (@${cleaned}) is already linked to another account.`
            }, { status: 409 })
          }
        }
        updateData.instagram_username = cleaned

        // Fast upsert primary profile in user_instagram_profiles
        const normalized = normalizeInstagramUsername(cleaned)
        const followers = body.followers !== undefined ? (typeof body.followers === 'number' ? body.followers : parseInt(body.followers || '0', 10) || 0) : undefined

        const { data: existingProfiles } = await supabase
          .from('user_instagram_profiles')
          .select('id, is_primary, is_verified, followers')
          .eq('user_id', payload.id)

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
              user_id: payload.id,
              username: cleaned,
              normalized_username: normalized,
              followers: followers || 0,
              is_primary: true
            }])
        }

        // Fetch refreshed profiles for jsonb sync
        const { data: allProfiles } = await supabase
          .from('user_instagram_profiles')
          .select('*')
          .eq('user_id', payload.id)
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

    // Auto-compile address_remarks and sync primary state/city from shipping_addresses
    if (body.shipping_addresses && Array.isArray(body.shipping_addresses)) {
      updateData.shipping_addresses = body.shipping_addresses
      
      const compiledRemarks = body.shipping_addresses.map((addr: any) => {
        const isPrimary = addr.is_default ? '[PRIMARY] ' : ''
        const title = addr.title ? `[${addr.title}] ` : ''
        const recipient = addr.recipient_name ? `${addr.recipient_name} (Ph: ${addr.mobile || 'N/A'})` : ''
        const lines = [
          addr.address_line1,
          addr.address_line2,
          addr.landmark ? `Near: ${addr.landmark}` : '',
          addr.city,
          addr.state,
          addr.pincode ? `PIN: ${addr.pincode}` : ''
        ].filter(Boolean).join(', ')
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

    // Update user and return the complete updated object in one atomic call
    updateData.updated_at = new Date().toISOString()
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', payload.id)
      .select('*')
      .single()

    if (updateError) throw updateError

    // Fire-and-forget: Log audit changes in background without blocking HTTP response
    Promise.resolve().then(async () => {
      try {
        const logEntries: any[] = []
        for (const [field, newValue] of Object.entries(updateData)) {
          if (field === 'updated_at') continue
          const oldValue = (currentUser as any)[field]
          if (String(oldValue) !== String(newValue)) {
            logEntries.push({
              user_id: payload.id,
              changed_field: field,
              old_value: String(oldValue || ''),
              new_value: String(newValue || ''),
            })
          }
        }
        if (logEntries.length > 0) {
          await supabase.from('profile_logs').insert(logEntries)
        }
      } catch (logErr) {
        console.error('Background profile_logs error:', logErr)
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Profile updated successfully',
      user: updatedUser 
    })
  } catch (err: any) {
    console.error('API /dashboard/profile PUT Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
