import { describe, it, expect, vi, beforeEach } from 'vitest'
import { UserService, ConflictError, NotFoundError } from '@/lib/services/user.service'
import { supabase } from '@/lib/supabase'

vi.mock('@/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  }
})

describe('UserService Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Custom Error Classes', () => {
    it('instantiates ConflictError with correct name and message', () => {
      const err = new ConflictError('Email already taken')
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('ConflictError')
      expect(err.message).toBe('Email already taken')
    })

    it('instantiates NotFoundError with correct name and message', () => {
      const err = new NotFoundError('Creator not found')
      expect(err).toBeInstanceOf(Error)
      expect(err.name).toBe('NotFoundError')
      expect(err.message).toBe('Creator not found')
    })
  })

  describe('getUserProfile', () => {
    it('throws NotFoundError if database returns null or error', async () => {
      const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Row not found' } })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      ;(supabase.from as any).mockReturnValue({ select: mockSelect })

      await expect(UserService.getUserProfile('non-existent')).rejects.toThrow(NotFoundError)
    })

    it('returns user profile successfully when found', async () => {
      const mockUser = {
        id: 'user-1',
        full_name: 'Aanya Sharma',
        email: 'aanya@example.com',
        followers: 10000,
      }
      const mockSingle = vi.fn().mockResolvedValue({ data: mockUser, error: null })
      const mockEq = vi.fn().mockReturnValue({ single: mockSingle })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      ;(supabase.from as any).mockReturnValue({ select: mockSelect })

      const result = await UserService.getUserProfile('user-1')
      expect(result).toEqual(mockUser)
    })
  })

  describe('checkEmailConflict', () => {
    it('returns conflicting user data when email exists on another account', async () => {
      const mockConflict = { id: 'other-id', influencer_id: 'HY1001', full_name: 'Rahul Roy' }
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: mockConflict, error: null })
      const mockNeq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockEq = vi.fn().mockReturnValue({ neq: mockNeq })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      ;(supabase.from as any).mockReturnValue({ select: mockSelect })

      const result = await UserService.checkEmailConflict('rahul@example.com', 'my-id')
      expect(result).toEqual(mockConflict)
    })

    it('returns null when no other account uses the email', async () => {
      const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
      const mockNeq = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle })
      const mockEq = vi.fn().mockReturnValue({ neq: mockNeq })
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq })
      ;(supabase.from as any).mockReturnValue({ select: mockSelect })

      const result = await UserService.checkEmailConflict('unique@example.com', 'my-id')
      expect(result).toBeNull()
    })
  })

  describe('updateCreatorProfile conflicts', () => {
    it('throws ConflictError if updating email conflicts with another user', async () => {
      const currentUser = { id: 'user-1', email: 'old@example.com', mobile: '9876543210' }
      const conflictingUser = { id: 'user-2', full_name: 'Vikram', influencer_id: 'HY2000' }

      let callCount = 0
      ;(supabase.from as any).mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // fetch current user
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: currentUser, error: null }),
              }),
            }),
          }
        }
        // check conflict
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: conflictingUser, error: null }),
              }),
            }),
          }),
        }
      })

      const admin = {
        id: 'admin-1',
        email: 'super@1to7.com',
        role: 'super_admin',
        is_super_admin: true,
        permissions: {},
      }

      await expect(
        UserService.updateCreatorProfile('user-1', { email: 'conflict@example.com' }, admin)
      ).rejects.toThrow(ConflictError)
    })
  })
})
