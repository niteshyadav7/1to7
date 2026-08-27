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
      'account_name', 'account_number', 'ifsc_code',
      'shipping_addresses', 'address_remarks'
    ]

    const updateData: Record<string, any> = {}
    for (const key of allowedFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key]
      }
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
          .select('id, is_primary')
          .eq('user_id', payload.id)

        const primaryProfile = existingProfiles?.find(p => p.is_primary) || existingProfiles?.[0]

        if (primaryProfile) {
          await supabase
            .from('user_instagram_profiles')
            .update({
              username: cleaned,
              normalized_username: normalized,
              ...(followers !== undefined ? { followers } : {}),
              updated_at: new Date().toISOString()
            })
            .eq('id', primaryProfile.id)
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
