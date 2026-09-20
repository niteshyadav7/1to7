import { describe, it, expect } from 'vitest'
import { encrypt, decrypt, verifyToken } from '@/lib/auth'

describe('creator-auth JWT functions', () => {
  it('encrypts and decrypts a user session payload accurately', async () => {
    const payload = {
      id: 'user-uuid-12345',
      mobile: '9876543210',
      influencer_id: 'HY10001',
      role: 'influencer',
    }

    const token = await encrypt(payload)
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(20)

    const decrypted = await decrypt(token)
    expect(decrypted.id).toBe(payload.id)
    expect(decrypted.mobile).toBe(payload.mobile)
    expect(decrypted.influencer_id).toBe(payload.influencer_id)
    expect(decrypted.role).toBe(payload.role)
  })

  it('verifyToken returns decoded user object for valid token', async () => {
    const userPayload = {
      id: 'creator-999',
      email: 'creator@gmail.com',
      influencer_id: 'HY24643',
    }

    const token = await encrypt(userPayload)
    const verified = await verifyToken(token)

    expect(verified).not.toBeNull()
    expect(verified?.id).toBe('creator-999')
    expect(verified?.email).toBe('creator@gmail.com')
    expect(verified?.influencer_id).toBe('HY24643')
  })

  it('verifyToken returns null for invalid or corrupted token string', async () => {
    const corruptedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalidpayload.invalidsignature'
    const result = await verifyToken(corruptedToken)
    expect(result).toBeNull()

    const garbage = 'not-a-token-at-all'
    const garbageResult = await verifyToken(garbage)
    expect(garbageResult).toBeNull()
  })
})
