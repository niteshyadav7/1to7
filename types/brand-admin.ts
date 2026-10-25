export type BrandAdminRole = 
  | 'brand_superadmin' 
  | 'kam_lead' 
  | 'kam' 
  | 'brand_ops' 
  | 'viewer'

export type BrandAdminStatus = 'pending' | 'approved' | 'rejected'

export interface BrandAdminPayload {
  id: string
  email: string
  name: string
  avatar_url?: string | null
  brand_admin_role: BrandAdminRole
  brand_admin_status: BrandAdminStatus
  is_super_admin: boolean
  assigned_brand_ids?: string[]
}

export interface BrandAdminStaffUser {
  id: string
  email: string
  name: string
  avatar_url?: string | null
  role: string // Main admin role
  brand_admin_access: boolean
  brand_admin_role: BrandAdminRole
  brand_admin_status: BrandAdminStatus
  brand_admin_approved_by?: string | null
  brand_admin_approved_at?: string | null
  created_at?: string
  last_login?: string
}

export const MASTER_SUPERADMIN_EMAIL = 'superadmin@gmail.com'

export function isMasterSuperAdmin(email?: string | null): boolean {
  if (!email) return false
  return email.trim().toLowerCase() === MASTER_SUPERADMIN_EMAIL
}
