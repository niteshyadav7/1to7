import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// In-memory sliding window rate limiter
interface RateLimitEntry {
  count: number
  firstRequest: number
  lastRequest: number
}

const ipLimits = new Map<string, RateLimitEntry>()
const mobileLimits = new Map<string, RateLimitEntry>()

const RATE_LIMIT_WINDOW_MS = 30 * 60 * 1000 // 30 minutes
const MAX_PER_IP = 3 // Max 3 requests per IP per 30 mins
const MAX_PER_MOBILE = 2 // Max 2 requests per mobile number per 30 mins

function isRateLimited(map: Map<string, RateLimitEntry>, key: string, max: number): { limited: boolean; retryAfterMinutes: number } {
  const now = Date.now()
  const entry = map.get(key)

  if (!entry) {
    map.set(key, { count: 1, firstRequest: now, lastRequest: now })
    return { limited: false, retryAfterMinutes: 0 }
  }

  // If window expired, reset
  if (now - entry.firstRequest > RATE_LIMIT_WINDOW_MS) {
    map.set(key, { count: 1, firstRequest: now, lastRequest: now })
    return { limited: false, retryAfterMinutes: 0 }
  }

  // Inside window
  if (entry.count >= max) {
    const remainingMs = RATE_LIMIT_WINDOW_MS - (now - entry.firstRequest)
    const retryAfterMinutes = Math.max(1, Math.ceil(remainingMs / (60 * 1000)))
    return { limited: true, retryAfterMinutes }
  }

  entry.count += 1
  entry.lastRequest = now
  return { limited: false, retryAfterMinutes: 0 }
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, val] of ipLimits.entries()) {
    if (now - val.firstRequest > RATE_LIMIT_WINDOW_MS * 2) {
      ipLimits.delete(key)
    }
  }
  for (const [key, val] of mobileLimits.entries()) {
    if (now - val.firstRequest > RATE_LIMIT_WINDOW_MS * 2) {
      mobileLimits.delete(key)
    }
  }
}, 15 * 60 * 1000)

