import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import {
  BrandAdminPayload,
  BrandAdminRole,
  MASTER_SUPERADMIN_EMAIL,
  isMasterSuperAdmin,
} from '@/types/brand-admin'

const secretKey = process.env.JWT_SECRET_KEY || 'default_super_secret_dev_key_1to7'
const key = new TextEncoder().encode(secretKey)

export const BRAND_ADMIN_COOKIE_NAME = 'brand_admin_token'

/**
 * Encrypt a Brand Admin session payload into a signed JWT.
 */
export async function encryptBrandAdminToken(payload: BrandAdminPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(key)
}

/**
 * Decrypt and verify a Brand Admin JWT token.
 */
export async function decryptBrandAdminToken(token: string): Promise<BrandAdminPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload as unknown as BrandAdminPayload
  } catch {
    return null
  }
}

/**
 * Retrieve the authenticated Brand Admin payload from request cookies.
 */
export async function getBrandAdminFromRequest(): Promise<BrandAdminPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(BRAND_ADMIN_COOKIE_NAME)?.value

    if (!token) return null

    const payload = await decryptBrandAdminToken(token)
    if (!payload?.id || !payload?.email) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Strict evaluation of Brand Admin access.
 * Key Rule: Access to the main Influencer Admin (/admin) DOES NOT grant access to /brand-admin!
 * Only superadmin@gmail.com is auto-authorized. All other users require explicit RBAC approval.
 */
export function evaluateBrandAdminAccess(user: {
  email: string
  brand_admin_access?: boolean
  brand_admin_status?: string
  brand_admin_role?: string
  role?: string
}): {
  allowed: boolean
  isSuperAdmin: boolean
  role: BrandAdminRole
  status: 'approved' | 'pending' | 'rejected'
  reason?: string
} {
  const cleanEmail = (user.email || '').trim().toLowerCase()

  // 1. Master Superadmin check (superadmin@gmail.com)
  if (isMasterSuperAdmin(cleanEmail)) {
    return {
      allowed: true,
      isSuperAdmin: true,
      role: 'brand_superadmin',
      status: 'approved',
    }
  }

  // 2. Check if explicitly approved for Brand Admin Portal
  const isApproved = user.brand_admin_access === true && user.brand_admin_status === 'approved'
  const isRejected = user.brand_admin_status === 'rejected'

  if (isRejected) {
    return {
      allowed: false,
      isSuperAdmin: false,
      role: 'viewer',
      status: 'rejected',
      reason: 'Your access request to the Brand Operations Admin was declined by Super Admin.',
    }
  }

  if (isApproved) {
    const assignedRole = (user.brand_admin_role as BrandAdminRole) || 'viewer'
    return {
      allowed: true,
      isSuperAdmin: assignedRole === 'brand_superadmin',
      role: assignedRole,
      status: 'approved',
    }
  }

  // 3. Fallback: Pending approval
  return {
    allowed: false,
    isSuperAdmin: false,
    role: 'viewer',
    status: 'pending',
    reason:
      'Access to the Brand Operations Admin is restricted. A Super Admin must review and grant your RBAC clearance.',
  }
}

// Capability permissions
export function canManageBrandStaff(user?: BrandAdminPayload | null): boolean {
  if (!user) return false
  return user.is_super_admin || user.brand_admin_role === 'brand_superadmin'
}

export function canManageBrands(user?: BrandAdminPayload | null): boolean {
  if (!user) return false
  return user.is_super_admin || ['brand_superadmin', 'kam_lead'].includes(user.brand_admin_role)
}

export function canProxyApprove(user?: BrandAdminPayload | null): boolean {
  if (!user) return false
  return (
    user.is_super_admin ||
    ['brand_superadmin', 'kam_lead', 'kam'].includes(user.brand_admin_role)
  )
}

export function canManageCampaignMapping(user?: BrandAdminPayload | null): boolean {
  if (!user) return false
  return (
    user.is_super_admin ||
    ['brand_superadmin', 'kam_lead', 'kam'].includes(user.brand_admin_role)
  )
}
