import { describe, it, expect } from 'vitest'
import { maskEmail } from '@/lib/user-utils'

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
      // "yashandroid":
      // "ya" (visible)
      // "sh" -> "**" (masked)
      // "an" (visible)
      // "dr" -> "**" (masked)
      // "oi" (visible)
      // "d" -> "*" (masked)
      expect(maskEmail('yashandroid@gmail.com')).toBe('ya**an**oi*@gmail.com')

      // "nitesh123":
      // "ni" (visible)
      // "te" -> "**" (masked)
      // "sh" (visible)
      // "12" -> "**" (masked)
      // "3" (visible)
      expect(maskEmail('nitesh123@gmail.com')).toBe('ni**sh**3@gmail.com')
    })
  })
})
