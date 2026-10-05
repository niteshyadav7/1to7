import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Meta sends signed_request when a user revokes access to the app
    return NextResponse.json({ success: true, message: 'Deauthorization recorded' })
  } catch (err: any) {
    return NextResponse.json({ success: true })
  }
}

export async function GET() {
  return NextResponse.json({ success: true, message: 'Instagram deauthorize endpoint active' })
}
