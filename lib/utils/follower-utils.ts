/**
 * Utility functions for follower count parsing, formatting, and campaign eligibility checks.
 */

/**
 * Parses freeform text or numbers into an integer follower threshold.
 * Examples:
 * - "10k" / "10k+" / "10K" -> 10000
 * - "1.5M" / "1.5m" -> 1500000
 * - "Above 2k" -> 2000
 * - "5,000" / "5000" -> 5000
 * - "Any" / "" -> 0
 */
export function parseMinFollowers(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : Math.max(0, Math.floor(val))
  }

  const str = String(val).trim().toLowerCase()
  if (!str || str === 'any' || str === 'none') return 0

  // Check for Million (e.g., 1.5m, 2m)
  const millionMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*m/i)
  if (millionMatch) {
    const num = parseFloat(millionMatch[1])
    return isNaN(num) ? 0 : Math.round(num * 1000000)
  }

  // Check for K / Thousand (e.g., 10k, 2.5k, 50k+)
  const kMatch = str.match(/([0-9]+(?:\.[0-9]+)?)\s*k/i)
  if (kMatch) {
    const num = parseFloat(kMatch[1])
    return isNaN(num) ? 0 : Math.round(num * 1000)
  }

  // Fallback: extract continuous digits
  const rawNum = str.replace(/[^0-9]/g, '')
  if (rawNum) {
    const num = parseInt(rawNum, 10)
    return isNaN(num) ? 0 : num
  }

  return 0
}

/**
 * Formats a numeric follower count into a human-friendly string (e.g. 10000 -> "10K", 1500000 -> "1.5M").
 */
export function formatFollowerCount(count: number | null | undefined): string {
  const num = Number(count) || 0
  if (num <= 0) return '0'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(num % 1000000 === 0 ? 0 : 1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(num % 1000 === 0 ? 0 : 1) + 'K'
  }
  return num.toLocaleString('en-IN')
}

export interface FollowerEligibility {
  eligible: boolean
  isEnforced: boolean
  requiredFollowers: number
  userFollowers: number
  shortfall: number
  message: string | null
}

/**
 * Evaluates whether a creator satisfies the follower requirements for a campaign.
 */
export function checkFollowerEligibility(
  userFollowers: number | null | undefined,
  campaign: {
    min_followers?: number | null
    enforce_followers?: boolean | null
    followers?: string | null
  } | null | undefined
): FollowerEligibility {
  const isEnforced = Boolean(campaign?.enforce_followers)
  const required = (campaign?.min_followers !== undefined && campaign?.min_followers !== null && campaign.min_followers > 0)
    ? campaign.min_followers
    : parseMinFollowers(campaign?.followers)
  const userCount = Number(userFollowers) || 0

  if (!isEnforced || required <= 0) {
    return {
      eligible: true,
      isEnforced: false,
      requiredFollowers: required,
      userFollowers: userCount,
      shortfall: 0,
      message: null,
    }
  }

  const eligible = userCount >= required
  const shortfall = Math.max(0, required - userCount)
  const message = eligible
    ? null
    : `This campaign strictly requires a minimum of ${formatFollowerCount(required)} (${required.toLocaleString('en-IN')}) followers. Your profile currently has ${formatFollowerCount(userCount)} (${userCount.toLocaleString('en-IN')}) followers.`

  return {
    eligible,
    isEnforced: true,
    requiredFollowers: required,
    userFollowers: userCount,
    shortfall,
    message,
  }
}

/**
 * Returns a clean, human-friendly display label for a campaign's follower requirement.
 * Examples:
 * - enforce_followers = true, min_followers = 2000 -> "Min 2K Followers (Strict)"
 * - enforce_followers = false, min_followers = 2000 -> "Min 2K Followers"
 * - enforce_followers = true, followers = "10k" -> "Min 10K Followers (Strict)"
 * - enforce_followers = false, followers = "10k" -> "10k"
 * - followers = "" & min_followers = 0 -> "No restriction"
 */
