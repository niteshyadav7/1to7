import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { accessToken, mobile } = await request.json()

    const authKey = process.env.MSG91_AUTH_KEY || '581511ADaFwTev8s6ad07726P1'

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token is required' }, { status: 400 })
    }

    // Call MSG91 server-side verification endpoint
    const response = await fetch('https://control.msg91.com/api/v5/widget/verifyAccessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        authkey: authKey,
        'access-token': accessToken,
      }),
    })

    const result = await response.json()

    if (!response.ok || result.type === 'error') {
      console.error('[MSG91 Server Verify] Verification failed:', result)
      return NextResponse.json(
        { error: result.message || 'OTP token verification failed' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully',
      data: result,
    })
  } catch (err: any) {
    console.error('[MSG91 Server Verify] Error:', err)
    return NextResponse.json(
      { error: err?.message || 'Server-side verification failed' },
      { status: 500 }
    )
  }
}
