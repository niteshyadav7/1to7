'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IndianRupee,
  CreditCard,
  Building,
  CheckCircle2,
  Clock,
  Download,
  Send,
  AlertCircle,
  FileSpreadsheet,
  Search,
  Filter,
  CheckSquare,
  Square,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Loader2,
  ExternalLink,
  Tag,
  Users,
  Eye,
  X,
  Copy,
  Clipboard,
  Zap,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/useRealtime'
import { GlobalLoader } from '@/components/ui/global-loader'

interface UserInfo {
  id: string
  full_name: string
  influencer_id: string
  email: string
  mobile: string
  account_name: string
  account_number: string
  ifsc_code: string
  instagram_username?: string
}

interface Application {
  id: string
  status: string
  form_data: Record<string, any>
  pending_amount: number
  partial_payment: number
  final_payment: number
  created_at: string
  updated_at: string
  users: UserInfo
  campaigns: {
    id: string
    brand_name: string
    campaign_code: string
  }
}

export default function FinancePayoutPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'finance_queue' | 'dual_approval' | 'disbursed_history'>('finance_queue')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [sortBy, setSortBy] = useState<'date' | 'amount_desc' | 'amount_asc' | 'name'>('date')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(15)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  
  // Bulk Disburse Modal State
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [utrNumber, setUtrNumber] = useState('')
  const [batchId, setBatchId] = useState('')
  const [paymentMode, setPaymentMode] = useState('NEFT')
  const [batchNotes, setBatchNotes] = useState('')
  const [disbursing, setDisbursing] = useState(false)

  // Dual Approval Modal State
  const [approvingId, setApprovingId] = useState<string | null>(null)

  // Helper to compute payable amount for an application in finance
  const getPayableAmount = (app: Application) => {
    const init = app.form_data?.payment_initiation
    const initiated = app.form_data?.payment_initiated
    return Number(
      init?.prepared_amount ||
      initiated?.amount ||
      (Number(app.pending_amount) > 0 ? app.pending_amount : (app.partial_payment || 0))
    )
  }

  // Helper to compute disbursed amount
  const getDisbursedAmount = (app: Application) => {
    return Number(
      app.form_data?.finance_payout_completed?.amount_paid ||
      app.form_data?.payment_initiation?.prepared_amount ||
      app.form_data?.payment_initiated?.amount ||
      (Number(app.partial_payment) || 0) + (Number(app.final_payment) || 0)
    )
  }

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payments')
      const data = await res.json()
      setApplications(data.payments || data.applications || [])
    } catch {
      toast.error('Failed to load payment queue')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  useRealtime({ table: 'applications', onChange: fetchApplications })

  // Unique Brands across all applications
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(applications.map((a) => a.campaigns?.brand_name).filter(Boolean))).sort() as string[]
  }, [applications])

  // Categorize Applications
  // 1. Ready for Finance Payout: MUST be approved by 2 admins (Dual Approval) and NOT already disbursed
  const financeQueueApps = useMemo(() => {
    return applications.filter((app) => {
      const init = app.form_data?.payment_initiation
      const isCompleted = app.status === 'Completed' || !!app.form_data?.finance_payout_completed
      if (isCompleted) return false

      const isDualApproved =
        (app.status === 'Payment Approved' || init?.status === 'approved_for_finance') &&
        init?.status !== 'pending_second_approval' &&
        app.status !== 'Payment Requested'

      const payableAmt = getPayableAmount(app)
      return isDualApproved && payableAmt > 0
    })
  }, [applications])

  // 2. Awaiting 2nd Admin Approval
  const pendingDualApprovalApps = useMemo(() => {
    return applications.filter((app) => {
      const init = app.form_data?.payment_initiation
      const isCompleted = app.status === 'Completed' || !!app.form_data?.finance_payout_completed
      if (isCompleted) return false
      return (
        init?.status === 'pending_second_approval' ||
        (app.status === 'Payment Initiated' && init?.status !== 'approved_for_finance')
      )
    })
  }, [applications])

  // 3. Disbursed / Completed Payout History
  const disbursedApps = useMemo(() => {
    return applications
      .filter((app) => app.status === 'Completed' || !!app.form_data?.finance_payout_completed)
      .sort((a, b) => {
        const timeA = new Date(a.form_data?.finance_payout_completed?.executed_at || a.updated_at || 0).getTime()
        const timeB = new Date(b.form_data?.finance_payout_completed?.executed_at || b.updated_at || 0).getTime()
        return timeB - timeA
      })
  }, [applications])

  const currentList =
    activeTab === 'finance_queue'
      ? financeQueueApps
      : activeTab === 'dual_approval'
      ? pendingDualApprovalApps
      : disbursedApps

  // Apply Brand Filter, Search Query & Sorting
  const processedApps = useMemo(() => {
    let result = [...currentList]

    // Brand filter
    if (selectedBrand !== 'all') {
      result = result.filter((app) => app.campaigns?.brand_name === selectedBrand)
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((app) => {
        const payout = app.form_data?.finance_payout_completed
        return (
          app.users?.full_name?.toLowerCase().includes(q) ||
          app.users?.influencer_id?.toLowerCase().includes(q) ||
          app.users?.account_number?.includes(q) ||
          app.users?.ifsc_code?.toLowerCase().includes(q) ||
          app.campaigns?.brand_name?.toLowerCase().includes(q) ||
          app.campaigns?.campaign_code?.toLowerCase().includes(q) ||
          payout?.utr_number?.toLowerCase().includes(q) ||
          payout?.batch_id?.toLowerCase().includes(q) ||
          payout?.executed_by?.toLowerCase().includes(q)
        )
      })
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'amount_desc') {
        const amtA = activeTab === 'disbursed_history' ? getDisbursedAmount(a) : getPayableAmount(a)
        const amtB = activeTab === 'disbursed_history' ? getDisbursedAmount(b) : getPayableAmount(b)
        return amtB - amtA
      }
      if (sortBy === 'amount_asc') {
        const amtA = activeTab === 'disbursed_history' ? getDisbursedAmount(a) : getPayableAmount(a)
        const amtB = activeTab === 'disbursed_history' ? getDisbursedAmount(b) : getPayableAmount(b)
        return amtA - amtB
      }
      if (sortBy === 'name') {
        const nameA = a.users?.account_name || a.users?.full_name || ''
        const nameB = b.users?.account_name || b.users?.full_name || ''
        return nameA.localeCompare(nameB)
      }
      // default: date descending
      const timeA = new Date(
        activeTab === 'disbursed_history'
          ? a.form_data?.finance_payout_completed?.executed_at || a.updated_at || 0
          : a.updated_at || a.created_at || 0
      ).getTime()
      const timeB = new Date(
        activeTab === 'disbursed_history'
          ? b.form_data?.finance_payout_completed?.executed_at || b.updated_at || 0
          : b.updated_at || b.created_at || 0
      ).getTime()
      return timeB - timeA
    })

    return result
  }, [currentList, selectedBrand, searchQuery, sortBy, activeTab])

  // Pagination
  const totalPages = Math.ceil(processedApps.length / pageSize) || 1
  const paginatedApps = useMemo(() => {
    const start = (page - 1) * pageSize
    return processedApps.slice(start, start + pageSize)
  }, [processedApps, page, pageSize])

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.length === paginatedApps.length && paginatedApps.length > 0) {
      setSelectedIds([])
    } else {
      setSelectedIds(paginatedApps.map((a) => a.id))
    }
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const selectedTotalAmount = useMemo(() => {
    return applications
      .filter((app) => selectedIds.includes(app.id))
      .reduce((sum, app) => sum + getPayableAmount(app), 0)
  }, [applications, selectedIds])

  // Export Bank NEFT / Excel CSV
  const handleExportNEFT = () => {
    if (activeTab === 'disbursed_history') {
      const appsToExport = selectedIds.length > 0
        ? disbursedApps.filter((a) => selectedIds.includes(a.id))
        : processedApps

      if (appsToExport.length === 0) {
        toast.error('No disbursed records to export')
        return
      }

      const headers = [
        'Beneficiary Name',
        'Influencer ID',
        'Mobile',
        'Campaign Code',
        'Brand Name',
        'Account Number',
        'IFSC Code',
        'Disbursed Amount (INR)',
        'Bank UTR Number',
        'Batch ID',
        'Payment Mode',
        'Disbursed At',
        'Disbursed By',
        'Status',
      ]

      const rows = appsToExport.map((app) => {
        const payout = app.form_data?.finance_payout_completed || {}
        return [
          `"${app.users?.account_name || app.users?.full_name || ''}"`,
          `"${app.users?.influencer_id || ''}"`,
          `"${app.users?.mobile || ''}"`,
          `"${app.campaigns?.campaign_code || ''}"`,
          `"${app.campaigns?.brand_name || ''}"`,
          `"${app.users?.account_number || ''}"`,
          `"${app.users?.ifsc_code || ''}"`,
          getDisbursedAmount(app),
          `"${payout.utr_number || app.form_data?.payment_initiated?.bank_code || ''}"`,
          `"${payout.batch_id || ''}"`,
          `"${payout.payment_mode || 'NEFT'}"`,
          `"${payout.executed_at ? new Date(payout.executed_at).toLocaleString('en-IN') : ''}"`,
          `"${payout.executed_by || 'Finance Team'}"`,
          '"Disbursed"',
        ]
      })

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `Finance_Disbursed_History_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success(`Exported ${appsToExport.length} disbursed records to CSV!`)
      return
    }

    const appsToExport = selectedIds.length > 0
      ? applications.filter((a) => selectedIds.includes(a.id))
      : processedApps

    if (appsToExport.length === 0) {
      toast.error('No applications to export')
      return
    }

    const headers = [
      'Beneficiary Name',
      'Account Number',
      'IFSC Code',
      'Amount (INR)',
      'Campaign Code',
      'Brand Name',
      'Influencer ID',
      'Mobile',
      'Payment Mode',
      'Remarks',
    ]

    const rows = appsToExport.map((app) => [
      `"${app.users?.account_name || app.users?.full_name || ''}"`,
      `"${app.users?.account_number || ''}"`,
      `"${app.users?.ifsc_code || ''}"`,
      getPayableAmount(app),
      `"${app.campaigns?.campaign_code || ''}"`,
      `"${app.campaigns?.brand_name || ''}"`,
      `"${app.users?.influencer_id || ''}"`,
      `"${app.users?.mobile || ''}"`,
      'NEFT',
      `"Payout for ${app.campaigns?.brand_name || 'Campaign'}"`,
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Finance_NEFT_Payout_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${appsToExport.length} payout records to CSV!`)
  }

  // Bulk Disburse Execution
  const handleExecuteBulkPayout = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one application')
      return
    }

    setDisbursing(true)
    try {
      const res = await fetch('/api/admin/payments/bulk-payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: selectedIds,
          utr_number: utrNumber.trim(),
          batch_id: batchId.trim(),
          payment_mode: paymentMode,
          notes: batchNotes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process bulk payout')

      toast.success(data.message || 'Bulk payout processed successfully!')
      setShowBulkModal(false)
      setSelectedIds([])
      setUtrNumber('')
      setBatchId('')
      setBatchNotes('')
      fetchApplications()
    } catch (err: any) {
      toast.error(err.message || 'Payout failed')
    } finally {
      setDisbursing(false)
    }
  }

  // Second Admin Dual Approval
  const handleDualApprove = async (appId: string) => {
    setApprovingId(appId)
    try {
      const res = await fetch('/api/admin/payments/dual-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: appId,
          action: 'approve',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Dual approval failed')

      toast.success(data.message || 'Payment approved and moved to Finance Queue!')
      fetchApplications()
    } catch (err: any) {
      toast.error(err.message || 'Approval failed')
    } finally {
      setApprovingId(null)
    }
  }

  if (loading) {
    return <GlobalLoader text="Loading Finance Payouts..." />
  }

  const totalFinanceQueueAmount = financeQueueApps.reduce((acc, a) => acc + getPayableAmount(a), 0)
  const totalDualApprovalAmount = pendingDualApprovalApps.reduce((acc, a) => acc + getPayableAmount(a), 0)
  const totalDisbursedAmount = disbursedApps.reduce((acc, a) => acc + getDisbursedAmount(a), 0)

  return (
    <div className="space-y-3.5">
      <SetAdminHeader>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm">
            <IndianRupee className="h-3.5 w-3.5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Finance Payout Desk</h1>
            <p className="text-[10px] text-slate-400">Maker-Checker Dual Approval & Bulk NEFT Payout System</p>
          </div>
        </div>
      </SetAdminHeader>

      {/* Ultra-Compact KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="py-2 px-3 rounded-xl bg-slate-900/50 border border-white/[0.08] backdrop-blur-xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Ready for Finance Payout</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-emerald-400 tracking-tight">₹{totalFinanceQueueAmount.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-medium">({financeQueueApps.length} verified)</span>
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="h-3 w-3" />
          </div>
        </div>

        <div className="py-2 px-3 rounded-xl bg-slate-900/50 border border-white/[0.08] backdrop-blur-xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Awaiting 2nd Admin Approval</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-amber-400 tracking-tight">₹{totalDualApprovalAmount.toLocaleString()}</span>
              <span className="text-[10px] text-slate-500 font-medium">({pendingDualApprovalApps.length} pending)</span>
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <Clock className="h-3 w-3" />
          </div>
        </div>

        <div className="py-2 px-3 rounded-xl bg-slate-900/50 border border-white/[0.08] backdrop-blur-xl flex items-center justify-between shadow-sm">
          <div className="space-y-0.5">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              {activeTab === 'finance_queue' && selectedIds.length > 0 ? 'Selected Batch Value' : 'Total Disbursed'}
            </p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-indigo-400 tracking-tight">
                ₹{(activeTab === 'finance_queue' && selectedIds.length > 0 ? selectedTotalAmount : totalDisbursedAmount).toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                ({activeTab === 'finance_queue' && selectedIds.length > 0
                  ? `${selectedIds.length} selected`
                  : `${disbursedApps.length} disbursed`})
              </span>
            </div>
          </div>
          <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Building className="h-3 w-3" />
          </div>
        </div>
      </div>

      {/* Unified Single-Line Controls Header */}
      <div className="bg-slate-900/60 px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-xl shadow-md flex flex-wrap lg:flex-nowrap items-center justify-between gap-2">
        {/* Left: Compact Segmented Tabs */}
        <div className="inline-flex items-center gap-1 p-0.5 bg-slate-950/70 rounded-lg border border-white/10 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('finance_queue'); setSelectedIds([]); setPage(1) }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'finance_queue'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <CheckCircle2 className="h-3 w-3" />
            Finance Queue ({financeQueueApps.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('dual_approval'); setSelectedIds([]); setPage(1) }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'dual_approval'
                ? 'bg-amber-600 text-white shadow-sm shadow-amber-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <ShieldCheck className="h-3 w-3" />
            Dual-Approval ({pendingDualApprovalApps.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('disbursed_history'); setSelectedIds([]); setPage(1) }}
            className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'disbursed_history'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Building className="h-3 w-3" />
            Disbursed History ({disbursedApps.length})
          </button>
        </div>

        {/* Center: Search + Filter Inputs */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          {/* Compact Search */}
          <div className="relative min-w-[130px] max-w-[190px] flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1) }}
              placeholder={activeTab === 'disbursed_history' ? 'Search UTR, name...' : 'Search payee, A/C...'}
              className="w-full bg-slate-950/70 border border-white/10 text-white pl-7 pr-6 h-7 text-[11px] rounded-lg focus:ring-1 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setPage(1) }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            )}
          </div>

          {/* Brand Filter */}
          <select
            value={selectedBrand}
            onChange={(e) => { setSelectedBrand(e.target.value); setPage(1) }}
            className="bg-slate-950/70 border border-white/10 text-slate-300 text-[11px] rounded-lg px-2 h-7 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer max-w-[110px] truncate"
          >
            <option value="all">All Brands</option>
            {uniqueBrands.map((brand) => (
              <option key={brand} value={brand}>
                {brand}
              </option>
            ))}
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value as any); setPage(1) }}
            className="bg-slate-950/70 border border-white/10 text-slate-300 text-[11px] rounded-lg px-2 h-7 focus:ring-1 focus:ring-emerald-500 focus:outline-none cursor-pointer max-w-[110px]"
          >
            <option value="date">Newest</option>
            <option value="amount_desc">₹ High to Low</option>
            <option value="amount_asc">₹ Low to High</option>
            <option value="name">Payee A-Z</option>
          </select>

          {/* Reset Filters */}
          {(selectedBrand !== 'all' || searchQuery.trim() || sortBy !== 'date') && (
            <button
              type="button"
              title="Reset Filters"
              onClick={() => {
                setSelectedBrand('all')
                setSearchQuery('')
                setSortBy('date')
                setPage(1)
              }}
              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 px-1.5 h-7 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 cursor-pointer transition-colors shrink-0"
            >
              <X className="h-2.5 w-2.5" /> Clear
            </button>
          )}

          <div className="hidden xl:block text-[10px] text-slate-500 shrink-0">
            <span className="text-slate-300 font-semibold">{processedApps.length}</span> found
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            onClick={handleExportNEFT}
            className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-[11px] font-semibold cursor-pointer flex items-center gap-1 shadow-sm"
          >
            <FileSpreadsheet className="h-3 w-3 text-emerald-400" />
            {activeTab === 'disbursed_history' ? 'Export History' : 'Export NEFT'}
          </Button>

          {activeTab === 'finance_queue' && (
            <Button
              type="button"
              onClick={() => {
                if (selectedIds.length === 0) {
                  toast.error('Select at least one payee for bulk disburse')
                  return
                }
                setShowBulkModal(true)
              }}
              disabled={selectedIds.length === 0}
              className="h-7 px-3 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-[11px] cursor-pointer shadow-sm shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1"
            >
              <Send className="h-3 w-3" />
              Bulk Disburse ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-white/10">
              {activeTab === 'disbursed_history' ? (
                <tr>
                  <th className="px-3 py-2.5">Payee & Influencer</th>
                  <th className="px-3 py-2.5">Campaign</th>
                  <th className="px-3 py-2.5">Bank A/C & IFSC</th>
                  <th className="px-3 py-2.5 text-right">Disbursed Amount</th>
                  <th className="px-3 py-2.5 text-center">Bank UTR / Ref</th>
                  <th className="px-3 py-2.5 text-center">Batch & Mode</th>
                  <th className="px-3 py-2.5 text-center">Disbursed Date & By</th>
                  <th className="px-3 py-2.5 text-center">Status</th>
                </tr>
              ) : (
                <tr>
                  {activeTab === 'finance_queue' && (
                    <th className="px-3 py-2.5 w-8">
                      <button
                        type="button"
                        onClick={handleSelectAll}
                        className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                      >
                        {selectedIds.length > 0 && selectedIds.length === paginatedApps.length ? (
                          <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                        ) : (
                          <Square className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </th>
                  )}
                  <th className="px-3 py-2.5">Payee & Influencer</th>
                  <th className="px-3 py-2.5">Campaign</th>
                  <th className="px-3 py-2.5">Bank A/C & IFSC</th>
                  <th className="px-3 py-2.5 text-right">Payable Amount</th>
                  <th className="px-3 py-2.5 text-center">Maker-Checker Status</th>
                  <th className="px-3 py-2.5 text-right">Actions</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedApps.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeTab === 'disbursed_history' ? 8 : (activeTab === 'finance_queue' ? 7 : 6)}
                    className="text-center py-12 text-slate-500"
                  >
                    No applications currently matching this finance filter.
                  </td>
                </tr>
              ) : activeTab === 'disbursed_history' ? (
                paginatedApps.map((app) => {
                  const payout = app.form_data?.finance_payout_completed
                  const payeeName = app.users?.account_name || app.users?.full_name || 'Unknown Payee'
                  const utr = payout?.utr_number || app.form_data?.payment_initiated?.bank_code || 'N/A'
                  const batch = payout?.batch_id || 'Direct'
                  const mode = payout?.payment_mode || 'NEFT'
                  const executedAt = payout?.executed_at || app.updated_at
                  const executedBy = payout?.executed_by || 'Finance Team'

                  return (
                    <tr key={app.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-3 py-2">
                        <div className="font-bold text-white text-xs">{payeeName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{app.users?.influencer_id}</span>
                          {app.users?.instagram_username && (
                            <span className="text-pink-400 font-semibold">@{app.users.instagram_username}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-200 text-xs">{app.campaigns?.brand_name}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{app.campaigns?.campaign_code}</div>
                      </td>

                      <td className="px-3 py-2">
                        {app.users?.account_number ? (
                          <div className="space-y-0.5 font-mono">
                            <div className="text-slate-200 font-bold tracking-wider text-xs">
                              {app.users.account_number}
                            </div>
                            <div className="text-[9px] text-indigo-400 uppercase font-semibold">
                              IFSC: {app.users.ifsc_code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 italic text-[10px]">N/A</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div className="text-sm font-extrabold text-emerald-400">
                          ₹{getDisbursedAmount(app).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          Total: ₹{((Number(app.partial_payment) || 0) + (Number(app.pending_amount) || 0)).toLocaleString()}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <div className="inline-flex items-center gap-1 font-mono text-[11px] bg-slate-950/70 border border-white/10 px-2 py-0.5 rounded-lg text-emerald-300">
                          <span>{utr}</span>
                          {utr !== 'N/A' && (
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(utr)
                                toast.success('UTR copied to clipboard!')
                              }}
                              className="p-0.5 text-slate-400 hover:text-white rounded cursor-pointer"
                              title="Copy UTR"
                            >
                              <Copy className="h-2.5 w-2.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <div className="space-y-0.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 inline-block">
                            {mode}
                          </span>
                          <span className="text-[9px] font-mono text-slate-500 block truncate max-w-[90px]">
                            {batch}
                          </span>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <div className="space-y-0.5">
                          <div className="text-[10px] text-slate-200 font-medium">
                            {executedAt ? new Date(executedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                          </div>
                          <div className="text-[9px] text-slate-500">
                            By {executedBy}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 inline-flex items-center gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />
                          Disbursed
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                paginatedApps.map((app) => {
                  const isSelected = selectedIds.includes(app.id)
                  const init = app.form_data?.payment_initiation
                  const payeeName = app.users?.account_name || app.users?.full_name || 'Unknown Payee'

                  return (
                    <tr
                      key={app.id}
                      className={`hover:bg-white/[0.02] transition-colors ${
                        isSelected ? 'bg-emerald-500/5' : ''
                      }`}
                    >
                      {activeTab === 'finance_queue' && (
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => toggleSelect(app.id)}
                            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Square className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </td>
                      )}

                      <td className="px-3 py-2">
                        <div className="font-bold text-white text-xs">{payeeName}</div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{app.users?.influencer_id}</span>
                          {app.users?.instagram_username && (
                            <span className="text-pink-400 font-semibold">@{app.users.instagram_username}</span>
                          )}
                        </div>
                      </td>

                      <td className="px-3 py-2">
                        <div className="font-semibold text-slate-200 text-xs">{app.campaigns?.brand_name}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{app.campaigns?.campaign_code}</div>
                      </td>

                      <td className="px-3 py-2">
                        {app.users?.account_number ? (
                          <div className="space-y-0.5 font-mono">
                            <div className="text-slate-200 font-bold tracking-wider text-xs">
                              {app.users.account_number}
                            </div>
                            <div className="text-[9px] text-indigo-400 uppercase font-semibold">
                              IFSC: {app.users.ifsc_code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-red-400 italic text-[10px]">Bank details missing</span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right">
                        <div className="text-sm font-extrabold text-emerald-400">
                          ₹{getPayableAmount(app).toLocaleString()}
                        </div>
                        <div className="text-[9px] text-slate-500">
                          Total: ₹{((Number(app.partial_payment) || 0) + (Number(app.pending_amount) || 0)).toLocaleString()}
                        </div>
                      </td>

                      <td className="px-3 py-2 text-center">
                        {init?.status === 'approved_for_finance' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 inline-flex items-center gap-1">
                            <UserCheck className="h-2.5 w-2.5" />
                            Approved by 2 Admins
                          </span>
                        ) : init?.status === 'pending_second_approval' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 inline-flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5 animate-pulse" />
                            Awaiting 2nd Admin
                          </span>
                        ) : app.status === 'Payment Initiated' ? (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Payment Initiated
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                            {app.status}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-2 text-right">
                        {activeTab === 'dual_approval' ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDualApprove(app.id)}
                            disabled={approvingId === app.id}
                            className="h-7 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] cursor-pointer shadow-sm"
                          >
                            {approvingId === app.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedIds([app.id])
                              setShowBulkModal(true)
                            }}
                            className="h-7 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer shadow-sm"
                          >
                            <Send className="h-3 w-3 mr-1" />
                            Disburse
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {processedApps.length > pageSize && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-950/60 border-t border-white/5">
            <div className="text-xs text-slate-400">
              Showing <span className="font-bold text-white">{(page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-white">
                {Math.min(page * pageSize, processedApps.length)}
              </span>{' '}
              of <span className="font-bold text-white">{processedApps.length}</span> applications
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-slate-400 font-medium px-2">
                Page <span className="text-white font-bold">{page}</span> of{' '}
                <span className="text-white font-bold">{totalPages}</span>
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg bg-slate-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bulk Disburse Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => !disbursing && setShowBulkModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white"
            >
              <div className="bg-slate-950/70 p-5 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-white">Execute Bulk Payout</h3>
                    <p className="text-xs text-slate-400">Disbursing {selectedIds.length} payments</p>
                  </div>
                </div>
                <button
                  onClick={() => !disbursing && setShowBulkModal(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total Payout Sum</p>
                    <p className="text-xl font-black text-emerald-400">₹{selectedTotalAmount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Beneficiaries</p>
                    <p className="text-xl font-black text-white">{selectedIds.length}</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Bank UTR / Transaction Reference Number <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const clip = await navigator.clipboard.readText()
                            if (clip) setUtrNumber(clip.trim())
                          } catch {
                            // clipboard API fallback if permissions blocked
                          }
                        }}
                        className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Clipboard className="h-3 w-3" /> Paste
                      </button>
                      <span className="text-slate-600">·</span>
                      <button
                        type="button"
                        onClick={() => {
                          const randomRef = `UTR${Date.now().toString().slice(-8)}${Math.floor(1000 + Math.random() * 9000)}`
                          setUtrNumber(randomRef)
                        }}
                        className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <Zap className="h-3 w-3" /> Auto-Fill Test UTR
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    onPaste={(e) => {
                      const text = e.clipboardData?.getData('text')
                      if (text) {
                        e.preventDefault()
                        setUtrNumber(text.trim())
                      }
                    }}
                    placeholder="e.g. HDFCN26082300129"
                    className="w-full bg-slate-950/60 border border-white/10 text-white font-mono h-11 text-xs rounded-xl px-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Batch / Run ID (Optional)
                  </label>
                  <input
                    type="text"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    onPaste={(e) => {
                      const text = e.clipboardData?.getData('text')
                      if (text) {
                        e.preventDefault()
                        setBatchId(text.trim())
                      }
                    }}
                    placeholder={`BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`}
                    className="w-full bg-slate-950/60 border border-white/10 text-white font-mono h-11 text-xs rounded-xl px-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Payment Mode
                  </label>
                  <div className="flex gap-2">
                    {['NEFT', 'IMPS', 'RTGS', 'UPI'].map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setPaymentMode(m)}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          paymentMode === m
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'bg-slate-950/60 text-slate-400 border-white/10 hover:text-white'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Finance Remarks (Optional)
                  </label>
                  <textarea
                    value={batchNotes}
                    onChange={(e) => setBatchNotes(e.target.value)}
                    onPaste={(e) => {
                      const text = e.clipboardData?.getData('text')
                      if (text) {
                        e.preventDefault()
                        setBatchNotes(text)
                      }
                    }}
                    placeholder="Batch cleared via corporate banking portal..."
                    rows={2}
                    className="w-full bg-slate-950/60 border border-white/10 text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none placeholder:text-slate-500"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-slate-950/70 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => !disbursing && setShowBulkModal(false)}
                  className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 bg-transparent text-xs h-11 cursor-pointer flex-1"
                >
                  Cancel
                </Button>

                <Button
                  type="button"
                  onClick={handleExecuteBulkPayout}
                  disabled={disbursing || !utrNumber.trim()}
                  className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs h-11 px-5 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50 flex-[2]"
                >
                  {disbursing ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Disbursing...</>
                  ) : (
                    <><CheckCircle2 className="mr-1.5 h-4 w-4" /> Confirm & Disburse</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
