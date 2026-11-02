import { describe, it, expect } from 'vitest'
import {
  calculateBrandHitRate,
  calculateSlaStatus,
  formatSlaDuration,
  filterPocCampaignsByMode,
} from '@/lib/utils/poc-utils'

describe('POC Brand Operations Utility Tests (Production Safe)', () => {
  describe('calculateBrandHitRate', () => {
    it('returns 0 when pitched count is 0 or negative', () => {
      expect(calculateBrandHitRate(0, 0)).toBe(0)
      expect(calculateBrandHitRate(5, 0)).toBe(0)
      expect(calculateBrandHitRate(5, -2)).toBe(0)
    })

    it('returns 0 when approved count is 0 or negative', () => {
      expect(calculateBrandHitRate(0, 10)).toBe(0)
      expect(calculateBrandHitRate(-3, 10)).toBe(0)
    })

    it('calculates correct conversion percentage rounded to 1 decimal place', () => {
      expect(calculateBrandHitRate(15, 20)).toBe(75)
      expect(calculateBrandHitRate(1, 3)).toBe(33.3)
      expect(calculateBrandHitRate(7, 8)).toBe(87.5)
      expect(calculateBrandHitRate(10, 10)).toBe(100)
    })

    it('caps rate at 100% even if approved exceeds pitched due to edge anomalies', () => {
      expect(calculateBrandHitRate(25, 20)).toBe(100)
    })
  })

  describe('calculateSlaStatus', () => {
    it('marks as on_track when hours elapsed is <= 24', () => {
      expect(calculateSlaStatus(0)).toBe('on_track')
      expect(calculateSlaStatus(12)).toBe('on_track')
      expect(calculateSlaStatus(24)).toBe('on_track')
    })

    it('marks as warning when hours elapsed is between 24 and 48', () => {
      expect(calculateSlaStatus(24.1)).toBe('warning')
      expect(calculateSlaStatus(36)).toBe('warning')
      expect(calculateSlaStatus(48)).toBe('warning')
    })

    it('marks as breached when hours elapsed exceeds 48', () => {
      expect(calculateSlaStatus(48.1)).toBe('breached')
      expect(calculateSlaStatus(72)).toBe('breached')
      expect(calculateSlaStatus(120)).toBe('breached')
    })

    it('handles negative or invalid values gracefully as on_track', () => {
      expect(calculateSlaStatus(-5)).toBe('on_track')
    })
  })

  describe('formatSlaDuration', () => {
    it('formats hours under 24 into readable hour strings', () => {
      expect(formatSlaDuration(0)).toBe('0h')
      expect(formatSlaDuration(5.4)).toBe('5h')
      expect(formatSlaDuration(18)).toBe('18h')
    })

    it('formats hours 24 and above into days and hours', () => {
      expect(formatSlaDuration(24)).toBe('1d 0h')
      expect(formatSlaDuration(30)).toBe('1d 6h')
      expect(formatSlaDuration(52)).toBe('2d 4h')
    })
  })

  describe('filterPocCampaignsByMode', () => {
    const sampleCampaigns = [
      {
        id: 'c1',
        brandName: 'Plum',
        pendingOrders: 5,
        pendingDeliverables: 2,
        pendingPayments: 0,
        pendingApplications: 10,
        brandPitched: 0,
        brandSlaBreaches: 0,
        brandDispatchPending: 0,
      },
      {
        id: 'c2',
        brandName: 'Minimalist',
        pendingOrders: 0,
        pendingDeliverables: 0,
        pendingPayments: 0,
        pendingApplications: 0,
        brandPitched: 12,
        brandSlaBreaches: 2,
        brandDispatchPending: 3,
      },
      {
        id: 'c3',
        brandName: 'Mamaearth',
        pendingOrders: 3,
        pendingDeliverables: 0,
        pendingPayments: 1,
        pendingApplications: 5,
        brandPitched: 8,
        brandSlaBreaches: 0,
        brandDispatchPending: 1,
      },
      {
        id: 'c4',
        brandName: 'All Clear Brand',
        pendingOrders: 0,
        pendingDeliverables: 0,
        pendingPayments: 0,
        pendingApplications: 0,
        brandPitched: 0,
        brandSlaBreaches: 0,
        brandDispatchPending: 0,
      },
    ]

    it('returns all campaigns when mode is "360"', () => {
      const filtered = filterPocCampaignsByMode(sampleCampaigns as any, '360', false)
      expect(filtered).toHaveLength(4)
    })

    it('returns only campaigns with creator pending actions when mode is "creator" and onlyPending is true', () => {
      const filtered = filterPocCampaignsByMode(sampleCampaigns as any, 'creator', true)
      expect(filtered.map(c => c.brandName)).toEqual(['Plum', 'Mamaearth'])
    })

    it('returns only campaigns with brand pending actions when mode is "brand" and onlyPending is true', () => {
      const filtered = filterPocCampaignsByMode(sampleCampaigns as any, 'brand', true)
      expect(filtered.map(c => c.brandName)).toEqual(['Minimalist', 'Mamaearth'])
    })

    it('returns any campaign with either creator or brand pending actions when mode is "360" and onlyPending is true', () => {
      const filtered = filterPocCampaignsByMode(sampleCampaigns as any, '360', true)
      expect(filtered.map(c => c.brandName)).toEqual(['Plum', 'Minimalist', 'Mamaearth'])
    })
  })
})

