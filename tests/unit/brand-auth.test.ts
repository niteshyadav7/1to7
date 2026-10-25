import { describe, it, expect } from 'vitest'
import {
  encryptBrandToken,
  decryptBrandToken,
  hasBrandRole,
  canApproveCreators,
  canManageTeam,
  canViewBilling,
  canEditGuidelines,
} from '@/lib/brand-auth'
import type { BrandPayload } from '@/types/brand'

describe('Brand Auth Unit Tests', () => {
  const mockBrandOwner: BrandPayload = {
    id: 'user-uuid-1',
    brand_id: 'brand-uuid-101',
    organization_id: 'org-uuid-99',
    email: 'director@mamaearth.in',
    full_name: 'Ananya Sharma',
    role: 'owner',
    brand_name: 'Mamaearth',
    brand_slug: 'mamaearth',
    brand_logo_url: 'https://example.com/logo.png',
  }

  const mockBrandAdmin: BrandPayload = {
    ...mockBrandOwner,
    id: 'user-uuid-2',
    email: 'admin@mamaearth.in',
    role: 'admin',
  }

  const mockBrandReviewer: BrandPayload = {
    ...mockBrandOwner,
    id: 'user-uuid-3',
    email: 'reviewer@mamaearth.in',
    role: 'reviewer',
  }

  const mockBrandViewer: BrandPayload = {
    ...mockBrandOwner,
    id: 'user-uuid-4',
    email: 'viewer@mamaearth.in',
    role: 'viewer',
  }

  describe('JWT Token Encryption & Decryption', () => {
    it('successfully encrypts and decrypts a brand payload', async () => {
      const token = await encryptBrandToken(mockBrandOwner)
      expect(typeof token).toBe('string')
      expect(token.length).toBeGreaterThan(20)

      const decrypted = await decryptBrandToken(token)
      expect(decrypted).not.toBeNull()
      expect(decrypted?.id).toBe(mockBrandOwner.id)
      expect(decrypted?.brand_id).toBe(mockBrandOwner.brand_id)
      expect(decrypted?.email).toBe(mockBrandOwner.email)
      expect(decrypted?.role).toBe('owner')
      expect(decrypted?.brand_slug).toBe('mamaearth')
    })

    it('returns null for an invalid or tampered token', async () => {
      const result = await decryptBrandToken('invalid.tampered.token.123')
      expect(result).toBeNull()
    })

    it('returns null for an empty token string', async () => {
      const result = await decryptBrandToken('')
      expect(result).toBeNull()
    })
  })

  describe('Role-Based Access Control (RBAC) Permissions', () => {
    it('correctly validates hasBrandRole', () => {
      expect(hasBrandRole(mockBrandOwner, ['owner'])).toBe(true)
      expect(hasBrandRole(mockBrandReviewer, ['owner', 'admin'])).toBe(false)
      expect(hasBrandRole(mockBrandReviewer, ['reviewer'])).toBe(true)
      expect(hasBrandRole(null, ['owner'])).toBe(false)
      expect(hasBrandRole(undefined, ['reviewer'])).toBe(false)
    })

    it('canApproveCreators allows owner, admin, and reviewer, but blocks viewer', () => {
      expect(canApproveCreators(mockBrandOwner)).toBe(true)
      expect(canApproveCreators(mockBrandAdmin)).toBe(true)
      expect(canApproveCreators(mockBrandReviewer)).toBe(true)
      expect(canApproveCreators(mockBrandViewer)).toBe(false)
      expect(canApproveCreators(null)).toBe(false)
    })

    it('canManageTeam allows only owner and admin', () => {
      expect(canManageTeam(mockBrandOwner)).toBe(true)
      expect(canManageTeam(mockBrandAdmin)).toBe(true)
      expect(canManageTeam(mockBrandReviewer)).toBe(false)
      expect(canManageTeam(mockBrandViewer)).toBe(false)
      expect(canManageTeam(null)).toBe(false)
    })

    it('canViewBilling allows only owner and admin', () => {
      expect(canViewBilling(mockBrandOwner)).toBe(true)
      expect(canViewBilling(mockBrandAdmin)).toBe(true)
      expect(canViewBilling(mockBrandReviewer)).toBe(false)
      expect(canViewBilling(mockBrandViewer)).toBe(false)
      expect(canViewBilling(null)).toBe(false)
    })

    it('canEditGuidelines allows only owner and admin', () => {
      expect(canEditGuidelines(mockBrandOwner)).toBe(true)
      expect(canEditGuidelines(mockBrandAdmin)).toBe(true)
      expect(canEditGuidelines(mockBrandReviewer)).toBe(false)
      expect(canEditGuidelines(mockBrandViewer)).toBe(false)
      expect(canEditGuidelines(null)).toBe(false)
    })
  })
})
