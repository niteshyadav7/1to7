import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'campaigns') || !hasActionPermission(admin, 'campaigns', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to launch campaigns is denied' }, { status: 403 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Campaign ID is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({}))
    const { clear_test_data = true } = body

    // Fetch campaign
    const { data: campaign, error: fetchErr } = await supabase
      .from('campaigns')
      .select('id, brand_name, campaign_code, is_test_mode')
      .eq('id', id)
      .single()

    if (fetchErr || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const adminName = admin.full_name || admin.name || 'Admin'
    const adminEmail = admin.email || ''

    // If requested, clean up test applications before public launch
    let deletedCount = 0
    if (clear_test_data) {
      const { data: deletedApps, error: deleteErr } = await supabase
        .from('applications')
        .delete()
        .eq('campaign_id', id)
        .select('id')

      if (deleteErr) {
        console.error('Error clearing test applications:', deleteErr)
      } else if (deletedApps) {
        deletedCount = deletedApps.length
      }
    }

    // Transition campaign to Public Live
    const { error: updateErr } = await supabase
      .from('campaigns')
      .update({
        is_test_mode: false,
        test_user_ids: [],
        test_creators: [],
        is_live: true,
        status: 'Active',
        approval_status: 'Approved',
        approved_by_admin_id: admin.id,
        approved_by_admin_name: adminName,
        approved_by_admin_email: adminEmail,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateErr) {
      console.error('Error updating campaign to public:', updateErr)
      throw updateErr
    }

    return NextResponse.json({
      success: true,
      message: `"${campaign.brand_name}" is now LIVE for all public creators!${
        clear_test_data ? ` (${deletedCount} pilot application(s) reset)` : ''
      }`,
      deletedTestApplications: deletedCount,
    })
  } catch (error: any) {
    console.error('API /admin/campaigns/[id]/launch Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to launch campaign to public' },
      { status: 500 }
    )
  }
}