export async function POST(request: Request) {
  try {
    // 1. Extract IP & User Agent
    const forwarded = request.headers.get('x-forwarded-for')
    const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown-ip'
    const userAgent = request.headers.get('user-agent') || 'unknown-agent'

    // 2. Check IP Rate Limit
    if (ip !== 'unknown-ip') {
      const ipCheck = isRateLimited(ipLimits, ip, MAX_PER_IP)
      if (ipCheck.limited) {
        return NextResponse.json(
          {
            error: `Too many submissions from this device. Please wait ${ipCheck.retryAfterMinutes} minute(s) before submitting another issue report.`
          },
          { status: 429 }
        )
      }
    }

    // 3. Parse FormData
    const formData = await request.formData()
    const name = ((formData.get('name') as string) || '').trim()
    const email = ((formData.get('email') as string) || '').trim().toLowerCase()
    const rawMobile = ((formData.get('mobile') as string) || '').trim()
    const sourcePage = ((formData.get('sourcePage') as string) || 'login').toLowerCase()
    const issueType = ((formData.get('issueType') as string) || 'other').trim()
    const description = ((formData.get('description') as string) || '').trim()
    const screenshot = formData.get('screenshot') as File | null

    // 4. Validate Inputs
    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Please enter your full name (minimum 2 characters).' }, { status: 400 })
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email || !emailRegex.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 })
    }

    const cleanMobile = rawMobile.replace(/\D/g, '').slice(-10)
    if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      return NextResponse.json({ error: 'Please enter a valid 10-digit Indian mobile number.' }, { status: 400 })
    }

    if (!description || description.length < 10) {
      return NextResponse.json({ error: 'Please provide more details about the issue (minimum 10 characters).' }, { status: 400 })
    }

    if (description.length > 2000) {
      return NextResponse.json({ error: 'Description is too long (maximum 2000 characters).' }, { status: 400 })
    }

    // 5. Check Mobile Rate Limit
    const mobileCheck = isRateLimited(mobileLimits, cleanMobile, MAX_PER_MOBILE)
    if (mobileCheck.limited) {
      return NextResponse.json(
        {
          error: `A report was recently submitted for this mobile number. Please wait ${mobileCheck.retryAfterMinutes} minute(s) before submitting another.`
        },
        { status: 429 }
      )
    }

    // 6. Check Database for Spam by Mobile or Email in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString()
    const { count: dbRecentCount, error: countErr } = await supabase
      .from('user_issues')
      .select('*', { count: 'exact', head: true })
      .or(`mobile.eq.${cleanMobile},email.eq.${email}`)
      .gte('created_at', thirtyMinutesAgo)

    if (!countErr && dbRecentCount && dbRecentCount >= MAX_PER_MOBILE) {
      return NextResponse.json(
        {
          error: 'You have recently submitted an issue report. Our team is already reviewing it. Please wait 30 minutes before creating a new report.'
        },
        { status: 429 }
      )
    }

    // 7. Handle Screenshot Upload (if provided)
    let screenshotUrl: string | null = null
    let screenshotName: string | null = null

    if (screenshot && screenshot.size > 0) {
      // Validate file size: max 5MB (5 * 1024 * 1024)
      const MAX_SIZE = 5 * 1024 * 1024
      if (screenshot.size > MAX_SIZE) {
        return NextResponse.json(
          { error: 'Screenshot file size exceeds the 5MB limit. Please upload a smaller image.' },
          { status: 400 }
        )
      }

      // Validate MIME type
      const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowedMimes.includes(screenshot.type)) {
        return NextResponse.json(
          { error: 'Invalid file format. Only JPG, PNG, and WebP images are allowed.' },
          { status: 400 }
        )
      }

      const ext = screenshot.name.split('.').pop()?.toLowerCase() || 'png'
      const randomStr = Math.random().toString(36).substring(2, 9)
      const filePath = `issue-reports/${Date.now()}_${cleanMobile}_${randomStr}.${ext}`

      const arrayBuffer = await screenshot.arrayBuffer()
      const buffer = new Uint8Array(arrayBuffer)

      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('order-uploads')
        .upload(filePath, buffer, {
          contentType: screenshot.type,
          upsert: false,
        })

      if (uploadErr) {
        console.error('[POST /api/support/report-issue] Storage upload error:', uploadErr)
        // Fallback: Proceed without failing the entire ticket, or return error if critical
      } else if (uploadData) {
        const { data: publicUrlData } = supabase.storage
          .from('order-uploads')
          .getPublicUrl(uploadData.path)

        screenshotUrl = publicUrlData.publicUrl
        screenshotName = screenshot.name
      }
    }

    // 8. Generate Ticket ID: e.g. ISS-94821
    const ticketId = `ISS-${Math.floor(100000 + Math.random() * 900000)}`

    // 9. Insert into user_issues table
    const { data: insertedIssue, error: insertErr } = await supabase
      .from('user_issues')
      .insert([
        {
          ticket_id: ticketId,
          name,
          email,
          mobile: cleanMobile,
          source_page: sourcePage === 'signup' ? 'signup' : 'login',
          issue_type: issueType,
          description,
          screenshot_url: screenshotUrl,
          screenshot_name: screenshotName,
          status: 'pending',
          ip_address: ip,
          user_agent: userAgent,
        }
      ])
      .select('id, ticket_id, created_at')
      .single()

    if (insertErr) {
      console.error('[POST /api/support/report-issue] Supabase insert error:', insertErr)
      return NextResponse.json(
        { error: 'Failed to record your issue. Please try again or contact support.' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      ticketId,
      message: 'Your issue has been reported successfully. Our technical support team has been notified.',
      createdAt: insertedIssue.created_at,
    })
  } catch (err: any) {
    console.error('[POST /api/support/report-issue] Exception:', err)
    return NextResponse.json(
      { error: err.message || 'An unexpected error occurred while submitting your issue.' },
      { status: 500 }
    )
  }
}
