import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    let { data: campaign, error } = isUuid
      ? await supabase.from('campaigns').select('*').eq('id', id).maybeSingle()
      : await supabase.from('campaigns').select('*').ilike('campaign_code', id).maybeSingle()

    // If UUID lookup failed or returned nothing, attempt fallback to campaign_code lookup
    if (!campaign && isUuid) {
      const { data: codeMatch } = await supabase
        .from('campaigns')
        .select('*')
        .ilike('campaign_code', id)
        .maybeSingle()
      if (codeMatch) campaign = codeMatch
    }

    if (error || !campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ campaign })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch campaign' },
      { status: 500 }
    )
  }
}
