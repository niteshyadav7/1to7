import { cookies } from 'next/headers'
import { decrypt } from '@/lib/auth'

export type ModuleKey =
  | 'dashboard'
  | 'campaigns'
  | 'applications'
  | 'order_details'
  | 'payments'
  | 'feedback'
  | 'analytics'
  | 'import'
  | 'influencers'
  | 'staff'
  | 'roles'
  | 'user_issues'

export type ActionKey = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'reset_password'

export type PermissionsMap = Record<string, string[]>

export interface AdminPayload {
  id: string
  email: string
  name?: string
  full_name?: string
  role?: string
  is_active?: boolean
  permissions?: PermissionsMap
  is_super_admin?: boolean
}

/**
 * Checks if the given admin payload has access to view a specific module/tab.
 */
export function hasModuleAccess(admin: AdminPayload | null | undefined, moduleKey: ModuleKey | string): boolean {
  if (!admin) return false
  if (admin.role === 'super_admin' || admin.is_super_admin) return true
  const perms = admin.permissions || {}
  const modulePerms = perms[moduleKey]
  if (Array.isArray(modulePerms) && modulePerms.length > 0) {
    return modulePerms.includes('view') || modulePerms.includes('create') || modulePerms.includes('edit')
  }
  return false
}

/**
 * Checks if the given admin payload has permission to perform a specific action on a module.
 */
export function hasActionPermission(
  admin: AdminPayload | null | undefined,
  moduleKey: ModuleKey | string,
  action: ActionKey | string
): boolean {
  if (!admin) return false
  if (admin.role === 'super_admin' || admin.is_super_admin) return true
  const perms = admin.permissions || {}
  const modulePerms = perms[moduleKey]
  if (!Array.isArray(modulePerms)) return false
  return modulePerms.includes(action)
}

/**
 * Retrieves and verifies the admin session from request cookies.
 */
export async function getAdminFromRequest(): Promise<AdminPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('admin_token')?.value

    if (!token) return null

    const payload = await decrypt(token)
    if (!payload?.id || !payload?.email) return null

    const isSuperAdmin = payload.role === 'super_admin'

    return {
      id: payload.id,
      email: payload.email,
      name: payload.name || 'Admin',
      role: payload.role || 'staff',
      is_active: payload.is_active ?? true,
      permissions: payload.permissions || {},
      is_super_admin: isSuperAdmin,
    }
  } catch {
    return null
  }
}
