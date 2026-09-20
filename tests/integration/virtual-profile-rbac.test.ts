import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PUT, GET } from '@/app/api/admin/virtual-profile/[userId]/route'
import * as adminAuth from '@/lib/admin-auth'

const mocks = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockNeq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
  const mockEq = vi.fn(() => ({
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    neq: mockNeq,
    select: vi.fn(() => ({
      single: mockSingle,
    })),
  }))
  const mockSelect = vi.fn(() => ({
    eq: mockEq,
    single: mockSingle,
  }))
  const mockUpdate = vi.fn(() => ({
    eq: mockEq,
  }))
  const mockInsert = vi.fn().mockResolvedValue({ error: null })

  return {
    mockSingle,
    mockMaybeSingle,
    mockNeq,
    mockEq,
    mockSelect,
    mockUpdate,
    mockInsert,
  }
})

vi.mock('@/lib/admin-auth', () => ({
  getAdminFromRequest: vi.fn(),
  hasModuleAccess: vi.fn(),
  hasActionPermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: mocks.mockSelect,
      update: mocks.mockUpdate,
      insert: mocks.mockInsert,
    })),
  },
}))

describe('Virtual Profile API Route - RBAC and Security', () => {
  const getAdminMock = vi.mocked(adminAuth.getAdminFromRequest)
  const hasModuleAccessMock = vi.mocked(adminAuth.hasModuleAccess)

  beforeEach(() => {
    vi.clearAllMocks()
    hasModuleAccessMock.mockImplementation((admin) => Boolean(admin))
  })

  describe('GET ?action=profile', () => {
    it('returns 403 if admin is not authenticated or lacks module access', async () => {
      getAdminMock.mockResolvedValueOnce(null)
      hasModuleAccessMock.mockReturnValue(false)

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/user-1?action=profile')
      const params = Promise.resolve({ userId: 'user-1' })

      const res = await GET(req, { params })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns user profile and is_super_admin: false for regular admin', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'admin-staff',
        email: 'staff@1to7.com',
        role: 'staff',
        is_super_admin: false,
      })

      mocks.mockSingle.mockResolvedValueOnce({
        data: { id: 'user-1', full_name: 'Creator Name', followers: 1000 },
        error: null,
      })

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/user-1?action=profile')
      const params = Promise.resolve({ userId: 'user-1' })

      const res = await GET(req, { params })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.is_super_admin).toBe(false)
      expect(data.user.full_name).toBe('Creator Name')
    })

    it('returns is_super_admin: true for superadmin session', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'admin-super',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      })

      mocks.mockSingle.mockResolvedValueOnce({
        data: { id: 'user-1', full_name: 'Creator Name', followers: 5000 },
        error: null,
      })

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/user-1?action=profile')
      const params = Promise.resolve({ userId: 'user-1' })

      const res = await GET(req, { params })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.is_super_admin).toBe(true)
    })
  })

  describe('PUT ?action=profile (Mutation)', () => {
    it('returns 403 Forbidden when regular admin attempts mutation', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'admin-staff',
        email: 'staff@1to7.com',
        role: 'staff',
        is_super_admin: false,
      })

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/user-1', {
        method: 'PUT',
        body: JSON.stringify({ full_name: 'Hacked Name' }),
      })
      const params = Promise.resolve({ userId: 'user-1' })

      const res = await PUT(req, { params })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Only Super Administrators')
    })

    it('allows super admin to update profile fields', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'admin-super',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      })

      // 1. Current user lookup
      mocks.mockSingle.mockResolvedValueOnce({
        data: { id: 'user-1', email: 'old@example.com', mobile: '9999999999', full_name: 'Old Name' },
        error: null,
      })

      // 2. Updated user return from .select().single()
      mocks.mockSingle.mockResolvedValueOnce({
        data: { id: 'user-1', full_name: 'Super Admin Updated Name', gender: 'Female' },
        error: null,
      })

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/user-1', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: 'Super Admin Updated Name',
          gender: 'Female',
          bio: 'Verified by super admin',
        }),
      })
      const params = Promise.resolve({ userId: 'user-1' })

      const res = await PUT(req, { params })
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.success).toBe(true)
      expect(data.user.full_name).toBe('Super Admin Updated Name')
    })

    it('rejects email update with 409 Conflict if email is taken by another creator', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'admin-super',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      })

      // Mock current user
      mocks.mockSingle.mockResolvedValueOnce({
        data: { id: 'user-1', email: 'creator1@example.com', mobile: '9999999999' },
        error: null,
      })

      // Mock duplicate check returning an existing user
      mocks.mockMaybeSingle.mockResolvedValueOnce({
        data: { id: 'user-2', influencer_id: 'HY00002', full_name: 'Other Creator' },
        error: null,
      })

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/user-1', {
        method: 'PUT',
        body: JSON.stringify({ email: 'taken@example.com' }),
      })
      const params = Promise.resolve({ userId: 'user-1' })

      const res = await PUT(req, { params })
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toContain('already registered to Other Creator')
    })
  })
})
