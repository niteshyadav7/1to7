import { describe, it, expect } from 'vitest'
import {
  singleGhostActionSchema,
  bulkGhostActionSchema,
} from '@/lib/validations/ghost.schema'
import {
  checkCreatorCompletionEligibility,
  ApplicationTimelineData,
} from '@/lib/utils/completion-timeline-utils'

describe('Ghost Management & Creator Eligibility', () => {
  describe('Zod Validation Schemas', () => {
    it('rejects ghost submission if comment is shorter than 15 characters', () => {
      const invalid = {
        action: 'ghosted',
        reason_category: 'unresponsive_messages',
        comment: 'Too short',
        proof_urls: ['https://example.com/proof1.png'],
      }
      const res = singleGhostActionSchema.safeParse(invalid)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('at least 15 characters')
      }
    })

    it('rejects ghost submission without proof screenshots', () => {
      const invalid = {
        action: 'ghosted',
        reason_category: 'unresponsive_messages',
        comment: 'Creator is unresponsive across all channels for 10 days',
        proof_urls: [],
      }
      const res = singleGhostActionSchema.safeParse(invalid)
      expect(res.success).toBe(false)
      if (!res.success) {
        expect(res.error.issues[0].message).toContain('At least 1 proof screenshot')
      }
    })

    it('accepts valid single markGhost payload', () => {
      const valid = {
        action: 'ghosted',
        reason_category: 'unresponsive_messages',
        comment: 'Creator has not replied to WhatsApp or phone calls for over a week',
        proof_urls: ['https://example.com/whatsapp-proof.jpg'],
      }
      const res = singleGhostActionSchema.safeParse(valid)
      expect(res.success).toBe(true)
    })

    it('validates unghost action with mandatory proof and reason', () => {
      const invalid = {
        action: 'unghosted',
        reason_category: 'creator_contacted_poc',
        comment: 'Valid now',
        proof_urls: [],
      }
      const res = singleGhostActionSchema.safeParse(invalid)
      expect(res.success).toBe(false)

      const valid = {
        action: 'unghosted',
        reason_category: 'creator_contacted_poc',
        comment: 'Creator called manager and submitted their content draft for review',
        proof_urls: ['https://example.com/unghost-proof.png'],
      }
      const validRes = singleGhostActionSchema.safeParse(valid)
      expect(validRes.success).toBe(true)
    })

    it('validates bulkGhostActionSchema requires multiple application ids', () => {
      const invalidEmpty = {
        application_ids: [],
        reason_category: 'deliverable_overdue_no_response',
        comment: 'These creators have missed the campaign deliverables deadline',
        proof_urls: ['https://example.com/bulk-proof.png'],
      }
      expect(bulkGhostActionSchema.safeParse(invalidEmpty).success).toBe(false)

      const valid = {
        application_ids: ['c382f737-1234-4b55-8c99-000000000001', 'c382f737-1234-4b55-8c99-000000000002'],
        reason_category: 'deliverable_overdue_no_response',
        comment: 'All 15 creators were contacted on WhatsApp with zero response for 7 days',
        proof_urls: ['https://example.com/batch-whatsapp.png'],
      }
      const res = bulkGhostActionSchema.safeParse(valid)
      if (!res.success) {
        console.error('bulkGhostActionSchema parse error:', res.error)
      }
      expect(res.success).toBe(true)
    })
  })

  describe('Creator Eligibility Check (Strict Blocking & Polite Language)', () => {
    it('strictly blocks application if any active collaboration is ghosted', () => {
      const activeApps: ApplicationTimelineData[] = [
        {
          id: 'app-1',
          campaign_id: 'camp-1',
          campaigns: {
            brand_name: 'Brand Alpha',
            campaign_code: 'BA01',
          },
          status: 'Approved',
          created_at: '2026-10-01T00:00:00Z',
          is_ghosted: true,
          ghosted_at: '2026-10-10T00:00:00Z',
        },
      ]

      const eligibility = checkCreatorCompletionEligibility(activeApps)
      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.isGhostBlocked).toBe(true)
      expect(eligibility.ghostedCount).toBe(1)
      // Crucial requirement: NEVER expose the derogatory word "ghost" to the creator
      expect(eligibility.message.toLowerCase()).not.toContain('ghost')
      expect(eligibility.message).toContain('needs urgent attention')
      expect(eligibility.message).toContain('Point of Contact')
    })

    it('ensures delay exemption DOES NOT override ghosting block', () => {
      const activeApps: ApplicationTimelineData[] = [
        {
          id: 'app-1',
          campaign_id: 'camp-1',
          campaigns: {
            brand_name: 'Brand Beta',
            campaign_code: 'BB02',
          },
          status: 'Approved',
          created_at: '2026-10-01T00:00:00Z',
          is_ghosted: true,
          is_delay_exempted: true, // POC exempted delay, but later creator was marked ghosted
          delay_exemption_reason: 'Hospitalized',
        },
      ]

      const eligibility = checkCreatorCompletionEligibility(activeApps)
      expect(eligibility.isEligible).toBe(false)
      expect(eligibility.isGhostBlocked).toBe(true)
    })

    it('allows delay exemption to override overdue when NOT ghosted', () => {
      const pastDeadline = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      const activeApps: ApplicationTimelineData[] = [
        {
          id: 'app-1',
          campaign_id: 'camp-1',
          campaigns: {
            brand_name: 'Brand Gamma',
            campaign_code: 'BG03',
          },
          status: 'Approved',
          created_at: '2026-10-01T00:00:00Z',
          completion_deadline: pastDeadline,
          is_ghosted: false,
          is_delay_exempted: true,
          delay_exemption_reason: 'Exempted by POC for travel',
        },
      ]

      const eligibility = checkCreatorCompletionEligibility(activeApps)
      expect(eligibility.isEligible).toBe(true)
      expect(eligibility.isGhostBlocked).toBe(false)
    })

    it('allows creator to apply when all collaborations are compliant or completed', () => {
      const activeApps: ApplicationTimelineData[] = [
        {
          id: 'app-1',
          campaign_id: 'camp-1',
          campaigns: {
            brand_name: 'Brand Delta',
            campaign_code: 'BD04',
          },
          status: 'Completed',
          created_at: '2026-09-01T00:00:00Z',
          is_ghosted: false,
        },
        {
          id: 'app-2',
          campaign_id: 'camp-2',
          campaigns: {
            brand_name: 'Brand Epsilon',
            campaign_code: 'BE05',
          },
          status: 'Approved',
          created_at: new Date().toISOString(),
          completion_deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          is_ghosted: false,
        },
      ]

      const eligibility = checkCreatorCompletionEligibility(activeApps)
      expect(eligibility.isEligible).toBe(true)
      expect(eligibility.isGhostBlocked).toBe(false)
      expect(eligibility.blockingCount).toBe(0)
    })
  })

  describe('Account-Level User Ghosting & Zero-Application Gatekeeper', () => {
    it('validates singleGhostActionSchema for direct profile ghosting', () => {
      const directGhostPayload = {
        action: 'ghosted',
        reason_category: 'fraudulent_details',
        comment: 'Creator submitted counterfeit bank documents and refuses to respond on phone',
        proof_urls: ['https://example.com/fraud-proof.png'],
      }
      const parsed = singleGhostActionSchema.safeParse(directGhostPayload)
      expect(parsed.success).toBe(true)
    })

    it('validates singleGhostActionSchema for direct profile un-ghosting with proof', () => {
      const directUnghostPayload = {
        action: 'unghosted',
        reason_category: 'creator_contacted_poc',
        comment: 'Creator verified PAN card in person and submitted original documentation',
        proof_urls: ['https://example.com/verified-id.png'],
      }
      const parsed = singleGhostActionSchema.safeParse(directUnghostPayload)
      expect(parsed.success).toBe(true)
    })

    it('rejects direct profile ghosting when justification comment has fewer than 15 characters', () => {
      const invalid = {
        action: 'ghosted',
        reason_category: 'other_custom',
        comment: 'Fake account',
        proof_urls: ['https://example.com/proof.png'],
      }
      const parsed = singleGhostActionSchema.safeParse(invalid)
      expect(parsed.success).toBe(false)
      if (!parsed.success) {
        expect(parsed.error.issues[0].message).toContain('at least 15 characters')
      }
    })

    it('simulates account-level gatekeeper blocking a creator with 0 active applications', () => {
      // Simulating user record where users.is_ghosted = true
      const user = {
        id: 'u-1234',
        full_name: 'Janhavi Kashikar',
        is_ghosted: true,
      }
      const activeApps: ApplicationTimelineData[] = [] // 0 applications

      // Account-level gatekeeper rule
      const isAccountBlocked = user.is_ghosted === true
      expect(isAccountBlocked).toBe(true)

      // Application timeline check
      const appEligibility = checkCreatorCompletionEligibility(activeApps)
      // Even though appEligibility alone is true (no apps), account gatekeeper overrides and blocks
      const canApply = !isAccountBlocked && appEligibility.isEligible
      expect(canApply).toBe(false)
    })
  })
})
