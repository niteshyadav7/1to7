import { NextResponse } from 'next/server'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'
import { Client } from 'pg'

// GET /api/admin/categories - Fetch all categories, languages, and suggestions
export async function GET() {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ error: 'Database configuration missing' }, { status: 500 })
    }

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    // 1. Fetch all platform categories
    const catRes = await client.query(`
      SELECT id, name, type, is_active, created_by, created_at, updated_at
      FROM public.platform_categories
      ORDER BY type ASC, name ASC;
    `)

    // 2. Fetch all creator suggestions
    const suggRes = await client.query(`
      SELECT id, user_id, user_name, user_email, name, type, status, admin_notes, created_at, updated_at
      FROM public.category_suggestions
      ORDER BY created_at DESC;
    `)

    await client.end()

    const niches = catRes.rows.filter((r) => r.type === 'niche')
    const languages = catRes.rows.filter((r) => r.type === 'language')
    const suggestions = suggRes.rows

    return NextResponse.json({
      niches,
      languages,
      suggestions,
    })
  } catch (error) {
    console.error('API /admin/categories GET Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/admin/categories - Add a new Category/Niche/Language OR Approve a suggestion
export async function POST(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, type, suggestionId } = body

    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const normalizedType = type === 'language' ? 'language' : 'niche'
    const trimmedName = String(name).trim()

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    try {
      // 1. Insert into platform_categories
      const insertRes = await client.query(
        `
        INSERT INTO public.platform_categories (name, type, is_active, created_by)
        VALUES ($1, $2, true, $3)
        ON CONFLICT (lower(TRIM(name)), type) DO UPDATE
        SET is_active = true, updated_at = NOW()
        RETURNING id, name, type, is_active;
        `,
        [trimmedName, normalizedType, currentAdmin.email || currentAdmin.name || 'admin']
      )

      // 2. If this came from a suggestion, mark suggestion as Approved
      if (suggestionId) {
        await client.query(
          `
          UPDATE public.category_suggestions
          SET status = 'Approved', updated_at = NOW()
          WHERE id = $1;
          `,
          [suggestionId]
        )
      }

      await client.end()

      return NextResponse.json({
        success: true,
        message: `Successfully added "${trimmedName}" to ${normalizedType === 'niche' ? 'Niches' : 'Languages'}.`,
        category: insertRes.rows[0],
      })
    } catch (err: any) {
      await client.end()
      if (err.code === '23505') {
        return NextResponse.json(
          { error: `"${trimmedName}" is already present in ${normalizedType === 'niche' ? 'Niches' : 'Languages'}.` },
          { status: 409 }
        )
      }
      throw err
    }
  } catch (error) {
    console.error('API /admin/categories POST Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// PUT /api/admin/categories - Toggle active status or rename
export async function PUT(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, is_active, suggestionId, status } = body

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    // Handle suggestion status update (e.g. Reject)
    if (suggestionId && status) {
      await client.query(
        `
        UPDATE public.category_suggestions
        SET status = $1, updated_at = NOW()
        WHERE id = $2;
        `,
        [status, suggestionId]
      )
      await client.end()
      return NextResponse.json({ success: true, message: `Suggestion marked as ${status}` })
    }

    if (!id) {
      await client.end()
      return NextResponse.json({ error: 'Category ID is required' }, { status: 400 })
    }

    const updates: string[] = []
    const values: any[] = []
    let idx = 1

    if (name !== undefined) {
      updates.push(`name = $${idx++}`)
      values.push(String(name).trim())
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${idx++}`)
      values.push(Boolean(is_active))
    }

    updates.push(`updated_at = NOW()`)
    values.push(id)

    const updateQuery = `
      UPDATE public.platform_categories
      SET ${updates.join(', ')}
      WHERE id = $${idx}
      RETURNING id, name, type, is_active;
    `

    const res = await client.query(updateQuery, values)
    await client.end()

    return NextResponse.json({
      success: true,
      message: 'Category updated successfully',
      category: res.rows[0],
    })
  } catch (error) {
    console.error('API /admin/categories PUT Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/admin/categories - Delete a Category or Suggestion
export async function DELETE(request: Request) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const suggestionId = searchParams.get('suggestionId')

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    if (suggestionId) {
      await client.query('DELETE FROM public.category_suggestions WHERE id = $1', [suggestionId])
      await client.end()
      return NextResponse.json({ success: true, message: 'Suggestion removed' })
    }

    if (!id) {
      await client.end()
      return NextResponse.json({ error: 'ID is required' }, { status: 400 })
    }

    await client.query('DELETE FROM public.platform_categories WHERE id = $1', [id])
    await client.end()

    return NextResponse.json({ success: true, message: 'Category removed successfully' })
  } catch (error) {
    console.error('API /admin/categories DELETE Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
