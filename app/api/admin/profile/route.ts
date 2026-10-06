import { NextResponse } from 'next/server'
import { getAdminFromRequest } from '@/lib/admin-auth'
import pool from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/profile
 * Returns the profile of the currently authenticated admin/POC.
 */
export async function GET() {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const res = await pool.query(
      `SELECT 
        a.id, 
        a.email, 
        a.name, 
        a.phone, 
        a.creator_view_name,
        a.creator_view_phone,
        a.role, 
        a.avatar_url, 
        a.approval_status, 
        a.last_login, 
        a.created_at,
        r.display_name as role_display_name,
        (
          SELECT COUNT(*)::int 
          FROM public.campaigns c 
          WHERE a.id = ANY(c.poc_admin_ids)
        ) AS assigned_campaigns_count
       FROM public.admins a
       LEFT JOIN public.roles r ON a.role = r.name
       WHERE a.id = $1`,
      [admin.id]
    )

    const row = res.rows[0]
    if (!row) {
      return NextResponse.json({ error: 'Admin account not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: row.id,
        email: row.email,
        name: row.name || 'Admin',
        phone: row.phone || '',
        creatorViewName: row.creator_view_name || '',
        creatorViewPhone: row.creator_view_phone || '',
        role: row.role,
        roleDisplayName: row.role_display_name || row.role,
        avatarUrl: row.avatar_url || null,
        approvalStatus: row.approval_status || 'approved',
        lastLogin: row.last_login,
        createdAt: row.created_at,
        assignedCampaignsCount: row.assigned_campaigns_count || 0,
      },
    })
  } catch (error) {
    console.error('API /admin/profile GET Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/profile
 * Allows the currently logged-in admin/POC to update their profile details (name, phone, avatar).
 */
export async function PUT(request: Request) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Session required' }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, avatar_url, creator_view_name, creator_view_phone } = body

    // Helper for phone validation & normalization
    const normalizePhone = (inputPhone: any, fieldLabel: string) => {
      if (inputPhone === undefined || inputPhone === null || String(inputPhone).trim() === '') {
        return null
      }
      const digitsOnly = String(inputPhone).replace(/\D/g, '')
      if (digitsOnly.length === 10) {
        return digitsOnly
      } else if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
        return digitsOnly.slice(2)
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
        return digitsOnly.slice(1)
      } else if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        return digitsOnly
      } else {
        throw new Error(`Please enter a valid mobile number for ${fieldLabel} (e.g., 9876543210)`)
      }
    }

    let cleanPhone: string | null = null
    let cleanCreatorPhone: string | null = null

    try {
      cleanPhone = normalizePhone(phone, 'Personal Phone')
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    try {
      cleanCreatorPhone = normalizePhone(creator_view_phone, 'Creator-Facing WhatsApp Number')
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const cleanCreatorName =
      creator_view_name !== undefined
        ? creator_view_name?.trim() || null
        : undefined

    const res = await pool.query(
      `UPDATE public.admins
       SET 
         name = COALESCE($1, name),
         phone = $2,
         creator_view_name = CASE WHEN $3::boolean THEN $4 ELSE creator_view_name END,
         creator_view_phone = CASE WHEN $5::boolean THEN $6 ELSE creator_view_phone END,
         avatar_url = COALESCE($7, avatar_url),
         updated_at = NOW()
       WHERE id = $8
       RETURNING id, name, email, phone, creator_view_name, creator_view_phone, role, avatar_url, approval_status, updated_at`,
      [
        name?.trim() ? name.trim() : null,
        cleanPhone,
        creator_view_name !== undefined,
        cleanCreatorName,
        creator_view_phone !== undefined,
        cleanCreatorPhone,
        avatar_url !== undefined ? avatar_url : null,
        admin.id,
      ]
    )

    const updated = res.rows[0]
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        phone: updated.phone || '',
        creatorViewName: updated.creator_view_name || '',
        creatorViewPhone: updated.creator_view_phone || '',
        role: updated.role,
        avatarUrl: updated.avatar_url || null,
      },
    })
  } catch (error) {
    console.error('API /admin/profile PUT Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
