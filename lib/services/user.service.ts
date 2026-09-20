import { supabase } from '@/lib/supabase'
import { AuditService } from '@/lib/services/audit.service'
import { isStandardProfileField } from '@/lib/utils/profile-sync-utils'
import type { UserProfile } from '@/types/user'
import type { AdminPayload } from '@/types/admin'
import type { UpdateCreatorProfileInput } from '@/lib/validations/user.schema'

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class UserService {
  /**
   * Fetches a creator profile with self-healing primary followers sync.
   */
  static async getUserProfile(userId: string): Promise<UserProfile> {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !user) {
      throw new NotFoundError('User not found')
    }

    // Self-heal followers from primary instagram profile if missing
    if (
      (!user.followers || user.followers === 0) &&
      Array.isArray(user.instagram_profiles) &&
      user.instagram_profiles.length > 0
    ) {
      const primary =
        user.instagram_profiles.find((p: any) => p.is_primary) || user.instagram_profiles[0]
      if (primary && typeof primary.followers === 'number' && primary.followers > 0) {
        user.followers = primary.followers
        user.instagram_followers_count = primary.followers
        supabase
          .from('users')
          .update({ followers: primary.followers, instagram_followers_count: primary.followers })
          .eq('id', user.id)
          .then(() => {})
      }
    }

    return user as UserProfile
  }

  /**
   * Checks if an email is already used by another user.
   */
  static async checkEmailConflict(email: string, excludeUserId: string) {
    const cleanEmail = email.toLowerCase().trim()
    const { data } = await supabase
      .from('users')
      .select('id, influencer_id, full_name')
      .eq('email', cleanEmail)
      .neq('id', excludeUserId)
      .maybeSingle()

    return data
  }

  /**
   * Checks if a mobile number is already used by another user.
   */
  static async checkMobileConflict(mobile: string, excludeUserId: string) {
    const cleanMobile = mobile.replace(/\D/g, '')
    const { data } = await supabase
      .from('users')
      .select('id, influencer_id, full_name')
      .eq('mobile', cleanMobile)
      .neq('id', excludeUserId)
      .maybeSingle()

    return data
  }

  /**
   * Updates creator profile fields with conflict prevention and audit logging.
   */
  static async updateCreatorProfile(
    userId: string,
    body: UpdateCreatorProfileInput,
    admin: AdminPayload
  ): Promise<{ updatedUser: UserProfile; updatedFieldsCount: number }> {
    // 1. Fetch current user
    const { data: currentUser, error: fetchErr } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchErr || !currentUser) {
      throw new NotFoundError('User not found')
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    }

    // 2. Email validation and conflict check
    if (body.email !== undefined) {
      const cleanEmail = body.email.toLowerCase().trim()
      if (cleanEmail !== (currentUser.email || '').toLowerCase()) {
        const conflict = await this.checkEmailConflict(cleanEmail, userId)
        if (conflict) {
          throw new ConflictError(
            `Email address "${cleanEmail}" is already registered to ${conflict.full_name || 'another user'} (${conflict.influencer_id || 'ID: ' + conflict.id}).`
          )
        }
        updateData.email = cleanEmail
      }
    }

    // 3. Mobile validation and conflict check
    if (body.mobile !== undefined) {
      const cleanMobile = body.mobile.replace(/\D/g, '')
      if (cleanMobile !== currentUser.mobile) {
        const conflict = await this.checkMobileConflict(cleanMobile, userId)
        if (conflict) {
          throw new ConflictError(
            `Mobile number "${cleanMobile}" is already registered to ${conflict.full_name || 'another user'} (${conflict.influencer_id || 'ID: ' + conflict.id}).`
          )
        }
        updateData.mobile = cleanMobile
      }
    }

    // 4. Other profile fields
    const directFields: (keyof UpdateCreatorProfileInput)[] = [
      'full_name',
      'gender',
      'dob',
      'category',
      'languages',
      'bio',
      'youtube',
      'followers',
      'tshirt_size',
      'shoe_size',
      'account_name',
      'account_number',
      'pan_card_image',
      'shipping_addresses',
    ]

    for (const key of directFields) {
      if (body[key] !== undefined) {
        updateData[key] = body[key]
      }
    }

    // Normalize uppercase fields
    if (body.ifsc_code !== undefined) {
      updateData.ifsc_code = body.ifsc_code ? body.ifsc_code.toUpperCase().trim() : null
    }
    if (body.pan_card !== undefined) {
      updateData.pan_card = body.pan_card ? body.pan_card.toUpperCase().trim() : null
    }

    // Clean custom attributes
    if (body.custom_attributes !== undefined) {
      const cleanedCustomAttrs: Record<string, any> = {}
      if (body.custom_attributes && typeof body.custom_attributes === 'object') {
        for (const [attrKey, attrVal] of Object.entries(body.custom_attributes)) {
          if (!isStandardProfileField(attrKey)) {
            cleanedCustomAttrs[attrKey] = attrVal
          }
        }
      }
      updateData.custom_attributes = cleanedCustomAttrs
    }

    // 5. Commit update to database
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('*')
      .single()

    if (updateError) {
      throw updateError
    }

    // 6. Background audit logging
    AuditService.logProfileChanges(userId, currentUser, updateData, admin).catch(() => {})

    return {
      updatedUser: updatedUser as UserProfile,
      updatedFieldsCount: Object.keys(updateData).length - 1,
    }
  }
}
