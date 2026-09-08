/**
 * Resolves the true total deal / commercial amount for an application.
 * Checks form_data, application fields, and campaign budget in priority order.
 */
export function getApplicationCommercialAmount(application: any): number {
  if (!application) return 0
  const formData = application.form_data || {}
  
  // 1. Explicit agreed total deal
  if (formData.total_deal !== undefined && Number(formData.total_deal) > 0) {
    return Number(formData.total_deal)
  }
  // 2. Agreed commercial quote
  if (formData.agreed_commercial !== undefined && Number(formData.agreed_commercial) > 0) {
    return Number(formData.agreed_commercial)
  }
  // 3. Form data commercial amount
  if (formData.commercial_amount !== undefined && Number(formData.commercial_amount) > 0) {
    return Number(formData.commercial_amount)
  }
  // 4. Form data commercial
  if (formData.commercial !== undefined && Number(formData.commercial) > 0) {
    return Number(formData.commercial)
  }
  // 5. Direct column on application table
  if (application.commercial_amount !== undefined && Number(application.commercial_amount) > 0) {
    return Number(application.commercial_amount)
  }
  // 6. Direct pending amount on application table
  if (application.pending_amount !== undefined && Number(application.pending_amount) > 0) {
    return Number(application.pending_amount)
  }
  // 7. Sum of partial, final, pending payments
  const sumPayments = (Number(application.partial_payment) || 0) + (Number(application.final_payment) || 0) + (Number(application.pending_amount) || 0)
  if (sumPayments > 0) return sumPayments
  
  // 8. Campaign-level standard commercial
  if (application.campaigns?.budget_amount && Number(application.campaigns.budget_amount) > 0) {
    return Number(application.campaigns.budget_amount)
  }
  if (application.campaigns?.commercial_amount && Number(application.campaigns.commercial_amount) > 0) {
    return Number(application.campaigns.commercial_amount)
  }
  return 0
}

/**
 * Checks if a campaign or application is a paid collaboration (vs. barter/unpaid).
 */
export function isPaidCollaboration(application: any): boolean {
  if (!application) return false
  const commercial = getApplicationCommercialAmount(application)
  if (commercial > 0) return true

  const budgetType = (application.campaigns?.budget_type || application.budget_type || '').toLowerCase()
  if (budgetType === 'barter' || budgetType === 'unpaid') return false
  if (budgetType.includes('paid') || budgetType.includes('commercial')) return true

  return false
}
