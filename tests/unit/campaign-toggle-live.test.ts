import { describe, it, expect } from 'vitest'
import {
  CAMPAIGN_FIELD_METADATA,
  formatValueForDisplay,
} from '@/lib/utils/campaign-audit-diff'

describe('Campaign Live / Offline Operational Toggle & Audit Metadata', () => {
  describe('Audit Metadata and Display Formatting', () => {
    it('has is_live and address_required in CAMPAIGN_FIELD_METADATA', () => {
      expect(CAMPAIGN_FIELD_METADATA.is_live).toBeDefined()
      expect(CAMPAIGN_FIELD_METADATA.is_live.label).toBe('Live Publication Status')
      expect(CAMPAIGN_FIELD_METADATA.is_live.category).toBe('general')

      expect(CAMPAIGN_FIELD_METADATA.address_required).toBeDefined()
      expect(CAMPAIGN_FIELD_METADATA.address_required.label).toBe('Creator Address Required')
      expect(CAMPAIGN_FIELD_METADATA.address_required.category).toBe('form')
    })

    it('formats is_live values correctly for display', () => {
      expect(formatValueForDisplay('is_live', true)).toBe('Live (Visible to Creators)')
      expect(formatValueForDisplay('is_live', false)).toBe('Offline (Paused)')
    })

    it('formats address_required values correctly for display', () => {
      expect(formatValueForDisplay('address_required', true)).toBe('Required')
      expect(formatValueForDisplay('address_required', false)).toBe('Not Required')
    })
  })

  describe('Operational Live Toggle Logic Invariant Checks', () => {
    // Pure logic simulation of the route handler's decision matrix
    function evaluateCampaignUpdate(
      body: Record<string, any>,
      existingCampaign: {
        approval_status: 'Approved' | 'Pending Approval' | 'Rejected'
        status: string
        is_live: boolean
        is_test_mode?: boolean
      },
      admin: { id: string; role?: string; is_super_admin?: boolean }
    ) {
      const bodyKeys = Object.keys(body).filter(k => k !== 'id')
      const isLiveToggleOnly = body.is_live !== undefined && bodyKeys.length === 1 && bodyKeys[0] === 'is_live'

      if (isLiveToggleOnly) {
        const targetIsLive = Boolean(body.is_live)
        const isSuperAdmin = admin.role === 'super_admin' || Boolean(admin.is_super_admin)
        const isApproved = existingCampaign.approval_status === 'Approved'
        const isPilot = Boolean(existingCampaign.is_test_mode)

        if (targetIsLive && !isApproved && !isPilot && !isSuperAdmin) {
          return { error: 'Dual control policy: Cannot publish campaign live without 2nd Admin approval.', status: 403 }
        }

        const updates: Record<string, any> = {
          is_live: targetIsLive,
          approval_status: existingCampaign.approval_status,
          status: existingCampaign.status,
        }

        if (targetIsLive) {
          updates.status = 'Active'
          if (!isApproved && isSuperAdmin) {
            updates.approval_status = 'Approved'
          }
        }

        return { success: true, updates }
      }

      // Specification update
      const allowedFields = ['budget_amount', 'deliverables', 'poc_admin_ids']
      const updates: Record<string, any> = {}
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updates[field] = body[field]
        }
      }

      if (Object.keys(updates).length === 0) {
        return { error: 'No valid campaign fields provided for update.', status: 400 }
      }

      const isPocOnlyEdit = Object.keys(updates).every(k => k === 'poc_admin_ids')
      if (isPocOnlyEdit) {
        updates.approval_status = existingCampaign.approval_status
        updates.is_live = existingCampaign.is_live
        updates.status = existingCampaign.status
      } else {
        // Spec edit revokes approval
        updates.approval_status = 'Pending Approval'
        updates.status = 'Review'
        updates.is_live = false
      }

      return { success: true, updates }
    }

    it('allows taking an approved live campaign offline without revoking approval status', () => {
      const existing = {
        approval_status: 'Approved' as const,
        status: 'Active',
        is_live: true,
      }
      const admin = { id: 'admin-1', role: 'admin' }

      const result = evaluateCampaignUpdate({ is_live: false }, existing, admin)
      expect(result.success).toBe(true)
      expect(result.updates?.is_live).toBe(false)
      expect(result.updates?.approval_status).toBe('Approved')
      expect(result.updates?.status).toBe('Active')
    })

    it('allows bringing an approved offline campaign back to live', () => {
      const existing = {
        approval_status: 'Approved' as const,
        status: 'Active',
        is_live: false,
      }
      const admin = { id: 'admin-1', role: 'admin' }

      const result = evaluateCampaignUpdate({ is_live: true }, existing, admin)
      expect(result.success).toBe(true)
      expect(result.updates?.is_live).toBe(true)
      expect(result.updates?.approval_status).toBe('Approved')
      expect(result.updates?.status).toBe('Active')
    })

    it('blocks ordinary admin from toggling unapproved pending campaign live directly', () => {
      const existing = {
        approval_status: 'Pending Approval' as const,
        status: 'Review',
        is_live: false,
      }
      const admin = { id: 'admin-1', role: 'admin' }

      const result = evaluateCampaignUpdate({ is_live: true }, existing, admin)
      expect(result.status).toBe(403)
      expect(result.error).toContain('Dual control policy')
    })

    it('allows Super Admin to toggle pending campaign live with automatic approval', () => {
      const existing = {
        approval_status: 'Pending Approval' as const,
        status: 'Review',
        is_live: false,
      }
      const superAdmin = { id: 'super-admin-1', role: 'super_admin' }

      const result = evaluateCampaignUpdate({ is_live: true }, existing, superAdmin)
      expect(result.success).toBe(true)
      expect(result.updates?.is_live).toBe(true)
      expect(result.updates?.approval_status).toBe('Approved')
      expect(result.updates?.status).toBe('Active')
    })

    it('revokes approval when modifying campaign specifications (budget, deliverables)', () => {
      const existing = {
        approval_status: 'Approved' as const,
        status: 'Active',
        is_live: true,
      }
      const admin = { id: 'admin-1', role: 'admin' }

      const result = evaluateCampaignUpdate({ budget_amount: 50000 }, existing, admin)
      expect(result.success).toBe(true)
      expect(result.updates?.approval_status).toBe('Pending Approval')
      expect(result.updates?.status).toBe('Review')
      expect(result.updates?.is_live).toBe(false)
    })
  })
})
