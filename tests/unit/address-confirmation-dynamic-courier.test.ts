import { describe, it, expect } from 'vitest'
import Papa from 'papaparse'

describe('Address Confirmation & Courier Dynamic Fields', () => {
  it('dynamically collects all custom courier/order fields across applications into CSV columns', () => {
    const entries = [
      {
        id: 'app-1',
        campaigns: {
          brand_name: 'Plum Goodness',
          campaign_code: 'CAM-PLUM01',
          deliverables: '1 Reel + 1 Story',
          order_form_fields: [{ name: 'T-Shirt Size', type: 'select' }, { name: 'Shade', type: 'text' }],
        },
        users: {
          full_name: 'Priyanka Sharma',
          influencer_id: 'HY10891',
          instagram_username: 'priyanka_styles',
          followers: 45000,
          mobile: '9876543210',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
        },
        form_data: {
          shipping_address: {
            recipient_name: 'Priyanka Sharma',
            mobile: '9876543210',
            alt_mobile: '9123456780',
            address_line1: 'Flat 402, Sunshine Heights',
            address_line2: 'Linking Road, Bandra West',
            landmark: 'Near Starbucks',
            city: 'Mumbai',
            state: 'Maharashtra',
            pincode: '400050',
            delivery_remarks: 'Deliver after 4 PM',
          },
          order_details: {
            'T-Shirt Size': 'M',
            'Shade': 'Warm Ivory',
            'Preferred Courier': 'Delhivery',
          },
        },
        address_status: 'Approved',
        address_verified_at: '2026-10-22T10:00:00Z',
      },
      {
        id: 'app-2',
        campaigns: {
          brand_name: 'Wakefit',
          campaign_code: 'CAM-WAKEFIT',
          deliverables: '1 Video',
          order_form_fields: [{ name: 'Mattress Size', type: 'select' }],
        },
        users: {
          full_name: 'Rohan Verma',
          influencer_id: 'HY10892',
          instagram_username: 'rohan_fitness',
          followers: 120000,
          mobile: '9888877777',
          city: 'Bengaluru',
          state: 'Karnataka',
          pincode: '560001',
        },
        form_data: {
          shipping_address: {
            recipient_name: 'Rohan Verma',
            mobile: '9888877777',
            address_line1: 'Villa 12, Palm Meadows',
            city: 'Bengaluru',
            state: 'Karnataka',
            pincode: '560066',
          },
          order_details: {
            'Mattress Size': 'King (78x72)',
          },
        },
        address_status: 'Pending',
      },
    ]

    // Simulate handleExportCSV dynamic key collection
    const dynamicKeysSet = new Set<string>()
    entries.forEach(entry => {
      const orderDetails = entry.form_data?.order_details
      if (orderDetails && typeof orderDetails === 'object') {
        Object.keys(orderDetails).forEach(k => {
          if (k && !k.startsWith('_')) dynamicKeysSet.add(k)
        })
      }
      const campFields = entry.campaigns?.order_form_fields
      if (Array.isArray(campFields)) {
        campFields.forEach((f: any) => {
          if (f?.name) dynamicKeysSet.add(f.name)
        })
      }
    })
    const dynamicKeys = Array.from(dynamicKeysSet)

    expect(dynamicKeys).toContain('T-Shirt Size')
    expect(dynamicKeys).toContain('Shade')
    expect(dynamicKeys).toContain('Preferred Courier')
    expect(dynamicKeys).toContain('Mattress Size')

    const exportRows = entries.map((entry, index) => {
      const addr = entry.form_data?.shipping_address || {}
      const fallbackUser = entry.users || {}
      const recipient = addr.recipient_name || fallbackUser.full_name || 'Creator'
      const phone = addr.mobile || fallbackUser.mobile || ''
      const altPhone = addr.alt_mobile || ''
      const line1 = addr.address_line1 || ''
      const line2 = addr.address_line2 || ''
      const landmark = addr.landmark ? `Near ${addr.landmark}` : ''
      const city = addr.city || fallbackUser.city || ''
      const state = addr.state || fallbackUser.state || ''
      const pincode = addr.pincode || fallbackUser.pincode || ''
      const remarks = addr.delivery_remarks || ''

      const fullStreet = [line1, line2, landmark].filter(Boolean).join(', ')

      const baseRow: Record<string, any> = {
        'Sr. No': index + 1,
        'Application ID': entry.id,
        'Brand Name': entry.campaigns?.brand_name || '',
        'Campaign Code': entry.campaigns?.campaign_code || '',
        'Recipient Name': recipient,
        'Contact Mobile': phone,
        'Alternate Phone': altPhone,
        'Delivery Address': fullStreet,
        'City': city,
        'State': state,
        'Pincode': pincode,
        'Delivery Remarks': remarks,
        'Verification Status': entry.address_status,
      }

      const orderDetails = entry.form_data?.order_details || {}
      dynamicKeys.forEach(key => {
        const val = (orderDetails as any)[key]
        baseRow[key] = val !== undefined && val !== null ? String(val) : 'N/A'
      })

      return baseRow
    })

    const csvString = Papa.unparse(exportRows)
    expect(csvString).toContain('T-Shirt Size')
    expect(csvString).toContain('Mattress Size')
    expect(csvString).toContain('Preferred Courier')
    expect(csvString).toContain('Warm Ivory')
    expect(csvString).toContain('King (78x72)')
  })

  it('correctly calculates pagination boundaries and slices for thousands of records', () => {
    // Generate 2,543 dummy records to simulate heavy production data
    const totalRecords = 2543
    const mockEntries = Array.from({ length: totalRecords }, (_, i) => ({
      id: `app-${i + 1}`,
      address_status: i % 2 === 0 ? 'Approved' : 'Pending',
    }))

    const pageSize = 25
    const totalPages = Math.max(1, Math.ceil(mockEntries.length / pageSize))
    expect(totalPages).toBe(102) // Math.ceil(2543 / 25) = 102

    // Page 1
    const page1Start = (1 - 1) * pageSize
    const page1Data = mockEntries.slice(page1Start, page1Start + pageSize)
    expect(page1Data.length).toBe(25)
    expect(page1Data[0].id).toBe('app-1')
    expect(page1Data[24].id).toBe('app-25')

    // Page 102 (Last page: 2543 % 25 = 18 items remaining)
    const page102Start = (102 - 1) * pageSize
    const page102Data = mockEntries.slice(page102Start, page102Start + pageSize)
    expect(page102Data.length).toBe(18)
    expect(page102Data[0].id).toBe('app-2526')
    expect(page102Data[17].id).toBe('app-2543')

    // Start & End index calculation
    const startIndex1 = 0 * pageSize + 1
    const endIndex1 = Math.min(1 * pageSize, totalRecords)
    expect(startIndex1).toBe(1)
    expect(endIndex1).toBe(25)

    const startIndexLast = (102 - 1) * pageSize + 1
    const endIndexLast = Math.min(102 * pageSize, totalRecords)
    expect(startIndexLast).toBe(2526)
    expect(endIndexLast).toBe(2543)
  })

  it('handles empty datasets gracefully without NaN or negative indices', () => {
    const emptyEntries: any[] = []
    const pageSize = 25
    const totalFiltered = emptyEntries.length
    const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
    const startIndex = totalFiltered === 0 ? 0 : (1 - 1) * pageSize + 1
    const endIndex = Math.min(1 * pageSize, totalFiltered)

    expect(totalPages).toBe(1)
    expect(startIndex).toBe(0)
    expect(endIndex).toBe(0)
  })
})

