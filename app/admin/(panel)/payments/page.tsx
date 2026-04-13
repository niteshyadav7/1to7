'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, CreditCard,
  Instagram, Users, MapPin, ChevronDown,
  DollarSign, Phone, Search, Megaphone,
  ArrowUpDown, ArrowUp, ArrowDown, Columns3, Download,
  AlignJustify, AlignCenter, AlignStartVertical,
  Calendar, X, MoreHorizontal, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileSpreadsheet, FileJson, Eye,
  Image, Package, Banknote, IndianRupee, Clock, FileText,
  Pencil, Check, Save
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'

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
  account_name: string
  account_number: string
  ifsc_code: string
}

interface CampaignInfo {
  brand_name: string
  campaign_code: string
  platform: string
}

interface PaymentEntry {
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

interface SortConfig { column: string; direction: SortDirection }
interface Filters { brand: string[]; platform: string[]; dateRange: string }

// ─── Constants ─────────────────────────────────────────────
const statusColors: Record<string, string> = {
  'Applied': 'bg-blue-500/15 text-blue-400 border-blue-500/25',
  'Approved': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  'Rejected': 'bg-red-500/15 text-red-400 border-red-500/25',
  'Completed': 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  'Payment Initiated': 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}
const statusDots: Record<string, string> = {
  'Applied': 'bg-blue-400', 'Approved': 'bg-emerald-400', 'Rejected': 'bg-red-400',
  'Completed': 'bg-purple-400', 'Payment Initiated': 'bg-amber-400',
}
const statusFilters = ['All', 'Payment Initiated', 'Completed', 'Approved']
const dateRanges = [
  { label: 'All Time', value: 'all' }, { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' }, { label: 'Last 30 days', value: '30d' },
  { label: 'Last 90 days', value: '90d' },
]
const defaultColumns: Record<string, boolean> = {
  influencer: true, campaign: true, partialPayment: true, finalPayment: true,
  pending: true, total: true, paymentRequest: true, status: true, date: true, actions: true,
}
const densityPadding: Record<RowDensity, string> = {
  compact: 'py-2', default: 'py-3', comfortable: 'py-5',
}
const pageSizes = [10, 25, 50, 100]

// ─── Helpers ───────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const now = new Date(); const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

function isInDateRange(dateStr: string, range: string): boolean {
  if (range === 'all') return true
  const diffDays = (new Date().getTime() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
  switch (range) {
    case 'today': return diffDays < 1; case '7d': return diffDays <= 7
    case '30d': return diffDays <= 30; case '90d': return diffDays <= 90
    default: return true
  }
}

function isImageValue(key: string, value: any): boolean {
  if (typeof value !== 'string') return false
  return value.startsWith('http') || key.toLowerCase().includes('screenshot') || key.toLowerCase().includes('document') || key.toLowerCase().includes('image')
}

// ─── usePopover ────────────────────────────────────────────
function usePopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])
  return { open, setOpen, ref }
}