export function getFollowerRequirementLabel(
  campaign: {
    followers?: string | null
    min_followers?: number | null
    enforce_followers?: boolean | null
  } | null | undefined
): string {
  if (!campaign) return 'No restriction'

  const rawFollowersStr = campaign.followers ? campaign.followers.trim() : ''
  const isGenericNoRestrictionStr = !rawFollowersStr || ['any', 'none', 'no restriction', 'no restrictions', 'open to all'].includes(rawFollowersStr.toLowerCase())

  const parsedFromStr = parseMinFollowers(rawFollowersStr)
  const required = (campaign.min_followers !== undefined && campaign.min_followers !== null && Number(campaign.min_followers) > 0)
    ? Number(campaign.min_followers)
    : parsedFromStr

  if (required > 0) {
    const formatted = formatFollowerCount(required)
    if (campaign.enforce_followers) {
      return `Min ${formatted} Followers (Strict)`
    }
    if (!isGenericNoRestrictionStr && rawFollowersStr) {
      return rawFollowersStr
    }
    return `Min ${formatted} Followers`
  }

  if (!isGenericNoRestrictionStr && rawFollowersStr) {
    return rawFollowersStr
  }

  return 'No restriction'
}

/**
 * Resolves the effective follower count for a user across:
 * 1. Selected Instagram profile from `user.instagram_profiles` (if selectedProfileId provided)
 * 2. Primary Instagram profile from `user.instagram_profiles`
 * 3. Any connected Instagram profile in `user.instagram_profiles` with a valid count
 * 4. Direct `user.followers` (number or numeric string)
 * 5. Fallback `user.instagram_followers_count`
 */
export function getEffectiveUserFollowers(
  user: {
    followers?: number | string | null
    instagram_followers_count?: number | string | null
    instagram_profiles?: Array<{
      id?: string
      username?: string
      followers?: number | string | null
      is_primary?: boolean
    }> | null
  } | null | undefined,
  selectedProfileId?: string | null
): number {
  if (!user) return 0

  const profiles = Array.isArray(user.instagram_profiles) ? user.instagram_profiles : []

  // 1. If a specific profile ID or username is selected, try matching that first
  if (selectedProfileId && profiles.length > 0) {
    const selected = profiles.find(
      p => (p.id && p.id === selectedProfileId) || (p.username && p.username === selectedProfileId)
    )
    if (selected && selected.followers !== undefined && selected.followers !== null) {
      const parsed = typeof selected.followers === 'number'
        ? selected.followers
        : parseInt(String(selected.followers).replace(/\D/g, ''), 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }
  }

  // 2. Check primary profile from user.instagram_profiles
  if (profiles.length > 0) {
    const primary = profiles.find(p => p.is_primary) || profiles[0]
    if (primary && primary.followers !== undefined && primary.followers !== null) {
      const parsed = typeof primary.followers === 'number'
        ? primary.followers
        : parseInt(String(primary.followers).replace(/\D/g, ''), 10)
      if (!isNaN(parsed) && parsed > 0) return parsed
    }

    // Check if any other linked profile has followers
    for (const p of profiles) {
      if (p.followers !== undefined && p.followers !== null) {
        const parsed = typeof p.followers === 'number'
          ? p.followers
          : parseInt(String(p.followers).replace(/\D/g, ''), 10)
        if (!isNaN(parsed) && parsed > 0) return parsed
      }
    }
  }

  // 3. Direct user.followers column
  if (user.followers !== undefined && user.followers !== null) {
    const parsed = typeof user.followers === 'number'
      ? user.followers
      : parseInt(String(user.followers).replace(/\D/g, ''), 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }

  // 4. Fallback user.instagram_followers_count column
  if (user.instagram_followers_count !== undefined && user.instagram_followers_count !== null) {
    const parsed = typeof user.instagram_followers_count === 'number'
      ? user.instagram_followers_count
      : parseInt(String(user.instagram_followers_count).replace(/\D/g, ''), 10)
    if (!isNaN(parsed) && parsed > 0) return parsed
  }

  return 0
}
