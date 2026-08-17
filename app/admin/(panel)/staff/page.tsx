'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Search,
  Key,
  Edit2,
  Trash2,
  Lock,
  Mail,
  User,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  SlidersHorizontal,
  Check,
  Sparkles,
  Copy,
  AlertTriangle,
  X,
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

interface StaffMember {
  id: string
  name: string
  email: string
  role: string
  roleDisplayName: string
  permissions: Record<string, string[]>
  effectivePermissions: Record<string, string[]>
  is_active: boolean
  last_login?: string
  created_at: string
}

export default function StaffManagementPage() {
  const { admin: currentAdmin, isSuperAdmin, can } = useAdminPermissions()
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [rolesList, setRolesList] = useState<RoleItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isResetPassModalOpen, setIsResetPassModalOpen] = useState(false)
  const [staffToDelete, setStaffToDelete] = useState<StaffMember | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)

  // Form states
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formShowPassword, setFormShowPassword] = useState(false)
  const [formRole, setFormRole] = useState('admin')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formPermissions, setFormPermissions] = useState<Record<string, string[]>>({})
  const [customPermissionsEnabled, setCustomPermissionsEnabled] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Password reset modal state
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resettingPassword, setResettingPassword] = useState(false)

  // Fetch staff and roles
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [staffRes, rolesRes] = await Promise.all([
        fetch('/api/admin/staff'),
        fetch('/api/admin/roles'),
      ])

      if (staffRes.ok) {
        const staffData = await staffRes.json()
        setStaffList(staffData.staff || [])
      }

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json()
        setRolesList(rolesData.roles || [])
      }
    } catch {
      toast.error('Failed to load staff management data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Helper to generate a secure random password
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*'
    let pass = ''
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return pass
  }

  // Open Create Modal
  const openCreateModal = () => {
    setFormName('')
    setFormEmail('')
    setFormPassword(generateRandomPassword())
    setFormShowPassword(true)
    setFormRole('admin')
    setFormIsActive(true)
    setCustomPermissionsEnabled(false)

    const defaultRole = rolesList.find((r) => r.name === 'admin')
    setFormPermissions(defaultRole ? { ...defaultRole.permissions } : {})
    setIsCreateModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (staff: StaffMember) => {
    setSelectedStaff(staff)
    setFormName(staff.name)
    setFormEmail(staff.email)
    setFormRole(staff.role)
    setFormIsActive(staff.is_active)

    const hasCustom = Object.keys(staff.permissions || {}).length > 0
    setCustomPermissionsEnabled(hasCustom)
    setFormPermissions(
      hasCustom ? { ...staff.permissions } : { ...staff.effectivePermissions }
    )
    setIsEditModalOpen(true)
  }

  // Open Reset Password Modal
  const openResetPassModal = (staff: StaffMember) => {
    setSelectedStaff(staff)
    setNewPassword(generateRandomPassword())
    setShowNewPassword(true)
    setIsResetPassModalOpen(true)
  }

  // Handle Role Change in Form
  const handleRoleChange = (newRoleName: string) => {
    setFormRole(newRoleName)
    if (!customPermissionsEnabled) {
      const selectedRoleObj = rolesList.find((r) => r.name === newRoleName)
      if (selectedRoleObj) {
        setFormPermissions({ ...selectedRoleObj.permissions })
      }
    }
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

  // Submit Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formEmail || !formPassword) {
      toast.error('Email and password are required')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
          is_active: formIsActive,
          permissions: customPermissionsEnabled ? formPermissions : {},
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create staff')

      toast.success(`Staff account created for ${formName || formEmail}`)
      setIsCreateModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create staff')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Edit Staff
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          role: formRole,
          is_active: formIsActive,
          permissions: customPermissionsEnabled ? formPermissions : {},
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update staff')

      toast.success('Staff account updated successfully')
      setIsEditModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update staff')
    } finally {
      setSubmitting(false)
    }
  }

  // Submit Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff || !newPassword) return

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    setResettingPassword(true)
    try {
      const res = await fetch(`/api/admin/staff/${selectedStaff.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset password')

      toast.success(data.message || 'Password changed successfully')
      setIsResetPassModalOpen(false)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password')
    } finally {
      setResettingPassword(false)
    }
  }

  // Submit Delete Staff
  const handleDeleteStaff = async () => {
    if (!staffToDelete) return

    try {
      const res = await fetch(`/api/admin/staff/${staffToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete staff')

      toast.success('Staff account removed')
      setStaffToDelete(null)
      fetchData()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete staff')
    }
  }

  // Toggle staff active status inline
  const handleToggleStatus = async (staff: StaffMember) => {
    try {
      const updatedStatus = !staff.is_active
      const res = await fetch(`/api/admin/staff/${staff.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: updatedStatus }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')

      toast.success(`${staff.name || staff.email} is now ${updatedStatus ? 'Active' : 'Inactive'}`)
      setStaffList((prev) =>
        prev.map((s) => (s.id === staff.id ? { ...s, is_active: updatedStatus } : s))
      )
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status')
    }
  }

  // Filtered staff list
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesRole = roleFilter === 'ALL' || s.role === roleFilter
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && s.is_active) ||
        (statusFilter === 'INACTIVE' && !s.is_active)
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [staffList, searchQuery, roleFilter, statusFilter])

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = staffList.length
    const active = staffList.filter((s) => s.is_active).length
    const inactive = total - active
    const superAdmins = staffList.filter((s) => s.role === 'super_admin').length
    return { total, active, inactive, superAdmins }
  }, [staffList])

  const getRoleBadgeStyle = (roleName: string) => {
    switch (roleName) {
      case 'super_admin':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'admin':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
      case 'campaign_manager':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30'
      case 'finance_lead':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
      case 'viewer':
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30'
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="h-6 w-6 text-indigo-400" />
            Staff Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage admin users, configure dynamic tab access, and securely change passwords.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchData}
            disabled={loading}
            className="border-white/10 text-slate-300 hover:bg-white/5 hover:text-white rounded-xl h-10 px-3.5 cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          {(isSuperAdmin || can('staff', 'create')) && (
            <Button
              onClick={openCreateModal}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl h-10 px-4 font-semibold shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Staff</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{metrics.total}</p>
          <span className="text-xs text-slate-500 mt-1 block">Registered accounts</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Active Staff</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{metrics.active}</p>
          <span className="text-xs text-slate-500 mt-1 block">Full login authorization</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Inactive / Suspended</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <XCircle className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{metrics.inactive}</p>
          <span className="text-xs text-slate-500 mt-1 block">Access locked</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-5 shadow-lg">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">Super Admins</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{metrics.superAdmins}</p>
          <span className="text-xs text-slate-500 mt-1 block">Unrestricted access</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl p-4 flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or email address..."
            className="pl-9 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-10 rounded-xl text-sm font-sans"
          />
        </div>

        {/* Role Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="w-full md:w-[180px] h-10 px-3 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-sans"
          >
            <option value="ALL" className="bg-slate-900 text-white">All Roles</option>
            {rolesList.map((role) => (
              <option key={role.name} value={role.name} className="bg-slate-900 text-white">
                {role.display_name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full md:w-[140px] h-10 px-3 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-sans"
          >
            <option value="ALL" className="bg-slate-900 text-white">All Status</option>
            <option value="ACTIVE" className="bg-slate-900 text-white">Active Only</option>
            <option value="INACTIVE" className="bg-slate-900 text-white">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse font-sans">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/40 text-xs font-semibold uppercase text-slate-400 tracking-wider">
                <th className="py-4 px-6">Staff Member</th>
                <th className="py-4 px-6">Assigned Role</th>
                <th className="py-4 px-6">Accessible Tabs</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6">Last Active</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading staff directory...
                  </td>
                </tr>
              ) : filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No staff accounts match your current filters.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => {
                  const allowedModules = Object.keys(staff.effectivePermissions || {})
                  const isCurrentLoggedUser = currentAdmin?.id === staff.id

                  return (
                    <tr key={staff.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Name & Email */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
                            {staff.name?.charAt(0)?.toUpperCase() || 'S'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-white truncate">{staff.name || 'Staff Member'}</p>
                              {isCurrentLoggedUser && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-semibold border border-indigo-500/30">
                                  You
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 truncate">{staff.email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-4 px-6">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${getRoleBadgeStyle(
                            staff.role
                          )}`}
                        >
                          {staff.roleDisplayName || staff.role}
                        </span>
                      </td>

                      {/* Accessible Tabs Preview */}
                      <td className="py-4 px-6">
                        {staff.role === 'super_admin' ? (
                          <span className="text-xs text-purple-300 font-medium flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-purple-400" /> All Modules (Unrestricted)
                          </span>
                        ) : allowedModules.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[280px]">
                            {allowedModules.slice(0, 3).map((mKey) => {
                              const mod = ADMIN_MODULES.find((m) => m.key === mKey)
                              return (
                                <span
                                  key={mKey}
                                  className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-300 border border-white/5"
                                >
                                  {mod?.name || mKey}
                                </span>
                              )
                            })}
                            {allowedModules.length > 3 && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[11px] text-slate-400">
                                +{allowedModules.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 italic">No tabs assigned</span>
                        )}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-6 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(staff)}
                          disabled={!isSuperAdmin && !can('staff', 'edit')}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            staff.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                          } ${(!isSuperAdmin && !can('staff', 'edit')) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                              staff.is_active ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-4 px-6 text-xs text-slate-400">
                        {staff.last_login
                          ? new Date(staff.last_login).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Never'}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Reset Password */}
                          {(isSuperAdmin || can('staff', 'reset_password') || can('staff', 'edit')) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openResetPassModal(staff)}
                              title="Reset or Change Password"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg cursor-pointer"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Edit Staff */}
                          {(isSuperAdmin || can('staff', 'edit')) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => openEditModal(staff)}
                              title="Edit Staff & Permissions"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}

                          {/* Delete Staff */}
                          {(isSuperAdmin || can('staff', 'delete')) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setStaffToDelete(staff)}
                              disabled={isCurrentLoggedUser}
                              title={isCurrentLoggedUser ? 'Cannot delete yourself' : 'Delete Account'}
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE STAFF MODAL */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] flex flex-col z-10 font-sans"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <UserPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Create Staff Account</h2>
                    <p className="text-xs text-slate-400">Add a new admin/staff member and configure their permissions</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="flex-1 overflow-y-auto py-5 space-y-5 custom-scrollbar pr-1">
                {/* Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. Sarah Jenkins"
                        className="pl-9 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="staff@1to7media.in"
                        className="pl-9 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Password & Generator */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Initial Password <span className="text-red-400">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormPassword(generateRandomPassword())}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Sparkles className="h-3 w-3" /> Generate Secure Password
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={formShowPassword ? 'text' : 'password'}
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-20 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm font-mono"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(formPassword)
                          toast.success('Password copied to clipboard!')
                        }}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        title="Copy Password"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormShowPassword(!formShowPassword)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {formShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selector & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full h-11 px-3 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-sans"
                    >
                      {rolesList.map((role) => (
                        <option key={role.name} value={role.name} className="bg-slate-900 text-white">
                          {role.display_name} {role.is_system ? '(System)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Status</label>
                    <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-slate-950/60 border border-white/10">
                      <span className="text-sm text-slate-300">Active</span>
                      <button
                        type="button"
                        onClick={() => setFormIsActive(!formIsActive)}
                        className={`ml-auto relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formIsActive ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            formIsActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Dynamic Permission Matrix Customizer */}
                {formRole !== 'super_admin' && (
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Module & Action Permissions
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {customPermissionsEnabled
                            ? 'Custom permission overrides are currently active for this staff member.'
                            : 'Using standard permissions from the assigned role preset.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomPermissionsEnabled(!customPermissionsEnabled)}
                        className={`h-8 rounded-lg text-xs font-medium cursor-pointer ${
                          customPermissionsEnabled
                            ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                            : 'border-white/10 text-slate-400'
                        }`}
                      >
                        <SlidersHorizontal className="h-3 w-3 mr-1.5" />
                        {customPermissionsEnabled ? 'Reset to Role Defaults' : 'Customize Permissions'}
                      </Button>
                    </div>

                    {customPermissionsEnabled && (
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-3">
                        {ADMIN_MODULES.filter((m) => m.key !== 'staff' && m.key !== 'roles').map((module) => {
                          const currentActions = formPermissions[module.key] || []
                          const allActionKeys = module.actions.map((a) => a.key)
                          const isFullyChecked =
                            allActionKeys.length > 0 &&
                            allActionKeys.every((k) => currentActions.includes(k))

                          return (
                            <div
                              key={module.key}
                              className="rounded-xl border border-white/5 bg-slate-900/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleAllModulePermissions(module.key, allActionKeys)}
                                  className="text-xs font-bold text-white hover:text-indigo-300 text-left cursor-pointer flex items-center gap-1.5"
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
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="text-slate-400 hover:text-white rounded-xl h-11 px-5 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-indigo-500/25 cursor-pointer"
                  >
                    {submitting ? 'Creating Account...' : 'Create Account'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT STAFF MODAL */}
      <AnimatePresence>
        {isEditModalOpen && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-6 md:p-8 max-h-[90vh] flex flex-col z-10 font-sans"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                    <Edit2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Edit Staff Account</h2>
                    <p className="text-xs text-slate-400">Modify profile, role assignments, and permission overrides</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateStaff} className="flex-1 overflow-y-auto py-5 space-y-5 custom-scrollbar pr-1">
                {/* Name & Email */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="Staff Name"
                        className="pl-9 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        type="email"
                        required
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        className="pl-9 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Role Selector & Status */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Assigned Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="w-full h-11 px-3 bg-slate-950/60 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer font-sans"
                    >
                      {rolesList.map((role) => (
                        <option key={role.name} value={role.name} className="bg-slate-900 text-white">
                          {role.display_name} {role.is_system ? '(System)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Status</label>
                    <div className="flex items-center gap-3 h-11 px-4 rounded-xl bg-slate-950/60 border border-white/10">
                      <span className="text-sm text-slate-300">Active</span>
                      <button
                        type="button"
                        onClick={() => setFormIsActive(!formIsActive)}
                        className={`ml-auto relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          formIsActive ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                            formIsActive ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Permissions Customizer */}
                {formRole !== 'super_admin' && (
                  <div className="space-y-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-white uppercase tracking-wider">
                          Module & Action Permissions
                        </span>
                        <p className="text-[11px] text-slate-400">
                          {customPermissionsEnabled
                            ? 'Custom permission overrides are currently active for this staff member.'
                            : 'Using standard permissions from the assigned role preset.'}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setCustomPermissionsEnabled(!customPermissionsEnabled)}
                        className={`h-8 rounded-lg text-xs font-medium cursor-pointer ${
                          customPermissionsEnabled
                            ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                            : 'border-white/10 text-slate-400'
                        }`}
                      >
                        <SlidersHorizontal className="h-3 w-3 mr-1.5" />
                        {customPermissionsEnabled ? 'Reset to Role Defaults' : 'Customize Permissions'}
                      </Button>
                    </div>

                    {customPermissionsEnabled && (
                      <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 space-y-3">
                        {ADMIN_MODULES.filter((m) => m.key !== 'staff' && m.key !== 'roles').map((module) => {
                          const currentActions = formPermissions[module.key] || []
                          const allActionKeys = module.actions.map((a) => a.key)
                          const isFullyChecked =
                            allActionKeys.length > 0 &&
                            allActionKeys.every((k) => currentActions.includes(k))

                          return (
                            <div
                              key={module.key}
                              className="rounded-xl border border-white/5 bg-slate-900/60 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => toggleAllModulePermissions(module.key, allActionKeys)}
                                  className="text-xs font-bold text-white hover:text-indigo-300 text-left cursor-pointer flex items-center gap-1.5"
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
                    )}
                  </div>
                )}

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEditModalOpen(false)}
                    className="text-slate-400 hover:text-white rounded-xl h-11 px-5 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-indigo-500/25 cursor-pointer"
                  >
                    {submitting ? 'Saving Changes...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RESET PASSWORD MODAL */}
      <AnimatePresence>
        {isResetPassModalOpen && selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsResetPassModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/95 backdrop-blur-2xl shadow-2xl p-6 md:p-8 flex flex-col z-10 font-sans"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                    <Key className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">Reset Password</h2>
                    <p className="text-xs text-slate-400">Change password for {selectedStaff.name || selectedStaff.email}</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResetPassModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleResetPassword} className="py-5 space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">New Password</label>
                    <button
                      type="button"
                      onClick={() => setNewPassword(generateRandomPassword())}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer font-medium"
                    >
                      <Sparkles className="h-3 w-3" /> Auto-generate
                    </button>
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-9 pr-20 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 h-11 rounded-xl text-sm font-mono"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(newPassword)
                          toast.success('Password copied to clipboard!')
                        }}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                        title="Copy Password"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs leading-relaxed flex items-start gap-2.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    Setting a new password will allow the staff member to log in immediately with these credentials.
                  </span>
                </div>

                <div className="pt-3 border-t border-white/10 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsResetPassModalOpen(false)}
                    className="text-slate-400 hover:text-white rounded-xl h-11 px-5 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={resettingPassword}
                    className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl h-11 px-6 font-semibold shadow-lg shadow-amber-500/20 cursor-pointer"
                  >
                    {resettingPassword ? 'Updating Password...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ULTRA-PREMIUM DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={!!staffToDelete} onOpenChange={(open) => !open && setStaffToDelete(null)}>
        <AlertDialogContent className="w-full max-w-[460px] p-6 sm:p-7 rounded-3xl bg-slate-900/98 backdrop-blur-2xl border border-white/10 text-white shadow-2xl shadow-black/90 font-sans">
          <AlertDialogHeader className="space-y-4 text-center items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-red-500/20 to-red-950/40 shadow-inner shadow-red-500/20 ring-1 ring-red-500/30 mx-auto">
              <Trash2 className="h-7 w-7 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.6)]" />
            </div>

            <div className="space-y-1.5">
              <AlertDialogTitle className="text-xl font-bold tracking-tight text-white">
                Delete Staff Account?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400 text-sm leading-relaxed max-w-[340px] mx-auto">
                Are you sure you want to permanently remove this staff account?
              </AlertDialogDescription>
            </div>

            {staffToDelete && (
              <div className="w-full p-3.5 rounded-2xl bg-slate-950/70 border border-white/10 text-left flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-sm shrink-0 shadow-md">
                  {staffToDelete.name?.charAt(0)?.toUpperCase() || 'S'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white truncate">{staffToDelete.name || 'Staff Member'}</p>
                  <p className="text-xs text-slate-400 truncate">{staffToDelete.email}</p>
                </div>
                <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-white/10 shrink-0 font-medium">
                  {staffToDelete.roleDisplayName || staffToDelete.role}
                </span>
              </div>
            )}

            <div className="w-full p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2 text-left">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>This action cannot be undone and revokes login access immediately.</span>
            </div>
          </AlertDialogHeader>

          <AlertDialogFooter className="mt-4 flex flex-row items-center justify-between gap-3 pt-3 border-t border-white/5 w-full">
            <AlertDialogCancel className="flex-1 bg-slate-800/90 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white rounded-xl h-11 transition-all font-medium flex items-center justify-center cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white cursor-pointer rounded-xl h-11 shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all border border-red-500/50 hover:border-red-400 font-semibold tracking-wide flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
