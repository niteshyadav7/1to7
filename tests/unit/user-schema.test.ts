import { describe, it, expect } from 'vitest'
import { updateCreatorProfileSchema, shippingAddressSchema } from '@/lib/validations/user.schema'

describe('user validation schemas', () => {
  describe('updateCreatorProfileSchema', () => {
    it('validates a correct profile update payload', () => {
      const validPayload = {
        full_name: 'John Doe',
        email: 'johndoe@example.com',
        mobile: '9876543210',
        pan_card: 'ABCDE1234F',
        ifsc_code: 'HDFC0001234',
        followers: 25000,
        gender: 'Male',
      }
      const result = updateCreatorProfileSchema.safeParse(validPayload)
      expect(result.success).toBe(true)
    })

    it('rejects malformed email formats', () => {
      const invalidEmail = {
        email: 'not-an-email',
      }
      const result = updateCreatorProfileSchema.safeParse(invalidEmail)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid email address format')
      }
    })

    it('rejects mobile numbers that are not exactly 10 digits', () => {
      const shortMobile = { mobile: '98765' }
      expect(updateCreatorProfileSchema.safeParse(shortMobile).success).toBe(false)

      const alphaMobile = { mobile: '987654321A' }
      expect(updateCreatorProfileSchema.safeParse(alphaMobile).success).toBe(false)
    })

    it('validates PAN card uppercase 10-character alphanumeric regex', () => {
      expect(updateCreatorProfileSchema.safeParse({ pan_card: 'ABCDE1234F' }).success).toBe(true)
      expect(updateCreatorProfileSchema.safeParse({ pan_card: 'INVALID_PAN' }).success).toBe(false)
      expect(updateCreatorProfileSchema.safeParse({ pan_card: '' }).success).toBe(true)
      expect(updateCreatorProfileSchema.safeParse({ pan_card: null }).success).toBe(true)
    })

    it('validates IFSC code format (4 letters, 0, 6 characters)', () => {
      expect(updateCreatorProfileSchema.safeParse({ ifsc_code: 'SBIN0001234' }).success).toBe(true)
      expect(updateCreatorProfileSchema.safeParse({ ifsc_code: 'INVALID' }).success).toBe(false)
    })
  })

  describe('shippingAddressSchema', () => {
    it('validates a complete shipping address', () => {
      const validAddress = {
        title: 'Home',
        recipient_name: 'Jane Doe',
        mobile: '9876543210',
        address_line1: 'Flat 101, Palm Grove',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        is_default: true,
      }
      const result = shippingAddressSchema.safeParse(validAddress)
      expect(result.success).toBe(true)
    })

    it('rejects invalid pincodes that are not 6 digits', () => {
      const invalidPin = {
        title: 'Office',
        recipient_name: 'Jane Doe',
        mobile: '9876543210',
        address_line1: 'Tower A',
        city: 'Delhi',
        state: 'Delhi',
        pincode: '11000', // 5 digits
      }
      expect(shippingAddressSchema.safeParse(invalidPin).success).toBe(false)
    })
  })
})
