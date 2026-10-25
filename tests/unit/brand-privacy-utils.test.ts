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

  it('preserves pitch curation batch name and notes while sanitizing raw inputs', () => {
    const rawPitchedApp = {
      application_id: 'app-555',
      campaign_id: 'camp-202',
      creator_name: 'Rohit Verma',
      instagram_username: '@rohit_fit',
      followers: 85000,
      city: 'Mumbai',
      brand_pitch_batch_name: 'Batch #2 - Fitness Enthusiasts',
      brand_pitch_notes: 'High conversion fitness creator, verified engagement',
      form_data: {
        commercial_amount: 12000,
        phone: '9988776655',
        workout_niche: 'HIIT & Calisthenics',
      },
    }

    const sanitized = sanitizeCreatorForBrand(rawPitchedApp)

    expect(sanitized.brand_pitch_batch_name).toBe('Batch #2 - Fitness Enthusiasts')
    expect(sanitized.brand_pitch_notes).toBe('High conversion fitness creator, verified engagement')
    expect(sanitized.custom_form_data?.workout_niche).toBe('HIIT & Calisthenics')
    // Ensure commercials and phone are stripped
    expect(sanitized.custom_form_data?.commercial_amount).toBeUndefined()
    expect(sanitized.custom_form_data?.phone).toBeUndefined()
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
