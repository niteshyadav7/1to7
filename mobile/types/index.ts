/**
 * Shared TypeScript interfaces — copied from the 1to7 website codebase.
 * These must stay in sync with the web app's data structures.
 */

export interface User {
  id: string
  influencer_id: string
  mobile: string
  full_name?: string
  instagram_username?: string
  email?: string
  gender?: string
  state?: string
  city?: string
  followers?: number
  account_name?: string
  account_number?: string
  ifsc_code?: string
  category?: string
  role?: string
  is_mobile_verified?: boolean
  is_email_verified?: boolean
  profile_strength?: number
  created_at?: string
  updated_at?: string
}

export interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
  category: string
  platform: string
  budget_type: string
  deliverables: string
  product_links: string[]
  requirements: string
  gender_required: string
  is_live: boolean
  status: string
  created_at: string
  location?: string
  looking_for?: string
  followers?: string
  additional_info?: string
  collab_date?: string
  form_link?: string
  form_fields?: FormField[]
  order_form?: boolean
  order_form_fields?: FormField[]
  payment_form_fields?: FormField[]
}

export interface FormField {
  name: string
  type: string       // 'text' | 'number' | 'textarea' | 'dropdown' | 'checkbox' | 'image'
  required: boolean
  options: string[]
}

export interface Application {
  id: string
  status: string
  form_data: Record<string, any>
  partial_payment: number
  final_payment: number
  pending_amount: number
  rejection_reason?: string
  order_screenshot_url?: string
  created_at: string
  updated_at: string
  campaigns: Campaign
}

export interface Stats {
  total: number
  approved: number
  pending: number
  completed: number
  rejected: number
}

export interface Notification {
  id: string
  message: string
  type: string
  created_at: string
  read?: boolean
}
