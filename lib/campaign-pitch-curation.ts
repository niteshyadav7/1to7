/**
 * Server-only: single source of truth for Campaign Curation final decisions.
 *
 * Used by:
 *  - POST /api/brand-admin/campaign-pitches/curation-decision  (row buttons & bulk bar)
 *  - POST /api/brand-admin/campaign-pitches/bulk-import        (CSV / XLSX bulk sheet)
 *
 * Keeping the SQL here guarantees that a decision made via a spreadsheet produces
 * exactly the same database state (and Influencer Admin status sync) as one made
 * via the UI buttons.
 *
 * `db` may be the shared Pool or a checked-out PoolClient (for transactions).
 */

export interface Queryable {
  query: (text: string, params?: any[]) => Promise<{ rowCount: number | null; rows: any[] }>
}

export async function applyFinalApprove(
  db: Queryable,
  ids: string[],
  reviewerName: string,
  notes?: string | null
): Promise<number> {
  if (ids.length === 0) return 0
  const res = await db.query(
    `
    UPDATE public.applications
    SET
      brand_review_status = 'brand_approved',
      status = 'Approved'::application_status,
      brand_reviewed_at = COALESCE(brand_reviewed_at, NOW()),
      brand_reviewed_by = COALESCE(brand_reviewed_by, $1),
      brand_feedback_notes = COALESCE($2, brand_feedback_notes),
      form_data = jsonb_set(
        COALESCE(form_data, '{}'::jsonb),
        '{brand_curation}',
        COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
          'is_finalized', true,
          'final_status', 'Approved',
          'finalized_by', $1::text,
          'finalized_at', NOW(),
          'notes', COALESCE($2::text, '')
        ),
        true
      ),
      updated_at = NOW()
    WHERE id::text = ANY($3::text[])
    RETURNING id;
    `,
    [reviewerName, notes || null, ids]
  )
  return res.rowCount || 0
}

export async function applyFinalReject(
  db: Queryable,
  ids: string[],
  reviewerName: string,
  reason?: string | null,
  notes?: string | null
): Promise<number> {
  if (ids.length === 0) return 0
  const rejectReason = reason?.trim() || 'Not selected in final brand curation'
  const res = await db.query(
    `
    UPDATE public.applications
    SET
      brand_review_status = 'brand_rejected',
      status = 'Rejected'::application_status,
      brand_rejection_reason = $1,
      brand_reviewed_at = NOW(),
      brand_reviewed_by = $2,
      brand_feedback_notes = COALESCE($3, brand_feedback_notes),
      form_data = jsonb_set(
        jsonb_set(
          COALESCE(form_data, '{}'::jsonb),
          '{rejection_reason}',
          to_jsonb($1::text),
          true
        ),
        '{brand_curation}',
        COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
          'is_finalized', true,
          'final_status', 'Rejected',
          'finalized_by', $2::text,
          'finalized_at', NOW(),
          'reason', $1::text,
          'notes', COALESCE($3::text, '')
        ),
        true
      ),
      updated_at = NOW()
    WHERE id::text = ANY($4::text[])
    RETURNING id;
    `,
    [rejectReason, reviewerName, notes || null, ids]
  )
  return res.rowCount || 0
}

export async function applyOnHold(
  db: Queryable,
  ids: string[],
  reviewerName: string,
  reason?: string | null,
  notes?: string | null
): Promise<number> {
  if (ids.length === 0) return 0
  const holdNotes = notes?.trim() || reason?.trim() || 'Placed on Hold / Backup list by Brand Curation'
  const res = await db.query(
    `
    UPDATE public.applications
    SET
      brand_review_status = 'on_hold',
      status = 'Applied'::application_status,
      brand_reviewed_at = NOW(),
      brand_reviewed_by = $1,
      brand_feedback_notes = $2,
      form_data = jsonb_set(
        COALESCE(form_data, '{}'::jsonb),
        '{brand_curation}',
        COALESCE(form_data->'brand_curation', '{}'::jsonb) || jsonb_build_object(
          'is_finalized', false,
          'final_status', 'On Hold',
          'updated_by', $1::text,
          'updated_at', NOW(),
          'notes', $2::text
        ),
        true
      ),
      updated_at = NOW()
    WHERE id::text = ANY($3::text[])
    RETURNING id;
    `,
    [reviewerName, holdNotes, ids]
  )
  return res.rowCount || 0
}

