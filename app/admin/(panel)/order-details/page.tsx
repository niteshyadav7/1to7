'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, XCircle, ClipboardList,
  Instagram, Users, MapPin, ChevronDown,
  IndianRupee, Phone, Search, Filter, Megaphone,
  ArrowUpDown, ArrowUp, ArrowDown, Columns3, Download,
  AlignJustify, AlignCenter, AlignStartVertical,
  Calendar, X, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileSpreadsheet, FileJson, UserCheck, UserX,
  Image, ExternalLink, Package, Eye, Clock,
  Pencil, Save, AlertCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/useRealtime'
import { getInstagramUrl, getInstagramDisplayHandle } from '@/lib/instagram-utils'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'

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
}

interface CampaignInfo {
  brand_name: string
  campaign_code: string
  platform: string
}

interface OrderEntry {
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
  brand: string[]
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

export function getOrderVerificationStatus(order: { status?: string; form_data?: Record<string, any> }): 'Pending' | 'Approved' | 'Rejected' {
  if (order.form_data?.order_details_approved === true) {
    return 'Approved'
  }
  if (order.status === 'Rejected' || order.form_data?.rejection_reason) {
    return 'Rejected'
  }
  return 'Pending'
}

export function getOrderApproverName(order: { form_data?: Record<string, any> }): string | null {
  const fd = order.form_data || {}
  // 1. Explicitly recorded when order was verified & approved
  if (fd.order_details_approved_by_name) return String(fd.order_details_approved_by_name).trim()
  if (fd.order_approved_by_name) return String(fd.order_approved_by_name).trim()
  if (fd.order_approved_by) return String(fd.order_approved_by).trim()
  if (fd.approved_by_name) return String(fd.approved_by_name).trim()

  // 2. From payment initiation / maker admin (if approved in payment pipeline)
  const pi = fd.payment_initiation
  if (pi?.prepared_by_name) return String(pi.prepared_by_name).trim()
  if (pi?.initiated_by_name) return String(pi.initiated_by_name).trim()

  const pint = fd.payment_initiated
  if (pint?.initiated_by_name) return String(pint.initiated_by_name).trim()

  // 3. Fallbacks
  if (fd.negotiation?.approved_by_name) return String(fd.negotiation.approved_by_name).trim()
  if (fd.approved_by_admin_name) return String(fd.approved_by_admin_name).trim()

  return null
}

const statusFilters = ['All', 'Pending', 'Approved', 'Rejected']

const dateRanges = [
  { label: 'All Time', value: 'all' },
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]

const defaultColumns: Record<string, boolean> = {
  influencer: true,
  campaign: true,
  orderFields: true,
  screenshot: true,
  status: true,
  date: true,
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

function getOrderDetails(app: OrderEntry): Record<string, any> {
  return app.form_data?.order_details || {}
}

function extractOrderField(details: Record<string, any>, ...candidates: string[]): string {
  for (const c of candidates) {
    for (const key of Object.keys(details)) {
      if (key.toLowerCase().replace(/[\s_-]/g, '').includes(c.toLowerCase().replace(/[\s_-]/g, ''))) {
        return String(details[key] || '')
      }
    }
  }
  return ''
}

function isImageValue(key: string, value: any): boolean {
  if (typeof value !== 'string') return false
  return value.startsWith('http') || key.toLowerCase().includes('screenshot') || key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')
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
    campaign: 'Campaign',
    orderFields: 'Order Info',
    screenshot: 'Screenshot',
    status: 'Status',
    date: 'Submitted',
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

// ActionsDropdown removed – bulk actions now use Verify & Reject same as expanded row

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
      <td className="px-4 py-4"><div className="w-12 h-10 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="w-16 h-6 rounded-full bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="w-14 h-3.5 rounded bg-slate-800 animate-pulse" /></td>
      <td className="px-4 py-4"><div className="w-8 h-8 rounded-lg bg-slate-800 animate-pulse" /></td>
    </tr>
  )
}

// ─── Image Preview Modal ───────────────────────────────────
function ImagePreviewModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative max-w-3xl max-h-[85vh] z-10"
        >
          <button
            onClick={onClose}
            className="absolute -top-3 -right-3 z-20 p-1.5 rounded-full bg-slate-800 border border-white/10 text-white hover:bg-red-500 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl"
          />
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function OrderDetailsPage() {
  const { admin } = useAdminPermissions()
  // Core data
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<OrderEntry[]>([])

  // Table state
  const [activeStatus, setActiveStatus] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'date', direction: 'desc' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({ ...defaultColumns })
  const [density, setDensity] = useState<RowDensity>('default')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Advanced filters
  const [filters, setFilters] = useState<Filters>({
    brand: [],
    platform: [],
    dateRange: 'all',
  })
  const [showFilters, setShowFilters] = useState(false)

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)

  // Bulk modal states
  const [bulkVerifyModal, setBulkVerifyModal] = useState(false)
  const [bulkRejectModal, setBulkRejectModal] = useState(false)
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState('')
  const [bulkPaymentCommission, setBulkPaymentCommission] = useState('')
  const [bulkRejectReason, setBulkRejectReason] = useState('')

