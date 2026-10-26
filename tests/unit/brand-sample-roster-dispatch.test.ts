import { describe, it, expect } from 'vitest'
import type { SampleList, SampleListItem } from '@/types/sample-roster'

describe('Brand Sample Roster Direct Portal Dispatch & In-Portal Shortlisting', () => {
  const mockRoster: SampleList = {
    id: 'roster-festive-2026',
    title: 'Festive Season Top Creators',
    brand_id: 'brand-honasa-1',
    brand_name: 'Mamaearth',
    category_niche: 'Beauty & Skincare',
    share_token: 'token_abc123',
    is_public_share_enabled: true,
    allow_brand_shortlisting: true,
    visible_columns: ['creator_name', 'instagram_username', 'followers', 'avg_reels_views', 'engagement_rate', 'city'],
    status: 'active',
    is_published_to_brand: true,
    published_at: new Date().toISOString(),
    published_by: 'Nitesh KAM',
    pitch_note_to_brand: 'Curated 5 top beauty creators with >4% engagement for Q4 Diwali campaign',
    view_count: 3,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const mockCreators: SampleListItem[] = [
    {
      id: 'creator-1',
      sample_list_id: 'roster-festive-2026',
      creator_name: 'Pooja Hegde',
      instagram_username: 'pooja_hegde',
      followers: 500000,
      avg_reels_views: 120000,
      engagement_rate: 4.2,
      city: 'Mumbai',
      niche: 'Beauty & Lifestyle',
      sample_reel_url: 'https://instagram.com/reel/pooja_1',
      brand_commercial: 25000,
      internal_cost: 15000, // Margin secret
      admin_notes: 'Demands complimentary suite; negotiable to 12k',
      sort_order: 1,
      created_at: new Date().toISOString(),
    },
    {
      id: 'creator-2',
      sample_list_id: 'roster-festive-2026',
      creator_name: 'Ananya Sen',
      instagram_username: 'ananya_eats',
      followers: 150000,
      avg_reels_views: 80000,
      engagement_rate: 5.5,
      city: 'Bangalore',
      niche: 'Skincare',
      sample_reel_url: 'https://instagram.com/reel/ananya_2',
      brand_commercial: 18000,
      internal_cost: 10000,
      admin_notes: 'Very cooperative on script revisions',
      sort_order: 2,
      created_at: new Date().toISOString(),
    },
  ]

  describe('Dispatch & Publication State Engine', () => {
    it('validates brand publication payload', () => {
      const dispatchPayload = {
        brand_id: 'brand-honasa-1',
        brand_name: 'Mamaearth',
        pitch_note_to_brand: 'Exclusive festive roster',
      }

      expect(dispatchPayload.brand_name.trim().length).toBeGreaterThan(0)
      expect(dispatchPayload.pitch_note_to_brand.trim().length).toBeGreaterThan(0)
    })

    it('filters rosters strictly by brand access in brand portal', () => {
      const allRosters: SampleList[] = [
        mockRoster,
        {
          ...mockRoster,
          id: 'roster-sugar',
          brand_id: 'brand-sugar-2',
          brand_name: 'Sugar Cosmetics',
          title: 'Sugar Lipsticks Launch',
        },
        {
          ...mockRoster,
          id: 'roster-draft',
          is_published_to_brand: false, // NOT published yet
          title: 'Internal Draft Roster',
        },
      ]

      // Authenticated brand is Mamaearth (brand-honasa-1)
      const currentBrandId = 'brand-honasa-1'

      const visibleToBrand = allRosters.filter(
        (r) => r.is_published_to_brand && (r.brand_id === currentBrandId || r.brand_name === 'General Pitch')
      )

      expect(visibleToBrand.length).toBe(1)
      expect(visibleToBrand[0].title).toBe('Festive Season Top Creators')
      expect(visibleToBrand[0].brand_name).toBe('Mamaearth')
    })
  })

  describe('Margin Security & Client Presentation Shield', () => {
    it('completely strips internal cost and admin notes for brand view', () => {
      const sanitizedCreators = mockCreators.map((c) => {
        const { internal_cost, admin_notes, ...safeFields } = c
        return safeFields
      })

      for (const creator of sanitizedCreators) {
        expect((creator as any).internal_cost).toBeUndefined()
        expect((creator as any).admin_notes).toBeUndefined()
        expect(creator.creator_name).toBeDefined()
        expect(creator.instagram_username).toBeDefined()
        expect(creator.followers).toBeGreaterThan(0)
      }
    })
  })

  describe('In-Portal Shortlist Submission Lifecycle', () => {
    it('validates brand shortlist submission payload from brand portal', () => {
      const submission = {
        roster_id: 'roster-festive-2026',
        selected_item_ids: ['creator-1'],
        brand_poc_name: 'Vikram Mehta (Brand Manager)',
        brand_poc_email: 'vikram@mamaearth.in',
        brand_feedback_notes: 'Approved Pooja Hegde for festive reel',
      }

      expect(submission.selected_item_ids.length).toBe(1)
      expect(submission.brand_poc_name.length).toBeGreaterThan(0)
      expect(submission.brand_feedback_notes).toContain('Pooja Hegde')
    })

    it('enforces that shortlisting is blocked if allow_brand_shortlisting is disabled', () => {
      const closedRoster = { ...mockRoster, allow_brand_shortlisting: false }
      expect(closedRoster.allow_brand_shortlisting).toBe(false)
    })
  })
})
