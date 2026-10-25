import { describe, it, expect } from 'vitest'
import {
  evaluateBrandAdminAccess,
  canManageBrandStaff,
  canManageBrands,
  canProxyApprove,
} from '@/lib/brand-admin-auth'
import { BrandAdminPayload, MASTER_SUPERADMIN_EMAIL } from '@/types/brand-admin'

describe('Brand Admin RBAC API Verification', () => {
  it('identifies superadmin@gmail.com with unconditional master privileges', () => {
    const access = evaluateBrandAdminAccess({
      email: 'superadmin@gmail.com',
      brand_admin_access: false,
    })

    expect(access.allowed).toBe(true)
    expect(access.isSuperAdmin).toBe(true)
    expect(access.role).toBe('brand_superadmin')
    expect(access.status).toBe('approved')
  })

  it('verifies influencer admin accounts without brand RBAC are strictly pending', () => {
    const staffAccounts = [
      { email: 'poc1@1to7.media', role: 'poc' },
      { email: 'influencer_ops@1to7.media', role: 'admin' },
      { email: 'finance@1to7.media', role: 'finance' },
    ]

    for (const staff of staffAccounts) {
      const access = evaluateBrandAdminAccess(staff)
      expect(access.allowed).toBe(false)
      expect(access.status).toBe('pending')
      expect(access.reason).toContain('restricted')
    }
  })

  it('grants correct permission scopes per approved Brand Admin role', () => {
    const kamUser: BrandAdminPayload = {
      id: 'kam-id',
      email: 'kam@1to7.media',
      name: 'Key Account Manager',
      brand_admin_role: 'kam',
      brand_admin_status: 'approved',
      is_super_admin: false,
    }

    const kamLeadUser: BrandAdminPayload = {
      id: 'lead-id',
      email: 'lead@1to7.media',
      name: 'KAM Lead',
      brand_admin_role: 'kam_lead',
      brand_admin_status: 'approved',
      is_super_admin: false,
    }

    const superAdminUser: BrandAdminPayload = {
      id: 'super-id',
      email: MASTER_SUPERADMIN_EMAIL,
      name: 'Super Admin',
      brand_admin_role: 'brand_superadmin',
      brand_admin_status: 'approved',
      is_super_admin: true,
    }

    // Staff RBAC management: ONLY Super Admin
    expect(canManageBrandStaff(superAdminUser)).toBe(true)
    expect(canManageBrandStaff(kamLeadUser)).toBe(false)
    expect(canManageBrandStaff(kamUser)).toBe(false)

    // Brand Onboarding & Management: Super Admin + KAM Lead
    expect(canManageBrands(superAdminUser)).toBe(true)
    expect(canManageBrands(kamLeadUser)).toBe(true)
    expect(canManageBrands(kamUser)).toBe(false)

    // Proxy Creator Approval on live call: Super Admin + KAM Lead + KAM
    expect(canProxyApprove(superAdminUser)).toBe(true)
    expect(canProxyApprove(kamLeadUser)).toBe(true)
    expect(canProxyApprove(kamUser)).toBe(true)
  })
})
