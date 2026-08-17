'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sliders,
  Plus,
  ShieldCheck,
  ShieldAlert,
  Edit2,
  Trash2,
  Check,
  RefreshCw,
  Sparkles,
  Lock,
  FileCode,
  Layers,
  HelpCircle,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { ADMIN_MODULES } from '@/lib/constants/permissions'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface RoleItem {
  id: string
  name: string
  display_name: string
  description?: string
  permissions: Record<string, string[]>
  is_system: boolean
}

export default function RolesManagementPage() {
  const { isSuperAdmin, can } = useAdminPermissions()
  const [roles, setRoles] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null)
  const [roleToDelete, setRoleToDelete] = useState<RoleItem | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formDisplayName, setFormDisplayName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formPermissions, setFormPermissions] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/roles')
      if (res.ok) {
        const data = await res.json()
        setRoles(data.roles || [])
      }
    } catch {
      toast.error('Failed to load roles')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Open Create Role Modal
  const openCreateModal = () => {
    setEditingRole(null)
    setFormName('')
    setFormDisplayName('')
    setFormDescription('')
    setFormPermissions({})
    setIsModalOpen(true)
  }

  // Open Edit Role Modal
  const openEditModal = (role: RoleItem) => {
    setEditingRole(role)
    setFormName(role.name)
    setFormDisplayName(role.display_name)
    setFormDescription(role.description || '')
    setFormPermissions({ ...role.permissions })
    setIsModalOpen(true)
  }

  // Toggle specific action permission for a module
  const togglePermission = (moduleKey: string, actionKey: string) => {
    setFormPermissions((prev) => {
      const currentModuleActions = prev[moduleKey] || []
      let updated: string[]

      if (currentModuleActions.includes(actionKey)) {
        updated = currentModuleActions.filter((a) => a !== actionKey)
      } else {
        if (actionKey !== 'view' && !currentModuleActions.includes('view')) {
          updated = [...currentModuleActions, 'view', actionKey]
        } else {
          updated = [...currentModuleActions, actionKey]
        }
      }

      const next = { ...prev }
      if (updated.length === 0) {
        delete next[moduleKey]
      } else {
        next[moduleKey] = updated
      }
      return next
    })
  }

  // Toggle all permissions for a module
  const toggleAllModulePermissions = (moduleKey: string, allActions: string[]) => {
    setFormPermissions((prev) => {
      const currentModuleActions = prev[moduleKey] || []
      const next = { ...prev }

      if (currentModuleActions.length === allActions.length) {
        delete next[moduleKey]
      } else {
        next[moduleKey] = [...allActions]
      }
      return next
    })
  }

  // Submit Create or Edit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formDisplayName) {
      toast.error('Role display name is required')
      return
    }

    setSubmitting(true)
    try {
      if (editingRole) {
        // Edit
        const res = await fetch('/api/admin/roles', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingRole.id,
            display_name: formDisplayName,
            description: formDescription,
            permissions: formPermissions,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to update role')

        toast.success('Role updated successfully')
      } else {
        // Create
        const identifier = formName || formDisplayName.toLowerCase().replace(/[^a-z0-9_]/g, '_')
        const res = await fetch('/api/admin/roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: identifier,
            display_name: formDisplayName,
            description: formDescription,
            permissions: formPermissions,
          }),
        })

        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create role')

        toast.success('Custom role created successfully')
      }

      setIsModalOpen(false)
      fetchRoles()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Delete Role
  const handleDeleteRole = async () => {
    if (!roleToDelete) return

    try {
      const res = await fetch(`/api/admin/roles?id=${roleToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete role')

      toast.success('Role deleted successfully')
      setRoleToDelete(null)
      fetchRoles()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role')
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Sliders className="h-6 w-6 text-indigo-400" />
            Roles & Permissions
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Define system and custom roles with granular tab visibility and action capabilities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchRoles}
            disabled={loading}
            className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl h-10 px-3.5 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {(isSuperAdmin || can('roles', 'create')) && (
            <Button
              onClick={openCreateModal}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl h-10 px-4 font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Role
            </Button>
          )}
        </div>
      </div>

      {/* Roles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-slate-400">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-3 text-indigo-400" />
            Loading role configurations...
          </div>
        ) : (
          roles.map((role) => {
            const isSuper = role.name === 'super_admin'
            const moduleKeys = Object.keys(role.permissions || {})
            const totalActionCount = moduleKeys.reduce(
              (acc, k) => acc + (role.permissions[k]?.length || 0),
              0
            )

            return (
              <div
                key={role.id}
                className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-6 flex flex-col justify-between shadow-xl relative overflow-hidden group hover:border-white/20 transition-all"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold tracking-wide border ${
                        isSuper
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          : role.is_system
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}
                    >
                      {isSuper ? (
                        <>
                          <Sparkles className="h-3 w-3" /> Super Admin
                        </>
                      ) : role.is_system ? (
                        <>
                          <ShieldCheck className="h-3 w-3" /> System Role
                        </>
                      ) : (
                        <>
                          <Layers className="h-3 w-3" /> Custom Role
                        </>
                      )}
                    </span>

                    <span className="text-[11px] font-mono text-slate-500">#{role.name}</span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-lg font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {role.display_name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2 min-h-[32px]">
                    {role.description || 'No description provided.'}
                  </p>

                  {/* Modules Preview */}
                  <div className="mt-4 pt-4 border-t border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>Accessible Modules:</span>
                      <span className="font-semibold text-slate-200">
                        {isSuper ? 'All Modules' : `${moduleKeys.length} / ${ADMIN_MODULES.length}`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 min-h-[52px]">
                      {isSuper ? (
                        <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 text-xs font-medium border border-purple-500/20 flex items-center gap-1">
                          <Check className="h-3 w-3" /> Full System Bypass & Root Control
                        </span>
                      ) : moduleKeys.length > 0 ? (
                        moduleKeys.slice(0, 4).map((mKey) => {
                          const mod = ADMIN_MODULES.find((m) => m.key === mKey)
                          return (
                            <span
                              key={mKey}
                              className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-[11px] text-slate-300 border border-white/5"
                            >
                              {mod?.name || mKey}
                            </span>
                          )
                        })
                      ) : (
                        <span className="text-xs text-slate-500 italic">No permissions assigned</span>
                      )}
                      {!isSuper && moduleKeys.length > 4 && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800 text-[11px] text-slate-400">
                          +{moduleKeys.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-slate-500">
                    {isSuper ? 'Unrestricted' : `${totalActionCount} actions permitted`}
                  </span>

                  <div className="flex items-center gap-2">
                    {!isSuper && (isSuperAdmin || can('roles', 'edit')) && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditModal(role)}
                        className="border-white/10 hover:bg-white/5 text-slate-300 hover:text-white rounded-xl h-8 px-3 text-xs font-medium cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 mr-1.5" />
                        Edit
                      </Button>
                    )}

                    {!role.is_system && (isSuperAdmin || can('roles', 'delete')) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setRoleToDelete(role)}
                        className="text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl h-8 w-8 p-0 cursor-pointer"
                        title="Delete Role"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* CREATE / EDIT ROLE MODAL */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-3xl rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] flex flex-col z-10"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                    <Sliders className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {editingRole ? `Edit Role: ${editingRole.display_name}` : 'Create Custom Role'}
                    </h2>
                    <p className="text-xs text-slate-400">
                      Configure granular module access and operational action permissions
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-5 space-y-5 custom-scrollbar pr-1">
                {/* Display Name & Code */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Role Display Name <span className="text-red-400">*</span>
                    </label>
                    <Input
                      required
                      value={formDisplayName}
                      onChange={(e) => setFormDisplayName(e.target.value)}
                      placeholder="e.g. Campaign Reviewer"
                      className="bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm"
                    />
                  </div>

                  {!editingRole && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Role Identifier / Slug
                      </label>
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. campaign_reviewer"
                        className="bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm font-mono text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                  <Input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Brief description of the responsibilities and scope of this role..."
                    className="bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm"
                  />
                </div>

                {/* Module Permissions Matrix */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      Permissions Matrix by Module
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click module name to toggle all actions
                    </span>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-3">
                    {ADMIN_MODULES.map((module) => {
                      const currentActions = formPermissions[module.key] || []
                      const allActionKeys = module.actions.map((a) => a.key)
                      const isFullyChecked =
                        allActionKeys.length > 0 &&
                        allActionKeys.every((k) => currentActions.includes(k))

                      return (
                        <div
                          key={module.key}
                          className="rounded-xl border border-white/5 bg-slate-900/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <button
                              type="button"
                              onClick={() => toggleAllModulePermissions(module.key, allActionKeys)}
                              className="text-xs font-bold text-white hover:text-indigo-300 text-left cursor-pointer flex items-center gap-2"
                            >
                              <span
                                className={`h-4 w-4 rounded flex items-center justify-center border text-[10px] ${
                                  isFullyChecked
                                    ? 'bg-indigo-600 border-indigo-500 text-white'
                                    : currentActions.length > 0
                                    ? 'bg-indigo-600/40 border-indigo-500/40 text-white'
                                    : 'border-white/20 text-transparent'
                                }`}
                              >
                                ✓
                              </span>
                              {module.name}
                            </button>
                            <p className="text-[11px] text-slate-400 mt-0.5">{module.description}</p>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap items-center gap-2">
                            {module.actions.map((act) => {
                              const isChecked = currentActions.includes(act.key)
                              return (
                                <label
                                  key={act.key}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium cursor-pointer border transition-colors ${
                                    isChecked
                                      ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 shadow-sm'
                                      : 'bg-slate-950/40 text-slate-500 border-white/5 hover:border-white/10'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => togglePermission(module.key, act.key)}
                                    className="sr-only"
                                  />
                                  <span>{act.name}</span>
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsModalOpen(false)}
                    className="text-slate-400 hover:text-white rounded-xl h-11 px-5 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-indigo-500/25 cursor-pointer"
                  >
                    {submitting ? 'Saving Role...' : editingRole ? 'Update Role' : 'Create Role'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ULTRA-PREMIUM DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!roleToDelete} onOpenChange={(open) => !open && setRoleToDelete(null)}>
        <AlertDialogContent className="w-full max-w-[460px] p-6 sm:p-7 rounded-3xl bg-slate-900/98 backdrop-blur-2xl border border-white/10 text-white shadow-2xl shadow-black/90 font-sans">
          <AlertDialogHeader className="space-y-4 text-center items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-red-500/20 to-red-950/40 shadow-inner shadow-red-500/20 ring-1 ring-red-500/30 mx-auto">
              <Trash2 className="h-7 w-7 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
            </div>

            <div className="space-y-1.5">
              <AlertDialogTitle className="text-xl font-bold tracking-tight text-white">
                Delete Custom Role?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 text-sm leading-relaxed max-w-[340px] mx-auto">
                Are you sure you want to delete this custom role?
              </AlertDialogDescription>
            </div>

            {roleToDelete && (
              <div className="w-full p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 text-left flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md">
                  <Sliders className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{roleToDelete.display_name}</p>
                  <p className="text-xs text-slate-400 truncate font-mono">#{roleToDelete.name}</p>
                </div>
              </div>
            )}

            <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2 text-left">
              <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
              <span>This role can only be removed if no active staff members are assigned to it.</span>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4 flex flex-row items-center justify-between gap-3 pt-3 border-t border-white/5 w-full">
            <AlertDialogCancel className="flex-1 bg-slate-800/90 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white rounded-xl h-11 transition-all font-medium flex items-center justify-center cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteRole}
              className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white cursor-pointer rounded-xl h-11 shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all border border-red-500/50 hover:border-red-400 font-semibold tracking-wide flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
