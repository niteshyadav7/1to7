/**
 * Location Targeting & Eligibility Utility
 * Handles multi-state, multi-city matching for campaigns against creator saved delivery addresses.
 */

export interface ShippingAddressLike {
  id?: string
  title?: string
  recipient_name?: string
  mobile?: string
  address_line1?: string
  address_line2?: string
  landmark?: string
  city?: string
  state?: string
  pincode?: string
  delivery_remarks?: string
  is_default?: boolean
}

export interface StoreLocation {
  id: string
  name: string
  state: string
  city: string
  area?: string
  address: string
  landmark?: string
  pincode?: string
  google_maps_url?: string
  slots_needed?: number
  contact_person?: string
}

export interface CampaignLocationConfig {
  location?: string | null
  location_type?: 'PAN_INDIA' | 'STATES' | 'CITIES' | 'STORES' | string | null
  target_states?: string[] | null
  target_cities?: string[] | null
  store_locations?: StoreLocation[] | null
  enforce_location?: boolean | null
}

export interface LocationEligibilityResult {
  isEligible: boolean
  isStrict: boolean
  locationType: 'PAN_INDIA' | 'STATES' | 'CITIES' | 'STORES'
  requiredLocationText: string
  matchedAddress?: ShippingAddressLike
  matchingAddresses: ShippingAddressLike[]
  userAddresses: ShippingAddressLike[]
  targetStates: string[]
  targetCities: string[]
  storeLocations: StoreLocation[]
  matchingStores: StoreLocation[]
  reason?: string
}

// State aliases and common abbreviations
const STATE_ALIASES: Record<string, string[]> = {
  'UTTAR PRADESH': ['UP', 'U.P.', 'UTTAR PRADESH', 'UTTARPRADESH'],
  'MADHYA PRADESH': ['MP', 'M.P.', 'MADHYA PRADESH', 'MADHYAPRADESH'],
  'ANDHRA PRADESH': ['AP', 'A.P.', 'ANDHRA PRADESH', 'ANDHRAPRADESH'],
  'HIMACHAL PRADESH': ['HP', 'H.P.', 'HIMACHAL PRADESH', 'HIMACHALPRADESH'],
  'NCT OF DELHI': ['DELHI', 'NEW DELHI', 'DELHI NCR', 'NCR', 'NCT OF DELHI'],
  'JAMMU AND KASHMIR': ['J&K', 'JAMMU & KASHMIR', 'JAMMU AND KASHMIR', 'JAMMU KASHMIR'],
  'ANDAMAN & NICOBAR ISLANDS': ['ANDAMAN', 'NICOBAR', 'ANDAMAN AND NICOBAR ISLANDS', 'ANDAMAN & NICOBAR ISLANDS'],
  'DADRA & NAGAR HAVELI': ['DADRA AND NAGAR HAVELI', 'DADRA & NAGAR HAVELI', 'DADRA NAGAR HAVELI'],
  'DAMAN AND DIU': ['DAMAN & DIU', 'DAMAN AND DIU'],
  'WEST BENGAL': ['WB', 'W.B.', 'WEST BENGAL', 'BENGAL'],
  'TAMIL NADU': ['TN', 'T.N.', 'TAMIL NADU', 'TAMILNADU'],
  'MAHARASHTRA': ['MH', 'MAHARASHTRA'],
  'KARNATAKA': ['KA', 'KARNATAKA'],
  'GUJARAT': ['GJ', 'GUJARAT'],
  'RAJASTHAN': ['RJ', 'RAJASTHAN'],
  'PUNJAB': ['PB', 'PUNJAB'],
  'HARYANA': ['HR', 'HARYANA'],
  'BIHAR': ['BR', 'BIHAR'],
  'ODISHA': ['ORISSA', 'ODISHA'],
  'CHHATTISGARH': ['CG', 'CHHATTISGARH'],
  'JHARKHAND': ['JH', 'JHARKHAND'],
  'UTTARAKHAND': ['UK', 'UTTARAKHAND', 'UTTARCHAL', 'UTTARANCHAL'],
  'KERALA': ['KL', 'KERALA'],
  'ASSAM': ['AS', 'ASSAM'],
  'TELANGANA': ['TS', 'TELANGANA', 'TG'],
}

/**
 * Normalizes location string by trimming, stripping punctuation, and uppercasing.
 */
