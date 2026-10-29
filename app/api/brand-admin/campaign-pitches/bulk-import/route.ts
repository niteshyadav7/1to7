import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'
import {
  BULK_SHEET_MAX_ROWS,
  BulkDecisionAction,
  BulkPreviewSummary,
  BulkRowChange,
  BulkRowPreview,
  BulkSheetRawRow,
  DECISION_LABELS,
  parseDecisionCell,
  parseMoneyCell,
  parsePitchTypeCell,
} from '@/lib/campaign-pitch-bulk-sheet'
import {
  applyFinalApprove,
  applyFinalReject,
  applyOnHold,
} from '@/lib/campaign-pitch-curation'

interface ExistingAppRow {
  id: string
  influencer_id: string
  creator_name: string
  instagram_username: string
  brand_name: string
  campaign_name: string
  campaign_code: string
  brand_review_status: string
  application_status: string
  client_commercial: number | null
  internal_cost: number | null
  is_commercial_pitch: boolean | null
  is_finalized: boolean
  final_status: string | null
}

interface EvaluatedRow {
  preview: BulkRowPreview
  hasCostingUpdate: boolean
  nextClientCommercial: number | null
  nextInternalCost: number | null
  nextIsCommercial: boolean
  decisionAction?: BulkDecisionAction
  rejectReason?: string
  notes?: string
}

function formatInr(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—'
  return `₹${Number(val).toLocaleString('en-IN')}`
}

function formatCurrentStatus(row: ExistingAppRow): string {
  if (row.brand_review_status === 'brand_approved' && row.is_finalized) {
    return 'Final Approved'
  }
  if (row.brand_review_status === 'brand_rejected' && row.is_finalized) {
    return 'Final Rejected'
  }
  switch (row.brand_review_status) {
    case 'brand_approved':
      return 'Brand Shortlisted (Needs Sign-Off)'
    case 'brand_rejected':
      return 'Rejected'
    case 'on_hold':
      return 'On Hold'
    case 'pending_brand_review':
      return 'With Brand'
    case 'queued_for_brand_admin':
      return 'Queued'
    case 'internal_rejected':
      return 'Internal Dropped'
    default:
      return row.brand_review_status || 'Queued'
  }
}

