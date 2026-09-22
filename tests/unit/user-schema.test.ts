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

      const longMobile = { mobile: '98765432101' }
      expect(updateCreatorProfileSchema.safeParse(longMobile).success).toBe(false)
    })

    it('validates PAN card uppercase 10-character alphanumeric regex', () => {
      expect(updateCreatorProfileSchema.safeParse({ pan_card: 'ABCDE1234F' }).success).toBe(true)
      expect(updateCreatorProfileSchema.safeParse({ pan_card: 'abcde1234f' }).success).toBe(false) // lowercase rejected
      expect(updateCreatorProfileSchema.safeParse({ pan_card: 'INVALID_PAN' }).success).toBe(false)
      expect(updateCreatorProfileSchema.safeParse({ pan_card: '' }).success).toBe(true)
      expect(updateCreatorProfileSchema.safeParse({ pan_card: null }).success).toBe(true)
    })

    it('validates IFSC code format (4 letters, 0, 6 characters)', () => {
      expect(updateCreatorProfileSchema.safeParse({ ifsc_code: 'SBIN0001234' }).success).toBe(true)
      expect(updateCreatorProfileSchema.safeParse({ ifsc_code: 'sbin0001234' }).success).toBe(false) // lowercase rejected
      expect(updateCreatorProfileSchema.safeParse({ ifsc_code: 'SBIN1001234' }).success).toBe(false) // 5th char not 0
      expect(updateCreatorProfileSchema.safeParse({ ifsc_code: 'INVALID' }).success).toBe(false)
      expect(updateCreatorProfileSchema.safeParse({ ifsc_code: '' }).success).toBe(true)
      expect(updateCreatorProfileSchema.safeParse({ ifsc_code: null }).success).toBe(true)
    })

    it('rejects negative followers count', () => {
      expect(updateCreatorProfileSchema.safeParse({ followers: -1 }).success).toBe(false)
      expect(updateCreatorProfileSchema.safeParse({ followers: 0 }).success).toBe(true)
      expect(updateCreatorProfileSchema.safeParse({ followers: 1000 }).success).toBe(true)
    })

    it('rejects bio longer than 1000 characters', () => {
      const validBio = { bio: 'a'.repeat(1000) }
      expect(updateCreatorProfileSchema.safeParse(validBio).success).toBe(true)

      const overlongBio = { bio: 'a'.repeat(1001) }
      expect(updateCreatorProfileSchema.safeParse(overlongBio).success).toBe(false)
    })

    it('normalizes formatted mobile numbers with +91 or hyphens', () => {
      const parsedWithPrefix = updateCreatorProfileSchema.safeParse({ mobile: '+91 98765 43210' })
      expect(parsedWithPrefix.success).toBe(true)
      if (parsedWithPrefix.success) {
        expect(parsedWithPrefix.data.mobile).toBe('9876543210')
      }

      const parsedWithHyphens = updateCreatorProfileSchema.safeParse({ mobile: '98765-43210' })
      expect(parsedWithHyphens.success).toBe(true)
      if (parsedWithHyphens.success) {
        expect(parsedWithHyphens.data.mobile).toBe('9876543210')
      }
    })

    it('filters out dummy/placeholder shipping addresses so they do not block profile updates', () => {
      const payloadWithDummyAddress = {
        full_name: 'Vanaja sree',
        mobile: '9581242464',
        shipping_addresses: [
          {
            id: 'addr_init_12345',
            city: 'Medchal-Malkajgiri',
            state: 'TELANGANA',
            title: 'Primary Address',
            mobile: '9581242467',
            address_line1: '', // empty placeholder
            pincode: '',       // empty placeholder
            recipient_name: 'Vanaja sree',
          },
        ],
      }

      const result = updateCreatorProfileSchema.safeParse(payloadWithDummyAddress)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.shipping_addresses).toEqual([])
        expect(result.data.mobile).toBe('9581242464')
      }
    })

    it('retains valid shipping addresses while stripping placeholders', () => {
      const payload = {
        full_name: 'Vanaja sree',
        shipping_addresses: [
          {
            title: 'Home',
            recipient_name: 'Vanaja sree',
            mobile: '9876543210',
            address_line1: 'Flat 101, Main Road',
            city: 'Hyderabad',
            state: 'TELANGANA',
            pincode: '500001',
            is_default: true,
          },
          {
            id: 'dummy_1',
            title: 'Primary Address',
            recipient_name: 'Vanaja',
            mobile: '9876543210',
            address_line1: '',
            city: 'Hyderabad',
            state: 'TELANGANA',
            pincode: '',
          },
        ],
      }

      const result = updateCreatorProfileSchema.safeParse(payload)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.shipping_addresses?.length).toBe(1)
        expect(result.data.shipping_addresses?.[0].address_line1).toBe('Flat 101, Main Road')
      }
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
      const base = {
        title: 'Office',
        recipient_name: 'Jane Doe',
        mobile: '9876543210',
        address_line1: 'Tower A',
        city: 'Delhi',
        state: 'Delhi',
      }
      expect(shippingAddressSchema.safeParse({ ...base, pincode: '11000' }).success).toBe(false) // 5 digits
      expect(shippingAddressSchema.safeParse({ ...base, pincode: '1100011' }).success).toBe(false) // 7 digits
      expect(shippingAddressSchema.safeParse({ ...base, pincode: '11000A' }).success).toBe(false) // letter
      expect(shippingAddressSchema.safeParse({ ...base, pincode: '110001' }).success).toBe(true) // valid 6 digits
    })

    it('rejects address when mandatory fields are missing', () => {
      const missingName = {
        title: 'Home',
        recipient_name: '',
        mobile: '9876543210',
        address_line1: 'Flat 101',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      }
      expect(shippingAddressSchema.safeParse(missingName).success).toBe(false)

      const missingLine1 = {
        title: 'Home',
        recipient_name: 'Jane',
        mobile: '9876543210',
        address_line1: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
      }
      expect(shippingAddressSchema.safeParse(missingLine1).success).toBe(false)

      const missingCity = {
        title: 'Home',
        recipient_name: 'Jane',
        mobile: '9876543210',
        address_line1: 'Flat 101',
        city: '',
        state: 'Maharashtra',
        pincode: '400001',
      }
      expect(shippingAddressSchema.safeParse(missingCity).success).toBe(false)
    })
  })
})
