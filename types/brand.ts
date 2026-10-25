export type BrandUserRole = 'owner' | 'admin' | 'reviewer' | 'viewer'

export type BrandReviewStatus = 
  | 'not_sent'
  | 'pending_brand_review'
  | 'brand_approved'
  | 'brand_rejected'
  | 'changes_requested'

export type BrandContentStatus =
  | 'pending'
  | 'approved'
  | 'revision_requested'

export interface BrandOrganization {
  id: string
  name: string
  slug: string
  gstin?: string | null
  billing_email?: string | null
  billing_address?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Brand {
  id: string
  organization_id?: string | null
  name: string
  slug: string
  logo_url?: string | null
  website?: string | null
  industry?: string | null
  brand_guidelines_url?: string | null
  guidelines_notes?: string | null
  assigned_1to7_kam_id?: string | null
  sla_review_hours: number
  primary_contact_name?: string | null
  primary_contact_email?: string | null
  primary_contact_phone?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface BrandUser {
  id: string
  brand_id: string
  organization_id?: string | null
  email: string
  full_name: string
  phone?: string | null
  role: BrandUserRole
  is_active: boolean
  last_login?: string | null
  created_at: string
  updated_at: string
}

export interface BrandPayload {
  id: string
  brand_id: string
  organization_id?: string | null
  email: string
  full_name: string
  role: BrandUserRole
  brand_name: string
  brand_slug: string
  brand_logo_url?: string | null
  is_virtual?: boolean // If 1to7 admin is viewing as brand
  admin_impersonator_id?: string | null
}

export interface BrandAuditLog {
  id: string
  brand_id: string
  user_id?: string | null
  user_email?: string | null
  action: string
  target_id?: string | null
  metadata?: Record<string, any>
  created_at: string
}

export interface BrandCreatorItem {
  application_id: string
  campaign_id: string
  campaign_code: string
  campaign_title: string
  user_id: string
  creator_name: string
  influencer_id: string
  instagram_username: string
  followers: number
  profile_photo?: string | null
  instagram_profile_pic?: string | null
  city?: string | null
  state?: string | null
  gender?: string | null
  brand_review_status: BrandReviewStatus
  brand_reviewed_at?: string | null
  brand_rejection_reason?: string | null
  brand_feedback_notes?: string | null
  selected_variant?: string | null
  custom_form_data?: Record<string, any>
  applied_at: string
  brand_pitch_batch_name?: string | null
  brand_pitch_notes?: string | null
  courier_status?: string | null
  awb_tracking_number?: string | null
  live_content_url?: string | null
  brand_content_status?: BrandContentStatus | null
}
