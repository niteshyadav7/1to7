import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/admin/virtual-profile/[userId]/route'
import { POST } from '@/app/api/admin/virtual-profile/[userId]/apply/route'
import * as adminAuth from '@/lib/admin-auth'

const tableHandlers: Record<string, any> = {}

const mocks = vi.hoisted(() => {
  const mockSingle = vi.fn()
  const mockMaybeSingle = vi.fn()
  const mockInsert = vi.fn(() => ({
    select: vi.fn(() => ({
      single: mockSingle,
    })),
  }))
  const mockUpdate = vi.fn(() => ({
    eq: vi.fn(() => Promise.resolve({ error: null })),
  }))

  const createQueryChain = (tableName: string) => {
    const chain: any = {
      eq: vi.fn(() => chain),
      or: vi.fn(() => chain),
      order: vi.fn(() => chain),
      in: vi.fn(() => chain),
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
      select: vi.fn(() => chain),
      then: (resolve: any) => {
        const handler = tableHandlers[tableName]
        const result = handler ? handler() : { data: [], error: null }
        return Promise.resolve(result).then(resolve)
      },
    }
    return chain
  }

  const mockFrom = vi.fn((tableName: string) => {
    const chain = createQueryChain(tableName)
    return {
      select: vi.fn(() => chain),
      insert: mockInsert,
      update: mockUpdate,
    }
  })

  return {
    mockSingle,
    mockMaybeSingle,
    mockInsert,
    mockUpdate,
    mockFrom,
  }
})

vi.mock('@/lib/admin-auth', () => ({
  getAdminFromRequest: vi.fn(),
  hasModuleAccess: vi.fn(),
  hasActionPermission: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mocks.mockFrom,
  },
}))

