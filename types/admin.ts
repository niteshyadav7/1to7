/**
 * Central Admin Domain Types & Permissions
 */

export type ModuleKey =
  | 'dashboard'
  | 'campaigns'
  | 'applications'
  | 'order_details'
  | 'payments'
  | 'feedback'
  | 'analytics'
  | 'import'
  | 'influencers'
  | 'staff'
  | 'roles'
  | 'user_issues'

export type ActionKey = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'reset_password'

export type PermissionsMap = Record<string, string[]>

export interface AdminPayload {
  id: string
  email: string
  name?: string
  full_name?: string
  role?: string
  is_active?: boolean
  permissions?: PermissionsMap
  is_super_admin?: boolean
}
