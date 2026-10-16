import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { bulkGhostActionSchema } from '@/lib/validations/ghost.schema'
import { GhostService } from '@/lib/services/ghost.service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      )
    }

    const rawBody = await request.json()
    const parsed = bulkGhostActionSchema.safeParse(rawBody)

    if (!parsed.success) {
      const firstErr = parsed.error.issues[0]?.message || 'Invalid bulk ghost input'
      return NextResponse.json({ error: firstErr }, { status: 422 })
    }

    const { application_ids, reason_category, comment, proof_urls } = parsed.data
    const batchId = crypto.randomUUID()

    const result = await GhostService.ghostApplications(
      application_ids,
      { reason_category, comment, proof_urls },
      admin,
      batchId
    )

    return NextResponse.json({
      success: true,
      batchId,
      succeededCount: result.succeeded.length,
      skippedCount: result.skipped.length,
      succeeded: result.succeeded,
      skipped: result.skipped,
      message: `Successfully marked ${result.succeeded.length} creator(s) as ghosted.${
        result.skipped.length > 0 ? ` (${result.skipped.length} skipped)` : ''
      }`,
    })
  } catch (error: any) {
    console.error('API /admin/applications/ghost/bulk error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error while processing bulk ghosting' },
      { status: 500 }
    )
  }
}
