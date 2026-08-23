import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess, hasActionPermission } from '@/lib/admin-auth'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'campaigns')) {
      return NextResponse.json({ error: 'Unauthorized: Access to campaigns is restricted' }, { status: 403 })
    }

    const { id } = await params

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    return NextResponse.json({ campaign })
  } catch (error) {
    console.error('API /admin/campaigns/[id] GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'campaigns', 'edit')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to edit campaigns is denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    // Only allow updating specific fields
    const allowedFields = [
      'brand_name', 'category', 'platform', 'budget_type',
      'budget_amount', 'partial_payment_enabled', 'partial_payment_config',
      'deliverables', 'product_links', 'requirements',
      'gender_required', 'is_live', 'status',
      'location', 'location_type', 'target_states', 'target_cities', 'store_locations', 'enforce_location',
      'looking_for', 'followers', 'min_followers', 'enforce_followers', 'additional_info',
      'collab_date', 'form_link', 'form_fields',
      'order_form', 'order_form_fields', 'show_order_form', 'payment_form_fields',
      'completion_days', 'completion_deadline', 'enforce_completion_deadline',
      'display_order', 'brief_document_url'
    ]

    const updates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }
    updates.updated_at = new Date().toISOString()

    const { data: campaign, error } = await supabase
      .from('campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ success: true, campaign })
  } catch (error) {
    console.error('API /admin/campaigns/[id] PUT Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasActionPermission(admin, 'campaigns', 'delete')) {
      return NextResponse.json({ error: 'Unauthorized: Permission to delete campaigns is denied' }, { status: 403 })
    }

    const { id } = await params

    // 1. Delete associated applications first to handle FK constraint
    await supabase.from('applications').delete().eq('campaign_id', id)

    // 2. Delete campaign record from DB
    const { error } = await supabase
      .from('campaigns')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Campaign deleted permanently' })
  } catch (error: any) {
    console.error('API /admin/campaigns/[id] DELETE Error:', error)
    return NextResponse.json({ error: error.message || 'Failed to delete campaign' }, { status: 500 })
  }
}
