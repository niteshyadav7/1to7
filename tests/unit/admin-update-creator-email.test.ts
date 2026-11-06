import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH } from '@/app/api/admin/influencers/[userId]/email/route'
import * as adminAuth from '@/lib/admin-auth'

const mocks = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockNeq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }))
  const mockEq: any = vi.fn(() => ({
    single: mockSingle,
    maybeSingle: mockMaybeSingle,
    neq: mockNeq,
    select: vi.fn(() => ({ single: mockSingle })),
  }))
  const mockSelect: any = vi.fn(() => ({
    eq: mockEq,
    single: mockSingle,
  }))
  const mockUpdate = vi.fn(() => ({
    eq: vi.fn(() => ({
      select: vi.fn(() => ({
        single: mockSingle,
      })),
    })),
  }))
  const mockInsert = vi.fn().mockResolvedValue({ error: null })
  const mockFrom = vi.fn(() => ({
    select: mockSelect,
    update: mockUpdate,
    insert: mockInsert,
  }))

  return {
    mockSingle,
    mockMaybeSingle,
    mockNeq,
    mockEq,
    mockSelect,
    mockUpdate,
    mockInsert,
    mockFrom,
  }
})

vi.mock('@/lib/admin-auth', () => ({
  getAdminFromRequest: vi.fn(),
  hasModuleAccess: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.mockFrom,
  },
}))

vi.mock('@/lib/services/audit.service', () => ({
  AuditService: {
    logProfileChanges: vi.fn().mockResolvedValue(undefined),
  },
}))

describe('PATCH /api/admin/influencers/[userId]/email', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when admin is not authenticated', async () => {
    vi.mocked(adminAuth.getAdminFromRequest).mockResolvedValue(null)

    const req = new Request('http://localhost:3000/api/admin/influencers/user-123/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com' }),
    }) as any

    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-123' }) })
    expect(res.status).toBe(401)
  })

  it('returns 403 when admin is not a super_admin', async () => {
    vi.mocked(adminAuth.getAdminFromRequest).mockResolvedValue({
      id: 'staff-1',
      name: 'POC Staff',
      email: 'poc@1to7.com',
      role: 'staff',
      is_active: true,
      permissions: { influencers: ['view', 'edit'] },
      is_super_admin: false,
    })

    const req = new Request('http://localhost:3000/api/admin/influencers/user-123/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'new@example.com' }),
    }) as any

    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-123' }) })
    expect(res.status).toBe(403)
    const data = await res.json()
    expect(data.error).toContain('Only Super Administrators')
  })

  it('returns 400 for invalid email format', async () => {
    vi.mocked(adminAuth.getAdminFromRequest).mockResolvedValue({
      id: 'sa-1',
      name: 'Super Admin',
      email: 'admin@1to7.com',
      role: 'super_admin',
      is_active: true,
      permissions: {},
      is_super_admin: true,
    })

    const req = new Request('http://localhost:3000/api/admin/influencers/user-123/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    }) as any

    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-123' }) })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('valid email address')
  })

  it('returns 400 when attempting to assign a system placeholder email', async () => {
    vi.mocked(adminAuth.getAdminFromRequest).mockResolvedValue({
      id: 'sa-1',
      name: 'Super Admin',
      email: 'admin@1to7.com',
      role: 'super_admin',
      is_active: true,
      permissions: {},
      is_super_admin: true,
    })

    const req = new Request('http://localhost:3000/api/admin/influencers/user-123/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@guest.1to7.com' }),
    }) as any

    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-123' }) })
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toContain('placeholder')
  })

  it('returns 409 when email belongs to another creator', async () => {
    vi.mocked(adminAuth.getAdminFromRequest).mockResolvedValue({
      id: 'sa-1',
      name: 'Super Admin',
      email: 'admin@1to7.com',
      role: 'super_admin',
      is_active: true,
      permissions: {},
      is_super_admin: true,
    })

    // Mock target user fetch
    mocks.mockMaybeSingle
      .mockResolvedValueOnce({
        data: { id: 'user-123', full_name: 'Current Creator', email: 'old@example.com' },
        error: null,
      })
      // Mock conflict check
      .mockResolvedValueOnce({
        data: { id: 'other-user', full_name: 'Other Creator', influencer_id: 'HY9999' },
        error: null,
      })

    const req = new Request('http://localhost:3000/api/admin/influencers/user-123/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'taken@gmail.com' }),
    }) as any

    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-123' }) })
    expect(res.status).toBe(409)
    const data = await res.json()
    expect(data.error).toContain('Other Creator')
    expect(data.error).toContain('HY9999')
  })

  it('updates email and returns 200 with verified status for valid super admin request', async () => {
    vi.mocked(adminAuth.getAdminFromRequest).mockResolvedValue({
      id: 'sa-1',
      name: 'Super Admin',
      email: 'admin@1to7.com',
      role: 'super_admin',
      is_active: true,
      permissions: {},
      is_super_admin: true,
    })

    // Mock target user fetch
    mocks.mockMaybeSingle
      .mockResolvedValueOnce({
        data: { id: 'user-123', full_name: 'Current Creator', email: 'old@example.com', is_email_verified: false },
        error: null,
      })
      // Mock conflict check (no conflict)
      .mockResolvedValueOnce({
        data: null,
        error: null,
      })

    // Mock update result
    mocks.mockSingle.mockResolvedValueOnce({
      data: {
        id: 'user-123',
        influencer_id: 'HY1234',
        full_name: 'Current Creator',
        email: 'fresh@gmail.com',
        is_email_verified: true,
      },
      error: null,
    })

    const req = new Request('http://localhost:3000/api/admin/influencers/user-123/email', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'FRESH@gmail.com ' }),
    }) as any

    const res = await PATCH(req, { params: Promise.resolve({ userId: 'user-123' }) })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.user.email).toBe('fresh@gmail.com')
    expect(data.user.is_email_verified).toBe(true)
  })
})

