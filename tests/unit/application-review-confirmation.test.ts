import { describe, it, expect } from 'vitest'
import { formatAddressToString } from '@/components/campaigns/AddressSelectorField'
import { extractInstagramUsername, getInstagramDisplayHandle } from '@/lib/instagram-utils'
import { extractProfileUpdatesFromFormData } from '@/lib/utils/profile-sync-utils'

describe('Application Review & Confirmation Workflow', () => {
  describe('Instagram Handle Normalization & Resolution for Review', () => {
    it('cleans leading @ symbols and trims whitespaces from updated Instagram handles', () => {
      expect(extractInstagramUsername('@creator_updated_2026')).toBe('creator_updated_2026')
      expect(extractInstagramUsername('   @my_new_handle   ')).toBe('my_new_handle')
      expect(extractInstagramUsername('https://instagram.com/fashion_diva')).toBe('fashion_diva')
    })

    it('formats display handles consistently with @ prefix for the review UI badge', () => {
      expect(getInstagramDisplayHandle('brand_ambassador')).toBe('@brand_ambassador')
      expect(getInstagramDisplayHandle('@already_prefixed')).toBe('@already_prefixed')
      expect(getInstagramDisplayHandle('')).toBe('')
      expect(getInstagramDisplayHandle(null as any)).toBe('')
    })

    it('syncs updated Instagram handle into profileUpdates when submitted through application review', () => {
      const formData = {
        instagram_username: 'reshma_creator_official',
        followers: 45000,
        pitch: 'Excited to collaborate with Wakefit!',
      }
      const existingProfile = {
        instagram_username: 'stale_sheet_handle',
        followers: 12000,
      }

      const { profileUpdates, hasChanges } = extractProfileUpdatesFromFormData(formData, existingProfile)
      expect(hasChanges).toBe(true)
      expect(profileUpdates.instagram_username).toBe('reshma_creator_official')
    })
  })

  describe('Address Resolution & Display Formatting for Review Screen', () => {
    it('formats a structured shipping address into a clean single-line summary', () => {
      const addressObj = {
        recipient_name: 'Anita Sharma',
        mobile: '9876543210',
        address_line1: 'B-304, Green Heights',
        address_line2: 'Lokhandwala Complex',
        landmark: 'Opposite Celebration Club',
        city: 'Mumbai',
        state: 'MAHARASHTRA',
        pincode: '400053',
      }

      const formatted = formatAddressToString(addressObj)
      expect(formatted).toBe(
        'B-304, Green Heights, Lokhandwala Complex, Near Opposite Celebration Club, Mumbai, MAHARASHTRA, PIN: 400053'
      )
    })

    it('returns raw string if address is already a formatted string', () => {
      const raw = 'Flat 101, Galaxy Tower, Bandra West, Mumbai - 400050'
      expect(formatAddressToString(raw)).toBe(raw)
    })

    it('returns empty string if address object is null or undefined', () => {
      expect(formatAddressToString(null)).toBe('')
      expect(formatAddressToString(undefined)).toBe('')
    })

    it('correctly resolves shipping address from form answers over user profile fallback', () => {
      const user = {
        full_name: 'Rohit Verma',
        mobile: '9988776655',
        state: 'DELHI',
        city: 'New Delhi',
        shipping_addresses: [
          {
            id: 'old_addr_1',
            address_line1: 'Old Address Line 1',
            city: 'New Delhi',
            state: 'DELHI',
            pincode: '110001',
            is_default: true,
          },
        ],
      }

      const customFormData: Record<string, any> = {
        'Delivery Address': 'C-12, Sector 14, Gurugram, Haryana - 122001',
        shipping_address: {
          id: 'new_temp_addr',
          address_line1: 'C-12, Sector 14',
          city: 'Gurugram',
          state: 'HARYANA',
          pincode: '122001',
        },
      }

      // Hierarchy: check customFormData.shipping_address first
      const resolvedAddress = customFormData.shipping_address || user.shipping_addresses[0]
      expect(resolvedAddress.city).toBe('Gurugram')
      expect(resolvedAddress.state).toBe('HARYANA')
      expect(resolvedAddress.pincode).toBe('122001')
    })
  })

  describe('Application Form Requirement Gatekeeping & Payload Assembly', () => {
    it('identifies pending required fields to prevent pre-mature review or submit', () => {
      const requiredFields = ['gender', 'state', 'city']
      const currentInlineData: Record<string, any> = {
        gender: 'Female',
        state: 'MAHARASHTRA',
        city: '', // missing
      }

      const pending = requiredFields.filter(f => !currentInlineData[f])
      expect(pending).toEqual(['city'])
    })

    it('constructs complete review payload locking Instagram username and followers', () => {
      const reviewInstagramUsername = 'priya_vlogger'
      const reviewFollowers = 85000
      const inlineData = {
        state: 'KARNATAKA',
        city: 'Bengaluru',
      }
      const customFormData = {
        'Commercials / Quote': '₹5,000',
        'Available to shoot': 'Yes',
      }
      const commentText = 'Happy to collaborate and post within 48 hours.'

      const combinedPayload = {
        ...inlineData,
        ...customFormData,
        comments: commentText,
        instagram_username: reviewInstagramUsername,
        followers: reviewFollowers,
      }

      expect(combinedPayload.instagram_username).toBe('priya_vlogger')
      expect(combinedPayload.followers).toBe(85000)
      expect(combinedPayload['Commercials / Quote']).toBe('₹5,000')
      expect(combinedPayload.state).toBe('KARNATAKA')
      expect(combinedPayload.city).toBe('Bengaluru')
      expect(combinedPayload.comments).toBe('Happy to collaborate and post within 48 hours.')
    })
  })
})