vi.mock('@/lib/services/instagram-log.service', () => ({
  InstagramLogService: {
    log: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/lib/mailer', () => ({
  sendApplicationSubmittedEmail: vi.fn().mockResolvedValue(undefined),
}))

describe('Virtual Profile Apply & Campaigns API - Production Audit Tests', () => {
  const getAdminMock = vi.mocked(adminAuth.getAdminFromRequest)
  const hasModuleAccessMock = vi.mocked(adminAuth.hasModuleAccess)

  beforeEach(() => {
    vi.clearAllMocks()
    for (const key of Object.keys(tableHandlers)) {
      delete tableHandlers[key]
    }
    getAdminMock.mockReset()
    hasModuleAccessMock.mockReset()
    hasModuleAccessMock.mockImplementation((admin) => Boolean(admin))
  })

  describe('GET /api/admin/virtual-profile/[userId]?action=campaigns', () => {
    it('returns 403 when unauthenticated', async () => {
      getAdminMock.mockResolvedValueOnce(null)
      hasModuleAccessMock.mockReturnValueOnce(false)

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/target-creator-123?action=campaigns')
      const params = Promise.resolve({ userId: 'target-creator-123' })

      const res = await GET(req, { params })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('enriches campaigns strictly with target creator applications (not admin)', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'super-admin-1',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      })

      const mockCampaigns = [
        { id: 'camp-wakefit', brand_name: 'Wakefit', is_live: true, status: 'Active' },
        { id: 'camp-lavie', brand_name: 'Lavie', is_live: true, status: 'Active' },
      ]

      const mockUserApps = [
        { id: 'app-1', campaign_id: 'camp-wakefit', status: 'Applied', created_at: '2026-10-14T00:00:00Z', form_data: {} },
      ]

      tableHandlers['campaigns'] = () => ({ data: mockCampaigns, error: null })
      tableHandlers['applications'] = () => ({ data: mockUserApps, error: null })

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/target-creator-123?action=campaigns')
      const params = Promise.resolve({ userId: 'target-creator-123' })

      const res = await GET(req, { params })
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.campaigns).toHaveLength(2)
      // Wakefit was applied by target creator
      expect(data.campaigns[0].id).toBe('camp-wakefit')
      expect(data.campaigns[0].applied).toBe(true)
      expect(data.campaigns[0].application_status).toBe('Applied')

      // Lavie was NOT applied by target creator
      expect(data.campaigns[1].id).toBe('camp-lavie')
      expect(data.campaigns[1].applied).toBe(false)
      expect(data.campaigns[1].application_status).toBeNull()
    })
  })

  describe('POST /api/admin/virtual-profile/[userId]/apply', () => {
    it('returns 403 when not authenticated as admin', async () => {
      getAdminMock.mockResolvedValueOnce(null)
      hasModuleAccessMock.mockReturnValueOnce(false)

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/target-creator-123/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: 'camp-1' }),
      })
      const params = Promise.resolve({ userId: 'target-creator-123' })

      const res = await POST(req, { params })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('enforces STRICT RBAC: rejects staff admin with 403 (only super_admin allowed)', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'staff-admin-1',
        email: 'staff@1to7.com',
        role: 'staff',
        is_super_admin: false,
        permissions: { influencers: ['view', 'edit'] },
      })
      hasModuleAccessMock.mockReturnValueOnce(true)

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/target-creator-123/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: 'camp-1' }),
      })
      const params = Promise.resolve({ userId: 'target-creator-123' })

      const res = await POST(req, { params })
      expect(res.status).toBe(403)
      const data = await res.json()
      expect(data.error).toContain('Only Super Administrators have permission')
    })

    it('returns 400 when campaignId is missing', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'super-admin-1',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      })

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/target-creator-123/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      const params = Promise.resolve({ userId: 'target-creator-123' })

      const res = await POST(req, { params })
      expect(res.status).toBe(400)
      const data = await res.json()
      expect(data.error).toBe('Campaign ID is required')
    })

    it('returns 404 when creator user does not exist', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'super-admin-1',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      })

      mocks.mockSingle
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }) // user
        .mockResolvedValueOnce({ data: { id: 'camp-1', status: 'Active', is_live: true }, error: null }) // campaign
      mocks.mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }) // existing app

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/unknown-user/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: 'camp-1' }),
      })
      const params = Promise.resolve({ userId: 'unknown-user' })

      const res = await POST(req, { params })
      expect(res.status).toBe(404)
      const data = await res.json()
      expect(data.error).toBe('Creator not found')
    })

    it('returns 409 when creator has already applied to this campaign', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'super-admin-1',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
      })

      mocks.mockSingle
        .mockResolvedValueOnce({ data: { id: 'target-creator-123', full_name: 'Vinus' }, error: null }) // user
        .mockResolvedValueOnce({ data: { id: 'camp-1', status: 'Active', is_live: true }, error: null }) // campaign
      mocks.mockMaybeSingle.mockResolvedValueOnce({ data: { id: 'existing-app-1', status: 'Applied' }, error: null }) // existing app

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/target-creator-123/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaignId: 'camp-1' }),
      })
      const params = Promise.resolve({ userId: 'target-creator-123' })

      const res = await POST(req, { params })
      expect(res.status).toBe(409)
      const data = await res.json()
      expect(data.error).toContain('This creator has already applied')
    })

    it('successfully creates application with target creator user_id and admin attribution', async () => {
      getAdminMock.mockResolvedValueOnce({
        id: 'super-admin-999',
        email: 'superadmin@1to7.com',
        name: 'Chief Admin',
        role: 'super_admin',
        is_super_admin: true,
      })

      const targetCreator = {
        id: 'target-creator-vinus',
        email: 'vinus@example.com',
        full_name: 'Vinus Creator',
        followers: 5000,
        instagram_username: 'vinus_official',
      }

      const activeCampaign = {
        id: 'camp-wakefit-1',
        brand_name: 'Wakefit',
        campaign_code: 'WAKEFIT01',
        status: 'Active',
        is_live: true,
        enforce_followers: false,
        enforce_location: false,
        manager_phone: '9876543210',
      }

      mocks.mockSingle
        .mockResolvedValueOnce({ data: targetCreator, error: null }) // user in Promise.all
        .mockResolvedValueOnce({ data: activeCampaign, error: null }) // campaign in Promise.all
      mocks.mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }) // existing in Promise.all

      tableHandlers['user_instagram_profiles'] = () => ({
        data: [{ id: 'ig-1', username: 'vinus_official', followers: 5000, is_primary: true }],
        error: null,
      })

      // Insert new application
      mocks.mockSingle.mockResolvedValueOnce({ data: { id: 'new-app-777' }, error: null })

      const req = new Request('http://localhost:3000/api/admin/virtual-profile/target-creator-vinus/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: 'camp-wakefit-1',
          formData: { comments: 'Applying on behalf of creator' },
        }),
      })
      const params = Promise.resolve({ userId: 'target-creator-vinus' })

      const res = await POST(req, { params })
      expect(res.status).toBe(200)
      const data = await res.json()

      expect(data.success).toBe(true)
      expect(data.applicationId).toBe('new-app-777')
      expect(data.message).toContain('on behalf of creator')

      // Verify that supabase.from('applications').insert was called with target creator's user_id!
      expect(mocks.mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'target-creator-vinus',
          campaign_id: 'camp-wakefit-1',
          status: 'Applied',
          form_data: expect.objectContaining({
            applied_by_admin: true,
            applied_by_admin_id: 'super-admin-999',
            applied_by_admin_name: 'Chief Admin',
            applied_by_admin_email: 'superadmin@1to7.com',
            applied_via: 'virtual_profile',
          }),
        })
      )
    })
  })
})
