import { cookies } from 'next/headers'
import { SignJWT, jwtVerify } from 'jose'
import type { BrandPayload, BrandUserRole } from '@/types/brand'

const secretKey = process.env.JWT_SECRET_KEY || 'default_super_secret_dev_key_1to7'
const key = new TextEncoder().encode(secretKey)

export const BRAND_COOKIE_NAME = 'brand_token'

export interface BrandReviewTokenPayload {
  brand_id: string
  brand_name: string
  brand_slug: string
  email: string
  full_name?: string
  role?: BrandUserRole
  campaign_id?: string
  batch_name?: string
  token_type?: 'pitch_review' | 'direct_access'
}

/**
 * Encrypt a brand session payload into a signed JWT.
 * Defaults to 30 days for persistent client sessions.
 */
export async function encryptBrandToken(payload: BrandPayload, expiresIn = '30d'): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
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
 * Generate a short-lived or 14-day signed review token for client WhatsApp / Email links.
 */
export async function generateBrandReviewToken(
  payload: BrandReviewTokenPayload,
  expiresIn = '14d'
): Promise<string> {
  return await new SignJWT({
    id: `review-${payload.brand_slug}-${Date.now()}`,
    brand_id: payload.brand_id,
    brand_name: payload.brand_name,
    brand_slug: payload.brand_slug,
    email: payload.email || `reviewer@${payload.brand_slug}.com`,
    full_name: payload.full_name || `${payload.brand_name} Brand Lead`,
    role: payload.role || 'reviewer',
    campaign_id: payload.campaign_id,
    batch_name: payload.batch_name,
    token_type: payload.token_type || 'pitch_review',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(key)
}

/**
 * Decrypt and verify a brand pitch review token.
 */
export async function verifyBrandReviewToken(token: string): Promise<any | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    })
    return payload
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
