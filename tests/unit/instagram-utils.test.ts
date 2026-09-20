import { describe, it, expect } from 'vitest'
import {
  extractInstagramUsername,
  getInstagramUrl,
  getInstagramDisplayHandle,
  normalizeInstagramUsername,
} from '@/lib/instagram-utils'

describe('instagram-utils', () => {
  describe('extractInstagramUsername', () => {
    it('returns empty string for null, undefined, or empty string', () => {
      expect(extractInstagramUsername(null)).toBe('')
      expect(extractInstagramUsername(undefined)).toBe('')
      expect(extractInstagramUsername('')).toBe('')
      expect(extractInstagramUsername('   ')).toBe('')
    })

    it('extracts plain username correctly', () => {
      expect(extractInstagramUsername('niteshyadav')).toBe('niteshyadav')
    })

    it('strips leading @ symbol', () => {
      expect(extractInstagramUsername('@niteshyadav')).toBe('niteshyadav')
      expect(extractInstagramUsername('@@niteshyadav')).toBe('niteshyadav')
    })

    it('extracts username from standard Instagram profile URLs', () => {
      expect(extractInstagramUsername('https://instagram.com/niteshyadav')).toBe('niteshyadav')
      expect(extractInstagramUsername('http://instagram.com/niteshyadav')).toBe('niteshyadav')
      expect(extractInstagramUsername('https://www.instagram.com/niteshyadav')).toBe('niteshyadav')
      expect(extractInstagramUsername('http://www.instagram.com/niteshyadav/')).toBe('niteshyadav')
    })

    it('strips query parameters and hash fragments', () => {
      expect(
        extractInstagramUsername('https://www.instagram.com/niteshyadav?igsh=MW9nd3Fvcnc1MTJ3dQ%3D%3D')
      ).toBe('niteshyadav')
      expect(
        extractInstagramUsername('https://instagram.com/niteshyadav#header')
      ).toBe('niteshyadav')
    })

    it('handles mobile and duplicated prefixes', () => {
      expect(extractInstagramUsername('https://m.instagram.com/niteshyadav')).toBe('niteshyadav')
      expect(
        extractInstagramUsername('https://www.instagram.com/https://www.instagram.com/niteshyadav')
      ).toBe('niteshyadav')
    })

    it('extracts username from Instagram stories links', () => {
      expect(extractInstagramUsername('https://instagram.com/stories/niteshyadav/123456789')).toBe(
        'niteshyadav'
      )
    })
  })

  describe('getInstagramUrl', () => {
    it('returns empty string if input cannot be parsed', () => {
      expect(getInstagramUrl(null)).toBe('')
      expect(getInstagramUrl('')).toBe('')
    })

    it('formats a clean full Instagram URL', () => {
      expect(getInstagramUrl('niteshyadav')).toBe('https://www.instagram.com/niteshyadav')
      expect(getInstagramUrl('@niteshyadav')).toBe('https://www.instagram.com/niteshyadav')
      expect(getInstagramUrl('https://instagram.com/niteshyadav?hl=en')).toBe(
        'https://www.instagram.com/niteshyadav'
      )
    })
  })

  describe('getInstagramDisplayHandle', () => {
    it('returns empty string if input cannot be parsed', () => {
      expect(getInstagramDisplayHandle(null)).toBe('')
    })

    it('returns clean handle prefixed with @ for UI', () => {
      expect(getInstagramDisplayHandle('niteshyadav')).toBe('@niteshyadav')
      expect(getInstagramDisplayHandle('@niteshyadav')).toBe('@niteshyadav')
      expect(getInstagramDisplayHandle('https://instagram.com/niteshyadav')).toBe('@niteshyadav')
    })
  })

  describe('normalizeInstagramUsername', () => {
    it('lowercases and trims username for strict database uniqueness', () => {
      expect(normalizeInstagramUsername('  @Nitesh_Yadav  ')).toBe('nitesh_yadav')
      expect(normalizeInstagramUsername('https://instagram.com/CREATOR_NAME/')).toBe('creator_name')
    })
  })
})
