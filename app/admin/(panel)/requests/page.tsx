'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, XCircle, Clock, Search, X, ChevronDown,
  ArrowUpDown, ArrowUp, ArrowDown, MoreHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileText, IndianRupee, Users, Megaphone, Calendar,
  SlidersHorizontal, Download, FileSpreadsheet, FileJson,
  PieChart, DollarSign, Banknote, Mail, Phone
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────
interface RequestEntry {
  id: string
  type: string
  amount: number
  reason: string
  status: string
  submitted_at: string
  processed_at?: string
  processed_amount?: number
  application_id: string
  application_status: string
  partial_payment: number
  final_payment: number
  pending_amount: number
  manager_phone: string
  user: {
    id: string; full_name: string; influencer_id: string
    email: string; mobile: string
    account_name: string; account_number: string; ifsc_code: string
  }
  campaign: {
    brand_name: string; campaign_code: string; platform: string
  }
}

type SortDirection = 'asc' | 'desc' | null
interface SortConfig { column: string; direction: SortDirection }

// ─── Constants ─────────────────────────────────────────────
const reqStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
  approved: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/25',
  processed: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
}
const reqStatusDots: Record<string, string> = {
  pending: 'bg-amber-400', approved: 'bg-emerald-400',
  rejected: 'bg-red-400', processed: 'bg-indigo-400',
}
const typeColors: Record<string, string> = {
  partial: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/25',
  payment: 'bg-purple-500/15 text-purple-400 border-purple-500/25',
  appeal: 'bg-red-500/15 text-red-400 border-red-500/25',
}
const typeIcons: Record<string, React.ElementType> = {
  partial: PieChart, payment: DollarSign, appeal: XCircle,
}

const statusFilters = ['All', 'pending', 'approved', 'processed', 'rejected']
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
  return { open, setOpen, popoverRef: ref }
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

