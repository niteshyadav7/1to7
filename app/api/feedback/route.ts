import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { decrypt } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { rating, category, message, fullName, email, mobile, influencerId } = body

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Please provide a valid rating (1-5 stars).' }, { status: 400 })
    }

    if (!category || !category.trim()) {
      return NextResponse.json({ error: 'Please select a feedback category.' }, { status: 400 })
    }

    if (!message || message.trim().length < 5) {
      return NextResponse.json({ error: 'Please provide feedback of at least 5 characters.' }, { status: 400 })
    }

    // Attempt user authentication token if available
    let userId: string | null = null
    let userFullName = fullName || ''
    let userEmail = email || ''
    let userMobile = mobile || ''
    let userInfluencerId = influencerId || ''

    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (token) {
      const payload = await decrypt(token)
      if (payload && payload.id) {
        userId = payload.id as string

        // Fetch user info if missing
        if (!userFullName || !userInfluencerId) {
          const { data: user } = await supabase
            .from('users')
            .select('full_name, email, mobile, influencer_id')
            .eq('id', userId)
            .single()

          if (user) {
            userFullName = userFullName || user.full_name
            userEmail = userEmail || user.email
            userMobile = userMobile || user.mobile
            userInfluencerId = userInfluencerId || user.influencer_id
          }
        }
      }
    }

    // Insert into feedback table
    const { data, error } = await supabase
      .from('feedback')
      .insert([
        {
          user_id: userId,
          influencer_id: userInfluencerId || null,
          full_name: userFullName || 'Anonymous Creator',
          email: userEmail || null,
          mobile: userMobile || null,
          rating: Number(rating),
          category: category.trim(),
          message: message.trim(),
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('[POST /api/feedback] Supabase insert error:', error)
      return NextResponse.json({ error: 'Failed to submit feedback. Please try again.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
      feedback: data
    })
  } catch (err) {
    console.error('[POST /api/feedback] Internal Server Error:', err)
    return NextResponse.json({ error: 'An unexpected error occurred.' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ feedback: [] })
    }

    const payload = await decrypt(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ feedback: [] })
    }

    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', payload.id as string)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[GET /api/feedback] Supabase error:', error)
      return NextResponse.json({ feedback: [] })
    }

    return NextResponse.json({ feedback: data || [] })
  } catch (err) {
    console.error('[GET /api/feedback] Error:', err)
    return NextResponse.json({ feedback: [] })
  }
}
