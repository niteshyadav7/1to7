import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { openInstagramProfilesInBulk, openUrlsInBulk } from '@/lib/bulk-instagram-opener'

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    error: vi.fn(),
    success: vi.fn()
  }
}))

describe('bulk-instagram-opener', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    ;(global as any).window = {
      open: vi.fn()
    }
  })

  afterEach(() => {
    delete (global as any).window
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('openInstagramProfilesInBulk', () => {
    it('filters empty or null handles and opens valid Instagram profiles', () => {
      const handles = [
        '@priya_fashion',
        'https://www.instagram.com/rahul_fitness?igsh=abc123==',
        null,
        '',
        'rohit_vlogs'
      ]

      const result = openInstagramProfilesInBulk(handles)
      expect(result.totalOpened).toBe(3)
      expect(result.missingCount).toBe(2)

      // Advance timers so staggered setTimeout fires
      vi.runAllTimers()

      expect(window.open).toHaveBeenCalledTimes(3)
      expect(window.open).toHaveBeenNthCalledWith(
        1,
        'https://www.instagram.com/priya_fashion',
        '_blank',
        'noopener,noreferrer'
      )
      expect(window.open).toHaveBeenNthCalledWith(
        2,
        'https://www.instagram.com/rahul_fitness',
        '_blank',
        'noopener,noreferrer'
      )
      expect(window.open).toHaveBeenNthCalledWith(
        3,
        'https://www.instagram.com/rohit_vlogs',
        '_blank',
        'noopener,noreferrer'
      )
    })

    it('never creates internal admin virtual-profile URLs', () => {
      const handles = ['test_creator']
      openInstagramProfilesInBulk(handles)
      vi.runAllTimers()

      expect(window.open).toHaveBeenCalledWith(
        'https://www.instagram.com/test_creator',
        '_blank',
        'noopener,noreferrer'
      )
      expect(window.open).not.toHaveBeenCalledWith(
        expect.stringContaining('/admin/virtual-profile'),
        expect.anything(),
        expect.anything()
      )
    })

    it('handles empty list gracefully without opening tabs', () => {
      const result = openInstagramProfilesInBulk([null, undefined, ''])
      expect(result.totalOpened).toBe(0)
      expect(result.missingCount).toBe(3)
      expect(window.open).not.toHaveBeenCalled()
    })
  })

  describe('openUrlsInBulk', () => {
    it('opens valid screenshot URLs in separate tabs', () => {
      const urls = [
        'https://supabase.co/storage/v1/object/public/screenshots/order1.png',
        'https://supabase.co/storage/v1/object/public/screenshots/order2.jpg',
        null,
        '',
        'invalid-url'
      ]

      const result = openUrlsInBulk(urls, { itemLabel: 'order screenshot' })
      expect(result.totalOpened).toBe(2)
      expect(result.missingCount).toBe(3)

      vi.runAllTimers()

      expect(window.open).toHaveBeenCalledTimes(2)
      expect(window.open).toHaveBeenNthCalledWith(
        1,
        'https://supabase.co/storage/v1/object/public/screenshots/order1.png',
        '_blank',
        'noopener,noreferrer'
      )
      expect(window.open).toHaveBeenNthCalledWith(
        2,
        'https://supabase.co/storage/v1/object/public/screenshots/order2.jpg',
        '_blank',
        'noopener,noreferrer'
      )
    })
  })
})
