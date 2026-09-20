import { describe, it, expect } from 'vitest'
import { getApplicationCommercialAmount, isPaidCollaboration } from '@/lib/utils/commercial-utils'

describe('commercial-utils', () => {
  describe('getApplicationCommercialAmount', () => {
    it('returns 0 for null or undefined application', () => {
      expect(getApplicationCommercialAmount(null)).toBe(0)
      expect(getApplicationCommercialAmount(undefined)).toBe(0)
    })

    it('prioritizes formData.total_deal over other fields', () => {
      const app = {
        form_data: {
          total_deal: 5000,
          agreed_commercial: 4000,
          commercial_amount: 3000,
        },
        commercial_amount: 2000,
      }
      expect(getApplicationCommercialAmount(app)).toBe(5000)
    })

    it('checks formData.agreed_commercial if total_deal is missing', () => {
      const app = {
        form_data: {
          agreed_commercial: '4500',
          commercial_amount: 3000,
        },
      }
      expect(getApplicationCommercialAmount(app)).toBe(4500)
    })

    it('checks formData.commercial_amount if agreed_commercial is missing', () => {
      const app = {
        form_data: {
          commercial_amount: 3500,
        },
      }
      expect(getApplicationCommercialAmount(app)).toBe(3500)
    })

    it('checks direct application.commercial_amount if formData has no commercial', () => {
      const app = {
        form_data: {},
        commercial_amount: 6000,
      }
      expect(getApplicationCommercialAmount(app)).toBe(6000)
    })

    it('returns direct pending_amount if set on application table', () => {
      const app = {
        pending_amount: 500,
      }
      expect(getApplicationCommercialAmount(app)).toBe(500)
    })

    it('sums partial and final payments if no other commercial is set', () => {
      const app = {
        partial_payment: 1000,
        final_payment: 2000,
      }
      expect(getApplicationCommercialAmount(app)).toBe(3000)
    })

    it('falls back to campaign budget_amount if application has no commercial', () => {
      const app = {
        campaigns: {
          budget_amount: 12000,
        },
      }
      expect(getApplicationCommercialAmount(app)).toBe(12000)
    })

    it('falls back to campaign commercial_amount if budget_amount is missing', () => {
      const app = {
        campaigns: {
          commercial_amount: 8000,
        },
      }
      expect(getApplicationCommercialAmount(app)).toBe(8000)
    })

    it('returns 0 if no commercial information is available anywhere', () => {
      const app = {
        form_data: {},
        campaigns: {},
      }
      expect(getApplicationCommercialAmount(app)).toBe(0)
    })
  })

  describe('isPaidCollaboration', () => {
    it('returns false for null application', () => {
      expect(isPaidCollaboration(null)).toBe(false)
    })

    it('returns true when commercial amount is greater than 0', () => {
      const app = {
        form_data: { total_deal: 2500 },
      }
      expect(isPaidCollaboration(app)).toBe(true)
    })

    it('returns false when budget_type is explicit barter or unpaid', () => {
      const app = {
        campaigns: { budget_type: 'barter' },
      }
      expect(isPaidCollaboration(app)).toBe(false)

      const unpaidApp = {
        campaigns: { budget_type: 'unpaid' },
      }
      expect(isPaidCollaboration(unpaidApp)).toBe(false)
    })

    it('returns true when budget_type contains paid, commercial, or hybrid', () => {
      expect(isPaidCollaboration({ campaigns: { budget_type: 'paid' } })).toBe(true)
      expect(isPaidCollaboration({ campaigns: { budget_type: 'Commercial Shoot' } })).toBe(true)
      expect(isPaidCollaboration({ campaigns: { budget_type: 'Hybrid Barter+Cash' } })).toBe(true)
    })

    it('returns false for unknown or empty budget types with 0 commercial', () => {
      expect(isPaidCollaboration({ campaigns: { budget_type: 'gifting' } })).toBe(false)
      expect(isPaidCollaboration({})).toBe(false)
    })
  })
})
