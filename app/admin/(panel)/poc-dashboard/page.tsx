'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Award,
  Users,
  Megaphone,
  CheckCircle2,
  TrendingUp,
  Clock,
  IndianRupee,
  Layers,
  ChevronRight,
  ChevronDown,
  UserCheck,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  Download,
  Filter,
  Eye,
  Calendar,
  Shield,
  ArrowLeft,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import { PocTrendChart } from '@/components/admin/poc/PocTrendChart'
import { PocLeaderboard } from '@/components/admin/poc/PocLeaderboard'
import { PocTableSkeleton, PocIndividualSkeleton } from '@/components/admin/poc/PocSkeletons'
import { PocCampaignMatrix } from '@/components/admin/poc/PocCampaignMatrix'
import { PocCampaignCreatorsChittha } from '@/components/admin/poc/PocCampaignCreatorsChittha'
import { CampaignPocSummary } from '@/app/api/admin/poc-dashboard/campaigns/route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'

type RangeKey = 'today' | 'yesterday' | '7d' | 'this_week' | 'last_week' | 'this_month' | '30d' | 'all'

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: '7d', label: 'Last 7 Days' },
  { key: 'this_week', label: 'This Week' },
  { key: 'last_week', label: 'Last Week' },
  { key: 'this_month', label: 'This Month' },
  { key: '30d', label: 'Last 30 Days' },
  { key: 'all', label: 'All Time' },
]

