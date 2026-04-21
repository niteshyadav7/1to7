import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { sendApplicationSubmittedEmail } from '@/lib/mailer'
import { generateSequentialInfluencerId } from '@/lib/user-utils'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { campaignId, formData, mobile, verifiedUserId, guestProfile } = body

    if (!campaignId) {
      return NextResponse.json(
        { error: 'Campaign ID is required' },
        { status: 400 }
      )
    }

    // Verify user is logged in
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    let userId = ''

    if (token) {
      const payload = await verifyToken(token)
      if (!payload || !payload.id) {
        return NextResponse.json(
          { error: 'Invalid session. Please log in again.' },
          { status: 401 }
        )
      }
      userId = payload.id

      // Verify the user actually still exists in DB (handle stale cookies from deleted accounts)
      const { data: dbUser } = await supabase.from('users').select('id').eq('id', userId).single()
      if (!dbUser) {
        return NextResponse.json(
          { error: 'Your account appears to have been deleted. Please clear your cookies/return to home page.' },
          { status: 401 }
        )
      }
    } else if (verifiedUserId) {
      // Existing user who passed the email challenge
      userId = verifiedUserId
      
      // Auto-login the verified user
      const { data: existingUser } = await supabase
        .from('users')
        .select('id, mobile, influencer_id')
        .eq('id', verifiedUserId)
        .single()
      
      if (existingUser) {
        const { encrypt } = await import('@/lib/auth')
        const newToken = await encrypt({ id: existingUser.id, mobile: existingUser.mobile, influencer_id: existingUser.influencer_id })
        cookieStore.set('auth_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30
        })
      } else {
        return NextResponse.json({ error: 'Session mismatch: User was deleted or not found. Please refresh and try again.' }, { status: 400 })
      }
    } else if (mobile) {
      // Guest Checkout Logic — New user with profile data
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('mobile', mobile)
        .single()
        
      if (existingUser) {
        userId = existingUser.id
      } else {
        // Generate a sequential, unique influencer ID checking against the DB
        const newInfluencerId = await generateSequentialInfluencerId()
        
        const { data: newUser, error: insertError } = await supabase
          .from('users')
          .insert([{
             full_name: guestProfile?.full_name || 'Guest Creator',
             mobile: mobile,
             email: guestProfile?.email || `${mobile}@guest.1to7.com`,
             password_hash: '$2b$10$vysFdPLELlPEvtXf1B5kneSq1OV0iEtxOUlf4LpwKfGXmenL1jUpm',
             influencer_id: newInfluencerId,
             is_mobile_verified: false,
             is_email_verified: false,
             instagram_username: guestProfile?.instagram_username || null,
             followers: guestProfile?.followers ? parseInt(guestProfile.followers, 10) : 0,
             gender: guestProfile?.gender || null,
             state: guestProfile?.state || null,
             city: guestProfile?.city || null
          }])
          .select('id, influencer_id, mobile')
          .single()

        if (insertError) {
          console.error('CRITICAL GUEST INSERT ERROR:', insertError)
          throw new Error(`DB Error: ${insertError.message} (Code: ${insertError.code})`)
        }
        
        userId = newUser.id
        
        // Auto-login newly created user
        const { encrypt } = await import('@/lib/auth')
        const newToken = await encrypt({ id: newUser.id, mobile: newUser.mobile, influencer_id: newUser.influencer_id })
        cookieStore.set('auth_token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 60 * 24 * 30
        })
      }
    } else {
      return NextResponse.json(
        { error: 'You must be logged in or provide a mobile number to apply' },
        { status: 401 }
      )
    }

    // Check campaign exists and is active
    const { data: campaign } = await supabase
      .from('campaigns')
      .select('id, status, is_live, brand_name, campaign_code')
      .eq('id', campaignId)
      .single()

    if (!campaign || campaign.status !== 'Active' || !campaign.is_live) {
      return NextResponse.json(
        { error: 'This campaign is no longer accepting applications' },
        { status: 400 }
      )
    }

    // Check if user already applied
    const { data: existing } = await supabase
      .from('applications')
      .select('id, status')
      .eq('user_id', userId)
      .eq('campaign_id', campaignId)
      .single()

    if (existing) {
      if (existing.status === 'Rejected') {
        // If rejected, allow re-application by updating the existing record
        const { error: updateError } = await supabase
          .from('applications')
          .update({
            form_data: formData || {},
            status: 'Applied',
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id)

        if (updateError) throw updateError

        // Send confirmation email for re-application
        const { data: user } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', userId)
          .single()

        if (user?.email) {
          Promise.resolve(
            sendApplicationSubmittedEmail(
              user.email,
              user.full_name || 'Creator',
              campaign.brand_name,
              campaign.campaign_code
            )
          ).catch((e) => console.error('Background Email Error (Re-apply):', e))
        }
        
        return NextResponse.json({
          success: true,
          applicationId: existing.id,
          message: 'Application re-submitted successfully!'
        })
      }

      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 409 }
      )
    }



    // Insert application
    const { data: application, error } = await supabase
      .from('applications')
      .insert({
        user_id: userId,
        campaign_id: campaignId,
        form_data: formData || {},
        status: 'Applied'
      })
      .select('id')
      .single()

    if (error) throw error

    // Send confirmation email (fire-and-forget)
    const { data: user } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', userId)
      .single()

    // Send confirmation email asynchronously without blocking the response
    if (user?.email) {
      Promise.resolve(
        sendApplicationSubmittedEmail(
          user.email,
          user.full_name || 'Creator',
          campaign.brand_name,
          campaign.campaign_code
        )
      ).catch((e) => console.error('Background Email Error:', e))
    }

    return NextResponse.json({
      success: true,
      applicationId: application.id,
      message: 'Application submitted successfully!'
    })
  } catch (err: any) {
    console.error('API /apply CRITICAL ERROR:', err)
    
    // Handle unique constraint violation
    if (err.code === '23505') {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: err.message || 'Failed to submit application', details: err.toString() },
      { status: 500 }
    )
  }
}

