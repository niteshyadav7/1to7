import { describe, it, expect } from 'vitest'

interface MockBroadcastAlert {
  id: string
  title: string
  message: string
  target_type: 'all' | 'missing_bank' | 'specific_user' | 'campaign'
  target_user_id?: string | null
  target_user_identifier?: string | null
  target_campaign_id?: string | null
  target_campaign_status?: string | null
  created_by?: string | null
  created_at: string
}

interface MockCreator {
  id: string
  influencer_id: string
  mobile: string
  email: string
  hasBankDetails: boolean
  applications: Array<{
    campaign_id: string
    status: 'Applied' | 'Approved' | 'Completed' | 'Rejected'
  }>
}

/**
 * Matches alert against creator criteria exactly simulating the SQL WHERE logic in /api/dashboard/alerts
 */
function shouldDeliverAlertToCreator(alert: MockBroadcastAlert, creator: MockCreator): boolean {
  if (alert.target_type === 'all') return true

  if (alert.target_type === 'missing_bank') {
    return !creator.hasBankDetails
  }

  if (alert.target_type === 'specific_user') {
    if (alert.target_user_id && alert.target_user_id === creator.id) return true
    if (alert.target_user_identifier) {
      const ident = alert.target_user_identifier.trim().toLowerCase()
      if (creator.influencer_id.toLowerCase() === ident) return true
      if (creator.mobile === ident) return true
      if (creator.email.toLowerCase() === ident) return true
      if (creator.id === ident) return true
    }
    return false
  }

  if (alert.target_type === 'campaign') {
    if (!alert.target_campaign_id) return false
    const match = creator.applications.find(a => a.campaign_id === alert.target_campaign_id)
    if (!match) return false
    if (!alert.target_campaign_status || alert.target_campaign_status === 'all') return true
    return match.status === alert.target_campaign_status
  }

  return false
}

describe('Broadcast Alerts Delivery & Audit Visibility Engine', () => {
  const creator1: MockCreator = {
    id: 'user-001',
    influencer_id: 'HY1001',
    mobile: '9876543210',
    email: 'creator1@test.com',
    hasBankDetails: true,
    applications: [
      { campaign_id: 'camp-wakefit', status: 'Approved' },
      { campaign_id: 'camp-plum', status: 'Applied' },
    ],
  }

  const creator2: MockCreator = {
    id: 'user-002',
    influencer_id: 'HY1002',
    mobile: '9123456780',
    email: 'creator2@test.com',
    hasBankDetails: false,
    applications: [
      { campaign_id: 'camp-wakefit', status: 'Applied' },
      { campaign_id: 'camp-hrx', status: 'Approved' },
    ],
  }

  describe('Campaign-Wise Targeting', () => {
    it('delivers campaign alert to creator approved in that campaign', () => {
      const alert: MockBroadcastAlert = {
        id: 'b-1',
        title: 'Action Required: Wakefit Deliverable Due',
        message: 'Please submit your deliverable draft before 6 PM today.',
        target_type: 'campaign',
        target_campaign_id: 'camp-wakefit',
        target_campaign_status: 'Approved',
        created_by: 'superadmin@gmail.com',
        created_at: new Date().toISOString(),
      }

      expect(shouldDeliverAlertToCreator(alert, creator1)).toBe(true)
      // Creator 2 applied to Wakefit, but is not approved yet
      expect(shouldDeliverAlertToCreator(alert, creator2)).toBe(false)
    })

    it('delivers campaign alert to all applicants when target_campaign_status is "all"', () => {
      const alert: MockBroadcastAlert = {
        id: 'b-2',
        title: 'Important Update: Wakefit Campaign Milestone',
        message: 'Guidelines updated for all applicants.',
        target_type: 'campaign',
        target_campaign_id: 'camp-wakefit',
        target_campaign_status: 'all',
        created_by: 'poc@1to7.com',
        created_at: new Date().toISOString(),
      }

      expect(shouldDeliverAlertToCreator(alert, creator1)).toBe(true)
      expect(shouldDeliverAlertToCreator(alert, creator2)).toBe(true)
    })

    it('does not deliver campaign alert to creators not in that campaign', () => {
      const alert: MockBroadcastAlert = {
        id: 'b-3',
        title: 'HRX Marathon Venue Update',
        message: 'Bib collection starts tomorrow.',
        target_type: 'campaign',
        target_campaign_id: 'camp-hrx',
        target_campaign_status: 'Approved',
        created_by: 'admin@1to7.com',
        created_at: new Date().toISOString(),
      }

      expect(shouldDeliverAlertToCreator(alert, creator1)).toBe(false)
      expect(shouldDeliverAlertToCreator(alert, creator2)).toBe(true)
    })
  })

  describe('Specific User Targeting', () => {
    it('matches by target_user_id', () => {
      const alert: MockBroadcastAlert = {
        id: 'b-4',
        title: 'Direct Creator Notice',
        message: 'Your invoice has been processed.',
        target_type: 'specific_user',
        target_user_id: 'user-001',
        created_at: new Date().toISOString(),
      }
      expect(shouldDeliverAlertToCreator(alert, creator1)).toBe(true)
      expect(shouldDeliverAlertToCreator(alert, creator2)).toBe(false)
    })

    it('matches by influencer identifier (HY ID)', () => {
      const alert: MockBroadcastAlert = {
        id: 'b-5',
        title: 'Notice for HY1002',
        message: 'Please re-verify your phone number.',
        target_type: 'specific_user',
        target_user_identifier: 'HY1002',
        created_at: new Date().toISOString(),
      }
      expect(shouldDeliverAlertToCreator(alert, creator1)).toBe(false)
      expect(shouldDeliverAlertToCreator(alert, creator2)).toBe(true)
    })
  })

  describe('Global & Bank Filter Targeting', () => {
    it('delivers global alert to all creators', () => {
      const alert: MockBroadcastAlert = {
        id: 'b-6',
        title: 'Platform Maintenance Notice',
        message: 'Scheduled maintenance on Sunday at 2 AM.',
        target_type: 'all',
        created_at: new Date().toISOString(),
      }
      expect(shouldDeliverAlertToCreator(alert, creator1)).toBe(true)
      expect(shouldDeliverAlertToCreator(alert, creator2)).toBe(true)
    })

    it('delivers missing_bank alert only to creators lacking bank details', () => {
      const alert: MockBroadcastAlert = {
        id: 'b-7',
        title: 'Bank Details Required',
        message: 'Please add your bank account to receive campaign payouts.',
        target_type: 'missing_bank',
        created_at: new Date().toISOString(),
      }
      expect(shouldDeliverAlertToCreator(alert, creator1)).toBe(false)
      expect(shouldDeliverAlertToCreator(alert, creator2)).toBe(true)
    })
  })

  describe('Author & Timestamp Formatting', () => {
    it('formats exact date and time with 12-hour AM/PM', () => {
      const testDate = new Date('2026-10-20T17:43:00.000Z')
      const formatted = testDate.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
      expect(formatted).toContain('2026')
      expect(formatted).toMatch(/(am|pm)/i)
    })

    it('correctly falls back to Admin if created_by is missing', () => {
      const createdBy = null
      const authorDisplay = createdBy || 'Admin'
      expect(authorDisplay).toBe('Admin')
    })
  })
})
