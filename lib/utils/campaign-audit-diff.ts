export interface CampaignEditChange {
  field: string
  label: string
  old_value: any
  new_value: any
  old_display: string
  new_display: string
  category: 'commercial' | 'deliverable' | 'targeting' | 'requirements' | 'form' | 'general'
}

export interface CampaignEditLogEntry {
  id: string
  timestamp: string
  edited_by_admin_id: string
  edited_by_admin_name: string
  edited_by_admin_email: string
  summary: string
  changes_count: number
  changes: CampaignEditChange[]
}

export const CAMPAIGN_FIELD_METADATA: Record<string, { label: string; category: CampaignEditChange['category'] }> = {
  campaign_code: { label: 'Campaign ID / Code', category: 'general' },
  brand_name: { label: 'Brand Name', category: 'general' },
  category: { label: 'Category', category: 'general' },
  platform: { label: 'Platform', category: 'general' },
  budget_type: { label: 'Budget Type', category: 'commercial' },
  budget_amount: { label: 'Budget Payout (₹)', category: 'commercial' },
  partial_payment_enabled: { label: 'Advance Payout Allowed', category: 'commercial' },
  partial_payment_config: { label: 'Advance Payout Config', category: 'commercial' },
  deliverables: { label: 'Deliverables', category: 'deliverable' },
  product_links: { label: 'Product Links', category: 'deliverable' },
  brief_document_url: { label: 'Brand Brief Document', category: 'deliverable' },
  requirements: { label: 'Requirements / Guidelines', category: 'requirements' },
  looking_for: { label: 'Looking For / Creator Niche', category: 'requirements' },
  gender_required: { label: 'Gender Requirement', category: 'targeting' },
  location: { label: 'Location Scope', category: 'targeting' },
  location_type: { label: 'Location Targeting Mode', category: 'targeting' },
  target_states: { label: 'Target States', category: 'targeting' },
  target_cities: { label: 'Target Cities', category: 'targeting' },
  store_locations: { label: 'Store Branches / Outlets', category: 'targeting' },
  enforce_location: { label: 'Strict Location Enforcement', category: 'targeting' },
  min_followers: { label: 'Minimum Followers', category: 'targeting' },
  followers: { label: 'Followers Label', category: 'targeting' },
  enforce_followers: { label: 'Strict Followers Enforcement', category: 'targeting' },
  collab_date: { label: 'Collaboration Date', category: 'general' },
  completion_days: { label: 'Completion Duration (Days)', category: 'deliverable' },
  completion_deadline: { label: 'Completion Deadline', category: 'deliverable' },
  enforce_completion_deadline: { label: 'Strict Deadline Enforcement', category: 'deliverable' },
  form_link: { label: 'External Form Link', category: 'form' },
  form_fields: { label: 'Custom Application Questions', category: 'form' },
  order_form: { label: 'Order Form Enabled', category: 'form' },
  order_form_fields: { label: 'Order Form Fields', category: 'form' },
  show_order_form: { label: 'Show Order Form', category: 'form' },
  payment_form_fields: { label: 'Payment Form Fields', category: 'form' },
  additional_info: { label: 'Additional Information', category: 'general' },
  display_order: { label: 'Display Order Priority', category: 'general' },
  is_test_mode: { label: 'Campaign Mode', category: 'targeting' },
  test_user_ids: { label: 'Pilot Tester IDs', category: 'targeting' },
  test_creators: { label: 'Pilot Test Creators', category: 'targeting' },
}

/**
 * Converts any field value into a human-readable display string
 */
