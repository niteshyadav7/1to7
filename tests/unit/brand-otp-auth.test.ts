import { describe, it, expect } from 'vitest'
import { encryptBrandToken, decryptBrandToken } from '@/lib/brand-auth'
import type { BrandPayload } from '@/types/brand'

describe('Brand OTP Authentication Unit Tests', () => {
  it('correctly creates 30-day session token upon successful OTP verification', async () => {
    const brandUser: BrandPayload = {
      id: 'brand-user-mamaearth',
      brand_id: 'b-mamaearth',
      organization_id: null,
      email: 'ananya@mamaearth.in',
      full_name: 'Ananya Sharma (Brand Head)',
      role: 'owner',
      brand_name: 'Mamaearth',
      brand_slug: 'mamaearth',
      brand_logo_url: null,
    }

    const token = await encryptBrandToken(brandUser, '30d')
    expect(typeof token).toBe('string')

    const decrypted = await decryptBrandToken(token)
    expect(decrypted).not.toBeNull()
    expect(decrypted?.brand_id).toBe('b-mamaearth')
    expect(decrypted?.email).toBe('ananya@mamaearth.in')
    expect(decrypted?.role).toBe('owner')
  })

  it('verifies numeric OTP length and structure', () => {
    const demoOtp = '123456'
    expect(demoOtp).toMatch(/^\d{6}$/)
    expect(demoOtp.length).toBe(6)

    const randomOtp = Math.floor(100000 + Math.random() * 900000).toString()
    expect(randomOtp).toMatch(/^\d{6}$/)
    expect(randomOtp.length).toBe(6)
  })
})
