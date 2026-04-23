'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, XCircle, ClipboardList,
  Instagram, Users, MapPin, ChevronDown,
  DollarSign, Phone, Search, Filter, Megaphone,
  ArrowUpDown, ArrowUp, ArrowDown, Columns3, Download,
  AlignJustify, AlignCenter, AlignStartVertical,
  Calendar, X, MoreHorizontal, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileSpreadsheet, FileJson, UserCheck, UserX
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'
import Link from 'next/link'

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
  partial_payment: number
  final_payment: number
  pending_amount: number
  manager_phone: string
  created_at: string
  updated_at: string
  users: UserInfo
  campaigns: CampaignInfo
}

type SortDirection = 'asc' | 'desc' | null
type RowDensity = 'compact' | 'default' | 'comfortable'

interface SortConfig {
  column: string
  direction: SortDirection
}

interface Filters {
  gender: string[]
  state: string[]
  followerRange: string[]
  platform: string[]
  dateRange: string
}

// ─── Constants ─────────────────────────────────────────────
const statusColors: Record<string, string> = {
  'Applied': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Approved': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Rejected': 'bg-red-500/15 text-red-400 border-red-500/25',
  'Completed': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Payment Initiated': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  'Payment Requested': 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
}

const statusDots: Record<string, string> = {
  'Applied': 'bg-blue-400',
  'Approved': 'bg-emerald-400',
  'Rejected': 'bg-red-400',
  'Completed': 'bg-purple-400',
  'Payment Initiated': 'bg-amber-400',
  'Payment Requested': 'bg-cyan-400',
}

