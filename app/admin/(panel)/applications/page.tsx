'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, XCircle, ClipboardList,
  Instagram, Users, MapPin, ChevronDown,
  IndianRupee, Phone, Search, Filter, Megaphone,
  ArrowUpDown, ArrowUp, ArrowDown, Columns3, Download,
  AlignJustify, AlignCenter, AlignStartVertical,
  Calendar, X, MoreHorizontal, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileSpreadsheet, FileJson, UserCheck, UserX, Clock,
  RotateCcw, Trash2, RefreshCw, Store, ExternalLink, ShieldCheck, AlertTriangle,
  Pencil, Save, Upload, Share2, MessageSquareText
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'
import Link from 'next/link'
import { useRealtime } from '@/hooks/useRealtime'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { getInstagramDisplayHandle, getInstagramUrl } from '@/lib/instagram-utils'
import { InfluencerCampaignHistoryCard, InfluencerCampaignHistory } from '@/components/admin/InfluencerCampaignHistoryCard'
import CommercialNegotiationModal from '@/components/admin/CommercialNegotiationModal'
import { ApplicationImportModal } from '@/components/admin/ApplicationImportModal'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import { getFastCache, setFastCache } from '@/lib/utils/cache-utils'

// ─── Types ─────────────────────────────────────────────────
interface UserInfo {
  id: string
  full_name: string
  influencer_id: string
  email: string
  mobile: string
  instagram_username: string
  followers: number
  state: string
  city: string
  gender: string
  profile_photo?: string
  instagram_profile_pic?: string
  is_instagram_verified?: boolean
  instagram_followers_count?: number
  instagram_media_count?: number
  instagram_account_type?: string
  instagram_biography?: string
  instagram_website?: string
  instagram_profiles?: any[]
}

interface CampaignInfo {
  brand_name: string
  campaign_code: string
  platform: string
}

interface Application {
  id: string
  status: string
  form_data: Record<string, any>
  selected_store?: { name?: string; city?: string; state?: string; area?: string; address?: string; google_maps_url?: string } | null
  partial_payment: number
  final_payment: number
  pending_amount: number
  manager_phone: string
  completion_deadline?: string | null
  is_delay_exempted?: boolean | null
  delay_exemption_reason?: string | null
  completion_submitted_at?: string | null
  team_remark?: string | null
  team_remark_by?: string | null
  team_remark_updated_at?: string | null
  created_at: string
  updated_at: string
  users: UserInfo
  campaigns: CampaignInfo
  influencer_history?: InfluencerCampaignHistory
}

interface CampaignInfo {
  id: string
  brand_name: string
  campaign_code: string
  platform: string
  budget_amount: number
  budget_type: string
  location?: string
  location_type?: string
  store_locations?: any[]
  completion_days?: number | null
  completion_deadline?: string | null
  enforce_completion_deadline?: boolean | null
}

type SortDirection = 'asc' | 'desc' | null
type RowDensity = 'compact' | 'default' | 'comfortable'

interface SortConfig {
  column: string
  direction: SortDirection
}

interface Filters {
  campaign: string[]
  phone: string
  gender: string[]
  state: string[]
  followerRange: string[]
  platform: string[]
  dateRange: string
}

// ─── Constants ─────────────────────────────────────────────
const statusColors: Record<string, string> = {
  'Applied': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Under Process': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Under Review': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Approved': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Rejected': 'bg-red-500/15 text-red-400 border-red-500/25',
  'Completed': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Payment Initiated': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Payment Approved': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Payment Requested': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
}

const statusDots: Record<string, string> = {
  'Applied': 'bg-blue-400',
  'Under Process': 'bg-amber-400',
  'Under Review': 'bg-amber-400',
  'Approved': 'bg-emerald-400',
  'Rejected': 'bg-red-400',
  'Completed': 'bg-purple-400',
  'Payment Initiated': 'bg-amber-400',
  'Payment Approved': 'bg-blue-400',
  'Payment Requested': 'bg-cyan-400',
}

const statusFilters = ['All', 'Applied', 'Under Process', 'Approved', 'Payment Requested', 'Rejected', 'Completed', 'Payment Initiated', 'Payment Approved']

const followerRanges = [
  { label: '< 1K', min: 0, max: 999 },
  { label: '1K – 10K', min: 1000, max: 9999 },
  { label: '10K – 50K', min: 10000, max: 49999 },
  { label: '50K – 100K', min: 50000, max: 99999 },
  { label: '100K+', min: 100000, max: Infinity },
]

const dateRanges = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const defaultColumns: Record<string, boolean> = {
  influencer: true,
  instagram: true,
  campaign: true,
  location: true,
  status: true,
  brand_sent: true,
  team_remark: true,
  date: true,
  actions: true,
}

const densityPadding: Record<RowDensity, string> = {
  compact: 'py-2',
  default: 'py-3.5',
  comfortable: 'py-5',
}

const pageSizes = [10, 25, 50, 100]

// ─── Helpers ───────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `${diffMonths}mo ago`
  return `${Math.floor(diffMonths / 12)}y ago`
}

function formatFollowers(n: number) {
  if (!n || n === 0) return '—'
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
  return n.toString()
}

function isInDateRange(dateStr: string, range: string): boolean {
  if (range === 'all') return true
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  switch (range) {
    case 'today': return diffDays < 1
    case '7d': return diffDays <= 7
    case '30d': return diffDays <= 30
    case '90d': return diffDays <= 90
    default: return true
  }
}

// ─── Popover Hook ──────────────────────────────────────────
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return { open, setOpen, popoverRef: ref }
}

