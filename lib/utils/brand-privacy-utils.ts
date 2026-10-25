import type { BrandCreatorItem } from '@/types/brand'

/**
 * Strips sensitive creator PII (phone number, email, home address, bank details)
 * before returning data to the brand portal.
 */
export function sanitizeCreatorForBrand(raw: any): BrandCreatorItem {
  const formData = raw.form_data || {}
  const orderDetails = formData.order_details || {}

  // Extract non-sensitive sample choices
  const sampleVariant = 
    formData.sample_variant || 
    orderDetails.size || 
    orderDetails.shade || 
    orderDetails.variant || 
    formData.variant_choice || 
    null

  // Clean custom form answers, stripping any internal agency fields
  const safeCustomData: Record<string, any> = {}
  Object.keys(formData).forEach((k) => {
    const lower = k.toLowerCase()
    if (
      !lower.includes('phone') &&
      !lower.includes('mobile') &&
      !lower.includes('address') &&
      !lower.includes('pincode') &&
      !lower.includes('bank') &&
      !lower.includes('ifsc') &&
      !lower.includes('payout') &&
      !lower.includes('cost') &&
      !lower.includes('pan') &&
      !lower.includes('commercial') &&
      !lower.includes('payment') &&
      !lower.includes('deal') &&
      !lower.includes('fee') &&
      !lower.includes('rate') &&
      !lower.includes('margin') &&
      !lower.includes('sent_to_brand')
    ) {
      safeCustomData[k] = formData[k]
    }
  })

  return {
    application_id: raw.application_id || raw.id,
    campaign_id: raw.campaign_id,
    campaign_code: raw.campaign_code || '',
    campaign_title: raw.campaign_title || raw.brand_name || 'Campaign',
    user_id: raw.user_id,
    creator_name: raw.creator_name || raw.full_name || 'Creator',
    influencer_id: raw.influencer_id || '',
    instagram_username: (raw.instagram_username || '').replace(/^@/, '').trim(),
    followers: Number(raw.followers) || 0,
    profile_photo: raw.profile_photo || null,
    instagram_profile_pic: raw.instagram_profile_pic || null,
    city: raw.city || null,
    state: raw.state || null,
    gender: raw.gender || null,
    brand_review_status: raw.brand_review_status || 'pending_brand_review',
    brand_reviewed_at: raw.brand_reviewed_at || null,
    brand_rejection_reason: raw.brand_rejection_reason || null,
    brand_feedback_notes: raw.brand_feedback_notes || null,
    selected_variant: sampleVariant ? String(sampleVariant) : null,
    custom_form_data: safeCustomData,
    applied_at: raw.applied_at || raw.created_at || new Date().toISOString(),
    brand_pitch_batch_name: raw.brand_pitch_batch_name || null,
    brand_pitch_notes: raw.brand_pitch_notes || null,
    courier_status: raw.courier_status || null,
    awb_tracking_number: raw.awb_tracking_number || null,
    live_content_url: raw.live_content_url || null,
    brand_content_status: raw.brand_content_status || 'pending',
  }
}

/**
 * Format follower count into compact human-readable string (e.g. 125K, 1.2M)
 */
export function formatFollowerCount(count: number): string {
  if (!count || isNaN(count)) return '0'
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return count.toLocaleString('en-IN')
}
