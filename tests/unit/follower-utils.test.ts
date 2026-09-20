import { describe, it, expect } from 'vitest'
import {
  parseMinFollowers,
  formatFollowerCount,
  checkFollowerEligibility,
} from '@/lib/utils/follower-utils'

describe('follower-utils', () => {
  describe('parseMinFollowers', () => {
    it('handles null, undefined, and non-threshold strings', () => {
      expect(parseMinFollowers(null)).toBe(0)
      expect(parseMinFollowers(undefined)).toBe(0)
      expect(parseMinFollowers('any')).toBe(0)
      expect(parseMinFollowers('none')).toBe(0)
      expect(parseMinFollowers('')).toBe(0)
    })

    it('parses numeric values directly', () => {
      expect(parseMinFollowers(10000)).toBe(10000)
      expect(parseMinFollowers(500.8)).toBe(500)
    })

    it('parses "k" notation for thousands', () => {
      expect(parseMinFollowers('10k')).toBe(10000)
      expect(parseMinFollowers('10K')).toBe(10000)
      expect(parseMinFollowers('2.5k')).toBe(2500)
      expect(parseMinFollowers('50k+')).toBe(50000)
      expect(parseMinFollowers('Above 5k')).toBe(5000)
    })

    it('parses "m" notation for millions', () => {
      expect(parseMinFollowers('1M')).toBe(1000000)
      expect(parseMinFollowers('1.5m')).toBe(1500000)
      expect(parseMinFollowers('2.25M+')).toBe(2250000)
    })

    it('parses comma-separated numeric strings', () => {
      expect(parseMinFollowers('5,000')).toBe(5000)
      expect(parseMinFollowers('100,000')).toBe(100000)
    })
  })

  describe('formatFollowerCount', () => {
    it('formats 0 or negative numbers', () => {
      expect(formatFollowerCount(0)).toBe('0')
      expect(formatFollowerCount(-10)).toBe('0')
      expect(formatFollowerCount(null)).toBe('0')
    })

    it('formats small numbers under 1,000', () => {
      expect(formatFollowerCount(500)).toBe('500')
      expect(formatFollowerCount(999)).toBe('999')
    })

    it('formats thousands with K', () => {
      expect(formatFollowerCount(1000)).toBe('1K')
      expect(formatFollowerCount(10000)).toBe('10K')
      expect(formatFollowerCount(15500)).toBe('15.5K')
    })

    it('formats millions with M', () => {
      expect(formatFollowerCount(1000000)).toBe('1M')
      expect(formatFollowerCount(2500000)).toBe('2.5M')
    })
  })

  describe('checkFollowerEligibility', () => {
    it('is always eligible if enforce_followers is false or not set', () => {
      const result = checkFollowerEligibility(500, {
        min_followers: 10000,
        enforce_followers: false,
      })
      expect(result.eligible).toBe(true)
      expect(result.isEnforced).toBe(false)
      expect(result.shortfall).toBe(0)
    })

    it('evaluates eligibility correctly when enforced', () => {
      // Meets criteria
      const pass = checkFollowerEligibility(12000, {
        min_followers: 10000,
        enforce_followers: true,
      })
      expect(pass.eligible).toBe(true)
      expect(pass.shortfall).toBe(0)

      // Does not meet criteria
      const fail = checkFollowerEligibility(7500, {
        min_followers: 10000,
        enforce_followers: true,
      })
      expect(fail.eligible).toBe(false)
      expect(fail.shortfall).toBe(2500)
      expect(fail.requiredFollowers).toBe(10000)
    })

    it('parses campaign followers string if min_followers is not explicitly defined', () => {
      const result = checkFollowerEligibility(1500, {
        followers: '5k',
        enforce_followers: true,
      })
      expect(result.eligible).toBe(false)
      expect(result.requiredFollowers).toBe(5000)
      expect(result.shortfall).toBe(3500)
    })
  })
})
