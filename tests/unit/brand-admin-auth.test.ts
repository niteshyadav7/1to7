import { describe, it, expect } from 'vitest'
import {
  evaluateBrandAdminAccess,
  canManageBrandStaff,
  canManageBrands,
  canProxyApprove,
  encryptBrandAdminToken,
  decryptBrandAdminToken,
} from '@/lib/brand-admin-auth'
import { BrandAdminPayload, MASTER_SUPERADMIN_EMAIL } from '@/types/brand-admin'

describe('Brand Admin RBAC & Access Evaluation', () => {
  it('unconditionally grants full superadmin access to superadmin@gmail.com', () => {
    const res = evaluateBrandAdminAccess({
      email: MASTER_SUPERADMIN_EMAIL,
      brand_admin_access: false, // Even if false in DB!
      brand_admin_status: 'pending',
    })

    expect(res.allowed).toBe(true)
    expect(res.isSuperAdmin).toBe(true)
    expect(res.role).toBe('brand_superadmin')
    expect(res.status).toBe('approved')
  })

  it('handles case-insensitivity and whitespace for superadmin@gmail.com', () => {
    const res = evaluateBrandAdminAccess({
      email: '  SUPERADMIN@GMAIL.COM  ',
    })

    expect(res.allowed).toBe(true)
    expect(res.isSuperAdmin).toBe(true)
    expect(res.role).toBe('brand_superadmin')
  })

  it('BLOCKS existing influencer admin users if they lack explicit brand_admin_approval', () => {
    // This represents an existing employee who has access to /admin but not /brand-admin
    const res = evaluateBrandAdminAccess({
      email: 'influencer_poc@1to7.media',
      role: 'super_admin', // Main admin role
      brand_admin_access: false,
      brand_admin_status: 'pending',
    })

    expect(res.allowed).toBe(false)
    expect(res.isSuperAdmin).toBe(false)
    expect(res.status).toBe('pending')
    expect(res.reason).toContain('restricted')
  })

  it('BLOCKS brand admin users whose access has been rejected', () => {
    const res = evaluateBrandAdminAccess({
      email: 'rejected_candidate@1to7.media',
      brand_admin_access: false,
      brand_admin_status: 'rejected',
    })

    expect(res.allowed).toBe(false)
    expect(res.status).toBe('rejected')
  })

  it('ALLOWS brand admin users when explicitly approved with their specific role', () => {
    const res = evaluateBrandAdminAccess({
      email: 'kam_lead@1to7.media',
      brand_admin_access: true,
      brand_admin_status: 'approved',
      brand_admin_role: 'kam_lead',
    })

    expect(res.allowed).toBe(true)
    expect(res.isSuperAdmin).toBe(false)
    expect(res.role).toBe('kam_lead')
    expect(res.status).toBe('approved')
  })
})

describe('Brand Admin Capability Checks', () => {
  const superAdminPayload: BrandAdminPayload = {
    id: 'admin-1',
    email: MASTER_SUPERADMIN_EMAIL,
    name: 'Super Admin',
    brand_admin_role: 'brand_superadmin',
    brand_admin_status: 'approved',
    is_super_admin: true,
  }

  const kamPayload: BrandAdminPayload = {
    id: 'admin-2',
    email: 'pooja@1to7.media',
    name: 'Pooja Verma',
    brand_admin_role: 'kam',
    brand_admin_status: 'approved',
    is_super_admin: false,
  }

  const viewerPayload: BrandAdminPayload = {
    id: 'admin-3',
    email: 'intern@1to7.media',
    name: 'Intern',
    brand_admin_role: 'viewer',
    brand_admin_status: 'approved',
    is_super_admin: false,
  }

  it('only allows brand_superadmin to manage staff RBAC', () => {
    expect(canManageBrandStaff(superAdminPayload)).toBe(true)
    expect(canManageBrandStaff(kamPayload)).toBe(false)
    expect(canManageBrandStaff(viewerPayload)).toBe(false)
  })

  it('allows brand_superadmin and kam_lead to manage brand accounts', () => {
    expect(canManageBrands(superAdminPayload)).toBe(true)
    expect(canManageBrands({ ...kamPayload, brand_admin_role: 'kam_lead' })).toBe(true)
    expect(canManageBrands(kamPayload)).toBe(false)
    expect(canManageBrands(viewerPayload)).toBe(false)
  })

  it('allows brand_superadmin, kam_lead, and kam to proxy-approve on behalf of brands', () => {
    expect(canProxyApprove(superAdminPayload)).toBe(true)
    expect(canProxyApprove(kamPayload)).toBe(true)
    expect(canProxyApprove(viewerPayload)).toBe(false)
  })
})

describe('Brand Admin JWT Session Tokens', () => {
  it('encrypts and decrypts payload correctly', async () => {
    const payload: BrandAdminPayload = {
      id: 'adm-123',
      email: 'superadmin@gmail.com',
      name: 'Super Admin',
      brand_admin_role: 'brand_superadmin',
      brand_admin_status: 'approved',
      is_super_admin: true,
    }

    const token = await encryptBrandAdminToken(payload)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)

    const decrypted = await decryptBrandAdminToken(token)
    expect(decrypted).not.toBeNull()
    expect(decrypted?.email).toBe('superadmin@gmail.com')
    expect(decrypted?.brand_admin_role).toBe('brand_superadmin')
    expect(decrypted?.is_super_admin).toBe(true)
  })
})
