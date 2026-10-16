export interface CampaignTimelineConfig {
  id?: string
  brand_name?: string
  campaign_code?: string
  completion_days?: number | null
  completion_deadline?: string | null
  enforce_completion_deadline?: boolean | null
}

export interface ApplicationTimelineData {
  id: string
  campaign_id: string
  status: string
  form_data?: any
  created_at: string
  updated_at?: string
  completion_deadline?: string | null
  is_delay_exempted?: boolean | null
  delay_exemption_reason?: string | null
  completion_submitted_at?: string | null
  is_ghosted?: boolean | null
  ghosted_at?: string | null
  campaigns?: CampaignTimelineConfig | null
}

export interface ApplicationTimelineStatus {
  applicationId: string
  campaignId: string
  brandName: string
  campaignCode: string
  status: string
  isCompleted: boolean
  isGhosted: boolean
  deadline: string
  deadlineDate: Date
  isOverdue: boolean
  daysOverdue: number
  daysRemaining: number
  isDelayExempted: boolean
  delayExemptionReason: string | null
  isEnforced: boolean
  isBlocking: boolean
}

export interface CreatorCompletionEligibility {
  isEligible: boolean
  isGhostBlocked?: boolean
  ghostedCount?: number
  overdueCount: number
  blockingCount: number
  ghostedApplications?: ApplicationTimelineStatus[]
  blockedApplications: ApplicationTimelineStatus[]
  overdueApplications: ApplicationTimelineStatus[]
  message: string
}

/**
 * Standard delay exemption reasons provided to Admin
 */
export const DEFAULT_DELAY_EXEMPTION_REASONS = [
  'Brand parcel/shipment delayed',
  'Brand requested content revision',
  'Shoot/visit rescheduled by brand',
  'Brand asked to hold posting',
  'Sample issue / replacement in transit',
  'Creator medical/personal emergency',
  'Custom admin waiver',
] as const

/**
 * Calculate the effective completion deadline for an approved application
 */
export function calculateApplicationDeadline(
  application: {
    completion_deadline?: string | null
    created_at: string
    updated_at?: string
  },
  campaign?: CampaignTimelineConfig | null
): Date {
  // 1. Explicit application-level custom deadline set by Admin
  if (application.completion_deadline) {
    const d = new Date(application.completion_deadline)
    if (!isNaN(d.getTime())) return d
  }

  // 2. Fixed campaign deadline
  if (campaign?.completion_deadline) {
    const d = new Date(campaign.completion_deadline)
    if (!isNaN(d.getTime())) return d
  }

  // 3. Rolling window (e.g. 7 days) from approval / created date
  const baseDate = application.updated_at ? new Date(application.updated_at) : new Date(application.created_at)
  const validBase = isNaN(baseDate.getTime()) ? new Date() : baseDate
  const days = typeof campaign?.completion_days === 'number' && campaign.completion_days > 0 
    ? campaign.completion_days 
    : 7

  const calculated = new Date(validBase.getTime() + days * 24 * 60 * 60 * 1000)
  return calculated
}

/**
 * Evaluate if a completion form has been submitted for this application
 */
export function isApplicationCompletionSubmitted(application: ApplicationTimelineData): boolean {
  if (application.completion_submitted_at) return true

  // Completed / Submitted application statuses
  const submittedStatuses = ['Payment Requested', 'Payment Initiated', 'Payment Approved', 'Completed', 'Paid']
  if (submittedStatuses.includes(application.status)) return true

  // Check if payment_request / live_date has been filled in form_data
  if (application.form_data?.payment_request) return true
  if (application.form_data?.live_date && application.form_data?.supporting_document) return true

  return false
}

/**
 * Get detailed timeline & overdue status for an individual application
 */
export function getApplicationTimelineStatus(
  application: ApplicationTimelineData,
  campaignOverride?: CampaignTimelineConfig | null
): ApplicationTimelineStatus {
  const campaign = campaignOverride || application.campaigns || {}
  const deadlineDate = calculateApplicationDeadline(application, campaign)
  const now = new Date()
  const isCompleted = isApplicationCompletionSubmitted(application)

  const diffMs = now.getTime() - deadlineDate.getTime()
  const isOverdue = !isCompleted && diffMs > 0
  const daysOverdue = isOverdue ? Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24))) : 0
  const daysRemaining = !isOverdue ? Math.max(0, Math.ceil(-diffMs / (1000 * 60 * 60 * 24))) : 0

  const isDelayExempted = Boolean(application.is_delay_exempted)
  const delayExemptionReason = application.delay_exemption_reason || null
  const isEnforced = campaign.enforce_completion_deadline !== false
  const isGhosted = Boolean(application.is_ghosted)

  // Ghosted ALWAYS blocks new campaigns (cannot be bypassed by delay exemption).
  // Overdue blocks if NOT exempted and campaign enforcement is ON.
  const isBlocking = isGhosted || (isOverdue && !isDelayExempted && isEnforced)

  return {
    applicationId: application.id,
    campaignId: application.campaign_id || campaign.id || '',
    brandName: campaign.brand_name || 'Campaign',
    campaignCode: campaign.campaign_code || '',
    status: application.status,
    isCompleted,
    isGhosted,
    deadline: deadlineDate.toISOString(),
    deadlineDate,
    isOverdue,
    daysOverdue,
    daysRemaining,
    isDelayExempted,
    delayExemptionReason,
    isEnforced,
    isBlocking,
  }
}

