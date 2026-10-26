export type SampleRosterColumnKey =
  | 'creator_name'
  | 'instagram_username'
  | 'followers'
  | 'avg_reels_views'
  | 'engagement_rate'
  | 'city'
  | 'niche'
  | 'sample_reel_url'
  | 'brand_commercial'

export interface ColumnDefinition {
  key: SampleRosterColumnKey
  label: string
  defaultVisible: boolean
  description: string
  category: 'core' | 'metrics' | 'showcase' | 'commercial'
}

export const AVAILABLE_ROSTER_COLUMNS: ColumnDefinition[] = [
  {
    key: 'creator_name',
    label: 'Creator Name & Avatar',
    defaultVisible: true,
    description: 'Public name and avatar initials',
    category: 'core',
  },
  {
    key: 'instagram_username',
    label: 'Instagram Profile & Handle',
    defaultVisible: true,
    description: 'Instagram handle with direct profile link',
    category: 'core',
  },
  {
    key: 'followers',
    label: 'Followers Count',
    defaultVisible: true,
    description: 'Audience reach formatted (e.g. 85K)',
    category: 'metrics',
  },
  {
    key: 'avg_reels_views',
    label: 'Avg Reels Views',
    defaultVisible: true,
    description: 'Average 30-day reel play counts',
    category: 'metrics',
  },
  {
    key: 'engagement_rate',
    label: 'Engagement Rate (%)',
    defaultVisible: true,
    description: 'Calculated interaction percentage',
    category: 'metrics',
  },
  {
    key: 'city',
    label: 'City / Location',
    defaultVisible: true,
    description: 'Primary location of creator',
    category: 'core',
  },
  {
    key: 'niche',
    label: 'Category / Niche',
    defaultVisible: true,
    description: 'Content genres e.g. Beauty, Tech, Lifestyle',
    category: 'core',
  },
  {
    key: 'sample_reel_url',
    label: 'Sample Reel Video Link',
    defaultVisible: true,
    description: 'Portfolio reel link for brand preview',
    category: 'showcase',
  },
  {
    key: 'brand_commercial',
    label: 'Commercial Quoted (₹)',
    defaultVisible: false,
    description: 'Client price per reel (optional pricing proposal)',
    category: 'commercial',
  },
]

export interface SampleList {
  id: string
  title: string
  brand_id?: string | null
  brand_name: string
  category_niche?: string | null
  description?: string | null
  share_token: string
  is_public_share_enabled: boolean
  allow_brand_shortlisting: boolean
  visible_columns: SampleRosterColumnKey[]
  status: 'draft' | 'active' | 'archived'
  view_count: number
  last_viewed_at?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
  items_count?: number
}

export interface SampleListItem {
  id: string
  sample_list_id: string
  user_id?: string | null
  creator_name: string
  instagram_username: string
  followers: number
  avg_reels_views: number
  engagement_rate: number
  city?: string | null
  niche?: string | null
  sample_reel_url?: string | null
  brand_commercial?: number | null
  internal_cost?: number | null // Admin-only, NEVER sent to client
  admin_notes?: string | null
  sort_order: number
  created_at: string
}

export interface BrandShortlist {
  id: string
  sample_list_id?: string | null
  sample_list_title?: string | null
  brand_name: string
  brand_poc_name?: string | null
  brand_poc_email?: string | null
  brand_poc_phone?: string | null
  shortlisted_item_ids: string[]
  shortlisted_creators_count: number
  shortlisted_items?: SampleListItem[]
  brand_feedback_notes?: string | null
  status: 'new' | 'under_review' | 'converted_to_campaign' | 'archived'
  converted_campaign_id?: string | null
  submitted_at: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  created_at: string
  updated_at: string
}
