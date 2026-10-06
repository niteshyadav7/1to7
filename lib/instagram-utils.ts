/**
 * Normalizes and extracts a clean Instagram username from any input string.
 * Handles plain handles, @handles, full URLs, query parameters, trailing slashes,
 * and malformed/duplicated link prefixes.
 *
 * Examples:
 * - "creatorrashiii" -> "creatorrashiii"
 * - "@creatorrashiii" -> "creatorrashiii"
 * - "https://www.instagram.com/creatorrashiii" -> "creatorrashiii"
 * - "https://www.instagram.com/creatorrashiii?igsh=MW9nd3Fvcnc1MTJ3dQ%3D%3D" -> "creatorrashiii"
 * - "https://www.instagram.com/https://www.instagram.com/creatorrashiii?igsh=..." -> "creatorrashiii"
 */
export function extractInstagramUsername(input: string | null | undefined): string {
  if (!input) return ''
  let cleaned = input.trim()

  // 1. Remove query string & hash fragment (e.g. ?igsh=..., #...)
  cleaned = cleaned.split('?')[0].split('#')[0].trim()

  // 2. Iteratively strip leading protocol / domain / duplicated prefixes
  let prev = ''
  while (cleaned !== prev) {
    prev = cleaned
    cleaned = cleaned
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/^(m\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .trim()
  }

  // 3. Extract the username from segments (handles standard profiles and stories/username links)
  const segments = cleaned.split('/').filter(Boolean)
  if (segments.length === 0) return ''

  let username = segments[0] || ''
  if (username.toLowerCase() === 'stories' && segments.length > 1) {
    username = segments[1] || ''
  }

  // Clean any residual '@' or spaces
  username = username.replace(/^@/, '').trim()

  return username
}

/**
 * Returns a standardized full Instagram profile URL.
 * e.g., "https://www.instagram.com/creatorrashiii"
 */
export function getInstagramUrl(input: string | null | undefined): string {
  const username = extractInstagramUsername(input)
  return username ? `https://www.instagram.com/${username}` : ''
}

/**
 * Returns a formatted handle for UI display.
 * e.g., "@creatorrashiii"
 */
export function getInstagramDisplayHandle(input: string | null | undefined): string {
  const username = extractInstagramUsername(input)
  return username ? `@${username}` : ''
}

/**
 * Normalizes an Instagram username for strict uniqueness checks.
 * Strips all @, URLs, trailing slashes, whitespace, and lowercases.
 * e.g., "@Priya_Fitness " -> "priya_fitness"
 */
export function normalizeInstagramUsername(input: string | null | undefined): string {
  return extractInstagramUsername(input).toLowerCase().trim()
}

/**
 * Server-side helper to check if an Instagram handle is already linked to another account.
 * Checks both `public.user_instagram_profiles` and `public.users.instagram_username`.
 */
export async function checkInstagramHandleAvailability(
  handle: string | null | undefined,
  currentUserId?: string | null
): Promise<{
  available: boolean
  normalized: string
  conflictUserId?: string
  message?: string
}> {
  const normalized = normalizeInstagramUsername(handle)
  if (!normalized) {
    return { available: false, normalized: '', message: 'Instagram username is required' }
  }

  // Basic Instagram username format check (alphanumeric, periods, underscores, max 30 chars)
  if (!/^[a-zA-Z0-9._]{1,30}$/.test(normalized)) {
    return { available: false, normalized, message: 'Invalid Instagram username format' }
  }

  const { supabase } = await import('@/lib/supabase')

  // 1. Check user_instagram_profiles table
  let query1 = supabase
    .from('user_instagram_profiles')
    .select('id, user_id, username, normalized_username')
    .eq('normalized_username', normalized)

  if (currentUserId) {
    query1 = query1.neq('user_id', currentUserId)
  }

  const { data: profileConflicts, error: err1 } = await query1

  if (!err1 && profileConflicts && profileConflicts.length > 0) {
    return {
      available: false,
      normalized,
      conflictUserId: profileConflicts[0].user_id,
      message: `Instagram profile (@${profileConflicts[0].username}) is already linked to another account.`
    }
  }

  // 2. Check legacy public.users.instagram_username for safety
  let query2 = supabase
    .from('users')
    .select('id, instagram_username')
    .ilike('instagram_username', normalized)

  if (currentUserId) {
    query2 = query2.neq('id', currentUserId)
  }

  const { data: userConflicts, error: err2 } = await query2

  if (!err2 && userConflicts && userConflicts.length > 0) {
    const matchingUser = userConflicts.find(
      u => normalizeInstagramUsername(u.instagram_username) === normalized
    )
    if (matchingUser) {
      return {
        available: false,
        normalized,
        conflictUserId: matchingUser.id,
        message: `Instagram profile (@${normalized}) is already registered with another account.`
      }
    }
  }

  return {
    available: true,
    normalized
  }
}

/**
 * Synchronizes public.user_instagram_profiles rows into public.users.instagram_profiles JSONB
 * and sets primary handle and verified follower count on public.users.
 */
export async function syncUserInstagramState(userId: string) {
  const { supabase } = await import('@/lib/supabase')
  const { data: profiles, error } = await supabase
    .from('user_instagram_profiles')
    .select('*')
    .eq('user_id', userId)
    .order('is_primary', { ascending: false })
    .order('created_at', { ascending: true })

  if (error || !profiles) return []

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
    if (primaryProfile.followers !== undefined && primaryProfile.followers !== null) {
      updates.followers = primaryProfile.followers
      updates.instagram_followers_count = primaryProfile.followers
    }
    if (primaryProfile.profile_pic) {
      updates.instagram_profile_pic = primaryProfile.profile_pic
    }
    if (primaryProfile.is_verified !== undefined) {
      updates.is_instagram_verified = primaryProfile.is_verified
    }
  }

  await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)

  return profiles
}

