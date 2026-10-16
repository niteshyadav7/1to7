import { NextRequest, NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { singleGhostActionSchema } from '@/lib/validations/ghost.schema'
import { GhostService } from '@/lib/services/ghost.service'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      )
    }

    const { id: applicationId } = await params
    const rawBody = await request.json()

    // Validate with zod
    const parsed = singleGhostActionSchema.safeParse(rawBody)
    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || 'Invalid input data'
      return NextResponse.json({ error: firstErr }, { status: 422 })
    }

    const { action, reason_category, comment, proof_urls } = parsed.data

    if (action === 'ghosted') {
      const result = await GhostService.ghostApplications(
        [applicationId],
        { reason_category, comment, proof_urls },
        admin
      )

      if (result.succeeded.length > 0) {
        return NextResponse.json({
          success: true,
          action: 'ghosted',
          message: 'Creator has been marked as ghosted with proof. Future campaign applications are paused.',
        })
      } else {
        const skippedReason = result.skipped[0]?.reason || 'Failed to ghost creator'
        return NextResponse.json({ error: skippedReason }, { status: 400 })
      }
    } else {
      // action === 'unghosted'
      const result = await GhostService.unghostApplication(
        applicationId,
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
    console.error('API /admin/applications/[id]/ghost error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error while processing ghost status' },
      { status: 500 }
    )
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: applicationId } = await params
    const history = await GhostService.getGhostHistory({ applicationId })

    return NextResponse.json({ success: true, history })
  } catch (error: any) {
    console.error('API /admin/applications/[id]/ghost GET error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch ghost history' },
      { status: 500 }
    )
  }
}
