import { describe, it, expect } from 'vitest'
import {
  AVAILABLE_ROSTER_COLUMNS,
  SampleRosterColumnKey,
  SampleListItem,
  BrandShortlist
} from '@/types/sample-roster'
import {
  generateSampleRosterCSV,
  SAMPLE_ROSTER_TEMPLATE_HEADERS,
  SAMPLE_ROSTER_TEMPLATE_ROWS,
} from '@/app/api/admin/sample-lists/template/route'

// Helper metric parser replicating backend ingestion logic
export function parseMetric(val: any): number {
  if (typeof val === 'number') return val
  if (!val) return 0
  const s = String(val).trim().toUpperCase()
  if (s.endsWith('M')) return parseFloat(s) * 1000000
  if (s.endsWith('K')) return parseFloat(s) * 1000
  const n = parseFloat(s.replace(/[^0-9.]/g, ''))
  return isNaN(n) ? 0 : n
}

export function parsePercentage(val: any): number | null {
  if (typeof val === 'number') return val
  if (!val) return null
  const s = String(val).trim().replace('%', '')
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

export function sanitizeInstagramHandle(val: any): string {
  if (!val) return ''
  return String(val)
    .trim()
    .replace(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^@/, '')
    .trim()
}

export function filterItemForClient(item: SampleListItem, visibleColumns: SampleRosterColumnKey[]) {
  const result: Record<string, any> = {
    id: item.id,
    sort_order: item.sort_order
  }

  // Strictly protected columns that can NEVER be exposed to public clients
  const FORBIDDEN_PUBLIC_KEYS = new Set(['internal_cost', 'admin_notes'])

  visibleColumns.forEach(col => {
    if (!FORBIDDEN_PUBLIC_KEYS.has(col) && (item as any)[col] !== undefined) {
      result[col] = (item as any)[col]
    }
  })

  return result
}

describe('Sample Roster Engine & Column Visibility Shield', () => {
  describe('Metric & Handle Normalization', () => {
    it('correctly parses K and M suffix metrics', () => {
      expect(parseMetric('85K')).toBe(85000)
      expect(parseMetric('1.5M')).toBe(1500000)
      expect(parseMetric('250')).toBe(250)
      expect(parseMetric('0')).toBe(0)
      expect(parseMetric(null)).toBe(0)
      expect(parseMetric(' 10.2k ')).toBe(10200)
    })

    it('cleanses raw currency and comma strings', () => {
      expect(parseMetric('₹15,000')).toBe(15000)
      expect(parseMetric('INR 25,500.50')).toBe(25500.5)
      expect(parseMetric('')).toBe(0)
    })

    it('parses engagement rate percentages', () => {
      expect(parsePercentage('4.5%')).toBe(4.5)
      expect(parsePercentage('3.2')).toBe(3.2)
      expect(parsePercentage(null)).toBeNull()
      expect(parsePercentage('invalid')).toBeNull()
    })

    it('sanitizes various Instagram handle formats', () => {
      expect(sanitizeInstagramHandle('@deepika_style')).toBe('deepika_style')
      expect(sanitizeInstagramHandle('https://www.instagram.com/travel_with_rohit/')).toBe('travel_with_rohit')
      expect(sanitizeInstagramHandle('instagram.com/riya_beauty?igsh=123')).toBe('riya_beauty')
      expect(sanitizeInstagramHandle('ananya_panday')).toBe('ananya_panday')
    })
  })

  describe('Column Visibility Shield & Agency Margin Protection', () => {
    const mockFullItem: SampleListItem = {
      id: 'item-101',
      sample_list_id: 'roster-abc',
      creator_name: 'Pooja Hegde',
      instagram_username: 'pooja_hegde',
      niche: 'Fashion & Lifestyle',
      followers: 500000,
      avg_reels_views: 120000,
      engagement_rate: 3.8,
      city: 'Mumbai',
      sample_reel_url: 'https://instagram.com/reel/xyz123',
      brand_commercial: 25000,
      internal_cost: 15000, // AGENCY SECRET: ₹10,000 margin
      admin_notes: 'Creator demands hotel stay; negotiate down to 13k if barter',
      sort_order: 1,
      created_at: new Date().toISOString()
    }

    it('projects only visible columns configured by agency admin', () => {
      const visibleColumns: SampleRosterColumnKey[] = [
        'creator_name',
        'instagram_username',
        'followers',
        'avg_reels_views',
        'city'
      ]

      const sanitized = filterItemForClient(mockFullItem, visibleColumns)

      expect(sanitized.creator_name).toBe('Pooja Hegde')
      expect(sanitized.instagram_username).toBe('pooja_hegde')
      expect(sanitized.followers).toBe(500000)
      expect(sanitized.avg_reels_views).toBe(120000)
      expect(sanitized.city).toBe('Mumbai')

      // Excluded columns should be absent
      expect(sanitized.sample_reel_url).toBeUndefined()
      expect(sanitized.brand_commercial).toBeUndefined()
      expect(sanitized.internal_cost).toBeUndefined()
      expect(sanitized.admin_notes).toBeUndefined()
    })

    it('strictly shields internal_cost and admin_notes even if erroneously included in visibleColumns', () => {
      // Malicious or accidental configuration containing internal secrets
      const leakedColumns = [
        'creator_name',
        'instagram_username',
        'internal_cost',
        'admin_notes'
      ] as any[]

      const sanitized = filterItemForClient(mockFullItem, leakedColumns)

      expect(sanitized.creator_name).toBe('Pooja Hegde')
      expect(sanitized.instagram_username).toBe('pooja_hegde')
      expect(sanitized.internal_cost).toBeUndefined()
      expect(sanitized.admin_notes).toBeUndefined()
    })

    it('allows brand_commercial only when explicitly enabled by agency admin', () => {
      const columnsWithCommercial: SampleRosterColumnKey[] = [
        'creator_name',
        'instagram_username',
        'brand_commercial'
      ]

      const sanitized = filterItemForClient(mockFullItem, columnsWithCommercial)

      expect(sanitized.brand_commercial).toBe(25000)
      expect(sanitized.internal_cost).toBeUndefined()
    })
  })

  describe('Brand Shortlist Submission & Lifecycle State Machine', () => {
    it('validates brand shortlist submission payload', () => {
      const validPayload = {
        sample_list_id: 'roster-abc',
        brand_name: 'Mamaearth',
        brand_contact_name: 'Vikram Mehta',
        brand_contact_email: 'vikram@mamaearth.in',
        brand_notes: 'Shortlisted for Summer 2026 campaign',
        selected_item_ids: ['item-101', 'item-102']
      }

      expect(validPayload.brand_name.trim().length).toBeGreaterThan(0)
      expect(Array.isArray(validPayload.selected_item_ids)).toBe(true)
      expect(validPayload.selected_item_ids.length).toBeGreaterThan(0)
    })

    it('enforces status transitions from new to converted_to_campaign', () => {
      const shortlist: BrandShortlist = {
        id: 'bs-999',
        sample_list_id: 'roster-abc',
        brand_name: 'Mamaearth',
        brand_poc_name: 'Vikram Mehta',
        brand_poc_email: 'vikram@mamaearth.in',
        brand_feedback_notes: 'Urgent turnaround',
        shortlisted_item_ids: ['item-101'],
        shortlisted_creators_count: 1,
        status: 'new',
        converted_campaign_id: null,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      expect(shortlist.status).toBe('new')

      // Transition to under review
      shortlist.status = 'under_review'
      shortlist.updated_at = new Date().toISOString()
      expect(shortlist.status).toBe('under_review')

      // Convert to campaign
      shortlist.status = 'converted_to_campaign'
      shortlist.converted_campaign_id = 'camp-888'
      shortlist.updated_at = new Date().toISOString()

      expect(shortlist.status).toBe('converted_to_campaign')
      expect(shortlist.converted_campaign_id).toBe('camp-888')
    })
  })

  describe('Sample Creator Roster Import Template & CSV Generation', () => {
    it('defines standard expected columns for agency import', () => {
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('Creator Name')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('Instagram Username')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('Followers')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('Avg Reels Views')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('Engagement Rate (%)')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('City')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('Category / Niche')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('Sample Reel URL')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS).toContain('Commercial Quoted (INR)')
      expect(SAMPLE_ROSTER_TEMPLATE_HEADERS.length).toBe(9)
    })

    it('provides multi-genre sample rows with valid numbers and handles', () => {
      expect(SAMPLE_ROSTER_TEMPLATE_ROWS.length).toBeGreaterThanOrEqual(4)

      for (const row of SAMPLE_ROSTER_TEMPLATE_ROWS) {
        expect(row.length).toBe(SAMPLE_ROSTER_TEMPLATE_HEADERS.length)
        const [name, handle, followers, views, engRate] = row
        expect(name.trim().length).toBeGreaterThan(0)
        expect(handle.startsWith('@')).toBe(true)
        expect(parseMetric(followers)).toBeGreaterThan(0)
        expect(parseMetric(views)).toBeGreaterThan(0)
        expect(parsePercentage(engRate)).toBeGreaterThan(0)
      }
    })

    it('generates compliant CSV with UTF-8 BOM for Microsoft Excel', () => {
      const csv = generateSampleRosterCSV()

      // Must start with UTF-8 BOM so Excel opens with proper encoding
      expect(csv.charCodeAt(0)).toBe(0xfeff)

      const lines = csv.replace('\uFEFF', '').split('\n')
      expect(lines.length).toBe(SAMPLE_ROSTER_TEMPLATE_ROWS.length + 1) // header + rows
      expect(lines[0]).toBe(SAMPLE_ROSTER_TEMPLATE_HEADERS.join(','))
    })
  })
})