export default function PocDashboardPage() {
  const { admin, isSuperAdmin } = useAdminPermissions()
  const [activeTab, setActiveTab] = useState<'team' | 'campaigns' | 'individual'>('team')
  const [range, setRange] = useState<RangeKey>('all')
  const [granularity, setGranularity] = useState<'day' | 'week'>('day')
  const [loadingTeam, setLoadingTeam] = useState(true)
  const [loadingIndividual, setLoadingIndividual] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  // Team state
  const [teamData, setTeamData] = useState<{
    podium: any
    members: any[]
    trendData: any[]
  }>({
    podium: null,
    members: [],
    trendData: [],
  })

  // Search in team table
  const [memberSearch, setMemberSearch] = useState('')

  // Expand individual POC row in Team Ledger table
  const [expandedPocId, setExpandedPocId] = useState<string | null>(null)

  // Toggle ledger view: By Team (POC-Wise) vs By Brand / Campaign-Wise
  const [ledgerView, setLedgerView] = useState<'team' | 'campaigns'>(
    'team'
  )

  // Search and filter states for Campaign ledger view
  const [campaignSearch, setCampaignSearch] = useState('')
  const [campaignPocFilter, setCampaignPocFilter] = useState('all')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState('all')

  // Expand creators chittha inline under a campaign
  const [expandedCampaignChitthaId, setExpandedCampaignChitthaId] = useState<string | null>(null)

  // Overall Campaigns Matrix state
  const [campaignsData, setCampaignsData] = useState<{
    campaigns: CampaignPocSummary[]
    summary: any
    allStaff: { id: string; name: string }[]
  }>({
    campaigns: [],
    summary: undefined,
    allStaff: [],
  })

  // Individual POC state
  const [selectedPocId, setSelectedPocId] = useState<string>('')
  const [individualData, setIndividualData] = useState<any>(null)

  // Initialize selected POC ID
  useEffect(() => {
    if (admin?.id && !selectedPocId) {
      setSelectedPocId(admin.id)
    }
  }, [admin, selectedPocId])

  // Fetch Team Data
  const fetchTeamData = useCallback(async () => {
    try {
      setLoadingTeam(true)
      const res = await fetch(
        `/api/admin/poc-dashboard/team?range=${range}&granularity=${granularity}`
      )
      if (res.ok) {
        const data = await res.json()
        setTeamData({
          podium: data.podium || null,
          members: data.members || [],
          trendData: data.trendData || [],
        })
      } else {
        toast.error('Failed to load team analytics')
      }
    } catch {
      toast.error('Error loading team stats')
    } finally {
      setLoadingTeam(false)
    }
  }, [range, granularity])

  // Fetch Overall Campaigns Matrix Data
  const fetchCampaignsData = useCallback(async () => {
    try {
      setLoadingCampaigns(true)
      const res = await fetch(`/api/admin/poc-dashboard/campaigns?range=${range}`)
      if (res.ok) {
        const data = await res.json()
        setCampaignsData({
          campaigns: data.campaigns || [],
          summary: data.summary,
          allStaff: data.allStaff || [],
        })
      } else {
        toast.error('Failed to load campaigns matrix')
      }
    } catch {
      toast.error('Error loading campaigns matrix')
    } finally {
      setLoadingCampaigns(false)
    }
  }, [range])

  // Fetch Individual POC Data
  const fetchIndividualData = useCallback(async () => {
    if (!selectedPocId) return
    try {
      setLoadingIndividual(true)
      const res = await fetch(
        `/api/admin/poc-dashboard?pocId=${selectedPocId}&range=${range}`
      )
      if (res.ok) {
        const data = await res.json()
        setIndividualData(data)
      } else {
        toast.error('Failed to load POC stats')
      }
    } catch {
      toast.error('Error loading individual POC data')
    } finally {
      setLoadingIndividual(false)
    }
  }, [selectedPocId, range])

  // Trigger fetches
  useEffect(() => {
    fetchTeamData()
    fetchCampaignsData()
  }, [fetchTeamData, fetchCampaignsData])

  useEffect(() => {
    if (activeTab === 'individual' && selectedPocId) {
      fetchIndividualData()
    }
  }, [activeTab, selectedPocId, fetchIndividualData])

  // Switch to drilldown view for a specific member
  const handleDrilldown = (pocId: string) => {
    setSelectedPocId(pocId)
    setActiveTab('individual')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Export Team Stats to CSV
  const handleExportTeamCsv = () => {
    if (!teamData.members || teamData.members.length === 0) {
      toast.error('No team members to export')
      return
    }
    const headers = [
      'POC Name',
      'Email',
      'Role',
      'Assigned Campaigns',
      'Total Applications',
      'Approved Creators',
      'Completed Deliverables',
      'Completion Rate (%)',
      'Total Paid (INR)',
      'WoW Growth (%)',
      'Best Day',
    ]
    const rows = teamData.members.map(m => [
      `"${m.name}"`,
      `"${m.email}"`,
      `"${m.roleDisplayName}"`,
      m.campaignCount,
      m.totalApplications,
      m.approvedCount,
      m.completedCount,
      m.completionRate,
      m.totalPaid,
      m.wowGrowth,
      `"${m.bestDay}"`,
    ])
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `poc_team_performance_${range}_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Downloaded POC Team Performance CSV!')
  }

  const filteredMembers = teamData.members.filter(m => {
    const q = memberSearch.toLowerCase()
    return (
      m.name.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q) ||
      m.roleDisplayName.toLowerCase().includes(q)
    )
  })

  const memberNames = teamData.members.map(m => m.name)

  return (
    <div className="space-y-6 pb-16">
      {/* ─── Top Navbar Header Injection ─── */}
      <SetAdminHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 w-full">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                POC Performance & Accountability Hub
              </h1>
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold uppercase tracking-wider">
                Operations
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Point of Contact ownership, velocity trends, and team productivity analytics.
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchTeamData()
                fetchCampaignsData()
                if (activeTab === 'individual') fetchIndividualData()
              }}
              className="h-9 px-3 rounded-xl border-white/10 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5 text-slate-400" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportTeamCsv}
              className="h-9 px-3 rounded-xl border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              Export CSV
            </Button>
          </div>
        </div>
      </SetAdminHeader>

      {/* ─── Filter Pills Bar & Tab Navigation (Strict 1-line Layout) ─── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-white/[0.08] pb-3.5">
        {/* Main Tabs Switcher - Guaranteed Single Line */}
        <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/[0.08] text-xs font-semibold shrink-0 whitespace-nowrap overflow-x-auto gap-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'team'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team Overview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'campaigns'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Campaigns Matrix</span>
            {campaignsData.campaigns.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-blue-300 border border-white/5 font-mono">
                {campaignsData.campaigns.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
              activeTab === 'individual'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              {activeTab === 'individual' && individualData?.pocInfo?.name
                ? `${individualData.pocInfo.name}'s Desk`
                : 'Individual Desk'}
            </span>
          </button>
        </div>

        {/* Range Selector Pills */}
        <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto shrink-0 pb-1 xl:pb-0">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <Calendar className="w-3 h-3" /> Range:
          </span>
          <div className="flex items-center bg-slate-900/90 p-1 rounded-2xl border border-white/[0.08] text-xs gap-0.5 shrink-0">
            {RANGE_OPTIONS.map(opt => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setRange(opt.key)}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  range === opt.key
                    ? 'bg-slate-800 text-white font-bold border border-white/20 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Contextual Early Month Alert if This Month has 0 data ─── */}
      {range === 'this_month' &&
        !loadingTeam &&
        teamData.members.length > 0 &&
        teamData.members.every(m => m.totalApplications === 0) && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
              <span>
                <strong>A new calendar month has just started</strong>. No submissions or approvals have occurred yet for this month.
                Switch to <strong>Last 7 Days</strong>, <strong>Last 30 Days</strong>, or <strong>All Time</strong> to see recent activity.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setRange('7d')}
                className="px-3 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors cursor-pointer"
              >
                Last 7 Days
              </button>
              <button
                type="button"
                onClick={() => setRange('30d')}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer border border-white/10"
              >
                Last 30 Days
              </button>
              <button
                type="button"
                onClick={() => setRange('all')}
                className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors cursor-pointer border border-white/10"
              >
                All Time
              </button>
            </div>
          </div>
        )}

      {/* ─── TAB 1: TEAM OVERVIEW (SUPER ADMIN & COMPARATIVE VIEW) ─── */}
      {activeTab === 'team' && (
        <div className="space-y-6">
          {/* Podium & Highlights */}
          <PocLeaderboard
            topApprover={teamData.podium?.topApprover}
            bestCompletion={teamData.podium?.bestCompletion}
            topVolume={teamData.podium?.topVolume}
            peakDay={teamData.podium?.peakDay}
            onSelectPoc={handleDrilldown}
            loading={loadingTeam}
          />

          {/* Days-Wise & Weeks-Wise Interactive Recharts Timeline */}
          <PocTrendChart
            data={teamData.trendData}
            granularity={granularity}
            onGranularityChange={setGranularity}
            memberNames={memberNames}
            loading={loadingTeam}
          />

          {/* Team Members Comparative Leaderboard Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur-xl">
            {/* Table Header Controls */}
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  {ledgerView === 'team' ? (
                    <>
                      <UserCheck className="w-4 h-4 text-blue-400" />
                      Operations Team Comparative Ledger
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10 font-normal">
                        {teamData.members.length} Staff
                      </span>
                    </>
                  ) : (
                    <>
                      <Megaphone className="w-4 h-4 text-blue-400" />
                      Campaign-Wise Operations Matrix
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-bold">
                        {campaignsData.campaigns.length} Campaigns
                      </span>
                    </>
                  )}
                </h3>
              </div>

              {/* View Switcher Toggle & Search */}
              <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                {/* ─── Compact Sleek View Switcher: By POC vs By Brand ─── */}
                <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-950/90 border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setLedgerView('team')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      ledgerView === 'team'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserCheck className="w-3 h-3" />
                    <span>By POC</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerView('campaigns')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      ledgerView === 'campaigns'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>By Brand</span>
                  </button>
                </div>

                {/* Search & Filter Controls (Team view vs Campaign view) */}
                {ledgerView === 'team' ? (
                  <div className="relative w-full sm:w-56">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      value={memberSearch}
                      onChange={e => setMemberSearch(e.target.value)}
                      placeholder="Filter team member..."
                      className="pl-8 pr-3 py-1 h-8 bg-slate-950/70 border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus-visible:ring-blue-500"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                    {/* Search campaign/brand/POC */}
                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                      <Input
                        type="text"
                        value={campaignSearch}
                        onChange={e => setCampaignSearch(e.target.value)}
                        placeholder="Filter campaign, brand, POC..."
                        className="pl-8 pr-3 py-1 h-8 bg-slate-950/70 border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus-visible:ring-blue-500"
                      />
                    </div>

                    {/* POC Dropdown */}
                    <select
                      value={campaignPocFilter}
                      onChange={e => setCampaignPocFilter(e.target.value)}
                      className="h-8 px-2 rounded-lg text-xs font-semibold bg-slate-950/70 border border-white/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-32 truncate"
                    >
                      <option value="all">All POCs</option>
                      <option value="unassigned">⚠️ Unassigned</option>
                      {teamData.members.map(m => (
                        <option key={m.id} value={m.id}>
                          👤 {m.name}
                        </option>
                      ))}
                    </select>

                    {/* Status Dropdown */}
                    <select
                      value={campaignStatusFilter}
                      onChange={e => setCampaignStatusFilter(e.target.value)}
                      className="h-8 px-2 rounded-lg text-xs font-semibold bg-slate-950/70 border border-white/10 text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer w-24 shrink-0"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="draft">Draft</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* View Switch: By Campaign vs By Team */}
            {ledgerView === 'campaigns' ? (
              <PocCampaignMatrix
                campaigns={campaignsData.campaigns}
                summary={campaignsData.summary}
                loading={loadingCampaigns}
                allStaff={
                  campaignsData.allStaff?.length > 0
                    ? campaignsData.allStaff
                    : teamData.members.map(m => ({ id: m.id, name: m.name }))
                }
                onSelectPoc={handleDrilldown}
                hideOuterWrapper={true}
                searchQuery={campaignSearch}
                onSearchChange={setCampaignSearch}
                selectedPocFilter={campaignPocFilter}
                onPocFilterChange={setCampaignPocFilter}
                selectedStatusFilter={campaignStatusFilter}
                onStatusFilterChange={setCampaignStatusFilter}
              />
            ) : (
            /* Table Content */
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs table-auto">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-white/[0.08] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-1.5 w-6 text-center"></th>
                    <th className="py-2.5 px-2 w-12"># Rank</th>
                    <th className="py-2.5 px-2.5 min-w-[150px]">Operations POC</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Campaigns</th>
                    <th className="py-2.5 px-2 text-right whitespace-nowrap">Apps</th>
                    <th className="py-2.5 px-2 text-right whitespace-nowrap">Approved</th>
                    <th className="py-2.5 px-2 text-right whitespace-nowrap">Done</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Completion</th>
                    <th className="py-2.5 px-2 text-right whitespace-nowrap">Paid</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">WoW</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Best Day</th>
                    <th className="py-2.5 px-2 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loadingTeam ? (
                    <PocTableSkeleton rows={6} />
                  ) : filteredMembers.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500">
                        No team members matching filter
                      </td>
                    </tr>
                  ) : (
                    filteredMembers.map((member, idx) => {
                      const isExpanded = expandedPocId === member.id
                      const memberCampaigns = campaignsData.campaigns.filter(c =>
                        c.pocAdminIds && c.pocAdminIds.includes(member.id)
                      )

                      return (
                        <React.Fragment key={member.id}>
                          <tr
                            onClick={() =>
                              setExpandedPocId(prev => (prev === member.id ? null : member.id))
                            }
                            className={`hover:bg-slate-800/40 transition-colors cursor-pointer group ${
                              isExpanded ? 'bg-slate-800/30' : ''
                            }`}
                          >
                            {/* Chevron Toggle */}
                            <td className="py-2.5 px-1.5 text-center text-slate-500 group-hover:text-blue-400 transition-colors">
                              <motion.div
                                animate={{ rotate: isExpanded ? 90 : 0 }}
                                transition={{ duration: 0.15 }}
                                className="inline-block"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </motion.div>
                            </td>

                            {/* Rank */}
                            <td className="py-2.5 px-2 font-bold whitespace-nowrap">
                              {idx === 0 ? (
                                <span className="text-amber-400 flex items-center gap-1 font-extrabold">
                                  🥇 1
                                </span>
                              ) : idx === 1 ? (
                                <span className="text-slate-300 flex items-center gap-1 font-bold">
                                  🥈 2
                                </span>
                              ) : idx === 2 ? (
                                <span className="text-amber-600 flex items-center gap-1 font-bold">
                                  🥉 3
                                </span>
                              ) : (
                                <span className="text-slate-500 font-mono">#{idx + 1}</span>
                              )}
                            </td>

                            {/* Name & Avatar */}
                            <td className="py-2.5 px-2.5">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                                  {member.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-bold text-white group-hover:text-blue-300 transition-colors truncate max-w-[140px]">
                                    {member.name}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-slate-400 font-mono truncate max-w-[100px]">
                                      {member.email}
                                    </span>
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 border border-white/5 truncate max-w-[85px]">
                                      {member.roleDisplayName}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Campaigns */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span className="font-semibold text-slate-200 px-1.5 py-0.5 rounded-md bg-slate-800/80 border border-white/5 text-[11px]">
                                {member.campaignCount}
                              </span>
                            </td>

                            {/* Total Apps */}
                            <td className="py-2.5 px-2 text-right font-medium text-slate-300 whitespace-nowrap">
                              {member.totalApplications}
                            </td>

                            {/* Approved */}
                            <td className="py-2.5 px-2 text-right font-bold text-blue-400 whitespace-nowrap">
                              {member.approvedCount}
                            </td>

                            {/* Completed */}
                            <td className="py-2.5 px-2 text-right font-semibold text-emerald-400 whitespace-nowrap">
                              {member.completedCount}
                            </td>

                            {/* Completion Rate with Progress Bar */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span
                                className={`font-bold text-[11px] ${
                                  member.completionRate >= 75
                                    ? 'text-emerald-400'
                                    : member.completionRate >= 50
                                    ? 'text-amber-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {member.completionRate}%
                              </span>
                              <div className="w-14 h-1 bg-slate-800 rounded-full mx-auto mt-0.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    member.completionRate >= 75
                                      ? 'bg-emerald-500'
                                      : member.completionRate >= 50
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${Math.min(member.completionRate, 100)}%` }}
                                />
                              </div>
                            </td>

                            {/* Total Paid */}
                            <td className="py-2.5 px-2 text-right font-semibold text-slate-200 whitespace-nowrap text-xs">
                              ₹{member.totalPaid >= 100000 ? `${(member.totalPaid / 100000).toFixed(1)}L` : member.totalPaid.toLocaleString()}
                            </td>

                            {/* WoW Growth */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              {member.wowGrowth > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-emerald-400 font-semibold text-[11px]">
                                  <ArrowUpRight className="w-3 h-3" />
                                  +{member.wowGrowth}%
                                </span>
                              ) : member.wowGrowth < 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-rose-400 font-semibold text-[11px]">
                                  <ArrowDownRight className="w-3 h-3" />
                                  {member.wowGrowth}%
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">—</span>
                              )}
                            </td>

                            {/* Best Day */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <span className="text-[10px] text-amber-300 font-medium bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                {member.bestDay}
                              </span>
                            </td>

                            {/* Action Drilldown */}
                            <td className="py-2.5 px-2 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  handleDrilldown(member.id)
                                }}
                                className="px-2 py-0.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 font-semibold text-[10px] transition-all flex items-center gap-0.5 mx-auto cursor-pointer"
                              >
                                <span>Inspect</span>
                                <ChevronRight className="w-2.5 h-2.5" />
                              </button>
                            </td>
                          </tr>

                          {/* ─── INLINE ACCORDION DRAWER: CAMPAIGNS HANDLED BY THIS POC ─── */}
                          <AnimatePresence>
                            {isExpanded && (
                              <tr className="bg-slate-950/80 border-b border-white/[0.08]">
                                <td colSpan={12} className="p-0">
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="p-4 sm:p-5 border-l-2 border-blue-500 bg-slate-900/50 m-2 rounded-xl border border-white/[0.06] space-y-4">
                                      {/* Drawer Header */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Sparkles className="w-4 h-4 text-blue-400" />
                                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                            Campaigns Handled by {member.name}
                                          </h4>
                                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold">
                                            {memberCampaigns.length} Campaigns
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <button
                                            type="button"
                                            onClick={e => {
                                              e.stopPropagation()
                                              handleDrilldown(member.id)
                                            }}
                                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
                                          >
                                            <span>Open Full Desk &amp; Timeline</span>
                                            <ArrowUpRight className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      </div>

                                      {/* Campaigns Sub-Table */}
                                      {memberCampaigns.length === 0 ? (
                                        <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 text-center text-slate-400 text-xs">
                                          No campaigns currently assigned to {member.name} in this time period.
                                        </div>
                                      ) : (
                                        <div className="overflow-x-auto rounded-xl border border-white/5 bg-slate-950/70">
                                          <table className="w-full text-left text-xs">
                                            <thead>
                                              <tr className="border-b border-white/5 text-slate-400 text-[10px] font-semibold uppercase tracking-wider bg-slate-900/60">
                                                <th className="py-2.5 px-3">Campaign &amp; Brand</th>
                                                <th className="py-2.5 px-3">Category</th>
                                                <th className="py-2.5 px-3">Status</th>
                                                <th className="py-2.5 px-3 text-right">Applicants</th>
                                                <th className="py-2.5 px-3 text-right">Approved</th>
                                                <th className="py-2.5 px-3 text-right">Completed</th>
                                                <th className="py-2.5 px-3 text-center">Completion Rate</th>
                                                <th className="py-2.5 px-3 text-right">Paid Out</th>
                                                <th className="py-2.5 px-3 text-center">Actions</th>
                                              </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/[0.04]">
                                              {memberCampaigns.map(c => {
                                                const isChitthaOpen = expandedCampaignChitthaId === c.id
                                                return (
                                                  <React.Fragment key={c.id}>
                                                    <tr
                                                      onClick={() =>
                                                        setExpandedCampaignChitthaId(prev => (prev === c.id ? null : c.id))
                                                      }
                                                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group/camp"
                                                    >
                                                      <td className="py-2.5 px-3">
                                                        <div className="font-bold text-white flex items-center gap-1.5 group-hover/camp:text-blue-300 transition-colors">
                                                          <ChevronRight
                                                            className={`w-3 h-3 text-slate-500 transition-transform ${
                                                              isChitthaOpen ? 'rotate-90 text-blue-400' : ''
                                                            }`}
                                                          />
                                                          <span>{c.brandName}</span>
                                                        </div>
                                                        <div className="text-[10px] text-slate-400 font-mono pl-4.5">
                                                          {c.campaignCode}
                                                        </div>
                                                      </td>
                                                      <td className="py-2.5 px-3 text-slate-300">
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 border border-white/5 text-slate-300">
                                                          {c.category}
                                                        </span>
                                                      </td>
                                                      <td className="py-2.5 px-3">
                                                        <span
                                                          className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                                            c.status === 'Active' || c.isLive
                                                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                              : 'bg-slate-800 text-slate-400 border-white/5'
                                                          }`}
                                                        >
                                                          {c.status}
                                                        </span>
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-medium text-slate-300">
                                                        {c.totalApplications}
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-bold text-blue-400">
                                                        {c.approvedCount}
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                                                        {c.completedCount}
                                                      </td>
                                                      <td className="py-2.5 px-3 text-center">
                                                        <span className="text-[11px] font-mono font-semibold text-slate-300">
                                                          {c.completionRate}%
                                                        </span>
                                                      </td>
                                                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-400 font-mono">
                                                        {c.totalPaid > 0
                                                          ? `₹${c.totalPaid.toLocaleString()}`
                                                          : '₹0'}
                                                      </td>
                                                      <td
                                                        className="py-2.5 px-3 text-center"
                                                        onClick={e => e.stopPropagation()}
                                                      >
                                                        <div className="flex items-center justify-center gap-1.5">
                                                          <button
                                                            type="button"
                                                            onClick={() =>
                                                              setExpandedCampaignChitthaId(prev =>
                                                                prev === c.id ? null : c.id
                                                              )
                                                            }
                                                            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                                              isChitthaOpen
                                                                ? 'bg-blue-600 text-white shadow'
                                                                : 'bg-blue-500/15 hover:bg-blue-600 text-blue-300 hover:text-white'
                                                            }`}
                                                            title="Inspect Creators Chittha & Approval/Rejection details"
                                                          >
                                                            <span>Chittha 🔍</span>
                                                          </button>
                                                          <Link
                                                            href={`/admin/campaigns/${c.id}`}
                                                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                                            title="Campaign Settings"
                                                          >
                                                            <ExternalLink className="w-3 h-3" />
                                                          </Link>
                                                        </div>
                                                      </td>
                                                    </tr>

                                                    {/* ─── INLINE EXPANDED CREATORS CHITTHA FOR THIS CAMPAIGN ─── */}
                                                    <AnimatePresence>
                                                      {isChitthaOpen && (
                                                        <tr className="bg-slate-950/90 border-b border-white/[0.08]">
                                                          <td colSpan={9} className="p-2 sm:p-3">
                                                            <motion.div
                                                              initial={{ opacity: 0, height: 0 }}
                                                              animate={{ opacity: 1, height: 'auto' }}
                                                              exit={{ opacity: 0, height: 0 }}
                                                              transition={{ duration: 0.2 }}
                                                              className="overflow-hidden"
                                                            >
                                                              <PocCampaignCreatorsChittha
                                                                campaignId={c.id}
                                                                brandName={c.brandName}
                                                                campaignCode={c.campaignCode}
                                                                assignedPocNames={[member.name]}
                                                                onClose={() =>
                                                                  setExpandedCampaignChitthaId(null)
                                                                }
                                                              />
                                                            </motion.div>
                                                          </td>
                                                        </tr>
                                                      )}
                                                    </AnimatePresence>
                                                  </React.Fragment>
                                                )
                                              })}
                                            </tbody>
                                          </table>
                                        </div>
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
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 2: OVERALL CAMPAIGN-WISE MATRIX & POC ASSIGNMENTS ─── */}
      {activeTab === 'campaigns' && (
        <PocCampaignMatrix
          campaigns={campaignsData.campaigns}
          summary={campaignsData.summary}
          loading={loadingCampaigns}
          allStaff={
            campaignsData.allStaff?.length > 0
              ? campaignsData.allStaff
              : teamData.members.map(m => ({ id: m.id, name: m.name }))
          }
          onSelectPoc={handleDrilldown}
        />
      )}

      {/* ─── TAB 3: INDIVIDUAL POC DESK & CAMPAIGNS BREAKDOWN ─── */}
      {activeTab === 'individual' && (
        loadingIndividual ? (
          <PocIndividualSkeleton />
        ) : (
          <div className="space-y-6">
          {/* Header Switcher if Super Admin */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('team')}
                className="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold text-base flex items-center justify-center shadow-lg shrink-0">
                {individualData?.pocInfo?.name?.charAt(0)?.toUpperCase() || 'P'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {individualData?.pocInfo?.name || 'Operations Admin'}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-semibold uppercase">
                    {individualData?.pocInfo?.roleDisplayName || 'POC'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">{individualData?.pocInfo?.email}</p>
              </div>
            </div>

            {/* If Super Admin, let them switch to another POC on the fly */}
            {teamData.members.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Switch POC:</span>
                <select
                  value={selectedPocId}
                  onChange={e => setSelectedPocId(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {teamData.members.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.campaignCount} Campaigns)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Individual Overview Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-500">Assigned Campaigns</p>
              <p className="text-2xl font-extrabold text-white mt-1">
                {individualData?.overview?.assignedCampaignsCount || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-500">Total Applications</p>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1">
                {individualData?.overview?.totalApplications || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-500">Approved Creators</p>
              <p className="text-2xl font-extrabold text-blue-400 mt-1">
                {individualData?.overview?.approvedCreators || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-500">Completions Done</p>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                {individualData?.overview?.completedDeliverables || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-500">Completion Rate</p>
              <p className="text-2xl font-extrabold text-emerald-300 mt-1">
                {individualData?.overview?.completionRate || 0}%
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg">
              <p className="text-[10px] uppercase font-bold text-slate-500">Total Paid Out</p>
              <p className="text-xl font-extrabold text-amber-300 mt-1">
                ₹{((individualData?.overview?.totalPaidOut || 0) / 1000).toFixed(1)}k
              </p>
            </div>
          </div>

          {/* Assigned Campaigns Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur-xl">
            <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-blue-400" />
                  Assigned Campaigns Ledger
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                    {individualData?.campaigns?.length || 0} Campaigns
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Campaigns where this Operations Admin is assigned as Point of Contact.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-white/[0.08] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-4">Platform</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Applicants</th>
                    <th className="py-3 px-4 text-right">Approved</th>
                    <th className="py-3 px-4 text-right">Completed</th>
                    <th className="py-3 px-4 text-center">Completion Rate</th>
                    <th className="py-3 px-4 text-right">Disbursed (₹)</th>
                    <th className="py-3 px-4 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {loadingIndividual ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        Loading assigned campaigns...
                      </td>
                    </tr>
                  ) : !individualData?.campaigns || individualData.campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-500">
                        No campaigns currently assigned to this POC.
                      </td>
                    </tr>
                  ) : (
                    individualData.campaigns.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-white">{c.brandName}</p>
                            <p className="text-[10px] text-slate-500 font-mono">{c.campaignCode}</p>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-300">{c.platform}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              c.status === 'Active'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border-white/10'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-300 font-medium">
                          {c.totalApplications}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-400">
                          {c.approvedCount}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-400">
                          {c.completedCount}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="w-20 mx-auto">
                            <span className="text-[11px] font-bold text-slate-300">
                              {c.completionRate}%
                            </span>
                            <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full"
                                style={{ width: `${Math.min(c.completionRate, 100)}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-200">
                          ₹{c.totalPaid.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/admin/campaigns/${c.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Creator Deliverables Table */}
          <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur-xl">
            <div className="p-4 sm:p-5 border-b border-white/[0.08]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" />
                Recent Creator Deliverables & Submissions
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-white/10">
                  Last 50 Creators
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Creator applications and verification statuses under this POC&apos;s assigned campaigns.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-white/[0.08] text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Creator</th>
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Applied Date</th>
                    <th className="py-3 px-4">Live Date</th>
                    <th className="py-3 px-4 text-right">Payout (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {!individualData?.recentCreators || individualData.recentCreators.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No creator submissions found under these campaigns.
                      </td>
                    </tr>
                  ) : (
                    individualData.recentCreators.map((creator: any) => (
                      <tr key={creator.applicationId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div>
                            <p className="font-bold text-white">{creator.creatorName}</p>
                            {creator.instagramUsername && (
                              <p className="text-[10px] text-pink-400 font-mono">
                                @{creator.instagramUsername}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-slate-200">{creator.brandName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{creator.campaignCode}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              creator.status === 'Approved'
                                ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                                : creator.status === 'Completed' || creator.status === 'Paid'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                : creator.status === 'Rejected'
                                ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                : 'bg-slate-800 text-slate-400 border-white/10'
                            }`}
                          >
                            {creator.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {creator.appliedAt ? new Date(creator.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {creator.liveDate ? new Date(creator.liveDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-slate-200">
                          ₹{creator.payout.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
