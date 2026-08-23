import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'

export async function PUT(request: Request) {
  if (!process.env.POSTGRES_URL) {
    console.error('Missing POSTGRES_URL environment variable')
    return NextResponse.json({ error: 'Server configuration error: Database URL not found' }, { status: 500 })
  }

  const client = new Client({
    connectionString: process.env.POSTGRES_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })

  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'campaigns', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to arrange campaigns is denied' }, { status: 403 })
    }

    const body = await request.json()
    let items: Array<{ id: string; display_order: number }> = []

    if (Array.isArray(body.items)) {
      items = body.items
    } else if (Array.isArray(body.orderedIds)) {
      items = body.orderedIds.map((id: string, index: number) => ({
        id,
        display_order: index + 1,
      }))
    } else {
      return NextResponse.json({ error: 'Invalid payload: items or orderedIds array required' }, { status: 400 })
    }

    if (items.length === 0) {
      return NextResponse.json({ success: true, count: 0 })
    }

    await client.connect()
    await client.query('BEGIN')

    // Efficient parameterized bulk update using CASE statement or individual updates in transaction
    for (const item of items) {
      await client.query(
        'UPDATE public.campaigns SET display_order = $1, updated_at = NOW() WHERE id = $2',
        [item.display_order, item.id]
      )
    }

    await client.query('COMMIT')

    return NextResponse.json({ success: true, updatedCount: items.length })
  } catch (error: any) {
    await client.query('ROLLBACK').catch(() => {})
    console.error('API /admin/campaigns/reorder PUT Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to update campaign order' }, { status: 500 })
  } finally {
    await client.end()
  }
}
