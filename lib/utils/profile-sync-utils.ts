/**
 * Profile Sync & Question Normalization Utility
 * Intelligently recognizes question variations (e.g., "DOB", "Date of birth", "d.o.b.", "Shoe size", etc.)
 * and synchronizes creator answers directly into their profile and custom_attributes.
 */

export interface CanonicalFieldMapping {
  key: string
  label: string
  patterns: RegExp[]
}

export const CANONICAL_FIELDS: CanonicalFieldMapping[] = [
  {
    key: 'dob',
    label: 'Date of Birth',
    patterns: [
      /^(dob|d\.o\.b\.?|date\s*of\s*birth|birth\s*date|birthdate|birthday|born\s*on|date_of_birth|birth_date)$/i,
      /\b(date\s*of\s*birth|birth\s*date|birthdate|birthday)\b/i,
      /\bd\.?o\.?b\.?\b/i
    ]
  },
  {
    key: 'gender',
    label: 'Gender',
    patterns: [
      /^(gender|sex)$/i,
      /\b(gender|sex)\b/i
    ]
  },
  {
    key: 'city',
    label: 'City',
    patterns: [
      /^(city|town|current\s*city|living\s*city|district)$/i,
      /\b(current\s*city|home\s*city)\b/i
    ]
  },
  {
    key: 'state',
    label: 'State',
    patterns: [
      /^(state|province|region|state\s*name)$/i
    ]
  },
  {
    key: 'pincode',
    label: 'Pincode',
    patterns: [
      /^(pincode|pin\s*code|zip|zipcode|zip\s*code|postal\s*code|postcode|area\s*pin(code)?)$/i,
      /\b(pin\s*code|postal\s*code|zipcode)\b/i
    ]
  },
  {
    key: 'alt_mobile',
    label: 'Alternate / WhatsApp Phone',
    patterns: [
      /^(alt(ernate)?\s*(mobile|phone|number|contact)|whatsapp(\s*(number|no))?|secondary\s*(mobile|phone))$/i,
      /\b(alternate\s*(mobile|phone|number)|whatsapp\s*(number|no))\b/i
    ]
  },
  {
    key: 'shoe_size',
    label: 'Shoe Size',
    patterns: [
      /^(shoe\s*size|shoesize|footwear\s*size|foot\s*size)$/i,
      /\b(shoe\s*size|footwear\s*size)\b/i
    ]
  },
  {
    key: 'tshirt_size',
    label: 'T-Shirt / Cloth Size',
    patterns: [
      /^(t-?shirt\s*size|shirt\s*size|tshirt\s*size|clothing\s*size|dress\s*size|apparel\s*size|top\s*size|cloth\s*size)$/i,
      /\b(t-?shirt\s*size|clothing\s*size|apparel\s*size)\b/i
    ]
  },
  {
    key: 'bio',
    label: 'Bio / About You',
    patterns: [
      /^(bio|about\s*you(rself)?|intro|introduction|short\s*bio|biography)$/i,
      /\b(about\s*yourself|about\s*you)\b/i
    ]
  },
  {
    key: 'youtube',
    label: 'YouTube Channel / Link',
    patterns: [
      /^(youtube|youtube\s*channel|youtube\s*link|youtube\s*url|yt\s*channel|yt\s*link|yt\s*url)$/i,
      /\b(youtube\s*channel|youtube\s*link)\b/i
    ]
  },
  {
    key: 'instagram_username',
    label: 'Instagram Handle',
    patterns: [
      /^(instagram|instagram\s*handle|insta\s*handle|ig\s*handle|instagram\s*username|insta\s*username|instagram\s*link|instagram\s*profile)$/i
    ]
  },
  {
    key: 'full_name',
    label: 'Full Name',
    patterns: [
      /^(full\s*name|your\s*name|creator\s*name|legal\s*name)$/i
    ]
  },
  {
    key: 'languages',
    label: 'Languages Known / Spoken',
    patterns: [
      /^(languages?|languages?\s*(spoken|known|they\s*speak|you\s*speak)|spoken\s*languages?|known\s*languages?|mother\s*tongue|language\s*preference)$/i,
      /\b(languages?\s*(spoken|known|they\s*speak|you\s*speak)|mother\s*tongue)\b/i
    ]
  },
  {
    key: 'pan_card',
    label: 'PAN Card Number',
    patterns: [
      /^(pan|pan\s*card|pan\s*number|pan\s*no\.?|pancard|pan_card|pan_number)$/i,
      /\b(pan\s*card|pan\s*number|pancard)\b/i
    ]
  },
  {
    key: 'pan_card_image',
    label: 'PAN Card Document / Image',
    patterns: [
      /^(pan\s*(card)?\s*(image|photo|doc|document|proof|upload|copy|file)|pancard\s*(image|photo|doc|document))$/i,
      /\b(pan\s*card\s*(image|photo|proof|document))\b/i
    ]
  }
]

