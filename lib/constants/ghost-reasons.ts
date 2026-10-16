/**
 * Predefined reasons and status constants for Creator Ghosting & Accountability
 */

export const GHOST_REASONS = [
  'Unresponsive on WhatsApp & phone calls for multiple days',
  'Product delivered / Parcel received but content not posted',
  'Creator blocked / restricted communication with brand POC',
  'Posted content and deleted / archived before agreement period',
  'Missed deliverable deadline with zero communication',
  'Other (Specified in comments with proof)',
] as const

export type GhostReason = typeof GHOST_REASONS[number]

export const UNGHOST_REASONS = [
  'Creator established contact and submitted pending deliverables',
  'Valid medical or personal emergency verified with POC',
  'Deliverable delay was due to brand revision / logistics delay',
  'Wrongly marked ghosted (administrative correction)',
  'Other mutually agreed resolution (documented with proof)',
] as const

export type UnghostReason = typeof UNGHOST_REASONS[number]

/**
 * Statuses where an application is considered active / approved and can be ghosted
 * (Applications that have already completed deliverables and been paid are typically not ghostable)
 */
export const GHOSTABLE_STATUSES = [
  'Approved',
  'Order Placed',
  'Order Details Pending',
  'In Progress',
  'Submit Link',
  'Under Review',
] as const
