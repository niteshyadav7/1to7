import { NextResponse } from 'next/server'
import { checkInstagramHandleAvailability } from '@/lib/instagram-utils'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const handle = searchParams.get('username') || searchParams.get('handle')

    if (!handle) {
      return NextResponse.json({ available: false, message: 'Username is required' }, { status: 400 })
    }

    // Optional: get current logged in user to exclude their own handles
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value
    let currentUserId: string | null = null

    if (token) {
      const payload = await verifyToken(token)
      if (payload && payload.id) {
        currentUserId = payload.id
      }
    }

    const result = await checkInstagramHandleAvailability(handle, currentUserId)

    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json(
      { available: false, message: err.message || 'Validation error' },
      { status: 500 }
    )
  }
}
