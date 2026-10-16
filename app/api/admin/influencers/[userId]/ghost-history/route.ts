import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { GhostService } from '@/lib/services/ghost.service'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await params
    const [history, summary] = await Promise.all([
      GhostService.getGhostHistory({ userId }),
      GhostService.getUserGhostSummary(userId),
    ])

    return NextResponse.json({
      success: true,
      summary,
      history,
    })
  } catch (error: any) {
    console.error('API /admin/influencers/[userId]/ghost-history error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch influencer ghost history' },
      { status: 500 }
    )
  }
}
