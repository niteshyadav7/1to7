'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Package,
  FileCheck,
  BadgeIndianRupee,
  Users,
  CheckCircle2,
  AlertTriangle,
  Search,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Filter,
  Shield,
  Clock,
  ArrowRight,
  User,
  ChevronDown,
  Layers,
  Camera
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import {
  CampaignPendingItem,
  AssignedPocInfo,
  PendingTrackerResponse
} from '@/app/api/admin/poc-dashboard/pending-tracker/route'

interface PocActionTrackerProps {
  currentAdminId?: string
  isSuperAdmin?: boolean
}

export function PocActionTracker({ currentAdminId, isSuperAdmin = false }: PocActionTrackerProps) {
  const [data, setData] = useState<PendingTrackerResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPocId, setSelectedPocId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [onlyPending, setOnlyPending] = useState(false)
  const [copiedSummary, setCopiedSummary] = useState(false)
  const [currentDateTime, setCurrentDateTime] = useState('')

  // Initialize selected POC ID based on role
  useEffect(() => {
    if (currentAdminId && !isSuperAdmin) {
      setSelectedPocId(currentAdminId)
    }
  }, [currentAdminId, isSuperAdmin])

  // Update live clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentDateTime(
        now.toLocaleDateString('en-IN', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      )
    }
    updateTime()
    const timer = setInterval(updateTime, 30000)
    return () => clearInterval(timer)
  }, [])

  // Fetch Tracker Data
  const fetchData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)

      const params = new URLSearchParams()
      if (selectedPocId && selectedPocId !== 'all') {
        params.append('pocId', selectedPocId)
      } else if (!isSuperAdmin && currentAdminId) {
        params.append('pocId', currentAdminId)
      }
      if (search) params.append('search', search)
      if (onlyPending) params.append('onlyPending', 'true')

      const res = await fetch(`/api/admin/poc-dashboard/pending-tracker?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Failed to fetch pending tracker')
      setData(json)
    } catch (err: any) {
      console.error('Error loading pending tracker:', err)
      toast.error(err.message || 'Failed to load daily action tracker')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedPocId, search, onlyPending, isSuperAdmin, currentAdminId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Filter campaigns locally for fast reactivity
  const filteredCampaigns = useMemo(() => {
    if (!data?.campaigns) return []
    let list = [...data.campaigns]

    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(
        c =>
          c.brandName.toLowerCase().includes(q) ||
          c.campaignCode.toLowerCase().includes(q) ||
          c.assignedPocs.some(p => p.name.toLowerCase().includes(q))
      )
    }

    if (onlyPending) {
      list = list.filter(c => c.totalCriticalPending > 0)
    }

    return list
  }, [data?.campaigns, search, onlyPending])

  // Copy structured text summary for WhatsApp / Slack
  const handleCopySummary = () => {
    if (!data) return
    const s = data.summary
    const pocName = data.selectedPoc ? data.selectedPoc.name : isSuperAdmin ? 'All Team (Consolidated)' : 'My Assigned Campaigns'
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

    const text = [
      `📊 *Daily POC Action Tracker - ${today}*`,
      `👤 *POC / Manager:* ${pocName}`,
      `🎯 *Assigned Campaigns:* ${s.totalAssignedCampaigns}`,
      `──────────────────────`,
      `📦 *Order Forms Pending Verification:* ${s.totalPendingOrders}`,
      `📝 *Completion Deliverables Pending Review:* ${s.totalPendingDeliverables}`,
      `💰 *Payment Requests Pending Approval:* ${s.totalPendingPayments}`,
      `👥 *New Applications to Shortlist:* ${s.totalPendingApplications}`,
      `──────────────────────`,
      s.isAllClear
        ? `✅ *Status: 100% ALL CLEAR (0 Critical Pending Tasks)*`
        : `⚠️ *Status: Action Required (${s.totalCriticalPending} Pending Forms to Review)*`,
    ].join('\n')

    navigator.clipboard.writeText(text)
    setCopiedSummary(true)
    toast.success('Summary copied to clipboard for WhatsApp / Slack!')
    setTimeout(() => setCopiedSummary(false), 2500)
  }

  const summary = data?.summary || {
    totalAssignedCampaigns: 0,
    totalPendingOrders: 0,
    totalPendingDeliverables: 0,
    totalPendingPayments: 0,
    totalPendingApplications: 0,
    totalCriticalPending: 0,
    isAllClear: true,
  }

  return (
    <div id="poc-action-tracker-card" className="space-y-5">
      {/* ─── 1. Screenshot-Ready Executive Card ───────────────── */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-white/10 p-5 sm:p-6 shadow-2xl overflow-hidden ring-1 ring-white/5">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className={`absolute bottom-0 left-0 w-80 h-80 ${summary.isAllClear ? 'bg-emerald-500/5' : 'bg-rose-500/5'} rounded-full blur-3xl pointer-events-none -ml-20 -mb-20`} />

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl border shadow-lg ${
              summary.isAllClear
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
            }`}>
              {summary.isAllClear ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Daily Campaign Action Tracker
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  Screenshot-Ready View
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                <span>{currentDateTime}</span>
                <span>•</span>
                <span className="font-semibold text-slate-300">
                  {summary.totalAssignedCampaigns} Assigned Campaign{summary.totalAssignedCampaigns !== 1 ? 's' : ''}
                </span>
              </p>
            </div>
          </div>

          {/* Controls: POC Switcher (for Super Admin), Copy Text, Refresh */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            {/* POC Switcher */}
            {isSuperAdmin && data?.allStaff && data.allStaff.length > 0 && (
              <div className="relative">
                <select
                  value={selectedPocId}
                  onChange={(e) => setSelectedPocId(e.target.value)}
                  className="bg-slate-800/90 border border-white/10 hover:border-white/20 text-white text-xs rounded-xl px-3 py-2 pr-7 font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm"
                  title="Switch between POCs to audit pending tasks"
                >
                  <option value="all">👥 All Team Campaigns (Consolidated)</option>
                  {data.allStaff.map(staff => (
                    <option key={staff.id} value={staff.id}>
                      👤 {staff.name} ({staff.roleDisplayName || staff.role})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            )}

            {/* Copy Summary Text */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="bg-slate-800/80 hover:bg-slate-700/80 border-white/10 text-slate-200 text-xs h-9 cursor-pointer shadow-sm font-semibold flex items-center gap-1.5"
              title="Copy formatted summary to paste in WhatsApp or Slack"
            >
              {copiedSummary ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-slate-400" />}
              <span>{copiedSummary ? 'Copied!' : 'Copy Summary'}</span>
            </Button>

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing}
              className="bg-slate-800/80 hover:bg-slate-700/80 border-white/10 text-slate-200 text-xs h-9 w-9 p-0 cursor-pointer shadow-sm"
              title="Refresh tracker counts"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-indigo-400' : 'text-slate-400'}`} />
            </Button>
          </div>
        </div>

        {/* Daily Compliance Health Banner */}
        <div className="relative z-10 pt-4">
          {summary.isAllClear ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 p-3.5 rounded-xl shadow-lg shadow-emerald-500/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 font-extrabold text-sm border border-emerald-500/30">
                  ✓
                </div>
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>100% Caught Up! All Assigned Campaigns Clear</span>
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  </p>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    Zero order verifications, deliverables, or payment forms pending. Ready for your daily EOD screenshot!
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs whitespace-nowrap self-end sm:self-auto">
                All Clear ✓
              </span>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-500/15 via-amber-500/10 to-rose-500/15 border border-rose-500/30 p-3.5 rounded-xl shadow-lg shadow-rose-500/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 font-extrabold text-sm border border-rose-500/30">
                  {summary.totalCriticalPending}
                </div>
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Action Required: {summary.totalCriticalPending} Pending Form Submission{summary.totalCriticalPending !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    Influencers have submitted order details or completion proof. Resolve them below before sharing your screenshot.
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-extrabold text-xs whitespace-nowrap self-end sm:self-auto">
                {summary.totalCriticalPending} Pending Action{summary.totalCriticalPending !== 1 ? 's' : ''}
              </span>
            </motion.div>
          )}
        </div>

        {/* ─── 2. Top Summary KPI Cards (4 Cards) ─────────────── */}
        <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-3 pt-5">
          {/* 1. Order Forms Pending */}
          <Link
            href="/admin/order-details"
            className="group rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-amber-500/30 p-3.5 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-amber-400" />
                Order Forms
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                summary.totalPendingOrders > 0
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {summary.totalPendingOrders > 0 ? `${summary.totalPendingOrders} to Verify` : 'Clear ✓'}
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {summary.totalPendingOrders}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-amber-300 transition-colors flex items-center gap-1">
                Verify order placement proof ➔
              </p>
            </div>
          </Link>

          {/* 2. Completion Deliverables Pending */}
          <Link
            href="/admin/completion-details"
            className="group rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-indigo-500/30 p-3.5 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-indigo-400" />
                Completion Forms
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                summary.totalPendingDeliverables > 0
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {summary.totalPendingDeliverables > 0 ? `${summary.totalPendingDeliverables} Review` : 'Clear ✓'}
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {summary.totalPendingDeliverables}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-indigo-300 transition-colors flex items-center gap-1">
                Review reels & live links ➔
              </p>
            </div>
          </Link>

          {/* 3. Payment Forms Pending */}
          <Link
            href="/admin/payments"
            className="group rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-purple-500/30 p-3.5 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <BadgeIndianRupee className="h-3.5 w-3.5 text-purple-400" />
                Payment Forms
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                summary.totalPendingPayments > 0
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
              }`}>
                {summary.totalPendingPayments > 0 ? `${summary.totalPendingPayments} to Approve` : 'Clear ✓'}
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {summary.totalPendingPayments}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-purple-300 transition-colors flex items-center gap-1">
                POC approval for finance ➔
              </p>
            </div>
          </Link>

          {/* 4. New Applications to Shortlist */}
          <Link
            href="/admin/campaigns"
            className="group rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-blue-500/30 p-3.5 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-blue-400" />
                New Applicants
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {summary.totalPendingApplications}
              </span>
            </div>
            <div className="mt-2.5">
              <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">
                {summary.totalPendingApplications}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-blue-300 transition-colors flex items-center gap-1">
                Shortlist & approve profiles ➔
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* ─── 3. Campaign-wise Action Items Matrix ───────────── */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
        {/* Table Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>Campaign Breakdown</span>
              <span className="text-xs text-slate-400 font-normal">
                ({filteredCampaigns.length} campaign{filteredCampaigns.length !== 1 ? 's' : ''})
              </span>
            </h3>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search Filter */}
            <div className="relative min-w-[200px] flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <Input
                type="text"
                placeholder="Search brand or code..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-8.5 bg-slate-800/80 border-white/10 text-white text-xs rounded-xl focus:ring-indigo-500"
              />
            </div>

            {/* Toggle Only Pending Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOnlyPending(!onlyPending)}
              className={`h-8.5 text-xs rounded-xl border transition-all cursor-pointer font-semibold ${
                onlyPending
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-white/10 hover:text-white'
              }`}
            >
              <Filter className="h-3 w-3 mr-1.5" />
              {onlyPending ? 'Showing Pending Only' : 'Show Pending Only'}
            </Button>
          </div>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <RefreshCw className="h-6 w-6 text-indigo-400 animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading campaign action tracker...</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">No pending items found!</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {onlyPending
                ? 'All campaigns are completely clear of pending forms. Toggle filter to see all campaigns.'
                : 'No campaigns match your search query.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar -mx-5 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">Campaign / Brand</th>
                  <th className="py-2.5 px-3">Assigned POC</th>
                  <th className="py-2.5 px-3 text-center">📦 Orders Pending</th>
                  <th className="py-2.5 px-3 text-center">📝 Deliverables Pending</th>
                  <th className="py-2.5 px-3 text-center">💰 Payment Forms</th>
                  <th className="py-2.5 px-3 text-center">👥 Applicants</th>
                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCampaigns.map((c) => (
                  <tr
                    key={c.id}
                    className={`hover:bg-white/[0.02] transition-colors ${
                      c.totalCriticalPending > 0 ? 'bg-amber-500/[0.02]' : ''
                    }`}
                  >
                    {/* Brand / Campaign */}
                    <td className="py-3 px-3">
                      <div className="space-y-0.5">
                        <p className="font-bold text-white text-xs">{c.brandName}</p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-[10px] text-indigo-400">{c.campaignCode}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-white/5">
                            {c.platform}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Assigned POCs */}
                    <td className="py-3 px-3">
                      {c.assignedPocs.length > 0 ? (
                        <div className="flex items-center gap-1 flex-wrap">
                          {c.assignedPocs.map((poc) => (
                            <span
                              key={poc.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-slate-800 border border-white/10 text-slate-300 font-medium"
                              title={poc.email}
                            >
                              <User className="h-2.5 w-2.5 text-indigo-400" />
                              {poc.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Orders Pending */}
                    <td className="py-3 px-3 text-center">
                      {c.pendingOrders > 0 ? (
                        <Link
                          href={c.quickLinks.ordersUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold transition-all"
                          title="Click to review order placement proofs"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>{c.pendingOrders} Pending</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20">
                          ✓ Clear
                        </span>
                      )}
                    </td>

                    {/* Deliverables Pending */}
                    <td className="py-3 px-3 text-center">
                      {c.pendingDeliverables > 0 ? (
                        <Link
                          href={c.quickLinks.completionUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 font-bold transition-all"
                          title="Click to review live reels and analytics proof"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>{c.pendingDeliverables} Review</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20">
                          ✓ Clear
                        </span>
                      )}
                    </td>

                    {/* Payment Forms Pending */}
                    <td className="py-3 px-3 text-center">
                      {c.pendingPayments > 0 ? (
                        <Link
                          href={c.quickLinks.paymentsUrl}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold transition-all"
                          title="Click to approve payment requests for finance"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          <span>{c.pendingPayments} Pending</span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20">
                          ✓ Clear
                        </span>
                      )}
                    </td>

                    {/* Applicants to Shortlist */}
                    <td className="py-3 px-3 text-center">
                      <Link
                        href={c.quickLinks.applicationsUrl}
                        className="text-slate-300 hover:text-white font-mono font-semibold hover:underline"
                        title="View applications to shortlist"
                      >
                        {c.pendingApplications}
                      </Link>
                    </td>

                    {/* Action Button */}
                    <td className="py-3 px-3 text-right">
                      {c.isClear ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2 py-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          All Clear
                        </span>
                      ) : (
                        <Link
                          href={
                            c.pendingOrders > 0
                              ? c.quickLinks.ordersUrl
                              : c.pendingDeliverables > 0
                              ? c.quickLinks.completionUrl
                              : c.quickLinks.paymentsUrl
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                        >
                          <span>Resolve</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
