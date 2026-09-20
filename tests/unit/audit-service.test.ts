import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuditService } from '@/lib/services/audit.service'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  }
})

describe('AuditService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inserts audit log records for changed fields', async () => {
    const mockInsert = vi.fn().mockResolvedValue({ data: null, error: null })
    ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

    const oldUser = {
      full_name: 'Ananya Roy',
      email: 'old@example.com',
      mobile: '9876543210',
    }

    const updateData = {
      full_name: 'Ananya Roy', // unchanged
      email: 'new@example.com', // changed
      mobile: '9123456780', // changed
      updated_at: '2026-09-21T00:00:00Z', // ignored
    }

    const admin = {
      id: 'admin-101',
      name: 'Super Admin',
      email: 'super@1to7.com',
      role: 'super_admin',
      is_super_admin: true,
      permissions: {},
    }

    await AuditService.logProfileChanges('user-1', oldUser, updateData, admin)

    expect(supabase.from).toHaveBeenCalledWith('profile_logs')
    expect(mockInsert).toHaveBeenCalledTimes(1)
    const insertedRecords = mockInsert.mock.calls[0][0]
    expect(insertedRecords).toHaveLength(2)

    expect(insertedRecords[0]).toEqual({
      user_id: 'user-1',
      changed_field: 'email',
      old_value: 'old@example.com',
      new_value: 'new@example.com',
      changed_by: 'admin:admin-101',
      admin_name: 'Super Admin',
    })

    expect(insertedRecords[1]).toEqual({
      user_id: 'user-1',
      changed_field: 'mobile',
      old_value: '9876543210',
      new_value: '9123456780',
      changed_by: 'admin:admin-101',
      admin_name: 'Super Admin',
    })
  })

  it('does not insert records if no values were changed', async () => {
    const mockInsert = vi.fn()
    ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

    const oldUser = {
      full_name: 'Ananya Roy',
      email: 'old@example.com',
    }

    const updateData = {
      full_name: 'Ananya Roy',
      email: 'old@example.com',
      updated_at: '2026-09-21T00:00:00Z',
    }

    const admin = {
      id: 'admin-101',
      email: 'super@1to7.com',
      role: 'super_admin',
      is_super_admin: true,
      permissions: {},
    }

    await AuditService.logProfileChanges('user-1', oldUser, updateData, admin)

    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('handles database error gracefully without throwing', async () => {
    const mockInsert = vi.fn().mockRejectedValue(new Error('DB Connection Failed'))
    ;(supabase.from as any).mockReturnValue({ insert: mockInsert })

    const admin = {
      id: 'admin-101',
      email: 'super@1to7.com',
      role: 'super_admin',
      is_super_admin: true,
      permissions: {},
    }

    await expect(
      AuditService.logProfileChanges(
        'user-1',
        { full_name: 'Old' },
        { full_name: 'New' },
        admin
      )
    ).resolves.not.toThrow()
  })
})
