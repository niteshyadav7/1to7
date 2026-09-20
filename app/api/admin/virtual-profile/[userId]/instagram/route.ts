import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'
import {
  extractInstagramUsername,
  normalizeInstagramUsername,
  checkInstagramHandleAvailability,
  syncUserInstagramState
} from '@/lib/instagram-utils'

// ─── GET: Fetch all linked Instagram profiles for a user ───
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { userId } = await params

    const { data: profiles, error } = await supabase
      .from('user_instagram_profiles')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) throw error
    return NextResponse.json({ profiles: profiles || [] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch Instagram profiles' }, { status: 500 })
  }
}

// ─── POST: Link a new Instagram profile for user ───
export async function POST(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'influencers', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params
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

    const availability = await checkInstagramHandleAvailability(cleanedUsername, userId)
    if (!availability.available) {
      return NextResponse.json({
        error: availability.message || `Instagram profile (@${cleanedUsername}) is already linked to another account.`
      }, { status: 409 })
    }

    const { data: existingProfiles } = await supabase
      .from('user_instagram_profiles')
      .select('id, is_primary')
      .eq('user_id', userId)

    const isFirstProfile = !existingProfiles || existingProfiles.length === 0
    if (isFirstProfile) makePrimary = true

    if (makePrimary && existingProfiles && existingProfiles.length > 0) {
      await supabase
        .from('user_instagram_profiles')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
    }

    const { data: newProfile, error: insertError } = await supabase
      .from('user_instagram_profiles')
      .insert([{
        user_id: userId,
        username: cleanedUsername,
        normalized_username: normalized,
        followers,
        category,
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

    const updatedProfiles = await syncUserInstagramState(userId)

    return NextResponse.json({
      message: 'Instagram profile linked successfully (by admin)',
      profile: newProfile,
      profiles: updatedProfiles
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to link Instagram profile' }, { status: 500 })
  }
}

// ─── PUT: Update profile (Set Primary, Followers, Category) ──
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'influencers', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params
    const body = await request.json()
    const profileId = body.profileId || body.id

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // Verify profile belongs to user
    const { data: targetProfile, error: fetchErr } = await supabase
      .from('user_instagram_profiles')
      .select('*')
      .eq('id', profileId)
      .eq('user_id', userId)
      .single()

    if (fetchErr || !targetProfile) {
      return NextResponse.json({ error: 'Instagram profile not found' }, { status: 404 })
    }

    if (body.is_primary === true) {
      await supabase
        .from('user_instagram_profiles')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      await supabase
        .from('user_instagram_profiles')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('id', profileId)
    }

    const updates: Record<string, any> = { updated_at: new Date().toISOString() }
    if (body.followers !== undefined) {
      updates.followers = Math.max(0, typeof body.followers === 'number' ? body.followers : parseInt(body.followers || '0', 10) || 0)
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

    const updatedProfiles = await syncUserInstagramState(userId)

    return NextResponse.json({
      message: 'Instagram profile updated (by admin)',
      profiles: updatedProfiles
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 })
  }
}

// ─── DELETE: Unlink an Instagram profile ────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'influencers', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('id') || searchParams.get('profileId')

    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    const { data: userProfiles, error: fetchErr } = await supabase
      .from('user_instagram_profiles')
      .select('*')
      .eq('user_id', userId)

    if (fetchErr || !userProfiles || userProfiles.length === 0) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const targetProfile = userProfiles.find(p => p.id === profileId)
    if (!targetProfile) {
      return NextResponse.json({ error: 'Profile not found or access denied' }, { status: 404 })
    }

    if (userProfiles.length === 1) {
      return NextResponse.json({
        error: 'Cannot remove the only linked Instagram profile.'
      }, { status: 400 })
    }

    if (targetProfile.is_primary) {
      const nextPrimary = userProfiles.find(p => p.id !== profileId)
      if (nextPrimary) {
        await supabase
          .from('user_instagram_profiles')
          .update({ is_primary: true, updated_at: new Date().toISOString() })
          .eq('id', nextPrimary.id)
      }
    }

    const { error: delErr } = await supabase
      .from('user_instagram_profiles')
      .delete()
      .eq('id', profileId)
      .eq('user_id', userId)

    if (delErr) throw delErr

    const updatedProfiles = await syncUserInstagramState(userId)

    return NextResponse.json({
      message: 'Instagram profile unlinked (by admin)',
      profiles: updatedProfiles
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to unlink profile' }, { status: 500 })
  }
}