export interface ProfileFieldPreset {
  id: string
  label: string
  icon: string
  name: string
  type: 'text' | 'number' | 'textarea' | 'dropdown' | 'image' | 'date'
  required: boolean
  options: string[]
  description: string
  canonicalKey: string
}

export const PROFILE_FIELD_PRESETS: ProfileFieldPreset[] = [
  {
    id: 'pan_card',
    label: 'PAN Card Number',
    icon: '💳',
    name: 'PAN Card Number',
    type: 'text',
    required: false,
    options: [],
    description: 'Auto-saves to creator payout tax & bank records',
    canonicalKey: 'pan_card'
  },
  {
    id: 'pan_card_image',
    label: 'PAN Card Photo / Document',
    icon: '📄',
    name: 'Upload PAN Card',
    type: 'image',
    required: false,
    options: [],
    description: 'Auto-saves uploaded PAN card document',
    canonicalKey: 'pan_card_image'
  },
  {
    id: 'dob',
    label: 'Date of Birth',
    icon: '🎂',
    name: 'Date of Birth (DD/MM/YYYY)',
    type: 'date',
    required: true,
    options: [],
    description: 'Auto-saves to creator birth date & age calculation',
    canonicalKey: 'dob'
  },
  {
    id: 'shoe_size',
    label: 'Shoe Size',
    icon: '👟',
    name: 'Shoe Size (UK/India)',
    type: 'dropdown',
    required: true,
    options: ['UK 5', 'UK 6', 'UK 7', 'UK 8', 'UK 9', 'UK 10', 'UK 11', 'UK 12'],
    description: 'Auto-saves to creator profile footwear size',
    canonicalKey: 'shoe_size'
  },
  {
    id: 'tshirt_size',
    label: 'T-Shirt Size',
    icon: '👕',
    name: 'T-Shirt / Apparel Size',
    type: 'dropdown',
    required: true,
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'],
    description: 'Auto-saves to creator profile clothing size',
    canonicalKey: 'tshirt_size'
  },
  {
    id: 'languages',
    label: 'Spoken Languages',
    icon: '🗣️',
    name: 'Languages You Speak',
    type: 'text',
    required: true,
    options: [],
    description: 'Auto-saves to creator spoken languages',
    canonicalKey: 'languages'
  },
  {
    id: 'alt_mobile',
    label: 'WhatsApp Number',
    icon: '📱',
    name: 'WhatsApp / Alternate Mobile',
    type: 'text',
    required: true,
    options: [],
    description: 'Auto-saves secondary contact phone',
    canonicalKey: 'alt_mobile'
  },
  {
    id: 'city',
    label: 'Current City',
    icon: '🏙️',
    name: 'Current City',
    type: 'text',
    required: true,
    options: [],
    description: 'Auto-saves creator primary city',
    canonicalKey: 'city'
  },
  {
    id: 'state',
    label: 'State',
    icon: '📍',
    name: 'State / UT',
    type: 'text',
    required: true,
    options: [],
    description: 'Auto-saves creator primary state',
    canonicalKey: 'state'
  },
  {
    id: 'pincode',
    label: 'Pincode',
    icon: '📮',
    name: 'Delivery Pincode',
    type: 'text',
    required: true,
    options: [],
    description: 'Auto-saves creator delivery pincode',
    canonicalKey: 'pincode'
  },
  {
    id: 'bio',
    label: 'Bio / About',
    icon: '📝',
    name: 'Bio / About You',
    type: 'textarea',
    required: false,
    options: [],
    description: 'Auto-saves creator about/bio summary',
    canonicalKey: 'bio'
  },
  {
    id: 'youtube',
    label: 'YouTube Link',
    icon: '🎥',
    name: 'YouTube Channel Link',
    type: 'text',
    required: false,
    options: [],
    description: 'Auto-saves creator YouTube profile',
    canonicalKey: 'youtube'
  }
]

export interface FormFieldSyncConfig {
  name: string
  type?: string
  required?: boolean
  options?: string[]
  sync_to_profile?: boolean
  profile_sync_key?: string
}

