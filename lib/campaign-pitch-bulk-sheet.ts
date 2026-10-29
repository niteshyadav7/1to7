/**
 * Shared (client + server safe) specification for the Campaign Curation
 * "Bulk Update Sheet" — a single CSV/XLSX template used to bulk-edit
 * commercial costing AND final curation decisions (Approve / Reject / Hold).
 *
 * Design rules:
 *  - Rows are matched strictly by Application ID (never by name/handle).
 *  - Columns are matched by header *meaning* (normalised aliases), so users can
 *    reorder, rename slightly, or delete columns they don't need.
 *  - A blank editable cell means "keep current value" — nothing is wiped by accident.
 *  - This file must stay free of server-only imports (pg, next/server) because the
 *    browser uses it to build the template and parse uploads.
 */

export type BulkDecisionAction = 'final_approve' | 'final_reject' | 'on_hold'

export type BulkSheetField =
  | 'application_id'
  | 'influencer_id'
  | 'instagram'
  | 'campaign'
  | 'client_commercial'
  | 'internal_cost'
  | 'pitch_type'
  | 'decision'
  | 'reject_reason'
  | 'notes'

/** Exact header labels written into the downloadable template (in order). */
export const BULK_SHEET_HEADERS = {
  application_id: 'Application ID (Do Not Edit)',
  influencer_id: 'Influencer ID',
  creator_name: 'Creator Name',
  instagram: 'Instagram Handle',
  brand: 'Brand',
  campaign: 'Campaign',
  current_status: 'Current Status',
  client_commercial: 'Client Commercial (₹)',
  internal_cost: 'Internal Cost (₹)',
  pitch_type: 'Pitch Type (Commercial / Barter)',
  decision: 'Final Decision (APPROVE / REJECT / HOLD / blank)',
  reject_reason: 'Reject Reason',
  notes: 'Decision Notes',
} as const

export const BULK_SHEET_HEADER_ORDER: string[] = Object.values(BULK_SHEET_HEADERS)

export const BULK_SHEET_MAX_ROWS = 2000