// ─── Process Modal ─────────────────────────────────────────
function ProcessModal({ request, onClose, onProcess }: {
  request: RequestEntry; onClose: () => void
  onProcess: (reqId: string, appId: string, status: string, paymentField: string, amount: number) => Promise<void>
}) {
  const [amount, setAmount] = useState(String(request.amount || 0))
  const [paymentType, setPaymentType] = useState<'partial_payment' | 'final_payment'>('partial_payment')
  const [processing, setProcessing] = useState(false)

  const handleProcess = async (status: string) => {
    setProcessing(true)
    try {
      const amt = parseFloat(amount) || 0
      await onProcess(request.id, request.application_id, status, paymentType, status === 'processed' ? amt : 0)
      onClose()
    } catch { /* handled in parent */ }
    finally { setProcessing(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-cyan-500">
                <PieChart className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-base font-bold text-white">Process Request</h3>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white cursor-pointer">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-[9px] font-bold text-white shrink-0">
              {request.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-white font-medium text-sm">{request.user?.full_name}</p>
              <p className="text-slate-500 text-[10px]">{request.campaign?.brand_name} · {request.campaign?.campaign_code}</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Request Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Type</p>
              <p className="text-sm font-bold text-cyan-400 capitalize">{request.type}</p>
            </div>
            <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Requested</p>
              <p className="text-sm font-bold text-white">₹{request.amount?.toLocaleString()}</p>
            </div>
          </div>

          {request.reason && (
            <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-1">Reason</p>
              <p className="text-sm text-slate-300">{request.reason}</p>
            </div>
          )}

          {/* Current Financial State */}
          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
            <p className="text-[9px] text-emerald-400 uppercase tracking-wider font-bold mb-2">Current Financials</p>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Partial</p>
                <p className="text-sm font-bold text-blue-400">₹{(request.partial_payment || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Final</p>
                <p className="text-sm font-bold text-purple-400">₹{(request.final_payment || 0).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Pending</p>
                <p className="text-sm font-bold text-amber-400">₹{(request.pending_amount || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Payment Input */}
          <div className="space-y-3">
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Pay Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">₹</span>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-slate-800 border border-white/10 text-white text-sm font-semibold rounded-xl px-3 py-2.5 pl-7 focus:outline-none focus:ring-2 focus:ring-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Payment Type</label>
              <div className="flex gap-2">
                <button onClick={() => setPaymentType('partial_payment')}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                    paymentType === 'partial_payment' ? 'bg-blue-500/15 text-blue-400 border-blue-500/25' : 'bg-slate-800 text-slate-500 border-white/5 hover:border-white/10'
                  }`}>Partial Payment</button>
                <button onClick={() => setPaymentType('final_payment')}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer transition-all ${
                    paymentType === 'final_payment' ? 'bg-purple-500/15 text-purple-400 border-purple-500/25' : 'bg-slate-800 text-slate-500 border-white/5 hover:border-white/10'
                  }`}>Final Payment</button>
              </div>
            </div>
          </div>

          {/* Bank Details */}
          {request.user?.account_name && (
            <div className="bg-slate-800/50 border border-white/5 rounded-xl p-3">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-2">Bank Details</p>
              <div className="space-y-1 text-xs">
                <p className="text-slate-300"><span className="text-slate-500 w-20 inline-block">Name:</span> {request.user.account_name}</p>
                <p className="text-slate-300 font-mono"><span className="text-slate-500 font-sans w-20 inline-block">A/C:</span> {request.user.account_number}</p>
                <p className="text-slate-300 font-mono"><span className="text-slate-500 font-sans w-20 inline-block">IFSC:</span> {request.user.ifsc_code}</p>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-5 border-t border-white/5 flex items-center gap-3">
          <Button onClick={() => handleProcess('rejected')} disabled={processing}
            className="flex-1 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 font-bold text-xs cursor-pointer">
            <XCircle className="mr-1.5 h-3.5 w-3.5" /> Reject
          </Button>
          <Button onClick={() => handleProcess('approved')} disabled={processing}
            className="flex-1 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 font-bold text-xs cursor-pointer">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Approve
          </Button>
          <Button onClick={() => handleProcess('processed')} disabled={processing}
            className="flex-1 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold text-xs border-none shadow-lg shadow-emerald-500/20 cursor-pointer">
            {processing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <DollarSign className="mr-1.5 h-3.5 w-3.5" />} Pay
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function RequestsPage() {
  const [loading, setLoading] = useState(true)
  const [requests, setRequests] = useState<RequestEntry[]>([])
  const [activeStatus, setActiveStatus] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: 'date', direction: 'desc' })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [processModal, setProcessModal] = useState<RequestEntry | null>(null)

  // Summary
  const summary = useMemo(() => {
    let totalPending = 0, totalApproved = 0, totalProcessed = 0, totalRejected = 0, totalAmount = 0
    requests.forEach(r => {
      totalAmount += r.amount || 0
      if (r.status === 'pending') totalPending++
      if (r.status === 'approved') totalApproved++
      if (r.status === 'processed') totalProcessed++
      if (r.status === 'rejected') totalRejected++
    })
    return { totalPending, totalApproved, totalProcessed, totalRejected, totalAmount }
  }, [requests])

  useEffect(() => { fetchRequests() }, [])

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/requests')
      const json = await res.json()
      setRequests(json.requests || [])
    } catch { toast.error('Failed to load requests') }
    finally { setLoading(false) }
  }

  const handleProcess = async (reqId: string, appId: string, status: string, paymentField: string, amount: number) => {
    try {
      const res = await fetch('/api/admin/requests', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId: appId, requestId: reqId, newStatus: status, paymentField, paymentAmount: amount }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success(`Request ${status}` + (amount > 0 ? ` · ₹${amount.toLocaleString()} paid as ${paymentField.replace('_', ' ')}` : ''))
      fetchRequests() // refresh
    } catch {
      toast.error('Failed to process request')
      throw new Error('Failed')
    }
  }

  // Processing
  const processedData = useMemo(() => {
    let result = [...requests]
    if (activeStatus !== 'All') result = result.filter(r => r.status === activeStatus)
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(r => {
        const s = `${r.user?.full_name} ${r.user?.influencer_id} ${r.campaign?.brand_name} ${r.campaign?.campaign_code} ${r.reason} ${r.type}`.toLowerCase()
        return s.includes(q)
      })
    }
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        let valA: any, valB: any
        switch (sortConfig.column) {
          case 'name': valA = a.user?.full_name?.toLowerCase() || ''; valB = b.user?.full_name?.toLowerCase() || ''; break
          case 'brand': valA = a.campaign?.brand_name?.toLowerCase() || ''; valB = b.campaign?.brand_name?.toLowerCase() || ''; break
          case 'amount': valA = a.amount || 0; valB = b.amount || 0; break
          case 'type': valA = a.type; valB = b.type; break
          case 'status': valA = a.status; valB = b.status; break
          case 'date': valA = new Date(a.submitted_at).getTime(); valB = new Date(b.submitted_at).getTime(); break
          default: return 0
        }
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return result
  }, [requests, activeStatus, searchQuery, sortConfig])

  const totalFiltered = processedData.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))
  const paginatedData = processedData.slice((page - 1) * pageSize, page * pageSize)
  const startIndex = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalFiltered)

  useEffect(() => { setPage(1) }, [activeStatus, searchQuery, pageSize])

  const handleSort = useCallback((column: string) => {
    setSortConfig(prev => {
      if (prev.column === column) {
        if (prev.direction === 'asc') return { column, direction: 'desc' }
        if (prev.direction === 'desc') return { column: '', direction: null }
      }
      return { column, direction: 'asc' }
    })
  }, [])

  const statusCounts = useMemo(() => {
    const c: Record<string, number> = {}
    requests.forEach(r => { c[r.status] = (c[r.status] || 0) + 1 })
    return c
  }, [requests])

  const handleExport = useCallback((format: 'csv' | 'json') => {
    const data = processedData.map(r => ({
      request_id: r.id, type: r.type, amount: r.amount, reason: r.reason,
      status: r.status, submitted_at: r.submitted_at,
      influencer: r.user?.full_name || '', influencer_id: r.user?.influencer_id || '',
      email: r.user?.email || '', mobile: r.user?.mobile || '',
      campaign: r.campaign?.brand_name || '', campaign_code: r.campaign?.campaign_code || '',
      bank_name: r.user?.account_name || '', bank_account: r.user?.account_number || '', ifsc: r.user?.ifsc_code || '',
      partial_payment: r.partial_payment, final_payment: r.final_payment, pending_amount: r.pending_amount,
    }))
    let content: string, mime: string, ext: string
    if (format === 'csv') {
      const headers = Object.keys(data[0] || {})
      const rows = data.map(row => headers.map(h => `"${String((row as any)[h]).replace(/"/g, '""')}"`).join(','))
      content = [headers.join(','), ...rows].join('\n'); mime = 'text/csv'; ext = 'csv'
    } else { content = JSON.stringify(data, null, 2); mime = 'application/json'; ext = 'json' }
    const blob = new Blob([content], { type: mime })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `payment-requests.${ext}`; a.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${data.length} requests as ${ext.toUpperCase()}`)
  }, [processedData])

  if (loading) return <GlobalLoader text="Loading Requests..." />

  return (
    <div className="space-y-5 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 shadow-lg shadow-cyan-500/20">
              <PieChart className="h-4.5 w-4.5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Payment Requests</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1 ml-[3px]">{totalFiltered} request{totalFiltered !== 1 ? 's' : ''} from influencers</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExport('csv')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-400 border border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 transition-all cursor-pointer">
            <Download className="h-3.5 w-3.5" /> Export
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Requests', value: requests.length, icon: FileText, gradient: 'from-slate-600 to-slate-500', shadow: 'shadow-slate-500/5' },
          { label: 'Pending', value: summary.totalPending, icon: Clock, gradient: 'from-amber-600 to-amber-500', shadow: 'shadow-amber-500/10' },
          { label: 'Approved', value: summary.totalApproved, icon: CheckCircle2, gradient: 'from-emerald-600 to-emerald-500', shadow: 'shadow-emerald-500/10' },
          { label: 'Processed', value: summary.totalProcessed, icon: DollarSign, gradient: 'from-indigo-600 to-indigo-500', shadow: 'shadow-indigo-500/10' },
          { label: 'Rejected', value: summary.totalRejected, icon: XCircle, gradient: 'from-red-600 to-red-500', shadow: 'shadow-red-500/10' },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg ${card.shadow}`}>
            <div className="flex items-center gap-2 mb-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${card.gradient}`}>
                <card.icon className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{card.label}</span>
            </div>
            <p className="text-xl font-bold text-white">{card.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map(f => (
          <button key={f} onClick={() => setActiveStatus(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium border cursor-pointer capitalize ${
              activeStatus === f ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/10' :
              'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
            }`}>
            {f} <span className="ml-1.5 text-[10px] opacity-60">({f === 'All' ? requests.length : (statusCounts[f] || 0)})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input value={searchQuery} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          placeholder="Search by name, campaign, reason..."
          className="pl-10 bg-slate-900/50 border-white/5 text-white h-10 text-sm focus-visible:ring-indigo-500 rounded-xl w-full" />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"><X className="h-3.5 w-3.5" /></button>}
      </div>

      {/* Table */}
      {requests.length === 0 ? (
        <div className="text-center py-20 rounded-2xl border border-white/5 bg-slate-900/30">
          <PieChart className="h-14 w-14 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No Payment Requests Yet</h3>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">Requests will appear here when influencers click &quot;Partial Request&quot; or submit payment forms.</p>
        </div>
      ) : totalFiltered === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-white/5 bg-slate-900/30">
          <Search className="h-10 w-10 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-400">No matching requests</h3>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/10">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06] bg-slate-950/40">
                  <th className="px-4 py-3 text-left"><SortableHeader label="Influencer" column="name" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-left"><SortableHeader label="Campaign" column="brand" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-left"><SortableHeader label="Type" column="type" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-left"><SortableHeader label="Amount" column="amount" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-left"><span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Reason</span></th>
                  <th className="px-4 py-3 text-left"><SortableHeader label="Status" column="status" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-4 py-3 text-left"><SortableHeader label="Submitted" column="date" sortConfig={sortConfig} onSort={handleSort} /></th>
                  <th className="px-3 py-3 text-center"><span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Action</span></th>
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((req, i) => {
                  const TypeIcon = typeIcons[req.type] || FileText
                  return (
                    <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      {/* Influencer */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 text-[10px] font-bold text-white shrink-0">
                            {req.user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[13px] font-semibold text-white truncate">{req.user?.full_name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-500 font-mono truncate">{req.user?.influencer_id || '—'}</p>
                          </div>
                        </div>
                      </td>
                      {/* Campaign */}
                      <td className="px-4 py-3">
                        <p className="text-[13px] font-medium text-slate-200 truncate">{req.campaign?.brand_name || '—'}</p>
                        <p className="text-[10px] text-slate-500 font-mono truncate">{req.campaign?.campaign_code || '—'}</p>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border capitalize ${typeColors[req.type] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
                          <TypeIcon className="h-3 w-3" /> {req.type}
                        </span>
                      </td>
                      {/* Amount */}
                      <td className="px-4 py-3">
                        <span className={`text-sm font-bold ${req.amount > 0 ? 'text-white' : 'text-slate-600'}`}>
                          {req.amount > 0 ? `₹${req.amount.toLocaleString()}` : '—'}
                        </span>
                      </td>
                      {/* Reason */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-400 truncate max-w-[200px]">{req.reason || '—'}</p>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold border capitalize ${reqStatusColors[req.status] || 'bg-slate-500/15 text-slate-400 border-slate-500/25'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${reqStatusDots[req.status] || 'bg-slate-400'}`} />
                          {req.status}
                        </span>
                        {req.processed_at && (
                          <p className="text-[9px] text-slate-600 mt-0.5">{req.processed_amount ? `₹${req.processed_amount.toLocaleString()} paid` : ''}</p>
                        )}
                      </td>
                      {/* Date */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-slate-300">{timeAgo(req.submitted_at)}</p>
                        <p className="text-[10px] text-slate-600">{new Date(req.submitted_at).toLocaleDateString('en-IN')}</p>
                      </td>
                      {/* Action */}
                      <td className="px-3 py-3 text-center">
                        {req.status === 'pending' ? (
                          <Button size="sm" onClick={() => setProcessModal(req)}
                            className="h-7 px-3 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-[10px] font-bold border-none cursor-pointer shadow-lg shadow-indigo-500/20">
                            Process
                          </Button>
                        ) : req.status === 'approved' ? (
                          <Button size="sm" onClick={() => setProcessModal(req)}
                            className="h-7 px-3 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white text-[10px] font-bold border-none cursor-pointer shadow-lg shadow-emerald-500/20">
                            Pay
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-600 capitalize">{req.status}</span>
                        )}
                      </td>
                    </motion.tr>
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

      {/* Process Modal */}
      {processModal && (
        <ProcessModal request={processModal} onClose={() => setProcessModal(null)} onProcess={handleProcess} />
      )}
    </div>
  )
}