/**
 * Checks whether a question field is mapped to a Creator Profile field or is Campaign-Only.
 */
export function getFieldSyncStatus(field: { name: string; sync_to_profile?: boolean; profile_sync_key?: string }): {
  isProfileSync: boolean
  targetKey: string | null
  targetLabel: string | null
  icon: string
  description: string
} {
  // If explicitly disabled or marked as 'none'
  if (field.sync_to_profile === false || field.profile_sync_key === 'none') {
    return {
      isProfileSync: false,
      targetKey: null,
      targetLabel: null,
      icon: '📄',
      description: 'Campaign application only (stored in responses, not in creator profile)'
    }
  }

  // If explicitly mapped to a specific canonical key
  if (field.profile_sync_key && field.profile_sync_key !== 'auto' && field.profile_sync_key !== 'none') {
    const canonical = CANONICAL_FIELDS.find(f => f.key === field.profile_sync_key)
    const preset = PROFILE_FIELD_PRESETS.find(p => p.canonicalKey === field.profile_sync_key)
    return {
      isProfileSync: true,
      targetKey: field.profile_sync_key,
      targetLabel: canonical?.label || field.profile_sync_key,
      icon: preset?.icon || '⚡',
      description: `Mapped to Creator Profile → ${canonical?.label || field.profile_sync_key}`
    }
  }

  // If sync_to_profile is true or auto, check if label matches a canonical field
  if (field.sync_to_profile === true || field.profile_sync_key === 'auto') {
    const canonicalKey = getCanonicalField(field.name)
    if (canonicalKey) {
      const canonical = CANONICAL_FIELDS.find(f => f.key === canonicalKey)
      const preset = PROFILE_FIELD_PRESETS.find(p => p.canonicalKey === canonicalKey)
      return {
        isProfileSync: true,
        targetKey: canonicalKey,
        targetLabel: canonical?.label || canonicalKey,
        icon: preset?.icon || '⚡',
        description: `Auto-recognized! Pre-fills & syncs to Profile → ${canonical?.label || canonicalKey}`
      }
    }
  }

  return {
    isProfileSync: false,
    targetKey: null,
    targetLabel: null,
    icon: '📄',
    description: 'Campaign only (saved with this application submission)'
  }
}

/**
 * Normalizes any raw question label into a clean trimmed key.
 * Removes symbols like `(DD/MM/YYYY)`, `*`, `:`, `?`, etc.
 */
