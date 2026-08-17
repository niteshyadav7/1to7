'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  roleDisplayName?: string
  is_active?: boolean
  permissions: Record<string, string[]>
  is_super_admin?: boolean
  last_login?: string
}

interface AdminPermissionsContextType {
  admin: AdminUser | null
  loading: boolean
  isSuperAdmin: boolean
  can: (moduleKey: string, action: string) => boolean
  canAccessModule: (moduleKey: string) => boolean
  refreshAdmin: () => Promise<void>
}

const AdminPermissionsContext = createContext<AdminPermissionsContextType | undefined>(undefined)

export function AdminPermissionsProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)

  const isSuperAdmin = admin?.role === 'super_admin' || !!admin?.is_super_admin

  const canAccessModule = useCallback(
    (moduleKey: string): boolean => {
      if (!admin) return false
      if (isSuperAdmin) return true
      const perms = admin.permissions || {}
      const modulePerms = perms[moduleKey]
      if (Array.isArray(modulePerms) && modulePerms.length > 0) {
        return modulePerms.includes('view') || modulePerms.includes('create') || modulePerms.includes('edit')
      }
      return false
    },
    [admin, isSuperAdmin]
  )

  const can = useCallback(
    (moduleKey: string, action: string): boolean => {
      if (!admin) return false
      if (isSuperAdmin) return true
      const perms = admin.permissions || {}
      const modulePerms = perms[moduleKey]
      if (!Array.isArray(modulePerms)) return false
      return modulePerms.includes(action)
    },
    [admin, isSuperAdmin]
  )

  const refreshAdmin = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me')
      if (res.ok) {
        const data = await res.json()
        if (data.admin) {
          setAdmin(data.admin)
          localStorage.setItem('admin_cache', JSON.stringify(data.admin))
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    try {
      const cached = localStorage.getItem('admin_cache')
      if (cached) {
        const parsed = JSON.parse(cached)
        setAdmin(parsed)
      }
    } catch {
      // ignore
    }
    refreshAdmin()
  }, [refreshAdmin])

  return (
    <AdminPermissionsContext.Provider
      value={{
        admin,
        loading,
        isSuperAdmin,
        can,
        canAccessModule,
        refreshAdmin,
      }}
    >
      {children}
    </AdminPermissionsContext.Provider>
  )
}

export function useAdminPermissions() {
  const context = useContext(AdminPermissionsContext)
  if (!context) {
    throw new Error('useAdminPermissions must be used within an AdminPermissionsProvider')
  }
  return context
}
