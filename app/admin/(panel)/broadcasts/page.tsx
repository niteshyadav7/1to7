'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Radio,
  Plus,
  Search,
  X,
  AlertTriangle,
  ShieldAlert,
  Info,
  CheckCircle2,
  Trash2,
  Power,
  Users,
  CreditCard,
  Send,
  Loader2,
  ExternalLink,
  Clock,
  Check,
  Eye,
  SlidersHorizontal,
  Sparkles
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { getFastCache, setFastCache } from '@/lib/utils/cache-utils'
import { toast } from 'sonner'

interface BroadcastAlert {
  id: string
  title: string
  message: string
  type: 'critical' | 'warning' | 'info' | 'success'
  target_type: 'all' | 'missing_bank' | 'specific_user'
  target_user_id?: string
  target_user_identifier?: string
  action_label?: string
  action_url?: string
  auto_duration_seconds: number
  allow_dismiss: boolean
  auto_resolve_on_bank: boolean
  is_active: boolean
  created_by?: string
  created_at: string
  resolved_count: number
  total_acknowledged: number
}

export default function AdminBroadcastsPage() {
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([])
  const [missingBankCount, setMissingBankCount] = useState<number>(0)
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formMessage, setFormMessage] = useState('')
  const [formType, setFormType] = useState<'critical' | 'warning' | 'info' | 'success'>('warning')
  const [formTargetType, setFormTargetType] = useState<'all' | 'missing_bank' | 'specific_user'>('all')
  const [formUserIdentifier, setFormUserIdentifier] = useState('')
  const [formActionLabel, setFormActionLabel] = useState('Resolve Issue')
  const [formActionUrl, setFormActionUrl] = useState('/dashboard/profile')
  const [formDuration, setFormDuration] = useState('8')
  const [formAllowDismiss, setFormAllowDismiss] = useState(true)
  const [formAutoResolveBank, setFormAutoResolveBank] = useState(true)

  // Fetch Alerts
  const fetchAlerts = useCallback(async (isBackground = false) => {
    if (!isBackground && alerts.length === 0) setLoading(true)
    try {
      const res = await fetch('/api/admin/broadcasts')
      if (!res.ok) throw new Error('Failed to load broadcasts')
      const data = await res.json()
      const list = data.alerts || []
      setAlerts(list)
      setMissingBankCount(data.missingBankCount || 0)
      setFastCache('admin_broadcasts_cache', list)
      setFastCache('admin_missing_bank_count', data.missingBankCount || 0)
    } catch (err: any) {
      if (!isBackground) toast.error(err.message || 'Failed to fetch broadcasts')
    } finally {
      setLoading(false)
    }
  }, [alerts.length])

  useEffect(() => {
    const cached = getFastCache<BroadcastAlert[]>('admin_broadcasts_cache')
    const cachedCount = getFastCache<number>('admin_missing_bank_count')
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setAlerts(cached)
      if (typeof cachedCount === 'number') setMissingBankCount(cachedCount)
      setLoading(false)
      fetchAlerts(true)
    } else {
      fetchAlerts(false)
    }
  }, [fetchAlerts])

  // Quick preset: Missing Bank Broadcast
  const handleOpenBankPreset = () => {
    setFormTitle('Bank Details Required for Payout ⚠️')
    setFormMessage(
      'Your collaboration payout is waiting! Please update your Bank Account Number & IFSC code in your Profile so our finance team can disburse your funds.'
    )
    setFormType('warning')
    setFormTargetType('missing_bank')
    setFormActionLabel('Add Bank Details Now')
    setFormActionUrl('/dashboard/profile')
    setFormDuration('10')
    setFormAllowDismiss(true)
    setFormAutoResolveBank(true)
    setShowCreateModal(true)
  }

  // Create Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim() || !formMessage.trim()) {
      toast.error('Title and message are required')
      return
    }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          message: formMessage.trim(),
          type: formType,
          target_type: formTargetType,
          target_user_identifier: formTargetType === 'specific_user' ? formUserIdentifier.trim() : null,
          action_label: formActionLabel.trim(),
          action_url: formActionUrl.trim(),
          auto_duration_seconds: parseInt(formDuration, 10) || 8,
          allow_dismiss: formAllowDismiss,
          auto_resolve_on_bank: formAutoResolveBank,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create alert')

      toast.success('In-App broadcast alert launched successfully!')
      setShowCreateModal(false)
      // Reset form
      setFormTitle('')
      setFormMessage('')
      setFormTargetType('all')
      setFormUserIdentifier('')
      fetchAlerts(true)
    } catch (err: any) {
      toast.error(err.message || 'Creation failed')
    } finally {
      setCreating(false)
    }
  }

  // Toggle active
  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_active: !currentStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_active: !currentStatus } : a))
      toast.success(`Alert ${!currentStatus ? 'activated' : 'paused'}`)
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
    }
  }

  // Delete alert
  const handleDeleteAlert = async (id: string) => {
    if (!confirm('Are you sure you want to delete this broadcast alert?')) return
    try {
      const res = await fetch(`/api/admin/broadcasts?id=${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setAlerts(prev => prev.filter(a => a.id !== id))
      toast.success('Alert deleted')
    } catch (err: any) {
      toast.error(err.message || 'Delete failed')
    }
  }

  // Filtering
  const filteredAlerts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    return alerts.filter(a => {
      if (selectedType !== 'all' && a.type !== selectedType) return false
      if (selectedStatus === 'active' && !a.is_active) return false
      if (selectedStatus === 'inactive' && a.is_active) return false
      if (q) {
        const s = `${a.title} ${a.message} ${a.target_type} ${a.action_label} ${a.created_by}`.toLowerCase()
        if (!s.includes(q)) return false
      }
      return true
    })
  }, [alerts, searchQuery, selectedType, selectedStatus])

  const activeAlertsCount = useMemo(() => alerts.filter(a => a.is_active).length, [alerts])
  const totalResolvedCount = useMemo(() => alerts.reduce((acc, a) => acc + Number(a.resolved_count || 0), 0), [alerts])

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      <SetAdminHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-sm">
            <Radio className="h-3.5 w-3.5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">In-App Alerts & Broadcasts</h1>
            <p className="text-[10px] text-slate-400">Broadcast creator popups, missing bank warnings, and operational announcements</p>
          </div>
        </div>
      </SetAdminHeader>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Active Broadcasts</p>
            <p className="text-2xl font-extrabold text-white mt-1">{activeAlertsCount}</p>
            <p className="text-[11px] text-emerald-400 mt-0.5">Live on Creator Dashboard</p>
          </div>
          <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Radio className="h-5 w-5 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-4 flex items-center justify-between shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Missing Bank Accounts</p>
            <p className="text-2xl font-extrabold text-amber-300 mt-1">{missingBankCount}</p>
            <button
              onClick={handleOpenBankPreset}
              className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
            >
              <span>⚡ Send Bank Alert</span>
            </button>
          </div>
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 relative z-10">
            <CreditCard className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Acknowledged</p>
            <p className="text-2xl font-extrabold text-emerald-400 mt-1">{totalResolvedCount}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Resolved by Creators</p>
          </div>
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Broadcasts</p>
            <p className="text-2xl font-extrabold text-slate-200 mt-1">{alerts.length}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Campaigns & Announcements</p>
          </div>
          <div className="p-3 rounded-2xl bg-slate-800 border border-white/10 text-slate-300">
            <Send className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by title, message, audience..."
              className="pl-10 h-10 bg-slate-900/70 border-white/10 text-white placeholder:text-slate-500 text-xs rounded-xl focus:ring-indigo-500"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Type Filter */}
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="h-10 px-3 bg-slate-900/70 border border-white/10 text-slate-300 text-xs rounded-xl focus:ring-indigo-500 cursor-pointer"
          >
            <option value="all">All Types</option>
            <option value="warning">Action Required</option>
            <option value="critical">Critical</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={handleOpenBankPreset}
            className="h-10 px-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <CreditCard className="h-3.5 w-3.5" />
            <span>Bank Warning Preset</span>
          </Button>

          <Button
            onClick={() => {
              setFormTitle('')
              setFormMessage('')
              setFormTargetType('all')
              setFormActionLabel('Resolve Issue')
              setFormActionUrl('/dashboard/profile')
              setShowCreateModal(true)
            }}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/20"
          >
            <Plus className="h-4 w-4" />
            <span>New Broadcast Alert</span>
          </Button>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-white/10 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Alert Title & Type</th>
                <th className="px-4 py-3">Target Audience</th>
                <th className="px-4 py-3">Action & Duration</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-center">Resolved / Acks</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading broadcast alerts...</span>
                  </td>
                </tr>
              ) : filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Radio className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-50" />
                    <p className="font-semibold text-slate-400">No broadcast alerts found</p>
                    <p className="text-[11px] mt-0.5">Click &quot;New Broadcast Alert&quot; to send an in-app popup to creators.</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map(alert => {
                  const typeBadge = {
                    critical: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
                    warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
                    info: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
                    success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
                  }[alert.type || 'warning']

                  const targetBadge = {
                    all: 'bg-blue-500/15 text-blue-300 border-blue-500/25',
                    missing_bank: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
                    specific_user: 'bg-purple-500/15 text-purple-300 border-purple-500/25',
                  }[alert.target_type || 'all']

                  return (
                    <tr key={alert.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Title & Message */}
                      <td className="px-4 py-3.5 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider shrink-0 ${typeBadge}`}>
                            {alert.type}
                          </span>
                          <span className="font-bold text-white truncate">{alert.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {alert.message}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1 font-mono">
                          Created {new Date(alert.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </td>

                      {/* Target Audience */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border inline-flex items-center gap-1.5 ${targetBadge}`}>
                          {alert.target_type === 'missing_bank' ? (
                            <>
                              <CreditCard className="h-3 w-3" />
                              <span>Missing Bank Details ({missingBankCount})</span>
                            </>
                          ) : alert.target_type === 'specific_user' ? (
                            <>
                              <Users className="h-3 w-3" />
                              <span>Specific: {alert.target_user_identifier || 'User'}</span>
                            </>
                          ) : (
                            <>
                              <Users className="h-3 w-3" />
                              <span>All Creators (Global)</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* Action & Duration */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="space-y-1">
                          <span className="text-[11px] font-semibold text-slate-200 block">
                            Btn: &ldquo;{alert.action_label || 'Resolve'}&rdquo; &rarr; {alert.action_url || '/'}
                          </span>
                          <span className="text-[10px] text-slate-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Auto-dismiss: {alert.auto_duration_seconds}s
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(alert.id, alert.is_active)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer inline-flex items-center gap-1 ${
                            alert.is_active
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : 'bg-slate-800 text-slate-500 border-white/5'
                          }`}
                        >
                          <Power className="h-3 w-3" />
                          <span>{alert.is_active ? 'Active' : 'Paused'}</span>
                        </button>
                      </td>

                      {/* Resolved / Acknowledged count */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        <div className="font-bold text-emerald-400 text-sm">{alert.resolved_count || 0}</div>
                        <div className="text-[10px] text-slate-500">Resolutions</div>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Create Broadcast Alert Modal ──────────────────────── */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => !creating && setShowCreateModal(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0 bg-slate-950/50">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-md shadow-indigo-500/20">
                    <Radio className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Create In-App Alert</h3>
                    <p className="text-[11px] text-slate-400">Broadcast temporary popups with user resolution actions</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Target Audience */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">
                    Target Audience *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormTargetType('all')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        formTargetType === 'all'
                          ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm'
                          : 'bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Users className="h-4 w-4" />
                      <span>All Creators</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setFormTargetType('missing_bank')
                        setFormActionUrl('/dashboard/profile')
                        setFormActionLabel('Add Bank Details')
                      }}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        formTargetType === 'missing_bank'
                          ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-sm'
                          : 'bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Missing Bank</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormTargetType('specific_user')}
                      className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        formTargetType === 'specific_user'
                          ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                          : 'bg-slate-800/60 border-white/5 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      <Send className="h-4 w-4" />
                      <span>Specific User</span>
                    </button>
                  </div>
                </div>

                {/* Specific User identifier input */}
                {formTargetType === 'specific_user' && (
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                      Creator Influencer ID or Phone *
                    </label>
                    <Input
                      value={formUserIdentifier}
                      onChange={e => setFormUserIdentifier(e.target.value)}
                      placeholder="e.g. HY24617 or mobile number"
                      className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl"
                      required
                    />
                  </div>
                )}

                {/* Alert Type / Severity */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1.5 block">
                    Alert Urgency / Type *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { key: 'warning', label: 'Action Req', color: 'amber' },
                      { key: 'critical', label: 'Critical', color: 'rose' },
                      { key: 'info', label: 'Notice', color: 'indigo' },
                      { key: 'success', label: 'Update', color: 'emerald' },
                    ].map(item => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setFormType(item.key as any)}
                        className={`py-2 px-2 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                          formType === item.key
                            ? 'bg-white/10 border-white/30 text-white font-bold'
                            : 'bg-slate-800/40 border-white/5 text-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Alert Title */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                    Alert Title *
                  </label>
                  <Input
                    value={formTitle}
                    onChange={e => setFormTitle(e.target.value)}
                    placeholder="e.g. Bank Details Missing — Payout On Hold"
                    className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl"
                    required
                  />
                </div>

                {/* Alert Message */}
                <div>
                  <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                    Message Description *
                  </label>
                  <textarea
                    value={formMessage}
                    onChange={e => setFormMessage(e.target.value)}
                    rows={3}
                    placeholder="Describe what happened or what action the creator must take..."
                    className="w-full bg-slate-800 border border-white/10 text-white placeholder:text-slate-500 text-xs rounded-xl p-3 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none leading-relaxed"
                    required
                  />
                </div>

                {/* Action Button Link & Label */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                      Button Label
                    </label>
                    <Input
                      value={formActionLabel}
                      onChange={e => setFormActionLabel(e.target.value)}
                      placeholder="e.g. Add Bank Details"
                      className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                      Target Link
                    </label>
                    <Input
                      value={formActionUrl}
                      onChange={e => setFormActionUrl(e.target.value)}
                      placeholder="/dashboard/profile"
                      className="bg-slate-800 border-white/10 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl"
                    />
                  </div>
                </div>

                {/* Duration & Options */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1 block">
                      Auto-Dismiss (Seconds)
                    </label>
                    <Input
                      type="number"
                      min={4}
                      max={60}
                      value={formDuration}
                      onChange={e => setFormDuration(e.target.value)}
                      className="bg-slate-800 border-white/10 text-white text-xs h-10 rounded-xl"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                      <input
                        type="checkbox"
                        checked={formAutoResolveBank}
                        onChange={e => setFormAutoResolveBank(e.target.checked)}
                        className="rounded bg-slate-800 border-white/10 text-indigo-600 focus:ring-0"
                      />
                      <span>Auto-resolve when bank details added</span>
                    </label>
                  </div>
                </div>

                {/* Live Preview Card */}
                <div className="mt-3 pt-3 border-t border-white/10">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">Live Creator Popup Preview (Top of Dashboard):</p>
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xl space-y-2 text-slate-900 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                        {formType}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono font-medium">{formDuration}s timer</span>
                    </div>
                    <p className="text-xs font-bold text-slate-900 leading-snug">{formTitle || 'Sample Alert Title'}</p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">{formMessage || 'Sample alert message description...'}</p>
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
                      <span className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 text-[10px] font-bold shadow-xs">
                        {formActionLabel || 'Action'}
                      </span>
                      <span className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-[10px] font-semibold border border-slate-200">
                        Resolved (Don&apos;t show again)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Submit buttons */}
                <div className="pt-3 border-t border-white/10 flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 h-10 rounded-xl border-white/10 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer bg-transparent"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating}
                    className="flex-1 h-10 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs cursor-pointer shadow-lg shadow-indigo-600/20"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                        Launching...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-1.5" />
                        Launch In-App Alert
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
