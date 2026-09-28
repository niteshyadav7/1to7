/**
 * POC (Point of Contact) Utility Functions & Metric Calculators
 * Centralizes calculation logic, completion rates, WoW growth, and search helpers.
 */

export interface DailyActivityPoint {
  date: string
  label?: string
  approvals: number
  payouts?: number
  completions?: number
}

/**
 * Calculates completion rate percentage.
 * Rounded to 1 decimal place.
 */
export function calculateCompletionRate(completed: number, approved: number): number {
  if (!approved || approved <= 0) return 0
  const rate = (completed / approved) * 100
  return Math.round(rate * 10) / 10
}

/**
 * Calculates Week-over-Week (WoW) or Period-over-Period growth percentage.
 */
export function calculateWowGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0
  }
  const growth = ((current - previous) / previous) * 100
  return Math.round(growth * 10) / 10
}

/**
 * Finds the peak performing day from an array of daily activity points.
 */
export function findPeakDay<T extends DailyActivityPoint>(days: T[]): T | null {
  if (!days || days.length === 0) return null
  const sorted = [...days].sort((a, b) => b.approvals - a.approvals)
  return sorted[0].approvals > 0 ? sorted[0] : null
}

/**
 * Checks whether an update object contains ONLY POC/metadata updates.
 * Used by Maker-Checker logic to ensure changing POC assignment alone
 * does NOT revoke live campaign status on production.
 */
export function isPocOnlyUpdate(updates: Record<string, any>): boolean {
  const allowedInternalKeys = new Set([
    'poc_admin_ids',
    'last_edited_by_admin_id',
    'last_edited_by_admin_name',
    'last_edited_by_admin_email',
    'last_edited_at',
    'updated_at',
    'edit_history',
  ])
  const keys = Object.keys(updates)
  if (keys.length === 0) return true
  return keys.every(k => allowedInternalKeys.has(k))
}

/**
 * Filters campaigns where a specific POC is assigned.
 */
export function filterCampaignsByPoc<T extends { poc_admin_ids?: string[] }>(
  campaigns: T[],
  pocId: string
): T[] {
  if (!campaigns || !pocId) return []
  return campaigns.filter(c => Array.isArray(c.poc_admin_ids) && c.poc_admin_ids.includes(pocId))
}

/**
 * Matches a campaign against a search query, including POC names resolved via pocMap.
 */
export function matchesCampaignSearch<T extends {
  brand_name?: string
  campaign_code?: string
  platform?: string
  poc_admin_ids?: string[]
}>(
  campaign: T,
  searchQuery: string,
  pocMap: Record<string, { name: string; email?: string }> = {}
): boolean {
  if (!searchQuery || !searchQuery.trim()) return true
  const q = searchQuery.toLowerCase().trim()

  const brandMatch = (campaign.brand_name || '').toLowerCase().includes(q)
  const codeMatch = (campaign.campaign_code || '').toLowerCase().includes(q)
  const platformMatch = (campaign.platform || '').toLowerCase().includes(q)

  const pocMatch = Array.isArray(campaign.poc_admin_ids)
    ? campaign.poc_admin_ids.some(id => {
        const poc = pocMap[id]
        if (!poc) return false
        return (
          (poc.name || '').toLowerCase().includes(q) ||
          (poc.email || '').toLowerCase().includes(q)
        )
      })
    : false

  return brandMatch || codeMatch || platformMatch || pocMatch
}
