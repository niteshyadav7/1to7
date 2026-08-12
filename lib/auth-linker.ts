import { supabase } from '@/lib/supabase'
import { generateSequentialInfluencerId } from '@/lib/user-utils'

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
  if (!existingUser && input.email && !input.email.endsWith('@instagram.1to7.com')) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('*')
      .eq('email', input.email)
      .maybeSingle()
    if (userByEmail) {
      existingUser = userByEmail
    }
  }

  // 5. Search by mobile if present
  if (!existingUser && input.mobile) {
    const { data: userByMobile } = await supabase
      .from('users')
      .select('*')
      .eq('mobile', input.mobile)
      .maybeSingle()
    if (userByMobile) {
      existingUser = userByMobile
    }
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

    // Fill email if current email is placeholder
    if (input.email && (!existingUser.email || existingUser.email.endsWith('@instagram.1to7.com'))) {
      updates.email = input.email
    }

    // Fill mobile if user didn't have one
    if (input.mobile && !existingUser.mobile) {
      updates.mobile = input.mobile
    }

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date().toISOString()
      await supabase.from('users').update(updates).eq('id', existingUser.id)
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
  const defaultEmail = input.email || `${input.instagramUsername || 'user'}_${Date.now()}@instagram.1to7.com`

  const insertPayload = {
    full_name: input.fullName || input.instagramUsername || 'Creator',
    email: defaultEmail,
    mobile: input.mobile || null,
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

  return { user: newUser, isNewUser: true }
}
