import { BrandReviewStatus } from './brand'

export interface CampaignPitchItem {
  application_id: string
  campaign_id: string
  campaign_code: string
  campaign_title: string
  brand_name: string
  user_id: string
  creator_name: string
  influencer_id: string
  instagram_username: string
  followers: number
  city?: string | null
  state?: string | null
  gender?: string | null
  profile_photo?: string | null
  instagram_profile_pic?: string | null
  brand_review_status: BrandReviewStatus
  brand_pitch_batch_name?: string | null
  brand_pitch_notes?: string | null
  brand_pitched_at?: string | null
  brand_pitched_by?: string | null
  brand_reviewed_at?: string | null
  brand_reviewed_by?: string | null
  brand_rejection_reason?: string | null
  brand_feedback_notes?: string | null
  selected_variant?: string | null
  sample_reel_link?: string | null
  client_commercial?: number | null
  internal_payout_cost?: number | null
  internal_cost?: number | null
  is_commercial_pitch?: boolean
  applied_at: string
  custom_form_data?: Record<string, any>
  address_verification_status?: 'Verified' | 'Pending' | 'Rejected' | 'Not Submitted'
  is_address_verified?: boolean
  is_ready_for_brand_dispatch?: boolean
  verified_address_details?: {
    recipient_name: string
    phone: string
    alt_phone?: string | null
    street: string
    landmark?: string | null
    city: string
    state: string
    pincode: string
    deliverable_sku: string
    courier_copy_text: string
    verified_at?: string | null
  } | null
}

export interface PitchBatchSummary {
  batch_name: string
  campaign_id: string
  campaign_code: string
  brand_name: string
  count: number
  last_pitched_at?: string | null
}

export interface PitchFilterCounts {
  all: number
  queued_for_brand_admin: number
  pending_brand_review: number
  brand_approved: number
  brand_rejected: number
  internal_rejected: number
  costing: number
  total_commercial_value: number
}

export interface ColumnShieldOption {
  key: string
  label: string
  category: 'core' | 'metrics' | 'logistics' | 'content' | 'commercials'
  defaultVisible: boolean
  isSensitive?: boolean
}

export const CAMPAIGN_PITCH_COLUMNS: ColumnShieldOption[] = [
  { key: 'creator_name', label: 'Creator Full Name', category: 'core', defaultVisible: true },
  { key: 'instagram_username', label: 'Instagram Handle', category: 'core', defaultVisible: true },
  { key: 'followers', label: 'Follower Count', category: 'metrics', defaultVisible: true },
  { key: 'city', label: 'Location / City', category: 'logistics', defaultVisible: true },
  { key: 'state', label: 'State', category: 'logistics', defaultVisible: true },
  { key: 'gender', label: 'Gender', category: 'core', defaultVisible: false },
  { key: 'selected_variant', label: 'Product Variant / Shade', category: 'content', defaultVisible: true },
  { key: 'sample_reel_link', label: 'Sample Reel URL', category: 'content', defaultVisible: true },
  { key: 'client_commercial', label: 'Client Commercial Quote (₹)', category: 'commercials', defaultVisible: true },
  { key: 'custom_answers', label: 'Campaign Question Answers', category: 'content', defaultVisible: false },
]

export const FORBIDDEN_CLIENT_KEYS = new Set([
  'internal_cost',
  'internal_payout_cost',
  'mobile',
  'phone',
  'email',
  'shipping_address',
  'home_address',
  'bank_account',
  'ifsc_code',
  'pan_card',
  'upi_id'
])
