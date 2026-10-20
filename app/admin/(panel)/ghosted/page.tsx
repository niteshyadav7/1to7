'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldAlert,
  ShieldCheck,
  History,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Calendar,
  User,
  Users,
  Instagram,
  Phone,
  Mail,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
  Loader2,
  FileSpreadsheet,
  ChevronRight,
  TrendingDown,
  UserX,
  X,
  MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { GhostActionModal, TargetCreatorItem } from '@/components/admin/ghost/GhostActionModal'
import { GhostHistoryModal } from '@/components/admin/ghost/GhostHistoryModal'
import ImageZoomModal from '@/components/admin/ImageZoomModal'
import { toast } from 'sonner'
import Link from 'next/link'

interface ActiveGhostedItem {
  application_id: string
  user_id: string
  campaign_id: string
  application_status: string
  is_ghosted: boolean
  ghosted_at: string | null
  applied_at: string
  form_data: any
  full_name: string
  influencer_id: string
  email: string
  mobile: string
  instagram_username: string
  followers: number
  profile_photo?: string
  instagram_profile_pic?: string
  gender?: string
  state?: string
  city?: string
  brand_name: string
  campaign_code: string
  platform?: string
  manager_phone?: string
  latest_reason?: string
  latest_comment?: string
  latest_proof_urls?: string[]
  latest_actor_name?: string
  latest_actor_role?: string
  latest_event_at?: string
}

interface GhostEventItem {
  event_id: string
  application_id: string
  user_id: string
  campaign_id: string
  action: 'ghosted' | 'unghosted'
  reason_category: string
  comment: string
  proof_urls: string[]
  batch_id?: string
  actor_admin_id: string
  actor_name?: string
  actor_role?: string
  created_at: string
  creator_name?: string
  influencer_id?: string
  instagram_username?: string
  creator_mobile?: string
  creator_email?: string
  creator_photo?: string
  brand_name?: string
  campaign_code?: string
}

interface GhostSummary {
  activeGhostedCount: number
  totalGhostEvents: number
  totalUnghostedEvents: number
  totalEvents: number
  recoveryRate: number
}

