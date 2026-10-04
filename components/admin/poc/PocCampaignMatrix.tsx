'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Users,
  Megaphone,
  CheckCircle2,
  Clock,
  IndianRupee,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  Filter,
  Layers,
  ArrowUpRight,
  UserCheck,
  Instagram,
  Sparkles,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { CampaignPocSummary, AssignedPoc } from '@/app/api/admin/poc-dashboard/campaigns/route'

import { PocCampaignCreatorsChittha } from './PocCampaignCreatorsChittha'

interface PocCampaignMatrixProps {
  campaigns: CampaignPocSummary[]
  summary?: {
    totalCampaigns: number
    assignedCount: number
    unassignedCount: number
    totalApplications: number
    totalApproved: number
    totalCompleted: number
    totalPaid: number
    overallCompletionRate: number
  }
  loading: boolean
  allStaff: { id: string; name: string }[]
  onSelectPoc?: (pocId: string) => void
  hideOuterWrapper?: boolean
  searchQuery?: string
  onSearchChange?: (q: string) => void
  selectedPocFilter?: string
  onPocFilterChange?: (poc: string) => void
  selectedStatusFilter?: string
  onStatusFilterChange?: (status: string) => void
}

export function PocCampaignMatrix({
  campaigns,
  summary,
  loading,
  allStaff,
  onSelectPoc,
  hideOuterWrapper = false,
  searchQuery: externalSearchQuery,
  onSearchChange,
  selectedPocFilter: externalPocFilter,
  onPocFilterChange,
  selectedStatusFilter: externalStatusFilter,
  onStatusFilterChange,
}: PocCampaignMatrixProps) {
  const [internalSearchQuery, setInternalSearchQuery] = useState('')
  const [internalSelectedPocFilter, setInternalSelectedPocFilter] = useState<string>('all')
  const [internalSelectedStatusFilter, setInternalSelectedStatusFilter] = useState<string>('all')
  const [expandedCampaignId, setExpandedCampaignId] = useState<string | null>(null)
  const [drawerTabs, setDrawerTabs] = useState<Record<string, 'pocs' | 'creators'>>({})

  const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery
  const selectedPocFilter = externalPocFilter !== undefined ? externalPocFilter : internalSelectedPocFilter
  const selectedStatusFilter = externalStatusFilter !== undefined ? externalStatusFilter : internalSelectedStatusFilter

  const setSearchQuery = (val: string) => {
    setInternalSearchQuery(val)
    if (onSearchChange) onSearchChange(val)
  }

  const setSelectedPocFilter = (val: string) => {
    setInternalSelectedPocFilter(val)
    if (onPocFilterChange) onPocFilterChange(val)
  }

  const setSelectedStatusFilter = (val: string) => {
    setInternalSelectedStatusFilter(val)
    if (onStatusFilterChange) onStatusFilterChange(val)
  }

  // Filter campaigns by search, POC, and status
  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns]

    // 1. POC Filter
    if (selectedPocFilter === 'unassigned') {
      result = result.filter(c => !c.assignedPocs || c.assignedPocs.length === 0)
    } else if (selectedPocFilter !== 'all') {
      result = result.filter(c => c.pocAdminIds && c.pocAdminIds.includes(selectedPocFilter))
    }

    // 2. Status Filter
    if (selectedStatusFilter !== 'all') {
      result = result.filter(
        c => c.status.toLowerCase() === selectedStatusFilter.toLowerCase()
      )
    }

    // 3. Search Query (brand, code, platform, category, POC names)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(c => {
        const matchBrand = c.brandName.toLowerCase().includes(q)
        const matchCode = c.campaignCode.toLowerCase().includes(q)
        const matchPlatform = c.platform.toLowerCase().includes(q)
        const matchCategory = c.category.toLowerCase().includes(q)
        const matchPocs = c.assignedPocs?.some(poc =>
          poc.name.toLowerCase().includes(q) || poc.email.toLowerCase().includes(q)
        )
        return matchBrand || matchCode || matchPlatform || matchCategory || matchPocs
      })
    }

    return result
  }, [campaigns, searchQuery, selectedPocFilter, selectedStatusFilter])

  const toggleExpand = (campaignId: string) => {
    setExpandedCampaignId(prev => (prev === campaignId ? null : campaignId))
  }

  return (
    <div className={hideOuterWrapper ? 'space-y-4' : 'space-y-6'}>
      {/* ─── 1. EXECUTIVE KPI SUMMARY TILES ─── */}
      <div className={hideOuterWrapper ? 'p-4 sm:p-5 pb-0' : ''}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* Total Campaigns */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Megaphone className="w-3.5 h-3.5 text-blue-400" /> Total Campaigns
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 font-bold border border-blue-500/20">
              Live Matrix
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white">
              {summary ? summary.totalCampaigns : campaigns.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">campaigns tracked</span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full rounded-full w-full" />
          </div>
        </div>

        {/* Assigned vs Unassigned Coverage */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> POC Coverage
            </span>
            {summary && summary.unassignedCount > 0 ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-bold border border-amber-500/30 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" /> {summary.unassignedCount} Unassigned
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-bold border border-emerald-500/30">
                100% Covered
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-400">
              {summary ? summary.assignedCount : 0}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              with assigned staff ({summary && summary.totalCampaigns > 0 ? Math.round((summary.assignedCount / summary.totalCampaigns) * 100) : 0}%)
            </span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${summary && summary.totalCampaigns > 0 ? (summary.assignedCount / summary.totalCampaigns) * 100 : 0}%`,
              }}
            />
            {summary && summary.unassignedCount > 0 && (
              <div
                className="bg-amber-500 h-full transition-all duration-500"
                style={{
                  width: `${(summary.unassignedCount / summary.totalCampaigns) * 100}%`,
                }}
              />
            )}
          </div>
        </div>

        {/* Total Applications Pipeline */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-indigo-400" /> Pipeline Creators
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 font-bold border border-indigo-500/20">
              Applications
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white">
              {(summary?.totalApplications || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({summary?.totalApproved || 0} approved)
            </span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-indigo-500 h-full transition-all duration-500"
              style={{
                width: `${summary && summary.totalApplications > 0 ? Math.min(100, (summary.totalApproved / summary.totalApplications) * 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Deliverables & Total Paid */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 backdrop-blur-xl shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between pb-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <IndianRupee className="w-3.5 h-3.5 text-emerald-400" /> Completed Payouts
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/20">
              {summary?.totalCompleted || 0} done
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-emerald-400">
              ₹{(summary?.totalPaid || 0).toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">disbursed</span>
          </div>
          <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{
                width: `${summary?.overallCompletionRate || 0}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>

      {/* ─── 2. SEARCH & CONTROLS TOOLBAR (Only shown in standalone mode) ─── */}
      <div className={hideOuterWrapper ? '' : 'rounded-2xl border border-white/[0.08] bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur-xl'}>
        {!hideOuterWrapper && (
          <div className="p-3.5 sm:p-4 border-b border-white/[0.08] flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-400" />
                Campaign Ownership &amp; POC Assignment Matrix
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-normal">
                  {filteredCampaigns.length} of {campaigns.length} Campaigns
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Track exactly which Operations POC is handling each campaign and review live operational velocity.
              </p>
            </div>

            {/* Controls: Search + POC Dropdown + Status Filter on 1 Single Line */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {/* Search Input */}
              <div className="relative w-full sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <Input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search campaign, code, POC..."
                  className="pl-8 pr-7 py-1 h-8.5 bg-slate-950/70 border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus-visible:ring-blue-500"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* POC Filter Dropdown */}
              <select
                value={selectedPocFilter}
                onChange={e => setSelectedPocFilter(e.target.value)}
                className="h-8.5 px-2.5 rounded-xl text-xs font-semibold bg-slate-950/70 border border-white/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-40 sm:w-44 truncate"
              >
                <option value="all">All Operations POCs</option>
                <option value="unassigned">⚠️ Unassigned Only</option>
                {allStaff.map(staff => (
                  <option key={staff.id} value={staff.id}>
                    👤 {staff.name}
                  </option>
                ))}
              </select>

              {/* Status Filter Dropdown */}
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="h-8.5 px-2 rounded-xl text-xs font-semibold bg-slate-950/70 border border-white/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-28 shrink-0"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="draft">Draft Only</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        )}

        {/* ─── 3. CAMPAIGN TABLE CONTENT ─── */}
        <div className={`overflow-x-auto ${hideOuterWrapper ? 'border-t border-white/[0.08]' : ''}`}>
          <table className="w-full text-left text-xs table-auto">
            <thead>
              <tr className="bg-slate-950/60 border-b border-white/[0.08] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-1.5 w-6 text-center"></th>
                <th className="py-2.5 px-2.5 min-w-[140px]">Campaign &amp; Brand</th>
                <th className="py-2.5 px-2.5 min-w-[125px]">Assigned POC(s)</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Platform &amp; Budget</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Apps</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Approved</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Done</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Completion</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap">Disbursed</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <span className="text-xs font-medium">Loading campaign matrix...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCampaigns.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-16 text-center text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Megaphone className="w-8 h-8 text-slate-600" />
                      <p className="font-semibold text-slate-400">No campaigns match your filters</p>
                      <p className="text-xs text-slate-500">Try changing the search keyword, POC filter, or time range.</p>
                      {(searchQuery || selectedPocFilter !== 'all' || selectedStatusFilter !== 'all') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSearchQuery('')
                            setSelectedPocFilter('all')
                            setSelectedStatusFilter('all')
                          }}
                          className="mt-2 h-8 text-xs border-white/10 text-slate-300"
                        >
                          Clear All Filters
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCampaigns.map(campaign => {
                  const isExpanded = expandedCampaignId === campaign.id
                  const hasPoc = campaign.assignedPocs && campaign.assignedPocs.length > 0

                  return (
                    <React.Fragment key={campaign.id}>
                      <tr
                        onClick={() => toggleExpand(campaign.id)}
                        className={`hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                          isExpanded ? 'bg-slate-800/30' : ''
                        }`}
                      >
                        {/* Expand Chevron Icon */}
                        <td className="py-2.5 px-1.5 text-center text-slate-500 group-hover:text-blue-400 transition-colors">
                          <motion.div
                            animate={{ rotate: isExpanded ? 90 : 0 }}
                            transition={{ duration: 0.15 }}
                            className="inline-block"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </motion.div>
                        </td>

                        {/* Campaign & Brand */}
                        <td className="py-2.5 px-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                              {campaign.brandName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white group-hover:text-blue-300 transition-colors truncate max-w-[140px]">
                                {campaign.brandName}
                              </p>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {campaign.campaignCode}
                                </span>
                                <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-white/5">
                                  {campaign.category}
                                </span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Assigned POCs */}
                        <td className="py-2.5 px-2.5">
                          {hasPoc ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {campaign.assignedPocs.map(poc => (
                                <button
                                  key={poc.id}
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation()
                                    onSelectPoc?.(poc.id)
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 text-blue-200 text-[11px] font-medium transition-all cursor-pointer"
                                  title={`Assigned POC: ${poc.name} (${poc.email}) - Click to inspect desk`}
                                >
                                  <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white text-[8px] font-bold flex items-center justify-center shrink-0">
                                    {poc.name.charAt(0).toUpperCase()}
                                  </span>
                                  <span className="truncate max-w-[80px]">{poc.name}</span>
                                </button>
                              ))}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[10px] font-medium">
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* Platform & Budget */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className="font-semibold text-slate-200 text-xs flex items-center justify-center gap-1">
                            <Instagram className="w-3 h-3 text-pink-400" />
                            {campaign.budgetType}
                          </span>
                          {campaign.budgetAmount > 0 && (
                            <span className="text-[10px] text-slate-400 font-mono block">
                              ₹{campaign.budgetAmount.toLocaleString()}
                            </span>
                          )}
                        </td>

                        {/* Total Apps */}
                        <td className="py-2.5 px-2 text-right font-medium text-slate-300 whitespace-nowrap">
                          {campaign.totalApplications}
                        </td>

                        {/* Approved */}
                        <td className="py-2.5 px-2 text-right font-bold text-blue-400 whitespace-nowrap">
                          <div>{campaign.approvedCount}</div>
                          {(campaign.pendingCount ?? Math.max(0, campaign.approvedCount - campaign.completedCount)) > 0 && (
                            <div className="text-[10px] font-normal text-amber-400/90 font-mono">
                              {campaign.pendingCount ?? Math.max(0, campaign.approvedCount - campaign.completedCount)} pending
                            </div>
                          )}
                        </td>

                        {/* Completed */}
                        <td className="py-2.5 px-2 text-right font-semibold text-emerald-400 whitespace-nowrap">
                          {campaign.completedCount}
                        </td>

                        {/* Completion Rate */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span className="font-mono text-[11px] font-semibold text-slate-300">
                            {campaign.completionRate}%
                          </span>
                          <div className="w-12 bg-slate-800 h-1 rounded-full mx-auto mt-0.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                campaign.completionRate >= 50
                                  ? 'bg-emerald-500'
                                  : campaign.completionRate > 0
                                  ? 'bg-amber-500'
                                  : 'bg-slate-700'
                              }`}
                              style={{ width: `${Math.min(100, campaign.completionRate)}%` }}
                            />
                          </div>
                        </td>

                        {/* Total Paid */}
                        <td className="py-2.5 px-2 text-right font-bold text-emerald-400 font-mono text-xs whitespace-nowrap">
                          {campaign.totalPaid > 0 ? `₹${campaign.totalPaid.toLocaleString()}` : '₹0'}
                        </td>

                        {/* Status */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold border ${
                              campaign.status === 'Active' || campaign.isLive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-slate-800 text-slate-400 border-white/5'
                            }`}
                          >
                            {campaign.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-2 text-center whitespace-nowrap" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setExpandedCampaignId(prev => (prev === campaign.id ? null : campaign.id))
                                setDrawerTabs(prev => ({ ...prev, [campaign.id]: 'creators' }))
                              }}
                              className="px-2 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-600 text-blue-300 hover:text-white font-bold text-[10px] transition-colors cursor-pointer flex items-center gap-1"
                              title="Inspect Creators Chittha"
                            >
                              <span>Chittha 🔍</span>
                            </button>
                            <Link
                              href={`/admin/campaigns/${campaign.id}`}
                              className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                              title="Campaign Settings"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                          </div>
                        </td>
                      </tr>

                      {/* ─── INLINE EXPANDED SUB-ROW DRAWER ─── */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr className="bg-slate-950/80 border-b border-white/[0.08]">
                            <td colSpan={11} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 sm:p-5 border-l-2 border-blue-500 bg-slate-900/40 space-y-4 m-2 rounded-xl border border-white/[0.06]">
                                  {/* Sub-Header & Segmented Drawer Tabs */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                                    <div className="flex items-center gap-2">
                                      {/* Drawer Tab Switcher */}
                                      <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-950 border border-white/10">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDrawerTabs(prev => ({ ...prev, [campaign.id]: 'pocs' }))
                                          }
                                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            (drawerTabs[campaign.id] || 'pocs') === 'pocs'
                                              ? 'bg-blue-600 text-white shadow'
                                              : 'text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          <Users className="w-3.5 h-3.5" />
                                          <span>Assigned POCs ({campaign.assignedPocs?.length || 0})</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setDrawerTabs(prev => ({ ...prev, [campaign.id]: 'creators' }))
                                          }
                                          className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                            drawerTabs[campaign.id] === 'creators'
                                              ? 'bg-blue-600 text-white shadow'
                                              : 'text-slate-400 hover:text-white'
                                          }`}
                                        >
                                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                                          <span>Creators Chittha ({campaign.totalApplications})</span>
                                        </button>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <Link
                                        href={`/admin/campaigns/${campaign.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5" />
                                        Campaign Settings
                                      </Link>
                                      <Link
                                        href={`/admin/applications/${campaign.id}`}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-sm"
                                      >
                                        <Users className="w-3.5 h-3.5" />
                                        Full Applications Desk ↗
                                      </Link>
                                    </div>
                                  </div>

                                  {/* Tab Content: POCs or Creators Chittha */}
                                  {(drawerTabs[campaign.id] || 'pocs') === 'pocs' ? (
                                    <>
                                      {hasPoc ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                                          {campaign.assignedPocs.map(poc => (
                                            <div
                                              key={poc.id}
                                              className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between gap-3"
                                            >
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <div className="w-9 h-9 rounded-xl bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-sm flex items-center justify-center shrink-0">
                                                  {poc.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0">
                                                  <p className="text-xs font-bold text-white truncate">
                                                    {poc.name}
                                                  </p>
                                                  <p className="text-[10px] text-slate-400 font-mono truncate">
                                                    {poc.email}
                                                  </p>
                                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-blue-300 border border-white/5 font-medium inline-block mt-0.5">
                                                    {poc.roleDisplayName}
                                                  </span>
                                                </div>
                                              </div>
                                              <button
                                                type="button"
                                                onClick={() => onSelectPoc?.(poc.id)}
                                                className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-600 text-blue-300 hover:text-white text-[11px] font-bold transition-colors cursor-pointer shrink-0"
                                              >
                                                Inspect Desk ↗
                                              </button>
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-4">
                                          <div className="flex items-center gap-3">
                                            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                                            <div>
                                              <p className="text-xs font-bold text-amber-200">
                                                No Operations POC Assigned
                                              </p>
                                              <p className="text-[11px] text-amber-300/70">
                                                This campaign currently has no designated staff owner. Assign an Operations Admin to ensure applicant approvals are tracked.
                                              </p>
                                            </div>
                                          </div>
                                          <Link
                                            href={`/admin/campaigns/${campaign.id}`}
                                            className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors shrink-0"
                                          >
                                            Assign POC Now
                                          </Link>
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <PocCampaignCreatorsChittha
                                      campaignId={campaign.id}
                                      brandName={campaign.brandName}
                                      campaignCode={campaign.campaignCode}
                                      assignedPocNames={campaign.assignedPocs?.map(p => p.name) || []}
                                    />
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