export async function POST(request: Request) {
  try {
    const admin = (await getBrandAdminFromRequest()) || (await getAdminFromRequest())
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Brand Admin or Admin session required' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const mode: 'preview' | 'commit' = body?.mode === 'commit' ? 'commit' : 'preview'
    const rawRows: BulkSheetRawRow[] = Array.isArray(body?.rows) ? body.rows : []
    const scopeApplicationIds: string[] = Array.isArray(body?.scopeApplicationIds)
      ? body.scopeApplicationIds.map((id: unknown) => String(id || '').trim()).filter(Boolean)
      : []

    if (rawRows.length === 0) {
      return NextResponse.json(
        { error: 'No rows found in the uploaded sheet' },
        { status: 400 }
      )
    }

    if (rawRows.length > BULK_SHEET_MAX_ROWS) {
      return NextResponse.json(
        { error: `Sheet has ${rawRows.length} rows; maximum allowed per import is ${BULK_SHEET_MAX_ROWS}` },
        { status: 400 }
      )
    }

    // Collect distinct non-empty application IDs + active filter scope IDs for batch lookup
    const requestedIds = Array.from(
      new Set([
        ...rawRows.map((r) => String(r.application_id || '').trim()).filter(Boolean),
        ...scopeApplicationIds,
      ])
    )

    // Also collect Influencer IDs & Instagram handles for rows missing Application ID
    const fallbackInfluencerIds = Array.from(
      new Set(
        rawRows
          .filter((r) => !String(r.application_id || '').trim() && r.influencer_id)
          .map((r) => String(r.influencer_id || '').trim().toUpperCase())
          .filter(Boolean)
      )
    )
    const fallbackHandles = Array.from(
      new Set(
        rawRows
          .filter((r) => !String(r.application_id || '').trim() && r.instagram)
          .map((r) => String(r.instagram || '').trim().replace(/^@/, '').toLowerCase())
          .filter(Boolean)
      )
    )

    const existingMap = new Map<string, ExistingAppRow>()
    if (requestedIds.length > 0 || fallbackInfluencerIds.length > 0 || fallbackHandles.length > 0) {
      const dbRes = await pool.query(
        `
        SELECT
          a.id::text AS id,
          COALESCE(u.influencer_id, '') AS influencer_id,
          COALESCE(u.full_name, 'Creator') AS creator_name,
          COALESCE(u.instagram_username, '') AS instagram_username,
          COALESCE(NULLIF(TRIM(a.form_data->'brand_curation'->>'client_brand'), ''), NULLIF(TRIM(c.brand_name), ''), 'Unassigned') AS brand_name,
          COALESCE(NULLIF(TRIM(c.requirements), ''), NULLIF(TRIM(c.campaign_code), ''), 'Campaign') AS campaign_name,
          COALESCE(c.campaign_code, '') AS campaign_code,
          COALESCE(a.brand_review_status, 'unpitched') AS brand_review_status,
          COALESCE(a.status::text, 'Applied') AS application_status,
          a.client_commercial,
          a.internal_cost,
          a.is_commercial_pitch,
          COALESCE((a.form_data->'brand_curation'->>'is_finalized')::boolean, false) AS is_finalized,
          a.form_data->'brand_curation'->>'final_status' AS final_status
        FROM public.applications a
        LEFT JOIN public.users u ON u.id = a.user_id
        LEFT JOIN public.campaigns c ON c.id = a.campaign_id
        WHERE
          (CARDINALITY($1::text[]) > 0 AND a.id::text = ANY($1::text[]))
          OR (CARDINALITY($2::text[]) > 0 AND UPPER(COALESCE(u.influencer_id, '')) = ANY($2::text[]))
          OR (CARDINALITY($3::text[]) > 0 AND LOWER(REPLACE(COALESCE(u.instagram_username, ''), '@', '')) = ANY($3::text[]));
        `,
        [requestedIds, fallbackInfluencerIds, fallbackHandles]
      )
      for (const r of dbRes.rows) {
        existingMap.set(String(r.id), {
          id: String(r.id),
          influencer_id: String(r.influencer_id || ''),
          creator_name: r.creator_name,
          instagram_username: r.instagram_username,
          brand_name: r.brand_name,
          campaign_name: r.campaign_name,
          campaign_code: r.campaign_code,
          brand_review_status: r.brand_review_status,
          application_status: r.application_status,
          client_commercial:
            r.client_commercial !== null && r.client_commercial !== undefined
              ? Number(r.client_commercial)
              : null,
          internal_cost:
            r.internal_cost !== null && r.internal_cost !== undefined
              ? Number(r.internal_cost)
              : null,
          is_commercial_pitch:
            r.is_commercial_pitch !== null && r.is_commercial_pitch !== undefined
              ? Boolean(r.is_commercial_pitch)
              : null,
          is_finalized: Boolean(r.is_finalized),
          final_status: r.final_status || null,
        })
      }
    }

    const scopeSet = new Set(scopeApplicationIds)
    const allCandidateRows = Array.from(existingMap.values())

    // Helper to resolve row when Application ID is omitted (matches by Influencer ID or @handle within filtered scope/campaign)
    const resolveFallbackRow = (raw: BulkSheetRawRow): ExistingAppRow | undefined => {
      const infId = String(raw.influencer_id || '').trim().toUpperCase()
      const handle = String(raw.instagram || '').trim().replace(/^@/, '').toLowerCase()
      const campHint = String(raw.campaign || '').trim().toLowerCase()
      if (!infId && !handle) return undefined

      let matches = allCandidateRows.filter((item) => {
        if (infId && item.influencer_id.toUpperCase() === infId) return true
        if (handle && item.instagram_username.replace(/^@/, '').toLowerCase() === handle) return true
        return false
      })
      if (matches.length <= 1) return matches[0]

      // Disambiguate using active filter scope first
      if (scopeSet.size > 0) {
        const scoped = matches.filter((m) => scopeSet.has(m.id))
        if (scoped.length === 1) return scoped[0]
        if (scoped.length > 1) matches = scoped
      }

      // Disambiguate using Campaign column if present
      if (campHint) {
        const byCamp = matches.filter(
          (m) =>
            m.campaign_code.toLowerCase().includes(campHint) ||
            m.campaign_name.toLowerCase().includes(campHint) ||
            campHint.includes(m.campaign_code.toLowerCase())
        )
        if (byCamp.length >= 1) return byCamp[0]
      }
      return matches[0]
    }

    // Track duplicate Application IDs inside the same upload
    const seenIds = new Map<string, number>()
    const evaluated: EvaluatedRow[] = []

    const summary: BulkPreviewSummary = {
      totalRows: rawRows.length,
      updateRows: 0,
      unchangedRows: 0,
      errorRows: 0,
      costingUpdates: 0,
      approvals: 0,
      rejections: 0,
      holds: 0,
    }

    for (const raw of rawRows) {
      const rowNum = Number(raw.rowNumber) || 0
      let appId = String(raw.application_id || '').trim()
      const errors: string[] = []
      const warnings: string[] = []
      const changes: BulkRowChange[] = []

      let current = appId ? existingMap.get(appId) : undefined
      if (!current) {
        const fallback = resolveFallbackRow(raw)
        if (fallback) {
          current = fallback
          appId = fallback.id
        }
      }

      if (!appId) {
        errors.push('Missing Application ID (or Influencer ID / Instagram Handle)')
      } else if (seenIds.has(appId)) {
        errors.push(`Duplicate creator row in sheet (already on row ${seenIds.get(appId)})`)
      } else {
        seenIds.set(appId, rowNum)
      }

      if (appId && !current) {
        errors.push(`Application ID "${appId}" not found in database`)
      }

      const commParsed = parseMoneyCell(raw.client_commercial, 'Client Commercial')
      if (!commParsed.ok) errors.push(commParsed.error)

      const costParsed = parseMoneyCell(raw.internal_cost, 'Internal Cost')
      if (!costParsed.ok) errors.push(costParsed.error)

      const pitchParsed = parsePitchTypeCell(raw.pitch_type)
      if (!pitchParsed.ok) errors.push(pitchParsed.error)

      const decisionParsed = parseDecisionCell(raw.decision)
      if (!decisionParsed.ok) errors.push(decisionParsed.error)

      let hasCostingUpdate = false
      let nextClientCommercial: number | null = current?.client_commercial ?? null
      let nextInternalCost: number | null = current?.internal_cost ?? null
      let nextIsCommercial: boolean = current?.is_commercial_pitch ?? false
      let decisionAction: BulkDecisionAction | undefined = undefined

      if (errors.length === 0 && current) {
        // 1. Client Commercial
        if (commParsed.ok && commParsed.value !== undefined) {
          const curVal = current.client_commercial
          if (curVal === null || Number(curVal) !== commParsed.value) {
            changes.push({
              field: 'client_commercial',
              from: formatInr(curVal),
              to: formatInr(commParsed.value),
            })
            hasCostingUpdate = true
          }
          nextClientCommercial = commParsed.value
        }

        // 2. Internal Cost
        if (costParsed.ok && costParsed.value !== undefined) {
          const curVal = current.internal_cost
          if (curVal === null || Number(curVal) !== costParsed.value) {
            changes.push({
              field: 'internal_cost',
              from: formatInr(curVal),
              to: formatInr(costParsed.value),
            })
            hasCostingUpdate = true
          }
          nextInternalCost = costParsed.value
        }

        // 3. Pitch Type (Commercial vs Barter)
        if (pitchParsed.ok && pitchParsed.value !== undefined) {
          const curType = Boolean(
            current.is_commercial_pitch ||
              (current.client_commercial !== null && current.client_commercial > 0)
          )
          if (curType !== pitchParsed.value) {
            changes.push({
              field: 'pitch_type',
              from: curType ? 'Commercial' : 'Barter',
              to: pitchParsed.value ? 'Commercial' : 'Barter',
            })
            hasCostingUpdate = true
          }
          nextIsCommercial = pitchParsed.value
        } else if (hasCostingUpdate) {
          // Auto-infer Commercial if client_commercial or internal_cost > 0
          nextIsCommercial =
            (nextClientCommercial !== null && nextClientCommercial > 0) ||
            (nextInternalCost !== null && nextInternalCost > 0)
        }

        // Warn when internal cost exceeds client quote
        if (
          nextClientCommercial !== null &&
          nextInternalCost !== null &&
          nextClientCommercial > 0 &&
          nextInternalCost > nextClientCommercial
        ) {
          warnings.push(
            `Internal cost (${formatInr(nextInternalCost)}) is higher than Client Commercial (${formatInr(nextClientCommercial)})`
          )
        }

        // 4. Final Decision
        if (decisionParsed.ok && decisionParsed.value !== undefined) {
          const action = decisionParsed.value
          const alreadySame =
            (action === 'final_approve' &&
              current.brand_review_status === 'brand_approved' &&
              current.is_finalized) ||
            (action === 'final_reject' &&
              current.brand_review_status === 'brand_rejected' &&
              current.is_finalized) ||
            (action === 'on_hold' && current.brand_review_status === 'on_hold')

          if (!alreadySame || raw.reject_reason?.trim() || raw.notes?.trim()) {
            decisionAction = action
            changes.push({
              field: 'decision',
              from: formatCurrentStatus(current),
              to: DECISION_LABELS[action],
            })
          }
        }
      }

      const status: 'update' | 'unchanged' | 'error' =
        errors.length > 0 ? 'error' : changes.length > 0 ? 'update' : 'unchanged'

      if (status === 'error') {
        summary.errorRows += 1
      } else if (status === 'update') {
        summary.updateRows += 1
        if (hasCostingUpdate) summary.costingUpdates += 1
        if (decisionAction === 'final_approve') summary.approvals += 1
        if (decisionAction === 'final_reject') summary.rejections += 1
        if (decisionAction === 'on_hold') summary.holds += 1
      } else {
        summary.unchangedRows += 1
      }

      evaluated.push({
        preview: {
          rowNumber: rowNum,
          application_id: appId,
          creator_name: current?.creator_name ?? null,
          instagram_username: current?.instagram_username ?? null,
          brand_name: current?.brand_name ?? null,
          campaign_name: current?.campaign_name ?? null,
          status,
          changes,
          errors,
          warnings,
        },
        hasCostingUpdate,
        nextClientCommercial,
        nextInternalCost,
        nextIsCommercial,
        decisionAction,
        rejectReason: raw.reject_reason?.trim() || undefined,
        notes: raw.notes?.trim() || undefined,
      })
    }

    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        mode: 'preview',
        summary,
        rows: evaluated.map((e) => e.preview),
      })
    }

    // ───────────────────────── COMMIT MODE ─────────────────────────
    const actionable = evaluated.filter((e) => e.preview.status === 'update')
    if (actionable.length === 0) {
      return NextResponse.json(
        {
          error:
            summary.errorRows > 0
              ? 'Cannot import: fix the validation errors in the sheet and try again'
              : 'No changes detected — all rows match current values',
          summary,
          rows: evaluated.map((e) => e.preview),
        },
        { status: 400 }
      )
    }

    const reviewerName = admin.name || admin.email || 'Brand Operations'
    const client = await pool.connect()

    try {
      await client.query('BEGIN')

      for (const item of actionable) {
        const appId = item.preview.application_id

        if (item.hasCostingUpdate) {
          await client.query(
            `
            UPDATE public.applications
            SET
              client_commercial = $1,
              internal_cost = $2,
              is_commercial_pitch = $3,
              form_data = jsonb_set(
                jsonb_set(
                  COALESCE(form_data, '{}'::jsonb),
                  '{client_commercial}',
                  COALESCE(to_jsonb($1::numeric), 'null'::jsonb)
                ),
                '{internal_cost}',
                COALESCE(to_jsonb($2::numeric), 'null'::jsonb)
              ),
              updated_at = NOW()
            WHERE id::text = $4;
            `,
            [
              item.nextClientCommercial,
              item.nextInternalCost,
              item.nextIsCommercial,
              appId,
            ]
          )
        }

        if (item.decisionAction === 'final_approve') {
          await applyFinalApprove(client, [appId], reviewerName, item.notes || null)
        } else if (item.decisionAction === 'final_reject') {
          await applyFinalReject(
            client,
            [appId],
            reviewerName,
            item.rejectReason || null,
            item.notes || null
          )
        } else if (item.decisionAction === 'on_hold') {
          await applyOnHold(
            client,
            [appId],
            reviewerName,
            item.rejectReason || null,
            item.notes || null
          )
        }
      }

      await client.query('COMMIT')
    } catch (txErr) {
      await client.query('ROLLBACK')
      throw txErr
    } finally {
      client.release()
    }

    const parts: string[] = []
    if (summary.costingUpdates > 0) parts.push(`${summary.costingUpdates} costing quote${summary.costingUpdates > 1 ? 's' : ''}`)
    if (summary.approvals > 0) parts.push(`${summary.approvals} final approved`)
    if (summary.rejections > 0) parts.push(`${summary.rejections} final rejected`)
    if (summary.holds > 0) parts.push(`${summary.holds} placed on hold`)

    return NextResponse.json({
      success: true,
      mode: 'commit',
      summary,
      updatedCount: actionable.length,
      message: `Bulk update applied to ${actionable.length} creator${actionable.length > 1 ? 's' : ''} (${parts.join(', ')})!`,
    })
  } catch (error: any) {
    console.error('Campaign Pitches Bulk Import Error:', error)
    return NextResponse.json(
      { error: error?.message || 'Failed to process bulk sheet import' },
      { status: 500 }
    )
  }
}

