import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const statusFilter = searchParams.get('status') // Optional: 'Applied', 'Approved', etc.

    let query = supabase
      .from('applications')
      .select(`
        id,
        status,
        form_data,
        partial_payment,
        final_payment,
        pending_amount,
        manager_phone,
        created_at,
        updated_at,
        campaigns (
          id,
          campaign_code,
          brand_name,
          category,
          platform,
          budget_type,
          budget_amount,
          deliverables,
          requirements,
          looking_for,
          additional_info,
          collab_date,
          product_links,
          brief_document_url,
          location,
          location_type,
          target_states,
          target_cities,
          store_locations,
          completion_days,
          completion_deadline,
          enforce_completion_deadline,
          gender_required,
          followers,
          min_followers,
          order_form,
          order_form_fields,
          payment_form_fields,
          form_fields,
          poc_admin_ids,
          manager_phone
        )
      `)
      .eq('user_id', payload.id)
      .order('created_at', { ascending: false })

    if (statusFilter) {
      query = query.eq('status', statusFilter)
    }

    const { data: applications, error } = await query

    if (error) throw error

    // Collect all unique POC admin IDs across all returned campaigns
    const pocIds = new Set<string>()
    for (const app of (applications || [])) {
      const c = app.campaigns as any
      if (Array.isArray(c?.poc_admin_ids)) {
        for (const pid of c.poc_admin_ids) {
          if (pid) pocIds.add(pid)
        }
      }
    }

    // Batch fetch POC admins from pool
    const pocMap = new Map<string, { name: string; email: string; phone: string | null; avatar_url: string | null }>()
    if (pocIds.size > 0) {
      try {
        const pool = (await import('@/lib/db')).default
        const idList = Array.from(pocIds)
        const pocRes = await pool.query(
          `SELECT id, name, email, phone, avatar_url FROM public.admins WHERE id = ANY($1::uuid[])`,
          [idList]
        )
        for (const row of pocRes.rows) {
          pocMap.set(row.id, row)
        }
      } catch (pocErr) {
        console.warn('Non-fatal error resolving POCs for applications:', pocErr)
      }
    }

    // Enrich applications with resolved manager details
    const enrichedApplications = (applications || []).map((app: any) => {
      const c = app.campaigns || {}
      const primaryPocId = Array.isArray(c.poc_admin_ids) && c.poc_admin_ids.length > 0 ? c.poc_admin_ids[0] : null
      const pocData = primaryPocId ? pocMap.get(primaryPocId) : null

      const resolvedPhone = app.manager_phone || c.manager_phone || pocData?.phone || null
      const resolvedName = pocData?.name || 'Campaign Manager'
      const resolvedEmail = pocData?.email || null
      const resolvedAvatar = pocData?.avatar_url || null

      return {
        ...app,
        manager_phone: resolvedPhone,
        manager: {
          name: resolvedName,
          phone: resolvedPhone,
          email: resolvedEmail,
          avatarUrl: resolvedAvatar,
        },
      }
    })

    return NextResponse.json({ applications: enrichedApplications })
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Failed to fetch applications' },
      { status: 500 }
    )
  }
}
