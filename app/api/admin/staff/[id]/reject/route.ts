import { NextResponse } from 'next/server'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'
import pool from '@/lib/db'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: Params) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (!currentAdmin || (!currentAdmin.is_super_admin && !hasActionPermission(currentAdmin, 'staff', 'edit'))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { id } = await params
    let deleteAccount = false
    try {
      const body = await request.json()
      deleteAccount = !!body.deleteAccount
    } catch {
      // Body may be empty
    }

    const existing = await pool.query('SELECT * FROM public.admins WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const staffMember = existing.rows[0]

    // Safeguard: Cannot reject or delete a super_admin
    if (staffMember.role === 'super_admin') {
      return NextResponse.json({ error: 'Cannot reject a Super Admin account' }, { status: 400 })
    }

    if (deleteAccount) {
      await pool.query('DELETE FROM public.admins WHERE id = $1', [id])
      return NextResponse.json({
        success: true,
        message: `Employee request for ${staffMember.name || staffMember.email} has been dismissed and deleted`,
      })
    } else {
      await pool.query(
        `UPDATE public.admins 
         SET approval_status = 'rejected', is_active = false, updated_at = NOW() 
         WHERE id = $1`,
        [id]
      )
      return NextResponse.json({
        success: true,
        message: `Employee request for ${staffMember.name || staffMember.email} has been marked as rejected`,
      })
    }
  } catch (error) {
    console.error('API /admin/staff/[id]/reject Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error during rejection' },
      { status: 500 }
    )
  }
}
