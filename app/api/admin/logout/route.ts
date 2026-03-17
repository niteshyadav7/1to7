import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete('admin_token')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('API /admin/logout Error:', error)
    return NextResponse.json({ error: 'Failed to logout' }, { status: 500 })
  }
}
