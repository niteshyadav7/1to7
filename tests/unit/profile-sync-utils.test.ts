import { describe, it, expect } from 'vitest'
import {
  isStandardProfileField,
  getPrefillValueForField,
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
    })

    it('returns false for custom campaign-specific questions', () => {
      expect(isStandardProfileField('favorite_food')).toBe(false)
      expect(isStandardProfileField('pet_name')).toBe(false)
      expect(isStandardProfileField('gadgets_owned')).toBe(false)
      expect(isStandardProfileField('primary_camera_brand')).toBe(false)
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
})
