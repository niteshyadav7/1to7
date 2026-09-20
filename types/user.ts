/**
 * Central User Domain Types
 */

export interface ShippingAddress {
  id: string
  title: string
  recipient_name: string
  mobile: string
  address_line1: string
  address_line2?: string
  landmark?: string
  city: string
  state: string
  pincode: string
  delivery_remarks?: string
  is_default: boolean
  created_at?: string
}

export interface LinkedInstagramProfile {
  id: string
  username: string
  normalized_username: string
  followers: number
  category?: string
  profile_pic?: string
  profile_pic_url?: string
  is_primary: boolean
  is_verified?: boolean
  created_at?: string
  updated_at?: string
}

export interface CustomAttributeItem {
  label: string
  value: string
  updated_at?: string
}

export interface UserProfile {
  id: string
  influencer_id: string
  full_name: string
  mobile: string
  email: string
  instagram_username: string
  instagram_profile_pic?: string
  gender: string
  category: string
  languages?: string
  profile_strength: number
  account_name: string
  account_number: string
  ifsc_code: string
  pan_card?: string | null
  pan_card_image?: string | null
  state: string
  city: string
  followers: number
  created_at: string
  dob?: string
  alt_mobile?: string
  tshirt_size?: string
  shoe_size?: string
  bio?: string
  youtube?: string
  pincode?: string
  custom_attributes?: Record<string, CustomAttributeItem>
  shipping_addresses?: ShippingAddress[]
  address_remarks?: string
  is_email_verified?: boolean
  is_mobile_verified?: boolean
  instagram_profiles?: LinkedInstagramProfile[]
}

export type GenderOption = 'Male' | 'Female' | 'Other'

export interface ProfileFormData {
  full_name: string
  mobile: string
  email: string
  instagram_username: string
  instagram_profile_pic: string
  gender: string
  category: string
  languages: string
  state: string
  city: string
  pincode: string
  followers: number
  dob: string
  alt_mobile: string
  tshirt_size: string
  shoe_size: string
  bio: string
  youtube: string
  custom_attributes: Record<string, any>
  account_name: string
  account_number: string
  ifsc_code: string
  pan_card: string
  pan_card_image: string
  shipping_addresses: ShippingAddress[]
  address_remarks: string
}