/**
 * Extracts the locked or declared Instagram profile from an application record.
 */
export function getAppliedProfile(application: any): {
  username: string
  normalized: string
  profileId: string | null
  followers: number | null
  lockedAt: string | null
} {
  const fd = application?.form_data || {}
  const rawUsername =
    fd.applied_instagram_username ||
    fd.instagram_username ||
    application?.users?.instagram_username ||
    ''

  const username = extractInstagramUsername(rawUsername)
  const normalized = normalizeInstagramUsername(username)
  const profileId = fd.applied_instagram_profile_id || null
  const followers = typeof fd.applied_instagram_followers === 'number'
    ? fd.applied_instagram_followers
    : (parseInt(fd.applied_instagram_followers || '0', 10) || null)
  const lockedAt = fd.applied_instagram_locked_at || null

  return { username, normalized, profileId, followers, lockedAt }
}

/**
 * Verifies whether a given Instagram username or profile ID is actively linked to a user.
 */
export async function isProfileLinkedToUser(
  userId: string,
  identifier: { username?: string | null; profileId?: string | null }
): Promise<{ linked: boolean; profile: any | null }> {
  if (!userId) return { linked: false, profile: null }

  const { supabase } = await import('@/lib/supabase')
  const normalized = normalizeInstagramUsername(identifier.username)

  const { data: profiles, error } = await supabase
    .from('user_instagram_profiles')
    .select('*')
    .eq('user_id', userId)

  if (error || !profiles || profiles.length === 0) {
    return { linked: false, profile: null }
  }

  // Check by profile ID first
  if (identifier.profileId) {
    const matchedById = profiles.find(p => p.id === identifier.profileId)
    if (matchedById) return { linked: true, profile: matchedById }
  }

  // Check by normalized username
  if (normalized) {
    const matchedByName = profiles.find(
      p => normalizeInstagramUsername(p.username) === normalized ||
           normalizeInstagramUsername(p.normalized_username) === normalized
    )
    if (matchedByName) return { linked: true, profile: matchedByName }
  }

  return { linked: false, profile: null }
}

/**
 * Finds all active applications for a user that are locked to or using a specific Instagram profile.
 * Used to guard against creators deleting accounts actively needed for campaign completion.
 */
