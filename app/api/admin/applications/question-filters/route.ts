import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

// Known production historical aliases for questions that were renamed mid-campaign
const KNOWN_HISTORICAL_ALIASES: Record<string, string[]> = {
  // HRX commercial question rename
  'please share your best commercials for 1 reel + 1 story for this collaboration.': [
    'If not, please share your best commercials for 1 Reel + 1 Story for this collaboration.',
    'please share your best commercials for 1 Reel + 1 Story for this collaboration',
  ],
}

export async function GET(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'applications')) {
      return NextResponse.json({ error: 'Unauthorized: Access to applications is restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const campaignId = searchParams.get('campaign_id')?.trim() || ''
    const brand = searchParams.get('brand')?.trim() || ''
    const campaignCode = searchParams.get('campaign_code')?.trim() || ''

    if (!campaignId && !brand && !campaignCode) {
      return NextResponse.json({ error: 'campaign_id, campaign_code, or brand query parameter is required' }, { status: 400 })
    }

    let campQuery = supabase
      .from('campaigns')
      .select('id, brand_name, campaign_code, form_fields')

    if (campaignId) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(campaignId)
      if (isUuid) {
        campQuery = campQuery.eq('id', campaignId)
      } else {
        campQuery = campQuery.eq('campaign_code', campaignId)
      }
    } else if (campaignCode) {
      campQuery = campQuery.eq('campaign_code', campaignCode)
    } else if (brand) {
      campQuery = campQuery.ilike('brand_name', brand)
    }

    const { data: campaign, error } = await campQuery.maybeSingle()

    if (error) {
      console.error('[question-filters] Error fetching campaign:', error)
      return NextResponse.json({ error: 'Failed to fetch campaign filters' }, { status: 500 })
    }

    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    // Enrich fields with known aliases and smart filterable flags
    const formFields = Array.isArray(campaign.form_fields) ? campaign.form_fields : []
    const enrichedFields = formFields.map((field: any) => {
      const normalizedName = String(field.name || '').trim().toLowerCase()
      const aliases = Array.isArray(field.aliases) ? [...field.aliases] : []

      // Check if known historical aliases apply
      const known = KNOWN_HISTORICAL_ALIASES[normalizedName]
      if (known) {
        known.forEach(k => {
          if (!aliases.includes(k) && k.toLowerCase() !== normalizedName) {
            aliases.push(k)
          }
        })
      }

      // If filterable is not explicitly false, auto-detect commercial or selection questions
      const isCommercialQuestion = /commercial|quote|budget|rate|charge|fee|remuneration/i.test(field.name || '')
      const isFilterable = field.filterable === true || (field.filterable !== false && (isCommercialQuestion || field.type === 'dropdown' || field.type === 'number'))

      return {
        ...field,
        filterable: isFilterable,
        aliases,
      }
    })

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        brand_name: campaign.brand_name,
        campaign_code: campaign.campaign_code,
        form_fields: enrichedFields,
      }
    })
  } catch (err: any) {
    console.error('[question-filters] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
