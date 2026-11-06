import { describe, it, expect } from 'vitest'
import { maskEmail, isPlaceholderEmail } from '@/lib/user-utils'

describe('user-utils', () => {
  describe('maskEmail', () => {
    it('returns fallback for null, empty, or invalid email formats', () => {
      expect(maskEmail('')).toBe('***@***.com')
      expect(maskEmail('invalidemail')).toBe('***@***.com')
      expect(maskEmail('@domain.com')).toBe('***@domain.com')
    })

    it('masks short 1-character local part', () => {
      expect(maskEmail('a@gmail.com')).toBe('*@gmail.com')
    })

    it('masks short 2-character local part', () => {
      expect(maskEmail('ab@gmail.com')).toBe('a*@gmail.com')
    })

    it('applies alternating 2-character masking pattern for standard emails', () => {
      expect(maskEmail('yashandroid@gmail.com')).toBe('ya**an**oi*@gmail.com')
      expect(maskEmail('nitesh123@gmail.com')).toBe('ni**sh**3@gmail.com')
    })
  })

  describe('isPlaceholderEmail', () => {
    it('identifies falsy or non-string emails as placeholder', () => {
      expect(isPlaceholderEmail(null)).toBe(true)
      expect(isPlaceholderEmail(undefined)).toBe(true)
      expect(isPlaceholderEmail('')).toBe(true)
    })

    it('identifies internal system placeholder domains', () => {
      expect(isPlaceholderEmail('test@instagram.1to7.com')).toBe(true)
      expect(isPlaceholderEmail('user_123@guest.1to7.com')).toBe(true)
      expect(isPlaceholderEmail('9876543210@import.1to7.com')).toBe(true)
      expect(isPlaceholderEmail('USER@INSTAGRAM.1TO7.COM')).toBe(true)
    })

    it('identifies genuine creator emails as non-placeholder', () => {
      expect(isPlaceholderEmail('creator@gmail.com')).toBe(false)
      expect(isPlaceholderEmail('influencer@yahoo.com')).toBe(false)
      expect(isPlaceholderEmail('contact@agency.in')).toBe(false)
    })
  })
})

