import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'order_details')) {
      return NextResponse.json({ error: 'Unauthorized: Access to order details is restricted' }, { status: 403 })
    }

    const res = await pool.query(`
      SELECT 
        a.id,
        a.status,
        a.form_data,
        COALESCE(a.partial_payment, 0)::float AS partial_payment,
        COALESCE(a.final_payment, 0)::float AS final_payment,
        COALESCE(a.pending_amount, 0)::float AS pending_amount,
        a.manager_phone,
        a.created_at,
        a.updated_at,
        json_build_object(
          'id', u.id,
          'full_name', u.full_name,
          'influencer_id', u.influencer_id,
          'email', u.email,
          'mobile', u.mobile,
          'instagram_username', u.instagram_username,
          'followers', u.followers,
          'state', u.state,
          'city', u.city,
          'gender', u.gender,
          'instagram_profile_pic', u.instagram_profile_pic
        ) AS users,
        json_build_object(
          'brand_name', c.brand_name,
          'campaign_code', c.campaign_code,
          'platform', c.platform,
          'budget_amount', c.budget_amount,
          'budget_type', c.budget_type
        ) AS campaigns
      FROM public.applications a
      JOIN public.users u ON a.user_id = u.id
      JOIN public.campaigns c ON a.campaign_id = c.id
      WHERE (a.form_data ? 'order_details') 
        AND a.form_data->'order_details' IS NOT NULL 
        AND a.form_data->'order_details' != '{}'::jsonb
      ORDER BY a.updated_at DESC
    `)

    return NextResponse.json({ orders: res.rows })
  } catch (error) {
    console.error('API /admin/order-details GET Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

