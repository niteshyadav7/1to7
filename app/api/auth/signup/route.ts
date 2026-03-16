import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const { fullName, mobile, email, password, instagramUsername, gender } = await request.json()

    if (!fullName || !mobile || !email || !password || mobile.length !== 10) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // 1. Check if mobile or email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`mobile.eq.${mobile},email.eq.${email}`)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Mobile or Email already registered' }, { status: 409 })
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 3. Generate Influencer ID
    const { data: influencerData, error: idError } = await supabase
      .rpc('generate_influencer_id')
    
    if (idError) {
      console.error('Error generating ID:', idError)
      return NextResponse.json({ error: 'Failed to generate Influencer ID' }, { status: 500 })
    }

    const newInfluencerId = influencerData

    // 4. Insert into users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        { 
          full_name: fullName, 
          mobile, 
          email,
          password_hash: hashedPassword,
          instagram_username: instagramUsername, 
          gender, 
          influencer_id: newInfluencerId 
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting user:', insertError)
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    // 5. Auto-login: Create JWT token
    const token = await encrypt({ id: newUser.id, mobile: newUser.mobile, influencer_id: newUser.influencer_id })

    // 6. Set httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    const { password_hash, ...userWithoutPassword } = newUser
    return NextResponse.json({ success: true, user: userWithoutPassword })
  } catch (error) {
    console.error('API /auth/signup Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