// ─── FilterDropdown Component ──────────────────────────────
function FilterDropdown({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string
  icon: React.ElementType
  options: string[]
  selected: string[]
  onToggle: (val: string) => void
  onClear: () => void
}) {
  const { open, setOpen, popoverRef } = usePopover()
  const [filterSearch, setFilterSearch] = useState('')
  const count = selected.length

  const filteredOptions = useMemo(() => {
    if (!filterSearch.trim()) return options
    const q = filterSearch.toLowerCase().trim()
    return options.filter(o => o.toLowerCase().includes(q))
  }, [options, filterSearch])

  useEffect(() => {
    if (!open) setFilterSearch('')
  }, [open])

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
          count > 0
            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25 shadow-lg shadow-indigo-500/5'
            : 'bg-slate-800/60 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10'
        }`}
      >
        <Icon className="h-3.5 w-3.5" />
        {label}
        {count > 0 && (
          <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-indigo-500 text-[10px] font-bold text-white">
            {count}
          </span>
        )}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 min-w-[220px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-2">{label}</span>
              {count > 0 && (
                <button onClick={onClear} className="text-[10px] text-indigo-400 hover:text-indigo-300 px-2 py-0.5 cursor-pointer">
                  Clear ({count})
                </button>
              )}
            </div>
            {options.length > 5 && (
              <div className="p-1.5 border-b border-white/5">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                  <input
                    type="text"
                    value={filterSearch}
                    onChange={(e) => setFilterSearch(e.target.value)}
                    placeholder={`Search ${label.toLowerCase()}...`}
                    className="w-full pl-7 pr-6 py-1 text-[11px] bg-slate-800/70 border border-white/5 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/50"
                  />
                  {filterSearch && (
                    <button onClick={() => setFilterSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="p-1.5 max-h-[240px] overflow-y-auto custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-2 text-xs text-slate-500 text-center">No {label.toLowerCase()} found</div>
              ) : (
                filteredOptions.map(opt => (
                  <button
                    key={opt}
                    onClick={() => onToggle(opt)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                      selected.includes(opt)
                        ? 'bg-indigo-500/15 text-indigo-300'
                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                      selected.includes(opt)
                        ? 'bg-indigo-500 border-indigo-500'
                        : 'border-slate-600 bg-slate-800/50'
                    }`}>
                      {selected.includes(opt) && (
                        <CheckCircle2 className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <span className="truncate text-left">{opt}</span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── DateRangeDropdown Component ───────────────────────────
function DateRangeDropdown({
  value,
  onChange,
}: {
  value: string
  onChange: (val: string) => void
}) {
  const { open, setOpen, popoverRef } = usePopover()
  const currentLabel = dateRanges.find(d => d.value === value)?.label || 'All Time'
  const isActive = value !== 'all'

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
          isActive
            ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25 shadow-lg shadow-indigo-500/5'
            : 'bg-slate-800/60 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10'
        }`}
      >
        <Calendar className="h-3.5 w-3.5" />
        {currentLabel}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 z-50 min-w-[180px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-2 border-b border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-2">Date Range</span>
            </div>
            <div className="p-1.5">
              {dateRanges.map(d => (
                <button
                  key={d.value}
                  onClick={() => { onChange(d.value); setOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    value === d.value
                      ? 'bg-indigo-500/15 text-indigo-300'
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${value === d.value ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                  {d.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ColumnToggle Component ────────────────────────────────
function ColumnToggle({
  columns,
  onChange,
}: {
  columns: Record<string, boolean>
  onChange: (col: string) => void
}) {
  const { open, setOpen, popoverRef } = usePopover()
  const labels: Record<string, string> = {
    influencer: 'Influencer',
    instagram: 'Instagram',
    campaign: 'Campaign',
    location: 'Location',
    status: 'Status',
    brand_sent: 'Brand Shared',
    team_remark: 'Team Remark',
    date: 'Applied On',
    actions: 'Actions',
  }

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-400 border border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 transition-all cursor-pointer"
      >
        <Columns3 className="h-3.5 w-3.5" />
        Columns
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 z-50 min-w-[180px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-2 border-b border-white/5">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-2">Toggle Columns</span>
            </div>
            <div className="p-1.5">
              {Object.entries(labels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => onChange(key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    columns[key] ? 'text-white' : 'text-slate-500'
                  } hover:bg-white/5`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    columns[key] ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 bg-slate-800/50'
                  }`}>
                    {columns[key] && <CheckCircle2 className="h-3 w-3 text-white" />}
                  </div>
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── DensityToggle Component ───────────────────────────────
function DensityToggle({
  density,
  onChange,
}: {
  density: RowDensity
  onChange: (d: RowDensity) => void
}) {
  const { open, setOpen, popoverRef } = usePopover()
  const icons: Record<RowDensity, React.ElementType> = {
    compact: AlignJustify,
    default: AlignCenter,
    comfortable: AlignStartVertical,
  }
  const DensityIcon = icons[density]

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-400 border border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 transition-all cursor-pointer"
      >
        <DensityIcon className="h-3.5 w-3.5" />
        Density
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 z-50 min-w-[160px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-1.5">
              {(['compact', 'default', 'comfortable'] as RowDensity[]).map(d => {
                const Icon = icons[d]
                return (
                  <button
                    key={d}
                    onClick={() => { onChange(d); setOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer capitalize ${
                      density === d ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {d}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ExportDropdown Component ──────────────────────────────
function ExportDropdown({ onExport }: { onExport: (format: 'csv' | 'json') => void }) {
  const { open, setOpen, popoverRef } = usePopover()

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-400 border border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 transition-all cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" />
        Export
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 z-50 min-w-[160px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-1.5">
              <button
                onClick={() => { onExport('csv'); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                Export as CSV
              </button>
              <button
                onClick={() => { onExport('json'); setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
              >
                <FileJson className="h-3.5 w-3.5" />
                Export as JSON
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ActionsDropdown Component ─────────────────────────────
function ActionsDropdown({
  app,
  onStatusChange,
  onRevertApproval,
  onRevokeApproval,
  onRejectWithReason,
  onDeleteApp,
  onOpenNegotiate,
  onSentToBrandToggle,
  onEditRemark,
}: {
  app: Application
  onStatusChange: (id: string, status: string) => void
  onRevertApproval?: (app: Application) => void
  onRevokeApproval?: (app: Application) => void
  onRejectWithReason?: (app: Application) => void
  onDeleteApp: (id: string, name?: string) => void
  onOpenNegotiate?: (app: Application) => void
  onSentToBrandToggle?: (action: 'mark_sent' | 'unmark_sent', appId: string) => void
  onEditRemark?: (app: Application) => void
}) {
  const { open, setOpen, popoverRef } = usePopover()

  const isPaidVariable = String(app.campaigns?.budget_type || '').toLowerCase().includes('variable')
  const isPendingDeal = app.form_data?.negotiation?.status === 'pending_peer_approval'
  const isApprovedDeal = app.form_data?.negotiation?.status === 'approved'
  const proposedAmount = app.form_data?.negotiation?.proposed_amount

  const actions = [
    { label: 'Under Process', status: 'Under Process', icon: Clock, color: 'text-amber-400 hover:bg-amber-500/10' },
    {
      label: isPaidVariable && !isApprovedDeal
        ? (isPendingDeal ? `Review Deal (₹${Number(proposedAmount).toLocaleString()})` : 'Negotiate & Approve')
        : 'Approve',
      status: 'Approved',
      icon: isPaidVariable && !isApprovedDeal ? IndianRupee : UserCheck,
      color: isPaidVariable && !isApprovedDeal ? 'text-amber-400 hover:bg-amber-500/10' : 'text-emerald-400 hover:bg-emerald-500/10'
    },
    { label: 'Allow Re-Apply (Reject)', status: 'Rejected', icon: RotateCcw, color: 'text-rose-400 hover:bg-rose-500/10' },
    { label: 'Mark Completed', status: 'Completed', icon: CheckCircle2, color: 'text-purple-400 hover:bg-purple-500/10' },
    { label: 'Initiate Payment', status: 'Payment Initiated', icon: IndianRupee, color: 'text-amber-400 hover:bg-amber-500/10' },
  ].filter(a => a.status !== app.status)

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
        title="Application Actions"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 mt-1 z-50 min-w-[210px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-1 space-y-0.5">
              {/* If Paid Variable, show prominent Negotiate Deal action */}
              {isPaidVariable && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    onOpenNegotiate?.(app)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-amber-300 hover:bg-amber-500/15"
                >
                  <IndianRupee className="h-3.5 w-3.5 text-amber-400" />
                  {isPendingDeal
                    ? `Review Colleague Deal (₹${Number(proposedAmount).toLocaleString()})`
                    : isApprovedDeal
                    ? `View Approved Deal (₹${Number(proposedAmount || app.form_data?.negotiation?.approved_amount).toLocaleString()})`
                    : 'Negotiate Deal (Maker-Checker)'}
                </button>
              )}

              {app.status === 'Approved' && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      onRevertApproval?.(app)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-amber-300 hover:bg-amber-500/15"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Revert to Applied (Undo)
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setOpen(false)
                      onRevokeApproval?.(app)
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-rose-300 hover:bg-rose-500/15"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Revoke Approval with Reason
                  </button>
                  <div className="border-t border-white/10 my-1" />
                </>
              )}

              {actions.map(a => (
                <button
                  key={a.status}
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    if (a.status === 'Approved' && isPaidVariable && !isApprovedDeal) {
                      onOpenNegotiate?.(app)
                      toast.info('Paid Variable campaigns require colleague approval on negotiated commercial before approving.')
                      return
                    }
                    if (a.status === 'Rejected') {
                      if (onRejectWithReason) {
                        onRejectWithReason(app)
                      } else {
                        onStatusChange(app.id, a.status)
                      }
                    } else {
                      onStatusChange(app.id, a.status)
                    }
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${a.color}`}
                >
                  <a.icon className="h-3.5 w-3.5" />
                  {a.label}
                </button>
              ))}

              <div className="border-t border-white/10 my-1" />

              {app.form_data?.sent_to_brand?.is_sent ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    onSentToBrandToggle?.('unmark_sent', app.id)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-slate-300 hover:bg-white/5"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-400" />
                  Reset Sent to Brand
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setOpen(false)
                    onSentToBrandToggle?.('mark_sent', app.id)
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-purple-300 hover:bg-purple-500/15"
                >
                  <Share2 className="h-3.5 w-3.5 text-purple-400" />
                  Mark as Sent to Brand
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  onEditRemark?.(app)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-cyan-300 hover:bg-cyan-500/15"
              >
                <MessageSquareText className="h-3.5 w-3.5 text-cyan-400" />
                {app.team_remark ? 'Edit Team Remark' : 'Add Team Remark'}
              </button>

              <div className="border-t border-white/10 my-1" />

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  onDeleteApp(app.id, app.users?.full_name)
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer text-red-400 hover:bg-red-500/15"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Reset Application (Delete)
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── SortableHeader Component ──────────────────────────────
function SortableHeader({
  label,
  column,
  sortConfig,
  onSort,
}: {
  label: string
  column: string
  sortConfig: SortConfig
  onSort: (col: string) => void
}) {
  const isActive = sortConfig.column === column && sortConfig.direction !== null
  const SortIcon = isActive
    ? sortConfig.direction === 'asc' ? ArrowUp : ArrowDown
    : ArrowUpDown

  return (
    <button
      onClick={() => onSort(column)}
      className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold transition-colors cursor-pointer group whitespace-nowrap ${
        isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
      <SortIcon className={`h-3 w-3 transition-all ${isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
    </button>
  )
}

// ─── Skeleton Row ──────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-white/[0.03]">
      <td className="w-10 px-2 py-3 text-center"><div className="w-4 h-4 mx-auto rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-slate-800 animate-pulse shrink-0" />
          <div className="space-y-1.5">
            <div className="w-24 h-3 rounded bg-slate-800 animate-pulse" />
            <div className="w-16 h-2 rounded bg-slate-800/60 animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-3 py-3"><div className="w-20 h-3 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-18 h-3 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-16 h-3 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-16 h-5 rounded-full bg-slate-800 animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-16 h-5 rounded-full bg-slate-800 animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-20 h-5 rounded-lg bg-slate-800 animate-pulse" /></td>
      <td className="px-3 py-3"><div className="w-12 h-3 rounded bg-slate-800 animate-pulse" /></td>
      <td className="w-10 px-2 py-3 text-right"><div className="w-6 h-6 rounded-lg bg-slate-800 animate-pulse ml-auto" /></td>
    </tr>
  )
}

// ─── TeamRemarkCell Component ──────────────────────────────
const PRESET_REMARKS = [
  'Shortlisted',
  'Hold',
  'Contacted',
  'Commercial Issue',
  'Client Approved',
  'Sample Sent',
  'Video Revision',
  'Call Pending',
]

function TeamRemarkCell({
  appId,
  remark,
  remarkBy,
  remarkUpdatedAt,
  density,
  onSave,
}: {
  appId: string
  remark?: string | null
  remarkBy?: string | null
  remarkUpdatedAt?: string | null
  density: RowDensity
  onSave: (appId: string, newRemark: string) => Promise<void>
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [text, setText] = useState(remark || '')
  const [isSaving, setIsSaving] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setText(remark || '')
  }, [remark])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [isOpen])

  const handlePresetClick = (preset: string) => {
    setText(prev => {
      const trimmed = prev.trim()
      if (!trimmed) return preset
      if (trimmed.includes(preset)) return trimmed
      return `${trimmed}, ${preset}`
    })
  }

  const handleCommit = async (customVal?: string) => {
    const valueToSave = customVal !== undefined ? customVal : text
    setIsSaving(true)
    try {
      await onSave(appId, valueToSave)
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleClear = async () => {
    setIsSaving(true)
    try {
      await onSave(appId, '')
      setText('')
      setIsOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <td className={`px-3 ${densityPadding[density]}`} onClick={(e) => e.stopPropagation()}>
      <div className="relative inline-block" ref={popoverRef}>
        {remark ? (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="group max-w-[170px] flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/40 text-left cursor-pointer transition-all active:scale-95 shadow-sm"
            title={`Team Remark: "${remark}"\nBy ${remarkBy || 'Team'}${remarkUpdatedAt ? ` • ${new Date(remarkUpdatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}\n(Click to Edit)`}
          >
            <MessageSquareText className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-medium text-cyan-200/90 truncate max-w-[125px]">
              {remark}
            </span>
            <Pencil className="h-2.5 w-2.5 text-cyan-400/60 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10.5px] font-medium text-slate-500 hover:text-cyan-300 bg-white/[0.02] hover:bg-cyan-500/10 border border-dashed border-white/10 hover:border-cyan-500/40 transition-all cursor-pointer group active:scale-95 whitespace-nowrap"
            title="Click to add manual team remark"
          >
            <span className="text-slate-500 group-hover:text-cyan-400 text-xs leading-none">+</span>
            <span>Add remark</span>
          </button>
        )}

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 bg-slate-900/98 backdrop-blur-2xl border border-cyan-500/30 rounded-xl p-3 shadow-2xl shadow-black/80"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/5">
                <div className="flex items-center gap-1.5 text-cyan-400 text-[10.5px] font-bold uppercase tracking-wider">
                  <MessageSquareText className="h-3 w-3" />
                  <span>Team Remark</span>
                </div>
                {remarkBy && (
                  <span className="text-[9.5px] text-slate-400 truncate max-w-[130px]" title={`Last updated by ${remarkBy}`}>
                    By {remarkBy}
                  </span>
                )}
              </div>

              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleCommit()
                  } else if (e.key === 'Escape') {
                    setIsOpen(false)
                  }
                }}
                rows={2}
                autoFocus
                placeholder="Type team note (Press Enter to save)..."
                className="w-full bg-slate-950/80 border border-white/10 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none transition-colors"
              />

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1 mt-2">
                {PRESET_REMARKS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => handlePresetClick(p)}
                    className="text-[9.5px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer"
                  >
                    +{p}
                  </button>
                ))}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/5">
                {remark ? (
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isSaving}
                    className="text-[10px] text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                    Clear
                  </button>
                ) : (
                  <span className="text-[9px] text-slate-500">Press Enter to save</span>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isSaving}
                    className="px-2 py-1 rounded text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCommit()}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg text-[11px] font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </td>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function AllApplicationsPage() {
  const { admin } = useAdminPermissions()
  // Core data
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [negotiationModalApp, setNegotiationModalApp] = useState<Application | null>(null)

  // Table state
  const [activeStatus, setActiveStatus] = useState('Applied')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'date', direction: 'desc' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({ ...defaultColumns })
  const [density, setDensity] = useState<RowDensity>('default')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Advanced filters
  const [filters, setFilters] = useState<Filters>({
    campaign: [],
    phone: '',
    gender: [],
    state: [],
    followerRange: [],
    platform: [],
    dateRange: 'all',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [exemptionModalApp, setExemptionModalApp] = useState<Application | null>(null)
  const [selectedExemptionReason, setSelectedExemptionReason] = useState('Brand parcel/shipment delayed')
  const [customExemptionReason, setCustomExemptionReason] = useState('')

  const [revokeModalApp, setRevokeModalApp] = useState<Application | null>(null)
  const [selectedRevokeReason, setSelectedRevokeReason] = useState('Accidental approval / Selection misclick')
  const [customRevokeReason, setCustomRevokeReason] = useState('')
  const [sendRevokeEmail, setSendRevokeEmail] = useState(false)

  // Allow Re-apply / Reject with Reason Modal state
  const [rejectModalApps, setRejectModalApps] = useState<{ id: string; name?: string; campaign?: string }[] | null>(null)
  const [selectedRejectReason, setSelectedRejectReason] = useState('Follower count / criteria mismatch')
  const [customRejectReason, setCustomRejectReason] = useState('')
  const [sendRejectEmail, setSendRejectEmail] = useState(true)
  const [showImportModal, setShowImportModal] = useState(false)
  const [brandSentFilter, setBrandSentFilter] = useState<'all' | 'sent' | 'not_sent'>('all')
  const [showSentToBrandModal, setShowSentToBrandModal] = useState(false)
  const [sentToBrandBatchLabel, setSentToBrandBatchLabel] = useState('')
  const [sentToBrandNotes, setSentToBrandNotes] = useState('')
  const [sentToBrandSubmitting, setSentToBrandSubmitting] = useState(false)

  // Team Remark Modal state
  const [remarkModalApp, setRemarkModalApp] = useState<Application | null>(null)
  const [modalRemarkText, setModalRemarkText] = useState('')
  const [modalRemarkSaving, setModalRemarkSaving] = useState(false)

  const handleUpdateTeamRemark = async (appId: string, newRemark: string) => {
    const trimmed = newRemark.trim()
    const now = new Date().toISOString()
    const author = admin?.name || admin?.email || 'Admin'

    // Optimistic update
    setApplications(prev =>
      prev.map(a =>
        a.id === appId
          ? {
              ...a,
              team_remark: trimmed || null,
              team_remark_by: trimmed ? author : null,
              team_remark_updated_at: trimmed ? now : null,
              form_data: {
                ...(a.form_data || {}),
                team_remark: trimmed || null,
                team_remark_by: trimmed ? author : null,
                team_remark_updated_at: trimmed ? now : null,
              }
            }
          : a
      )
    )

    try {
      const res = await fetch(`/api/admin/applications/${appId}/remark`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remark: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update team remark')
      toast.success(trimmed ? 'Team remark updated' : 'Team remark cleared')
    } catch (err: any) {
      toast.error(err.message || 'Failed to update team remark')
      fetchApplications(true)
    }
  }

  const sentCount = useMemo(() => applications.filter(a => a.form_data?.sent_to_brand?.is_sent).length, [applications])
  const unsharedCount = useMemo(() => applications.filter(a => !a.form_data?.sent_to_brand?.is_sent).length, [applications])

  const handleBulkSentToBrand = async () => {
    if (selectedIds.size === 0) return
    setSentToBrandSubmitting(true)
    try {
      const res = await fetch('/api/admin/applications/sent-to-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: Array.from(selectedIds),
          batch_label: sentToBrandBatchLabel.trim() || undefined,
          notes: sentToBrandNotes.trim() || undefined,
          action: 'mark_sent',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update Sent to Brand status')
      toast.success(data.message)
      setShowSentToBrandModal(false)
      setSelectedIds(new Set())
      setSentToBrandBatchLabel('')
      setSentToBrandNotes('')
      fetchApplications()
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setSentToBrandSubmitting(false)
    }
  }

  const handleSingleSentToBrand = async (action: 'mark_sent' | 'unmark_sent', appId: string) => {
    setSentToBrandSubmitting(true)
    try {
      const res = await fetch('/api/admin/applications/sent-to-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: [appId],
          batch_label: action === 'mark_sent' ? `Batch - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : undefined,
          action,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update Sent to Brand status')
      toast.success(data.message)
      fetchApplications()
    } catch (err: any) {
      toast.error(err.message || 'Failed')
    } finally {
      setSentToBrandSubmitting(false)
    }
  }

  // Edit Application Form Responses Modal
  const [editingResponsesApp, setEditingResponsesApp] = useState<Application | null>(null)
  const [editResponsesData, setEditResponsesData] = useState<Record<string, any>>({})
  const [savingResponsesEdit, setSavingResponsesEdit] = useState(false)

  const openEditResponsesModal = (app: Application) => {
    const internalKeys = ['order_details', 'rejection_reason', 'order_details_approved', 'order_history', 'payment_requests', 'payment_request_amount', 'payment_request_reason', 'supporting_document', 'live_date', 'payment_reason', 'payment_amount']
    const customResponses: Record<string, any> = {}
    if (app.form_data) {
      Object.entries(app.form_data).forEach(([k, v]) => {
        if (!internalKeys.includes(k) && !k.startsWith('_')) {
          customResponses[k] = v
        }
      })
    }
    setEditingResponsesApp(app)
    setEditResponsesData({ ...customResponses })
  }

  const handleSaveResponsesEdits = async () => {
    if (!editingResponsesApp) return
    setSavingResponsesEdit(true)
    try {
      const currentFormData = editingResponsesApp.form_data || {}
      const updatedFormData = {
        ...currentFormData,
        ...editResponsesData,
        _edited_by_admin: {
          at: new Date().toISOString(),
        }
      }

      const res = await fetch(`/api/admin/applications/${editingResponsesApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_data: updatedFormData,
          send_email: false,
        }),
      })

      if (!res.ok) throw new Error('Failed to update application responses')

      setApplications(prev => prev.map(a => a.id === editingResponsesApp.id ? { ...a, form_data: updatedFormData } : a))
      toast.success('Application responses updated successfully')
      setEditingResponsesApp(null)
    } catch {
      toast.error('Failed to update application responses')
    } finally {
      setSavingResponsesEdit(false)
    }
  }

  const updateApplicationTimeline = async (
    appId: string,
    payload: {
      is_delay_exempted?: boolean
      delay_exemption_reason?: string
      completion_deadline?: string
      extend_days?: number
    }
  ) => {
    try {
      const res = await fetch(`/api/admin/applications/${appId}/timeline`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update timeline')

      setApplications(prev =>
        prev.map(a => (a.id === appId ? { ...a, ...data.application } : a))
      )
      toast.success(data.message || 'Timeline updated successfully')
      setExemptionModalApp(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update timeline')
    }
  }

  // ─── Derived data from applications ────────────────────
  const uniqueCampaigns = useMemo(() =>
    [...new Set(applications.map(a => a.campaigns?.brand_name).filter(Boolean))].sort(),
    [applications]
  )
  const uniqueStates = useMemo(() =>
    [...new Set(applications.map(a => a.users?.state).filter(Boolean))].sort(),
    [applications]
  )
  const uniquePlatforms = useMemo(() =>
    [...new Set(applications.map(a => a.campaigns?.platform).filter(Boolean))].sort(),
    [applications]
  )
  const uniqueGenders = useMemo(() =>
    [...new Set(applications.map(a => a.users?.gender).filter(Boolean))].sort(),
    [applications]
  )

  // ─── Active filter count ───────────────────────────────
  const activeFilterCount = useMemo(() =>
    filters.campaign.length +
    filters.gender.length +
    filters.state.length +
    filters.followerRange.length +
    filters.platform.length +
    (filters.phone.trim() ? 1 : 0) +
    (filters.dateRange !== 'all' ? 1 : 0),
    [filters]
  )

  // ─── Fetch ─────────────────────────────────────────────
  const fetchApplications = useCallback(async (isBackground = false) => {
    if (!isBackground && applications.length === 0) {
      setLoading(true)
    }
    try {
      const res = await fetch(`/api/admin/applications`)
      const data = await res.json()
      const list = data.applications || []
      setApplications(list)
      setFastCache('admin_applications_cache', list)
    } catch {
      if (!isBackground) toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [applications.length])

  useEffect(() => {
    const cached = getFastCache<Application[]>('admin_applications_cache')
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setApplications(cached)
      setLoading(false)
      fetchApplications(true)
    } else {
      fetchApplications(false)
    }
  }, [fetchApplications])

  // Auto-refresh when influencers apply or data changes
  useRealtime({ table: 'applications', onChange: fetchApplications })

  // ─── Filter + Sort + Paginate ──────────────────────────
  const processedData = useMemo(() => {
    let result = [...applications]

    // Status filter
    if (activeStatus !== 'All') {
      result = result.filter(a => a.status === activeStatus)
    }

    // Brand Shared filter
    if (brandSentFilter === 'sent') {
      result = result.filter(a => a.form_data?.sent_to_brand?.is_sent)
    } else if (brandSentFilter === 'not_sent') {
      result = result.filter(a => !a.form_data?.sent_to_brand?.is_sent)
    }

    // Search (Name, Influencer ID, Instagram, Email, Brand, Campaign Code, Phone / Mobile)
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim()
      const qDigits = searchQuery.replace(/\D/g, '')
      result = result.filter(a => {
        const textFields = `${a.users?.full_name} ${a.users?.influencer_id} ${a.users?.instagram_username} ${a.users?.email} ${a.campaigns?.brand_name} ${a.campaigns?.campaign_code} ${a.team_remark || ''} ${a.team_remark_by || ''}`.toLowerCase()
        if (textFields.includes(q)) return true

        const phoneList = [
          a.users?.mobile,
          a.manager_phone,
          a.form_data?.phone,
          a.form_data?.whatsapp_number,
          a.form_data?.mobile,
          a.form_data?.contact_number,
          a.form_data?.calling_number,
          a.form_data?.order_details?.phone,
          a.form_data?.order_details?.mobile,
          a.form_data?.order_details?.whatsapp,
        ].filter(Boolean).map(String)

        if (phoneList.some(p => p.toLowerCase().includes(q))) return true
        if (qDigits.length >= 3 && phoneList.some(p => p.replace(/\D/g, '').includes(qDigits))) return true

        return false
      })
    }

    // Advanced filters
    if (filters.campaign.length > 0) {
      result = result.filter(a =>
        filters.campaign.includes(a.campaigns?.brand_name) ||
        filters.campaign.includes(a.campaigns?.campaign_code)
      )
    }
    if (filters.phone?.trim()) {
      const pQuery = filters.phone.toLowerCase().trim()
      const pDigits = filters.phone.replace(/\D/g, '')
      result = result.filter(a => {
        const phoneList = [
          a.users?.mobile,
          a.manager_phone,
          a.form_data?.phone,
          a.form_data?.whatsapp_number,
          a.form_data?.mobile,
          a.form_data?.contact_number,
          a.form_data?.calling_number,
          a.form_data?.order_details?.phone,
          a.form_data?.order_details?.mobile,
          a.form_data?.order_details?.whatsapp,
        ].filter(Boolean).map(String)

        if (phoneList.some(p => p.toLowerCase().includes(pQuery))) return true
        if (pDigits.length >= 3 && phoneList.some(p => p.replace(/\D/g, '').includes(pDigits))) return true
        return false
      })
    }
    if (filters.gender.length > 0) {
      result = result.filter(a => filters.gender.includes(a.users?.gender))
    }
    if (filters.state.length > 0) {
      result = result.filter(a => filters.state.includes(a.users?.state))
    }
    if (filters.platform.length > 0) {
      result = result.filter(a => filters.platform.includes(a.campaigns?.platform))
    }
    if (filters.followerRange.length > 0) {
      result = result.filter(a => {
        const f = a.users?.followers || 0
        return filters.followerRange.some(label => {
          const range = followerRanges.find(r => r.label === label)
          return range && f >= range.min && f <= range.max
        })
      })
    }
    if (filters.dateRange !== 'all') {
      result = result.filter(a => isInDateRange(a.created_at, filters.dateRange))
    }

    // Sort
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let valA: any, valB: any
        switch (sortConfig.column) {
          case 'name': valA = a.users?.full_name?.toLowerCase() || ''; valB = b.users?.full_name?.toLowerCase() || ''; break
          case 'followers': valA = a.users?.followers || 0; valB = b.users?.followers || 0; break
          case 'brand': valA = a.campaigns?.brand_name?.toLowerCase() || ''; valB = b.campaigns?.brand_name?.toLowerCase() || ''; break
          case 'location': valA = a.users?.state?.toLowerCase() || ''; valB = b.users?.state?.toLowerCase() || ''; break
          case 'status': valA = a.status; valB = b.status; break
          case 'team_remark': valA = a.team_remark?.toLowerCase() || ''; valB = b.team_remark?.toLowerCase() || ''; break
          case 'date': valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime(); break
          default: return 0
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [applications, activeStatus, brandSentFilter, searchQuery, filters, sortConfig])

  const totalFiltered = processedData.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)
  const startIndex = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalFiltered)

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [activeStatus, brandSentFilter, searchQuery, filters, pageSize])

  // ─── Sort handler ──────────────────────────────────────
  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        if (prev.direction === 'asc') return { column, direction: 'desc' }
        if (prev.direction === 'desc') return { column: '', direction: null }
      }
      return { column, direction: 'asc' }
    })
  }, [])

  // ─── Selection ─────────────────────────────────────────
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length && paginatedData.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedData.map(a => a.id)))
    }
  }, [selectedIds, paginatedData])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // ─── Filter toggle helpers ─────────────────────────────
  const toggleFilter = useCallback((key: 'campaign' | 'gender' | 'state' | 'followerRange' | 'platform', val: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter((v: string) => v !== val) : [...prev[key], val],
    }))
    setSelectedIds(new Set())
  }, [])

  const clearFilter = useCallback((key: keyof Filters) => {
    setFilters(prev => ({ ...prev, [key]: key === 'phone' ? '' : [] }))
    setSelectedIds(new Set())
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({ campaign: [], phone: '', gender: [], state: [], followerRange: [], platform: [], dateRange: 'all' })
    setSelectedIds(new Set())
  }, [])

  // ─── Bulk actions ──────────────────────────────────────
  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const res = await fetch(`/api/admin/applications/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: Array.from(selectedIds), status: newStatus }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed')
      if (data.message) {
        toast.info(data.message)
      } else {
        toast.success(`${data.updatedCount || selectedIds.size} applications updated`)
      }
      fetchApplications()
      setSelectedIds(new Set())
    } catch (err: any) {
      toast.error(err.message || 'Failed to perform bulk action')
    } finally {
      setBulkUpdating(false)
    }
  }

  const updateSingleStatus = async (
    id: string,
    newStatus: string,
    extraPayload?: { rejection_reason?: string; send_email?: boolean; is_revert?: boolean }
  ) => {
    if (newStatus === 'Approved') {
      const targetApp = applications.find(a => a.id === id)
      const isPaidVar = String(targetApp?.campaigns?.budget_type || '').toLowerCase().includes('variable')
      if (isPaidVar && targetApp?.form_data?.negotiation?.status !== 'approved') {
        if (targetApp) setNegotiationModalApp(targetApp)
        toast.error('Paid Variable campaigns require a negotiated deal approved by a colleague.')
        return
      }
    }

    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extraPayload }),
      })
      const resData = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (resData.requires_peer_approval) {
          const targetApp = applications.find(a => a.id === id)
          if (targetApp) setNegotiationModalApp(targetApp)
        }
        throw new Error(resData.error || 'Failed')
      }
      setApplications(prev => prev.map(a => a.id === id ? {
        ...a,
        status: newStatus,
        form_data: extraPayload?.rejection_reason
          ? { ...(a.form_data || {}), rejection_reason: extraPayload.rejection_reason, revocation_note: extraPayload.rejection_reason }
          : a.form_data
      } : a))

      const target = applications.find(a => a.id === id)
      const creatorName = target?.users?.full_name || 'Creator'

      if (newStatus === 'Approved') {
        toast.success(`Approved ${creatorName}!`, {
          description: 'Approved by mistake? Click Undo to revert.',
          duration: 8000,
          action: {
            label: 'Undo',
            onClick: () => updateSingleStatus(id, 'Applied', { is_revert: true, send_email: false }),
          },
        })
      } else if (newStatus === 'Applied' && extraPayload?.is_revert) {
        toast.success(`Approval reverted. ${creatorName} moved back to Applied.`)
      } else if (newStatus === 'Rejected' && extraPayload?.rejection_reason) {
        toast.success(`Application rejected & re-apply enabled for ${creatorName}.`)
      } else {
        toast.success(`Application marked as ${newStatus}`)
      }
    } catch {
      toast.error('Failed to update status')
    }
  }

  const handleRevertApproval = (app: Application) => {
    const hasOrder = Boolean(app.form_data?.order_details || app.form_data?.order_details_approved)
    const hasPayment = Boolean(app.form_data?.payment_request)
    
    let confirmMsg = `Are you sure you want to revert approval for ${app.users?.full_name || 'this creator'} and move back to Applied? This will remove the campaign from their Approved tab.`
    if (hasOrder || hasPayment) {
      confirmMsg = `⚠️ WARNING: ${app.users?.full_name || 'Creator'} has already submitted order/payment details. Reverting approval will cancel active progress and move application back to Pending. Proceed?`
    }

    if (confirm(confirmMsg)) {
      updateSingleStatus(app.id, 'Applied', { is_revert: true, send_email: false })
    }
  }

  const handleDeleteApplication = async (id: string, influencerName?: string) => {
    if (!confirm(`Are you sure you want to reset/delete this application${influencerName ? ` for ${influencerName}` : ''}? This will allow the creator to apply completely fresh from scratch.`)) {
      return
    }
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setApplications(prev => prev.filter(a => a.id !== id))
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
      toast.success('Application reset successfully. Creator can now apply again from scratch!')
    } catch {
      toast.error('Failed to reset application')
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    if (!confirm(`Are you sure you want to reset/delete ${selectedIds.size} applications? Selected creators will be able to apply again from scratch.`)) {
      return
    }
    setBulkUpdating(true)
    try {
      const deletePromises = Array.from(selectedIds).map(id =>
        fetch(`/api/admin/applications/${id}`, { method: 'DELETE' })
      )
      await Promise.all(deletePromises)
      setApplications(prev => prev.filter(a => !selectedIds.has(a.id)))
      toast.success(`${selectedIds.size} applications reset successfully`)
      setSelectedIds(new Set())
    } catch {
      toast.error('Failed to reset applications')
    } finally {
      setBulkUpdating(false)
    }
  }

  // ─── Export ────────────────────────────────────────────
  const handleExport = useCallback((format: 'csv' | 'json') => {
    const data = processedData.map(a => {
      const base = {
        name: a.users?.full_name || '',
        influencer_id: a.users?.influencer_id || '',
        email: a.users?.email || '',
        mobile: a.users?.mobile || '',
        instagram: a.users?.instagram_username || '',
        followers: a.users?.followers || 0,
        gender: a.users?.gender || '',
        state: a.users?.state || '',
        city: a.users?.city || '',
        brand: a.campaigns?.brand_name || '',
        campaign_code: a.campaigns?.campaign_code || '',
        platform: a.campaigns?.platform || '',
        status: a.status,
        brand_shared_status: a.form_data?.sent_to_brand?.is_sent ? 'Sent' : 'Not Sent',
        brand_shared_batch: a.form_data?.sent_to_brand?.batch_label || '',
        brand_shared_date: a.form_data?.sent_to_brand?.sent_at ? new Date(a.form_data.sent_to_brand.sent_at).toLocaleDateString('en-IN') : '',
        team_remark: a.team_remark || '',
        team_remark_by: a.team_remark_by || '',
        team_remark_updated_at: a.team_remark_updated_at ? new Date(a.team_remark_updated_at).toLocaleString('en-IN') : '',
        partial_payment: a.partial_payment,
        final_payment: a.final_payment,
        pending_amount: a.pending_amount,
        applied_on: a.created_at,
      }

      const customFields: Record<string, any> = {}
      if (a.form_data) {
        Object.entries(a.form_data).forEach(([k, v]) => {
          if (k === 'order_details' && typeof v === 'object' && v !== null) {
            Object.entries(v).forEach(([ok, ov]) => {
              customFields[`order_details_${ok}`] = typeof ov === 'object' ? JSON.stringify(ov) : String(ov)
            })
          } else if (k === 'order_history' || k === 'payment_requests') {
            customFields[k] = JSON.stringify(v)
          } else {
            customFields[k] = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
          }
        })
      }

      return { ...base, ...customFields }
    })

    let content: string
    let mime: string
    let ext: string

    if (format === 'csv') {
      const headerSet = new Set<string>()
      data.forEach(row => Object.keys(row).forEach(k => headerSet.add(k)))
      const headers = Array.from(headerSet)
      const rows = data.map(row => headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(','))
      content = [headers.join(','), ...rows].join('\n')
      mime = 'text/csv'
      ext = 'csv'
    } else {
      content = JSON.stringify(data, null, 2)
      mime = 'application/json'
      ext = 'json'
    }

    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `applications-export.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${data.length} records as ${ext.toUpperCase()}`)
  }, [processedData])

  // ─── Column toggle ────────────────────────────────────
  const toggleColumn = useCallback((col: string) => {
    setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))
  }, [])

  // ─── Status counts ────────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    applications.forEach(a => { counts[a.status] = (counts[a.status] || 0) + 1 })
    return counts
  }, [applications])

  // ─── Loading State ─────────────────────────────────────
  const isInitialLoading = loading && applications.length === 0

  return (
    <div className="space-y-5 pb-24 relative">
      {/* ─── Header Injection ───────────────────────────── */}
      <SetAdminHeader>
        <div className="flex items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">All Applications</h1>
            <p className="text-xs text-slate-400">
              Manage applications across all active campaigns • <span className="text-indigo-300 font-semibold">{applications.length}</span> total
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Import (Google Form / CSV)</span>
            </button>
            <ExportDropdown onExport={handleExport} />
          </div>
        </div>
      </SetAdminHeader>

      {/* ─── Status Tabs & Brand Shared Filter (Wrap without Horizontal Scrollbar) ─── */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/40 p-1.5 rounded-2xl border border-white/5">
        <div className="flex flex-wrap items-center gap-1">
          {statusFilters.map(f => (
            <button
              key={f}
              onClick={() => { setActiveStatus(f); setSelectedIds(new Set()); setExpandedId(null) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                activeStatus === f
                  ? 'bg-white/[0.12] text-white shadow-sm border border-white/10'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
              }`}
            >
              <span>{f}</span>
              {f !== 'All' && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeStatus === f ? 'bg-indigo-500/30 text-indigo-200' : 'bg-white/5 text-slate-500'}`}>
                  {statusCounts[f] || 0}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Brand Shared Toggle Pills */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-white/10 shrink-0">
          <span className="text-[10px] uppercase font-bold text-slate-400 px-2 flex items-center gap-1">
            <Share2 className="h-3 w-3 text-purple-400" />
            Brand:
          </span>
          <button
            onClick={() => setBrandSentFilter('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              brandSentFilter === 'all'
                ? 'bg-white/10 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setBrandSentFilter('not_sent')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              brandSentFilter === 'not_sent'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            Not Sent ({unsharedCount})
          </button>
          <button
            onClick={() => setBrandSentFilter('sent')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              brandSentFilter === 'sent'
                ? 'bg-purple-600/20 text-purple-200 border border-purple-500/40 shadow-sm'
                : 'text-purple-400/80 hover:text-purple-300'
            }`}
          >
            <Share2 className="h-3 w-3" />
            Sent ({sentCount})
          </button>
        </div>
      </div>

      {/* ─── Toolbar ────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchQuery(e.target.value); setSelectedIds(new Set()) }}
              placeholder="Search name, phone, email, brand..."
              className="pl-9 bg-slate-900/50 border-white/[0.06] text-white h-9 text-xs focus-visible:ring-indigo-500/50 rounded-xl w-full transition-all hover:border-white/10 placeholder:text-slate-600"
            />
          </div>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
              showFilters || activeFilterCount > 0
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
                : 'bg-slate-800/60 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10'
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center h-4.5 w-4.5 rounded-full bg-indigo-500 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Right-side controls */}
          <ColumnToggle columns={visibleCols} onChange={toggleColumn} />
          <DensityToggle density={density} onChange={setDensity} />
          <ExportDropdown onExport={handleExport} />
        </div>

        {/* Expanded Filters Row */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0, overflow: 'hidden' }}
              animate={{ height: 'auto', opacity: 1, overflow: 'visible' }}
              exit={{ height: 0, opacity: 0, overflow: 'hidden' }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <FilterDropdown
                  label="Campaign"
                  icon={Megaphone}
                  options={uniqueCampaigns}
                  selected={filters.campaign}
                  onToggle={(v) => toggleFilter('campaign', v)}
                  onClear={() => clearFilter('campaign')}
                />
                <FilterDropdown
                  label="Gender"
                  icon={Users}
                  options={uniqueGenders}
                  selected={filters.gender}
                  onToggle={(v) => toggleFilter('gender', v)}
                  onClear={() => clearFilter('gender')}
                />
                <FilterDropdown
                  label="State"
                  icon={MapPin}
                  options={uniqueStates}
                  selected={filters.state}
                  onToggle={(v) => toggleFilter('state', v)}
                  onClear={() => clearFilter('state')}
                />
                <FilterDropdown
                  label="Followers"
                  icon={Users}
                  options={followerRanges.map(r => r.label)}
                  selected={filters.followerRange}
                  onToggle={(v) => toggleFilter('followerRange', v)}
                  onClear={() => clearFilter('followerRange')}
                />
                <FilterDropdown
                  label="Platform"
                  icon={Instagram}
                  options={uniquePlatforms}
                  selected={filters.platform}
                  onToggle={(v) => toggleFilter('platform', v)}
                  onClear={() => clearFilter('platform')}
                />
                {/* Phone Number Filter */}
                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={filters.phone}
                    onChange={(e) => {
                      setFilters(prev => ({ ...prev, phone: e.target.value }))
                      setSelectedIds(new Set())
                    }}
                    placeholder="Filter phone..."
                    className={`pl-8 pr-7 py-2 rounded-xl text-xs font-medium border transition-all focus:outline-none ${
                      filters.phone.trim()
                        ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25 shadow-lg shadow-indigo-500/5'
                        : 'bg-slate-800/60 text-slate-300 border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 focus:border-indigo-500/40'
                    } w-36 placeholder:text-slate-500`}
                  />
                  {filters.phone && (
                    <button
                      onClick={() => clearFilter('phone')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      title="Clear phone filter"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <DateRangeDropdown
                  value={filters.dateRange}
                  onChange={(v) => { setFilters(prev => ({ ...prev, dateRange: v })); setSelectedIds(new Set()) }}
                />
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    Clear all
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active filter chips */}
        {activeFilterCount > 0 && !showFilters && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold mr-1">Active:</span>
            {filters.campaign.map(c => (
              <span key={`c-${c}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] border border-indigo-500/15">
                <Megaphone className="h-3 w-3 text-indigo-400" />
                {c}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-white" onClick={() => toggleFilter('campaign', c)} />
              </span>
            ))}
            {filters.phone && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] border border-indigo-500/15">
                <Phone className="h-3 w-3 text-indigo-400" />
                {filters.phone}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-white" onClick={() => clearFilter('phone')} />
              </span>
            )}
            {filters.gender.map(g => (
              <span key={`g-${g}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] border border-indigo-500/15">
                {g}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-white" onClick={() => toggleFilter('gender', g)} />
              </span>
            ))}
            {filters.state.map(s => (
              <span key={`s-${s}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] border border-indigo-500/15">
                {s}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-white" onClick={() => toggleFilter('state', s)} />
              </span>
            ))}
            {filters.followerRange.map(r => (
              <span key={`f-${r}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] border border-indigo-500/15">
                {r}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-white" onClick={() => toggleFilter('followerRange', r)} />
              </span>
            ))}
            {filters.platform.map(p => (
              <span key={`p-${p}`} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] border border-indigo-500/15">
                {p}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-white" onClick={() => toggleFilter('platform', p)} />
              </span>
            ))}
            {filters.dateRange !== 'all' && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/10 text-indigo-400 text-[11px] border border-indigo-500/15">
                {dateRanges.find(d => d.value === filters.dateRange)?.label}
                <X className="h-2.5 w-2.5 cursor-pointer hover:text-white" onClick={() => setFilters(prev => ({ ...prev, dateRange: 'all' }))} />
              </span>
            )}
            <button onClick={clearAllFilters} className="text-[11px] text-slate-500 hover:text-red-400 ml-1 cursor-pointer">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ─── Table ──────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/[0.06] bg-slate-900/30 overflow-hidden">
        <div className="w-full overflow-x-auto no-scrollbar hide-scrollbar [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          <table className="w-full text-left border-collapse table-auto">
            {/* Header */}
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-900/60">
                {/* Checkbox */}
                <th className="w-10 px-2 py-3 text-center">
                  <div
                    onClick={handleSelectAll}
                    className={`w-[18px] h-[18px] mx-auto rounded flex items-center justify-center border transition-colors cursor-pointer ${
                      selectedIds.size === paginatedData.length && paginatedData.length > 0
                        ? 'bg-indigo-500 border-indigo-500 text-white'
                        : selectedIds.size > 0
                        ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'
                        : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                    }`}
                  >
                    {selectedIds.size === paginatedData.length && paginatedData.length > 0 && <CheckCircle2 className="h-3 w-3" />}
                    {selectedIds.size > 0 && selectedIds.size < paginatedData.length && <div className="w-2 h-0.5 bg-current rounded-full" />}
                  </div>
                </th>

                {visibleCols.influencer && (
                  <th className="px-3 py-3 text-left">
                    <SortableHeader label="Influencer" column="name" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.instagram && (
                  <th className="px-3 py-3 text-left">
                    <SortableHeader label="Instagram" column="followers" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.campaign && (
                  <th className="px-3 py-3 text-left">
                    <SortableHeader label="Campaign" column="brand" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.location && (
                  <th className="px-3 py-3 text-left">
                    <SortableHeader label="Location" column="location" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.status && (
                  <th className="px-3 py-3 text-left">
                    <SortableHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.brand_sent && (
                  <th className="px-3 py-3 text-left">
                    <span className="text-[10.5px] text-slate-400 uppercase tracking-wider font-bold flex items-center gap-1 whitespace-nowrap">
                      <Share2 className="h-3 w-3 text-purple-400" />
                      Brand Shared
                    </span>
                  </th>
                )}
                {visibleCols.team_remark && (
                  <th className="px-3 py-3 text-left">
                    <SortableHeader label="Team Remark" column="team_remark" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.date && (
                  <th className="px-3 py-3 text-left">
                    <SortableHeader label="Applied" column="date" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.actions && (
                  <th className="w-10 px-2 py-3 text-right">
                    <span className="text-[11px] text-slate-600 uppercase tracking-wider font-bold" />
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {isInitialLoading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={Object.values(visibleCols).filter(Boolean).length + 1} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-2xl bg-slate-800/50 flex items-center justify-center border border-white/5">
                        <Filter className="h-7 w-7 text-slate-600" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-slate-400">No applications found</h3>
                        <p className="text-xs text-slate-600 mt-1">
                          {activeFilterCount > 0 || activeStatus !== 'All' || searchQuery
                            ? 'Try adjusting your filters or search'
                            : 'Applications will appear here when influencers apply'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((app, i) => {
                  const isExpanded = expandedId === app.id
                  const isSelected = selectedIds.has(app.id)
                  const user = app.users
                  const camp = app.campaigns

                  return (
                    <React.Fragment key={app.id}>
                      <tr
                        className={`border-b border-white/[0.03] transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-indigo-500/[0.06]'
                            : isExpanded
                            ? 'bg-white/[0.02]'
                            : 'hover:bg-white/[0.02]'
                        } ${i % 2 === 0 ? '' : 'bg-white/[0.008]'}`}
                        onClick={() => setExpandedId(isExpanded ? null : app.id)}
                      >
                        {/* Checkbox */}
                        <td className={`w-10 px-2 text-center ${densityPadding[density]}`} onClick={(e) => e.stopPropagation()}>
                          <div
                            onClick={() => toggleSelection(app.id)}
                            className={`w-[18px] h-[18px] mx-auto rounded flex items-center justify-center border transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                        </td>

                        {/* Influencer */}
                        {visibleCols.influencer && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="flex items-center gap-2.5">
                              {user?.profile_photo || user?.instagram_profile_pic ? (
                                <img
                                  src={user.profile_photo || user.instagram_profile_pic}
                                  alt={user?.full_name || 'Influencer'}
                                  className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/15 shadow-md"
                                  onError={(e) => {
                                    (e.target as HTMLElement).style.display = 'none'
                                  }}
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-xs font-bold text-white shrink-0 shadow-lg shadow-indigo-500/10">
                                  {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="text-[12.5px] font-semibold text-white truncate max-w-[130px] xl:max-w-[160px]" title={user?.full_name}>
                                  {user?.full_name || 'Unknown'}
                                </p>
                                <p className="text-[10.5px] text-slate-500 font-mono truncate">
                                  {user?.influencer_id}
                                </p>
                                <div className="flex items-center gap-1 flex-wrap mt-0.5">
                                  {app.influencer_history?.active_campaigns_count ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                      ⚡ {app.influencer_history.active_campaigns_count} Active
                                    </span>
                                  ) : null}
                                  {app.influencer_history?.completed_campaigns_count ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      ✓ {app.influencer_history.completed_campaigns_count} Done
                                    </span>
                                  ) : null}
                                  {app.influencer_history?.is_first_collab ? (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                      ✨ 1st Collab
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Instagram */}
                        {visibleCols.instagram && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            {user?.instagram_username ? (
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <a 
                                    href={getInstagramUrl(user.instagram_username)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11.5px] font-semibold text-slate-300 hover:text-pink-400 hover:underline flex items-center gap-1 max-w-[120px] xl:max-w-[150px] transition-colors group/link"
                                    title={getInstagramDisplayHandle(user.instagram_username)}
                                  >
                                    <Instagram className="h-3 w-3 text-pink-400 shrink-0" />
                                    <span className="truncate">{getInstagramDisplayHandle(user.instagram_username)}</span>
                                    <ExternalLink className="h-2.5 w-2.5 text-pink-400 shrink-0 inline opacity-70 group-hover/link:opacity-100" />
                                  </a>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10.5px] text-slate-500 whitespace-nowrap">
                                    {formatFollowers(user.instagram_followers_count || user.followers)} followers
                                  </span>
                                  {user?.is_instagram_verified && (
                                    <span className="px-1 py-0.2 rounded text-[7.5px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-pink-500 text-white flex items-center gap-0.5 shadow-2xs whitespace-nowrap">
                                      <CheckCircle2 className="h-2 w-2" /> META API
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-600">—</span>
                            )}
                          </td>
                        )}

                        {/* Campaign */}
                        {visibleCols.campaign && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="min-w-0">
                              <p className="text-[11.5px] font-medium text-slate-300 flex items-center gap-1.5 truncate max-w-[120px] xl:max-w-[160px]" title={camp?.brand_name}>
                                <Megaphone className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="truncate">{camp?.brand_name || '—'}</span>
                              </p>
                              {camp?.campaign_code && (
                                <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate max-w-[110px] xl:max-w-[140px]">{camp.campaign_code}</p>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Location */}
                        {visibleCols.location && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="min-w-0 max-w-[110px] xl:max-w-[140px]" title={[user?.city, user?.state].filter(Boolean).join(', ')}>
                              <p className="text-[11.5px] text-slate-400 flex items-center gap-1 truncate">
                                <MapPin className="h-3 w-3 text-slate-600 shrink-0" />
                                <span className="truncate">{user?.city || (user?.state ? '' : '—')}</span>
                              </p>
                              {user?.state && (
                                <p className="text-[10px] text-slate-500 truncate pl-4">{user.state}</p>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Status */}
                        {visibleCols.status && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-medium border whitespace-nowrap ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusDots[app.status] || 'bg-slate-400'}`} />
                                {app.status}
                              </span>
                              {String(app.campaigns?.budget_type || '').toLowerCase().includes('variable') && (
                                app.form_data?.negotiation?.status === 'pending_peer_approval' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setNegotiationModalApp(app) }}
                                    className="text-[9.5px] font-extrabold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 hover:bg-amber-500/25 transition cursor-pointer whitespace-nowrap"
                                    title="Awaiting colleague approval for commercial deal"
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    Deal: ₹{Number(app.form_data.negotiation.proposed_amount).toLocaleString()} (Pending)
                                  </button>
                                ) : app.form_data?.negotiation?.status === 'approved' ? (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setNegotiationModalApp(app) }}
                                    className="text-[9.5px] font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded-md flex items-center gap-1 hover:bg-emerald-500/20 transition cursor-pointer whitespace-nowrap"
                                    title="Commercial deal approved by colleague"
                                  >
                                    <CheckCircle2 className="h-2.5 w-2.5" />
                                    Deal: ₹{Number(app.form_data.negotiation.proposed_amount || app.form_data.negotiation.approved_amount || 0).toLocaleString()}
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); setNegotiationModalApp(app) }}
                                    className="text-[9.5px] font-semibold text-amber-400 bg-amber-500/10 border border-dashed border-amber-500/30 px-1.5 py-0.5 rounded-md flex items-center gap-1 hover:bg-amber-500/20 transition cursor-pointer whitespace-nowrap"
                                    title="Negotiate commercial deal"
                                  >
                                    <IndianRupee className="h-2.5 w-2.5" />
                                    Negotiate Deal
                                  </button>
                                )
                              )}
                              {app.status === 'Rejected' && app.form_data?.rejection_reason && (
                                <span className="text-[9.5px] text-rose-300 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded-md max-w-[140px] truncate" title={`Reason: ${app.form_data.rejection_reason}`}>
                                  💬 {app.form_data.rejection_reason}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Brand Shared */}
                        {visibleCols.brand_sent && (
                          <td className={`px-3 ${densityPadding[density]}`} onClick={(e) => e.stopPropagation()}>
                            {app.form_data?.sent_to_brand?.is_sent ? (
                              <button
                                type="button"
                                onClick={() => handleSingleSentToBrand('unmark_sent', app.id)}
                                disabled={sentToBrandSubmitting}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/25 whitespace-nowrap hover:bg-purple-500/25 cursor-pointer transition-all active:scale-95"
                                title={`Sent on ${app.form_data.sent_to_brand.sent_at ? new Date(app.form_data.sent_to_brand.sent_at).toLocaleDateString('en-IN') : ''} by ${app.form_data.sent_to_brand.sent_by || 'Admin'} (Click to Reset)`}
                              >
                                <Share2 className="h-2.5 w-2.5 text-purple-400" />
                                <span>Sent ({app.form_data.sent_to_brand.batch_label || 'Brand'})</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSingleSentToBrand('mark_sent', app.id)}
                                disabled={sentToBrandSubmitting}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9.5px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/25 whitespace-nowrap hover:bg-amber-500/25 hover:border-amber-500/40 cursor-pointer transition-all active:scale-95"
                                title="Click to Mark as Sent to Brand"
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                                <span>Not Sent</span>
                              </button>
                            )}
                          </td>
                        )}

                        {/* Team Remark */}
                        {visibleCols.team_remark && (
                          <TeamRemarkCell
                            appId={app.id}
                            remark={app.team_remark}
                            remarkBy={app.team_remark_by}
                            remarkUpdatedAt={app.team_remark_updated_at}
                            density={density}
                            onSave={handleUpdateTeamRemark}
                          />
                        )}

                        {/* Date */}
                        {visibleCols.date && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <p className="text-[11.5px] text-slate-400 whitespace-nowrap" title={new Date(app.created_at).toLocaleString('en-IN')}>
                              {timeAgo(app.created_at)}
                            </p>
                          </td>
                        )}

                        {/* Actions */}
                        {visibleCols.actions && (
                          <td className={`w-10 px-2 text-right ${densityPadding[density]}`} onClick={(e) => e.stopPropagation()}>
                            <ActionsDropdown
                              app={app}
                              onStatusChange={updateSingleStatus}
                              onRevertApproval={handleRevertApproval}
                              onRevokeApproval={(app) => setRevokeModalApp(app)}
                              onOpenNegotiate={(app) => setNegotiationModalApp(app)}
                              onSentToBrandToggle={handleSingleSentToBrand}
                              onEditRemark={(targetApp) => {
                                setRemarkModalApp(targetApp)
                                setModalRemarkText(targetApp.team_remark || '')
                              }}
                              onRejectWithReason={(app) => {
                                setRejectModalApps([{ id: app.id, name: app.users?.full_name, campaign: app.campaigns?.brand_name }])
                                setSelectedRejectReason('Follower count / criteria mismatch')
                                setCustomRejectReason('')
                                setSendRejectEmail(true)
                              }}
                              onDeleteApp={handleDeleteApplication}
                            />
                          </td>
                        )}
                      </tr>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={Object.values(visibleCols).filter(Boolean).length + 1} className="p-0">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-white/5 px-6 py-6 space-y-6 bg-slate-950/30">
                                {/* Rejection / Re-Apply Comment if Rejected */}
                                {app.status === 'Rejected' && app.form_data?.rejection_reason && (
                                  <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5">
                                    <div className="p-1 rounded-lg bg-rose-500/20 text-rose-300 shrink-0 mt-0.5">
                                      <RotateCcw className="h-4 w-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-rose-300">Rejection Reason / Feedback Sent to Creator</p>
                                      <p className="text-xs text-rose-200 mt-0.5">{app.form_data.rejection_reason}</p>
                                    </div>
                                  </div>
                                )}
                                {/* Influencer Profile Details */}
                                <div>
                                  <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
                                    <Users className="h-3.5 w-3.5" />
                                    Influencer Profile
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Full Name</p>
                                      <p className="text-slate-300">{user?.full_name || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Influencer ID</p>
                                      <p className="text-slate-300 font-mono">{user?.influencer_id || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Email</p>
                                      <p className="text-slate-300 truncate">{user?.email || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Mobile</p>
                                      <p className="text-slate-300">{user?.mobile || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Instagram</p>
                                      <div className="text-slate-300 flex items-center gap-1">
                                        {user?.instagram_username ? (
                                          <a
                                            href={`https://instagram.com/${user.instagram_username.replace('@', '')}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 hover:text-indigo-400 hover:underline transition-colors"
                                          >
                                            <Instagram className="h-3 w-3 text-pink-400" />
                                            {user.instagram_username}
                                          </a>
                                        ) : '—'}
                                      </div>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Followers</p>
                                      <p className="text-slate-300 font-medium">
                                        {user?.followers > 0 ? user.followers.toLocaleString() : '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Location</p>
                                      <p className="text-slate-300 flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        {[user?.city, user?.state].filter(Boolean).join(', ') || '—'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Gender</p>
                                      <p className="text-slate-300">{user?.gender || '—'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Campaign Info */}
                                <div>
                                  <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
                                    <Megaphone className="h-3.5 w-3.5" />
                                    Campaign Details
                                  </p>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Brand</p>
                                      <p className="text-slate-300 font-medium">{camp?.brand_name || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Campaign Code</p>
                                      <p className="text-slate-300 font-mono">{camp?.campaign_code || '—'}</p>
                                    </div>
                                    <div>
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Platform</p>
                                      <p className="text-slate-300">{camp?.platform || '—'}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Selected Store Outlet for Store Visit Campaigns */}
                                {app.selected_store && (
                                  <div className="bg-purple-500/10 border border-purple-500/25 rounded-2xl p-4 space-y-2">
                                    <p className="text-[11px] text-purple-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                      <Store className="h-3.5 w-3.5 text-purple-400" />
                                      Selected Store Outlet / Branch (Store Visit)
                                    </p>
                                    <div className="flex items-start justify-between gap-3 flex-wrap bg-slate-900/80 p-3.5 rounded-xl border border-white/10">
                                      <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-sm font-bold text-white">{app.selected_store.name}</span>
                                          {app.selected_store.city && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 font-bold">
                                              {app.selected_store.city}{app.selected_store.state ? `, ${app.selected_store.state}` : ''}
                                            </span>
                                          )}
                                          {app.selected_store.area && (
                                            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                              📍 {app.selected_store.area}
                                            </span>
                                          )}
                                        </div>
                                        {app.selected_store.address && (
                                          <p className="text-xs text-slate-400 mt-1">{app.selected_store.address}</p>
                                        )}
                                      </div>
                                      {app.selected_store.google_maps_url && (
                                        <a
                                          href={app.selected_store.google_maps_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          onClick={(e) => e.stopPropagation()}
                                          className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          View on Maps
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Sent to Brand Quick Tracker Box */}
                                <div className="p-4 rounded-2xl bg-slate-950/70 border border-white/10 flex items-center justify-between gap-3 flex-wrap shadow-lg">
                                  <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${app.form_data?.sent_to_brand?.is_sent ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/25'}`}>
                                      <Share2 className="h-5 w-5" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-white flex items-center gap-2">
                                        {app.form_data?.sent_to_brand?.is_sent
                                          ? `📤 Sent to Brand: ${app.form_data.sent_to_brand.batch_label || 'Batch'}`
                                          : '🆕 Profile Not Shared with Brand Yet'}
                                        {app.form_data?.sent_to_brand?.is_sent && (
                                          <span className="text-[10px] font-semibold text-purple-300 bg-purple-500/20 px-2 py-0.5 rounded-full border border-purple-500/30">
                                            Logged by {app.form_data.sent_to_brand.sent_by || 'Admin'}
                                          </span>
                                        )}
                                      </p>
                                      <p className="text-[11px] text-slate-400 mt-0.5">
                                        {app.form_data?.sent_to_brand?.is_sent
                                          ? `Dispatched to brand on ${new Date(app.form_data.sent_to_brand.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                                          : 'Mark when you have shared this influencer profile with the brand.'}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {app.form_data?.sent_to_brand?.is_sent ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSingleSentToBrand('unmark_sent', app.id)
                                        }}
                                        disabled={sentToBrandSubmitting}
                                        className="h-9 text-xs border-white/10 text-slate-400 hover:text-white cursor-pointer rounded-xl"
                                      >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                        Reset Sent Status
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleSingleSentToBrand('mark_sent', app.id)
                                        }}
                                        disabled={sentToBrandSubmitting}
                                        className="h-9 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-md shadow-purple-600/25 rounded-xl px-4"
                                      >
                                        <Share2 className="h-3.5 w-3.5 mr-1.5" />
                                        Mark as Sent to Brand
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                 {/* Deliverable Completion Timeline & Admin Delay Exemption Controls */}
                                {(app.status === 'Approved' || app.status === 'Payment Requested' || app.status === 'Payment Initiated' || app.status === 'Payment Approved' || app.status === 'Completed') && (() => {
                                  const baseDate = app.updated_at ? new Date(app.updated_at) : new Date(app.created_at)
                                  const defaultDays = app.campaigns?.completion_days || 7
                                  const effectiveDeadline = app.completion_deadline 
                                    ? new Date(app.completion_deadline)
                                    : (app.campaigns?.completion_deadline ? new Date(app.campaigns.completion_deadline) : new Date(baseDate.getTime() + defaultDays * 24 * 60 * 60 * 1000))
                                  
                                  const isCompleted = Boolean(app.completion_submitted_at || app.form_data?.payment_request || app.status === 'Completed' || app.status === 'Payment Requested')
                                  const isOverdue = !isCompleted && new Date() > effectiveDeadline
                                  const diffDays = isOverdue ? Math.ceil((new Date().getTime() - effectiveDeadline.getTime()) / (1000 * 60 * 60 * 24)) : Math.max(0, Math.ceil((effectiveDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                                  
                                  return (
                                    <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 space-y-3 shadow-lg">
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-4 w-4 text-indigo-400" />
                                          <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                                            Deliverable Completion Timeline ({app.campaigns?.brand_name})
                                          </h5>
                                        </div>
                                        
                                        {/* Live Timeline Status Badge */}
                                        <div>
                                          {isCompleted ? (
                                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                              <CheckCircle2 className="h-3 w-3" />
                                              Deliverable Submitted On Time
                                            </span>
                                          ) : app.is_delay_exempted ? (
                                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5" title={app.delay_exemption_reason || 'Brand delay'}>
                                              <ShieldCheck className="h-3 w-3" />
                                              Delay Exempted ({app.delay_exemption_reason || 'Brand delay'}) — Unblocked
                                            </span>
                                          ) : isOverdue ? (
                                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-rose-500/25 text-rose-200 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                                              <AlertTriangle className="h-3 w-3 text-rose-400" />
                                              Overdue by {diffDays} days — Next Campaigns Blocked
                                            </span>
                                          ) : (
                                            <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25 flex items-center gap-1.5">
                                              <Clock className="h-3 w-3" />
                                              Due in {diffDays} days ({effectiveDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                                        <div>
                                          <p className="text-[11px]">
                                            Target Deadline: <strong className="text-white">{effectiveDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                                            {app.completion_deadline ? ' (Admin Custom Extension)' : ` (${defaultDays} days window)`}
                                          </p>
                                          {app.is_delay_exempted && app.delay_exemption_reason && (
                                            <p className="text-[11px] text-amber-300 mt-0.5">
                                              🛡️ Exemption Note: <em>"{app.delay_exemption_reason}"</em>
                                            </p>
                                          )}
                                        </div>

                                        {/* Admin Quick Action Buttons */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          {!app.is_delay_exempted ? (
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={() => setExemptionModalApp(app)}
                                              className="h-7 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold cursor-pointer"
                                            >
                                              <ShieldCheck className="h-3 w-3 mr-1" />
                                              Exempt Brand Delay
                                            </Button>
                                          ) : (
                                            <Button
                                              type="button"
                                              size="sm"
                                              onClick={() => updateApplicationTimeline(app.id, { is_delay_exempted: false })}
                                              className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-[11px] font-bold cursor-pointer"
                                            >
                                              <RotateCcw className="h-3 w-3 mr-1" />
                                              Remove Exemption
                                            </Button>
                                          )}

                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => updateApplicationTimeline(app.id, { extend_days: 7 })}
                                            className="h-7 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold cursor-pointer"
                                            title="Extend deadline by +7 days"
                                          >
                                            +7 Days
                                          </Button>

                                          <Button
                                            type="button"
                                            size="sm"
                                            onClick={() => updateApplicationTimeline(app.id, { extend_days: 14 })}
                                            className="h-7 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold cursor-pointer"
                                            title="Extend deadline by +14 days"
                                          >
                                            +14 Days
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                })()}

                                {/* Influencer Active & Past Campaigns Track Record */}
                                <InfluencerCampaignHistoryCard
                                  history={app.influencer_history}
                                  influencerName={user?.full_name}
                                />

                                {/* Application Form Responses (Custom Fields) */}
                                {app.form_data && (() => {
                                  const internalKeys = ['order_details', 'rejection_reason', 'order_details_approved', 'order_history', 'payment_requests', 'payment_request_amount', 'payment_request_reason', 'supporting_document', 'live_date', 'payment_reason', 'payment_amount']
                                  const customEntries = Object.entries(app.form_data).filter(([key]) => !internalKeys.includes(key))
                                  if (customEntries.length === 0) return null

                                  const isImage = (key: string, value: any) => {
                                    if (typeof value !== 'string') return false
                                    return value.startsWith('http') && (value.match(/\.(jpg|jpeg|png|webp|gif|svg)/i) || key.toLowerCase().includes('image') || key.toLowerCase().includes('screenshot') || key.toLowerCase().includes('photo'))
                                  }

                                  return (
                                    <div className="bg-purple-500/5 border border-purple-500/15 rounded-2xl p-5">
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="text-[11px] text-purple-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                          <ClipboardList className="h-3.5 w-3.5" />
                                          Application Form Responses
                                          <span className="text-[10px] text-slate-500 normal-case tracking-normal font-medium ml-1">({customEntries.length} fields)</span>
                                        </p>
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            openEditResponsesModal(app)
                                          }}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 px-2.5 py-1 rounded-lg border border-purple-500/25 transition-all cursor-pointer shadow-sm"
                                          title="Edit applicant responses"
                                        >
                                          <Pencil className="h-3 w-3" />
                                          Edit Responses
                                        </button>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                        {customEntries.map(([key, value]) => (
                                          <div key={key} className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
                                              {key.replace(/[_-]/g, ' ')}
                                            </p>
                                            {isImage(key, value) ? (
                                              <div className="mt-1">
                                                <a href={String(value)} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="block relative group overflow-hidden rounded-lg border border-white/10 hover:border-purple-400 transition-colors bg-black">
                                                  <img src={String(value)} alt={key} className="h-28 w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="text-xs font-bold text-white bg-black/60 px-2 py-1 rounded">View Full</span>
                                                  </div>
                                                </a>
                                              </div>
                                            ) : (
                                              <p className="text-white font-medium break-words">
                                                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (String(value) || '—')}
                                              </p>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )
                                })()}

                                {/* Payment Info */}
                                {(app.partial_payment > 0 || app.final_payment > 0 || app.pending_amount > 0 || app.manager_phone) && (
                                  <div>
                                    <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
                                      <IndianRupee className="h-3.5 w-3.5" />
                                      Payment Details
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Partial Payment</p>
                                        <p className="text-slate-300 flex items-center gap-1">
                                          {app.partial_payment > 0 ? `₹${app.partial_payment.toLocaleString()}` : '—'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Final Payment</p>
                                        <p className="text-slate-300 flex items-center gap-1">
                                          {app.final_payment > 0 ? `₹${app.final_payment.toLocaleString()}` : '—'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Pending Amount</p>
                                        <p className="text-slate-300 flex items-center gap-1">
                                          {app.pending_amount > 0 ? `₹${app.pending_amount.toLocaleString()}` : '—'}
                                        </p>
                                      </div>
                                      {app.manager_phone && (
                                        <div>
                                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Manager Phone</p>
                                          <p className="text-slate-300 flex items-center gap-1">
                                            <Phone className="h-3 w-3" />
                                            {app.manager_phone}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* Status Quick Actions Bar */}
                                <div className="p-4 rounded-xl bg-slate-900/80 border border-white/10 flex flex-wrap items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] uppercase font-bold text-slate-400">Current Status:</span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/25'}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusDots[app.status] || 'bg-slate-400'}`} />
                                      {app.status}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-[11px] text-slate-400 mr-1 font-medium">Quick Update:</span>
                                    {app.status === 'Approved' ? (
                                      <>
                                        <Button
                                          size="sm"
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); handleRevertApproval(app) }}
                                          className="h-8 px-3 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-semibold cursor-pointer"
                                          title="Undo accidental approval and move back to Applied/Pending"
                                        >
                                          <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                          Revert to Applied
                                        </Button>
                                        <Button
                                          size="sm"
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); setRevokeModalApp(app) }}
                                          className="h-8 px-3 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-xs font-semibold cursor-pointer"
                                          title="Revoke approval with a specific reason"
                                        >
                                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                          Revoke Approval
                                        </Button>
                                        <Button
                                          size="sm"
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); updateSingleStatus(app.id, 'Completed') }}
                                          className="h-8 px-3 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/25 hover:bg-purple-500/25 text-xs font-medium cursor-pointer"
                                        >
                                          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                          Mark Completed
                                        </Button>
                                        <Button
                                          size="sm"
                                          type="button"
                                          onClick={(e) => { e.stopPropagation(); updateSingleStatus(app.id, 'Payment Initiated') }}
                                          className="h-8 px-3 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 text-xs font-medium cursor-pointer"
                                        >
                                          <IndianRupee className="mr-1.5 h-3.5 w-3.5" />
                                          Initiate Payment
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        {app.status !== 'Under Process' && (
                                          <Button
                                            size="sm"
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); updateSingleStatus(app.id, 'Under Process') }}
                                            className="h-8 px-3 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/25 hover:bg-amber-500/25 text-xs font-medium cursor-pointer"
                                          >
                                            <Clock className="mr-1.5 h-3.5 w-3.5" />
                                            Under Process
                                          </Button>
                                        )}

                                        {app.status !== 'Approved' && (
                                           String(app.campaigns?.budget_type || '').toLowerCase().includes('variable') && app.form_data?.negotiation?.status !== 'approved' ? (
                                             <Button
                                               size="sm"
                                               type="button"
                                               onClick={(e) => { e.stopPropagation(); setNegotiationModalApp(app) }}
                                               className="h-8 px-3 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-semibold cursor-pointer"
                                               title="Paid Variable campaigns require commercial negotiation and colleague approval"
                                             >
                                               <IndianRupee className="mr-1 h-3.5 w-3.5 text-amber-400" />
                                               {app.form_data?.negotiation?.status === 'pending_peer_approval'
                                                 ? `Deal: ₹${Number(app.form_data.negotiation.proposed_amount).toLocaleString()} (Review Deal)`
                                                 : 'Negotiate Deal First'}
                                             </Button>
                                           ) : (
                                             <Button
                                               size="sm"
                                               type="button"
                                               onClick={(e) => { e.stopPropagation(); updateSingleStatus(app.id, 'Approved') }}
                                               className="h-8 px-3 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 hover:bg-emerald-500/25 text-xs font-medium cursor-pointer"
                                             >
                                               <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                                               Approve
                                             </Button>
                                           )
                                         )}

                                        {app.status !== 'Rejected' ? (
                                          <Button
                                            size="sm"
                                            type="button"
                                            onClick={(e) => {
                                               e.stopPropagation()
                                               setRejectModalApps([{ id: app.id, name: app.users?.full_name, campaign: app.campaigns?.brand_name }])
                                               setSelectedRejectReason('Commercials / Quote too high for this campaign')
                                               setCustomRejectReason('')
                                               setSendRejectEmail(true)
                                             }}
                                            className="h-8 px-3 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/25 hover:bg-rose-500/25 text-xs font-medium cursor-pointer"
                                            title="Reject this application and enable creator to re-apply"
                                          >
                                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                                            Allow Re-Apply
                                          </Button>
                                        ) : (
                                          <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                                            <RotateCcw className="h-3 w-3" />
                                            Re-Apply Enabled on Creator Side
                                          </span>
                                        )}
                                      </>
                                    )}

                                    <Button
                                      size="sm"
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleDeleteApplication(app.id, user?.full_name) }}
                                      className="h-8 px-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25 text-xs font-medium cursor-pointer ml-auto"
                                      title="Completely delete application so creator can apply fresh"
                                    >
                                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                      Reset (Delete)
                                    </Button>
                                  </div>
                                </div>

                                {/* Meta */}
                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                  <p className="text-[10px] text-slate-600 font-medium">
                                    Applied: {new Date(app.created_at).toLocaleString('en-IN')}
                                    {app.updated_at !== app.created_at && ` • Updated: ${new Date(app.updated_at).toLocaleString('en-IN')}`}
                                  </p>
                                  <Link href={`/admin/applications/${camp?.campaign_code || app.id}`}>
                                    <Button variant="link" className="h-auto p-0 text-[11px] text-indigo-400 cursor-pointer">View Full Campaign Context →</Button>
                                  </Link>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination ─────────────────────────────────── */}
        {totalFiltered > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.04] bg-slate-900/40">
            <div className="flex items-center gap-3">
              <span className="text-[11px] text-slate-500">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-slate-800/50 border border-white/[0.06] text-slate-300 text-[11px] rounded-lg px-2 py-1.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500/50 appearance-none"
              >
                {pageSizes.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="text-[11px] text-slate-500">
                {startIndex}–{endIndex} of {totalFiltered}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              {/* Page numbers */}
              {(() => {
                const pages: number[] = []
                const maxVisible = 5
                let start = Math.max(1, page - Math.floor(maxVisible / 2))
                let end = Math.min(totalPages, start + maxVisible - 1)
                if (end - start + 1 < maxVisible) {
                  start = Math.max(1, end - maxVisible + 1)
                }
                for (let i = start; i <= end; i++) pages.push(i)
                return pages.map(p => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-medium transition-all cursor-pointer ${
                      page === p
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20'
                        : 'text-slate-500 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {p}
                  </button>
                ))
              })()}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ─── Floating Bulk Action Bar ───────────────────── */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 80, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center justify-between gap-3 sm:gap-4 px-4 sm:px-5 py-2.5 sm:py-3 w-auto max-w-[95vw] bg-slate-900/95 backdrop-blur-2xl border border-white/15 shadow-[0_12px_45px_rgba(0,0,0,0.6)] rounded-2xl ring-1 ring-white/10 lg:ml-32"
          >
            {/* Left Selection Info & Deselect */}
            <div className="flex items-center gap-2.5 shrink-0 pr-1">
              <div className="flex h-8 px-2.5 items-center justify-center rounded-xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-extrabold text-xs">
                {selectedIds.size}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-bold text-white leading-tight">Selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-[10px] text-slate-400 hover:text-indigo-300 underline cursor-pointer text-left transition-colors"
                >
                  Deselect all
                </button>
              </div>
            </div>

            <div className="w-px h-7 bg-white/15 shrink-0" />

            {/* Buttons in a Single Aligned Row */}
            <div className="flex items-center gap-2 shrink-0 overflow-x-auto no-scrollbar scrollbar-none">
              {/* 1. APPROVE (Primary Action - Green) */}
              <Button
                size="sm"
                onClick={() => handleBulkAction('Approved')}
                disabled={bulkUpdating}
                className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-500/25 border-none cursor-pointer disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
              >
                {bulkUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                <span>APPROVE</span>
              </Button>

              {/* 2. UNDER PROCESS (Amber) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('Under Process')}
                disabled={bulkUpdating}
                className="h-9 px-3.5 rounded-xl border-amber-500/30 text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 font-bold text-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Clock className="h-3.5 w-3.5" />
                <span>UNDER PROCESS</span>
              </Button>

              {/* 3. SENT TO BRAND (Purple) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSentToBrandBatchLabel(`Batch (${selectedIds.size} Profiles) - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`)
                  setShowSentToBrandModal(true)
                }}
                disabled={bulkUpdating}
                className="h-9 px-3.5 rounded-xl border-purple-500/30 text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 font-bold text-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>SENT TO BRAND</span>
              </Button>

              {/* 4. ALLOW RE-APPLY (Rose) */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const selectedApps = Array.from(selectedIds).map(id => {
                    const app = applications.find(a => a.id === id)
                    return { id, name: app?.users?.full_name, campaign: app?.campaigns?.brand_name }
                  })
                  setRejectModalApps(selectedApps)
                  setSelectedRejectReason('Follower count / criteria mismatch')
                  setCustomRejectReason('')
                  setSendRejectEmail(true)
                }}
                disabled={bulkUpdating}
                className="h-9 px-3.5 rounded-xl border-rose-500/30 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 font-bold text-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
                title="Reject selected applications and allow creators to re-apply with feedback"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>ALLOW RE-APPLY</span>
              </Button>

              {/* 4. RESET (Red / Delete) */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDelete}
                disabled={bulkUpdating}
                className="h-9 px-3.5 rounded-xl border-red-500/30 text-red-400 bg-red-500/10 hover:bg-red-500/20 font-bold text-xs cursor-pointer disabled:opacity-50 transition-all active:scale-95 flex items-center gap-1.5"
                title="Reset/Delete selected applications"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>RESET</span>
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Admin Delay Exemption Reason Modal */}
      <AnimatePresence>
        {exemptionModalApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Exempt Creator Delay</h3>
                    <p className="text-[11px] text-slate-400">Waive overdue penalty for {exemptionModalApp.users?.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExemptionModalApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Select the reason why deliverable is delayed on brand/campaign side. This creator will be <strong>immediately unblocked</strong> from applying to other campaigns.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Standard Reason</label>
                  <select
                    value={selectedExemptionReason}
                    onChange={(e) => setSelectedExemptionReason(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-amber-400 outline-none"
                  >
                    <option value="Brand parcel/shipment delayed">📦 Brand parcel/shipment delayed</option>
                    <option value="Brand requested content revision">✏️ Brand requested content revision</option>
                    <option value="Shoot/visit rescheduled by brand">🏬 Shoot/visit rescheduled by brand</option>
                    <option value="Brand asked to hold posting">⏸️ Brand asked to hold posting</option>
                    <option value="Sample issue / replacement in transit">🔄 Sample issue / replacement in transit</option>
                    <option value="Creator medical/personal emergency">🏥 Creator personal emergency</option>
                    <option value="Custom">✍️ Custom Reason (Specify Below)</option>
                  </select>
                </div>

                {selectedExemptionReason === 'Custom' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Custom Note / Reason</label>
                    <Input
                      value={customExemptionReason}
                      onChange={(e) => setCustomExemptionReason(e.target.value)}
                      placeholder="e.g. Brand delayed product launch to next week"
                      className="bg-slate-950 border-white/10 text-white text-xs h-9"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExemptionModalApp(null)}
                  className="border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const finalReason = selectedExemptionReason === 'Custom' ? (customExemptionReason || 'Admin custom exemption') : selectedExemptionReason
                    updateApplicationTimeline(exemptionModalApp.id, {
                      is_delay_exempted: true,
                      delay_exemption_reason: finalReason,
                    })
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  Confirm & Unblock Creator
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revoke Approval Modal with Reasons */}
      <AnimatePresence>
        {revokeModalApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Revoke / Cancel Approval</h3>
                    <p className="text-[11px] text-slate-400">Cancel approved collaboration for {revokeModalApp.users?.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRevokeModalApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Select why this approval is being revoked. The application will be moved to <strong>Rejected</strong> (allowing creator to re-apply if eligible) and removed from their Approved dashboard.
                </p>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">Reason for Revocation</label>
                  <select
                    value={selectedRevokeReason}
                    onChange={(e) => setSelectedRevokeReason(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-rose-400 outline-none"
                  >
                    <option value="Accidental approval / Selection misclick">⚠️ Accidental approval / Selection misclick</option>
                    <option value="Brand campaign quota / slots filled">📦 Brand campaign quota / slots filled</option>
                    <option value="Profile / Niche criteria mismatch">🎯 Profile / Niche criteria mismatch</option>
                    <option value="Brand requested to hold/cancel selection">⏸️ Brand requested to hold/cancel selection</option>
                    <option value="Creator unresponsive / unreachable">📵 Creator unresponsive / unreachable</option>
                    <option value="Custom">✍️ Custom Reason (Specify Below)</option>
                  </select>
                </div>

                {selectedRevokeReason === 'Custom' && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Custom Revocation Note</label>
                    <Input
                      value={customRevokeReason}
                      onChange={(e) => setCustomRevokeReason(e.target.value)}
                      placeholder="e.g. Brand changed budget structure"
                      className="bg-slate-950 border-white/10 text-white text-xs h-9"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendRevokeEmail}
                      onChange={(e) => setSendRevokeEmail(e.target.checked)}
                      className="h-4 w-4 rounded accent-rose-500 bg-slate-900 border-white/20"
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-white">Send Revocation / Status Update Email to Creator</p>
                      <p className="text-[10px] text-slate-400">Leave unchecked if this was an immediate accidental misclick.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRevokeModalApp(null)}
                  className="border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const finalReason = selectedRevokeReason === 'Custom' ? (customRevokeReason || 'Approval revoked by Admin') : selectedRevokeReason
                    updateSingleStatus(revokeModalApp.id, 'Rejected', {
                      rejection_reason: finalReason,
                      send_email: sendRevokeEmail,
                      is_revert: false,
                    })
                    setRevokeModalApp(null)
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Revocation
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Allow Re-Apply / Reject with Comments Modal ─── */}
      <AnimatePresence>
        {rejectModalApps && rejectModalApps.length > 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-rose-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar scrollbar-none"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <RotateCcw className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {rejectModalApps.length === 1 ? 'Reject & Allow Re-Apply' : `Bulk Reject (${rejectModalApps.length} Selected)`}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {rejectModalApps.length === 1 
                        ? `${rejectModalApps[0].name || 'Creator'} • ${rejectModalApps[0].campaign || 'Campaign'}`
                        : `Allow ${rejectModalApps.length} creators to update details and re-apply`
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRejectModalApps(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Select Rejection Reason / Creator Feedback
                </label>
                
                <div className="space-y-2">
                  {[
                    'Follower count / criteria mismatch',
                    'Commercials / Quote too high for this campaign',
                    'Details incomplete / Needs revision',
                    'Location / City not eligible for this campaign',
                    'Please update complete delivery address & pincode',
                    'Content / Niche mismatch for this brand',
                    'Profile engagement / authenticity requirement not met',
                    'Campaign slots full for this phase',
                    'Custom'
                  ].map(r => (
                    <label
                      key={r}
                      onClick={() => setSelectedRejectReason(r)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                        selectedRejectReason === r
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-200 font-semibold'
                          : 'bg-slate-950/40 border-white/5 text-slate-400 hover:bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name="reject_reason"
                        checked={selectedRejectReason === r}
                        onChange={() => setSelectedRejectReason(r)}
                        className="accent-rose-500"
                      />
                      <span>{r === 'Custom' ? '✍️ Other / Custom Comment' : r}</span>
                    </label>
                  ))}
                </div>

                {selectedRejectReason === 'Custom' && (
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] text-slate-400">Custom Comment for Creator</label>
                    <textarea
                      value={customRejectReason}
                      onChange={(e) => setCustomRejectReason(e.target.value)}
                      placeholder="e.g. Please update your profile with active fashion reels before applying again..."
                      className="w-full h-20 p-2.5 rounded-xl bg-slate-950/60 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-rose-500/50 resize-none"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/50 border border-white/5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendRejectEmail}
                      onChange={(e) => setSendRejectEmail(e.target.checked)}
                      className="h-4 w-4 rounded accent-rose-500 bg-slate-900 border-white/20"
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-white">Send Feedback & Re-Apply instructions via Email</p>
                      <p className="text-[10px] text-slate-400">Creator will receive an email with your feedback so they can fix details.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectModalApps(null)}
                  className="border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={bulkUpdating}
                  onClick={async () => {
                    const finalReason = selectedRejectReason === 'Custom' ? (customRejectReason.trim() || 'Needs Revision / Allowed Re-Apply') : selectedRejectReason
                    if (rejectModalApps.length === 1) {
                      await updateSingleStatus(rejectModalApps[0].id, 'Rejected', {
                        rejection_reason: finalReason,
                        send_email: sendRejectEmail,
                        is_revert: false,
                      })
                    } else {
                      setBulkUpdating(true)
                      try {
                        const res = await fetch(`/api/admin/applications/bulk`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            applicationIds: rejectModalApps.map(a => a.id),
                            status: 'Rejected',
                            rejection_reason: finalReason,
                            send_email: sendRejectEmail,
                          }),
                        })
                        if (!res.ok) throw new Error('Failed')
                        const idsSet = new Set(rejectModalApps.map(a => a.id))
                        setApplications(prev => prev.map(a => idsSet.has(a.id) ? {
                          ...a,
                          status: 'Rejected',
                          form_data: {
                            ...(a.form_data || {}),
                            rejection_reason: finalReason,
                            revocation_note: finalReason,
                            revoked_at: new Date().toISOString()
                          }
                        } : a))
                        toast.success(`${rejectModalApps.length} applications rejected with comment: "${finalReason}"`)
                        setSelectedIds(new Set())
                      } catch {
                        toast.error('Failed to reject applications')
                      } finally {
                        setBulkUpdating(false)
                      }
                    }
                    setRejectModalApps(null)
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  {bulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <RotateCcw className="h-4 w-4 mr-1.5" />}
                  Confirm Rejection & Comments
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Application Form Responses Modal */}
      <AnimatePresence>
        {editingResponsesApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => !savingResponsesEdit && setEditingResponsesApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 bg-slate-950/50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-purple-400" />
                    Edit Application Responses
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editingResponsesApp.users?.full_name || 'Applicant'} •{' '}
                    <span className="font-mono text-slate-300">{editingResponsesApp.users?.influencer_id || 'ID'}</span> •{' '}
                    <span className="text-purple-300">{editingResponsesApp.campaigns?.brand_name}</span>
                  </p>
                </div>
                <button
                  onClick={() => !savingResponsesEdit && setEditingResponsesApp(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body Scrollable */}
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                <p className="text-xs text-slate-400">
                  Update any field values or fix mistakes made by the creator during form submission.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {Object.entries(editResponsesData).map(([key, val]) => {
                    const isImg = typeof val === 'string' && (val.startsWith('http') && (val.match(/\.(jpg|jpeg|png|webp|gif|svg)/i) || key.toLowerCase().includes('image') || key.toLowerCase().includes('screenshot') || key.toLowerCase().includes('photo')))
                    if (isImg) return null

                    const isBool = typeof val === 'boolean' || val === 'true' || val === 'false' || val === 'Yes' || val === 'No'

                    return (
                      <div key={key} className={typeof val === 'string' && val.length > 40 ? 'sm:col-span-2' : ''}>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block truncate">
                          {key.replace(/[_-]/g, ' ')}
                        </label>
                        {isBool ? (
                          <select
                            value={typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val)}
                            onChange={(e) => {
                              const v = e.target.value === 'true' ? true : e.target.value === 'false' ? false : e.target.value
                              setEditResponsesData(prev => ({ ...prev, [key]: v }))
                            }}
                            className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-2.5 py-2 cursor-pointer focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="true">Yes / True</option>
                            <option value="false">No / False</option>
                          </select>
                        ) : typeof val === 'string' && val.length > 50 ? (
                          <textarea
                            value={String(val ?? '')}
                            onChange={(e) => {
                              const v = e.target.value
                              setEditResponsesData(prev => ({ ...prev, [key]: v }))
                            }}
                            rows={2}
                            className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                          />
                        ) : (
                          <Input
                            type="text"
                            value={String(val ?? '')}
                            onChange={(e) => {
                              const v = e.target.value
                              setEditResponsesData(prev => ({ ...prev, [key]: v }))
                            }}
                            className="bg-slate-800 border-white/10 text-white text-xs focus:ring-purple-500"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingResponsesApp(null)}
                  disabled={savingResponsesEdit}
                  className="bg-transparent border-white/10 text-slate-400 hover:text-white cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveResponsesEdits}
                  disabled={savingResponsesEdit}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold border-none cursor-pointer text-xs shadow-lg shadow-purple-500/20"
                >
                  {savingResponsesEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Commercial Deal Negotiation Modal */}
      <CommercialNegotiationModal
        isOpen={Boolean(negotiationModalApp)}
        onClose={() => setNegotiationModalApp(null)}
        application={negotiationModalApp}
        currentAdminEmail={admin?.email}
        onSuccess={fetchApplications}
      />

      <ApplicationImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onSuccess={fetchApplications}
      />

      {/* Sent to Brand Modal */}
      <AnimatePresence>
        {showSentToBrandModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mark as Sent to Brand</h3>
                    <p className="text-[11px] text-slate-400">
                      Batch tagging <strong className="text-white">{selectedIds.size} creator profiles</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSentToBrandModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Tag selected creators as submitted to the client brand so you can easily track future incoming profiles.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Batch Label / Shortlist Name</Label>
                  <Input
                    value={sentToBrandBatchLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSentToBrandBatchLabel(e.target.value)}
                    placeholder="e.g. Batch #1 - Morning Shortlist"
                    className="bg-slate-950 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Notes (Optional)</Label>
                  <Input
                    value={sentToBrandNotes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSentToBrandNotes(e.target.value)}
                    placeholder="e.g. Emailed to Brand Manager"
                    className="bg-slate-950 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSentToBrandModal(false)}
                  className="border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleBulkSentToBrand}
                  disabled={sentToBrandSubmitting}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold cursor-pointer shadow-md shadow-purple-500/20"
                >
                  {sentToBrandSubmitting ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Tagging Batch...
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-1.5 h-3.5 w-3.5" />
                      Confirm & Tag Batch
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Team Remark Modal ─── */}
      <AnimatePresence>
        {remarkModalApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
                    <MessageSquareText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Manual Team Remark</h3>
                    <p className="text-[11px] text-slate-400">
                      {remarkModalApp.users?.full_name} • {remarkModalApp.campaigns?.brand_name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setRemarkModalApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <Label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1.5 block">
                  Internal Team Note / Remark
                </Label>
                <textarea
                  value={modalRemarkText}
                  onChange={(e) => setModalRemarkText(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Type any internal note, feedback, or remark for this application..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 resize-none transition-colors"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex flex-wrap gap-1.5">
                {PRESET_REMARKS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setModalRemarkText(prev => {
                        const trimmed = prev.trim()
                        if (!trimmed) return p
                        if (trimmed.includes(p)) return trimmed
                        return `${trimmed}, ${p}`
                      })
                    }}
                    className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-200 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer"
                  >
                    +{p}
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                {remarkModalApp.team_remark ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setModalRemarkSaving(true)
                      try {
                        await handleUpdateTeamRemark(remarkModalApp.id, '')
                        setRemarkModalApp(null)
                      } finally {
                        setModalRemarkSaving(false)
                      }
                    }}
                    disabled={modalRemarkSaving}
                    className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" />
                    Clear Remark
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRemarkModalApp(null)}
                    disabled={modalRemarkSaving}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      setModalRemarkSaving(true)
                      try {
                        await handleUpdateTeamRemark(remarkModalApp.id, modalRemarkText)
                        setRemarkModalApp(null)
                      } finally {
                        setModalRemarkSaving(false)
                      }
                    }}
                    disabled={modalRemarkSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {modalRemarkSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Remark
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Custom Scrollbar Styles ─────────────────────── */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.12);
        }
      `}</style>
    </div>
  )
}
