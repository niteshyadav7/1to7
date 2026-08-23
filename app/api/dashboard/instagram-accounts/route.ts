import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import {
  extractInstagramUsername,
  normalizeInstagramUsername,
  checkInstagramHandleAvailability
} from '@/lib/instagram-utils'

// Helper to sync public.users.instagram_profiles and primary handle
async function syncUserInstagramState(userId: string) {
  const { data: profiles, error } = await supabase
    .from('user_instagram_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error || !profiles) return

  const primaryProfile = profiles.find(p => p.is_primary) || profiles[0]

  const updates: Record<string, any> = {
    instagram_profiles: profiles.map(p => ({
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

  if (primaryProfile) {
    updates.instagram_username = primaryProfile.username
    if (primaryProfile.followers) {
      updates.followers = primaryProfile.followers
    }
  }

  await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)

  return profiles
}

// ─── GET: Fetch all linked Instagram profiles ───────────────
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { data: profiles, error } = await supabase
      .from('user_instagram_profiles')
      .select('*')
      .eq('user_id', payload.id)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error

    return NextResponse.json({ profiles: profiles || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Instagram profiles' }, { status: 500 })
  }
}

// ─── POST: Link a new Instagram profile ─────────────────────
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const body = await request.json()
    const rawUsername = body.username || body.instagram_username
    const cleanedUsername = extractInstagramUsername(rawUsername)
    const normalized = normalizeInstagramUsername(cleanedUsername)
    const followers = typeof body.followers === 'number' ? body.followers : parseInt(body.followers || '0', 10) || 0
    const category = body.category?.trim() || null
    let makePrimary = Boolean(body.is_primary)

    if (!cleanedUsername) {
      return NextResponse.json({ error: 'Instagram username is required' }, { status: 400 })
    }

    // 1. Strict Cross-Account Uniqueness Check
    const availability = await checkInstagramHandleAvailability(cleanedUsername, payload.id)
    if (!availability.available) {
      return NextResponse.json({
        error: availability.message || `Instagram profile (@${cleanedUsername}) is already linked to another account.`
      }, { status: 409 })
    }

    // 2. Check existing profiles count for this user
    const { data: existingProfiles } = await supabase
      .from('user_instagram_profiles')
      .select('id, is_primary')
      .eq('user_id', payload.id)

    const isFirstProfile = !existingProfiles || existingProfiles.length === 0
    if (isFirstProfile) {
      makePrimary = true
    }

    // 3. If setting this new one as primary, unset other primaries
    if (makePrimary && existingProfiles && existingProfiles.length > 0) {
      await supabase
        .from('user_instagram_profiles')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('user_id', payload.id)
    }

    // 4. Insert new profile
    const { data: newProfile, error: insertError } = await supabase
      .from('user_instagram_profiles')
      .insert([{
        user_id: payload.id,
        username: cleanedUsername,
        normalized_username: normalized,
        followers: followers,
        category: category,
        is_primary: makePrimary,
        is_verified: false
      }])
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({
          error: `Instagram profile (@${cleanedUsername}) is already linked to another account.`
        }, { status: 409 })
      }
      throw insertError
    }

    // 5. Sync users table
    const updatedProfiles = await syncUserInstagramState(payload.id)

    return NextResponse.json({
      message: 'Instagram profile linked successfully',
      profile: newProfile,
      profiles: updatedProfiles
    })
  } catch (err: any) {
    console.error('Error linking Instagram profile:', err)
    return NextResponse.json({ error: err.message || 'Failed to link Instagram profile' }, { status: 500 })
  }
}

// ─── PUT: Update profile (Set Primary, Followers, Category) ──
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const body = await request.json()
    const profileId = body.profileId || body.id

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: targetProfile, error: fetchErr } = await supabase
      .from('user_instagram_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', payload.id)
      .single()

    if (fetchErr || !targetProfile) {
      return NextResponse.json({ error: 'Instagram profile not found' }, { status: 404 })
    }

    // If making primary
    if (body.is_primary === true) {
      // Unset all other primaries
      await supabase
        .from('user_instagram_profiles')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('user_id', payload.id)

      await supabase
        .from('user_instagram_profiles')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('id', profileId)
    }

    // If updating followers or category
    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.followers !== undefined) {
      updates.followers = typeof body.followers === 'number' ? body.followers : parseInt(body.followers || '0', 10) || 0
    }
    if (body.category !== undefined) {
      updates.category = body.category?.trim() || null
    }

    if (Object.keys(updates).length > 1) {
      await supabase
        .from('user_instagram_profiles')
        .update(updates)
        .eq('id', profileId)
    }

    const updatedProfiles = await syncUserInstagramState(payload.id)

    return NextResponse.json({
      message: 'Instagram profile updated',
      profiles: updatedProfiles
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 })
  }
}

// ─── DELETE: Unlink an Instagram profile ────────────────────
export async function DELETE(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const payload = await verifyToken(token)
    if (!payload || !payload.id) return NextResponse.json({ error: 'Invalid session' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('id') || searchParams.get('profileId')

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Fetch all user profiles
    const { data: userProfiles, error: fetchErr } = await supabase
      .from('user_instagram_profiles')
      .select('*')
      .eq('user_id', payload.id)

    if (fetchErr || !userProfiles || userProfiles.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const targetProfile = userProfiles.find(p => p.id === profileId)
    if (!targetProfile) {
      return NextResponse.json({ error: 'Profile not found or access denied' }, { status: 404 })
    }

    // Prevent removing if it's the only profile
    if (userProfiles.length === 1) {
      return NextResponse.json({
        error: 'Cannot remove your only linked Instagram profile. Add a new profile first.'
      }, { status: 400 })
    }

    // If removing the primary profile, promote another profile to primary first
    if (targetProfile.is_primary) {
      const nextPrimary = userProfiles.find(p => p.id !== profileId)
      if (nextPrimary) {
        await supabase
          .from('user_instagram_profiles')
          .update({ is_primary: true, updated_at: new Date().toISOString() })
          .eq('id', nextPrimary.id)
      }
    }

    // Delete row
    const { error: delErr } = await supabase
      .from('user_instagram_profiles')
      .delete()
      .eq('id', profileId)
      .eq('user_id', payload.id)

    if (delErr) throw delErr

    const updatedProfiles = await syncUserInstagramState(payload.id)

    return NextResponse.json({
      message: 'Instagram profile unlinked',
      profiles: updatedProfiles
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to unlink profile' }, { status: 500 })
  }
}
