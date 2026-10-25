import { describe, it, expect } from 'vitest'
import { sanitizeCreatorForBrand, formatFollowerCount } from '@/lib/utils/brand-privacy-utils'

describe('Brand Privacy & Sanitization Unit Tests', () => {
  it('strips sensitive PII like mobile, bank, pan, and private address', () => {
    const rawApplication = {
      application_id: 'app-999',
      campaign_id: 'camp-101',
      campaign_code: 'MAMA-2026',
      user_id: 'usr-1',
      creator_name: 'Anjali Sharma',
      influencer_id: 'HY10055',
      instagram_username: '@anjali_vibes',
      followers: 145000,
      city: 'Delhi',
      state: 'Delhi',
      mobile: '9876543210',
      email: 'anjali.private@gmail.com',
      form_data: {
        mobile_number: '9876543210',
        shipping_address: 'Flat 402, Sunshine Apts, Saket, Delhi',
        pincode: '110017',
        bank_account: '918237461234',
        ifsc_code: 'HDFC0001234',
        pan_card: 'ABCDE1234F',
        internal_payout_cost: 5000,
        sample_variant: 'Shade 03 - Warm Almond',
        skin_type: 'Combination',
      },
    }

    const sanitized = sanitizeCreatorForBrand(rawApplication)

    // Verify public info preserved
    expect(sanitized.creator_name).toBe('Anjali Sharma')
    expect(sanitized.instagram_username).toBe('anjali_vibes')
    expect(sanitized.followers).toBe(145000)
    expect(sanitized.city).toBe('Delhi')
    expect(sanitized.selected_variant).toBe('Shade 03 - Warm Almond')

    // Verify sensitive PII is absent
    expect((sanitized as any).mobile).toBeUndefined()
    expect((sanitized as any).email).toBeUndefined()
    expect(sanitized.custom_form_data?.mobile_number).toBeUndefined()
    expect(sanitized.custom_form_data?.shipping_address).toBeUndefined()
    expect(sanitized.custom_form_data?.pincode).toBeUndefined()
    expect(sanitized.custom_form_data?.bank_account).toBeUndefined()
    expect(sanitized.custom_form_data?.ifsc_code).toBeUndefined()
    expect(sanitized.custom_form_data?.internal_payout_cost).toBeUndefined()

    // Verify non-sensitive custom fields preserved
    expect(sanitized.custom_form_data?.skin_type).toBe('Combination')
  })

  it('correctly formats follower counts into K and M', () => {
    expect(formatFollowerCount(0)).toBe('0')
    expect(formatFollowerCount(850)).toBe('850')
    expect(formatFollowerCount(1200)).toBe('1.2K')
    expect(formatFollowerCount(45000)).toBe('45K')
    expect(formatFollowerCount(185000)).toBe('185K')
    expect(formatFollowerCount(1500000)).toBe('1.5M')
  })
})
