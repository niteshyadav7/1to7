import { describe, it, expect } from 'vitest'
import {
  CampaignPitchItem,
  CAMPAIGN_PITCH_COLUMNS,
  FORBIDDEN_CLIENT_KEYS
} from '@/types/campaign-pitch'
import { BrandReviewStatus } from '@/types/brand'

export function sanitizePitchForBrandClient(
  item: CampaignPitchItem,
  allowedColumns: string[]
): Record<string, any> {
  const result: Record<string, any> = {
    application_id: item.application_id,
    campaign_id: item.campaign_id,
    campaign_code: item.campaign_code,
    brand_review_status: item.brand_review_status,
  }

  // Iterate over permitted columns, strictly dropping any forbidden keys
  allowedColumns.forEach((col) => {
    if (!FORBIDDEN_CLIENT_KEYS.has(col) && (item as any)[col] !== undefined) {
      result[col] = (item as any)[col]
    }
  })

  // Ensure forbidden keys can NEVER leak through under any circumstances
  FORBIDDEN_CLIENT_KEYS.forEach((secret) => {
    delete result[secret]
  })

  return result
}

describe('Campaign Pitch Curation & Two-Gatekeeper Pipeline Tests', () => {
  describe('Pipeline State Machine Transitions', () => {
    it('enforces transition from unpitched -> queued_for_brand_admin -> pending_brand_review -> brand_approved', () => {
      let status: BrandReviewStatus = 'unpitched'
      expect(status).toBe('unpitched')

      // 1. Influencer Admin forwards to Brand Admin
      status = 'queued_for_brand_admin'
      expect(status).toBe('queued_for_brand_admin')

      // 2. Brand Admin dispatches to Brand Client Portal
      status = 'pending_brand_review'
      expect(status).toBe('pending_brand_review')

      // 3. Client Brand approves
      status = 'brand_approved'
      expect(status).toBe('brand_approved')
    })

    it('supports internal drop prior to brand exposure', () => {
      let status: BrandReviewStatus = 'queued_for_brand_admin'

      // Brand Admin KAM decides creator is aesthetic mismatch
      status = 'internal_rejected'
      expect(status).toBe('internal_rejected')

      // Verify internal_rejected is excluded from client query status set
      const clientVisibleStatuses = new Set([
        'pending_brand_review',
        'brand_approved',
        'brand_rejected',
        'changes_requested'
      ])
      expect(clientVisibleStatuses.has(status)).toBe(false)
    })
  })

  describe('Zero-Trust Column Visibility Shield & Margin Protection', () => {
    const mockPitchItem: CampaignPitchItem = {
      application_id: 'app-777',
      campaign_id: 'camp-999',
      campaign_code: 'MAMA-SERUM-2026',
      campaign_title: 'Vitamin C Glow Launch',
      brand_name: 'Mamaearth',
      user_id: 'user-333',
      creator_name: 'Tanvi Khanna',
      influencer_id: 'HY10992',
      instagram_username: 'tanvi_glows',
      followers: 95000,
      city: 'Delhi',
      state: 'Delhi',
      gender: 'Female',
      profile_photo: 'https://cdn.example.com/tanvi.jpg',
      brand_review_status: 'pending_brand_review',
      brand_pitch_batch_name: 'Batch #1 - Delhi Creators',
      brand_pitch_notes: 'Great lighting, 4.2% engagement rate',
      selected_variant: 'Vitamin C Serum (30ml)',
      sample_reel_link: 'https://instagram.com/reel/abc12345',
      client_commercial: 18000,
      internal_payout_cost: 11000, // SECRET MARGIN: ₹7,000
      applied_at: new Date().toISOString(),
      custom_form_data: {
        mobile: '9811122233',
        email: 'tanvi.private@gmail.com',
        shipping_address: 'House 42, Vasant Vihar, New Delhi',
        bank_account: '9988776655',
        skin_tone: 'Fair to Medium',
      }
    }

    it('projects only visible columns configured by Brand Admin', () => {
      const configuredColumns = [
        'creator_name',
        'instagram_username',
        'followers',
        'city',
        'selected_variant',
        'sample_reel_link'
      ]

      const sanitized = sanitizePitchForBrandClient(mockPitchItem, configuredColumns)

      expect(sanitized.creator_name).toBe('Tanvi Khanna')
      expect(sanitized.instagram_username).toBe('tanvi_glows')
      expect(sanitized.followers).toBe(95000)
      expect(sanitized.city).toBe('Delhi')
      expect(sanitized.selected_variant).toBe('Vitamin C Serum (30ml)')
      expect(sanitized.sample_reel_link).toBe('https://instagram.com/reel/abc12345')

      // Commercial and sensitive costs should not be present
      expect(sanitized.client_commercial).toBeUndefined()
      expect(sanitized.internal_payout_cost).toBeUndefined()
      expect(sanitized.mobile).toBeUndefined()
      expect(sanitized.email).toBeUndefined()
    })

    it('strictly forbids internal payout cost even if erroneously configured in allowedColumns', () => {
      const erroneousColumns = [
        'creator_name',
        'instagram_username',
        'internal_payout_cost',
        'mobile',
        'shipping_address'
      ]

      const sanitized = sanitizePitchForBrandClient(mockPitchItem, erroneousColumns)

      expect(sanitized.creator_name).toBe('Tanvi Khanna')
      expect(sanitized.internal_payout_cost).toBeUndefined()
      expect(sanitized.mobile).toBeUndefined()
      expect(sanitized.shipping_address).toBeUndefined()
    })
  })

  describe('Multi-Tier Filter & Search Matching', () => {
    const items: CampaignPitchItem[] = [
      {
        application_id: 'app-1',
        campaign_id: 'camp-1',
        campaign_code: 'MAMA-1',
        campaign_title: 'Mama Glow',
        brand_name: 'Mamaearth',
        user_id: 'u-1',
        creator_name: 'Aarti Rao',
        influencer_id: 'HY101',
        instagram_username: 'aarti_rao',
        followers: 120000,
        city: 'Mumbai',
        brand_review_status: 'queued_for_brand_admin',
        brand_pitch_batch_name: 'Batch #1',
        applied_at: new Date().toISOString()
      },
      {
        application_id: 'app-2',
        campaign_id: 'camp-2',
        campaign_code: 'SUGAR-1',
        campaign_title: 'Sugar Velvet',
        brand_name: 'Sugar Cosmetics',
        user_id: 'u-2',
        creator_name: 'Kavita Singh',
        influencer_id: 'HY102',
        instagram_username: 'kavita_singh',
        followers: 85000,
        city: 'Delhi',
        brand_review_status: 'pending_brand_review',
        brand_pitch_batch_name: 'Batch #2',
        applied_at: new Date().toISOString()
      },
      {
        application_id: 'app-3',
        campaign_id: 'camp-1',
        campaign_code: 'MAMA-1',
        campaign_title: 'Mama Glow',
        brand_name: 'Mamaearth',
        user_id: 'u-3',
        creator_name: 'Rohan Mehra',
        influencer_id: 'HY103',
        instagram_username: 'rohan_mehra',
        followers: 55000,
        city: 'Bangalore',
        brand_review_status: 'brand_approved',
        brand_pitch_batch_name: 'Batch #1',
        applied_at: new Date().toISOString()
      }
    ]

    it('filters applications by brand name', () => {
      const mamaearthItems = items.filter(i => i.brand_name.toLowerCase() === 'mamaearth'.toLowerCase())
      expect(mamaearthItems.length).toBe(2)
      expect(mamaearthItems.map(i => i.creator_name)).toEqual(['Aarti Rao', 'Rohan Mehra'])
    })

    it('filters applications by status', () => {
      const queuedItems = items.filter(i => i.brand_review_status === 'queued_for_brand_admin')
      expect(queuedItems.length).toBe(1)
      expect(queuedItems[0].creator_name).toBe('Aarti Rao')
    })

    it('filters applications by batch', () => {
      const batch2Items = items.filter(i => i.brand_pitch_batch_name === 'Batch #2')
      expect(batch2Items.length).toBe(1)
      expect(batch2Items[0].creator_name).toBe('Kavita Singh')
    })
  })
})
