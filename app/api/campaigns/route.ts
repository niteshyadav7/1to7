import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: campaigns, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('is_live', true)
      .eq('status', 'Active')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ campaigns: campaigns || [] })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}