function formatRelativeTime(dateString?: string | null) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return 'N/A'

  const diffMs = Date.now() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) return 'Just now'
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return '1 day ago'
  if (diffDays < 30) return `${diffDays} days ago`
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function GhostedManagementPage() {
  const [activeTab, setActiveTab] = useState<'active' | 'logs'>('active')
  const [loading, setLoading] = useState<boolean>(true)
  const [refreshing, setRefreshing] = useState<boolean>(false)

  const [summary, setSummary] = useState<GhostSummary>({
    activeGhostedCount: 0,
    totalGhostEvents: 0,
    totalUnghostedEvents: 0,
    totalEvents: 0,
    recoveryRate: 0,
  })

  const [activeGhosted, setActiveGhosted] = useState<ActiveGhostedItem[]>([])
  const [logs, setLogs] = useState<GhostEventItem[]>([])

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [logActionFilter, setLogActionFilter] = useState<'all' | 'ghosted' | 'unghosted'>('all')

  // Modals state
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string } | null>(null)
  const [historyTarget, setHistoryTarget] = useState<{
    applicationId: string
    creatorName: string
    brandName?: string
  } | null>(null)
  const [unghostTarget, setUnghostTarget] = useState<TargetCreatorItem | null>(null)

  // Fetch data from API
  const fetchData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true)
    else setRefreshing(true)

    try {
      const res = await fetch('/api/admin/ghosted?tab=all')
      if (!res.ok) throw new Error('Failed to load ghost records')
      const data = await res.json()

      if (data.summary) setSummary(data.summary)
      if (data.activeGhosted) setActiveGhosted(data.activeGhosted)
      if (data.logs) setLogs(data.logs)
    } catch (err: any) {
      toast.error(err.message || 'Error loading ghosted data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Unique campaign filter options
  const uniqueCampaigns = useMemo(() => {
    const map = new Map<string, string>()
    activeGhosted.forEach((item) => {
      if (item.campaign_code && item.brand_name) {
        map.set(item.campaign_code, `${item.brand_name} (${item.campaign_code})`)
      }
    })
    return Array.from(map.entries())
  }, [activeGhosted])

  // Filtered active ghosted list
  const filteredActiveGhosted = useMemo(() => {
    return activeGhosted.filter((item) => {
      // Campaign filter
      if (selectedCampaign !== 'all' && item.campaign_code !== selectedCampaign) {
        return false
      }

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const creatorName = (item.full_name || '').toLowerCase()
      const influencerId = (item.influencer_id || '').toLowerCase()
      const mobile = (item.mobile || '').toLowerCase()
      const email = (item.email || '').toLowerCase()
      const instagram = (item.instagram_username || '').toLowerCase()
      const brand = (item.brand_name || '').toLowerCase()
      const code = (item.campaign_code || '').toLowerCase()
      const reason = (item.latest_reason || '').toLowerCase()

      return (
        creatorName.includes(q) ||
        influencerId.includes(q) ||
        mobile.includes(q) ||
        email.includes(q) ||
        instagram.includes(q) ||
        brand.includes(q) ||
        code.includes(q) ||
        reason.includes(q)
      )
    })
  }, [activeGhosted, selectedCampaign, searchQuery])

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Action filter
      if (logActionFilter !== 'all' && log.action !== logActionFilter) {
        return false
      }

      // Search query
      if (!searchQuery.trim()) return true
      const q = searchQuery.toLowerCase().trim()
      const creator = (log.creator_name || '').toLowerCase()
      const id = (log.influencer_id || '').toLowerCase()
      const mobile = (log.creator_mobile || '').toLowerCase()
      const insta = (log.instagram_username || '').toLowerCase()
      const brand = (log.brand_name || '').toLowerCase()
      const code = (log.campaign_code || '').toLowerCase()
      const reason = (log.reason_category || '').toLowerCase()
      const comment = (log.comment || '').toLowerCase()
      const actor = (log.actor_name || '').toLowerCase()

      return (
        creator.includes(q) ||
        id.includes(q) ||
        mobile.includes(q) ||
        insta.includes(q) ||
        brand.includes(q) ||
        code.includes(q) ||
        reason.includes(q) ||
        comment.includes(q) ||
        actor.includes(q)
      )
    })
  }, [logs, logActionFilter, searchQuery])

  // Export Active Ghosted to CSV
  const handleExportActive = () => {
    if (filteredActiveGhosted.length === 0) {
      toast.info('No ghosted creators to export')
      return
    }

    const headers = [
      'Influencer ID',
      'Creator Name',
      'Instagram Handle',
      'Followers',
      'Mobile',
      'Email',
      'Brand Name',
      'Campaign Code',
      'Ghosted At',
      'Marked By',
      'Reason Category',
      'Comment',
    ]

    const rows = filteredActiveGhosted.map((item) => [
      item.influencer_id || 'N/A',
      item.full_name || 'N/A',
      item.instagram_username || 'N/A',
      item.followers || 0,
      item.mobile || 'N/A',
      item.email || 'N/A',
      item.brand_name || 'N/A',
      item.campaign_code || 'N/A',
      item.ghosted_at ? new Date(item.ghosted_at).toLocaleString('en-IN') : 'N/A',
      item.latest_actor_name || 'Admin',
      item.latest_reason || 'N/A',
      item.latest_comment ? `"${item.latest_comment.replace(/"/g, '""')}"` : '',
    ])

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ghosted_Creators_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Ghosted list exported to CSV')
  }

  // Export Audit Logs to CSV
  const handleExportLogs = () => {
    if (filteredLogs.length === 0) {
      toast.info('No logs to export')
      return
    }

    const headers = [
      'Event Time',
      'Action',
      'Influencer ID',
      'Creator Name',
      'Instagram',
      'Mobile',
      'Brand Name',
      'Campaign Code',
      'Admin Name',
      'Admin Role',
      'Reason Category',
      'Justification / Comment',
    ]

    const rows = filteredLogs.map((log) => [
      log.created_at ? new Date(log.created_at).toLocaleString('en-IN') : 'N/A',
      log.action.toUpperCase(),
      log.influencer_id || 'N/A',
      log.creator_name || 'N/A',
      log.instagram_username || 'N/A',
      log.creator_mobile || 'N/A',
      log.brand_name || 'N/A',
      log.campaign_code || 'N/A',
      log.actor_name || 'Admin',
      log.actor_role || 'POC',
      log.reason_category || 'N/A',
      log.comment ? `"${log.comment.replace(/"/g, '""')}"` : '',
    ])

    const csvContent =
      '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Ghost_Audit_Logs_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Ghost audit logs exported to CSV')
  }

  return (
    <>
      <SetAdminHeader pageTitle="Ghosted Creators & Accountability Hub">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              Ghosted Creators & Accountability Hub
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold">
                {summary.activeGhostedCount} Blocked
              </span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Platform-wide monitoring for non-responsive creators, blocked applications, and immutable audit trails
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData(true)}
              disabled={refreshing || loading}
              className="border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold h-9 rounded-xl cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${refreshing ? 'animate-spin text-rose-400' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={activeTab === 'active' ? handleExportActive : handleExportLogs}
              className="border-white/10 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-semibold h-9 rounded-xl cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
              Export CSV
            </Button>
          </div>
        </div>
      </SetAdminHeader>

      <div className="min-h-screen bg-[#0a0a0f] text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">

        {/* 4 KPI Metrics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Card 1: Currently Blocked */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-950/40 to-slate-900/80 border border-rose-500/25 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">Currently Blocked</span>
              <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                <UserX className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {summary.activeGhostedCount}
              </span>
              <span className="text-xs text-rose-300/80 ml-2 font-medium">Creators</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Active blocks preventing new applications
            </p>
          </div>

          {/* Card 2: Total Ghost Events */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-950/30 to-slate-900/80 border border-amber-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">Lifetime Incidents</span>
              <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <TrendingDown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {summary.totalGhostEvents}
              </span>
              <span className="text-xs text-amber-300/80 ml-2 font-medium">Recorded</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Total historical ghost actions logged
            </p>
          </div>

          {/* Card 3: Restored Collaborations */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900/80 border border-emerald-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">Restored (Un-ghosted)</span>
              <div className="h-8 w-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <ShieldCheck className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {summary.totalUnghostedEvents}
              </span>
              <span className="text-xs text-emerald-300/80 ml-2 font-medium">Recovered</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Creators cleared after delivering proofs
            </p>
          </div>

          {/* Card 4: Recovery Rate */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/30 to-slate-900/80 border border-indigo-500/20 shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Recovery Rate</span>
              <div className="h-8 w-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-2xl sm:text-3xl font-extrabold text-white">
                {summary.recoveryRate}%
              </span>
              <span className="text-xs text-indigo-300/80 ml-2 font-medium">Resolution</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Percentage of ghosted cases successfully resolved
            </p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="flex items-center gap-2 border-b border-white/10 pb-1">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            Active Ghosted List
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'active' ? 'bg-rose-500/30 text-rose-200' : 'bg-white/10 text-slate-300'
              }`}
            >
              {activeGhosted.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'logs'
                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <History className="h-4 w-4" />
            Audit Logs & Timeline
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'logs' ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/10 text-slate-300'
              }`}
            >
              {logs.length}
            </span>
          </button>
        </div>

        {/* Search & Filters Controls */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-white/10 shadow-sm">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeTab === 'active'
                  ? 'Search by Creator, ID, Instagram, Phone, Brand...'
                  : 'Search audit logs by Creator, Admin, Reason, Justification...'
              }
              className="pl-10 h-10 bg-slate-950/60 border-white/10 text-white placeholder:text-slate-500 text-xs sm:text-sm rounded-xl focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Secondary Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {activeTab === 'active' ? (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="h-10 bg-slate-950/60 border border-white/10 text-slate-200 text-xs rounded-xl px-3 focus:outline-none focus:border-rose-500"
                >
                  <option value="all">All Campaigns ({uniqueCampaigns.length})</option>
                  {uniqueCampaigns.map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-white/10">
                {(['all', 'ghosted', 'unghosted'] as const).map((filterVal) => {
                  const isSelected = logActionFilter === filterVal
                  return (
                    <button
                      key={filterVal}
                      onClick={() => setLogActionFilter(filterVal)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? filterVal === 'ghosted'
                            ? 'bg-rose-500 text-white shadow-xs'
                            : filterVal === 'unghosted'
                            ? 'bg-emerald-500 text-white shadow-xs'
                            : 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {filterVal === 'all'
                        ? 'All Actions'
                        : filterVal === 'ghosted'
                        ? '👻 Ghosted'
                        : '✓ Un-ghosted'}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tab 1: Active Ghosted List */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-rose-500" />
                <p className="text-xs">Loading currently ghosted creators...</p>
              </div>
            ) : filteredActiveGhosted.length === 0 ? (
              <div className="py-20 text-center bg-slate-900/40 border border-dashed border-white/10 rounded-2xl p-8">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {searchQuery || selectedCampaign !== 'all'
                    ? 'No matching ghosted records found'
                    : 'Zero Active Ghosted Creators! 🎉'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  {searchQuery || selectedCampaign !== 'all'
                    ? 'Try adjusting your search query or campaign filter.'
                    : 'All influencer collaborations are running smoothly without any non-responsive creators.'}
                </p>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-950/60 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Creator</th>
                        <th className="py-3.5 px-4">Campaign</th>
                        <th className="py-3.5 px-4">Ghost Incident</th>
                        <th className="py-3.5 px-4">Proof Evidence</th>
                        <th className="py-3.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {filteredActiveGhosted.map((item) => (
                        <tr
                          key={item.application_id}
                          className="hover:bg-white/[0.02] transition-colors group"
                        >
                          {/* Creator Column */}
                          <td className="py-4 px-4">
                            <div className="flex items-start gap-3">
                              <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                                {item.profile_photo || item.instagram_profile_pic ? (
                                  <img
                                    src={item.profile_photo || item.instagram_profile_pic}
                                    alt={item.full_name}
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  item.full_name?.[0]?.toUpperCase() || 'C'
                                )}
                              </div>
                              <div className="space-y-0.5 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-bold text-white text-sm hover:underline cursor-pointer">
                                    <Link href={`/admin/virtual-profile/${item.user_id}`} target="_blank">
                                      {item.full_name || 'Creator'}
                                    </Link>
                                  </p>
                                  {item.influencer_id && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300 font-mono font-bold">
                                      {item.influencer_id}
                                    </span>
                                  )}
                                </div>

                                {item.instagram_username && (
                                  <a
                                    href={`https://instagram.com/${item.instagram_username.replace('@', '')}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-pink-400 hover:text-pink-300 flex items-center gap-1 font-semibold text-[11px]"
                                  >
                                    <Instagram className="h-3 w-3" />
                                    @{item.instagram_username.replace('@', '')}
                                    {item.followers > 0 && (
                                      <span className="text-slate-500 text-[10px]">
                                        ({item.followers.toLocaleString()} f)
                                      </span>
                                    )}
                                  </a>
                                )}

                                <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                                  {item.mobile && (
                                    <span className="flex items-center gap-1">
                                      <Phone className="h-3 w-3 text-slate-500" />
                                      {item.mobile}
                                    </span>
                                  )}
                                  {item.city && item.state && (
                                    <span className="text-slate-500">• {item.city}, {item.state}</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Campaign Column */}
                          <td className="py-4 px-4">
                            <div className="space-y-1">
                              <p className="font-bold text-white text-sm">{item.brand_name}</p>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-mono font-bold">
                                  {item.campaign_code}
                                </span>
                                {item.platform && (
                                  <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                    • {item.platform}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500">
                                Applied: {new Date(item.applied_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                              </p>
                            </div>
                          </td>

                          {/* Ghost Incident Column */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-[10px]">
                                  {item.latest_reason || 'Ghosted (Unresponsive)'}
                                </span>
                                <span className="text-[11px] text-slate-400">
                                  {formatRelativeTime(item.ghosted_at || item.latest_event_at)}
                                </span>
                              </div>

                              {item.latest_comment && (
                                <p className="text-xs text-slate-300 line-clamp-2 bg-slate-950/40 p-2 rounded-lg border border-white/5 italic">
                                  &ldquo;{item.latest_comment}&rdquo;
                                </p>
                              )}

                              <p className="text-[10px] text-slate-500">
                                By: <strong className="text-slate-300">{item.latest_actor_name || 'Admin'}</strong>
                                {item.latest_actor_role ? ` (${item.latest_actor_role})` : ''}
                              </p>
                            </div>
                          </td>

                          {/* Proof Evidence Column */}
                          <td className="py-4 px-4">
                            {item.latest_proof_urls && item.latest_proof_urls.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {item.latest_proof_urls.slice(0, 3).map((url, imgIdx) => (
                                  <button
                                    key={imgIdx}
                                    type="button"
                                    onClick={() =>
                                      setZoomImage({
                                        src: url,
                                        title: `Ghost Proof - ${item.full_name} (${item.brand_name})`,
                                      })
                                    }
                                    className="h-10 w-10 rounded-lg overflow-hidden border border-white/10 hover:border-rose-500 transition-all cursor-pointer relative group/img shadow-sm"
                                  >
                                    <img
                                      src={url}
                                      alt="Proof thumbnail"
                                      className="h-full w-full object-cover group-hover/img:scale-110 transition-transform"
                                    />
                                  </button>
                                ))}
                                {item.latest_proof_urls.length > 3 && (
                                  <span className="text-[10px] font-bold text-slate-400 pl-1">
                                    +{item.latest_proof_urls.length - 3} more
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">No proof image</span>
                            )}
                          </td>

                          {/* Actions Column */}
                          <td className="py-4 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {/* View Audit Trail */}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setHistoryTarget({
                                    applicationId: item.application_id,
                                    creatorName: item.full_name,
                                    brandName: item.brand_name,
                                  })
                                }
                                className="h-8 px-2.5 bg-slate-950/80 border-white/10 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                              >
                                <History className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                                Logs
                              </Button>

                              {/* Un-ghost Creator Action */}
                              <Button
                                size="sm"
                                onClick={() =>
                                  setUnghostTarget({
                                    applicationId: item.application_id,
                                    creatorName: item.full_name,
                                    instagramUsername: item.instagram_username,
                                    brandName: item.brand_name,
                                    campaignCode: item.campaign_code,
                                  })
                                }
                                className="h-8 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg cursor-pointer shadow-sm shadow-emerald-950/30"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                Un-ghost
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="p-3 bg-slate-950/60 border-t border-white/10 text-xs text-slate-400 flex items-center justify-between">
                  <span>Showing {filteredActiveGhosted.length} of {activeGhosted.length} ghosted applications</span>
                  <span className="text-slate-500 text-[11px]">Creators are automatically locked out of applying to any active campaigns</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Audit Logs & Timeline */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {loading ? (
              <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                <p className="text-xs">Loading accountability audit logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="py-20 text-center bg-slate-900/40 border border-dashed border-white/10 rounded-2xl p-8">
                <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                  <History className="h-7 w-7" />
                </div>
                <h3 className="text-base font-bold text-white">No Ghost Audit Logs Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  No ghosting or unghosting actions match your current search or filter.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => {
                  const isGhosted = log.action === 'ghosted'
                  return (
                    <motion.div
                      key={log.event_id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                        isGhosted
                          ? 'bg-gradient-to-r from-rose-950/20 via-slate-900/60 to-slate-900/40 border-rose-500/25'
                          : 'bg-gradient-to-r from-emerald-950/20 via-slate-900/60 to-slate-900/40 border-emerald-500/25'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        {/* Event Header Left */}
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 border ${
                              isGhosted
                                ? 'bg-rose-500/15 border-rose-500/30 text-rose-400'
                                : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                            }`}
                          >
                            {isGhosted ? '👻' : '✓'}
                          </div>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border ${
                                  isGhosted
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {isGhosted ? 'Marked as Ghosted' : 'Restored / Un-ghosted'}
                              </span>

                              <span className="text-xs font-bold text-white">
                                {log.creator_name || 'Creator'}
                              </span>

                              {log.influencer_id && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 font-mono font-bold">
                                  {log.influencer_id}
                                </span>
                              )}

                              {log.instagram_username && (
                                <a
                                  href={`https://instagram.com/${log.instagram_username.replace('@', '')}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-pink-400 hover:text-pink-300 text-xs font-semibold flex items-center gap-0.5"
                                >
                                  @{log.instagram_username.replace('@', '')}
                                </a>
                              )}
                            </div>

                            <p className="text-xs text-slate-400 mt-1">
                              Campaign:{' '}
                              <strong className="text-slate-200">
                                {log.brand_name} ({log.campaign_code})
                              </strong>
                            </p>
                          </div>
                        </div>

                        {/* Event Timestamp & Admin Right */}
                        <div className="sm:text-right shrink-0">
                          <p className="text-xs font-semibold text-slate-300">
                            {new Date(log.created_at).toLocaleString('en-IN', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            By:{' '}
                            <strong className="text-slate-200">
                              {log.actor_name || 'Admin'}
                            </strong>{' '}
                            ({log.actor_role || 'POC'})
                          </p>
                        </div>
                      </div>

                      {/* Reason & Comments */}
                      <div className="mt-3.5 pt-3 border-t border-white/5 space-y-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="text-slate-400 font-semibold">Reason:</span>
                          <span className="text-slate-200 font-bold bg-white/5 px-2 py-0.5 rounded border border-white/5">
                            {log.reason_category}
                          </span>
                        </div>

                        {log.comment && (
                          <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed">
                            <span className="text-slate-500 font-semibold block text-[10px] uppercase tracking-wider mb-1">
                              Admin Justification
                            </span>
                            &ldquo;{log.comment}&rdquo;
                          </div>
                        )}

                        {/* Attached Evidence Screenshots */}
                        {log.proof_urls && log.proof_urls.length > 0 && (
                          <div className="pt-2">
                            <span className="text-[11px] font-bold text-slate-400 mb-1.5 flex items-center gap-1.5">
                              <ImageIcon className="h-3.5 w-3.5 text-slate-400" />
                              Attached Evidence Proof ({log.proof_urls.length}):
                            </span>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              {log.proof_urls.map((url, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() =>
                                    setZoomImage({
                                      src: url,
                                      title: `Audit Evidence - ${log.creator_name || 'Creator'} (${log.action})`,
                                    })
                                  }
                                  className="h-14 w-14 rounded-xl overflow-hidden border border-white/10 hover:border-indigo-400 transition-all cursor-pointer relative group/img shadow-md"
                                >
                                  <img
                                    src={url}
                                    alt={`Proof ${idx + 1}`}
                                    className="h-full w-full object-cover group-hover/img:scale-110 transition-transform"
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Zoom Modal */}
      {zoomImage && (
        <ImageZoomModal
          src={zoomImage.src}
          title={zoomImage.title}
          onClose={() => setZoomImage(null)}
        />
      )}

      {/* Ghost History Modal */}
      {historyTarget && (
        <GhostHistoryModal
          isOpen={Boolean(historyTarget)}
          applicationId={historyTarget.applicationId}
          creatorName={historyTarget.creatorName}
          brandName={historyTarget.brandName}
          onClose={() => setHistoryTarget(null)}
        />
      )}

      {/* Un-ghost Action Modal */}
      {unghostTarget && (
        <GhostActionModal
          isOpen={Boolean(unghostTarget)}
          actionType="unghost"
          targetCreator={unghostTarget}
          onClose={() => setUnghostTarget(null)}
          onSuccess={() => {
            setUnghostTarget(null)
            fetchData(true)
          }}
        />
      )}
    </>
  )
}
