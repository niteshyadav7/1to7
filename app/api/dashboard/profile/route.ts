import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('id, influencer_id, full_name, mobile, email, instagram_username, gender, profile_strength, account_name, account_number, ifsc_code, state, city, followers, created_at, is_email_verified, is_mobile_verified')
      .eq('id', payload.userId)
      .single()

    console.log('[DEBUG] Fetched user from Supabase:', JSON.stringify(user, null, 2))

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.userId) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()

    // Only allow updating these fields
    const allowedFields = [
      'full_name', 'instagram_username', 'gender',
      'state', 'city', 'followers',
      'account_name', 'account_number', 'ifsc_code'
    ]

    const updateData: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    // Get current user data for logging changes
    const { data: currentUser } = await supabase
      .from('users')
      .select(allowedFields.join(', '))
      .eq('id', payload.userId)
      .single()

    // Update user
    updateData.updated_at = new Date().toISOString()
    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', payload.userId)

    if (updateError) throw updateError

    // Log changes to profile_logs
    if (currentUser) {
      const logEntries = []
      for (const [field, newValue] of Object.entries(updateData)) {
        if (field === 'updated_at') continue
        const oldValue = (currentUser as any)[field]
        if (String(oldValue) !== String(newValue)) {
          logEntries.push({
            user_id: payload.userId,
            changed_field: field,
            old_value: String(oldValue || ''),
            new_value: String(newValue || ''),
          })
        }
      }
      if (logEntries.length > 0) {
        await supabase.from('profile_logs').insert(logEntries)
      }
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to update profile' },
      { status: 500 }
    )
  }
}
