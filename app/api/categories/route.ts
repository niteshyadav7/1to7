import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'

const DEFAULT_NICHES = [
  'Fashion & Style',
  'Beauty & Skincare',
  'Fitness & Health',
  'Food & Cooking',
  'Travel & Adventure',
  'Tech & Gadgets',
  'Gaming',
  'Photography',
  'Art & Design',
  'Music & Dance',
  'Comedy & Entertainment',
  'Education & Learning',
  'Finance & Business',
  'Lifestyle & Vlogging',
  'Parenting & Family',
  'Pets & Animals',
  'Sports & Fitness',
  'Automotive & Cars',
  'Home & Interior',
  'Motivational & Self-Help',
]

const DEFAULT_LANGUAGES = [
  'Hindi',
  'English',
  'Punjabi',
  'Bengali',
  'Marathi',
  'Telugu',
  'Tamil',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Bhojpuri',
  'Odia',
  'Assamese',
  'Urdu',
  'Haryanvi',
  'Rajasthani / Marwari',
  'Kashmiri',
  'Konkani',
  'Sindhi',
  'Maithili',
  'Sanskrit',
  'French',
  'Spanish',
  'Arabic',
  'German',
]

// GET /api/categories - Returns active niches and languages
export async function GET() {
  try {
    const { data: rows, error } = await supabase
      .from('platform_categories')
      .select('name, type, is_active')
      .eq('is_active', true)
      .order('name', { ascending: true })

    if (error || !rows || rows.length === 0) {
      return NextResponse.json({
        niches: DEFAULT_NICHES,
        languages: DEFAULT_LANGUAGES,
      })
    }

    const niches = rows.filter((r) => r.type === 'niche').map((r) => r.name)
    const languages = rows.filter((r) => r.type === 'language').map((r) => r.name)

    return NextResponse.json({
      niches: niches.length > 0 ? niches : DEFAULT_NICHES,
      languages: languages.length > 0 ? languages : DEFAULT_LANGUAGES,
    })
  } catch (err) {
    console.error('API /api/categories GET Error:', err)
    return NextResponse.json({
      niches: DEFAULT_NICHES,
      languages: DEFAULT_LANGUAGES,
    })
  }
}

// POST /api/categories - Suggest a new niche or language (Creator Suggestion)
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    let userId: string | null = null
    let userName: string | null = null
    let userEmail: string | null = null

    if (token) {
      const payload = await verifyToken(token)
      if (payload && payload.id) {
        userId = payload.id
        const { data: u } = await supabase
          .from('users')
          .select('full_name, email')
          .eq('id', userId)
          .single()
        userName = u?.full_name || null
        userEmail = u?.email || null
      }
    }

    const body = await request.json()
    const { name, type } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const normalizedType = type === 'language' ? 'language' : 'niche'
    const trimmedName = String(name).trim()

    // Check if it already exists in platform_categories
    const { data: existing } = await supabase
      .from('platform_categories')
      .select('id, name')
      .ilike('name', trimmedName)
      .eq('type', normalizedType)
      .single()

    if (existing) {
      return NextResponse.json({
        message: `"${trimmedName}" is already an active ${normalizedType === 'niche' ? 'niche' : 'language'}.`,
        alreadyActive: true,
      })
    }

    // Insert into category_suggestions
    const { data: suggestion, error } = await supabase
      .from('category_suggestions')
      .insert([
        {
          user_id: userId,
          user_name: userName || 'Anonymous Creator',
          user_email: userEmail || null,
          name: trimmedName,
          type: normalizedType,
          status: 'Pending',
        },
      ])
      .select()
      .single()

    if (error) {
      console.error('Error inserting suggestion:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: `Suggestion for "${trimmedName}" submitted for Admin review!`,
      suggestion,
    })
  } catch (err: any) {
    console.error('API /api/categories POST Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to submit suggestion' },
      { status: 500 }
    )
  }
}