export function cleanQuestionLabel(label: string): string {
  if (!label) return ''
  return label
    .replace(/\s*\([^)]*\)/g, '') // remove parentheticals e.g. (DD/MM/YYYY) or (Optional)
    .replace(/[*?:!#]/g, '')     // remove punctuation
    .trim()
}

/**
 * Creates a slug key from a question label for custom_attributes storage.
 */
export function createAttributeSlug(label: string): string {
  const cleaned = cleanQuestionLabel(label)
  return cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/**
 * Finds if a raw question string matches any known canonical profile field.
 */
export function getCanonicalField(rawLabel: string): string | null {
  const cleaned = cleanQuestionLabel(rawLabel).toLowerCase()
  if (!cleaned) return null

  for (const field of CANONICAL_FIELDS) {
    for (const pattern of field.patterns) {
      if (pattern.test(cleaned)) {
        return field.key
      }
    }
  }

  return null
}

/**
 * Transient campaign question slugs that should NEVER be stored in creator permanent profiles
 */
export const TRANSIENT_CAMPAIGN_SLUGS = [
  'pitch',
  'video_pitch',
  'comments',
  'comment',
  'feedback',
  'commercials',
  'commercial',
  'quote',
  'ad_rights',
  'ad_rights_1_month_usage',
  'usage_rights',
  'are_you_a_punjabi_speaking',
  'punjabi_speaking',
  'satet3',
  'state2',
  'sate',
  'instagram_id',
  'followers_count',
  'profile_category',
  'applied_instagram_username',
  'applied_instagram_followers',
  'preferred_store',
  'order_details',
  'order_details_approved'
]

/**
 * Extracts and maps form data answers into standard user profile updates.
 * STRICT: Only syncs fields that are explicitly configured with sync_to_profile = true
 * or mapped to a standard profile column. Never dumps arbitrary questions into custom_attributes.
 */
export function extractProfileUpdatesFromFormData(
  formData: Record<string, any>,
  existingProfile?: {
    dob?: string | null
    gender?: string | null
    city?: string | null
    state?: string | null
    pincode?: string | null
    alt_mobile?: string | null
    shoe_size?: string | null
    tshirt_size?: string | null
    bio?: string | null
    youtube?: string | null
    languages?: string | null
    custom_attributes?: Record<string, any> | null
    [key: string]: any
  } | null,
  campaignFormFields?: FormFieldSyncConfig[] | null
): {
  profileUpdates: Record<string, any>
  customAttributes: Record<string, any>
  hasChanges: boolean
} {
  if (!formData || typeof formData !== 'object') {
    return { profileUpdates: {}, customAttributes: {}, hasChanges: false }
  }

  const profileUpdates: Record<string, any> = {}
  const customAttributes: Record<string, any> = {
    ...(existingProfile?.custom_attributes || {})
  }
  let hasChanges = false

  // Create lookup map of campaign form fields if provided
  const fieldsMap = new Map<string, FormFieldSyncConfig>()
  if (Array.isArray(campaignFormFields)) {
    for (const f of campaignFormFields) {
      if (f && f.name) {
        fieldsMap.set(f.name.trim().toLowerCase(), f)
        fieldsMap.set(cleanQuestionLabel(f.name).toLowerCase(), f)
      }
    }
  }

  for (const [rawKey, rawValue] of Object.entries(formData)) {
    if (rawValue === undefined || rawValue === null || rawValue === '') continue

    const valueStr = typeof rawValue === 'string' ? rawValue.trim() : String(rawValue)
    if (!valueStr) continue

    const rawKeyLower = rawKey.trim().toLowerCase()
    const cleanedKeyLower = cleanQuestionLabel(rawKey).toLowerCase()

    // 1. Check if campaignFormFields explicitly specified this field
    const configuredField = fieldsMap.get(rawKeyLower) || fieldsMap.get(cleanedKeyLower)

    if (configuredField) {
      // If admin explicitly set sync_to_profile = false or profile_sync_key = 'none' -> SKIP
      if (configuredField.sync_to_profile === false || configuredField.profile_sync_key === 'none') {
        continue
      }

      // If mapped to a specific canonical target
      let targetCanonical: string | null = null
      if (configuredField.profile_sync_key && configuredField.profile_sync_key !== 'auto') {
        targetCanonical = configuredField.profile_sync_key
      } else if (configuredField.sync_to_profile === true) {
        targetCanonical = getCanonicalField(configuredField.name) || getCanonicalField(rawKey)
      }

      if (targetCanonical) {
        if (targetCanonical === 'dob') {
          profileUpdates.dob = valueStr
          hasChanges = true
        } else if (targetCanonical === 'gender') {
          const lower = valueStr.toLowerCase()
          if (lower.startsWith('m')) profileUpdates.gender = 'Male'
          else if (lower.startsWith('f')) profileUpdates.gender = 'Female'
          else if (lower.includes('other') || lower.includes('non')) profileUpdates.gender = 'Other'
          else profileUpdates.gender = valueStr
          hasChanges = true
        } else if (targetCanonical === 'alt_mobile') {
          profileUpdates.alt_mobile = valueStr.replace(/[^0-9+]/g, '')
          hasChanges = true
        } else if (['city', 'state', 'pincode', 'shoe_size', 'tshirt_size', 'bio', 'youtube', 'languages'].includes(targetCanonical)) {
          profileUpdates[targetCanonical] = valueStr
          hasChanges = true
        }

        // Clean from customAttributes
        delete customAttributes[targetCanonical]
        const slug = createAttributeSlug(rawKey)
        if (slug) delete customAttributes[slug]
        continue
      }

      // If sync_to_profile is false or unmapped, DO NOT save to profile
      continue
    }

    // 2. If campaignFormFields not provided (fallback), only match strictly known canonical fields
    const canonicalKey = getCanonicalField(rawKey)
    if (canonicalKey) {
      if (canonicalKey === 'dob') {
        profileUpdates.dob = valueStr
        hasChanges = true
      } else if (canonicalKey === 'gender') {
        const lower = valueStr.toLowerCase()
        if (lower.startsWith('m')) profileUpdates.gender = 'Male'
        else if (lower.startsWith('f')) profileUpdates.gender = 'Female'
        else if (lower.includes('other') || lower.includes('non')) profileUpdates.gender = 'Other'
        else profileUpdates.gender = valueStr
        hasChanges = true
      } else if (canonicalKey === 'alt_mobile') {
        profileUpdates.alt_mobile = valueStr.replace(/[^0-9+]/g, '')
        hasChanges = true
      } else if (['city', 'state', 'pincode', 'shoe_size', 'tshirt_size', 'bio', 'youtube', 'languages'].includes(canonicalKey)) {
        profileUpdates[canonicalKey] = valueStr
        hasChanges = true
      }

      delete customAttributes[canonicalKey]
      const slug = createAttributeSlug(rawKey)
      if (slug) delete customAttributes[slug]
    }
  }

  // 3. Clean out all transient campaign junk and canonical duplicates from customAttributes
  for (const key of Object.keys(customAttributes)) {
    const item = customAttributes[key]
    const label = typeof item === 'object' && item !== null ? item.label || key : key
    const slug = createAttributeSlug(key)
    const labelSlug = createAttributeSlug(label)

    if (
      isStandardProfileField(key) ||
      isStandardProfileField(label) ||
      TRANSIENT_CAMPAIGN_SLUGS.includes(slug) ||
      TRANSIENT_CAMPAIGN_SLUGS.includes(labelSlug)
    ) {
      delete customAttributes[key]
      hasChanges = true
    }
  }

  if (hasChanges || existingProfile?.custom_attributes) {
    profileUpdates.custom_attributes = customAttributes
  }

  return {
    profileUpdates,
    customAttributes,
    hasChanges
  }
}


/**
 * Checks if a key or label corresponds to a built-in standard profile field.
 */
export function isStandardProfileField(keyOrLabel: string): boolean {
  if (!keyOrLabel) return false
  const canonical = getCanonicalField(keyOrLabel)
  if (canonical) return true

  const norm = keyOrLabel.toLowerCase().replace(/[^a-z0-9]/g, '')
  const standardKeys = [
    'dob', 'dateofbirth', 'birthdate', 'birthday',
    'gender', 'sex',
    'fullname', 'name', 'creatorname',
    'email', 'emailaddress',
    'mobile', 'phone', 'whatsapp', 'altmobile', 'alternatemobile', 'contactnumber',
    'instagram', 'instagramhandle', 'instagramusername', 'instaid', 'followers', 'followercount',
    'city', 'state', 'sate', 'pincode', 'pincod', 'zip', 'zipcode', 'address', 'shippingaddress',
    'tshirtsize', 'tshirt', 'clothsize', 'shoesize', 'shoe', 'footwearsize',
    'youtube', 'youtubelink', 'youtubechannel',
    'bio', 'about', 'languages', 'language',
    'accountname', 'accountnumber', 'ifsccode', 'ifsc', 'bankname',
    'pancard', 'pan', 'panno', 'pannumber', 'pancardnumber', 'pancardimage', 'pancardphoto', 'pancarddoc'
  ]
  return standardKeys.includes(norm)
}

/**
 * Returns a prefilled value for a question field given a user profile.
 * Checks both standard columns and custom_attributes.
 */
export function getPrefillValueForField(rawLabel: string, user: any): string {
  if (!user || !rawLabel) return ''

  const canonicalKey = getCanonicalField(rawLabel)

  // Check direct column on user
  if (canonicalKey && user[canonicalKey] !== undefined && user[canonicalKey] !== null) {
    const val = String(user[canonicalKey]).trim()
    if (val) return val
  }

  // Check custom_attributes JSONB
  if (user.custom_attributes && typeof user.custom_attributes === 'object') {
    // Check by canonical key
    if (canonicalKey && user.custom_attributes[canonicalKey]) {
      const attr = user.custom_attributes[canonicalKey]
      if (typeof attr === 'object' && attr.value !== undefined) return String(attr.value).trim()
      if (typeof attr === 'string') return attr.trim()
    }

    // Check by slug
    const slug = createAttributeSlug(rawLabel)
    if (slug && user.custom_attributes[slug]) {
      const attr = user.custom_attributes[slug]
      if (typeof attr === 'object' && attr.value !== undefined) return String(attr.value).trim()
      if (typeof attr === 'string') return attr.trim()
    }

    // Direct case-insensitive match on keys
    const lowerLabel = cleanQuestionLabel(rawLabel).toLowerCase()
    for (const [key, val] of Object.entries(user.custom_attributes)) {
      if (key.toLowerCase() === lowerLabel) {
        if (typeof val === 'object' && val !== null && (val as any).value !== undefined) {
          return String((val as any).value).trim()
        }
        return String(val).trim()
      }
    }
  }

  return ''
}
