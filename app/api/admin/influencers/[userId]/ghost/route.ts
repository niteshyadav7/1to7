import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { singleGhostActionSchema } from '@/lib/validations/ghost.schema'
import { GhostService } from '@/lib/services/ghost.service'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      )
    }

    const { userId } = await params
    const rawBody = await request.json()

    // Validate with zod
    const parsed = singleGhostActionSchema.safeParse(rawBody)
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || 'Invalid input data'
      return NextResponse.json({ error: firstErr }, { status: 422 })
    }

    const { action, reason_category, comment, proof_urls } = parsed.data

    if (action === 'ghosted') {
      const result = await GhostService.ghostUser(
        userId,
        { reason_category, comment, proof_urls },
        admin
      )

      return NextResponse.json({
        success: true,
        action: 'ghosted',
        message: result.message,
      })
    } else {
      // action === 'unghosted'
      const result = await GhostService.unghostUser(
        userId,
        { reason_category, comment, proof_urls },
        admin
      )

      return NextResponse.json({
        success: true,
        action: 'unghosted',
        message: result.message,
      })
    }
  } catch (error: any) {
    console.error('API /admin/influencers/[userId]/ghost error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error while processing ghost status' },
      { status: 500 }
    )
  }
}
