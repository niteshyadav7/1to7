import { describe, it, expect } from 'vitest'
import { hasModuleAccess, hasActionPermission, AdminPayload } from '@/lib/admin-auth'

describe('admin-auth RBAC', () => {
  describe('hasModuleAccess', () => {
    it('returns false for null or undefined admin', () => {
      expect(hasModuleAccess(null, 'influencers')).toBe(false)
      expect(hasModuleAccess(undefined, 'campaigns')).toBe(false)
    })

    it('grants full access to super_admin for any module', () => {
      const superAdminByRole: AdminPayload = {
        id: 'admin-1',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      }
      expect(hasModuleAccess(superAdminByRole, 'influencers')).toBe(true)
      expect(hasModuleAccess(superAdminByRole, 'campaigns')).toBe(true)
      expect(hasModuleAccess(superAdminByRole, 'roles')).toBe(true)
      expect(hasModuleAccess(superAdminByRole, 'payments')).toBe(true)

      const superAdminByFlag: AdminPayload = {
        id: 'admin-2',
        email: 'super2@1to7.com',
        role: 'staff',
        is_super_admin: true,
      }
      expect(hasModuleAccess(superAdminByFlag, 'influencers')).toBe(true)
    })

    it('grants access to regular admin only when module permission is present', () => {
      const regularAdmin: AdminPayload = {
        id: 'admin-3',
        email: 'staff@1to7.com',
        role: 'staff',
        is_super_admin: false,
        permissions: {
          influencers: ['view'],
          campaigns: ['view', 'edit'],
        },
      }
      expect(hasModuleAccess(regularAdmin, 'influencers')).toBe(true)
      expect(hasModuleAccess(regularAdmin, 'campaigns')).toBe(true)
      expect(hasModuleAccess(regularAdmin, 'payments')).toBe(false)
      expect(hasModuleAccess(regularAdmin, 'roles')).toBe(false)
    })
  })

  describe('hasActionPermission', () => {
    it('returns false for null or undefined admin', () => {
      expect(hasActionPermission(null, 'influencers', 'delete')).toBe(false)
    })

    it('grants all actions to super_admin regardless of permissions object', () => {
      const superAdmin: AdminPayload = {
        id: 'admin-1',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      }
      expect(hasActionPermission(superAdmin, 'influencers', 'delete')).toBe(true)
      expect(hasActionPermission(superAdmin, 'influencers', 'edit')).toBe(true)
      expect(hasActionPermission(superAdmin, 'payments', 'export')).toBe(true)
    })

    it('evaluates exact action permissions for regular admins', () => {
      const staffAdmin: AdminPayload = {
        id: 'admin-4',
        email: 'editor@1to7.com',
        role: 'staff',
        is_super_admin: false,
        permissions: {
          campaigns: ['view', 'edit'],
          influencers: ['view'],
        },
      }

      // Can view and edit campaigns, but cannot delete
      expect(hasActionPermission(staffAdmin, 'campaigns', 'view')).toBe(true)
      expect(hasActionPermission(staffAdmin, 'campaigns', 'edit')).toBe(true)
      expect(hasActionPermission(staffAdmin, 'campaigns', 'delete')).toBe(false)

      // Can view influencers, but cannot edit or delete
      expect(hasActionPermission(staffAdmin, 'influencers', 'view')).toBe(true)
      expect(hasActionPermission(staffAdmin, 'influencers', 'edit')).toBe(false)
      expect(hasActionPermission(staffAdmin, 'influencers', 'delete')).toBe(false)
    })
  })
})
