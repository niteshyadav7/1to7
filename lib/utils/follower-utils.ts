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
