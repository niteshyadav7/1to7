'use client'

import { toast } from 'sonner'
import { extractInstagramUsername } from '@/lib/instagram-utils'

export interface BulkOpenOptions {
  itemLabel?: string
  onComplete?: () => void
}

/**
 * Opens any list of URLs in separate browser tabs with a slight stagger
 * to prevent browser pop-up blocker drops and rate limits.
 */
export function openUrlsInBulk(
  rawUrls: (string | null | undefined)[],
  options?: BulkOpenOptions
): { totalOpened: number; missingCount: number } {
  if (typeof window === 'undefined') {
    return { totalOpened: 0, missingCount: 0 }
  }

  const validUrls = rawUrls
    .map((u) => (u ? String(u).trim() : ''))
    .filter((u) => Boolean(u && (u.startsWith('http://') || u.startsWith('https://'))))

  const missingCount = rawUrls.length - validUrls.length
  const label = options?.itemLabel || 'link'

  if (validUrls.length === 0) {
    toast.error(`No valid ${label}s found for selected items`)
    return { totalOpened: 0, missingCount }
  }

  // Open tabs with a staggered 85ms interval to bypass Chrome single-click pop-up limitations
  validUrls.forEach((url, index) => {
    setTimeout(() => {
      window.open(url, '_blank', 'noopener,noreferrer')
    }, index * 85)
  })

  if (missingCount > 0) {
    toast.info(
      `Opening ${validUrls.length} ${label}${validUrls.length > 1 ? 's' : ''} (${missingCount} without ${label})...`,
      {
        description:
          '💡 If Chrome blocked any tabs, click the 🚫 icon on the right side of the address bar and select "Always allow pop-ups from this site".',
        duration: 6000
      }
    )
  } else {
    toast.info(
      `Opening ${validUrls.length} ${label}${validUrls.length > 1 ? 's' : ''} in separate tabs...`,
      {
        description:
          validUrls.length > 1
            ? '💡 If Chrome blocked any tabs, click the 🚫 icon on the right side of the address bar and select "Always allow pop-ups from this site".'
            : undefined,
        duration: 5000
      }
    )
  }

  options?.onComplete?.()
  return { totalOpened: validUrls.length, missingCount }
}

/**
 * Opens Instagram profiles in separate browser tabs with a slight stagger
 * to prevent browser pop-up blocker interference and rate limits.
 *
 * STRICT REQUIREMENT: Only opens external Instagram profiles (https://www.instagram.com/{username}).
 * Never navigates to internal admin paths like /admin/virtual-profile/...
 */
export function openInstagramProfilesInBulk(
  rawHandles: (string | null | undefined)[],
  options?: { onComplete?: () => void }
): { totalOpened: number; missingCount: number } {
  const urls = rawHandles.map((handle) => {
    const username = extractInstagramUsername(handle)
    return username ? `https://www.instagram.com/${username}` : null
  })

  return openUrlsInBulk(urls, {
    itemLabel: 'Instagram profile',
    onComplete: options?.onComplete
  })
}