  // Image preview
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)

  // Action Modals State
  const [initiatePaymentApp, setInitiatePaymentApp] = useState<OrderEntry | null>(null)
  const [rejectApp, setRejectApp] = useState<OrderEntry | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentCommission, setPaymentCommission] = useState('')
  const [rejectReason, setRejectReason] = useState('')

  // Edit Submission Modal
  const [editSubmissionOrder, setEditSubmissionOrder] = useState<OrderEntry | null>(null)
  const [editOrderDetails, setEditOrderDetails] = useState<Record<string, any>>({})
  const [editFormResponses, setEditFormResponses] = useState<Record<string, any>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // ─── Derived data ─────────────────────────────────────
  const uniqueBrands = useMemo(() =>
    [...new Set(orders.map(o => o.campaigns?.brand_name).filter(Boolean))].sort(),
    [orders]
  )
  const uniquePlatforms = useMemo(() =>
    [...new Set(orders.map(o => o.campaigns?.platform).filter(Boolean))].sort(),
    [orders]
  )

  // ─── Active filter count ──────────────────────────────
  const activeFilterCount = useMemo(() =>
    filters.brand.length + filters.platform.length + (filters.dateRange !== 'all' ? 1 : 0),
    [filters]
  )

  // ─── Fetch ────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/order-details')
      const data = await res.json()
      setOrders(data.orders || [])
    } catch {
      toast.error('Failed to load order details')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOrders() }, [fetchOrders])

  // Auto-refresh when influencers submit orders
  useRealtime({ table: 'applications', onChange: fetchOrders })

  // ─── Filter + Sort + Paginate ─────────────────────────
  const processedData = useMemo(() => {
    let result = [...orders]

    // Status filter (by order verification status)
    if (activeStatus !== 'All') {
      result = result.filter(o => getOrderVerificationStatus(o) === activeStatus)
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(o => {
        const details = getOrderDetails(o)
        const allOrderValues = Object.values(details).map(v => String(v)).join(' ')
        const s = `${o.users?.full_name} ${o.users?.influencer_id} ${o.campaigns?.brand_name} ${o.campaigns?.campaign_code} ${allOrderValues}`.toLowerCase()
        return s.includes(q)
      })
    }

    // Advanced filters
    if (filters.brand.length > 0) {
      result = result.filter(o => filters.brand.includes(o.campaigns?.brand_name))
    }
    if (filters.platform.length > 0) {
      result = result.filter(o => filters.platform.includes(o.campaigns?.platform))
    }
    if (filters.dateRange !== 'all') {
      result = result.filter(o => isInDateRange(o.updated_at, filters.dateRange))
    }

    // Sort
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let valA: any, valB: any
        const detA = getOrderDetails(a)
        const detB = getOrderDetails(b)
        switch (sortConfig.column) {
          case 'name': valA = a.users?.full_name?.toLowerCase() || ''; valB = b.users?.full_name?.toLowerCase() || ''; break
          case 'brand': valA = a.campaigns?.brand_name?.toLowerCase() || ''; valB = b.campaigns?.brand_name?.toLowerCase() || ''; break
          case 'amount': {
            const amtA = extractOrderField(detA, 'amount', 'price', 'product_amount', 'productamount')
            const amtB = extractOrderField(detB, 'amount', 'price', 'product_amount', 'productamount')
            valA = parseFloat(amtA) || 0
            valB = parseFloat(amtB) || 0
            break
          }
          case 'status': {
            valA = getOrderVerificationStatus(a)
            valB = getOrderVerificationStatus(b)
            break
          }
          case 'date': valA = new Date(a.updated_at).getTime(); valB = new Date(b.updated_at).getTime(); break
          default: return 0
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [orders, activeStatus, searchQuery, filters, sortConfig])

  const totalFiltered = processedData.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)
  const startIndex = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalFiltered)

  // Reset page on filter change
  useEffect(() => { setPage(1) }, [activeStatus, searchQuery, filters, pageSize])

  // ─── Sort handler ─────────────────────────────────────
  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        if (prev.direction === 'asc') return { column, direction: 'desc' }
        if (prev.direction === 'desc') return { column: '', direction: null }
      }
      return { column, direction: 'asc' }
    })
  }, [])

  // ─── Selection ────────────────────────────────────────
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length && paginatedData.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedData.map(o => o.id)))
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

  // ─── Filter toggle helpers ────────────────────────────
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
    setFilters({ brand: [], platform: [], dateRange: 'all' })
    setSelectedIds(new Set())
  }, [])

  // ─── Bulk Verify & Approve ────────────────────────────
  const handleBulkVerifySubmit = async () => {
    if (selectedIds.size === 0) return
    const amt = parseFloat(bulkPaymentAmount) || 0
    const comm = parseFloat(bulkPaymentCommission) || 0
    const total = amt + comm

    if (total <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const approverName = admin?.name || admin?.email || 'Admin'
    const approverId = admin?.id || admin?.email || null
    const approvedAt = new Date().toISOString()

    setBulkUpdating(true)
    let successCount = 0
    try {
      for (const id of selectedIds) {
        const order = orders.find(o => o.id === id)
        if (!order) continue
        const updatedFormData = {
          ...order.form_data,
          order_details_approved: true,
          order_details_approved_by_name: approverName,
          order_details_approved_by_id: approverId,
          order_details_approved_at: approvedAt,
        }
        const res = await fetch(`/api/admin/applications/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Approved', pending_amount: total, form_data: updatedFormData }),
        })
        if (res.ok) {
          successCount++
          setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Approved', pending_amount: total, form_data: updatedFormData } : o))
        }
      }
      toast.success(`${successCount} order(s) verified & approved`)
      setSelectedIds(new Set())
      setBulkVerifyModal(false)
      setBulkPaymentAmount('')
      setBulkPaymentCommission('')
    } catch {
      toast.error('Failed to verify & approve orders')
    } finally {
      setBulkUpdating(false)
    }
  }

  // ─── Bulk Reject ──────────────────────────────────────
  const handleBulkRejectSubmit = async () => {
    if (selectedIds.size === 0) return
    if (!bulkRejectReason.trim()) {
      toast.error('Please enter a rejection reason')
      return
    }

    const rejecterName = admin?.name || admin?.email || 'Admin'
    setBulkUpdating(true)
    let successCount = 0
    try {
      for (const id of selectedIds) {
        const order = orders.find(o => o.id === id)
        if (!order) continue
        const currentHistory = order.form_data?.order_history || []
        const historyEntry = {
          order_details: order.form_data?.order_details || {},
          rejection_reason: bulkRejectReason,
          rejected_at: new Date().toISOString(),
          rejected_by_name: rejecterName,
        }
        const newFormData = {
          ...order.form_data,
          rejection_reason: bulkRejectReason,
          order_details_approved: false,
          order_rejected_by_name: rejecterName,
          order_history: [...currentHistory, historyEntry]
        }
        const res = await fetch(`/api/admin/applications/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'Rejected', form_data: newFormData }),
        })
        if (res.ok) {
          successCount++
          setOrders(prev => prev.map(o => o.id === id ? { ...o, status: 'Rejected', form_data: newFormData } : o))
        }
      }
      toast.success(`${successCount} order(s) rejected`)
      setSelectedIds(new Set())
      setBulkRejectModal(false)
      setBulkRejectReason('')
    } catch {
      toast.error('Failed to reject orders')
    } finally {
      setBulkUpdating(false)
    }
  }

  const handleInitiatePaymentSubmit = async () => {
    if (!initiatePaymentApp) return
    const amt = parseFloat(paymentAmount) || 0
    const comm = parseFloat(paymentCommission) || 0
    const total = amt + comm

    if (total <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    const approverName = admin?.name || admin?.email || 'Admin'
    const approverId = admin?.id || admin?.email || null
    const approvedAt = new Date().toISOString()

    try {
      // Set order_details_approved flag and approver details so it shows in admin panel
      const updatedFormData = {
        ...initiatePaymentApp.form_data,
        order_details_approved: true,
        order_details_approved_by_name: approverName,
        order_details_approved_by_id: approverId,
        order_details_approved_at: approvedAt,
      }

      const res = await fetch(`/api/admin/applications/${initiatePaymentApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Approved',
          pending_amount: total, // Goes to Total Deal, not Received
          form_data: updatedFormData
        }),
      })
      if (!res.ok) throw new Error('Failed to verify & approve')
      
      setOrders(prev => prev.map(o => o.id === initiatePaymentApp.id ? { ...o, status: 'Approved', pending_amount: total, form_data: updatedFormData } : o))
      toast.success('Order verified & approved successfully')
      setInitiatePaymentApp(null)
      setPaymentAmount('')
      setPaymentCommission('')
    } catch {
      toast.error('Failed to verify & approve')
    }
  }

  const handleRejectSubmit = async () => {
    if (!rejectApp || !rejectReason.trim()) {
      toast.error('Please enter a rejection reason')
      return
    }

    const rejecterName = admin?.name || admin?.email || 'Admin'

    try {
      const currentHistory = rejectApp.form_data?.order_history || []
      const historyEntry = {
        order_details: rejectApp.form_data?.order_details || {},
        rejection_reason: rejectReason,
        rejected_at: new Date().toISOString(),
        rejected_by_name: rejecterName,
      }
      const newFormData = {
        ...rejectApp.form_data,
        rejection_reason: rejectReason,
        order_details_approved: false,
        order_rejected_by_name: rejecterName,
        order_history: [...currentHistory, historyEntry]
      }
      const res = await fetch(`/api/admin/applications/${rejectApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          form_data: newFormData
        }),
      })
      if (!res.ok) throw new Error('Failed to reject order')
      
      setOrders(prev => prev.map(o => o.id === rejectApp.id ? { ...o, status: 'Rejected', form_data: newFormData } : o))
      toast.success('Order rejected successfully')
      setRejectApp(null)
      setRejectReason('')
    } catch {
      toast.error('Failed to reject order')
    }
  }

  // ─── Edit Submission Handlers ───────────────────────────
  const openEditSubmissionModal = (order: OrderEntry) => {
    const details = order.form_data?.order_details || {}
    const internalKeys = [
      'order_details', 'rejection_reason', 'order_details_approved',
      'order_details_approved_by_id', 'order_details_approved_by_name',
      'order_details_approved_at', 'order_approved_by_name',
      'order_rejected_by_name', 'order_history', 'payment_requests',
      'payment_request_amount', 'payment_request_reason', 'supporting_document',
      'live_date', 'payment_reason', 'payment_amount'
    ]
    const customResponses: Record<string, any> = {}
    if (order.form_data) {
      Object.entries(order.form_data).forEach(([k, v]) => {
        if (!internalKeys.includes(k) && !k.startsWith('_')) {
          customResponses[k] = v
        }
      })
    }
    setEditSubmissionOrder(order)
    setEditOrderDetails({ ...details })
    setEditFormResponses({ ...customResponses })
  }

  const handleSaveSubmissionEdits = async () => {
    if (!editSubmissionOrder) return
    setSavingEdit(true)
    try {
      const currentFormData = editSubmissionOrder.form_data || {}
      const updatedFormData = {
        ...currentFormData,
        ...editFormResponses,
        order_details: editOrderDetails,
        _edited_by_admin: {
          at: new Date().toISOString(),
        }
      }

      const res = await fetch(`/api/admin/applications/${editSubmissionOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_data: updatedFormData,
          send_email: false,
        }),
      })

      if (!res.ok) throw new Error('Failed to update submission')

      setOrders(prev => prev.map(o => o.id === editSubmissionOrder.id ? { ...o, form_data: updatedFormData } : o))
      toast.success('Creator submission updated successfully')
      setEditSubmissionOrder(null)
    } catch {
      toast.error('Failed to update creator submission')
    } finally {
      setSavingEdit(false)
    }
  }

  // ─── Export ───────────────────────────────────────────
  const handleExport = useCallback((format: 'csv' | 'json') => {
    const data = processedData.map(o => {
      const details = getOrderDetails(o)

      const customFields: Record<string, any> = {}
      if (o.form_data) {
        Object.entries(o.form_data).forEach(([k, v]) => {
          if (k === 'order_details') return // Already extracted by getOrderDetails
          if (k === 'order_history' || k === 'payment_requests') {
            customFields[k] = JSON.stringify(v)
          } else {
            customFields[k] = typeof v === 'object' && v !== null ? JSON.stringify(v) : String(v)
          }
        })
      }

      return {
        influencer_name: o.users?.full_name || '',
        influencer_id: o.users?.influencer_id || '',
        email: o.users?.email || '',
        mobile: o.users?.mobile || '',
        brand: o.campaigns?.brand_name || '',
        campaign_code: o.campaigns?.campaign_code || '',
        platform: o.campaigns?.platform || '',
        status: o.status,
        order_review_status: getOrderVerificationStatus(o),
        order_approved_by: getOrderApproverName(o) || '',
        ...details,
        ...customFields,
        partial_payment: o.partial_payment,
        final_payment: o.final_payment,
        pending_amount: o.pending_amount,
        submitted_on: o.updated_at,
      }
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
    a.download = `order-details-export.${ext}`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${data.length} records as ${ext.toUpperCase()}`)
  }, [processedData])

  // ─── Column toggle ───────────────────────────────────
  const toggleColumn = useCallback((col: string) => {
    setVisibleCols(prev => ({ ...prev, [col]: !prev[col] }))
  }, [])

  // ─── Status counts ───────────────────────────────────
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'All': orders.length,
      'Pending': 0,
      'Approved': 0,
      'Rejected': 0,
    }
    orders.forEach(o => {
      const st = getOrderVerificationStatus(o)
      counts[st] = (counts[st] || 0) + 1
    })
    return counts
  }, [orders])

  // ─── Loading ──────────────────────────────────────────
  if (loading) {
    return <GlobalLoader text="Loading Order Details..." />
  }

  return (
    <div className="space-y-5 pb-24 relative">
      {/* Header Injection */}
      <SetAdminHeader>
        <div className="flex items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Order Details</h1>
            <p className="text-xs text-slate-400">
              {totalFiltered} order{totalFiltered !== 1 ? 's' : ''} submitted across all campaigns
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ColumnToggle columns={visibleCols} onChange={toggleColumn} />
            <DensityToggle density={density} onChange={setDensity} />
            <ExportDropdown onExport={handleExport} />
          </div>
        </div>
      </SetAdminHeader>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => (
          <button
            key={f}
            onClick={() => setActiveStatus(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer border ${
              activeStatus === f
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30 shadow-lg shadow-indigo-500/10 font-bold'
                : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
            }`}
          >
            {f === 'All' ? 'All Orders' : f === 'Pending' ? 'Pending Review' : f === 'Approved' ? 'Order Verified' : 'Order Rejected'}
            <span className="ml-1.5 text-[10px] opacity-75 font-mono">
              ({f === 'All' ? orders.length : (statusCounts[f] || 0)})
            </span>
          </button>
        ))}
      </div>

      {/* Search + Filter Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, campaign, order..."
            className="pl-10 bg-slate-900/50 border-white/5 text-white h-10 text-sm focus-visible:ring-indigo-500 rounded-xl w-full transition-all hover:bg-slate-900/80"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
            activeFilterCount > 0
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
      </div>

      {/* Advanced Filter Bar */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
            animate={{ opacity: 1, height: 'auto', overflow: 'visible' }}
            exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-900/40 border border-white/5">
              <FilterDropdown
                label="Brand"
                icon={Megaphone}
                options={uniqueBrands}
                selected={filters.brand}
                onToggle={(val) => toggleFilter('brand', val)}
                onClear={() => clearFilter('brand')}
              />
              <FilterDropdown
                label="Platform"
                icon={Instagram}
                options={uniquePlatforms}
                selected={filters.platform}
                onToggle={(val) => toggleFilter('platform', val)}
                onClear={() => clearFilter('platform')}
              />
              <DateRangeDropdown
                value={filters.dateRange}
                onChange={(val) => { setFilters(prev => ({ ...prev, dateRange: val })); setSelectedIds(new Set()) }}
              />
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer ml-auto"
                >
                  <X className="h-3 w-3" />
                  Clear All
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20"
          >
            <span className="text-sm font-medium text-indigo-300">
              {selectedIds.size} selected
            </span>
            <div className="h-4 w-px bg-indigo-500/30" />
            <Button
              size="sm"
              onClick={() => setBulkVerifyModal(true)}
              disabled={bulkUpdating}
              className="h-8 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 text-xs font-bold border-none cursor-pointer"
            >
              <IndianRupee className="mr-1 h-3.5 w-3.5" />
              Verify & Approved
            </Button>
            <Button
              size="sm"
              onClick={() => setBulkRejectModal(true)}
              disabled={bulkUpdating}
              className="h-8 px-3 rounded-lg bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-500/20 text-xs font-bold border-none cursor-pointer"
            >
              <XCircle className="mr-1 h-3.5 w-3.5" />
              Reject (with reason)
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="ml-auto text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Deselect All
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {orders.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-white/5 bg-slate-900/30">
          <Package className="h-14 w-14 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No Order Details Yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Order details will appear here once influencers submit their order verification forms for approved campaigns.
          </p>
        </div>
      ) : totalFiltered === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/5 bg-slate-900/30">
          <Search className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-400">No matching orders</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/10">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full table-fixed min-w-[900px]">
              <thead>
                <tr className="border-b border-white/[0.06] bg-slate-950/40">
                  {/* Checkbox */}
                  <th className="px-3 py-3 w-12">
                    <button onClick={handleSelectAll} className="cursor-pointer">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        selectedIds.size === paginatedData.length && paginatedData.length > 0
                          ? 'bg-indigo-500 border-indigo-500'
                          : selectedIds.size > 0
                            ? 'bg-indigo-500/50 border-indigo-500'
                            : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                      }`}>
                        {selectedIds.size === paginatedData.length && paginatedData.length > 0 && (
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        )}
                        {selectedIds.size > 0 && selectedIds.size < paginatedData.length && (
                          <div className="w-2 h-0.5 bg-white rounded" />
                        )}
                      </div>
                    </button>
                  </th>
                  {/* Influencer */}
                  {visibleCols.influencer && (
                    <th className="px-3 py-3 text-left w-[24%]">
                      <SortableHeader label="Influencer" column="name" sortConfig={sortConfig} onSort={handleSort} />
                    </th>
                  )}
                  {/* Campaign */}
                  {visibleCols.campaign && (
                    <th className="px-3 py-3 text-left w-[20%]">
                      <SortableHeader label="Campaign" column="brand" sortConfig={sortConfig} onSort={handleSort} />
                    </th>
                  )}
                  {/* Order Info */}
                  {visibleCols.orderFields && (
                    <th className="px-3 py-3 text-left w-[18%]">
                      <SortableHeader label="Order Info" column="amount" sortConfig={sortConfig} onSort={handleSort} />
                    </th>
                  )}
                  {/* Screenshot */}
                  {visibleCols.screenshot && (
                    <th className="px-3 py-3 text-left w-[10%]">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 whitespace-nowrap">Screenshot</span>
                    </th>
                  )}
                  {/* Status */}
                  {visibleCols.status && (
                    <th className="px-3 py-3 text-left w-[14%]">
                      <SortableHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} />
                    </th>
                  )}
                  {/* Date */}
                  {visibleCols.date && (
                    <th className="px-3 py-3 text-left w-[14%]">
                      <SortableHeader label="Submitted" column="date" sortConfig={sortConfig} onSort={handleSort} />
                    </th>
                  )}

                </tr>
              </thead>
              <tbody>
                {paginatedData.map((order, i) => {
                  const user = order.users
                  const camp = order.campaigns
                  const details = getOrderDetails(order)
                  const isExpanded = expandedId === order.id
                  const isSelected = selectedIds.has(order.id)

                  // Extract key fields dynamically
                  const orderId = extractOrderField(details, 'orderid', 'order_id', 'orderID')
                  const reviewerName = extractOrderField(details, 'reviewer', 'reviewername', 'name')
                  const amount = extractOrderField(details, 'amount', 'price', 'productamount', 'product_amount')

                  // Find screenshot
                  let screenshotUrl = ''
                  for (const [key, value] of Object.entries(details)) {
                    if (isImageValue(key, value)) {
                      screenshotUrl = String(value)
                      break
                    }
                  }

                  // Non-image fields for display
                  const textFields = Object.entries(details).filter(([k, v]) => !isImageValue(k, v))

                  return (
                    <React.Fragment key={order.id}>
                      <motion.tr
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        onClick={() => setExpandedId(isExpanded ? null : order.id)}
                        className={`border-b border-white/[0.03] transition-colors cursor-pointer group ${
                          isExpanded
                            ? 'bg-indigo-500/[0.03]'
                            : isSelected
                              ? 'bg-indigo-500/[0.05]'
                              : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className={`px-3 ${densityPadding[density]}`} onClick={(e) => e.stopPropagation()}>
                          <button onClick={() => toggleSelection(order.id)} className="cursor-pointer">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                              isSelected
                                ? 'bg-indigo-500 border-indigo-500'
                                : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                            }`}>
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                          </button>
                        </td>

                        {/* Influencer */}
                        {visibleCols.influencer && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="flex items-center gap-2.5">
                              {user?.profile_photo || user?.instagram_profile_pic ? (
                                <img
                                  src={user.profile_photo || user.instagram_profile_pic}
                                  alt={user?.full_name || 'Influencer'}
                                  className="h-8 w-8 rounded-full object-cover shrink-0 border border-white/10 shadow-md"
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-[11px] font-bold text-white shrink-0">
                                  {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                                </div>
                              )}
                              <div className="min-w-0 overflow-hidden">
                                <p className="text-[13px] font-semibold text-white truncate">{user?.full_name || 'Unknown'}</p>
                                <p className="text-[11px] text-slate-500 font-mono truncate">{user?.influencer_id || '—'}</p>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Campaign */}
                        {visibleCols.campaign && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-[13px] font-medium text-slate-200 truncate">{camp?.brand_name || '—'}</p>
                              <p className="text-[11px] text-slate-500 font-mono truncate">{camp?.campaign_code || '—'}</p>
                            </div>
                          </td>
                        )}

                        {/* Order Info */}
                        {visibleCols.orderFields && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="space-y-0.5 overflow-hidden">
                              {orderId && (
                                <p className="text-xs text-slate-300 truncate">
                                  <span className="text-slate-500">ID:</span> <span className="font-mono font-medium">{orderId}</span>
                                </p>
                              )}
                              {amount && (
                                <p className="text-xs text-emerald-400 font-semibold">
                                  ₹{amount}
                                </p>
                              )}
                              {!orderId && !amount && textFields.length > 0 && (
                                <p className="text-xs text-slate-400 truncate">
                                  {textFields[0][0].replace(/[_-]/g, ' ')}: {String(textFields[0][1])}
                                </p>
                              )}
                              {!orderId && !amount && textFields.length === 0 && (
                                <span className="text-xs text-slate-600">—</span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Screenshot */}
                        {visibleCols.screenshot && (
                          <td className={`px-3 ${densityPadding[density]}`} onClick={(e) => e.stopPropagation()}>
                            {screenshotUrl ? (
                              <button
                                onClick={() => setPreviewImage({ src: screenshotUrl, alt: 'Order Screenshot' })}
                                className="relative w-10 h-8 rounded-md overflow-hidden border border-white/10 hover:border-indigo-400 transition-all group/img cursor-pointer bg-black"
                              >
                                <img src={screenshotUrl} alt="order" className="w-full h-full object-cover opacity-80 group-hover/img:opacity-100 transition-opacity" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity">
                                  <Eye className="h-3 w-3 text-white" />
                                </div>
                              </button>
                            ) : (
                              <div className="w-10 h-8 rounded-md border border-white/5 bg-slate-800/30 flex items-center justify-center">
                                <Image className="h-3 w-3 text-slate-600" />
                              </div>
                            )}
                          </td>
                        )}

                        {/* Status */}
                        {visibleCols.status && (() => {
                          const reviewStatus = getOrderVerificationStatus(order)
                          return (
                            <td className={`px-3 ${densityPadding[density]}`}>
                              <div className="flex flex-col gap-1 items-start">
                                {/* 1. Order Details Review Status */}
                                {reviewStatus === 'Pending' ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-xs whitespace-nowrap">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
                                    Pending Review
                                  </span>
                                ) : reviewStatus === 'Approved' ? (
                                  <div className="flex flex-col gap-0.5">
                                    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-xs whitespace-nowrap">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                      Order Verified
                                    </span>
                                    {getOrderApproverName(order) && (
                                      <span className="text-[9px] text-emerald-400/90 font-medium px-1 flex items-center gap-1 truncate max-w-[130px]" title={`Approved by ${getOrderApproverName(order)}`}>
                                        <UserCheck className="h-2.5 w-2.5 shrink-0" />
                                        by {getOrderApproverName(order)}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-xs whitespace-nowrap" title={order.form_data?.rejection_reason || ''}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                                    Order Rejected
                                  </span>
                                )}

                                {/* 2. Campaign Application Status */}
                                <span className="inline-flex items-center gap-1 text-[9px] font-medium text-slate-400 px-1 whitespace-nowrap">
                                  <span className="text-slate-500 font-semibold">App:</span>
                                  <span className={`font-bold ${order.status === 'Approved' ? 'text-emerald-400' : order.status === 'Rejected' ? 'text-rose-400' : 'text-blue-400'}`}>
                                    {order.status}
                                  </span>
                                </span>
                              </div>
                            </td>
                          )
                        })()}

                        {/* Date */}
                        {visibleCols.date && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div>
                              <p className="text-xs text-slate-300">{timeAgo(order.updated_at)}</p>
                              <p className="text-[10px] text-slate-600">{new Date(order.updated_at).toLocaleDateString('en-IN')}</p>
                            </div>
                          </td>
                        )}


                      </motion.tr>

                      {/* Expanded Row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={Object.values(visibleCols).filter(Boolean).length + 1}>
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.25 }}
                                className="overflow-hidden"
                              >
                                <div className="p-4 sm:p-5 bg-slate-950/70 border-b border-white/10 space-y-4">
                                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                                    {/* LEFT: Creator Profile, Campaign & Application Responses (7 cols) */}
                                    <div className="lg:col-span-7 flex flex-col space-y-3.5">
                                      {/* Creator & Campaign Card */}
                                      <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 space-y-3 shadow-sm shrink-0">
                                        {/* Creator Header */}
                                        <div className="flex items-center justify-between gap-3 border-b border-white/5 pb-3">
                                          <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0">
                                              {user?.full_name?.charAt(0) || 'U'}
                                            </div>
                                            <div className="min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-bold text-white truncate">{user?.full_name || '—'}</span>
                                                <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5">
                                                  {user?.influencer_id || '—'}
                                                </span>
                                              </div>
                                              <p className="text-xs text-slate-400 truncate">{user?.email || '—'}</p>
                                            </div>
                                          </div>

                                          {/* Contact Badges */}
                                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                                            {user?.instagram_username && (
                                              <a
                                                href={getInstagramUrl(user.instagram_username)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20 text-xs font-semibold hover:bg-pink-500/20 transition-colors"
                                              >
                                                <Instagram className="h-3.5 w-3.5 text-pink-400" />
                                                <span>{getInstagramDisplayHandle(user.instagram_username)}</span>
                                                {user?.followers > 0 && (
                                                  <span className="text-[10px] font-normal text-pink-300/80 ml-1 font-mono">
                                                    ({user.followers.toLocaleString()})
                                                  </span>
                                                )}
                                              </a>
                                            )}
                                            {user?.mobile && (
                                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-white/5 text-xs font-medium font-mono">
                                                <Phone className="h-3 w-3 text-slate-400" />
                                                {user.mobile}
                                              </span>
                                            )}
                                          </div>
                                        </div>

                                        {/* Creator Meta Grid & Campaign Meta */}
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-0.5">
                                          <div>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Campaign</span>
                                            <span className="text-white font-medium truncate block">{camp?.brand_name || '—'}</span>
                                            <span className="text-[10px] text-slate-400 font-mono">{camp?.campaign_code || ''}</span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Platform</span>
                                            <span className="text-slate-300 font-medium">{camp?.platform || '—'}</span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Location</span>
                                            <span className="text-slate-300 font-medium truncate flex items-center gap-1">
                                              <MapPin className="h-3 w-3 text-slate-500 shrink-0" />
                                              {[user?.city, user?.state].filter(Boolean).join(', ') || '—'}
                                            </span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold block">Gender</span>
                                            <span className="text-slate-300 font-medium">{user?.gender || '—'}</span>
                                          </div>
                                        </div>
                                      </div>

                                      {/* Application Form Responses (Fills remaining height) */}
                                      {order.form_data && (() => {
                                        const internalKeys = [
                                          'order_details', 'rejection_reason', 'order_details_approved',
                                          'order_details_approved_by_id', 'order_details_approved_by_name',
                                          'order_details_approved_at', 'order_approved_by_name',
                                          'order_rejected_by_name', 'order_history', 'payment_requests',
                                          'payment_request_amount', 'payment_request_reason', 'supporting_document',
                                          'live_date', 'payment_reason', 'payment_amount'
                                        ]
                                        const customEntries = Object.entries(order.form_data).filter(([key]) => !internalKeys.includes(key))
                                        if (customEntries.length === 0) return null

                                        const isImg = (key: string, value: any) => {
                                          if (typeof value !== 'string') return false
                                          return value.startsWith('http') && (value.match(/\.(jpg|jpeg|png|webp|gif|svg)/i) || key.toLowerCase().includes('image') || key.toLowerCase().includes('screenshot') || key.toLowerCase().includes('photo'))
                                        }

                                        return (
                                          <div className="bg-purple-500/[0.04] border border-purple-500/15 rounded-2xl p-3.5 flex-1 flex flex-col justify-between shadow-sm">
                                            <div>
                                              <div className="flex items-center justify-between mb-2.5">
                                                <p className="text-[11px] text-purple-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                                  <ClipboardList className="h-3.5 w-3.5" />
                                                  Application Responses ({customEntries.length})
                                                </p>
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    openEditSubmissionModal(order)
                                                  }}
                                                  className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-purple-200 bg-purple-500/15 hover:bg-purple-500/25 px-2 py-0.5 rounded-lg border border-purple-500/25 transition-all cursor-pointer shadow-sm"
                                                  title="Edit creator responses or answers"
                                                >
                                                  <Pencil className="h-3 w-3" />
                                                  Edit
                                                </button>
                                              </div>
                                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {customEntries.map(([key, value]) => (
                                                  <div key={key} className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5 flex flex-col justify-between">
                                                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold truncate mb-1">
                                                      {key.replace(/[_-]/g, ' ')}
                                                    </p>
                                                    {isImg(key, value) ? (
                                                      <button
                                                        onClick={() => setPreviewImage({ src: String(value), alt: key })}
                                                        className="block relative group overflow-hidden rounded-md border border-white/10 hover:border-purple-400 transition-colors bg-black cursor-pointer w-full mt-1"
                                                      >
                                                        <img src={String(value)} alt={key} className="h-16 w-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                                      </button>
                                                    ) : (
                                                      <p className="text-xs font-semibold text-white break-words">
                                                        {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (String(value) || '—')}
                                                      </p>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                            {/* Payment Details (if any) */}
                                            {(order.partial_payment > 0 || order.final_payment > 0 || order.pending_amount > 0 || order.manager_phone) && (
                                              <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-3 mt-3">
                                                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1">
                                                  <IndianRupee className="h-3 w-3 text-amber-400" />
                                                  Payout & Deal Status
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                                  <div>
                                                    <span className="text-[9px] text-slate-500 uppercase font-semibold block">Total Deal</span>
                                                    <span className="text-white font-bold">{order.pending_amount > 0 ? `₹${order.pending_amount.toLocaleString()}` : '—'}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-[9px] text-slate-500 uppercase font-semibold block">Partial Paid</span>
                                                    <span className="text-emerald-400 font-semibold">{order.partial_payment > 0 ? `₹${order.partial_payment.toLocaleString()}` : '—'}</span>
                                                  </div>
                                                  <div>
                                                    <span className="text-[9px] text-slate-500 uppercase font-semibold block">Final Paid</span>
                                                    <span className="text-purple-400 font-semibold">{order.final_payment > 0 ? `₹${order.final_payment.toLocaleString()}` : '—'}</span>
                                                  </div>
                                                  {order.manager_phone && (
                                                    <div>
                                                      <span className="text-[9px] text-slate-500 uppercase font-semibold block">Manager</span>
                                                      <span className="text-slate-300 font-mono">{order.manager_phone}</span>
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })()}
                                    </div>

                                    {/* RIGHT: Order Verification & Action Card (5 cols) */}
                                    <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-b from-indigo-950/30 to-slate-900/80 border border-indigo-500/20 rounded-2xl p-4 shadow-lg space-y-3.5 h-full">
                                      <div className="flex-1 flex flex-col">
                                        <div className="flex items-center justify-between mb-3 border-b border-indigo-500/15 pb-2.5">
                                          <div className="flex items-center gap-2">
                                            <p className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                                              <Package className="h-4 w-4 text-indigo-400" />
                                              Order Verification
                                            </p>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                openEditSubmissionModal(order)
                                              }}
                                              className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-300 hover:text-indigo-200 bg-indigo-500/15 hover:bg-indigo-500/25 px-2 py-0.5 rounded-lg border border-indigo-500/25 transition-all cursor-pointer shadow-sm"
                                              title="Edit Order ID, Amount, or custom fields"
                                            >
                                              <Pencil className="h-3 w-3" />
                                              Edit
                                            </button>
                                          </div>
                                          {(() => {
                                            const rev = getOrderVerificationStatus(order)
                                            const approver = getOrderApproverName(order)
                                            if (rev === 'Approved') return (
                                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center gap-1">
                                                <CheckCircle2 className="h-2.5 w-2.5" />
                                                Verified{approver ? ` by ${approver}` : ''}
                                              </span>
                                            )
                                            if (rev === 'Rejected') return <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">Rejected</span>
                                            return <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 animate-pulse">Action Required</span>
                                          })()}
                                        </div>

                                        {/* Order Info Fields */}
                                        <div className="grid grid-cols-2 gap-2.5 mb-3">
                                          {orderId && (
                                            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
                                              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Order ID</p>
                                              <p className="text-xs font-mono font-bold text-indigo-300">{orderId}</p>
                                            </div>
                                          )}
                                          {amount && (
                                            <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
                                              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Order Amount</p>
                                              <p className="text-xs font-bold text-emerald-400">₹{amount}</p>
                                            </div>
                                          )}
                                          {Object.entries(details).map(([k, v]) => {
                                            const normalized = k.toLowerCase().replace(/[\s_-]/g, '')
                                            if (['orderid', 'order', 'ordernumber', 'id', 'amount', 'price', 'productamount', 'orderamount', 'commercials', 'screenshot', 'orderscreenshot', 'image', 'photo', 'proof'].includes(normalized)) return null
                                            if (isImageValue(k, v)) return null
                                            return (
                                              <div key={k} className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5 col-span-2 sm:col-span-1">
                                                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold truncate">{k.replace(/[_-]/g, ' ')}</p>
                                                <p className="text-xs font-medium text-slate-200 truncate">{String(v)}</p>
                                              </div>
                                            )
                                          })}
                                        </div>

                                        {/* Featured Screenshot */}
                                        {screenshotUrl ? (
                                          <div className="flex-1 flex flex-col min-h-[140px]">
                                            <p className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold mb-1.5">Order Screenshot</p>
                                            <button
                                              onClick={() => setPreviewImage({ src: screenshotUrl, alt: 'Order Screenshot' })}
                                              className="w-full flex-1 min-h-[130px] max-h-52 relative group overflow-hidden rounded-xl border border-white/10 hover:border-indigo-400 transition-all bg-slate-950/90 cursor-pointer flex items-center justify-center p-1.5"
                                            >
                                              <img
                                                src={screenshotUrl}
                                                alt="Order Screenshot"
                                                className="w-full h-full object-contain rounded-lg opacity-95 group-hover:opacity-100 transition-opacity"
                                              />
                                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[1px]">
                                                <span className="text-xs font-bold text-white bg-black/80 px-3 py-1.5 rounded-lg border border-white/20 flex items-center gap-1.5 shadow-xl">
                                                  <Eye className="h-3.5 w-3.5" /> View Full Image
                                                </span>
                                              </div>
                                            </button>
                                          </div>
                                        ) : null}
                                      </div>

                                      {/* Action Buttons & Status */}
                                      <div className="pt-3 border-t border-white/5 space-y-2 shrink-0">
                                        {(() => {
                                          const reviewStatus = getOrderVerificationStatus(order)
                                          const approverName = getOrderApproverName(order)
                                          const approvedAt = order.form_data?.order_details_approved_at || order.form_data?.payment_initiation?.prepared_at || order.form_data?.payment_initiated?.initiated_at

                                          if (reviewStatus === 'Approved') {
                                            return (
                                              <div className="flex flex-col gap-1.5 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl shadow-xs">
                                                <div className="flex items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                                    <span>Order Verified & Approved</span>
                                                  </div>
                                                  {approverName && (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 rounded-lg shadow-xs">
                                                      <UserCheck className="h-3 w-3 shrink-0" />
                                                      {approverName}
                                                    </span>
                                                  )}
                                                </div>
                                                {approverName ? (
                                                  <div className="text-[10.5px] text-emerald-400/90 font-medium pl-6 flex items-center gap-1.5 flex-wrap">
                                                    <span>Approved by</span>
                                                    <span className="text-white font-bold bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{approverName}</span>
                                                    {approvedAt && (
                                                      <span className="text-[9.5px] text-emerald-400/70">
                                                        • {new Date(approvedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                      </span>
                                                    )}
                                                  </div>
                                                ) : (
                                                  <p className="text-[10px] text-emerald-400/70 font-medium pl-6">
                                                    Order confirmed by Operations Desk
                                                  </p>
                                                )}
                                              </div>
                                            )
                                          }
                                          if (reviewStatus === 'Rejected') {
                                            const rejecterName = order.form_data?.order_rejected_by_name || order.form_data?.order_history?.[order.form_data.order_history.length - 1]?.rejected_by_name
                                            return (
                                              <div className="space-y-1.5">
                                                <div className="flex items-center justify-between gap-2 text-red-400 text-xs font-bold bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl">
                                                  <div className="flex items-center gap-2">
                                                    <XCircle className="h-4 w-4 shrink-0" />
                                                    <span>Order Rejected</span>
                                                  </div>
                                                  {rejecterName && (
                                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-300 bg-red-500/20 border border-red-500/30 px-2 py-0.5 rounded-md">
                                                      <UserX className="h-2.5 w-2.5 shrink-0" />
                                                      {rejecterName}
                                                    </span>
                                                  )}
                                                </div>
                                                {order.form_data?.rejection_reason && (
                                                  <p className="text-[11px] text-red-300 font-medium px-1">Reason: {order.form_data?.rejection_reason}</p>
                                                )}
                                              </div>
                                            )
                                          }
                                          return (
                                            <div className="flex flex-wrap items-center gap-2.5">
                                              <Button
                                                size="sm"
                                                onClick={() => setInitiatePaymentApp(order)}
                                                className="flex-1 h-9 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold border-none cursor-pointer text-xs"
                                              >
                                                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                                Verify & Approve
                                              </Button>
                                              <Button
                                                size="sm"
                                                onClick={() => setRejectApp(order)}
                                                className="h-9 px-3 rounded-xl bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white shadow-lg shadow-red-500/20 font-bold border-none cursor-pointer text-xs"
                                              >
                                                <XCircle className="mr-1 h-4 w-4" />
                                                Reject
                                              </Button>
                                            </div>
                                          )
                                        })()}

                                        <p className="text-[9px] text-slate-500">
                                          Submitted: {new Date(order.updated_at).toLocaleString('en-IN')}
                                          {order.created_at !== order.updated_at && ` • Applied: ${new Date(order.created_at).toLocaleString('en-IN')}`}
                                        </p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Previous Rejected Submissions History (if any) */}
                                  {order.form_data?.order_history && order.form_data.order_history.length > 0 && (
                                    <div className="pt-3 border-t border-red-500/15">
                                      <p className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-2 flex items-center gap-1.5">
                                        <Clock className="h-3 w-3" />
                                        Previous Submissions History ({order.form_data.order_history.length})
                                      </p>
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                        {[...order.form_data.order_history].reverse().map((entry: any, idx: number) => (
                                          <div key={idx} className="bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                                            <div className="flex items-center justify-between mb-1.5">
                                              <span className="px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 text-[9px] font-bold uppercase">
                                                Rejected #{order.form_data.order_history.length - idx}
                                              </span>
                                              <span className="text-[9px] text-slate-500">
                                                {entry.rejected_at ? new Date(entry.rejected_at).toLocaleString('en-IN') : '—'}
                                              </span>
                                            </div>
                                            {entry.rejection_reason && (
                                              <p className="text-[11px] text-red-300 font-medium mb-1.5">Reason: {entry.rejection_reason}</p>
                                            )}
                                            <div className="flex flex-wrap gap-1.5 text-xs">
                                              {Object.entries(entry.order_details || {}).map(([k, v]: [string, any]) => {
                                                if (isImageValue(k, v)) return null
                                                return (
                                                  <span key={k} className="bg-slate-900/60 px-2 py-0.5 rounded text-slate-300 text-[10px]">
                                                    <strong className="text-slate-500">{k}:</strong> {String(v)}
                                                  </span>
                                                )
                                              })}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
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
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-white/[0.05] bg-slate-950/30">
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                {startIndex}–{endIndex} of {totalFiltered}
              </span>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {pageSizes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        page === pageNum
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          : 'text-slate-500 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          src={previewImage.src}
          alt={previewImage.alt}
          onClose={() => setPreviewImage(null)}
        />
      )}

      {/* Initiate Payment Modal */}
      <AnimatePresence>
        {initiatePaymentApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => setInitiatePaymentApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Screenshot Preview at Top */}
              {(() => {
                const details = getOrderDetails(initiatePaymentApp)
                let screenshotUrl = ''
                for (const [key, value] of Object.entries(details)) {
                  if (isImageValue(key, value)) {
                    screenshotUrl = String(value)
                    break
                  }
                }
                return screenshotUrl ? (
                  <div className="relative w-full h-48 bg-black">
                    <img src={screenshotUrl} alt="Order Screenshot" className="w-full h-full object-contain" />
                    <button
                      onClick={() => setPreviewImage({ src: screenshotUrl, alt: 'Order Screenshot' })}
                      className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-medium hover:bg-black/80 transition-colors cursor-pointer border border-white/10"
                    >
                      <Eye className="h-3 w-3" />
                      View Full
                    </button>
                  </div>
                ) : null
              })()}
              <div className="p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <IndianRupee className="h-5 w-5 text-amber-500" />
                Total Deal
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Enter the approved amount and commission. The sum will be shown to the influencer.
              </p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Amount (₹)</label>
                  <Input
                    type="number"
                    value={paymentAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentAmount(e.target.value)}
                    placeholder="e.g. 1000"
                    className="bg-slate-800 border-white/10 text-white focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Commission (₹)</label>
                  <Input
                    type="number"
                    value={paymentCommission}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentCommission(e.target.value)}
                    placeholder="e.g. 200"
                    className="bg-slate-800 border-white/10 text-white focus:ring-amber-500"
                  />
                </div>
                {paymentAmount || paymentCommission ? (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <p className="text-[10px] text-amber-500 uppercase tracking-wider font-bold mb-1">Total to Influencer</p>
                    <p className="text-lg font-bold text-amber-400">
                      ₹{((parseFloat(paymentAmount) || 0) + (parseFloat(paymentCommission) || 0)).toLocaleString()}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setInitiatePaymentApp(null)} className="flex-1 bg-transparent border-white/10 text-slate-400 hover:text-white cursor-pointer">
                  Cancel
                </Button>
                <Button onClick={handleInitiatePaymentSubmit} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white border-none font-bold cursor-pointer">
                  Confirm Payment
                </Button>
              </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Creator Submission Modal */}
      <AnimatePresence>
        {editSubmissionOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => !savingEdit && setEditSubmissionOrder(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10 bg-slate-950/50 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-indigo-400" />
                    Edit Creator Submission
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editSubmissionOrder.users?.full_name || 'Creator'} •{' '}
                    <span className="font-mono text-slate-300">{editSubmissionOrder.users?.influencer_id || 'ID'}</span> •{' '}
                    <span className="text-indigo-300">{editSubmissionOrder.campaigns?.brand_name}</span>
                  </p>
                </div>
                <button
                  onClick={() => !savingEdit && setEditSubmissionOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Modal Body Scrollable */}
              <div className="p-5 space-y-5 overflow-y-auto custom-scrollbar flex-1">
                {/* Section 1: Order Verification Fields */}
                <div className="bg-indigo-500/5 border border-indigo-500/15 rounded-xl p-4 space-y-3">
                  <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold flex items-center gap-1.5 border-b border-indigo-500/10 pb-2">
                    <Package className="h-3.5 w-3.5" />
                    Order Verification Details
                  </p>
                  
                  {/* Order ID & Order Amount Standard Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                        Order ID
                      </label>
                      <Input
                        type="text"
                        value={
                          editOrderDetails['order_id'] ??
                          editOrderDetails['orderId'] ??
                          editOrderDetails['order_number'] ??
                          editOrderDetails['ordernumber'] ??
                          editOrderDetails['id'] ??
                          ''
                        }
                        onChange={(e) => {
                          const val = e.target.value
                          setEditOrderDetails(prev => ({
                            ...prev,
                            order_id: val,
                            ...(prev.orderId !== undefined ? { orderId: val } : {}),
                            ...(prev.order_number !== undefined ? { order_number: val } : {}),
                          }))
                        }}
                        placeholder="e.g. 34353"
                        className="bg-slate-800 border-white/10 text-white focus:ring-indigo-500 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                        Order Amount (₹)
                      </label>
                      <Input
                        type="text"
                        value={
                          editOrderDetails['amount'] ??
                          editOrderDetails['price'] ??
                          editOrderDetails['product_amount'] ??
                          editOrderDetails['productamount'] ??
                          editOrderDetails['order_amount'] ??
                          editOrderDetails['orderamount'] ??
                          ''
                        }
                        onChange={(e) => {
                          const val = e.target.value
                          setEditOrderDetails(prev => ({
                            ...prev,
                            amount: val,
                            ...(prev.price !== undefined ? { price: val } : {}),
                            ...(prev.product_amount !== undefined ? { product_amount: val } : {}),
                            ...(prev.order_amount !== undefined ? { order_amount: val } : {}),
                          }))
                        }}
                        placeholder="e.g. 5000"
                        className="bg-slate-800 border-white/10 text-white focus:ring-indigo-500 font-bold text-xs"
                      />
                    </div>
                  </div>

                  {/* Any Other Custom Order Details Fields */}
                  {Object.entries(editOrderDetails).map(([key, val]) => {
                    const norm = key.toLowerCase().replace(/[\s_-]/g, '')
                    if (['orderid', 'order', 'ordernumber', 'id', 'amount', 'price', 'productamount', 'orderamount'].includes(norm)) return null
                    if (typeof val === 'string' && (val.startsWith('http') || norm.includes('screenshot') || norm.includes('image') || norm.includes('photo'))) return null

                    return (
                      <div key={key}>
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                          {key.replace(/[_-]/g, ' ')}
                        </label>
                        <Input
                          type="text"
                          value={String(val ?? '')}
                          onChange={(e) => {
                            const v = e.target.value
                            setEditOrderDetails(prev => ({ ...prev, [key]: v }))
                          }}
                          className="bg-slate-800 border-white/10 text-white text-xs focus:ring-indigo-500"
                        />
                      </div>
                    )
                  })}
                </div>

                {/* Section 2: Application Form Responses */}
                {Object.keys(editFormResponses).length > 0 && (
                  <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4 space-y-3">
                    <p className="text-[11px] text-purple-400 uppercase tracking-wider font-bold flex items-center gap-1.5 border-b border-purple-500/10 pb-2">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Application Form Responses
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(editFormResponses).map(([key, val]) => {
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
                                  setEditFormResponses(prev => ({ ...prev, [key]: v }))
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
                                  setEditFormResponses(prev => ({ ...prev, [key]: v }))
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
                                  setEditFormResponses(prev => ({ ...prev, [key]: v }))
                                }}
                                className="bg-slate-800 border-white/10 text-white text-xs focus:ring-purple-500"
                              />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditSubmissionOrder(null)}
                  disabled={savingEdit}
                  className="bg-transparent border-white/10 text-slate-400 hover:text-white cursor-pointer text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveSubmissionEdits}
                  disabled={savingEdit}
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold border-none cursor-pointer text-xs shadow-lg shadow-indigo-500/20"
                >
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => setRejectApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Reject Order
              </h3>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Reason for Rejection *</label>
                  <textarea
                    value={rejectReason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setRejectReason(e.target.value)}
                    placeholder="Explain why the order was rejected..."
                    rows={4}
                    className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500/50 resize-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setRejectApp(null)} className="flex-1 bg-transparent border-white/10 text-slate-400 hover:text-white cursor-pointer">
                  Cancel
                </Button>
                <Button onClick={handleRejectSubmit} className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-none font-bold cursor-pointer">
                  Reject Order
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Verify & Approve Modal */}
      <AnimatePresence>
        {bulkVerifyModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => setBulkVerifyModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              <div className="p-6">
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  <IndianRupee className="h-5 w-5 text-amber-500" />
                  Bulk Verify & Approve
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Approve {selectedIds.size} selected order(s). Enter the deal amount and commission that will be applied to all.
                </p>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Amount (₹)</label>
                    <Input
                      type="number"
                      value={bulkPaymentAmount}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkPaymentAmount(e.target.value)}
                      placeholder="e.g. 1000"
                      className="bg-slate-800 border-white/10 text-white focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Commission (₹)</label>
                    <Input
                      type="number"
                      value={bulkPaymentCommission}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBulkPaymentCommission(e.target.value)}
                      placeholder="e.g. 200"
                      className="bg-slate-800 border-white/10 text-white focus:ring-amber-500"
                    />
                  </div>
                  {(bulkPaymentAmount || bulkPaymentCommission) ? (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
                      <p className="text-[10px] text-amber-500 uppercase tracking-wider font-bold mb-1">Total per Influencer</p>
                      <p className="text-lg font-bold text-amber-400">
                        ₹{((parseFloat(bulkPaymentAmount) || 0) + (parseFloat(bulkPaymentCommission) || 0)).toLocaleString()}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setBulkVerifyModal(false)} className="flex-1 bg-transparent border-white/10 text-slate-400 hover:text-white cursor-pointer">
                    Cancel
                  </Button>
                  <Button onClick={handleBulkVerifySubmit} disabled={bulkUpdating} className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white border-none font-bold cursor-pointer">
                    {bulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Approve {selectedIds.size} Order(s)
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Bulk Reject Modal */}
      <AnimatePresence>
        {bulkRejectModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => setBulkRejectModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6"
            >
              <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-500" />
                Bulk Reject Orders
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Reject {selectedIds.size} selected order(s). The reason below will apply to all.
              </p>

              <div className="space-y-4 mb-6">
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Reason for Rejection *</label>
                  <textarea
                    value={bulkRejectReason}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBulkRejectReason(e.target.value)}
                    placeholder="Explain why the orders are being rejected..."
                    rows={4}
                    className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500/50 resize-none placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setBulkRejectModal(false)} className="flex-1 bg-transparent border-white/10 text-slate-400 hover:text-white cursor-pointer">
                  Cancel
                </Button>
                <Button onClick={handleBulkRejectSubmit} disabled={bulkUpdating} className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border-none font-bold cursor-pointer">
                  {bulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Reject {selectedIds.size} Order(s)
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
