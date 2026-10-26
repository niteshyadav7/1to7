'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Crown,
  Users,
  RefreshCw,
  AlertTriangle,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { BrandAdminRole } from '@/types/brand-admin'

interface StaffItem {
  id: string
  name: string
  email: string
  avatar_url?: string | null
  role: string
  brand_admin_access: boolean
  brand_admin_role: BrandAdminRole
  brand_admin_status: 'pending' | 'approved' | 'rejected'
  brand_admin_approved_by?: string | null
  brand_admin_approved_at?: string | null
  created_at?: string
}

const ROLE_OPTIONS: { value: BrandAdminRole; label: string; desc: string }[] = [
  { value: 'kam_lead', label: 'KAM Lead', desc: 'Manage all client brands, reassign KAMs & proxy-approve' },
  { value: 'kam', label: 'Key Account Manager (KAM)', desc: 'Manage assigned brands & creator shortlists' },
  { value: 'brand_ops', label: 'Brand Operations', desc: 'Track creator dispatches & live deliverable proofs' },
  { value: 'viewer', label: 'Read-only Auditor', desc: 'View dashboards and reports without edit capabilities' },
]

export default function TeamRbacPage() {
  const [staff, setStaff] = useState<StaffItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<Record<string, BrandAdminRole>>({})
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const fetchStaff = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/brand-admin/staff')
      if (res.ok) {
        const data = await res.json()
        setStaff(data.staff || [])
      } else {
        toast.error('Failed to load Brand Admin staff')
      }
    } catch {
      toast.error('Network error loading staff')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  const handleUpdateStatus = async (
    staffMember: StaffItem,
    newStatus: 'approved' | 'rejected',
    role?: BrandAdminRole
  ) => {
    const assignedRole = role || selectedRoles[staffMember.id] || staffMember.brand_admin_role || 'kam'
    setUpdatingId(staffMember.id)

    try {
      const res = await fetch('/api/brand-admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: staffMember.id,
          brand_admin_access: newStatus === 'approved',
          brand_admin_role: assignedRole,
          brand_admin_status: newStatus,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(
          newStatus === 'approved'
            ? `Approved ${staffMember.name} as ${assignedRole.toUpperCase()}`
            : `Revoked Brand Admin access for ${staffMember.name}`
        )

        // Optimistically update local list
        setStaff((prev) =>
          prev.map((item) =>
            item.id === staffMember.id
              ? {
                  ...item,
                  brand_admin_access: newStatus === 'approved',
                  brand_admin_role: assignedRole,
                  brand_admin_status: newStatus,
                }
              : item
          )
        )
      } else {
        toast.error(data.error || 'Failed to update access')
      }
    } catch {
      toast.error('Server error updating permissions')
    } finally {
      setUpdatingId(null)
    }
  }

  const filteredStaff = staff.filter(
    (item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.email.toLowerCase().includes(search.toLowerCase())
  )

  const pendingRequests = filteredStaff.filter((item) => item.brand_admin_status === 'pending')
  const approvedStaff = filteredStaff.filter((item) => item.brand_admin_status === 'approved')

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold mb-2">
            <Lock className="w-3 h-3" />
            Security &amp; Access Control
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Brand Admin RBAC &amp; Staff Approvals
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Authorizations are strictly isolated from the Influencer Admin. Only approved accounts can access brand workspaces.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={fetchStaff}
          className="border-white/10 hover:bg-white/5 text-neutral-300"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Super Admin Master Notice Banner */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3.5">
        <Crown className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-neutral-300">
          <strong className="text-amber-300 font-semibold block text-sm mb-0.5">
            Master Super Admin Enforced: superadmin@gmail.com
          </strong>
          Staff members who log in via Google or hold Influencer Admin roles cannot view Brand Admin data until you approve them and assign their specific role below.
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by staff name or email..."
          className="pl-10 h-10 bg-[#121620] border-white/10 text-white placeholder:text-neutral-500 rounded-xl"
        />
      </div>

      {/* Section 1: Pending Approval Requests */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
              Pending Access Requests
            </h2>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {pendingRequests.length}
            </span>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="p-6 rounded-2xl bg-[#121620] border border-white/5 text-center text-xs text-neutral-500">
            <CheckCircle2 className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
            No pending authorization requests. All brand admin access is up to date.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl bg-[#121620] border border-amber-500/30 shadow-lg flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-sm">
                        {item.name ? item.name[0].toUpperCase() : 'U'}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{item.name}</h3>
                        <p className="text-xs text-neutral-400">{item.email}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Pending Review
                    </span>
                  </div>

                  <div className="text-[11px] text-neutral-400 bg-[#0c1017] p-2.5 rounded-xl border border-white/5 mb-3">
                    <span className="text-neutral-500">Influencer Role:</span>{' '}
                    <span className="text-neutral-300 font-semibold uppercase">{item.role || 'None'}</span>
                    <span className="mx-2 text-neutral-600">•</span>
                    <span className="text-amber-400">Not authorized for Brand Admin</span>
                  </div>

                  {/* Role Assignment Selector */}
                  <div>
                    <label className="block text-[11px] font-semibold text-neutral-300 mb-1.5">
                      Assign Brand Admin Role:
                    </label>
                    <select
                      value={selectedRoles[item.id] || 'kam'}
                      onChange={(e) =>
                        setSelectedRoles((prev) => ({
                          ...prev,
                          [item.id]: e.target.value as BrandAdminRole,
                        }))
                      }
                      className="w-full h-9 rounded-xl bg-[#0c1017] border border-white/10 px-3 text-xs text-white focus:border-amber-500/50"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} - {opt.desc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                  <Button
                    size="sm"
                    disabled={updatingId === item.id}
                    onClick={() => handleUpdateStatus(item, 'approved')}
                    className="flex-1 bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-xs h-9"
                  >
                    <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                    Approve Access
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={updatingId === item.id}
                    onClick={() => handleUpdateStatus(item, 'rejected')}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs h-9"
                  >
                    <UserX className="w-3.5 h-3.5 mr-1.5" />
                    Decline
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Section 2: Active Brand Admin Staff */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
              Active Authorized Staff ({approvedStaff.length})
            </h2>
          </div>
        </div>

        <div className="bg-[#121620] border border-white/10 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1017] text-neutral-400 font-semibold border-b border-white/10">
                <tr>
                  <th className="p-3.5">Staff Member</th>
                  <th className="p-3.5">Brand Role</th>
                  <th className="p-3.5">Approved By</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {approvedStaff.map((member) => {
                  const isMaster = member.email.toLowerCase() === 'superadmin@gmail.com'

                  return (
                    <tr key={member.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                            {member.name ? member.name[0].toUpperCase() : 'A'}
                          </div>
                          <div>
                            <div className="font-semibold text-white flex items-center gap-1.5">
                              {member.name}
                              {isMaster && (
                                <span title="Super Admin">
                                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                                </span>
                              )}
                            </div>
                            <div className="text-neutral-400 text-[11px]">{member.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        {isMaster ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            MASTER SUPERADMIN
                          </span>
                        ) : (
                          <select
                            value={selectedRoles[member.id] || member.brand_admin_role}
                            onChange={(e) => {
                              const newRole = e.target.value as BrandAdminRole
                              setSelectedRoles((prev) => ({ ...prev, [member.id]: newRole }))
                              handleUpdateStatus(member, 'approved', newRole)
                            }}
                            className="h-8 rounded-lg bg-[#0c1017] border border-white/10 px-2 text-xs text-white focus:border-amber-500/50"
                          >
                            {ROLE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td className="p-3.5 text-neutral-400 text-[11px]">
                        {member.brand_admin_approved_by || 'Auto-Verified'}
                      </td>

                      <td className="p-3.5 text-right">
                        {isMaster ? (
                          <span className="text-[11px] text-neutral-500 font-semibold italic">
                            Permanent Access
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={updatingId === member.id}
                            onClick={() => handleUpdateStatus(member, 'rejected')}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs h-8"
                          >
                            <UserX className="w-3.5 h-3.5 mr-1" />
                            Revoke
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
