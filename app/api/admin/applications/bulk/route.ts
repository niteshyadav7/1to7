import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'

export async function POST(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { applicationIds, status } = body

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: 'applicationIds array is required' }, { status: 400 })
    }

    if (!status) {
      return NextResponse.json({ error: 'status is required' }, { status: 400 })
    }

    // In Supabase, we can use the `in` filter to update multiple rows at once
    const { data, error } = await supabase
      .from('applications')
      .update({ status, updated_at: new Date().toISOString() })
      .in('id', applicationIds)
      .select('id, status')

    if (error) {
      console.error('Supabase bulk update error:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      updatedCount: data ? data.length : 0,
      data
    })
  } catch (error) {
    console.error('API /admin/applications/bulk POST Error:', error)
    return NextResponse.json({ error: 'Internal server error', details: String(error) }, { status: 500 })
  }
}
