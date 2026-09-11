import { supabase } from '@/lib/supabase'
import { generateSequentialInfluencerId } from '@/lib/user-utils'
import { extractInstagramUsername, normalizeInstagramUsername, syncUserInstagramState } from '@/lib/instagram-utils'

export interface UserLinkInput {
  currentUserId?: string | null
  email?: string | null
  mobile?: string | null
  fullName?: string | null
  instagramId?: string | null
  instagramUsername?: string | null
  instagramAccessToken?: string | null
  instagramProfilePic?: string | null
  instagramBiography?: string | null
  instagramWebsite?: string | null
  instagramFollowersCount?: number | null
  instagramMediaCount?: number | null
  instagramAccountType?: string | null
  isEmailVerified?: boolean
  isMobileVerified?: boolean
  isInstagramVerified?: boolean
}

/**
 * Unified identity resolver for cross-method account linking:
 * 1. If currentUserId is passed (user already logged in), links data directly to that user.
 * 2. If not logged in, searches existing users by instagramId -> instagramUsername -> email -> mobile.
 * 3. Updates existing user record with fresh provider data without creating duplicates.
 * 4. If no user matches, creates a new user record with a sequential influencer_id.
 */
export async function resolveOrCreateUserIdentity(input: UserLinkInput) {
  let existingUser: any = null

  const cleanEmail = input.email ? input.email.trim().toLowerCase() : null
  const isRealEmail = cleanEmail && !cleanEmail.endsWith('@instagram.1to7.com')
  const cleanMobile = input.mobile ? String(input.mobile).replace(/\D/g, '') : null

  // 1. Check if user is currently logged in
  if (input.currentUserId) {
    const { data: userById } = await supabase
      .from('users')
      .select('*')
      .eq('id', input.currentUserId)
      .maybeSingle()
    if (userById) {
      existingUser = userById
    }
  }

  // 2. Search by instagram_id if present
  if (!existingUser && input.instagramId) {
    const { data: userByInstaId } = await supabase
      .from('users')
      .select('*')
      .eq('instagram_id', input.instagramId)
      .maybeSingle()
    if (userByInstaId) {
      existingUser = userByInstaId
    }
  }

  // 3. Search by instagram_username if present
  if (!existingUser && input.instagramUsername) {
    const { data: userByInstaUsername } = await supabase
      .from('users')
      .select('*')
      .eq('instagram_username', input.instagramUsername)
      .maybeSingle()
    if (userByInstaUsername) {
      existingUser = userByInstaUsername
    }
  }

  // 4. Search by email if present and valid
  let userByEmail: any = null
  if (isRealEmail) {
    const { data: emailMatch } = await supabase
      .from('users')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle()
    if (emailMatch) {
      userByEmail = emailMatch
      if (!existingUser) {
        existingUser = emailMatch
      }
    }
  }

  // 5. Search by mobile if present
  let userByMobile: any = null
  if (cleanMobile) {
    const { data: mobileMatch } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', cleanMobile)
      .maybeSingle()
    if (mobileMatch) {
      userByMobile = mobileMatch
    }
  }

  // ─── STRICT CONFLICT VALIDATION ───
  // Case A: If user matched by mobile, but a different real email was provided
  if (userByMobile && isRealEmail) {
    const mobileUserEmail = userByMobile.email ? userByMobile.email.trim().toLowerCase() : ''
    const isMobileUserPlaceholder = !mobileUserEmail || mobileUserEmail.endsWith('@instagram.1to7.com')

    if (!isMobileUserPlaceholder && mobileUserEmail !== cleanEmail) {
      throw new Error(
        `Email mismatch: Mobile number +91 ${cleanMobile} is registered to another email address.`
      )
    }

    if (userByEmail && userByEmail.id !== userByMobile.id) {
      throw new Error(
        `Identity conflict: Email ${cleanEmail} and mobile +91 ${cleanMobile} belong to two different accounts.`
      )
    }

    if (!existingUser) {
      existingUser = userByMobile
    }
  } else if (!existingUser && userByMobile) {
    existingUser = userByMobile
  }

  // Case B: If existingUser was found by email/Instagram, but input.mobile belongs to someone else
  if (existingUser && cleanMobile && userByMobile && userByMobile.id !== existingUser.id) {
    throw new Error(
      `Mobile number +91 ${cleanMobile} is already in use by another account.`
    )
  }

  // UPDATE EXISTING USER
  if (existingUser) {
    const updates: any = {}

    if (input.instagramId) updates.instagram_id = input.instagramId
    if (input.instagramUsername) updates.instagram_username = input.instagramUsername
    if (input.instagramAccessToken) updates.instagram_access_token = input.instagramAccessToken
    if (input.instagramProfilePic) updates.instagram_profile_pic = input.instagramProfilePic
    if (input.instagramBiography) updates.instagram_biography = input.instagramBiography
    if (input.instagramWebsite) updates.instagram_website = input.instagramWebsite
    if (input.instagramFollowersCount !== undefined && input.instagramFollowersCount !== null) {
      updates.instagram_followers_count = input.instagramFollowersCount
      updates.followers = input.instagramFollowersCount
    }
    if (input.instagramMediaCount !== undefined && input.instagramMediaCount !== null) {
      updates.instagram_media_count = input.instagramMediaCount
    }
    if (input.instagramAccountType) updates.instagram_account_type = input.instagramAccountType

    if (input.isEmailVerified !== undefined) updates.is_email_verified = input.isEmailVerified
    if (input.isMobileVerified !== undefined) updates.is_mobile_verified = input.isMobileVerified
    if (input.isInstagramVerified !== undefined) updates.is_instagram_verified = input.isInstagramVerified

    // Fill name if user had a placeholder
    if (input.fullName && (!existingUser.full_name || existingUser.full_name === 'Guest Creator' || existingUser.full_name.trim() === '')) {
      updates.full_name = input.fullName
    }

    // Fill email if current email is placeholder and cleanEmail is valid
    if (cleanEmail && (!existingUser.email || existingUser.email.endsWith('@instagram.1to7.com'))) {
      updates.email = cleanEmail
    }

    // Fill mobile if user didn't have one and cleanMobile is not owned by someone else
    if (cleanMobile && !existingUser.mobile && (!userByMobile || userByMobile.id === existingUser.id)) {
      updates.mobile = cleanMobile
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      await supabase.from('users').update(updates).eq('id', existingUser.id)
    }

    // Synchronize user_instagram_profiles table to eliminate split-brain
    if (input.instagramUsername) {
      try {
        const cleanHandle = extractInstagramUsername(input.instagramUsername)
        const normHandle = normalizeInstagramUsername(cleanHandle)
        if (cleanHandle && !cleanHandle.startsWith('insta_')) {
          const { data: existingProfiles } = await supabase
            .from('user_instagram_profiles')
            .select('*')
            .eq('user_id', existingUser.id)

          const match = existingProfiles?.find(p => p.normalized_username === normHandle) || existingProfiles?.find(p => p.is_primary)
          if (match) {
            await supabase
              .from('user_instagram_profiles')
              .update({
                username: cleanHandle,
                normalized_username: normHandle,
                followers: typeof input.instagramFollowersCount === 'number' && input.instagramFollowersCount > 0 ? input.instagramFollowersCount : match.followers,
                profile_pic: input.instagramProfilePic || match.profile_pic,
                is_verified: true,
                is_primary: true,
                updated_at: new Date().toISOString()
              })
              .eq('id', match.id)
          } else {
            await supabase
              .from('user_instagram_profiles')
              .insert([{
                user_id: existingUser.id,
                username: cleanHandle,
                normalized_username: normHandle,
                followers: typeof input.instagramFollowersCount === 'number' ? input.instagramFollowersCount : 0,
                profile_pic: input.instagramProfilePic || '',
                is_primary: true,
                is_verified: true
              }])
          }
          await syncUserInstagramState(existingUser.id)
        }
      } catch (igSyncErr) {
        console.warn('[auth-linker] Failed to sync user_instagram_profiles:', igSyncErr)
      }
    }

    const { data: updatedUser } = await supabase
      .from('users')
      .select('*')
      .eq('id', existingUser.id)
      .single()

    return { user: updatedUser || existingUser, isNewUser: false }
  }

  // CREATE NEW USER
  const newInfluencerId = await generateSequentialInfluencerId()
  const defaultEmail = cleanEmail || `${input.instagramUsername || 'user'}_${Date.now()}@instagram.1to7.com`

  const insertPayload = {
    full_name: input.fullName || input.instagramUsername || 'Creator',
    email: defaultEmail,
    mobile: cleanMobile || null,
    password_hash: '$2b$10$vysFdPLELlPEvtXf1B5kneSq1OV0iEtxOUlf4LpwKfGXmenL1jUpm',
    influencer_id: newInfluencerId,
    instagram_id: input.instagramId || null,
    instagram_username: input.instagramUsername || null,
    instagram_access_token: input.instagramAccessToken || null,
    instagram_profile_pic: input.instagramProfilePic || '',
    instagram_biography: input.instagramBiography || '',
    instagram_website: input.instagramWebsite || '',
    instagram_followers_count: input.instagramFollowersCount || 0,
    instagram_media_count: input.instagramMediaCount || 0,
    instagram_account_type: input.instagramAccountType || '',
    followers: input.instagramFollowersCount || 0,
    is_email_verified: input.isEmailVerified ?? true,
    is_mobile_verified: input.isMobileVerified ?? false,
    is_instagram_verified: input.isInstagramVerified ?? (!!input.instagramUsername)
  }

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert([insertPayload])
    .select('*')
    .single()

  if (insertError) {
    throw insertError
  }

  // Synchronize user_instagram_profiles table for new user
  if (input.instagramUsername && newUser) {
    try {
      const cleanHandle = extractInstagramUsername(input.instagramUsername)
      const normHandle = normalizeInstagramUsername(cleanHandle)
      if (cleanHandle && !cleanHandle.startsWith('insta_')) {
        await supabase
          .from('user_instagram_profiles')
          .insert([{
            user_id: newUser.id,
            username: cleanHandle,
            normalized_username: normHandle,
            followers: typeof input.instagramFollowersCount === 'number' ? input.instagramFollowersCount : 0,
            profile_pic: input.instagramProfilePic || '',
            is_primary: true,
            is_verified: true
          }])
        await syncUserInstagramState(newUser.id)
      }
    } catch (igSyncErr) {
      console.warn('[auth-linker] Failed to insert initial user_instagram_profiles:', igSyncErr)
    }
  }

  return { user: newUser, isNewUser: true }
}

