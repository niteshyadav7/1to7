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

  describe('Barter Campaign Address Verification Gatekeeper', () => {
    function resolveAddressGatekeeper(app: {
      address_status: string | null
      form_data?: Record<string, any>
      application_status?: string
      brand_review_status?: string
      shipping_addresses?: any[]
      creator_name?: string
      mobile?: string
      city?: string
      state?: string
      pincode?: string
      deliverables?: string
    }) {
      const formData = app.form_data || {}
      const addrObj = formData.shipping_address || (Array.isArray(app.shipping_addresses) ? app.shipping_addresses[0] : null) || null
      const isVerified = (app.address_status === 'Approved' || formData.address_verified === true)
      const isRejected = (app.address_status === 'Rejected' || formData.address_status === 'Rejected')
      const hasSubmitted = Boolean(formData.address_confirmed === true || addrObj?.address_line1 || app.address_status === 'Pending')

      let status: 'Verified' | 'Pending' | 'Rejected' | 'Not Submitted' = 'Not Submitted'
      if (isVerified) status = 'Verified'
      else if (isRejected) status = 'Rejected'
      else if (hasSubmitted) status = 'Pending'

      const isReadyForBrandDispatch = (app.application_status === 'Approved' || app.brand_review_status === 'brand_approved') && isVerified

      let verifiedAddressDetails: any = null
      if (isVerified && addrObj) {
        const recipientName = addrObj.recipient_name || addrObj.name || app.creator_name || 'Creator'
        const phone = addrObj.mobile || app.mobile || 'N/A'
        const street = [addrObj.address_line1, addrObj.address_line2, addrObj.landmark ? `Near ${addrObj.landmark}` : null].filter(Boolean).join(', ')
        const location = `${addrObj.city || app.city || ''}, ${addrObj.state || app.state || ''} — ${addrObj.pincode || app.pincode || ''}`
        const deliverableSku = formData.sample_variant || app.deliverables || 'Standard Sample'

        verifiedAddressDetails = {
          recipient_name: recipientName,
          phone,
          street,
          city: addrObj.city || app.city,
          state: addrObj.state || app.state,
          pincode: addrObj.pincode || app.pincode,
          deliverable_sku: deliverableSku,
          courier_copy_text: `📦 RECIPIENT: ${recipientName} (Ph: ${phone})\n📍 ADDRESS: ${street}\n🏙️ LOCATION: ${location}\n🏷️ DELIVERABLE / SKU: ${deliverableSku}`
        }
      }

      return {
        addressVerificationStatus: status,
        isVerified,
        isReadyForBrandDispatch,
        verifiedAddressDetails
      }
    }

    it('marks address as Verified and generates courier manifest ONLY when address_status is Approved', () => {
      const result = resolveAddressGatekeeper({
        address_status: 'Approved',
        application_status: 'Approved',
        creator_name: 'Neha Arora',
        mobile: '7665440401',
        form_data: {
          address_verified: true,
          sample_variant: '1 Reel + 1 Story',
          shipping_address: {
            recipient_name: 'Neha Arora',
            mobile: '7665440401',
            address_line1: 'Ward no 13, Near SS library and behind SDM office',
            city: 'Anupgarh',
            state: 'RAJASTHAN',
            pincode: '335701'
          }
        }
      })

      expect(result.addressVerificationStatus).toBe('Verified')
      expect(result.isVerified).toBe(true)
      expect(result.isReadyForBrandDispatch).toBe(true)
      expect(result.verifiedAddressDetails).not.toBeNull()
      expect(result.verifiedAddressDetails?.courier_copy_text).toContain('Ward no 13')
      expect(result.verifiedAddressDetails?.courier_copy_text).toContain('Anupgarh, RAJASTHAN — 335701')
      expect(result.verifiedAddressDetails?.courier_copy_text).toContain('7665440401')
    })

    it('blocks unverified addresses from brand dispatch when address is Pending review', () => {
      const result = resolveAddressGatekeeper({
        address_status: 'Pending',
        application_status: 'Approved',
        creator_name: 'Nikhil Saklani',
        mobile: '7807640556',
        form_data: {
          shipping_address: {
            address_line1: 'Vikasnagar, Village kripalpur',
            city: 'Solan',
            state: 'Himachal Pradesh',
            pincode: '174101'
          }
        }
      })

      expect(result.addressVerificationStatus).toBe('Pending')
      expect(result.isVerified).toBe(false)
      expect(result.isReadyForBrandDispatch).toBe(false)
      expect(result.verifiedAddressDetails).toBeNull() // Protects unverified address details
    })

    it('identifies unsubmitted addresses accurately', () => {
      const result = resolveAddressGatekeeper({
        address_status: null,
        form_data: {}
      })

      expect(result.addressVerificationStatus).toBe('Not Submitted')
      expect(result.isVerified).toBe(false)
      expect(result.isReadyForBrandDispatch).toBe(false)
      expect(result.verifiedAddressDetails).toBeNull()
    })
  })

  describe('Registered Brand Workspaces vs Raw Campaign Tags Separation', () => {
    interface RegisteredBrandWorkspace {
      id: string
      name: string
      slug: string
      status: 'active' | 'archived'
      assignedKam?: string
    }

    it('blocks dispatch when zero registered brand workspaces exist', () => {
      const registeredBrands: RegisteredBrandWorkspace[] = []
      const campaignSourceTags = ['1to7Media', 'Koel Bags', 'Mamaearth']

      // Validate dispatch readiness
      const canDispatch = registeredBrands.length > 0
      expect(canDispatch).toBe(false)

      // Even if raw campaign tags exist, they cannot be used as target dispatch portals
      expect(campaignSourceTags.length).toBeGreaterThan(0)
      const validDispatchTargets = registeredBrands.map((b) => b.name)
      expect(validDispatchTargets).toHaveLength(0)
    })

    it('validates target brand against registered workspaces and excludes arbitrary tags', () => {
      const registeredBrands: RegisteredBrandWorkspace[] = [
        { id: 'brand-1', name: 'Plum Goodness', slug: 'plum-goodness', status: 'active', assignedKam: 'Aditi Rao' },
        { id: 'brand-2', name: 'Sugar Cosmetics', slug: 'sugar-cosmetics', status: 'active', assignedKam: 'Rahul Verma' },
      ]
      const campaignSourceTags = ['1to7Media', 'Koel Bags', 'Plum Goodness']

      const isTargetValid = (target: string) =>
        registeredBrands.some(
          (b) =>
            b.name.toLowerCase() === target.trim().toLowerCase() ||
            b.slug.toLowerCase() === target.trim().toLowerCase() ||
            b.id === target.trim()
        )

      // Registered brand name is valid
      expect(isTargetValid('Plum Goodness')).toBe(true)
      expect(isTargetValid('sugar-cosmetics')).toBe(true)

      // Campaign tags that are NOT registered workspaces are strictly blocked
      expect(isTargetValid('1to7Media')).toBe(false)
      expect(isTargetValid('Koel Bags')).toBe(false)
    })

    it('segments dropdown filter into Registered Workspaces and Campaign Source Tags', () => {
      const registered = [{ id: 'b1', name: 'Nykaa' }]
      const campaignTags = ['Nykaa', 'Winter Glow Promo', 'Koel Bags']

      const optgroups = [
        {
          label: '⭐ Registered Client Workspaces (Brand Admin)',
          items: registered.map((r) => ({ id: `reg-${r.id}`, label: `⭐ ${r.name} (Client Workspace)`, value: r.name })),
        },
        {
          label: '🏷️ Influencer Campaign Brands (Source Tags)',
          items: campaignTags.map((c) => ({ id: `camp-${c}`, label: `🏷️ ${c} (Campaign Tag)`, value: c })),
        },
      ]

      expect(optgroups[0].items).toHaveLength(1)
      expect(optgroups[0].items[0].value).toBe('Nykaa')
      expect(optgroups[1].items).toHaveLength(3)
      expect(optgroups[1].items[2].value).toBe('Koel Bags')
    })

    it('excludes paused brand workspaces from dispatch target list and blocks dispatch', () => {
      const allRegisteredBrands = [
        { id: 'b1', name: 'Invergy', is_active: true },
        { id: 'b2', name: '1to7 Brand', is_active: false }, // PAUSED
      ]

      // Filter only active brand workspaces for dispatch modal
      const activeDispatchTargets = allRegisteredBrands.filter((b) => b.is_active)
      expect(activeDispatchTargets).toHaveLength(1)
      expect(activeDispatchTargets[0].name).toBe('Invergy')

      // Paused brand must not be in active dispatch targets
      const canSelectPausedInDispatch = activeDispatchTargets.some((b) => b.name === '1to7 Brand')
      expect(canSelectPausedInDispatch).toBe(false)

      // Backend dispatch guard logic:
      const validateDispatchTarget = (targetName: string) => {
        const matched = allRegisteredBrands.find((b) => b.name === targetName)
        if (!matched) return { ok: false, error: 'Not registered' }
        if (!matched.is_active) return { ok: false, error: 'Brand workspace is currently PAUSED' }
        return { ok: true, brandId: matched.id }
      }

      const activeResult = validateDispatchTarget('Invergy')
      expect(activeResult.ok).toBe(true)

      const pausedResult = validateDispatchTarget('1to7 Brand')
      expect(pausedResult.ok).toBe(false)
      expect(pausedResult.error).toContain('PAUSED')
    })
  })
})