/** Normalise a header to a comparable key: lowercase alphanumerics only. */
export function normalizeHeaderKey(header: string): string {
  return String(header || '')
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

/**
 * Alias table: normalised header prefix -> field.
 * Checked with `startsWith`, longest alias first, so
 * "Client Commercial (₹)" -> "clientcommercial" -> client_commercial.
 */
const HEADER_ALIASES: Array<[string, BulkSheetField]> = [
  ['applicationid', 'application_id'],
  ['appid', 'application_id'],
  ['influencerid', 'influencer_id'],
  ['creatorid', 'influencer_id'],
  ['hyid', 'influencer_id'],
  ['instagramhandle', 'instagram'],
  ['instagramusername', 'instagram'],
  ['instagram', 'instagram'],
  ['instahandle', 'instagram'],
  ['handle', 'instagram'],
  ['campaign', 'campaign'],
  ['clientcommercial', 'client_commercial'],
  ['commercialquote', 'client_commercial'],
  ['clientquote', 'client_commercial'],
  ['brandquote', 'client_commercial'],
  ['commercial', 'client_commercial'],
  ['quote', 'client_commercial'],
  ['internalcost', 'internal_cost'],
  ['creatorcost', 'internal_cost'],
  ['creatorpayout', 'internal_cost'],
  ['payout', 'internal_cost'],
  ['cost', 'internal_cost'],
  ['pitchtype', 'pitch_type'],
  ['finaldecision', 'decision'],
  ['decision', 'decision'],
  ['action', 'decision'],
  ['approvalstatus', 'decision'],
  ['rejectreason', 'reject_reason'],
  ['rejectionreason', 'reject_reason'],
  ['decisionnotes', 'notes'],
  ['notes', 'notes'],
  ['remark', 'notes'],
].sort((a, b) => b[0].length - a[0].length) as Array<[string, BulkSheetField]>

/** Map a raw header label to a known editable field (or null if it's a reference-only column). */
export function resolveBulkSheetField(header: string): BulkSheetField | null {
  const key = normalizeHeaderKey(header)
  if (!key) return null
  for (const [alias, field] of HEADER_ALIASES) {
    if (key.startsWith(alias)) return field
  }
  return null
}

export interface BulkSheetRawRow {
  /** 1-based spreadsheet row number (header = row 1, first data row = row 2). */
  rowNumber: number
  application_id: string
  influencer_id?: string
  instagram?: string
  campaign?: string
  client_commercial: string
  internal_cost: string
  pitch_type: string
  decision: string
  reject_reason: string
  notes: string
}

/**
 * Convert parsed sheet records (array of header->value objects) into normalised raw rows.
 * Returns which editable columns were detected so the UI can tell the user.
 */
export function mapRecordsToBulkRows(records: Array<Record<string, unknown>>): {
  rows: BulkSheetRawRow[]
  detectedFields: BulkSheetField[]
} {
  const detected = new Set<BulkSheetField>()
  const rows: BulkSheetRawRow[] = []

  records.forEach((record, idx) => {
    const row: BulkSheetRawRow = {
      rowNumber: idx + 2,
      application_id: '',
      influencer_id: '',
      instagram: '',
      campaign: '',
      client_commercial: '',
      internal_cost: '',
      pitch_type: '',
      decision: '',
      reject_reason: '',
      notes: '',
    }
    let hasAnyValue = false
    for (const [header, value] of Object.entries(record)) {
      const field = resolveBulkSheetField(header)
      const str = value === null || value === undefined ? '' : String(value).trim()
      if (str) hasAnyValue = true
      if (!field) continue
      detected.add(field)
      // First matching column wins; never overwrite a filled value with a later duplicate column.
      if (!row[field]) row[field] = str
    }
    // Skip fully blank lines (common trailing rows from Excel / Google Sheets)
    if (hasAnyValue) rows.push(row)
  })

  return { rows, detectedFields: Array.from(detected) }
}

/* ───────────────────────── Value parsers ───────────────────────── */

export type ParseResult<T> = { ok: true; value: T | undefined } | { ok: false; error: string }

/**
 * Parse an INR amount. Blank -> undefined (keep current).
 * Accepts "12000", "12,000", "₹ 12,000", "Rs. 12000", "15k", "1.5L", "INR 12000.50".
 */
export function parseMoneyCell(raw: string, label: string): ParseResult<number> {
  const str = String(raw ?? '').trim()
  if (!str) return { ok: true, value: undefined }
  if (['clear', 'none', 'nil', 'na', 'n/a', 'barter', '-'].includes(str.toLowerCase())) {
    return { ok: true, value: 0 }
  }
  const cleaned = str
    .replace(/₹|inr|rs\.?/gi, '')
    .replace(/[,\s]/g, '')
    .toLowerCase()

  let multiplier = 1
  let numericPart = cleaned
  if (cleaned.endsWith('k')) {
    multiplier = 1000
    numericPart = cleaned.slice(0, -1)
  } else if (cleaned.endsWith('l') || cleaned.endsWith('lakh') || cleaned.endsWith('lac')) {
    multiplier = 100000
    numericPart = cleaned.replace(/(lakh|lac|l)$/i, '')
  }

  if (!/^\d+(\.\d{1,4})?$/.test(numericPart)) {
    return { ok: false, error: `${label} "${str}" is not a valid amount (use digits like 12000 or 15k)` }
  }
  const num = Math.round(Number(numericPart) * multiplier * 100) / 100
  if (!Number.isFinite(num) || num < 0) {
    return { ok: false, error: `${label} must be zero or a positive number` }
  }
  if (num > 100_000_000) {
    return { ok: false, error: `${label} ₹${num.toLocaleString('en-IN')} looks too large — please verify` }
  }
  return { ok: true, value: num }
}

/** Parse pitch type. Blank -> undefined (keep). true = Commercial/Paid, false = Barter. */
export function parsePitchTypeCell(raw: string): ParseResult<boolean> {
  const key = normalizeHeaderKey(raw)
  if (!key) return { ok: true, value: undefined }
  if (['commercial', 'paid', 'cash', 'yes', 'true', 'y'].includes(key)) return { ok: true, value: true }
  if (['barter', 'free', 'no', 'false', 'n', 'product'].includes(key)) return { ok: true, value: false }
  return { ok: false, error: `Pitch Type "${raw}" must be Commercial or Barter` }
}

/** Parse final decision. Blank / KEEP -> undefined (no decision change). */
export function parseDecisionCell(raw: string): ParseResult<BulkDecisionAction> {
  const key = normalizeHeaderKey(raw)
  if (!key || ['keep', 'nochange', 'skip', 'na', 'none'].includes(key)) {
    return { ok: true, value: undefined }
  }
  if (['approve', 'approved', 'finalapprove', 'yes', 'y', 'shortlist', 'shortlisted', 'select', 'selected'].includes(key)) {
    return { ok: true, value: 'final_approve' }
  }
  if (['reject', 'rejected', 'finalreject', 'no', 'n', 'notselected'].includes(key)) {
    return { ok: true, value: 'final_reject' }
  }
  if (['hold', 'onhold', 'backup', 'waitlist'].includes(key)) {
    return { ok: true, value: 'on_hold' }
  }
  return { ok: false, error: `Decision "${raw}" must be APPROVE, REJECT, HOLD or blank` }
}

export const DECISION_LABELS: Record<BulkDecisionAction, string> = {
  final_approve: 'Final Approve',
  final_reject: 'Final Reject',
  on_hold: 'On Hold',
}

/* ───────────────────────── Preview contract ───────────────────────── */

export interface BulkRowChange {
  field: 'client_commercial' | 'internal_cost' | 'pitch_type' | 'decision'
  from: string
  to: string
}

export interface BulkRowPreview {
  rowNumber: number
  application_id: string
  creator_name: string | null
  instagram_username: string | null
  brand_name?: string | null
  campaign_name?: string | null
  status: 'update' | 'unchanged' | 'error'
  changes: BulkRowChange[]
  errors: string[]
  warnings: string[]
}

export interface BulkPreviewSummary {
  totalRows: number
  updateRows: number
  unchangedRows: number
  errorRows: number
  costingUpdates: number
  approvals: number
  rejections: number
  holds: number
}

