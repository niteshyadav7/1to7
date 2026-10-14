import { describe, it, expect } from 'vitest'
import {
  checkLiveDateMaturation,
  getRequiredMaturationDays,
} from '@/lib/utils/completion-timeline-utils'

describe('completion-maturation', () => {
  describe('getRequiredMaturationDays', () => {
    it('returns 0 days by default so creators can submit deliverables immediately', () => {
      expect(getRequiredMaturationDays(null)).toBe(0)
      expect(getRequiredMaturationDays(undefined)).toBe(0)
      expect(getRequiredMaturationDays({})).toBe(0)
      expect(getRequiredMaturationDays({ completion_days: null })).toBe(0)
      expect(getRequiredMaturationDays({ completion_days: undefined })).toBe(0)
      expect(getRequiredMaturationDays({ completion_days: 1 })).toBe(0)
      expect(getRequiredMaturationDays({ completion_days: 7 })).toBe(0)
      expect(getRequiredMaturationDays({ completion_days: 14 })).toBe(0)
    })
  })

  describe('checkLiveDateMaturation', () => {
    it('rejects empty or missing live dates', () => {
      const res = checkLiveDateMaturation(null)
      expect(res.canSubmit).toBe(false)
      expect(res.message).toContain('Please select the date')
    })

    it('rejects invalid live date strings', () => {
      const res = checkLiveDateMaturation('invalid-date')
      expect(res.canSubmit).toBe(false)
      expect(res.message).toBe('Invalid live date format.')
    })

    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear()
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    it('rejects future live dates', () => {
      const future = new Date()
      future.setDate(future.getDate() + 2)
      const res = checkLiveDateMaturation(formatLocalDate(future))
      expect(res.canSubmit).toBe(false)
      expect(res.message).toBe('Live date cannot be in the future.')
    })

    it('allows immediate submission by default (0 days) for today or past dates', () => {
      const today = formatLocalDate(new Date())
      const resToday = checkLiveDateMaturation(today)
      expect(resToday.canSubmit).toBe(true)
      expect(resToday.minDaysRequired).toBe(0)
      expect(resToday.daysRemaining).toBe(0)
      expect(resToday.message).toContain('You can now submit your deliverables')

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const resYesterday = checkLiveDateMaturation(formatLocalDate(yesterday))
      expect(resYesterday.canSubmit).toBe(true)
      expect(resYesterday.daysElapsed).toBeGreaterThanOrEqual(1)
    })

    it('enforces custom wait if an explicit minDaysRequired is provided', () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const res = checkLiveDateMaturation(formatLocalDate(yesterday), 7)
      expect(res.canSubmit).toBe(false)
      expect(res.minDaysRequired).toBe(7)
      expect(res.daysRemaining).toBe(6)
      expect(res.message).toContain('Mandatory 7-day analytics maturation period required')

      const eightDaysAgo = new Date()
      eightDaysAgo.setDate(eightDaysAgo.getDate() - 8)
      const resMatured = checkLiveDateMaturation(formatLocalDate(eightDaysAgo), 7)
      expect(resMatured.canSubmit).toBe(true)
      expect(resMatured.daysRemaining).toBe(0)
      expect(resMatured.message).toContain('Maturation complete')
    })
  })
})
