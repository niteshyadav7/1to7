import { describe, it, expect } from 'vitest'
import { computeProfileStrength } from '@/app/admin/(panel)/virtual-profile/[userId]/profile/page'

describe('computeProfileStrength Unit Tests', () => {
  it('returns 0 when all fields are empty or 0', () => {
    const emptyForm = {
      full_name: '',
      instagram_username: '',
      gender: '',
      category: '',
      languages: '',
      state: '',
      city: '',
      followers: 0,
      dob: '',
      account_name: '',
      account_number: '',
      ifsc_code: '',
      shipping_addresses: [],
    }
    expect(computeProfileStrength(emptyForm)).toBe(0)
  })

  it('calculates partial completion percentage accurately', () => {
    // 13 total slots: 12 fields + 1 shipping_addresses slot
    // 4 fields filled out of 13: round(4 / 13 * 100) = round(30.769) = 31%
    const partialForm = {
      full_name: 'Rohit Verma',
      instagram_username: 'rohit_v',
      gender: 'Male',
      followers: 5000,
    }
    expect(computeProfileStrength(partialForm)).toBe(31)
  })

  it('increments score when valid shipping addresses are present', () => {
    const formWithAddress = {
      full_name: 'Rohit Verma',
      shipping_addresses: [
        {
          id: 'addr-1',
          title: 'Home',
          recipient_name: 'Rohit',
          mobile: '9876543210',
          address_line1: '123 Street',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          is_default: true,
        },
      ],
    }
    // 2 filled out of 13: round(2 / 13 * 100) = 15%
    expect(computeProfileStrength(formWithAddress)).toBe(15)
  })

  it('returns 100 when all fields and shipping address are filled', () => {
    const fullForm = {
      full_name: 'Priya Sharma',
      instagram_username: 'priyasharma',
      gender: 'Female',
      category: 'Fashion & Style',
      languages: 'Hindi, English',
      state: 'Delhi',
      city: 'New Delhi',
      followers: 25000,
      dob: '1998-05-15',
      account_name: 'Priya Sharma',
      account_number: '123456789012',
      ifsc_code: 'HDFC0001234',
      shipping_addresses: [
        {
          id: 'addr-1',
          title: 'Home',
          recipient_name: 'Priya Sharma',
          mobile: '9876543210',
          address_line1: 'Plot 4, Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          pincode: '110001',
          is_default: true,
        },
      ],
    }
    expect(computeProfileStrength(fullForm)).toBe(100)
  })
})
