import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ campaign_code: string }> }
) {
  try {
    const { campaign_code } = await params

    // First try campaign-specific config, then fall back to DEFAULT
    let { data: fields, error } = await supabase
      .from('apply_form_config')
      .select('*')
      .eq('campaign_code', campaign_code)
      .order('field_order', { ascending: true })

    if (error) throw error

    // If no campaign-specific config, try DEFAULT
    if (!fields || fields.length === 0) {
      const { data: defaultFields, error: defaultError } = await supabase
        .from('apply_form_config')
        .select('*')
        .eq('campaign_code', 'DEFAULT')
        .order('field_order', { ascending: true })

      if (defaultError) throw defaultError
      fields = defaultFields || []
    }

    return NextResponse.json({ formConfig: fields })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch form config' },
      { status: 500 }
    )
  }
}
