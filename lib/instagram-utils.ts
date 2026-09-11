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
