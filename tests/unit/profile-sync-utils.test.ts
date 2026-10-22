import { describe, it, expect } from 'vitest'
import {
  isStandardProfileField,
  getPrefillValueForField,
  isAddressField,
  extractProfileUpdatesFromFormData,
} from '@/lib/utils/profile-sync-utils'

describe('profile-sync-utils', () => {
  describe('isStandardProfileField', () => {
    it('returns false for empty or null inputs', () => {
      expect(isStandardProfileField('')).toBe(false)
      expect(isStandardProfileField(null as any)).toBe(false)
    })

    it('identifies standard profile fields correctly', () => {
      expect(isStandardProfileField('dob')).toBe(true)
      expect(isStandardProfileField('Date of Birth')).toBe(true)
      expect(isStandardProfileField('gender')).toBe(true)
      expect(isStandardProfileField('tshirt_size')).toBe(true)
      expect(isStandardProfileField('Shoe Size')).toBe(true)
      expect(isStandardProfileField('pan_card')).toBe(true)
      expect(isStandardProfileField('account_number')).toBe(true)
      expect(isStandardProfileField('youtube')).toBe(true)
      expect(isStandardProfileField('pincode')).toBe(true)
      expect(isStandardProfileField('city')).toBe(true)
      expect(isStandardProfileField('state')).toBe(true)
      expect(isStandardProfileField('shipping_address')).toBe(true)
      expect(isStandardProfileField('Delivery Address')).toBe(true)
    })

    it('returns false for custom campaign-specific questions', () => {
      expect(isStandardProfileField('favorite_food')).toBe(false)
      expect(isStandardProfileField('pet_name')).toBe(false)
      expect(isStandardProfileField('gadgets_owned')).toBe(false)
      expect(isStandardProfileField('primary_camera_brand')).toBe(false)
    })
  })

  describe('isAddressField', () => {
    it('identifies various address questions correctly', () => {
      expect(isAddressField('Delivery Address')).toBe(true)
      expect(isAddressField('Shipping Address')).toBe(true)
      expect(isAddressField('Courier Address')).toBe(true)
      expect(isAddressField('Postal Address')).toBe(true)
      expect(isAddressField('Barter Address')).toBe(true)
      expect(isAddressField('Address')).toBe(true)
      expect(isAddressField(undefined, 'shipping_address')).toBe(true)
    })

    it('returns false for non-address fields', () => {
      expect(isAddressField('Shoe Size')).toBe(false)
      expect(isAddressField('Date of Birth')).toBe(false)
      expect(isAddressField('Instagram Handle')).toBe(false)
      expect(isAddressField('Followers')).toBe(false)
    })
  })

  describe('getPrefillValueForField', () => {
    it('returns empty string if user is null or label is empty', () => {
      expect(getPrefillValueForField('', {})).toBe('')
      expect(getPrefillValueForField('dob', null)).toBe('')
    })

    it('prefills value from direct user column', () => {
      const user = {
        city: 'Mumbai',
        gender: 'Female',
        shoe_size: '7',
      }
      expect(getPrefillValueForField('city', user)).toBe('Mumbai')
      expect(getPrefillValueForField('Gender', user)).toBe('Female')
      expect(getPrefillValueForField('Shoe Size (UK)', user)).toBe('7')
    })

    it('prefills formatted address from default shipping address', () => {
      const user = {
        shipping_addresses: [
          {
            id: 'addr_1',
            title: 'Studio',
            address_line1: 'Flat 402, Sunshine Heights',
            address_line2: 'New Link Road',
            landmark: 'Infinity Mall',
            city: 'Mumbai',
            state: 'MAHARASHTRA',
            pincode: '400053',
            is_default: true,
          },
        ],
      }
      const prefilled = getPrefillValueForField('Delivery Address', user)
      expect(prefilled).toContain('Flat 402, Sunshine Heights')
      expect(prefilled).toContain('Mumbai')
      expect(prefilled).toContain('400053')
    })

    it('prefills value from custom_attributes JSONB', () => {
      const user = {
        custom_attributes: {
          skin_type: { label: 'Skin Type', value: 'Combination' },
          height: '5ft 6in',
        },
      }
      expect(getPrefillValueForField('Skin Type', user)).toBe('Combination')
      expect(getPrefillValueForField('height', user)).toBe('5ft 6in')
    })

    it('returns empty string if field is not found in user object', () => {
      const user = {
        city: 'Delhi',
      }
      expect(getPrefillValueForField('Shoe Size', user)).toBe('')
    })
  })

  describe('extractProfileUpdatesFromFormData', () => {
    it('syncs structured shipping address and updates city/state/pincode', () => {
      const formData = {
        'Delivery Address': 'Flat 101, Test Tower, Andheri East, Mumbai, Maharashtra - 400069',
        shipping_address: {
          id: 'addr_new_1',
          title: 'Home',
          recipient_name: 'Reshma Mansuri',
          mobile: '9876543210',
          address_line1: 'Flat 101, Test Tower',
          address_line2: 'Andheri East',
          landmark: 'Metro Station',
          city: 'Mumbai',
          state: 'MAHARASHTRA',
          pincode: '400069',
          is_default: true,
        },
      }

      const existingProfile = {
        city: 'Pune',
        state: 'MAHARASHTRA',
        pincode: '411001',
        shipping_addresses: [],
      }

      const { profileUpdates, hasChanges } = extractProfileUpdatesFromFormData(formData, existingProfile)
      expect(hasChanges).toBe(true)
      expect(profileUpdates.city).toBe('Mumbai')
      expect(profileUpdates.pincode).toBe('400069')
      expect(profileUpdates.shipping_addresses.length).toBe(1)
      expect(profileUpdates.shipping_addresses[0].address_line1).toBe('Flat 101, Test Tower')
    })

    it('syncs dynamic custom attributes when configured with sync_to_profile = true', () => {
      const formData = {
        'Skin Type': 'Oily / Sensitive',
      }
      const campaignFormFields = [
        {
          name: 'Skin Type',
          sync_to_profile: true,
          profile_sync_key: 'skin_type',
        },
      ]
      const existingProfile = {
        custom_attributes: {},
      }

      const { customAttributes, hasChanges } = extractProfileUpdatesFromFormData(formData, existingProfile, campaignFormFields)
      expect(hasChanges).toBe(true)
      expect(customAttributes.skin_type).toBeDefined()
      expect(customAttributes.skin_type.value).toBe('Oily / Sensitive')
    })
  })
})

