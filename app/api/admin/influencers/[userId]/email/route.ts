import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest } from '@/lib/admin-auth'
import { UserService } from '@/lib/services/user.service'
import { AuditService } from '@/lib/services/audit.service'
import { isPlaceholderEmail } from '@/lib/user-utils'

export const dynamic = 'force-dynamic'

const updateEmailSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address format')
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    // 1. Strict RBAC: Super Admin only
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Admin authentication required' },
        { status: 401 }
      )
    }

    if (!admin.is_super_admin) {
      return NextResponse.json(
        { error: 'Forbidden: Only Super Administrators have permission to update creator email addresses.' },
        { status: 403 }
      )
    }

    const { userId } = await params
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId parameter' }, { status: 400 })
    }

    // 2. Validate input payload
    const rawBody = await request.json().catch(() => ({}))
    const parsed = updateEmailSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid email format' },
        { status: 400 }
      )
    }

    const cleanEmail = parsed.data.email.toLowerCase()

    // 3. Block placeholder system emails
    if (isPlaceholderEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'Cannot set a system placeholder email (e.g. @1to7.com) as the creator email.' },
        { status: 400 }
      )
    }

    // 4. Check if targeted creator exists
    const { data: currentUser, error: fetchErr } = await supabase
      .from('users')
      .select('id, influencer_id, full_name, email, is_email_verified')
      .eq('id', userId)
      .maybeSingle()

    if (fetchErr || !currentUser) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 })
    }

    // 5. Check if email is already set to this address
    if ((currentUser.email || '').trim().toLowerCase() === cleanEmail) {
      return NextResponse.json({
        success: true,
        message: 'Creator email is already set to this address.',
        user: currentUser
      })
    }

    // 6. Case-insensitive conflict check against other accounts
    const conflict = await UserService.checkEmailConflict(cleanEmail, userId)
    if (conflict) {
      return NextResponse.json(
        {
          error: `Email "${cleanEmail}" is already registered to ${conflict.full_name || 'another creator'} (#${conflict.influencer_id || conflict.id}).`
        },
        { status: 409 }
      )
    }

    // 7. Atomic update on users table (marks as verified automatically on manual Super Admin update)
    const updatePayload = {
      email: cleanEmail,
      is_email_verified: true,
      updated_at: new Date().toISOString()
    }

    const { data: updatedUser, error: updateErr } = await supabase
      .from('users')
      .update(updatePayload)
      .eq('id', userId)
      .select('id, influencer_id, full_name, email, is_email_verified, mobile, instagram_username')
      .single()

    if (updateErr) {
      console.error('[Admin Update Email] Database update error:', updateErr)
      return NextResponse.json(
        { error: updateErr.message || 'Failed to update email in database' },
        { status: 500 }
      )
    }

    // 8. Background Audit Trail Logging
    AuditService.logProfileChanges(
      userId,
      { email: currentUser.email, is_email_verified: currentUser.is_email_verified },
      updatePayload,
      admin
    ).catch((err) => {
      console.error('[Admin Update Email] Audit log failed:', err)
    })

    return NextResponse.json({
      success: true,
      message: 'Creator email updated successfully',
      user: updatedUser
    })
  } catch (error: any) {
    console.error('API /admin/influencers/[userId]/email error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Fallback PUT to support both PATCH and PUT
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  return PATCH(request, context)
}

