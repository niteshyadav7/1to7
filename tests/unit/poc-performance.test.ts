import { describe, it, expect } from 'vitest'
import {
  calculateCompletionRate,
  calculateWowGrowth,
  findPeakDay,
  isPocOnlyUpdate,
  filterCampaignsByPoc,
  matchesCampaignSearch,
} from '@/lib/utils/poc-utils'

describe('POC Performance & Accountability Utilities', () => {
  describe('calculateCompletionRate', () => {
    it('returns 0 when approved count is 0 or negative', () => {
      expect(calculateCompletionRate(0, 0)).toBe(0)
      expect(calculateCompletionRate(5, 0)).toBe(0)
      expect(calculateCompletionRate(5, -1)).toBe(0)
    })

    it('calculates correct completion rate rounded to 1 decimal place', () => {
      expect(calculateCompletionRate(78, 100)).toBe(78)
      expect(calculateCompletionRate(89, 127)).toBe(70.1)
      expect(calculateCompletionRate(62, 85)).toBe(72.9)
      expect(calculateCompletionRate(50, 50)).toBe(100)
    })
  })

  describe('calculateWowGrowth', () => {
    it('returns positive percentage growth when current > previous', () => {
      expect(calculateWowGrowth(60, 50)).toBe(20)
      expect(calculateWowGrowth(118, 100)).toBe(18)
    })

    it('returns negative percentage growth when current < previous', () => {
      expect(calculateWowGrowth(40, 50)).toBe(-20)
      expect(calculateWowGrowth(75, 100)).toBe(-25)
    })

    it('handles zero previous periods gracefully', () => {
      expect(calculateWowGrowth(25, 0)).toBe(100)
      expect(calculateWowGrowth(0, 0)).toBe(0)
    })
  })

  describe('findPeakDay', () => {
    it('identifies the day with highest approvals', () => {
      const days = [
        { date: '2026-09-22', approvals: 12, payouts: 1000 },
        { date: '2026-09-23', approvals: 38, payouts: 5000 },
        { date: '2026-09-24', approvals: 25, payouts: 3000 },
      ]
      const peak = findPeakDay(days)
      expect(peak).not.toBeNull()
      expect(peak?.date).toBe('2026-09-23')
      expect(peak?.approvals).toBe(38)
    })

    it('returns null if array is empty or all approvals are 0', () => {
      expect(findPeakDay([])).toBeNull()
      expect(findPeakDay([{ date: '2026-09-22', approvals: 0 }])).toBeNull()
    })
  })

  describe('isPocOnlyUpdate (Maker-Checker Invariant)', () => {
    it('returns true when only poc_admin_ids and editor metadata are modified', () => {
      const updates = {
        poc_admin_ids: ['poc-uuid-1', 'poc-uuid-2'],
        last_edited_by_admin_id: 'admin-1',
        last_edited_by_admin_name: 'Super Admin',
        last_edited_at: '2026-09-27T10:00:00Z',
      }
      expect(isPocOnlyUpdate(updates)).toBe(true)
    })

    it('returns false when public campaign specs are modified', () => {
      const updatesWithBudget = {
        poc_admin_ids: ['poc-uuid-1'],
        budget_amount: 15000,
      }
      expect(isPocOnlyUpdate(updatesWithBudget)).toBe(false)

      const updatesWithDeliverables = {
        poc_admin_ids: ['poc-uuid-1'],
        deliverables: '1 Reel + 2 Stories',
      }
      expect(isPocOnlyUpdate(updatesWithDeliverables)).toBe(false)
    })
  })

  describe('filterCampaignsByPoc', () => {
    const mockCampaigns = [
      { id: '1', brand_name: 'Nike', poc_admin_ids: ['poc-1', 'poc-2'] },
      { id: '2', brand_name: 'Adidas', poc_admin_ids: ['poc-2'] },
      { id: '3', brand_name: 'Puma', poc_admin_ids: [] },
      { id: '4', brand_name: 'Reebok' },
    ]

    it('returns only campaigns assigned to the specified POC', () => {
      const poc1Campaigns = filterCampaignsByPoc(mockCampaigns, 'poc-1')
      expect(poc1Campaigns).toHaveLength(1)
      expect(poc1Campaigns[0].brand_name).toBe('Nike')

      const poc2Campaigns = filterCampaignsByPoc(mockCampaigns, 'poc-2')
      expect(poc2Campaigns).toHaveLength(2)
      expect(poc2Campaigns.map(c => c.brand_name)).toEqual(['Nike', 'Adidas'])
    })

    it('returns empty array if POC is not assigned to any campaign', () => {
      expect(filterCampaignsByPoc(mockCampaigns, 'poc-99')).toEqual([])
      expect(filterCampaignsByPoc([], 'poc-1')).toEqual([])
    })
  })

  describe('matchesCampaignSearch', () => {
    const campaign = {
      brand_name: 'MyFitness Peanut Butter',
      campaign_code: 'F10023C201',
      platform: 'Instagram',
      poc_admin_ids: ['poc-chanchal', 'poc-aradhya'],
    }

    const pocMap = {
      'poc-chanchal': { name: 'Chanchal S', email: 'tho17.operations@gmail.com' },
      'poc-aradhya': { name: 'Aradhya A', email: 'tho29.operations@gmail.com' },
    }

    it('matches by brand name or campaign code', () => {
      expect(matchesCampaignSearch(campaign, 'MyFitness', pocMap)).toBe(true)
      expect(matchesCampaignSearch(campaign, 'F10023', pocMap)).toBe(true)
    })

    it('matches by assigned POC name or email', () => {
      expect(matchesCampaignSearch(campaign, 'Chanchal', pocMap)).toBe(true)
      expect(matchesCampaignSearch(campaign, 'tho29.operations', pocMap)).toBe(true)
      expect(matchesCampaignSearch(campaign, 'Pankhuri', pocMap)).toBe(false)
    })
  })
})
