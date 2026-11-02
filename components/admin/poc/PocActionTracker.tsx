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
  Camera,
  Building2,
  Truck,
  Video,
  Globe,
  Smartphone,
  Send,
  AlertCircle,
  PhoneCall
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { PocActionTrackerSkeleton } from '@/components/admin/poc/PocSkeletons'
import {
  CampaignPendingItem,
  AssignedPocInfo,
  PendingTrackerResponse
} from '@/app/api/admin/poc-dashboard/pending-tracker/route'
import {
  PocOperationsMode,
  filterPocCampaignsByMode,
  calculateBrandHitRate,
  calculateSlaStatus
} from '@/lib/utils/poc-utils'

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
  const [opsMode, setOpsMode] = useState<PocOperationsMode>('360')
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

  // Filter campaigns locally for fast reactivity and ops mode
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

    return filterPocCampaignsByMode(list, opsMode, onlyPending)
  }, [data?.campaigns, search, opsMode, onlyPending])

  // Copy structured 360° text summary for WhatsApp / Slack
  const handleCopySummary = () => {
    if (!data) return
    const s = data.summary
    const pocName = data.selectedPoc ? data.selectedPoc.name : isSuperAdmin ? 'All Team (Consolidated)' : 'My Assigned Campaigns'
    const today = new Date().toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })

    const lines: string[] = [
      `📊 *1to7 Daily POC 360° Action Tracker - ${today}*`,
      `👤 *POC / Manager:* ${pocName}`,
      `🎯 *Assigned Campaigns:* ${s.totalAssignedCampaigns}`,
      `──────────────────────`,
      `📱 *CREATOR OPERATIONS:*`,
      `📦 Order Forms Pending: ${s.totalPendingOrders}`,
      `📝 Deliverables Pending Review: ${s.totalPendingDeliverables}`,
      `💰 Payment Requests Pending: ${s.totalPendingPayments}`,
      `👥 New Applicants to Screen: ${s.totalPendingApplications}`,
      `──────────────────────`,
      `🏢 *BRAND & KAM OPERATIONS:*`,
      `🎯 Pitched to Brands: ${s.totalBrandPitched || 0} Awaiting Decision`,
      `⏱️ SLA Breaches (>48h): ${s.totalBrandSlaBreaches || 0} Urgent Follow-ups`,
      `⚠️ SLA Warnings (>24h): ${s.totalBrandSlaWarnings || 0} Delays`,
      `🚚 Brand Dispatch Ready: ${s.totalBrandDispatchPending || 0} Addresses to Ship`,
      `🎬 Brand Content QA: ${s.totalBrandContentPending || 0} in Review`,
      `──────────────────────`,
    ]

    const totalActions = (s.totalCriticalPending || 0) + (s.totalBrandCriticalPending || 0)
    if (totalActions === 0) {
      lines.push(`✅ *Status: 100% ALL CLEAR (0 Critical Creator or Brand Bottlenecks)*`)
    } else {
      lines.push(`⚠️ *Status: Action Required (${s.totalCriticalPending} Creator Forms | ${s.totalBrandCriticalPending || 0} Brand Actions)*`)
    }

    navigator.clipboard.writeText(lines.join('\n'))
    setCopiedSummary(true)
    toast.success('360° Summary copied to clipboard for WhatsApp / Slack!')
    setTimeout(() => setCopiedSummary(false), 2500)
  }

  if (loading && !data) {
    return <PocActionTrackerSkeleton />
  }

  const summary = data?.summary || {
    totalAssignedCampaigns: 0,
    totalPendingOrders: 0,
    totalPendingDeliverables: 0,
    totalPendingPayments: 0,
    totalPendingApplications: 0,
    totalCriticalPending: 0,
    isAllClear: true,
    totalBrandPitched: 0,
    totalBrandApproved: 0,
    totalBrandRejected: 0,
    totalBrandSlaWarnings: 0,
    totalBrandSlaBreaches: 0,
    totalBrandDispatchPending: 0,
    totalBrandContentPending: 0,
    totalBrandCriticalPending: 0,
    isBrandAllClear: true,
    totalCombinedPending: 0,
  }

  const isCompleteClear = summary.isAllClear && (summary.isBrandAllClear !== false)
  const combinedPendingCount = summary.totalCombinedPending ?? (summary.totalCriticalPending + (summary.totalBrandCriticalPending || 0))

  return (
    <div id="poc-action-tracker-card" className="space-y-5">
      {/* ─── 1. Screenshot-Ready Executive Card ───────────────── */}
      <div className="relative rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border border-white/10 p-5 sm:p-6 shadow-2xl overflow-hidden ring-1 ring-white/5">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className={`absolute bottom-0 left-0 w-80 h-80 ${isCompleteClear ? 'bg-emerald-500/5' : 'bg-rose-500/5'} rounded-full blur-3xl pointer-events-none -ml-20 -mb-20`} />

        {/* Top Header Row */}
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className={`p-3 rounded-2xl border shadow-lg ${
              isCompleteClear
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-amber-500/15 border-amber-500/30 text-amber-400 animate-pulse'
            }`}>
              {isCompleteClear ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Daily Campaign & Brand Action Tracker
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                  Screenshot-Ready 360°
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

          {/* Controls: Mode Switcher, POC Switcher, Copy Text, Refresh */}
          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            {/* Ops Mode Switcher Pill */}
            <div className="flex items-center p-1 rounded-xl bg-slate-800/90 border border-white/10 shadow-sm text-xs font-semibold">
              <button
                type="button"
                onClick={() => setOpsMode('360')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  opsMode === '360'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="View Creator and Brand operations together"
              >
                <Globe className="h-3 w-3" />
                <span>360° All</span>
              </button>
              <button
                type="button"
                onClick={() => setOpsMode('creator')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  opsMode === 'creator'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Focus on creator order and completion verification"
              >
                <Smartphone className="h-3 w-3" />
                <span>Creator Ops</span>
              </button>
              <button
                type="button"
                onClick={() => setOpsMode('brand')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  opsMode === 'brand'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Focus on brand pitches, SLA, and dispatch readiness"
              >
                <Building2 className="h-3 w-3" />
                <span>Brand & KAM</span>
              </button>
            </div>

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
              title="Copy 360° summary to paste in WhatsApp or Slack"
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
          {isCompleteClear ? (
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
                    <span>100% Caught Up! All Assigned Creator & Brand Tasks Clear</span>
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  </p>
                  <p className="text-xs text-emerald-300/80 mt-0.5">
                    Zero order verifications, completion proofs, or brand SLA bottlenecks pending. Ready for your daily EOD screenshot!
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-extrabold text-xs whitespace-nowrap self-end sm:self-auto">
                360° Clear ✓
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
                  {combinedPendingCount}
                </div>
                <div>
                  <p className="text-sm font-bold text-white flex items-center gap-1.5">
                    <span>Action Required: {combinedPendingCount} Pending Operations Bottleneck{combinedPendingCount !== 1 ? 's' : ''}</span>
                  </p>
                  <p className="text-xs text-rose-300/80 mt-0.5">
                    {summary.totalCriticalPending} creator form submissions & {summary.totalBrandCriticalPending || 0} brand curation/SLA actions require resolution.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                {Number(summary.totalBrandSlaBreaches || 0) > 0 && (
                  <span className="px-2.5 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 font-extrabold text-xs flex items-center gap-1 animate-pulse">
                    <Clock className="h-3 w-3" />
                    {summary.totalBrandSlaBreaches} SLA Breaches (&gt;48h)
                  </span>
                )}
                <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 font-extrabold text-xs whitespace-nowrap">
                  {combinedPendingCount} Actions Pending
                </span>
              </div>
            </motion.div>
          )}
        </div>

        {/* ─── 2. Top Summary KPI Cards (Tier 1: Creator Ops) ─────── */}
        {(opsMode === '360' || opsMode === 'creator') && (
          <div className="relative z-10 pt-5 space-y-2">
            {opsMode === '360' && (
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5 text-indigo-400">
                  <Smartphone className="h-3.5 w-3.5" />
                  Creator Operations Stream
                </span>
                <span className="text-slate-500">Influencer Admin Pipeline</span>
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Order Forms Pending */}
              <Link
                href="/admin/order-details?status=Pending"
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
                href="/admin/completion-details?tab=pending"
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
                href="/admin/payments?status=Payment+Requested"
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
                href="/admin/applications?status=Applied"
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
        )}

        {/* ─── 3. Brand Operations Pipeline (Tier 2: Brand & KAM Ops) ── */}
        {(opsMode === '360' || opsMode === 'brand') && (
          <div className="relative z-10 pt-5 space-y-2">
            {opsMode === '360' && (
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Building2 className="h-3.5 w-3.5" />
                  Brand & KAM Operations Stream
                </span>
                <span className="text-slate-500">Brand Admin Portal Pipeline</span>
              </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 1. Pitched to Brands Pending Review */}
              <Link
                href="/brand-admin/campaign-pitches"
                className="group rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-amber-500/30 p-3.5 transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    Pitched to Brands
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    (summary.totalBrandPitched || 0) > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {(summary.totalBrandPitched || 0) > 0 ? `${summary.totalBrandPitched} Pending` : 'Clear ✓'}
                  </span>
                </div>
                <div className="mt-2.5">
                  <p className="text-xl sm:text-2xl font-extrabold text-[#febd1c] font-mono">
                    {summary.totalBrandPitched || 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-amber-300 transition-colors flex items-center gap-1">
                    Awaiting brand decision ➔
                  </p>
                </div>
              </Link>

              {/* 2. SLA Urgent Bottlenecks */}
              <Link
                href="/brand-admin/reviews-sla"
                className="group rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-red-500/30 p-3.5 transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-red-400" />
                    Brand SLA Delay
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    (summary.totalBrandSlaBreaches || 0) > 0
                      ? 'bg-red-500/20 text-red-300 border-red-500/30 animate-pulse'
                      : (summary.totalBrandSlaWarnings || 0) > 0
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}>
                    {(summary.totalBrandSlaBreaches || 0) > 0
                      ? `${summary.totalBrandSlaBreaches} Breached`
                      : (summary.totalBrandSlaWarnings || 0) > 0
                      ? `${summary.totalBrandSlaWarnings} Warning`
                      : 'On Track ✓'}
                  </span>
                </div>
                <div className="mt-2.5">
                  <p className="text-xl sm:text-2xl font-extrabold text-red-400 font-mono">
                    {(summary.totalBrandSlaBreaches || 0) + (summary.totalBrandSlaWarnings || 0)}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-red-300 transition-colors flex items-center gap-1">
                    Follow-up with client brands ➔
                  </p>
                </div>
              </Link>

              {/* 3. Brand Dispatch Courier Readiness */}
              <Link
                href="/brand-admin/brand-dispatch"
                className="group rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-emerald-500/30 p-3.5 transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-emerald-400" />
                    Brand Dispatch
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    (summary.totalBrandDispatchPending || 0) > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border-white/5'
                  }`}>
                    {(summary.totalBrandDispatchPending || 0) > 0 ? `${summary.totalBrandDispatchPending} to Ship` : 'Clear ✓'}
                  </span>
                </div>
                <div className="mt-2.5">
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono">
                    {summary.totalBrandDispatchPending || 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-emerald-300 transition-colors flex items-center gap-1">
                    Approved, prepare courier list ➔
                  </p>
                </div>
              </Link>

              {/* 4. Brand Content QA */}
              <Link
                href="/brand-admin/campaign-pitches"
                className="group rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-white/5 hover:border-violet-500/30 p-3.5 transition-all shadow-sm flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Video className="h-3.5 w-3.5 text-violet-400" />
                    Brand Content QA
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                    (summary.totalBrandContentPending || 0) > 0
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/30'
                      : 'bg-slate-800 text-slate-400 border-white/5'
                  }`}>
                    {(summary.totalBrandContentPending || 0) > 0 ? `${summary.totalBrandContentPending} Review` : 'Clear ✓'}
                  </span>
                </div>
                <div className="mt-2.5">
                  <p className="text-xl sm:text-2xl font-extrabold text-violet-300 font-mono">
                    {summary.totalBrandContentPending || 0}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 group-hover:text-violet-300 transition-colors flex items-center gap-1">
                    Reels awaiting brand approval ➔
                  </p>
                </div>
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ─── 4. Campaign & Brand Action Matrix ──────────────── */}
      <div className="rounded-2xl bg-slate-900/90 border border-white/10 p-5 sm:p-6 shadow-xl space-y-4">
        {/* Table Controls Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>
                {opsMode === '360'
                  ? '360° Campaign & Brand Matrix'
                  : opsMode === 'brand'
                  ? 'Client Brand Pipeline Matrix'
                  : 'Creator Campaign Matrix'}
              </span>
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
                placeholder="Search brand, code or POC..."
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
          <div className="space-y-2 pt-2 animate-pulse">
            {[1, 2, 3, 4, 5].map((row) => (
              <div
                key={row}
                className="h-14 w-full rounded-xl bg-slate-950/40 border border-white/[0.03] flex items-center justify-between px-3 gap-2"
              >
                <div className="w-1/4 space-y-1.5">
                  <div className="h-3.5 w-28 rounded bg-slate-800/90" />
                  <div className="flex items-center gap-1">
                    <div className="h-2.5 w-16 rounded bg-slate-800/60" />
                    <div className="h-2.5 w-10 rounded bg-slate-800/50" />
                  </div>
                </div>
                <div className="w-1/6">
                  <div className="h-5 w-24 rounded-full bg-slate-800/80" />
                </div>
                <div className="w-1/8 flex justify-center">
                  <div className="h-6 w-16 rounded-md bg-slate-800/70" />
                </div>
                <div className="w-1/8 flex justify-center">
                  <div className="h-6 w-16 rounded-md bg-slate-800/70" />
                </div>
                <div className="w-1/8 flex justify-center">
                  <div className="h-6 w-16 rounded-md bg-slate-800/70" />
                </div>
                <div className="w-1/12 flex justify-center">
                  <div className="h-4 w-8 rounded bg-slate-800/60" />
                </div>
                <div className="w-1/8 flex justify-end">
                  <div className="h-7 w-20 rounded-lg bg-slate-800/90" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="py-12 text-center rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">No pending items found!</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {onlyPending
                ? 'All campaigns are completely clear of pending forms and brand SLA delays. Toggle filter to see all campaigns.'
                : 'No campaigns match your search query.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar -mx-5 sm:mx-0">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                  <th className="py-2.5 px-3">Campaign / Brand</th>
                  <th className="py-2.5 px-3">Assigned POC / KAM</th>

                  {/* Creator columns */}
                  {(opsMode === '360' || opsMode === 'creator') && (
                    <>
                      <th className="py-2.5 px-3 text-center">📦 Orders</th>
                      <th className="py-2.5 px-3 text-center">📝 Deliverables</th>
                      {opsMode === 'creator' && (
                        <>
                          <th className="py-2.5 px-3 text-center">💰 Payments</th>
                          <th className="py-2.5 px-3 text-center">👥 Applicants</th>
                        </>
                      )}
                    </>
                  )}

                  {/* Brand columns */}
                  {(opsMode === '360' || opsMode === 'brand') && (
                    <>
                      <th className="py-2.5 px-3 text-center">🎯 Pitched</th>
                      <th className="py-2.5 px-3 text-center">⏱️ Brand SLA</th>
                      <th className="py-2.5 px-3 text-center">🚚 Dispatch Ready</th>
                      {opsMode === 'brand' && (
                        <th className="py-2.5 px-3 text-center">🎬 Content QA</th>
                      )}
                    </>
                  )}

                  <th className="py-2.5 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredCampaigns.map((c) => {
                  const hasCreatorPending = (c.totalCriticalPending || 0) > 0
                  const hasBrandPending = (c.totalBrandCriticalPending || 0) > 0

                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        c.brandSlaBreaches > 0
                          ? 'bg-red-500/[0.03]'
                          : hasCreatorPending || hasBrandPending
                          ? 'bg-amber-500/[0.02]'
                          : ''
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
                            {c.brandContactName && (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-300/90 border border-amber-500/20"
                                title={`Client POC: ${c.brandContactName} ${c.brandContactPhone ? `(${c.brandContactPhone})` : ''}`}
                              >
                                👤 {c.brandContactName}
                              </span>
                            )}
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

                      {/* Creator: Orders Pending */}
                      {(opsMode === '360' || opsMode === 'creator') && (
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
                      )}

                      {/* Creator: Deliverables Pending */}
                      {(opsMode === '360' || opsMode === 'creator') && (
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
                      )}

                      {/* Creator: Payments & Applicants (when in creator view) */}
                      {opsMode === 'creator' && (
                        <>
                          <td className="py-3 px-3 text-center">
                            {c.pendingPayments > 0 ? (
                              <Link
                                href={c.quickLinks.paymentsUrl}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 font-bold transition-all"
                              >
                                <span>{c.pendingPayments} Pending</span>
                              </Link>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20">
                                ✓ Clear
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <Link
                              href={c.quickLinks.applicationsUrl}
                              className="text-slate-300 hover:text-white font-mono font-semibold hover:underline"
                            >
                              {c.pendingApplications}
                            </Link>
                          </td>
                        </>
                      )}

                      {/* Brand: Pitched to Brands */}
                      {(opsMode === '360' || opsMode === 'brand') && (
                        <td className="py-3 px-3 text-center">
                          {c.brandPitched > 0 ? (
                            <Link
                              href={c.quickLinks.brandPitchesUrl}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-[#febd1c] border border-amber-500/30 font-bold transition-all"
                              title="Creators waiting for brand review. Click to open pitch deck."
                            >
                              <Sparkles className="h-3 w-3" />
                              <span>{c.brandPitched} Pitched</span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-500 bg-slate-800/50 border border-white/5">
                              0 Pitched
                            </span>
                          )}
                        </td>
                      )}

                      {/* Brand: SLA Status */}
                      {(opsMode === '360' || opsMode === 'brand') && (
                        <td className="py-3 px-3 text-center">
                          {c.brandSlaBreaches > 0 ? (
                            <Link
                              href={c.quickLinks.brandSlaUrl}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 font-bold animate-pulse transition-all"
                              title="Brand delayed over 48 hours without decision. Click to view SLA Watchtower."
                            >
                              <Clock className="h-3 w-3" />
                              <span>{c.brandSlaBreaches} Breached (&gt;48h)</span>
                            </Link>
                          ) : c.brandSlaWarnings > 0 ? (
                            <Link
                              href={c.quickLinks.brandSlaUrl}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 font-semibold transition-all"
                              title="Brand delayed over 24 hours. Click to view SLA Watchtower."
                            >
                              <AlertCircle className="h-3 w-3" />
                              <span>{c.brandSlaWarnings} Warning (&gt;24h)</span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-emerald-400/80 bg-emerald-500/10 border border-emerald-500/20">
                              🟢 On Track
                            </span>
                          )}
                        </td>
                      )}

                      {/* Brand: Dispatch Ready */}
                      {(opsMode === '360' || opsMode === 'brand') && (
                        <td className="py-3 px-3 text-center">
                          {c.brandDispatchPending > 0 ? (
                            <Link
                              href={c.quickLinks.brandDispatchUrl}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 font-bold transition-all"
                              title="Approved by brand! Click to verify address and prep courier list."
                            >
                              <Truck className="h-3 w-3" />
                              <span>{c.brandDispatchPending} to Ship</span>
                            </Link>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold text-slate-500 bg-slate-800/50 border border-white/5">
                              ✓ Ready
                            </span>
                          )}
                        </td>
                      )}

                      {/* Brand: Content QA (when in brand mode) */}
                      {opsMode === 'brand' && (
                        <td className="py-3 px-3 text-center">
                          {c.brandContentPending > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold text-violet-300 bg-violet-500/20 border border-violet-500/30">
                              <Video className="h-3 w-3" />
                              {c.brandContentPending} in QA
                            </span>
                          ) : (
                            <span className="text-slate-500 text-[10px]">—</span>
                          )}
                        </td>
                      )}

                      {/* Quick Action Button */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If in Brand mode or brand has action */}
                          {(opsMode === 'brand' || (opsMode === '360' && hasBrandPending)) && (
                            <Link
                              href={c.quickLinks.brandPitchesUrl}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-[11px] border border-amber-500/30 shadow-sm transition-all"
                              title="Open Brand Curation Pitch Deck"
                            >
                              <span>Brand Desk</span>
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          )}

                          {/* If in Creator mode or creator has action */}
                          {(opsMode === 'creator' || (opsMode === '360' && hasCreatorPending)) && (
                            <Link
                              href={
                                c.pendingOrders > 0
                                  ? c.quickLinks.ordersUrl
                                  : c.pendingDeliverables > 0
                                  ? c.quickLinks.completionUrl
                                  : c.quickLinks.paymentsUrl
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] shadow-sm transition-all cursor-pointer"
                              title="Resolve Creator Operations forms"
                            >
                              <span>Resolve</span>
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}

                          {/* All Clear state */}
                          {!hasCreatorPending && !hasBrandPending && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold px-2 py-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              All Clear
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
