import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const { email, displayName, mobile } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    // Check if user exists by email
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    const cookieStore = await cookies()

    if (existingUser) {
      // Existing user — check if we need to update their mobile or verification status
      const updates: any = {}
      let needsUpdate = false
      
      // Update name from Google if they had a placeholder name
      if (existingUser.full_name === 'Guest Creator' && displayName) {
        updates.full_name = displayName
        existingUser.full_name = displayName
        needsUpdate = true
      }
      
      // Update mobile and verification since they just verified it on the frontend
      if (mobile && existingUser.mobile !== mobile) {
        updates.mobile = mobile
        existingUser.mobile = mobile
        needsUpdate = true
      }
      
      if (!existingUser.is_mobile_verified) {
        updates.is_mobile_verified = true
        existingUser.is_mobile_verified = true
        needsUpdate = true
      }

      if (needsUpdate) {
        await supabase.from('users').update(updates).eq('id', existingUser.id)
      }

      // Existing user — log them in
      const token = await encrypt({ 
        id: existingUser.id, 
        mobile: existingUser.mobile, 
        influencer_id: existingUser.influencer_id 
      })

      cookieStore.set('auth_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30
      })

      const { password_hash, ...userWithoutPassword } = existingUser

      return NextResponse.json({ 
        success: true, 
        user: userWithoutPassword,
        needsMobileVerification: !existingUser.is_mobile_verified, // Should be false now
        isNewUser: false
      })
    }

    // New user — create account fully linked with both email and verified mobile
    // Generate influencer ID in code (RPC returns null via anon key)
    const newInfluencerId = `HY${Math.floor(10000 + Math.random() * 90000)}`

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([{
        full_name: displayName || 'Creator',
        mobile: mobile || '',
        email: email,
        password_hash: '$2b$10$vysFdPLELlPEvtXf1B5kneSq1OV0iEtxOUlf4LpwKfGXmenL1jUpm',
        influencer_id: newInfluencerId,
        is_mobile_verified: true, // Verified strictly on frontend prior to Google Login
        is_email_verified: true,
      }])
      .select('*')
      .single()

    if (insertError) {
      console.error('Google signup insert error:', insertError)
      throw new Error('Failed to create account')
    }

    // Auto-login the new user
    const token = await encrypt({ 
      id: newUser.id, 
      mobile: newUser.mobile, 
      influencer_id: newUser.influencer_id 
    })

    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30
    })

    const { password_hash, ...userWithoutPassword } = newUser

    return NextResponse.json({ 
      success: true, 
      user: userWithoutPassword,
      needsMobileVerification: false,
      isNewUser: true
    })
  } catch (error: any) {
    console.error('API /auth/google-login Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
