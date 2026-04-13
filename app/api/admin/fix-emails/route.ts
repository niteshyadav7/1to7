import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: Request) {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ is_email_verified: true })
      .eq('is_email_verified', false)
      .select()

    if (error) {
      console.error('Error updating users:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({ success: true, updated: data?.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// cmd