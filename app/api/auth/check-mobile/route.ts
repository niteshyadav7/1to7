import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { mobile } = await request.json()

    if (!mobile || mobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 })
    }

    // Query Supabase for the user
    // We only need to check if they exist
    const { data: user, error } = await supabase
      .from('users')
      .select('id')
      .eq('mobile', mobile)
      .single()

    // If an error occurs that is not "Row not found", it's a server error
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase query error (check-mobile):', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    const exists = !!user
    return NextResponse.json({ exists })
  } catch (error) {
    console.error('API /auth/check-mobile Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
