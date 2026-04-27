import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { mobile, email } = await request.json()

    if (!mobile && !email) {
      return NextResponse.json({ error: 'Mobile or Email is required' }, { status: 400 })
    }

    let query = supabase.from('users').select('id, mobile, email')
    
    if (mobile && email) {
      query = query.or(`mobile.eq.${mobile},email.eq.${email}`)
    } else if (mobile) {
      query = query.eq('mobile', mobile)
    } else if (email) {
      query = query.eq('email', email)
    }

    const { data: users, error } = await query

    if (error) {
      console.error('Supabase query error (check-user-exists):', error)
      return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }

    if (users && users.length > 0) {
      const mobileExists = users.some(u => u.mobile === mobile)
      const emailExists = users.some(u => u.email?.toLowerCase() === email?.toLowerCase())
      
      let message = 'User already exists'
      if (mobileExists && emailExists) message = 'Both mobile and email are already registered.'
      else if (mobileExists) message = 'Mobile number is already registered.'
      else if (emailExists) message = 'Email address is already registered.'

      return NextResponse.json({ exists: true, mobileExists, emailExists, message })
    }

    return NextResponse.json({ exists: false })
  } catch (error) {
    console.error('API /auth/check-user-exists Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