export function normalizeLocationStr(str: string): string {
  if (!str) return ''
  return str
    .toUpperCase()
    .replace(/[.,\-_/\\#()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Checks if a given address state matches a target state (including aliases).
 */
export function doesStateMatch(addressState: string, targetState: string): boolean {
  if (!addressState || !targetState) return false
  const normAddr = normalizeLocationStr(addressState)
  const normTarget = normalizeLocationStr(targetState)

  if (normAddr === normTarget) return true

  // Check aliases
  for (const [canonical, aliases] of Object.entries(STATE_ALIASES)) {
    const canonicalNorm = normalizeLocationStr(canonical)
    const aliasesNorm = aliases.map(normalizeLocationStr)

    const targetIsThisState = normTarget === canonicalNorm || aliasesNorm.includes(normTarget)
    const addrIsThisState = normAddr === canonicalNorm || aliasesNorm.includes(normAddr)

    if (targetIsThisState && addrIsThisState) {
      return true
    }
  }

  // Substring match for compound state names
  if (normAddr.length >= 4 && normTarget.includes(normAddr)) return true
  if (normTarget.length >= 4 && normAddr.includes(normTarget)) return true

  return false
}

/**
 * Checks if a given address city matches a target city.
 */
export function doesCityMatch(addressCity: string, targetCity: string): boolean {
  if (!addressCity || !targetCity) return false
  const normAddr = normalizeLocationStr(addressCity)
  const normTarget = normalizeLocationStr(targetCity)

  if (normAddr === normTarget) return true

  // Partial / Substring match (e.g. "Bengaluru Urban" matches "Bangalore" or "Bengaluru")
  if (normAddr.includes(normTarget) || normTarget.includes(normAddr)) return true

  // Common city aliases
  const cityAliases: Record<string, string[]> = {
    'BANGALORE': ['BENGALURU', 'BANGALORE', 'BANGALORE URBAN', 'BANGALORE RURAL'],
    'MUMBAI': ['BOMBAY', 'MUMBAI', 'MUMBAI SUBURBAN', 'NAVI MUMBAI', 'THANE'],
    'DELHI': ['NEW DELHI', 'DELHI', 'CENTRAL DELHI', 'SOUTH DELHI', 'NORTH DELHI', 'EAST DELHI', 'WEST DELHI', 'NOIDA', 'GURGAON', 'GURUGRAM', 'FARIDABAD', 'GHAZIABAD'],
    'GURGAON': ['GURUGRAM', 'GURGAON'],
    'KOLKATA': ['CALCUTTA', 'KOLKATA', 'HAORA', 'HOWRAH'],
    'CHENNAI': ['MADRAS', 'CHENNAI'],
    'PRAYAGRAJ': ['ALLAHABAD', 'PRAYAGRAJ'],
    'VARANASI': ['BANARAS', 'KASHI', 'VARANASI'],
    'GHAZIABAD': ['GHAZIABAD', 'DELHI NCR', 'NCR'],
    'NOIDA': ['GREATER NOIDA', 'NOIDA', 'GAUTAM BUDDHA NAGAR', 'DELHI NCR'],
  }

  for (const [key, aliases] of Object.entries(cityAliases)) {
    const keyNorm = normalizeLocationStr(key)
    const aliasesNorm = aliases.map(normalizeLocationStr)
    const addrMatches = normAddr === keyNorm || aliasesNorm.some(a => normAddr.includes(a) || a.includes(normAddr))
    const targetMatches = normTarget === keyNorm || aliasesNorm.some(t => normTarget.includes(t) || t.includes(normTarget))
    if (addrMatches && targetMatches) return true
  }

  return false
}

/**
 * Builds a clean human-readable summary of campaign target location.
 */
export function formatCampaignLocationText(config: CampaignLocationConfig): string {
  const type = (config.location_type || 'PAN_INDIA').toUpperCase()
  const targetStates = (config.target_states || []).filter(Boolean)
  const targetCities = (config.target_cities || []).filter(Boolean)
  const stores = (config.store_locations || []).filter(Boolean)

  if (type === 'STORES') {
    if (stores.length > 0) {
      const cities = Array.from(new Set(stores.map(s => s.city).filter(Boolean)))
      if (cities.length <= 2) {
        return `Store Visit: ${stores.length} Outlet${stores.length > 1 ? 's' : ''} in ${cities.join(', ')}`
      }
      return `Store Visit: ${stores.length} Outlets across ${cities.length} Cities`
    }
    return config.location || 'Store Visit (Select Outlets)'
  }

  if (type === 'PAN_INDIA' || (targetStates.length === 0 && targetCities.length === 0)) {
    return config.location || 'PAN India'
  }

  if (type === 'CITIES' && targetCities.length > 0) {
    if (targetCities.length <= 3) {
      return targetCities.join(', ')
    }
    return `${targetCities.slice(0, 3).join(', ')} +${targetCities.length - 3} more cities`
  }

  if (type === 'STATES' && targetStates.length > 0) {
    if (targetStates.length <= 2) {
      return targetStates.map(toTitleCase).join(', ')
    }
    return `${targetStates.slice(0, 2).map(toTitleCase).join(', ')} +${targetStates.length - 2} more states`
  }

  return config.location || 'PAN India'
}

function toTitleCase(str: string): string {
  if (!str) return ''
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

/**
 * Primary Eligibility Evaluation Engine.
 * Evaluates whether a creator (with their saved delivery addresses) satisfies the campaign's location rules.
 */
export function checkCampaignLocationEligibility(
  campaign: CampaignLocationConfig,
  userProfile?: { state?: string | null; city?: string | null; shipping_addresses?: ShippingAddressLike[] | null } | null
): LocationEligibilityResult {
  const locationType = (campaign.location_type || 'PAN_INDIA').toUpperCase() as 'PAN_INDIA' | 'STATES' | 'CITIES' | 'STORES'
  const isStrict = Boolean(campaign.enforce_location)
  const storeLocations = (campaign.store_locations || []).filter(Boolean)

  // For STORES mode, derive target cities & states from the stores list if not explicitly provided
  let targetStates = (campaign.target_states || []).filter(Boolean)
  let targetCities = (campaign.target_cities || []).filter(Boolean)

  if (locationType === 'STORES' && storeLocations.length > 0) {
    const storeCities = storeLocations.map(s => s.city).filter(Boolean)
    const storeStates = storeLocations.map(s => s.state).filter(Boolean)
    targetCities = Array.from(new Set([...targetCities, ...storeCities]))
    targetStates = Array.from(new Set([...targetStates, ...storeStates.map(s => s.toUpperCase())]))
  }

  const requiredLocationText = formatCampaignLocationText(campaign)

  // Collect all available user addresses
  const rawAddresses: ShippingAddressLike[] = []
  if (userProfile?.shipping_addresses && Array.isArray(userProfile.shipping_addresses)) {
    rawAddresses.push(...userProfile.shipping_addresses)
  }
  // Add legacy/profile level state & city as a virtual address if not already present
  if (userProfile?.state || userProfile?.city) {
    const hasExisting = rawAddresses.some(
      a => normalizeLocationStr(a.state || '') === normalizeLocationStr(userProfile.state || '') &&
           normalizeLocationStr(a.city || '') === normalizeLocationStr(userProfile.city || '')
    )
    if (!hasExisting) {
      rawAddresses.push({
        id: 'profile_default',
        title: 'Profile Location',
        state: userProfile.state || '',
        city: userProfile.city || '',
        is_default: rawAddresses.length === 0,
      })
    }
  }

  // If PAN_INDIA or non-strict with no targets defined -> completely eligible
  if (locationType === 'PAN_INDIA' || (targetStates.length === 0 && targetCities.length === 0 && storeLocations.length === 0)) {
    return {
      isEligible: true,
      isStrict,
      locationType,
      requiredLocationText,
      matchedAddress: rawAddresses[0],
      matchingAddresses: rawAddresses,
      userAddresses: rawAddresses,
      targetStates,
      targetCities,
      storeLocations,
      matchingStores: storeLocations,
    }
  }

  // Check matching addresses against target locations
  const matchingAddresses: ShippingAddressLike[] = []
  const matchingStores: StoreLocation[] = []

  for (const addr of rawAddresses) {
    let isMatch = false

    if (locationType === 'STATES') {
      isMatch = targetStates.some(ts => doesStateMatch(addr.state || '', ts))
    } else if (locationType === 'CITIES' || locationType === 'STORES') {
      isMatch = targetCities.some(tc => doesCityMatch(addr.city || '', tc))
      // Also allow if the address state matches
      if (!isMatch && targetStates.length > 0) {
        isMatch = targetStates.some(ts => doesStateMatch(addr.state || '', ts))
      }
    }

    if (isMatch) {
      matchingAddresses.push(addr)
    }
  }

  // Find which specific stores match the creator's addresses (prioritize city matches)
  if (storeLocations.length > 0) {
    for (const store of storeLocations) {
      const isCityMatch = rawAddresses.some(a => doesCityMatch(a.city || '', store.city))
      if (isCityMatch) {
        matchingStores.push(store)
      }
    }

    // If no specific city matched, fallback to matching by state
    if (matchingStores.length === 0) {
      for (const store of storeLocations) {
        const isStateMatch = rawAddresses.some(a => doesStateMatch(a.state || '', store.state))
        if (isStateMatch) {
          matchingStores.push(store)
        }
      }
    }
  }

  const hasMatch = matchingAddresses.length > 0

  if (hasMatch) {
    return {
      isEligible: true,
      isStrict,
      locationType,
      requiredLocationText,
      matchedAddress: matchingAddresses.find(a => a.is_default) || matchingAddresses[0],
      matchingAddresses,
      userAddresses: rawAddresses,
      targetStates,
      targetCities,
      storeLocations,
      matchingStores: matchingStores.length > 0 ? matchingStores : storeLocations,
    }
  }

  // If no match found:
  const userStates = Array.from(new Set(rawAddresses.map(a => a.state).filter(Boolean))) as string[]

  return {
    isEligible: !isStrict,
    isStrict,
    locationType,
    requiredLocationText,
    matchedAddress: undefined,
    matchingAddresses: [],
    userAddresses: rawAddresses,
    targetStates,
    targetCities,
    storeLocations,
    matchingStores: [],
    reason: isStrict
      ? `This campaign is restricted to creators with an address in ${requiredLocationText}. Your saved addresses are in ${userStates.join(', ') || 'other locations'}.`
      : `Preferred location is ${requiredLocationText}. You can still apply, but local creators near store branches may be prioritized.`,
  }
}
