import { NextResponse } from 'next/server'
import { getAdminFromRequest, hasActionPermission } from '@/lib/admin-auth'
import { Client } from 'pg'
import bcrypt from 'bcryptjs'

interface Params {
  params: Promise<{ id: string }>
}

// POST /api/admin/staff/[id]/reset-password - Change / Reset password for staff member
export async function POST(request: Request, { params }: Params) {
  try {
    const currentAdmin = await getAdminFromRequest()
    if (
      !currentAdmin ||
      (!hasActionPermission(currentAdmin, 'staff', 'reset_password') &&
        !hasActionPermission(currentAdmin, 'staff', 'edit') &&
        !currentAdmin.is_super_admin)
    ) {
      return NextResponse.json({ error: 'Unauthorized: Permission to reset staff password is denied' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { newPassword } = body

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters long' }, { status: 400 })
    }

    const client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    // Verify staff exists
    const existing = await client.query('SELECT id, email, name, role FROM public.admins WHERE id = $1', [id])
    if (existing.rows.length === 0) {
      await client.end()
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 })
    }

    const isSuper = existing.rows[0].role === 'super_admin'
    const plainPassToStore = isSuper ? null : newPassword

    // Hash new password
    const salt = await bcrypt.genSalt(10)
    const passwordHash = await bcrypt.hash(newPassword, salt)

    // Update password
    await client.query(
      'UPDATE public.admins SET password_hash = $1, plain_password = $2, updated_at = NOW() WHERE id = $3',
      [passwordHash, plainPassToStore, id]
    )
    await client.end()

    return NextResponse.json({
      success: true,
      message: `Password has been changed successfully for ${existing.rows[0].name || existing.rows[0].email}`,
      password: plainPassToStore,
    })
  } catch (error) {
    console.error('API /admin/staff/[id]/reset-password POST Error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 })
  }
}
