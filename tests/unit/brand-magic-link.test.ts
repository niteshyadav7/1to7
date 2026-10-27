import { describe, it, expect } from 'vitest'
import {
  generateBrandReviewToken,
  verifyBrandReviewToken,
  decryptBrandToken,
  encryptBrandToken,
} from '@/lib/brand-auth'
import type { BrandReviewTokenPayload, BrandPayload } from '@/types/brand'

describe('Brand Magic Review Link Unit Tests', () => {
  const samplePayload: BrandReviewTokenPayload = {
    brand_id: 'b-mamaearth',
    brand_name: 'Mamaearth',
    brand_slug: 'mamaearth',
    email: 'ananya@mamaearth.in',
    full_name: 'Ananya Sharma (Brand Head)',
    role: 'reviewer',
    campaign_id: 'camp-101',
    batch_name: 'Batch-1: Diwali Launch',
    token_type: 'pitch_review',
  }

  it('generates a signed JWT review token with 14-day validity', async () => {
    const token = await generateBrandReviewToken(samplePayload, '14d')
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(30)

    const verified = await verifyBrandReviewToken(token)
    expect(verified).not.toBeNull()
    expect(verified.brand_id).toBe('b-mamaearth')
    expect(verified.brand_name).toBe('Mamaearth')
    expect(verified.brand_slug).toBe('mamaearth')
    expect(verified.email).toBe('ananya@mamaearth.in')
    expect(verified.batch_name).toBe('Batch-1: Diwali Launch')
    expect(verified.role).toBe('reviewer')
    expect(verified.token_type).toBe('pitch_review')
  })

  it('rejects tampered or corrupt review tokens', async () => {
    const validToken = await generateBrandReviewToken(samplePayload)
    const tamperedToken = validToken.slice(0, -6) + 'abc123'

    const result = await verifyBrandReviewToken(tamperedToken)
    expect(result).toBeNull()
  })

  it('rejects empty or random string tokens', async () => {
    expect(await verifyBrandReviewToken('')).toBeNull()
    expect(await verifyBrandReviewToken('not-a-jwt')).toBeNull()
  })

  it('mints 30-day session token correctly from review payload', async () => {
    const reviewToken = await generateBrandReviewToken(samplePayload)
    const verified = await verifyBrandReviewToken(reviewToken)

    const sessionPayload: BrandPayload = {
      id: verified.id,
      brand_id: verified.brand_id,
      organization_id: null,
      email: verified.email,
      full_name: verified.full_name,
      role: verified.role,
      brand_name: verified.brand_name,
      brand_slug: verified.brand_slug,
    }

    const sessionJwt = await encryptBrandToken(sessionPayload, '30d')
    const decryptedSession = await decryptBrandToken(sessionJwt)

    expect(decryptedSession).not.toBeNull()
    expect(decryptedSession?.brand_id).toBe('b-mamaearth')
    expect(decryptedSession?.role).toBe('reviewer')
  })
})
