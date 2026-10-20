import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'applications')) {
      return NextResponse.json(
        { error: 'Unauthorized: Access to ghosted management is restricted' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const tab = searchParams.get('tab') || 'all' // 'active' | 'logs' | 'all'
    const search = searchParams.get('search')?.trim() || ''
    const actionFilter = searchParams.get('action')?.trim() || 'all' // 'all' | 'ghosted' | 'unghosted'
    const campaignId = searchParams.get('campaign_id')?.trim() || ''

    // 1. Compute Platform Summary Metrics
    const [activeCountRes, eventsCountRes] = await Promise.all([
      pool.query(`SELECT COUNT(*)::int as count FROM public.applications WHERE is_ghosted = true`),
      pool.query(`
        SELECT 
          COUNT(*)::int as total_events,
          COUNT(*) FILTER (WHERE action = 'ghosted')::int as ghosted_count,
          COUNT(*) FILTER (WHERE action = 'unghosted')::int as unghosted_count
        FROM public.application_ghost_events
      `),
    ])

    const activeGhostedCount = activeCountRes.rows[0]?.count || 0
    const totalGhostEvents = eventsCountRes.rows[0]?.ghosted_count || 0
    const totalUnghostedEvents = eventsCountRes.rows[0]?.unghosted_count || 0
    const totalEvents = eventsCountRes.rows[0]?.total_events || 0
    const recoveryRate = totalGhostEvents > 0 
      ? Math.round((totalUnghostedEvents / totalGhostEvents) * 100) 
      : 0

    const responseData: any = {
      summary: {
        activeGhostedCount,
        totalGhostEvents,
        totalUnghostedEvents,
        totalEvents,
        recoveryRate,
      },
    }

    // 2. Fetch Active Ghosted Creators (if tab is 'active' or 'all')
    if (tab === 'active' || tab === 'all') {
      const activeConditions: string[] = ['a.is_ghosted = true']
      const activeValues: any[] = []

      if (search) {
        activeValues.push(`%${search}%`)
        const idx = activeValues.length
        activeConditions.push(`(
          u.full_name ILIKE $${idx} OR
          u.influencer_id ILIKE $${idx} OR
          u.mobile ILIKE $${idx} OR
          u.email ILIKE $${idx} OR
          u.instagram_username ILIKE $${idx} OR
          c.brand_name ILIKE $${idx} OR
          c.campaign_code ILIKE $${idx}
        )`)
      }

      if (campaignId) {
        activeValues.push(campaignId)
        activeConditions.push(`a.campaign_id = $${activeValues.length}`)
      }

      const activeQuery = `
        SELECT 
          a.id as application_id,
          a.user_id,
          a.campaign_id,
          a.status as application_status,
          a.is_ghosted,
          a.ghosted_at,
          a.created_at as applied_at,
          a.form_data,
          u.full_name,
          u.influencer_id,
          u.email,
          u.mobile,
          u.instagram_username,
          u.followers,
          u.profile_photo,
          u.instagram_profile_pic,
          u.gender,
          u.state,
          u.city,
          c.brand_name,
          c.campaign_code,
          c.platform,
          c.manager_phone,
          ge.reason_category as latest_reason,
          ge.comment as latest_comment,
          ge.proof_urls as latest_proof_urls,
          ge.actor_name as latest_actor_name,
          ge.actor_role as latest_actor_role,
          ge.created_at as latest_event_at
        FROM public.applications a
        JOIN public.users u ON a.user_id = u.id
        JOIN public.campaigns c ON a.campaign_id = c.id
        LEFT JOIN LATERAL (
          SELECT reason_category, comment, proof_urls, actor_name, actor_role, created_at
          FROM public.application_ghost_events
          WHERE application_id = a.id AND action = 'ghosted'
          ORDER BY created_at DESC
          LIMIT 1
        ) ge ON true
        WHERE ${activeConditions.join(' AND ')}
        ORDER BY a.ghosted_at DESC NULLS LAST, a.created_at DESC
      `

      const activeRes = await pool.query(activeQuery, activeValues)
      responseData.activeGhosted = activeRes.rows
    }

    // 3. Fetch Full Ghost Logs & Audit Trail (if tab is 'logs' or 'all')
    if (tab === 'logs' || tab === 'all') {
      const logConditions: string[] = []
      const logValues: any[] = []

      if (actionFilter && actionFilter !== 'all') {
        logValues.push(actionFilter)
        logConditions.push(`e.action = $${logValues.length}`)
      }

      if (search) {
        logValues.push(`%${search}%`)
        const idx = logValues.length
        logConditions.push(`(
          u.full_name ILIKE $${idx} OR
          u.influencer_id ILIKE $${idx} OR
          u.mobile ILIKE $${idx} OR
          u.instagram_username ILIKE $${idx} OR
          c.brand_name ILIKE $${idx} OR
          c.campaign_code ILIKE $${idx} OR
          e.reason_category ILIKE $${idx} OR
          e.actor_name ILIKE $${idx} OR
          e.comment ILIKE $${idx}
        )`)
      }

      if (campaignId) {
        logValues.push(campaignId)
        logConditions.push(`e.campaign_id = $${logValues.length}`)
      }

      const whereClause = logConditions.length > 0 ? `WHERE ${logConditions.join(' AND ')}` : ''

      const logsQuery = `
        SELECT 
          e.id as event_id,
          e.application_id,
          e.user_id,
          e.campaign_id,
          e.action,
          e.reason_category,
          e.comment,
          e.proof_urls,
          e.batch_id,
          e.actor_admin_id,
          e.actor_name,
          e.actor_role,
          e.created_at,
          u.full_name as creator_name,
          u.influencer_id,
          u.instagram_username,
          u.mobile as creator_mobile,
          u.email as creator_email,
          u.profile_photo as creator_photo,
          c.brand_name,
          c.campaign_code
        FROM public.application_ghost_events e
        LEFT JOIN public.users u ON e.user_id = u.id
        LEFT JOIN public.campaigns c ON e.campaign_id = c.id
        ${whereClause}
        ORDER BY e.created_at DESC
        LIMIT 200
      `

      const logsRes = await pool.query(logsQuery, logValues)
      responseData.logs = logsRes.rows
    }

    return NextResponse.json({
      success: true,
      ...responseData,
    })
  } catch (error: any) {
    console.error('API /admin/ghosted error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ghosted data' },
      { status: 500 }
    )
  }
}
