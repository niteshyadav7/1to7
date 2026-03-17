import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'

export interface AdminPayload {
  id: string
  email: string
}

export async function getAdminFromRequest(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value

    if (!token) return null

    const payload = await decrypt(token)
    if (!payload?.id || !payload?.email) return null

    return { id: payload.id, email: payload.email }
  } catch {
    return null
  }
}
