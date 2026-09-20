/**
 * Central Campaign & Application Domain Types
 */

export type BudgetType = 'paid' | 'barter' | 'hybrid' | 'unpaid' | string

export type ApplicationStatus =
  | 'Applied'
  | 'Under Process'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Completed'
  | 'Payment Initiated'
  | 'Payment Approved'
  | 'Payment Requested'
  | 'Order Details Pending'
  | string

export interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
  platform: string
  category: string
  budget_type: BudgetType
  budget_amount?: number
  commercial_amount?: number
  deliverables?: string
  min_followers?: number
  enforce_followers?: boolean
  followers?: string
  order_form?: boolean
  order_form_fields?: any[]
  payment_form_fields?: any[]
  created_at?: string
  status?: string
}

export interface CampaignApplication {
  id: string
  campaign_id: string
  user_id: string
  status: ApplicationStatus
  form_data?: Record<string, any>
  partial_payment: number
  final_payment: number
  pending_amount: number
  commercial_amount?: number
  selected_store?: any
  campaigns?: Campaign
  created_at: string
  updated_at: string
}
