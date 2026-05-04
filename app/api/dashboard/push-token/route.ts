import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { pushToken, platform } = await request.json()

    if (!pushToken) {
      return NextResponse.json({ error: 'Push token is required' }, { status: 400 })
    }

    // Try to update the user with their push token
    // Note: This assumes a 'push_token' and 'device_platform' column exists in the users table.
    // If they don't, you'll need to run a quick SQL command in Supabase to add them.
    const { error } = await supabase
      .from('users')
      .update({
        push_token: pushToken,
        device_platform: platform || 'unknown',
        updated_at: new Date().toISOString()
      })
      .eq('id', payload.id)

    // If the columns don't exist yet, we'll catch the error but return success to the app
    // so it doesn't crash the mobile experience while you add the columns.
    if (error) {
      console.warn('Failed to save push token (columns might not exist yet):', error)
      return NextResponse.json({ 
        success: true, 
        message: 'Token received but not saved. Please add push_token column to users table.' 
      })
    }

    return NextResponse.json({ success: true, message: 'Push token saved successfully' })
  } catch (err: any) {
    console.error('Error saving push token:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to save push token' },
      { status: 500 }
    )
  }
}