export function formatValueForDisplay(field: string, val: any): string {
  if (val === null || val === undefined || val === '') {
    return 'None / Not Set'
  }

  if (field === 'is_test_mode') {
    return Boolean(val) ? 'Pre-Launch Pilot Mode (Private)' : 'Public Live (All Creators)'
  }

  if (field === 'budget_amount') {
    const num = Number(val)
    return isNaN(num) ? String(val) : `₹${num.toLocaleString('en-IN')}`
  }

  if (field === 'min_followers') {
    const num = Number(val)
    if (isNaN(num) || num <= 0) return 'Any (0+ followers)'
    return `${num.toLocaleString('en-IN')} (${num >= 1000 ? `${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K` : num})`
  }

  if (field === 'enforce_followers' || field === 'enforce_location' || field === 'enforce_completion_deadline' || field === 'partial_payment_enabled' || field === 'order_form' || field === 'show_order_form') {
    return Boolean(val) ? 'Enabled (Strict)' : 'Disabled (Flexible)'
  }

  if (Array.isArray(val)) {
    if (val.length === 0) return 'None'
    if (field === 'test_creators') {
      return `${val.length} Creators: ${val.map((c: any) => typeof c === 'object' ? (c.name || c.full_name || c.email || 'Creator') : String(c)).slice(0, 3).join(', ')}${val.length > 3 ? ` +${val.length - 3} more` : ''}`
    }
    if (field === 'test_user_ids') {
      return `${val.length} Tester Account${val.length === 1 ? '' : 's'}`
    }
    if (field === 'store_locations') {
      return `${val.length} Outlets: ${val.map((s: any) => typeof s === 'string' ? s : `${s.name || 'Store'} (${s.city || ''})`).slice(0, 3).join(', ')}${val.length > 3 ? ` +${val.length - 3} more` : ''}`
    }
    if (field === 'form_fields' || field === 'order_form_fields') {
      return `${val.length} Questions: ${val.map((f: any) => f.name || f.label || 'Field').slice(0, 3).join(', ')}${val.length > 3 ? ` +${val.length - 3} more` : ''}`
    }
    return val.map((item: any) => typeof item === 'object' ? (item.name || item.title || JSON.stringify(item)) : String(item)).join(', ')
  }

  if (typeof val === 'object') {
    return JSON.stringify(val)
  }

  if (typeof val === 'boolean') {
    return val ? 'Yes' : 'No'
  }

  const str = String(val).trim()
  return str.length > 100 ? `${str.slice(0, 100)}...` : str
}

/**
 * Checks equality between old and new values safely
 */
function areValuesEqual(field: string, oldVal: any, newVal: any): boolean {
  // Normalize empty / undefined / null
  const isEmptyOld = oldVal === undefined || oldVal === null || oldVal === '' || (Array.isArray(oldVal) && oldVal.length === 0)
  const isEmptyNew = newVal === undefined || newVal === null || newVal === '' || (Array.isArray(newVal) && newVal.length === 0)

  if (isEmptyOld && isEmptyNew) return true
  if (isEmptyOld !== isEmptyNew) return false

  // Number comparison
  if (field === 'budget_amount' || field === 'min_followers' || field === 'completion_days' || field === 'display_order') {
    return Number(oldVal || 0) === Number(newVal || 0)
  }

  // Boolean comparison
  if (typeof oldVal === 'boolean' || typeof newVal === 'boolean') {
    return Boolean(oldVal) === Boolean(newVal)
  }

  // Array comparison
  if (Array.isArray(oldVal) || Array.isArray(newVal)) {
    const arrOld = Array.isArray(oldVal) ? oldVal : []
    const arrNew = Array.isArray(newVal) ? newVal : []
    return JSON.stringify(arrOld) === JSON.stringify(arrNew)
  }

  // Object / JSON comparison
  if (typeof oldVal === 'object' || typeof newVal === 'object') {
    return JSON.stringify(oldVal || {}) === JSON.stringify(newVal || {})
  }

  // String comparison
  return String(oldVal).trim() === String(newVal).trim()
}

/**
 * Computes the diff between existing campaign and incoming updates
 */
export function computeCampaignDiff(
  oldCampaign: Record<string, any>,
  incomingUpdates: Record<string, any>,
  admin: { id: string; name?: string; full_name?: string; email?: string }
): CampaignEditLogEntry | null {
  const changes: CampaignEditChange[] = []

  for (const field of Object.keys(incomingUpdates)) {
    // Ignore internal / governance columns
    if ([
      'id', 'created_at', 'updated_at', 'last_edited_at', 'last_edited_by_admin_id',
      'last_edited_by_admin_name', 'last_edited_by_admin_email', 'approved_at',
      'approved_by_admin_id', 'approved_by_admin_name', 'approved_by_admin_email',
      'approval_status', 'status', 'is_live', 'edit_history', 'rejection_reason'
    ].includes(field)) {
      continue
    }

    const oldVal = oldCampaign[field]
    const newVal = incomingUpdates[field]

    if (!areValuesEqual(field, oldVal, newVal)) {
      const meta = CAMPAIGN_FIELD_METADATA[field] || { label: field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()), category: 'general' }

      changes.push({
        field,
        label: meta.label,
        category: meta.category,
        old_value: oldVal ?? null,
        new_value: newVal ?? null,
        old_display: formatValueForDisplay(field, oldVal),
        new_display: formatValueForDisplay(field, newVal),
      })
    }
  }

  if (changes.length === 0) {
    return null
  }

  const adminName = admin.full_name || admin.name || 'Admin'
  const adminEmail = admin.email || ''

  // Generate friendly summary
  const fieldLabels = changes.map(c => c.label)
  const summary = fieldLabels.length <= 2
    ? `Modified ${fieldLabels.join(' & ')}`
    : `Modified ${fieldLabels.slice(0, 2).join(', ')} +${fieldLabels.length - 2} other fields`

  return {
    id: `chg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    edited_by_admin_id: admin.id,
    edited_by_admin_name: adminName,
    edited_by_admin_email: adminEmail,
    summary,
    changes_count: changes.length,
    changes,
  }
}