const statusFilters = ['All', 'Applied', 'Approved', 'Payment Requested', 'Rejected', 'Completed', 'Payment Initiated']

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
  const count = selected.length

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
            className="absolute top-full left-0 mt-2 z-50 min-w-[200px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-2">{label}</span>
              {count > 0 && (
                <button onClick={onClear} className="text-[10px] text-indigo-400 hover:text-indigo-300 px-2 py-0.5 cursor-pointer">
                  Clear
                </button>
              )}
            </div>
            <div className="p-1.5 max-h-[240px] overflow-y-auto custom-scrollbar">
              {options.map(opt => (
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
                  {opt}
                </button>
              ))}
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
}: {
  app: Application
  onStatusChange: (id: string, status: string) => void
}) {
  const { open, setOpen, popoverRef } = usePopover()

  const actions = [
    { label: 'Approve', status: 'Approved', icon: UserCheck, color: 'text-emerald-400 hover:bg-emerald-500/10' },
    { label: 'Reject', status: 'Rejected', icon: UserX, color: 'text-red-400 hover:bg-red-500/10' },
    { label: 'Mark Completed', status: 'Completed', icon: CheckCircle2, color: 'text-purple-400 hover:bg-purple-500/10' },
    { label: 'Initiate Payment', status: 'Payment Initiated', icon: DollarSign, color: 'text-amber-400 hover:bg-amber-500/10' },
  ].filter(a => {
    if (a.status === app.status) return false
    // Hide Approve/Reject buttons once the application is no longer in the Applied state
    if (app.status !== 'Applied' && (a.status === 'Approved' || a.status === 'Rejected')) {
      return false
    }
    return true
  })

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
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
            className="absolute top-full right-0 mt-1 z-50 min-w-[190px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
          >
            <div className="p-1">
              {actions.map(a => (
                <button
                  key={a.status}
                  onClick={(e) => {
                    e.stopPropagation()
                    onStatusChange(app.id, a.status)
                    setOpen(false)
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${a.color}`}
                >
                  <a.icon className="h-3.5 w-3.5" />
                  {a.label}
                </button>
              ))}
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
      <td className="px-4 py-4"><div className="w-5 h-5 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-slate-800 animate-pulse" />
          <div className="space-y-1.5">
            <div className="w-28 h-3.5 rounded bg-slate-800 animate-pulse" />
            <div className="w-20 h-2.5 rounded bg-slate-800/60 animate-pulse" />
          </div>
        </div>
      </td>
      <td className="px-4 py-4"><div className="w-24 h-3.5 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="w-20 h-3.5 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="w-20 h-3.5 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="w-16 h-6 rounded-full bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="w-14 h-3.5 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="w-8 h-8 rounded-lg bg-slate-800 animate-pulse" /></td>
    </tr>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function AllApplicationsPage() {
  // Core data
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])

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

  // ─── Derived data from applications ────────────────────
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
    filters.gender.length + filters.state.length + filters.followerRange.length +
    filters.platform.length + (filters.dateRange !== 'all' ? 1 : 0),
    [filters]
  )

  // ─── Fetch ─────────────────────────────────────────────
  useEffect(() => { fetchApplications() }, [])

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/admin/applications`)
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  // ─── Filter + Sort + Paginate ──────────────────────────
  const processedData = useMemo(() => {
    let result = [...applications]

    // Status filter
    if (activeStatus !== 'All') {
      result = result.filter(a => a.status === activeStatus)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(a => {
        const s = `${a.users?.full_name} ${a.users?.influencer_id} ${a.users?.instagram_username} ${a.users?.email} ${a.campaigns?.brand_name} ${a.campaigns?.campaign_code}`.toLowerCase()
        return s.includes(q)
      })
    }

    // Advanced filters
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
          case 'date': valA = new Date(a.created_at).getTime(); valB = new Date(b.created_at).getTime(); break
          default: return 0
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [applications, activeStatus, searchQuery, filters, sortConfig])

  const totalFiltered = processedData.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)
  const startIndex = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalFiltered)

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [activeStatus, searchQuery, filters, pageSize])

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
  const toggleFilter = useCallback((key: keyof Omit<Filters, 'dateRange'>, val: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: prev[key].includes(val) ? prev[key].filter((v: string) => v !== val) : [...prev[key], val],
    }))
    setSelectedIds(new Set())
  }, [])

  const clearFilter = useCallback((key: keyof Omit<Filters, 'dateRange'>) => {
    setFilters(prev => ({ ...prev, [key]: [] }))
  }, [])

  const clearAllFilters = useCallback(() => {
    setFilters({ gender: [], state: [], followerRange: [], platform: [], dateRange: 'all' })
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
      if (!res.ok) throw new Error('Failed')
      setApplications(prev => prev.map(a => selectedIds.has(a.id) ? { ...a, status: newStatus } : a))
      toast.success(`${selectedIds.size} applications ${newStatus.toLowerCase()}`)
      setSelectedIds(new Set())
    } catch {
      toast.error('Failed to perform bulk action')
    } finally {
      setBulkUpdating(false)
    }
  }

  const updateSingleStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/applications/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: [id], status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed')
      setApplications(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a))
      toast.success(`Application marked as ${newStatus}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  // ─── Export ────────────────────────────────────────────
  const handleExport = useCallback((format: 'csv' | 'json') => {
    const data = processedData.map(a => ({
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
      partial_payment: a.partial_payment,
      final_payment: a.final_payment,
      pending_amount: a.pending_amount,
      applied_on: a.created_at,
    }))

    let content: string
    let mime: string
    let ext: string

    if (format === 'csv') {
      const headers = Object.keys(data[0] || {})
      const rows = data.map(row => headers.map(h => `"${String((row as any)[h]).replace(/"/g, '""')}"`).join(','))
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

  // ─── Loading ───────────────────────────────────────────
  if (loading) {
    return <GlobalLoader text="Loading Applications..." />
  }

  return (
    <div className="space-y-5 pb-24 relative">
      {/* ─── Header ─────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/20">
              <Users className="h-4.5 w-4.5 text-indigo-400" />
            </div>
            All Applications
          </h1>
          <p className="text-sm text-slate-500 mt-1.5 ml-[3px]">
            Manage applications across all active campaigns — <span className="text-slate-400 font-medium">{applications.length}</span> total
          </p>
        </div>
      </div>

      {/* ─── Status Tabs ────────────────────────────────── */}
      <div className="flex overflow-x-auto hide-scrollbar gap-1 bg-slate-900/40 p-1 rounded-xl border border-white/5">
        {statusFilters.map(f => (
          <button
            key={f}
            onClick={() => { setActiveStatus(f); setSelectedIds(new Set()); setExpandedId(null) }}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeStatus === f
                ? 'bg-white/[0.08] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
            }`}
          >
            {f}
            {f !== 'All' && (
              <span className={`ml-1.5 text-[10px] ${activeStatus === f ? 'text-slate-400' : 'text-slate-600'}`}>
                {statusCounts[f] || 0}
              </span>
            )}
          </button>
        ))}
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
              placeholder="Search name, email, brand..."
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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-center gap-2 pt-1">
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
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full min-w-[900px]">
            {/* Header */}
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-900/60">
                {/* Checkbox */}
                <th className="w-[52px] px-4 py-3 text-left">
                  <div
                    onClick={handleSelectAll}
                    className={`w-[18px] h-[18px] rounded flex items-center justify-center border transition-colors cursor-pointer ${
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
                  <th className="px-4 py-3 text-left">
                    <SortableHeader label="Influencer" column="name" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.instagram && (
                  <th className="px-4 py-3 text-left">
                    <SortableHeader label="Instagram" column="followers" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.campaign && (
                  <th className="px-4 py-3 text-left">
                    <SortableHeader label="Campaign" column="brand" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.location && (
                  <th className="px-4 py-3 text-left">
                    <SortableHeader label="Location" column="location" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.status && (
                  <th className="px-4 py-3 text-left">
                    <SortableHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.date && (
                  <th className="px-4 py-3 text-left">
                    <SortableHeader label="Applied" column="date" sortConfig={sortConfig} onSort={handleSort} />
                  </th>
                )}
                {visibleCols.actions && (
                  <th className="w-[60px] px-4 py-3">
                    <span className="text-[11px] text-slate-600 uppercase tracking-wider font-bold" />
                  </th>
                )}
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
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
                        <td className={`px-4 ${densityPadding[density]}`} onClick={(e) => e.stopPropagation()}>
                          <div
                            onClick={() => toggleSelection(app.id)}
                            className={`w-[18px] h-[18px] rounded flex items-center justify-center border transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-700 bg-slate-800/50 hover:border-slate-500'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="h-3 w-3" />}
                          </div>
                        </td>

                        {/* Influencer */}
                        {visibleCols.influencer && (
                          <td className={`px-4 ${densityPadding[density]}`}>
                            <div className="flex items-center gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/80 to-purple-500/80 text-xs font-bold text-white shrink-0 shadow-lg shadow-indigo-500/10">
                                {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-white truncate max-w-[180px]">
                                  {user?.full_name || 'Unknown'}
                                </p>
                                <p className="text-[11px] text-slate-500 font-mono truncate">
                                  {user?.influencer_id}
                                </p>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Instagram */}
                        {visibleCols.instagram && (
                          <td className={`px-4 ${densityPadding[density]}`}>
                            {user?.instagram_username ? (
                              <div className="min-w-0">
                                <a 
                                  href={`https://instagram.com/${user.instagram_username.replace('@', '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[12px] text-slate-300 hover:text-indigo-400 hover:underline flex items-center gap-1.5 truncate transition-colors"
                                >
                                  <Instagram className="h-3.5 w-3.5 text-pink-400 shrink-0" />
                                  <span className="truncate">{user.instagram_username}</span>
                                </a>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                  {formatFollowers(user.followers)} followers
                                </p>
                              </div>
                            ) : (
                              <span className="text-[12px] text-slate-600">—</span>
                            )}
                          </td>
                        )}

                        {/* Campaign */}
                        {visibleCols.campaign && (
                          <td className={`px-4 ${densityPadding[density]}`}>
                            <div className="min-w-0">
                              <p className="text-[12px] font-medium text-slate-300 flex items-center gap-1.5 truncate">
                                <Megaphone className="h-3 w-3 text-slate-500 shrink-0" />
                                <span className="truncate">{camp?.brand_name || '—'}</span>
                              </p>
                              {camp?.campaign_code && (
                                <p className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">{camp.campaign_code}</p>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Location */}
                        {visibleCols.location && (
                          <td className={`px-4 ${densityPadding[density]}`}>
                            <p className="text-[12px] text-slate-400 flex items-center gap-1 truncate">
                              <MapPin className="h-3 w-3 text-slate-600 shrink-0" />
                              <span className="truncate">{[user?.city, user?.state].filter(Boolean).join(', ') || '—'}</span>
                            </p>
                          </td>
                        )}

                        {/* Status */}
                        {visibleCols.status && (
                          <td className={`px-4 ${densityPadding[density]}`}>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDots[app.status] || 'bg-slate-400'}`} />
                              {app.status}
                            </span>
                          </td>
                        )}

                        {/* Date */}
                        {visibleCols.date && (
                          <td className={`px-4 ${densityPadding[density]}`}>
                            <p className="text-[12px] text-slate-400" title={new Date(app.created_at).toLocaleString('en-IN')}>
                              {timeAgo(app.created_at)}
                            </p>
                          </td>
                        )}

                        {/* Actions */}
                        {/* {visibleCols.actions && (
                          <td className={`px-4 ${densityPadding[density]}`} onClick={(e) => e.stopPropagation()}>
                            <ActionsDropdown app={app} onStatusChange={updateSingleStatus} />
                          </td>
                        )} */}
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

                                {/* Application Form + Order Data */}
                                {/* <OrderDetailsPage /> */}
                                {/* {app.form_data && (() => {
                                  const { order_details, ...regularData } = app.form_data
                                  const hasRegularData = Object.keys(regularData).length > 0
                                  const hasOrderDetails = order_details && Object.keys(order_details).length > 0

                                  return (
                                    <div className="space-y-6">
                                      {hasRegularData && (
                                        <div>
                                          <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
                                            <ClipboardList className="h-3.5 w-3.5" />
                                            Application Form Responses
                                          </p>
                                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                                            {Object.entries(regularData).map(([key, value]) => (
                                              <div key={key}>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                                  {key.replace(/[_-]/g, ' ')}
                                                </p>
                                                <p className="text-slate-300 break-words">
                                                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (String(value) || '—')}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {hasOrderDetails && (
                                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5 shadow-inner">
                                          <div className="flex items-center justify-between mb-4">
                                            <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold flex items-center gap-2">
                                              <ClipboardList className="h-4 w-4" />
                                              Submitted Order Details
                                            </p>
                                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-widest uppercase border border-emerald-500/20">
                                              Action Required
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                                            {Object.entries(order_details).map(([key, value]) => {
                                              const isImage = typeof value === 'string' && (value.includes('http') || key.toLowerCase().includes('screenshot') || key.toLowerCase().includes('image'))
                                              return (
                                                <div key={key} className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">
                                                    {key.replace(/[_-]/g, ' ')}
                                                  </p>
                                                  {isImage ? (
                                                    <div className="mt-2">
                                                      <a href={String(value)} target="_blank" rel="noopener noreferrer" className="block relative group overflow-hidden rounded-lg border border-white/10 hover:border-indigo-400 transition-colors bg-black">
                                                        <img src={String(value)} alt={key} className="h-32 w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                          <span className="text-xs font-bold text-white bg-black/60 px-2 py-1 rounded">View Full</span>
                                                        </div>
                                                      </a>
                                                    </div>
                                                  ) : (
                                                    <p className="text-white font-medium break-words text-lg">
                                                      {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (String(value) || '—')}
                                                    </p>
                                                  )}
                                                </div>
                                              )
                                            })}
                                          </div>
                                          <div className="mt-6 flex flex-wrap items-center gap-3 pt-4 border-t border-indigo-500/20">
                                            <Button
                                              size="sm"
                                              onClick={() => updateSingleStatus(app.id, 'Completed')}
                                              className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold border-none cursor-pointer"
                                            >
                                              <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                              Verify & Mark Completed
                                            </Button>
                                            <Button
                                              size="sm"
                                              onClick={() => updateSingleStatus(app.id, 'Payment Initiated')}
                                              className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 font-bold border-none cursor-pointer"
                                            >
                                              <DollarSign className="mr-1.5 h-4 w-4" />
                                              Verify & Initiate Payment
                                            </Button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()} */}

                                {/* Payment Info */}
                                {/* {(app.partial_payment > 0 || app.final_payment > 0 || app.pending_amount > 0 || app.manager_phone) && (
                                  <div>
                                    <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5">
                                      <DollarSign className="h-3.5 w-3.5" />
                                      Payment Details
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                      <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Partial Payment</p>
                                        <p className="text-slate-300 flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />
                                          {app.partial_payment > 0 ? `₹${app.partial_payment.toLocaleString()}` : '—'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Final Payment</p>
                                        <p className="text-slate-300 flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />
                                          {app.final_payment > 0 ? `₹${app.final_payment.toLocaleString()}` : '—'}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Pending Amount</p>
                                        <p className="text-slate-300 flex items-center gap-1">
                                          <DollarSign className="h-3 w-3" />
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
                                )} */}

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
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-5 px-6 py-3.5 bg-slate-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-black/30 rounded-2xl lg:ml-32"
          >
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">{selectedIds.size} selected</span>
              <span className="text-[11px] text-slate-500">applications</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            {(() => {
              const allApplied = Array.from(selectedIds).every(id => applications.find(a => a.id === id)?.status === 'Applied')
              return (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleBulkAction('Rejected')}
                    disabled={bulkUpdating || !allApplied}
                    className="h-9 px-4 rounded-xl border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 bg-slate-950 font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleBulkAction('Approved')}
                    disabled={bulkUpdating || !allApplied}
                    className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 border-none font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                    Approve
                  </Button>
                </div>
              )
            })()}
          </motion.div>
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
