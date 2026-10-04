import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const [issuesResult, feedbackResult] = await Promise.all([
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status IN ('pending', 'in_progress'))::int as unresolved,
          COUNT(*) FILTER (WHERE status = 'pending')::int as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress')::int as in_progress,
          COUNT(*)::int as total
        FROM public.user_issues
      `),
      pool.query(`
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending' OR status IS NULL)::int as unresolved,
          COUNT(*) FILTER (WHERE status = 'pending' OR status IS NULL)::int as pending,
          COUNT(*) FILTER (WHERE status = 'resolved')::int as resolved,
          COUNT(*)::int as total
        FROM public.feedback
      `)
    ])

    const issues = issuesResult.rows[0] || { unresolved: 0, pending: 0, in_progress: 0, total: 0 }
    const feedback = feedbackResult.rows[0] || { unresolved: 0, pending: 0, resolved: 0, total: 0 }

    return NextResponse.json({
      counters: {
        user_issues: {
          unresolved: Number(issues.unresolved || 0),
          pending: Number(issues.pending || 0),
          in_progress: Number(issues.in_progress || 0),
          total: Number(issues.total || 0),
        },
        feedback: {
          unresolved: Number(feedback.unresolved || 0),
          pending: Number(feedback.pending || 0),
          resolved: Number(feedback.resolved || 0),
          total: Number(feedback.total || 0),
        },
      }
    })
  } catch (error) {
    console.error('[GET /api/admin/sidebar-counters] Error:', error)
    return NextResponse.json({ error: 'Failed to retrieve sidebar counters' }, { status: 500 })
  }
}
