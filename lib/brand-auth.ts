import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { BrandPayload, BrandUserRole } from '@/types/brand'

const secretKey = process.env.JWT_SECRET_KEY || 'default_super_secret_dev_key_1to7'
const key = new TextEncoder().encode(secretKey)

export const BRAND_COOKIE_NAME = 'brand_token'

/**
 * Encrypt a brand session payload into a signed JWT.
 */
export async function encryptBrandToken(payload: BrandPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d') // 7 days expiration for brand sessions
    .sign(key)
}

/**
 * Decrypt and verify a brand JWT token.
 */
export async function decryptBrandToken(token: string): Promise<BrandPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload as unknown as BrandPayload
  } catch {
    return null
  }
}

/**
 * Retrieve the authenticated brand payload from request cookies.
 */
export async function getBrandFromRequest(): Promise<BrandPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(BRAND_COOKIE_NAME)?.value

    if (!token) return null

    const payload = await decryptBrandToken(token)
    if (!payload?.id || !payload?.brand_id) return null

    return payload
  } catch {
    return null
  }
}

/**
 * Check if the brand user possesses one of the allowed roles.
 */
export function hasBrandRole(user: BrandPayload | null | undefined, allowedRoles: BrandUserRole[]): boolean {
  if (!user?.role) return false
  return allowedRoles.includes(user.role)
}

/**
 * Capability check: Can the user approve or reject creators?
 * Owners, Admins, and Reviewers can approve. Viewers cannot.
 */
export function canApproveCreators(user: BrandPayload | null | undefined): boolean {
  return hasBrandRole(user, ['owner', 'admin', 'reviewer'])
}

/**
 * Capability check: Can the user invite team members or edit team permissions?
 * Only Owners and Admins can manage the team.
 */
export function canManageTeam(user: BrandPayload | null | undefined): boolean {
  return hasBrandRole(user, ['owner', 'admin'])
}

/**
 * Capability check: Can the user view billing, GST invoices, or commercial totals?
 * Only Owners and Admins can view billing.
 */
export function canViewBilling(user: BrandPayload | null | undefined): boolean {
  return hasBrandRole(user, ['owner', 'admin'])
}

/**
 * Capability check: Can the user edit brand guidelines, moodboards, and dos/don'ts?
 */
export function canEditGuidelines(user: BrandPayload | null | undefined): boolean {
  return hasBrandRole(user, ['owner', 'admin'])
}
