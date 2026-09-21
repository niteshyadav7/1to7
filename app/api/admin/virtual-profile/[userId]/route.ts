import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'
import { UserService, ConflictError, NotFoundError } from '@/lib/services/user.service'
import { updateCreatorProfileSchema } from '@/lib/validations/user.schema'

// ─── GET: Fetch data for any user (profile, stats, applications, feedback) ───
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'influencers')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { userId } = await params
    const { searchParams } = new URL(request.url)
    const action = searchParams.get('action') || 'profile'

    switch (action) {
      case 'profile': {
        try {
          const user = await UserService.getUserProfile(userId)
          return NextResponse.json({
            user,
            is_super_admin: Boolean(admin.is_super_admin)
          })
        } catch (err) {
          if (err instanceof NotFoundError) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
          }
          throw err
        }
      }

      case 'stats': {
        const [totalRes, approvedRes, pendingRes, completedRes, rejectedRes] = await Promise.all([
          supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Approved'),
          supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userId).in('status', ['Applied', 'Under Process', 'Under Review']),
          supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Completed'),
          supabase.from('applications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'Rejected'),
        ])

        return NextResponse.json({
          stats: {
            total: totalRes.count || 0,
            approved: approvedRes.count || 0,
            pending: pendingRes.count || 0,
            completed: completedRes.count || 0,
            rejected: rejectedRes.count || 0,
          }
        })
      }

      case 'applications': {
        const { data: apps, error } = await supabase
          .from('applications')
          .select(`
            id, status, form_data, partial_payment, final_payment, pending_amount,
            selected_store, created_at, updated_at,
            campaigns (
              id, campaign_code, brand_name, platform, category,
              budget_type, deliverables, order_form, order_form_fields, payment_form_fields
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ applications: apps || [] })
      }

      case 'feedback': {
        const { data: fb, error } = await supabase
          .from('feedback')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ feedback: fb || [] })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }
  } catch (err: any) {
    console.error('Admin Virtual Profile API Error:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}

// ─── PUT: Super Admin power to update any creator's profile data ───
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'influencers')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // STRICT RBAC: Only Super Admins can update creator profiles
    if (!admin.is_super_admin) {
      return NextResponse.json({
        error: 'Access Denied: Only Super Administrators have full permission to edit influencer profiles.'
      }, { status: 403 })
    }

    const { userId } = await params
    const rawBody = await request.json()

    // Validate request schema with Zod
    const parseResult = updateCreatorProfileSchema.safeParse(rawBody)
    if (!parseResult.success) {
      return NextResponse.json({
        error: parseResult.error.issues[0]?.message || 'Invalid profile update request payload'
      }, { status: 400 })
    }

    // Delegate update and conflict checks to UserService
    const { updatedUser } = await UserService.updateCreatorProfile(userId, parseResult.data, admin)

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully (by admin)',
      user: updatedUser
    })
  } catch (err: any) {
    if (err instanceof ConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 })
    }
    if (err instanceof NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 })
    }
    console.error('Admin Virtual Profile PUT Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to update profile' }, { status: 500 })
  }
}
