import { describe, it, expect } from 'vitest'
import {
  checkLiveDateMaturation,
  getRequiredMaturationDays,
} from '@/lib/utils/completion-timeline-utils'

describe('completion-maturation', () => {
  describe('getRequiredMaturationDays', () => {
    it('defaults to 7 days when campaign or completion_days is not provided', () => {
      expect(getRequiredMaturationDays(null)).toBe(7)
      expect(getRequiredMaturationDays(undefined)).toBe(7)
      expect(getRequiredMaturationDays({})).toBe(7)
      expect(getRequiredMaturationDays({ completion_days: null })).toBe(7)
      expect(getRequiredMaturationDays({ completion_days: undefined })).toBe(7)
    })

    it('returns 0 for fast-turnaround campaigns with completion_days < 7', () => {
      expect(getRequiredMaturationDays({ completion_days: 1 })).toBe(0)
      expect(getRequiredMaturationDays({ completion_days: 2 })).toBe(0)
      expect(getRequiredMaturationDays({ completion_days: 3 })).toBe(0)
      expect(getRequiredMaturationDays({ completion_days: 5 })).toBe(0)
    })

    it('returns 7 for standard 7+ day campaigns', () => {
      expect(getRequiredMaturationDays({ completion_days: 7 })).toBe(7)
      expect(getRequiredMaturationDays({ completion_days: 10 })).toBe(7)
      expect(getRequiredMaturationDays({ completion_days: 14 })).toBe(7)
    })
  })

  describe('checkLiveDateMaturation', () => {
    it('rejects empty or missing live dates', () => {
      const res = checkLiveDateMaturation(null, 7)
      expect(res.canSubmit).toBe(false)
      expect(res.message).toContain('Please select the date')
    })

    it('rejects invalid live date strings', () => {
      const res = checkLiveDateMaturation('invalid-date', 7)
      expect(res.canSubmit).toBe(false)
      expect(res.message).toBe('Invalid live date format.')
    })

    it('rejects future live dates', () => {
      const future = new Date()
      future.setDate(future.getDate() + 2)
      const res = checkLiveDateMaturation(future.toISOString().split('T')[0], 7)
      expect(res.canSubmit).toBe(false)
      expect(res.message).toBe('Live date cannot be in the future.')
    })

    it('allows immediate submission when minDaysRequired is 0 for past or today dates', () => {
      const today = new Date().toISOString().split('T')[0]
      const resToday = checkLiveDateMaturation(today, 0)
      expect(resToday.canSubmit).toBe(true)
      expect(resToday.minDaysRequired).toBe(0)
      expect(resToday.daysRemaining).toBe(0)
      expect(resToday.message).toContain('You can now submit your deliverables')

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const resYesterday = checkLiveDateMaturation(yesterday.toISOString().split('T')[0], 0)
      expect(resYesterday.canSubmit).toBe(true)
      expect(resYesterday.daysElapsed).toBeGreaterThanOrEqual(1)
    })

    it('enforces 7-day wait when minDaysRequired is 7', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const res = checkLiveDateMaturation(yesterday.toISOString().split('T')[0], 7)
      expect(res.canSubmit).toBe(false)
      expect(res.minDaysRequired).toBe(7)
      expect(res.daysRemaining).toBe(6)
      expect(res.message).toContain('Mandatory 7-day analytics maturation period required')

      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
      const resMatured = checkLiveDateMaturation(eightDaysAgo.toISOString().split('T')[0], 7)
      expect(resMatured.canSubmit).toBe(true)
      expect(resMatured.daysRemaining).toBe(0)
      expect(resMatured.message).toContain('Maturation complete')
    })
  })
})