/**
 * Check if creator is eligible to apply for new campaigns
 * Scans all creator applications for ghosted status and unexempted overdue submissions
 */
export function checkCreatorCompletionEligibility(
  userApplications: ApplicationTimelineData[]
): CreatorCompletionEligibility {
  const allApps = userApplications || []
  
  // 1. First, check for ANY ghosted application across all statuses
  const ghostedApps = allApps
    .filter(app => Boolean(app.is_ghosted))
    .map(app => getApplicationTimelineStatus(app))

  if (ghostedApps.length > 0) {
    const firstGhosted = ghostedApps[0]
    return {
      isEligible: false,
      isGhostBlocked: true,
      ghostedCount: ghostedApps.length,
      overdueCount: 0,
      blockingCount: ghostedApps.length,
      ghostedApplications: ghostedApps,
      blockedApplications: ghostedApps,
      overdueApplications: [],
      message: `Your collaboration for ${firstGhosted.brandName} (${firstGhosted.campaignCode}) needs urgent attention. Please complete your pending completion form in Approved Campaigns or contact your assigned Point of Contact to continue applying.`,
    }
  }

  // 2. Only evaluate active approved applications for overdue completion
  const activeApprovedStatuses = ['Approved', 'Order Placed']
  
  const relevantApps = allApps.filter(app => 
    activeApprovedStatuses.includes(app.status)
  )

  const evaluated = relevantApps.map(app => getApplicationTimelineStatus(app))
  const overdueApplications = evaluated.filter(item => item.isOverdue)
  const blockedApplications = evaluated.filter(item => item.isBlocking)

  const isEligible = blockedApplications.length === 0

  let message = ''
  if (!isEligible) {
    const firstBlocked = blockedApplications[0]
    const dateStr = firstBlocked.deadlineDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
    })
    message = `You have an overdue deliverable submission for ${firstBlocked.brandName} (${firstBlocked.campaignCode}) that was due on ${dateStr}. Please submit your completion proof in Approved Campaigns to apply for new campaigns.`
  }

  return {
    isEligible,
    isGhostBlocked: false,
    ghostedCount: 0,
    overdueCount: overdueApplications.length,
    blockingCount: blockedApplications.length,
    ghostedApplications: [],
    blockedApplications,
    overdueApplications,
    message,
  }
}

export interface LiveDateMaturationStatus {
  canSubmit: boolean
  daysElapsed: number
  minDaysRequired: number
  daysRemaining: number
  unlockDate: Date | null
  message: string
}

/**
 * Checks if the content live date satisfies the maturation gap (default 0 days).
 */
export function checkLiveDateMaturation(
  liveDateStr?: string | null,
  minDaysRequired: number = 0
): LiveDateMaturationStatus {
  if (!liveDateStr) {
    return {
      canSubmit: false,
      daysElapsed: 0,
      minDaysRequired,
      daysRemaining: minDaysRequired,
      unlockDate: null,
      message: 'Please select the date when your content went live.',
    }
  }

  const liveDate = new Date(liveDateStr)
  if (isNaN(liveDate.getTime())) {
    return {
      canSubmit: false,
      daysElapsed: 0,
      minDaysRequired,
      daysRemaining: minDaysRequired,
      unlockDate: null,
      message: 'Invalid live date format.',
    }
  }

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const live = new Date(liveDate.getFullYear(), liveDate.getMonth(), liveDate.getDate()).getTime()

  if (live > today) {
    return {
      canSubmit: false,
      daysElapsed: 0,
      minDaysRequired,
      daysRemaining: minDaysRequired,
      unlockDate: new Date(live + minDaysRequired * 24 * 60 * 60 * 1000),
      message: 'Live date cannot be in the future.',
    }
  }

  const diffMs = today - live
  const daysElapsed = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, minDaysRequired - daysElapsed)
  const unlockDate = new Date(live + minDaysRequired * 24 * 60 * 60 * 1000)

  if (daysElapsed < minDaysRequired) {
    const formattedUnlock = unlockDate.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
    return {
      canSubmit: false,
      daysElapsed,
      minDaysRequired,
      daysRemaining,
      unlockDate,
      message: `Mandatory ${minDaysRequired}-day analytics maturation period required. Submission unlocks in ${daysRemaining} day${daysRemaining > 1 ? 's' : ''} on ${formattedUnlock}.`,
    }
  }

  return {
    canSubmit: true,
    daysElapsed,
    minDaysRequired,
    daysRemaining: 0,
    unlockDate,
    message: minDaysRequired > 0
      ? `Maturation complete (${daysElapsed} days since live date). You can now submit your deliverables.`
      : 'Content live date recorded. You can now submit your deliverables.',
  }
}

/**
 * Resolves the required live date maturation days for a campaign.
 * Default is 0 days so creators can immediately submit deliverables
 * as soon as content goes live without mandatory waiting period.
 */
export function getRequiredMaturationDays(
  campaign?: { completion_days?: number | null } | null
): number {
  return 0
}