export async function getActiveApplicationsUsingProfile(
  userId: string,
  handleOrProfileId: string
): Promise<{ id: string; campaign_code?: string; brand_name?: string; status: string }[]> {
  if (!userId || !handleOrProfileId) return []

  const { supabase } = await import('@/lib/supabase')
  const normalized = normalizeInstagramUsername(handleOrProfileId)

  const { data: applications, error } = await supabase
    .from('applications')
    .select(`
      id,
      status,
      form_data,
      campaigns (
        id,
        brand_name,
        campaign_code
      )
    `)
    .eq('user_id', userId)
    .in('status', ['Applied', 'Approved', 'Under Process'])

  if (error || !applications) return []

  const active = applications.filter((app: any) => {
    // If completion is already approved or application is rejected/cancelled, ignore
    if (app.status === 'Completed' || app.status === 'Rejected') return false
    const applied = getAppliedProfile(app)
    if (applied.profileId && applied.profileId === handleOrProfileId) return true
    if (normalized && (applied.normalized === normalized || applied.username === handleOrProfileId)) return true
    return false
  })

  return active.map((app: any) => {
    const camp = Array.isArray(app.campaigns) ? app.campaigns[0] : app.campaigns
    return {
      id: app.id,
      campaign_code: camp?.campaign_code || 'Campaign',
      brand_name: camp?.brand_name || 'Brand',
      status: app.status
    }
  })
}

/**
 * Ensures an Instagram profile is linked to a user.
 * If not already linked, inserts into `user_instagram_profiles` with `added_by` attribution,
 * and synchronizes state to `users.instagram_profiles`.
 */
export async function ensureProfileLinked(
  userId: string,
  username: string,
  addedBy: string = 'admin',
  options?: {
    followers?: number
    category?: string
    makePrimary?: boolean
  }
): Promise<{ success: boolean; profile: any; isNew: boolean; error?: string }> {
  const cleaned = extractInstagramUsername(username)
  const normalized = normalizeInstagramUsername(cleaned)
  if (!cleaned || !normalized) {
    return { success: false, profile: null, isNew: false, error: 'Invalid Instagram username' }
  }

  const { supabase } = await import('@/lib/supabase')

  // Check if user already has this profile
  const { data: existingProfiles } = await supabase
    .from('user_instagram_profiles')
    .select('*')
    .eq('user_id', userId)

  const existing = existingProfiles?.find(
    p => normalizeInstagramUsername(p.username) === normalized ||
         normalizeInstagramUsername(p.normalized_username) === normalized
  )

  if (existing) {
    // If makePrimary requested and not already primary
    if (options?.makePrimary && !existing.is_primary) {
      await supabase
        .from('user_instagram_profiles')
        .update({ is_primary: false, updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      await supabase
        .from('user_instagram_profiles')
        .update({ is_primary: true, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      await syncUserInstagramState(userId)
    }
    return { success: true, profile: existing, isNew: false }
  }

  // Check cross-account uniqueness
  const availability = await checkInstagramHandleAvailability(cleaned, userId)
  if (!availability.available) {
    return {
      success: false,
      profile: null,
      isNew: false,
      error: availability.message || `Instagram handle (@${cleaned}) is already linked to another account.`
    }
  }

  const isFirst = !existingProfiles || existingProfiles.length === 0
  const makePrimary = options?.makePrimary ?? isFirst

  if (makePrimary && existingProfiles && existingProfiles.length > 0) {
    await supabase
      .from('user_instagram_profiles')
      .update({ is_primary: false, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
  }

  const insertPayload: any = {
    user_id: userId,
    username: cleaned,
    normalized_username: normalized,
    followers: options?.followers || 0,
    category: options?.category || null,
    is_primary: makePrimary,
    is_verified: false,
    added_by: addedBy,
    created_at: new Date().toISOString()
  }

  const { data: newProfile, error: insertError } = await supabase
    .from('user_instagram_profiles')
    .insert([insertPayload])
    .select()
    .single()

  if (insertError) {
    return { success: false, profile: null, isNew: false, error: insertError.message }
  }

  await syncUserInstagramState(userId)

  return { success: true, profile: newProfile, isNew: true }
}

