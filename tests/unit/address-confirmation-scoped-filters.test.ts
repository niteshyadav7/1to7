import { describe, it, expect } from 'vitest'

interface AddressEntry {
  id: string
  status: string
  address_status: string | null
  form_data: Record<string, any>
  campaigns: {
    id: string
    campaign_code: string
    brand_name: string
  }
  users: {
    id: string
    full_name: string
    influencer_id: string
    email: string
    mobile: string
    instagram_username: string
    city: string
    state: string
    pincode: string
  }
}

const hasValidShippingAddress = (addr: any): boolean => {
  if (!addr || typeof addr !== 'object') return false
  return Boolean(
    (addr.address_line1 && String(addr.address_line1).trim()) ||
    (addr.city && String(addr.city).trim()) ||
    (addr.pincode && String(addr.pincode).trim())
  )
}

const getVerificationStatus = (entry: AddressEntry): 'Pending' | 'Approved' | 'Rejected' | 'Not Submitted' => {
  if (entry.address_status === 'Approved' || entry.form_data?.address_verified === true) {
    return 'Approved'
  }
  if (entry.address_status === 'Rejected' || entry.form_data?.address_status === 'Rejected') {
    return 'Rejected'
  }
  const addr = entry.form_data?.shipping_address
  const hasAddr = hasValidShippingAddress(addr)
  const isConfirmed = entry.form_data?.address_confirmed === true
  if (entry.address_status === 'Pending' || isConfirmed || hasAddr) {
    return 'Pending'
  }
  return 'Not Submitted'
}

describe('Address Confirmation Scoped Filters & Search Architecture', () => {
  const mockEntries: AddressEntry[] = [
    {
      id: 'app-gleema-1',
      status: 'Approved',
      address_status: 'Approved',
      form_data: {
        address_confirmed: true,
        address_verified: true,
        shipping_address: {
          recipient_name: 'Vyakhya Jangir',
          address_line1: 'Ganpati nagar street no.-1',
          city: 'Sri Ganganagar',
          state: 'Rajasthan',
          pincode: '335001',
          mobile: '9588035392',
        },
      },
      campaigns: {
        id: 'camp-gleema',
        campaign_code: 'GLEEMA',
        brand_name: 'Gleema',
      },
      users: {
        id: 'u-1',
        full_name: 'Vyakhya',
        influencer_id: 'HY88991',
        email: 'vyakhya@example.com',
        mobile: '9588035392',
        instagram_username: 'vyakhya_001',
        city: 'Sri Ganganagar',
        state: 'Rajasthan',
        pincode: '335001',
      },
    },
    {
      id: 'app-plum-1',
      status: 'Applied',
      address_status: 'Pending',
      form_data: {
        address_confirmed: true,
        shipping_address: {
          recipient_name: 'Madhura Tapase',
          address_line1: 'Plot no. 54, Gopal nagar',
          city: 'Nagpur',
          state: 'Maharashtra',
          pincode: '442401',
          mobile: '8767817015',
          alt_mobile: '9988776655',
        },
      },
      campaigns: {
        id: 'camp-plum',
        campaign_code: 'CAM-PLUM',
        brand_name: 'Plum',
      },
      users: {
        id: 'u-2',
        full_name: 'Madhura Tapase',
        influencer_id: 'HY18691',
        email: 'madhura@example.com',
        mobile: '8767817015',
        instagram_username: 'madhura_tapase',
        city: 'Nagpur',
        state: 'Maharashtra',
        pincode: '442401',
      },
    },
    {
      id: 'app-plum-2',
      status: 'Applied',
      address_status: null,
      form_data: {
        shipping_address: {}, // Empty object trap!
      },
      campaigns: {
        id: 'camp-plum',
        campaign_code: 'CAM-PLUM',
        brand_name: 'Plum',
      },
      users: {
        id: 'u-3',
        full_name: 'Kajal Sah',
        influencer_id: 'HY19692',
        email: 'kajal@example.com',
        mobile: '9113777146',
        instagram_username: 'kajal_sah',
        city: 'Patna',
        state: 'Bihar',
        pincode: '800001',
      },
    },
  ]

  it('correctly guards against empty object shipping_address so it evaluates to Not Submitted', () => {
    const emptyApp = mockEntries[2]
    expect(hasValidShippingAddress(emptyApp.form_data.shipping_address)).toBe(false)
    expect(getVerificationStatus(emptyApp)).toBe('Not Submitted')
  })

  it('accurately computes scoped tab counts for Gleema without inheriting Plum counts', () => {
    const gleemaEntries = mockEntries.filter(e => e.campaigns.id === 'camp-gleema')
    let approved = 0
    let pending = 0
    let notSubmitted = 0

    gleemaEntries.forEach(e => {
      const st = getVerificationStatus(e)
      if (st === 'Approved') approved++
      else if (st === 'Pending') pending++
      else notSubmitted++
    })

    expect(gleemaEntries).toHaveLength(1)
    expect(approved).toBe(1)
    expect(pending).toBe(0) // Crucial: Gleema has 0 pending reviews!
    expect(notSubmitted).toBe(0)
  })

  it('matches searches by Influencer ID (HY18691)', () => {
    const query = 'HY18691'.toLowerCase()
    const matches = mockEntries.filter(e => {
      return (
        e.users.influencer_id.toLowerCase().includes(query) ||
        e.users.full_name.toLowerCase().includes(query)
      )
    })
    expect(matches).toHaveLength(1)
    expect(matches[0].users.full_name).toBe('Madhura Tapase')
  })

  it('matches searches by Street Address or Alternate Mobile', () => {
    const streetQuery = 'gopal nagar'
    const streetMatches = mockEntries.filter(e => {
      const addr = e.form_data.shipping_address
      return (addr?.address_line1 || '').toLowerCase().includes(streetQuery)
    })
    expect(streetMatches).toHaveLength(1)
    expect(streetMatches[0].id).toBe('app-plum-1')

    const altPhoneQuery = '9988776655'
    const altMatches = mockEntries.filter(e => {
      const addr = e.form_data.shipping_address
      return String(addr?.alt_mobile || '').includes(altPhoneQuery)
    })
    expect(altMatches).toHaveLength(1)
    expect(altMatches[0].id).toBe('app-plum-1')
  })
})