// ─── FilterDropdown ────────────────────────────────────────
function FilterDropdown({ label, icon: Icon, options, selected, onToggle, onClear }: {
  label: string; icon: React.ElementType; options: string[]; selected: string[]
  onToggle: (val: string) => void; onClear: () => void
}) {
  const popover = usePopover()
  const count = selected.length
  return (
    <div className="relative" ref={popover.ref}>
      <button onClick={() => popover.setOpen(!popover.open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
          count > 0 ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' : 'bg-slate-800/60 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10'
        }`}>
        <Icon className="h-3.5 w-3.5" /> {label}
        {count > 0 && <span className="flex items-center justify-center h-4 w-4 rounded-full bg-indigo-500 text-[10px] font-bold text-white">{count}</span>}
        <ChevronDown className={`h-3 w-3 transition-transform ${popover.open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {popover.open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 mt-2 z-50 min-w-[200px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-2 border-b border-white/5 flex items-center justify-between">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-2">{label}</span>
              {count > 0 && <button onClick={onClear} className="text-[10px] text-indigo-400 px-2 cursor-pointer">Clear</button>}
            </div>
            <div className="p-1.5 max-h-[240px] overflow-y-auto">
              {options.map(opt => (
                <button key={opt} onClick={() => onToggle(opt)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                    selected.includes(opt) ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                    selected.includes(opt) ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 bg-slate-800/50'
                  }`}>{selected.includes(opt) && <CheckCircle2 className="h-3 w-3 text-white" />}</div>
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

// ─── DateRangeDropdown ─────────────────────────────────────
function DateRangeDropdown({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  const popover = usePopover()
  const currentLabel = dateRanges.find(d => d.value === value)?.label || 'All Time'
  return (
    <div className="relative" ref={popover.ref}>
      <button onClick={() => popover.setOpen(!popover.open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
          value !== 'all' ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' : 'bg-slate-800/60 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10'
        }`}>
        <Calendar className="h-3.5 w-3.5" /> {currentLabel}
        <ChevronDown className={`h-3 w-3 transition-transform ${popover.open ? 'rotate-180' : ''}`} />
      </button>
      <AnimatePresence>
        {popover.open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 mt-2 z-50 min-w-[180px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-2 border-b border-white/5"><span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-2">Date Range</span></div>
            <div className="p-1.5">
              {dateRanges.map(d => (
                <button key={d.value} onClick={() => { onChange(d.value); popover.setOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-pointer ${
                    value === d.value ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}>
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

// ─── ColumnToggle ──────────────────────────────────────────
function ColumnToggle({ columns, onChange }: { columns: Record<string, boolean>; onChange: (col: string) => void }) {
  const popover = usePopover()
  const labels: Record<string, string> = {
    influencer: 'Influencer', campaign: 'Campaign', partialPayment: 'Partial', finalPayment: 'Final',
    pending: 'Pending', total: 'Total', paymentRequest: 'Request', status: 'Status', date: 'Date', actions: 'Actions',
  }
  return (
    <div className="relative" ref={popover.ref}>
      <button onClick={() => popover.setOpen(!popover.open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-400 border border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 transition-all cursor-pointer">
        <Columns3 className="h-3.5 w-3.5" /> Columns
      </button>
      <AnimatePresence>
        {popover.open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full right-0 mt-2 z-50 min-w-[180px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-2 border-b border-white/5"><span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold px-2">Toggle Columns</span></div>
            <div className="p-1.5">
              {Object.entries(labels).map(([key, label]) => (
                <button key={key} onClick={() => onChange(key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-pointer ${columns[key] ? 'text-white' : 'text-slate-500'} hover:bg-white/5`}>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${columns[key] ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 bg-slate-800/50'}`}>
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

// ─── DensityToggle ─────────────────────────────────────────
function DensityToggle({ density, onChange }: { density: RowDensity; onChange: (d: RowDensity) => void }) {
  const popover = usePopover()
  const icons: Record<RowDensity, React.ElementType> = { compact: AlignJustify, default: AlignCenter, comfortable: AlignStartVertical }
  const DensityIcon = icons[density]
  return (
    <div className="relative" ref={popover.ref}>
      <button onClick={() => popover.setOpen(!popover.open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-400 border border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 transition-all cursor-pointer">
        <DensityIcon className="h-3.5 w-3.5" /> Density
      </button>
      <AnimatePresence>
        {popover.open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full right-0 mt-2 z-50 min-w-[160px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-1.5">
              {(['compact', 'default', 'comfortable'] as RowDensity[]).map(d => {
                const Icon = icons[d]
                return (
                  <button key={d} onClick={() => { onChange(d); popover.setOpen(false) }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs cursor-pointer capitalize ${
                      density === d ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                    }`}><Icon className="h-3.5 w-3.5" /> {d}</button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── ExportDropdown ────────────────────────────────────────
function ExportDropdown({ onExport }: { onExport: (format: 'csv' | 'json') => void }) {
  const popover = usePopover()
  return (
    <div className="relative" ref={popover.ref}>
      <button onClick={() => popover.setOpen(!popover.open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-400 border border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 transition-all cursor-pointer">
        <Download className="h-3.5 w-3.5" /> Export
      </button>
      <AnimatePresence>
        {popover.open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full right-0 mt-2 z-50 min-w-[160px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-1.5">
              <button onClick={() => { onExport('csv'); popover.setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer">
                <FileSpreadsheet className="h-3.5 w-3.5" /> Export as CSV
              </button>
              <button onClick={() => { onExport('json'); popover.setOpen(false) }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:bg-white/5 hover:text-white cursor-pointer">
                <FileJson className="h-3.5 w-3.5" /> Export as JSON
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── SortableHeader ────────────────────────────────────────
function SortableHeader({ label, column, sortConfig, onSort }: {
  label: string; column: string; sortConfig: SortConfig; onSort: (col: string) => void
}) {
  const isActive = sortConfig.column === column && sortConfig.direction !== null
  const SortIcon = isActive ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button onClick={() => onSort(column)}
      className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-bold cursor-pointer group whitespace-nowrap ${
        isActive ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'
      }`}>
      {label} <SortIcon className={`h-3 w-3 ${isActive ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'}`} />
    </button>
  )
}

// ─── Image Preview Modal ───────────────────────────────────
function ImagePreviewModal({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative max-w-3xl max-h-[85vh] z-10">
        <button onClick={onClose} className="absolute -top-3 -right-3 z-20 p-1.5 rounded-full bg-slate-800 border border-white/10 text-white hover:bg-red-500 cursor-pointer"><X className="h-4 w-4" /></button>
        <img src={src} alt={alt} className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-white/10 shadow-2xl" />
      </motion.div>
    </div>
  )
}

// ─── EditableAmountCell (Inline Click-to-Edit) ─────────────
function EditableAmountCell({ value, paymentId, field, color, onSave }: {
  value: number; paymentId: string; field: string; color: string
  onSave: (id: string, field: string, value: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(String(value || 0))
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setInputVal(String(value || 0))
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [editing, value])

  const handleSave = async () => {
    const num = parseFloat(inputVal) || 0
    if (num === (value || 0)) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(paymentId, field, num)
      setEditing(false)
    } catch { /* error handled in parent */ }
    finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
        <span className="text-slate-500 text-[10px]">₹</span>
        <input
          ref={inputRef}
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          onBlur={handleSave}
          disabled={saving}
          className="w-16 bg-slate-800 border border-indigo-500/50 text-white text-xs font-semibold rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        {saving && <Loader2 className="h-3 w-3 text-indigo-400 animate-spin" />}
      </div>
    )
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true) }}
      className={`group/edit flex items-center gap-1 cursor-pointer text-xs font-semibold ${value > 0 ? color : 'text-slate-600'} hover:text-white transition-colors`}
      title="Click to edit"
    >
      {value > 0 ? `₹${value.toLocaleString()}` : '₹0'}
      <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/edit:opacity-60 transition-opacity" />
    </button>
  )
}

// ─── EditableTextField (Inline Click-to-Edit for text) ─────
function EditableTextField({ value, paymentId, field, onSave }: {
  value: string; paymentId: string; field: string
  onSave: (id: string, field: string, value: number | string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState(value || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setInputVal(value || '')
      setTimeout(() => inputRef.current?.select(), 50)
    }
  }, [editing, value])

  const handleSave = async () => {
    if (inputVal === (value || '')) { setEditing(false); return }
    setSaving(true)
    try {
      await onSave(paymentId, field, inputVal)
      setEditing(false)
    } catch { /* handled in parent */ }
    finally { setSaving(false) }
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
          onBlur={handleSave}
          disabled={saving}
          placeholder={`Enter ${field.replace(/_/g, ' ')}`}
          className="w-36 bg-slate-800 border border-indigo-500/50 text-white text-xs rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {saving && <Loader2 className="h-3 w-3 text-indigo-400 animate-spin" />}
      </div>
    )
  }

  return (
    <button
      onClick={e => { e.stopPropagation(); setEditing(true) }}
      className="group/edit flex items-center gap-1.5 cursor-pointer text-sm text-slate-300 hover:text-white transition-colors"
      title="Click to edit"
    >
      {value || <span className="text-slate-600 italic text-xs">Not set</span>}
      <Pencil className="h-2.5 w-2.5 opacity-0 group-hover/edit:opacity-60 transition-opacity" />
    </button>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function PaymentsPage() {
  const [loading, setLoading] = useState(true)
  const [payments, setPayments] = useState<PaymentEntry[]>([])
  const [activeStatus, setActiveStatus] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'date', direction: 'desc' })
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>({ ...defaultColumns })
  const [density, setDensity] = useState<RowDensity>('default')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [filters, setFilters] = useState<Filters>({ brand: [], platform: [], dateRange: 'all' })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const uniqueBrands = useMemo(() => [...new Set(payments.map(p => p.campaigns?.brand_name).filter(Boolean))].sort(), [payments])
  const uniquePlatforms = useMemo(() => [...new Set(payments.map(p => p.campaigns?.platform).filter(Boolean))].sort(), [payments])
  const activeFilterCount = useMemo(() => filters.brand.length + filters.platform.length + (filters.dateRange !== 'all' ? 1 : 0), [filters])

  // Summary stats
  const summaryStats = useMemo(() => {
    let totalPaid = 0, totalPending = 0, totalPartial = 0, totalFinal = 0
    payments.forEach(p => {
      totalPartial += p.partial_payment || 0
      totalFinal += p.final_payment || 0
      totalPending += p.pending_amount || 0
    })
    totalPaid = totalPartial + totalFinal
    return { totalPaid, totalPending, totalPartial, totalFinal, totalRevenue: totalPaid + totalPending }
  }, [payments])

  useEffect(() => { fetchPayments() }, [])

  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/admin/payments')
      const data = await res.json()
      setPayments(data.payments || [])
    } catch { toast.error('Failed to load payments') }
    finally { setLoading(false) }
  }

  const processedData = useMemo(() => {
    let result = [...payments]
    if (activeStatus !== 'All') result = result.filter(p => p.status === activeStatus)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => {
        const s = `${p.users?.full_name} ${p.users?.influencer_id} ${p.campaigns?.brand_name} ${p.campaigns?.campaign_code} ${p.manager_phone}`.toLowerCase()
        return s.includes(q)
      })
    }
    if (filters.brand.length > 0) result = result.filter(p => filters.brand.includes(p.campaigns?.brand_name))
    if (filters.platform.length > 0) result = result.filter(p => filters.platform.includes(p.campaigns?.platform))
    if (filters.dateRange !== 'all') result = result.filter(p => isInDateRange(p.updated_at, filters.dateRange))
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let valA: any, valB: any
        switch (sortConfig.column) {
          case 'name': valA = a.users?.full_name?.toLowerCase() || ''; valB = b.users?.full_name?.toLowerCase() || ''; break
          case 'brand': valA = a.campaigns?.brand_name?.toLowerCase() || ''; valB = b.campaigns?.brand_name?.toLowerCase() || ''; break
          case 'partial': valA = a.partial_payment || 0; valB = b.partial_payment || 0; break
          case 'final': valA = a.final_payment || 0; valB = b.final_payment || 0; break
          case 'pending': valA = a.pending_amount || 0; valB = b.pending_amount || 0; break
          case 'total': valA = (a.partial_payment || 0) + (a.final_payment || 0); valB = (b.partial_payment || 0) + (b.final_payment || 0); break
          case 'status': valA = a.status; valB = b.status; break
          case 'date': valA = new Date(a.updated_at).getTime(); valB = new Date(b.updated_at).getTime(); break
          default: return 0
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  }, [payments, activeStatus, searchQuery, filters, sortConfig])

  const totalFiltered = processedData.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)
  const startIndex = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalFiltered)

  useEffect(() => { setPage(1) }, [activeStatus, searchQuery, filters, pageSize])

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        if (prev.direction === 'asc') return { column, direction: 'desc' }
        if (prev.direction === 'desc') return { column: '', direction: null }
      }
      return { column, direction: 'asc' }
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedData.length && paginatedData.length > 0) setSelectedIds(new Set())
    else setSelectedIds(new Set(paginatedData.map(p => p.id)))
  }, [selectedIds, paginatedData])

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }, [])

  const toggleFilter = useCallback((key: keyof Omit<Filters, 'dateRange'>, val: string) => {
    setFilters(prev => ({ ...prev, [key]: prev[key].includes(val) ? prev[key].filter((v: string) => v !== val) : [...prev[key], val] }))
    setSelectedIds(new Set())
  }, [])
  const clearFilter = useCallback((key: keyof Omit<Filters, 'dateRange'>) => { setFilters(prev => ({ ...prev, [key]: [] })) }, [])
  const clearAllFilters = useCallback(() => { setFilters({ brand: [], platform: [], dateRange: 'all' }); setSelectedIds(new Set()) }, [])

  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    try {
      const res = await fetch('/api/admin/applications/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: Array.from(selectedIds), status: newStatus }) })
      if (!res.ok) throw new Error('Failed')
      setPayments(prev => prev.map(p => selectedIds.has(p.id) ? { ...p, status: newStatus } : p))
      toast.success(`${selectedIds.size} payments updated to ${newStatus}`)
      setSelectedIds(new Set())
    } catch { toast.error('Failed to perform bulk action') }
    finally { setBulkUpdating(false) }
  }

  const updateSingleStatus = async (id: string, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/applications/bulk', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationIds: [id], status: newStatus }) })
      if (!res.ok) throw new Error('Failed')
      setPayments(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p))
      toast.success(`Status updated to ${newStatus}`)
    } catch { toast.error('Failed') }
  }

  // Inline payment field update (Partial, Final, Pending, Manager Phone)
  const updatePaymentField = async (id: string, field: string, value: number | string) => {
    try {
      const res = await fetch(`/api/admin/applications/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      })
      if (!res.ok) throw new Error('Failed to update')
      setPayments(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p))
      toast.success(`${field.replace(/_/g, ' ')} updated to ${typeof value === 'number' ? '₹' + value.toLocaleString() : value}`)
    } catch {
      toast.error('Failed to update payment')
      throw new Error('Failed') // rethrow for EditableAmountCell
    }
  }

  const handleExport = useCallback((format: 'csv' | 'json') => {
    const data = processedData.map(p => {
      const pr = p.form_data?.payment_request || {}
      return {
        influencer_name: p.users?.full_name || '', influencer_id: p.users?.influencer_id || '',
        email: p.users?.email || '', mobile: p.users?.mobile || '',
        brand: p.campaigns?.brand_name || '', campaign_code: p.campaigns?.campaign_code || '',
        status: p.status, partial_payment: p.partial_payment, final_payment: p.final_payment,
        pending_amount: p.pending_amount, total_paid: (p.partial_payment || 0) + (p.final_payment || 0),
        manager_phone: p.manager_phone || '', bank_name: p.users?.account_name || '',
        bank_account: p.users?.account_number || '', ifsc: p.users?.ifsc_code || '',
        ...pr, updated_at: p.updated_at,
      }
    })
    let content: string, mime: string, ext: string
    if (format === 'csv') {
      const headers = Object.keys(data[0] || {})
      const rows = data.map(row => headers.map(h => `"${String((row as any)[h]).replace(/"/g, '""')}"`).join(','))
      content = [headers.join(','), ...rows].join('\n'); mime = 'text/csv'; ext = 'csv'
    } else { content = JSON.stringify(data, null, 2); mime = 'application/json'; ext = 'json' }
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `payments-export.${ext}`; a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${data.length} records as ${ext.toUpperCase()}`)
  }, [processedData])

  const toggleColumn = useCallback((col: string) => { setVisibleCols(prev => ({ ...prev, [col]: !prev[col] })) }, [])
  const statusCounts = useMemo(() => { const c: Record<string, number> = {}; payments.forEach(p => { c[p.status] = (c[p.status] || 0) + 1 }); return c }, [payments])

  if (loading) return <GlobalLoader text="Loading Payments..." />

  return (
    <div className="space-y-5 pb-24 relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 to-teal-500 shadow-lg shadow-emerald-500/20">
              <CreditCard className="h-4.5 w-4.5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Payments</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-[3px]">{totalFiltered} payment record{totalFiltered !== 1 ? 's' : ''} across all campaigns</p>
        </div>
        <div className="flex items-center gap-2">
          <ColumnToggle columns={visibleCols} onChange={toggleColumn} />
          <DensityToggle density={density} onChange={setDensity} />
          <ExportDropdown onExport={handleExport} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Paid', value: `₹${summaryStats.totalPaid.toLocaleString()}`, icon: IndianRupee, color: 'from-emerald-600 to-emerald-500', shadow: 'shadow-emerald-500/10' },
          { label: 'Partial', value: `₹${summaryStats.totalPartial.toLocaleString()}`, icon: Banknote, color: 'from-blue-600 to-blue-500', shadow: 'shadow-blue-500/10' },
          { label: 'Final', value: `₹${summaryStats.totalFinal.toLocaleString()}`, icon: CheckCircle2, color: 'from-purple-600 to-purple-500', shadow: 'shadow-purple-500/10' },
          { label: 'Pending', value: `₹${summaryStats.totalPending.toLocaleString()}`, icon: Clock, color: 'from-amber-600 to-amber-500', shadow: 'shadow-amber-500/10' },
        ].map(card => (
          <div key={card.label} className={`rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg ${card.shadow}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${card.color}`}>
                <card.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => (
          <button key={f} onClick={() => setActiveStatus(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border cursor-pointer ${
              activeStatus === f ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/10' :
              'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
            }`}>
            {f} <span className="ml-1.5 text-[10px] opacity-60">({f === 'All' ? payments.length : (statusCounts[f] || 0)})</span>
          </button>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, campaign..." className="pl-10 bg-slate-900/50 border-white/5 text-white h-10 text-sm focus-visible:ring-indigo-500 rounded-xl w-full" />
          {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
        </div>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border cursor-pointer ${
            activeFilterCount > 0 ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25' : 'bg-slate-800/60 text-slate-400 border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10'
          }`}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filters
          {activeFilterCount > 0 && <span className="flex items-center justify-center h-4 w-4 rounded-full bg-indigo-500 text-[10px] font-bold text-white">{activeFilterCount}</span>}
        </button>
      </div>

      {/* Advanced Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 p-3 rounded-2xl bg-slate-900/40 border border-white/5">
              <FilterDropdown label="Brand" icon={Megaphone} options={uniqueBrands} selected={filters.brand} onToggle={(v) => toggleFilter('brand', v)} onClear={() => clearFilter('brand')} />
              <FilterDropdown label="Platform" icon={Instagram} options={uniquePlatforms} selected={filters.platform} onToggle={(v) => toggleFilter('platform', v)} onClear={() => clearFilter('platform')} />
              <DateRangeDropdown value={filters.dateRange} onChange={(v) => { setFilters(prev => ({ ...prev, dateRange: v })); setSelectedIds(new Set()) }} />
              {activeFilterCount > 0 && <button onClick={clearAllFilters} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-red-400 hover:bg-red-500/10 cursor-pointer ml-auto"><X className="h-3 w-3" /> Clear All</button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Actions */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
            <span className="text-sm font-medium text-indigo-300">{selectedIds.size} selected</span>
            <div className="h-4 w-px bg-indigo-500/30" />
            <Button size="sm" onClick={() => handleBulkAction('Completed')} disabled={bulkUpdating} className="h-8 px-3 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 text-xs font-medium cursor-pointer">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Completed
            </Button>
            <Button size="sm" onClick={() => handleBulkAction('Payment Initiated')} disabled={bulkUpdating} className="h-8 px-3 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 text-xs font-medium cursor-pointer">
              <DollarSign className="mr-1 h-3.5 w-3.5" /> Initiate Payment
            </Button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-slate-400 hover:text-white cursor-pointer">Deselect All</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      {payments.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-white/5 bg-slate-900/30">
          <CreditCard className="h-14 w-14 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No Payment Records Yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Payment records will appear here once influencers submit payment forms or admin updates payment fields.</p>
        </div>
      ) : totalFiltered === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/5 bg-slate-900/30">
          <Search className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-400">No matching payments</h3>
          <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <thead>
                <tr className="border-b border-white/[0.06] bg-slate-950/40">
                  <th className="px-3 py-3 w-10">
                    <button onClick={handleSelectAll} className="cursor-pointer">
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                        selectedIds.size === paginatedData.length && paginatedData.length > 0 ? 'bg-indigo-500 border-indigo-500' :
                        selectedIds.size > 0 ? 'bg-indigo-500/50 border-indigo-500' : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                      }`}>
                        {selectedIds.size === paginatedData.length && paginatedData.length > 0 && <CheckCircle2 className="h-3 w-3 text-white" />}
                        {selectedIds.size > 0 && selectedIds.size < paginatedData.length && <div className="w-2 h-0.5 bg-white rounded" />}
                      </div>
                    </button>
                  </th>
                  {visibleCols.influencer && <th className="px-3 py-3 text-left w-[17%]"><SortableHeader label="Influencer" column="name" sortConfig={sortConfig} onSort={handleSort} /></th>}
                  {visibleCols.campaign && <th className="px-3 py-3 text-left w-[13%]"><SortableHeader label="Campaign" column="brand" sortConfig={sortConfig} onSort={handleSort} /></th>}
                  {visibleCols.partialPayment && <th className="px-3 py-3 text-left w-[9%]"><SortableHeader label="Partial" column="partial" sortConfig={sortConfig} onSort={handleSort} /></th>}
                  {visibleCols.finalPayment && <th className="px-3 py-3 text-left w-[9%]"><SortableHeader label="Final" column="final" sortConfig={sortConfig} onSort={handleSort} /></th>}
                  {visibleCols.pending && <th className="px-3 py-3 text-left w-[9%]"><SortableHeader label="Pending" column="pending" sortConfig={sortConfig} onSort={handleSort} /></th>}
                  {visibleCols.total && <th className="px-3 py-3 text-left w-[10%]"><SortableHeader label="Total" column="total" sortConfig={sortConfig} onSort={handleSort} /></th>}
                  {visibleCols.paymentRequest && <th className="px-3 py-3 text-left w-[9%]"><span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Request</span></th>}
                  {visibleCols.status && <th className="px-3 py-3 text-left w-[11%]"><SortableHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} /></th>}
                  {visibleCols.date && <th className="px-3 py-3 text-left w-[10%]"><SortableHeader label="Updated" column="date" sortConfig={sortConfig} onSort={handleSort} /></th>}
                  {visibleCols.actions && <th className="px-2 py-3 w-10" />}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((payment, i) => {
                  const user = payment.users
                  const camp = payment.campaigns
                  const pr = payment.form_data?.payment_request || {}
                  const isExpanded = expandedId === payment.id
                  const isSelected = selectedIds.has(payment.id)
                  const totalPaid = (payment.partial_payment || 0) + (payment.final_payment || 0)
                  const hasPR = Object.keys(pr).length > 0

                  return (
                    <React.Fragment key={payment.id}>
                      <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                        onClick={() => setExpandedId(isExpanded ? null : payment.id)}
                        className={`border-b border-white/[0.03] transition-colors cursor-pointer group ${
                          isExpanded ? 'bg-indigo-500/[0.03]' : isSelected ? 'bg-indigo-500/[0.05]' : 'hover:bg-white/[0.02]'
                        }`}>
                        {/* Checkbox */}
                        <td className={`px-3 ${densityPadding[density]}`} onClick={e => e.stopPropagation()}>
                          <button onClick={() => toggleSelection(payment.id)} className="cursor-pointer">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500' : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'}`}>
                              {isSelected && <CheckCircle2 className="h-3 w-3 text-white" />}
                            </div>
                          </button>
                        </td>
                        {/* Influencer */}
                        {visibleCols.influencer && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-[10px] font-bold text-white shrink-0">
                                {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0 overflow-hidden">
                                <p className="text-[13px] font-semibold text-white truncate">{user?.full_name || 'Unknown'}</p>
                                <p className="text-[10px] text-slate-500 font-mono truncate">{user?.influencer_id || '—'}</p>
                              </div>
                            </div>
                          </td>
                        )}
                        {/* Campaign */}
                        {visibleCols.campaign && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <div className="min-w-0 overflow-hidden">
                              <p className="text-[13px] font-medium text-slate-200 truncate">{camp?.brand_name || '—'}</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">{camp?.campaign_code || '—'}</p>
                            </div>
                          </td>
                        )}
                        {/* Partial */}
                        {visibleCols.partialPayment && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <EditableAmountCell value={payment.partial_payment || 0} paymentId={payment.id} field="partial_payment" color="text-blue-400" onSave={updatePaymentField} />
                          </td>
                        )}
                        {/* Final */}
                        {visibleCols.finalPayment && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <EditableAmountCell value={payment.final_payment || 0} paymentId={payment.id} field="final_payment" color="text-purple-400" onSave={updatePaymentField} />
                          </td>
                        )}
                        {/* Pending */}
                        {visibleCols.pending && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <EditableAmountCell value={payment.pending_amount || 0} paymentId={payment.id} field="pending_amount" color="text-amber-400" onSave={updatePaymentField} />
                          </td>
                        )}
                        {/* Total */}
                        {visibleCols.total && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <span className={`text-xs font-bold ${totalPaid > 0 ? 'text-emerald-400' : 'text-slate-600'}`}>
                              {totalPaid > 0 ? `₹${totalPaid.toLocaleString()}` : '—'}
                            </span>
                          </td>
                        )}
                        {/* Payment Request */}
                        {visibleCols.paymentRequest && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            {hasPR ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                <FileText className="h-3 w-3" /> Submitted
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-600">None</span>
                            )}
                          </td>
                        )}
                        {/* Status */}
                        {visibleCols.status && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${statusColors[payment.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusDots[payment.status] || 'bg-slate-400'}`} />
                              {payment.status}
                            </span>
                          </td>
                        )}
                        {/* Date */}
                        {visibleCols.date && (
                          <td className={`px-3 ${densityPadding[density]}`}>
                            <p className="text-xs text-slate-300">{timeAgo(payment.updated_at)}</p>
                            <p className="text-[10px] text-slate-600">{new Date(payment.updated_at).toLocaleDateString('en-IN')}</p>
                          </td>
                        )}
                        {/* Actions */}
                        {visibleCols.actions && (
                          <td className={`px-2 ${densityPadding[density]}`} onClick={e => e.stopPropagation()}>
                            <div className="relative">
                              <ActionsMenu payment={payment} onStatusChange={updateSingleStatus} />
                            </div>
                          </td>
                        )}
                      </motion.tr>

                      {/* Expanded Row */}
                      <AnimatePresence>
                        {isExpanded && (
                          <tr>
                            <td colSpan={Object.values(visibleCols).filter(Boolean).length + 1}>
                              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden">
                                <div className="px-6 py-5 bg-indigo-500/[0.02] border-b border-white/5 space-y-6">
                                  {/* Influencer Profile */}
                                  <div>
                                    <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5"><Users className="h-3.5 w-3.5" /> Influencer Profile</p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                                      {[
                                        { l: 'Full Name', v: user?.full_name }, { l: 'ID', v: user?.influencer_id },
                                        { l: 'Email', v: user?.email }, { l: 'Mobile', v: user?.mobile },
                                        { l: 'Instagram', v: user?.instagram_username }, { l: 'Location', v: [user?.city, user?.state].filter(Boolean).join(', ') },
                                      ].map(f => (
                                        <div key={f.l}>
                                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">{f.l}</p>
                                          <p className="text-slate-300 truncate">{f.v || '—'}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Bank Details */}
                                  <div>
                                    <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold mb-3 flex items-center gap-1.5"><Banknote className="h-3.5 w-3.5" /> Bank Details</p>
                                    <div className="grid grid-cols-3 gap-4 text-sm">
                                      <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Account Name</p><p className="text-slate-300">{user?.account_name || '—'}</p></div>
                                      <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Account Number</p><p className="text-slate-300 font-mono">{user?.account_number || '—'}</p></div>
                                      <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">IFSC Code</p><p className="text-slate-300 font-mono">{user?.ifsc_code || '—'}</p></div>
                                    </div>
                                  </div>

                                  {/* Payment Summary — Editable */}
                                  <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5">
                                    <p className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold mb-4 flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Payment Summary <span className="text-[9px] text-slate-500 font-normal ml-1">(click amounts to edit)</span></p>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                      {[
                                        { l: 'Partial Payment', field: 'partial_payment', v: payment.partial_payment, c: 'text-blue-400', border: 'border-blue-500/20 focus-within:border-blue-500/50' },
                                        { l: 'Final Payment', field: 'final_payment', v: payment.final_payment, c: 'text-purple-400', border: 'border-purple-500/20 focus-within:border-purple-500/50' },
                                        { l: 'Pending Amount', field: 'pending_amount', v: payment.pending_amount, c: 'text-amber-400', border: 'border-amber-500/20 focus-within:border-amber-500/50' },
                                        { l: 'Total Paid', field: '', v: totalPaid, c: 'text-emerald-400', border: 'border-white/5' },
                                      ].map(f => (
                                        <div key={f.l} className={`bg-slate-900/50 p-3 rounded-xl border ${f.border} transition-colors`}>
                                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">{f.l}</p>
                                          {f.field ? (
                                            <EditableAmountCell value={f.v || 0} paymentId={payment.id} field={f.field} color={f.c} onSave={updatePaymentField} />
                                          ) : (
                                            <p className={`text-lg font-bold ${f.c}`}>{f.v > 0 ? `₹${f.v.toLocaleString()}` : '₹0'}</p>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                    {/* Manager Phone — Editable */}
                                    <div className="mt-4 flex items-center gap-3">
                                      <div className="flex items-center gap-2 text-sm text-slate-400">
                                        <Phone className="h-3.5 w-3.5" />
                                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Manager Phone</span>
                                      </div>
                                      <EditableTextField value={payment.manager_phone || ''} paymentId={payment.id} field="manager_phone" onSave={updatePaymentField} />
                                    </div>
                                  </div>

                                  {/* Dynamic Payment Request */}
                                  {hasPR && (
                                    <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5">
                                      <div className="flex items-center justify-between mb-4">
                                        <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-bold flex items-center gap-2"><FileText className="h-4 w-4" /> Influencer Payment Request</p>
                                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">SUBMITTED</span>
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {Object.entries(pr).filter(([k]) => k !== 'submitted_at').map(([key, value]) => {
                                          const isImg = isImageValue(key, value)
                                          return (
                                            <div key={key} className="bg-slate-900/50 p-3 rounded-xl border border-white/5">
                                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5">{key.replace(/[_-]/g, ' ')}</p>
                                              {isImg ? (
                                                <button onClick={() => setPreviewImage({ src: String(value), alt: key })}
                                                  className="block relative group overflow-hidden rounded-lg border border-white/10 hover:border-indigo-400 bg-black cursor-pointer w-full">
                                                  <img src={String(value)} alt={key} className="h-28 w-full object-cover opacity-90 group-hover:opacity-100" />
                                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <span className="text-xs font-bold text-white bg-black/60 px-2 py-1 rounded">View</span>
                                                  </div>
                                                </button>
                                              ) : (
                                                <p className="text-white font-medium break-words text-base">
                                                  {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (String(value) || '—')}
                                                </p>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                      {pr.submitted_at && (
                                        <p className="text-[10px] text-slate-600 mt-3">Submitted: {new Date(pr.submitted_at).toLocaleString('en-IN')}</p>
                                      )}
                                    </div>
                                  )}

                                  {/* Action Buttons */}
                                  <div className="flex flex-wrap items-center gap-3 pt-2">
                                    <Button size="sm" onClick={() => updateSingleStatus(payment.id, 'Payment Initiated')}
                                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white shadow-lg shadow-amber-500/20 font-bold border-none cursor-pointer">
                                      <DollarSign className="mr-1.5 h-4 w-4" /> Initiate Payment
                                    </Button>
                                    <Button size="sm" onClick={() => updateSingleStatus(payment.id, 'Completed')}
                                      className="h-9 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white shadow-lg shadow-emerald-500/20 font-bold border-none cursor-pointer">
                                      <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Completed
                                    </Button>
                                  </div>
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
              <span>{startIndex}–{endIndex} of {totalFiltered}</span>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))}
                  className="bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  {pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"><ChevronsLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"><ChevronLeft className="h-4 w-4" /></button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pn: number
                  if (totalPages <= 5) pn = i + 1
                  else if (page <= 3) pn = i + 1
                  else if (page >= totalPages - 2) pn = totalPages - 4 + i
                  else pn = page - 2 + i
                  return (
                    <button key={pn} onClick={() => setPage(pn)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium cursor-pointer ${
                        page === pn ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'text-slate-500 hover:bg-white/5 hover:text-white'
                      }`}>{pn}</button>
                  )
                })}
              </div>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"><ChevronRight className="h-4 w-4" /></button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages} className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 cursor-pointer"><ChevronsRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
      )}

      {previewImage && <ImagePreviewModal src={previewImage.src} alt={previewImage.alt} onClose={() => setPreviewImage(null)} />}
    </div>
  )
}

// ─── ActionsMenu ───────────────────────────────────────────
function ActionsMenu({ payment, onStatusChange }: { payment: PaymentEntry; onStatusChange: (id: string, status: string) => void }) {
  const popover = usePopover()
  const actions = [
    { label: 'Mark Completed', status: 'Completed', icon: CheckCircle2, color: 'text-purple-400 hover:bg-purple-500/10' },
    { label: 'Initiate Payment', status: 'Payment Initiated', icon: DollarSign, color: 'text-amber-400 hover:bg-amber-500/10' },
  ].filter(a => a.status !== payment.status)
  if (actions.length === 0) return null
  return (
    <div className="relative" ref={popover.ref}>
      <button onClick={e => { e.stopPropagation(); popover.setOpen(!popover.open) }}
        className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 cursor-pointer">
        <MoreHorizontal className="h-4 w-4" />
      </button>
      <AnimatePresence>
        {popover.open && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            className="absolute top-full right-0 mt-1 z-50 min-w-[190px] bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-2xl shadow-black/40 overflow-hidden">
            <div className="p-1">
              {actions.map(a => (
                <button key={a.status} onClick={e => { e.stopPropagation(); onStatusChange(payment.id, a.status); popover.setOpen(false) }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer ${a.color}`}>
                  <a.icon className="h-3.5 w-3.5" /> {a.label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
