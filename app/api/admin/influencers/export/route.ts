import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'
import { getInstagramDisplayHandle, getInstagramUrl } from '@/lib/instagram-utils'

// Helper to escape CSV values safely following RFC 4180
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""'
  let str = String(val).trim()
  // Replace internal newlines with space or pipe to keep single-line rows clean
  str = str.replace(/\r\n|\r|\n/g, ' | ')
  // Escape quotes
  str = str.replace(/"/g, '""')
  return `"${str}"`
}

function parseHyNum(val: string | null): number | null {
  if (!val) return null
  const cleaned = val.toUpperCase().replace(/^HY/, '').trim()
  const num = parseInt(cleaned, 10)
  return isNaN(num) ? null : num
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'influencers')) {
      return NextResponse.json({ error: 'Unauthorized: Access to influencers export is restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const exportScope = searchParams.get('scope') || 'filtered' // 'all' or 'filtered'
    const search = searchParams.get('search') || ''
    const gender = searchParams.get('gender') || ''
    const category = searchParams.get('category') || ''
    const stateFilter = searchParams.get('state') || ''
    const rawSort = searchParams.get('sort') || 'influencer_seq_num'
    const sortOrder = searchParams.get('order') || 'desc'
    const preset = searchParams.get('preset') || 'all' // 'all', 'contact', 'shipping', 'finance'
    const countOnly = searchParams.get('count_only') === 'true'

    // Range parameters
    const fromSeqNum = parseHyNum(searchParams.get('from_hy_id'))
    const toSeqNum = parseHyNum(searchParams.get('to_hy_id'))
    const fromDate = searchParams.get('from_date')
    const toDate = searchParams.get('to_date')
    const minFollowers = searchParams.get('min_followers') ? parseInt(searchParams.get('min_followers')!, 10) : null
    const maxFollowers = searchParams.get('max_followers') ? parseInt(searchParams.get('max_followers')!, 10) : null
    const emailVerified = searchParams.get('email_verified')
    const mobileVerified = searchParams.get('mobile_verified')
    const hasBank = searchParams.get('has_bank')
    const profileStrengthMin = searchParams.get('profile_strength_min') ? parseInt(searchParams.get('profile_strength_min')!, 10) : null
    const maxRecords = searchParams.get('max_records') ? parseInt(searchParams.get('max_records')!, 10) : null

    // Route influencer_id or empty default to the indexed numerical column influencer_seq_num
    let sortBy = rawSort
    if (rawSort === 'influencer_id' || !rawSort) {
      sortBy = 'influencer_seq_num'
    }

    // Build base query
    let baseQuery = supabase.from('users').select('*', countOnly ? { count: 'exact', head: true } : undefined)

    if (exportScope !== 'all') {
      if (search) {
        const searchTerm = `%${search}%`
        baseQuery = baseQuery.or(`full_name.ilike.${searchTerm},email.ilike.${searchTerm},influencer_id.ilike.${searchTerm},instagram_username.ilike.${searchTerm},mobile.ilike.${searchTerm},category.ilike.${searchTerm},languages.ilike.${searchTerm}`)
      }

      if (gender && gender !== 'All') {
        baseQuery = baseQuery.eq('gender', gender)
      }

      if (category && category !== 'All') {
        baseQuery = baseQuery.ilike('category', `%${category}%`)
      }

      if (stateFilter && stateFilter !== 'All') {
        baseQuery = baseQuery.ilike('state', `%${stateFilter}%`)
      }

      // HY ID numerical range
      if (fromSeqNum !== null) {
        baseQuery = baseQuery.gte('influencer_seq_num', fromSeqNum)
      }
      if (toSeqNum !== null) {
        baseQuery = baseQuery.lte('influencer_seq_num', toSeqNum)
      }

      // Joined Date range
      if (fromDate) {
        baseQuery = baseQuery.gte('created_at', `${fromDate}T00:00:00.000Z`)
      }
      if (toDate) {
        baseQuery = baseQuery.lte('created_at', `${toDate}T23:59:59.999Z`)
      }

      // Followers range
      if (minFollowers !== null && !isNaN(minFollowers)) {
        baseQuery = baseQuery.gte('followers', minFollowers)
      }
      if (maxFollowers !== null && !isNaN(maxFollowers)) {
        baseQuery = baseQuery.lte('followers', maxFollowers)
      }

      // Verification & Status
      if (emailVerified === 'true') baseQuery = baseQuery.eq('is_email_verified', true)
      if (emailVerified === 'false') baseQuery = baseQuery.eq('is_email_verified', false)

      if (mobileVerified === 'true') baseQuery = baseQuery.eq('is_mobile_verified', true)
      if (mobileVerified === 'false') baseQuery = baseQuery.eq('is_mobile_verified', false)

      if (hasBank === 'true') {
        baseQuery = baseQuery.not('account_number', 'is', null).neq('account_number', '')
      } else if (hasBank === 'false') {
        baseQuery = baseQuery.or('account_number.is.null,account_number.eq.""')
      }

      if (profileStrengthMin !== null && !isNaN(profileStrengthMin)) {
        baseQuery = baseQuery.gte('profile_strength', profileStrengthMin)
      }
    }

    // If request is only for match count preview in modal
    if (countOnly) {
      const { count, error } = await baseQuery
      if (error) {
        console.error('Count query error:', error)
        throw error
      }
      return NextResponse.json({ count: count || 0 })
    }

    // Apply sorting with deterministic secondary tie breaker
    baseQuery = baseQuery.order(sortBy as string, { ascending: sortOrder === 'asc' })
    if (sortBy !== 'influencer_seq_num') {
      baseQuery = baseQuery.order('influencer_seq_num', { ascending: sortOrder === 'asc' })
    }

    // Fetch all records in batches of 1000 to avoid PostgREST row limits
    const BATCH_SIZE = 1000
    let allInfluencers: any[] = []
    let from = 0
    let hasMore = true
    const targetLimit = maxRecords && maxRecords > 0 ? maxRecords : Infinity

    while (hasMore) {
      const currentBatchSize = Math.min(BATCH_SIZE, targetLimit - allInfluencers.length)
      if (currentBatchSize <= 0) break

      const { data, error } = await baseQuery.range(from, from + currentBatchSize - 1)
      if (error) {
        console.error('Export fetch error at range:', from, error)
        throw error
      }

      if (data && data.length > 0) {
        allInfluencers.push(...data)
        from += currentBatchSize
        if (data.length < currentBatchSize || allInfluencers.length >= targetLimit) {
          hasMore = false
        }
      } else {
        hasMore = false
      }
    }

    // Determine headers according to preset
    let headers: string[] = []
    if (preset === 'shipping') {
      headers = [
        'Influencer ID',
        'Full Name',
        'Mobile Number',
        'Alternate Mobile / WhatsApp',
        'Recipient Name',
        'Delivery Mobile',
        'Address Line 1',
        'Address Line 2',
        'Landmark',
        'City',
        'State',
        'PIN Code',
        'T-Shirt Size',
        'Shoe Size',
        'Delivery Instructions / Remarks',
        'All Saved Addresses Summary'
      ]
    } else if (preset === 'contact') {
      headers = [
        'Influencer ID',
        'Full Name',
        'Email',
        'Email Verified',
        'Mobile Number',
        'Mobile Verified',
        'Gender',
        'City',
        'State',
        'PIN Code',
        'Primary Instagram Handle',
        'Primary Instagram URL',
        'Followers',
        'Content Niches / Categories',
        'Languages Spoken',
        'Profile Strength (%)',
        'Joined Date'
      ]
    } else if (preset === 'finance') {
      headers = [
        'Influencer ID',
        'Full Name',
        'Email',
        'Mobile Number',
        'Bank Account Holder Name',
        'Bank Account Number',
        'Bank IFSC Code',
        'PAN Card Number',
        'PAN Card Image URL',
        'Bank Status'
      ]
    } else {
      // Default: All 50 full profile columns
      headers = [
        'Influencer ID',
        'Full Name',
        'Email',
        'Email Verified',
        'Mobile Number',
        'Mobile Verified',
        'Alternate Mobile / WhatsApp',
        'Gender',
        'Date of Birth',
        'Bio / About',
        'Profile Strength (%)',
        'Profile Photo URL',
        'Primary Instagram Handle',
        'Primary Instagram URL',
        'Primary Instagram Followers',
        'Instagram Account Type',
        'Instagram Media Count',
        'Instagram Verified',
        'All Linked Instagram Profiles',
        'Total Linked Instagram Profiles',
        'YouTube Channel / URL',
        'Website URL',
        'Content Niches / Categories',
        'Languages Spoken',
        'T-Shirt Size',
        'Shoe Size',
        'City',
        'State',
        'Primary PIN Code',
        'Bank Account Holder Name',
        'Bank Account Number',
        'Bank IFSC Code',
        'PAN Card Number',
        'PAN Card Image URL',
        'Bank Details Added',
        'Primary Delivery Address - Title',
        'Primary Delivery Address - Recipient Name',
        'Primary Delivery Address - Contact Mobile',
        'Primary Delivery Address - Address Line 1',
        'Primary Delivery Address - Address Line 2',
        'Primary Delivery Address - Landmark',
        'Primary Delivery Address - City',
        'Primary Delivery Address - State',
        'Primary Delivery Address - PIN Code',
        'All Saved Delivery Addresses (Full)',
        'Total Saved Delivery Addresses',
        'Delivery Instructions / Remarks',
        'Custom Attributes / Questionnaire Data',
        'Joined Date (YYYY-MM-DD)',
        'Joined Timestamp (UTC)',
        'Last Updated (UTC)',
        'User UUID'
      ]
    }

    const csvRows: string[] = []
    csvRows.push(headers.map(h => escapeCSV(h)).join(','))

    for (const u of allInfluencers) {
      // Extract Shipping Addresses
      let shippingAddresses: any[] = []
      if (Array.isArray(u.shipping_addresses)) {
        shippingAddresses = u.shipping_addresses
      } else if (typeof u.shipping_addresses === 'string') {
        try {
          shippingAddresses = JSON.parse(u.shipping_addresses)
        } catch {
          shippingAddresses = []
        }
      }

      const defaultAddr = shippingAddresses.find((a: any) => a.is_default) || shippingAddresses[0]

      // Format all shipping addresses summary
      const formattedAllAddresses = shippingAddresses.length > 0
        ? shippingAddresses.map((a: any, idx: number) => {
            const parts = [
              `[${a.title || `Address ${idx + 1}`}${a.is_default ? ' - DEFAULT' : ''}]`,
              a.recipient_name ? `Recipient: ${a.recipient_name}` : '',
              a.mobile ? `Ph: ${a.mobile}` : '',
              a.address_line1 || '',
              a.address_line2 || '',
              a.landmark ? `Landmark: ${a.landmark}` : '',
              a.city ? a.city : '',
              a.state ? a.state : '',
              a.pincode ? `PIN: ${a.pincode}` : '',
              a.delivery_remarks ? `Remark: ${a.delivery_remarks}` : ''
            ].filter(Boolean)
            return parts.join(', ')
          }).join(' | ')
        : ''

      // Extract Linked Instagram Profiles
      let instaProfiles: any[] = []
      if (Array.isArray(u.instagram_profiles)) {
        instaProfiles = u.instagram_profiles
      } else if (typeof u.instagram_profiles === 'string') {
        try {
          instaProfiles = JSON.parse(u.instagram_profiles)
        } catch {
          instaProfiles = []
        }
      }

      const formattedInstaProfiles = instaProfiles.length > 0
        ? instaProfiles.map((p: any) => {
            const handle = p.username ? `@${p.username.replace(/^@/, '')}` : ''
            const fCount = p.followers ? ` (${Number(p.followers).toLocaleString()} followers)` : ''
            const isPrim = p.is_primary ? ' [PRIMARY]' : ''
            return `${handle}${fCount}${isPrim}`
          }).join(' | ')
        : (u.instagram_username ? `@${u.instagram_username.replace(/^@/, '')}` : '')

      const totalInstaAccounts = instaProfiles.length > 0
        ? instaProfiles.length
        : (u.instagram_username ? 1 : 0)

      // Extract Custom Attributes
      let customAttrStr = ''
      if (u.custom_attributes && typeof u.custom_attributes === 'object') {
        customAttrStr = Object.entries(u.custom_attributes)
          .map(([key, val]: [string, any]) => {
            if (typeof val === 'object' && val !== null) {
              const label = val.label || key
              const v = val.value !== undefined ? val.value : JSON.stringify(val)
              return `${label}: ${v}`
            }
            return `${key}: ${val}`
          })
          .join(' | ')
      }

      // Format Date
      let joinedDateStr = ''
      if (u.created_at) {
        try {
          joinedDateStr = new Date(u.created_at).toISOString().split('T')[0]
        } catch {
          joinedDateStr = String(u.created_at)
        }
      }

      // Format primary PIN
      const primaryPin = defaultAddr?.pincode || u.pincode || ''

      // Format Bank Account to avoid Excel scientific notation
      const formattedAccNum = u.account_number ? `'${u.account_number}` : ''

      let row: string[] = []

      if (preset === 'shipping') {
        row = [
          escapeCSV(u.influencer_id || ''),
          escapeCSV(u.full_name || ''),
          escapeCSV(u.mobile || ''),
          escapeCSV(u.alt_mobile || ''),
          escapeCSV(defaultAddr?.recipient_name || u.full_name || ''),
          escapeCSV(defaultAddr?.mobile || u.mobile || ''),
          escapeCSV(defaultAddr?.address_line1 || ''),
          escapeCSV(defaultAddr?.address_line2 || ''),
          escapeCSV(defaultAddr?.landmark || ''),
          escapeCSV(defaultAddr?.city || u.city || ''),
          escapeCSV(defaultAddr?.state || u.state || ''),
          escapeCSV(primaryPin),
          escapeCSV(u.tshirt_size || ''),
          escapeCSV(u.shoe_size || ''),
          escapeCSV((u.address_remarks || defaultAddr?.delivery_remarks || '').replace(/\r\n|\r|\n/g, ' | ')),
          escapeCSV(formattedAllAddresses)
        ]
      } else if (preset === 'contact') {
        row = [
          escapeCSV(u.influencer_id || ''),
          escapeCSV(u.full_name || ''),
          escapeCSV(u.email || ''),
          escapeCSV(u.is_email_verified ? 'Yes' : 'No'),
          escapeCSV(u.mobile || ''),
          escapeCSV(u.is_mobile_verified ? 'Yes' : 'No'),
          escapeCSV(u.gender || ''),
          escapeCSV(u.city || defaultAddr?.city || ''),
          escapeCSV(u.state || defaultAddr?.state || ''),
          escapeCSV(primaryPin),
          escapeCSV(getInstagramDisplayHandle(u.instagram_username)),
          escapeCSV(getInstagramUrl(u.instagram_username)),
          escapeCSV(u.followers || u.instagram_followers_count || 0),
          escapeCSV(u.category || ''),
          escapeCSV(u.languages || ''),
          escapeCSV(u.profile_strength !== undefined ? `${u.profile_strength}%` : '0%'),
          escapeCSV(joinedDateStr)
        ]
      } else if (preset === 'finance') {
        row = [
          escapeCSV(u.influencer_id || ''),
          escapeCSV(u.full_name || ''),
          escapeCSV(u.email || ''),
          escapeCSV(u.mobile || ''),
          escapeCSV(u.account_name || ''),
          escapeCSV(formattedAccNum),
          escapeCSV(u.ifsc_code || ''),
          escapeCSV(u.pan_card || ''),
          escapeCSV(u.pan_card_image || ''),
          escapeCSV((u.account_name || u.account_number) ? 'Bank Added' : 'No Bank')
        ]
      } else {
        // Complete (50 columns)
        row = [
          escapeCSV(u.influencer_id || ''),
          escapeCSV(u.full_name || ''),
          escapeCSV(u.email || ''),
          escapeCSV(u.is_email_verified ? 'Yes' : 'No'),
          escapeCSV(u.mobile || ''),
          escapeCSV(u.is_mobile_verified ? 'Yes' : 'No'),
          escapeCSV(u.alt_mobile || ''),
          escapeCSV(u.gender || ''),
          escapeCSV(u.dob || ''),
          escapeCSV(u.bio || u.instagram_biography || ''),
          escapeCSV(u.profile_strength !== undefined ? `${u.profile_strength}%` : '0%'),
          escapeCSV(u.profile_photo || u.instagram_profile_pic || ''),
          escapeCSV(getInstagramDisplayHandle(u.instagram_username)),
          escapeCSV(getInstagramUrl(u.instagram_username)),
          escapeCSV(u.followers || u.instagram_followers_count || 0),
          escapeCSV(u.instagram_account_type || ''),
          escapeCSV(u.instagram_media_count ?? ''),
          escapeCSV(u.is_instagram_verified ? 'Yes' : 'No'),
          escapeCSV(formattedInstaProfiles),
          escapeCSV(totalInstaAccounts),
          escapeCSV(u.youtube || ''),
          escapeCSV(u.instagram_website || ''),
          escapeCSV(u.category || ''),
          escapeCSV(u.languages || ''),
          escapeCSV(u.tshirt_size || ''),
          escapeCSV(u.shoe_size || ''),
          escapeCSV(u.city || defaultAddr?.city || ''),
          escapeCSV(u.state || defaultAddr?.state || ''),
          escapeCSV(primaryPin),
          escapeCSV(u.account_name || ''),
          escapeCSV(formattedAccNum),
          escapeCSV(u.ifsc_code || ''),
          escapeCSV(u.pan_card || ''),
          escapeCSV(u.pan_card_image || ''),
          escapeCSV((u.account_name || u.account_number) ? 'Bank Added' : 'No Bank'),
          escapeCSV(defaultAddr?.title || (shippingAddresses.length > 0 ? 'Primary Address' : '')),
          escapeCSV(defaultAddr?.recipient_name || ''),
          escapeCSV(defaultAddr?.mobile || ''),
          escapeCSV(defaultAddr?.address_line1 || ''),
          escapeCSV(defaultAddr?.address_line2 || ''),
          escapeCSV(defaultAddr?.landmark || ''),
          escapeCSV(defaultAddr?.city || ''),
          escapeCSV(defaultAddr?.state || ''),
          escapeCSV(defaultAddr?.pincode || ''),
          escapeCSV(formattedAllAddresses),
          escapeCSV(shippingAddresses.length),
          escapeCSV((u.address_remarks || defaultAddr?.delivery_remarks || '').replace(/\r\n|\r|\n/g, ' | ')),
          escapeCSV(customAttrStr),
          escapeCSV(joinedDateStr),
          escapeCSV(u.created_at || ''),
          escapeCSV(u.updated_at || ''),
          escapeCSV(u.id || '')
        ]
      }

      csvRows.push(row.join(','))
    }

    // Prepend UTF-8 BOM (\uFEFF) so Excel automatically opens UTF-8 without garbled text
    const csvContent = '\uFEFF' + csvRows.join('\r\n')
    const fileName = `influencers_${preset}_${new Date().toISOString().split('T')[0]}.csv`

    return new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        'X-Total-Exported': String(allInfluencers.length)
      }
    })
  } catch (error: any) {
    console.error('API /admin/influencers/export Error:', error)
    return NextResponse.json({ error: error?.message || 'Failed to export influencers' }, { status: 500 })
  }
}
