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
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/useRealtime'
import BrandLoader from '@/components/ui/BrandLoader'

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
  const [activeTab, setActiveTab] = useState<'finance_queue' | 'dual_approval'>('finance_queue')
  const [searchQuery, setSearchQuery] = useState('')
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

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payments')
      const data = await res.json()
      setApplications(data.applications || [])
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

  // Categorize Applications
  const financeQueueApps = useMemo(() => {
    return applications.filter((app) => {
      const init = app.form_data?.payment_initiation
      const isApprovedForFinance =
        app.status === 'Payment Approved' ||
        (init && init.status === 'approved_for_finance') ||
        app.status === 'Payment Requested'
      return isApprovedForFinance && (app.pending_amount || 0) > 0
    })
  }, [applications])

  const pendingDualApprovalApps = useMemo(() => {
    return applications.filter((app) => {
      const init = app.form_data?.payment_initiation
      return init && init.status === 'pending_second_approval'
    })
  }, [applications])

  const currentList = activeTab === 'finance_queue' ? financeQueueApps : pendingDualApprovalApps

  const filteredApps = useMemo(() => {
    if (!searchQuery.trim()) return currentList
    const q = searchQuery.toLowerCase()
    return currentList.filter(
      (app) =>
        app.users?.full_name?.toLowerCase().includes(q) ||
        app.users?.influencer_id?.toLowerCase().includes(q) ||
        app.users?.account_number?.includes(q) ||
        app.users?.ifsc_code?.toLowerCase().includes(q) ||
        app.campaigns?.brand_name?.toLowerCase().includes(q) ||
        app.campaigns?.campaign_code?.toLowerCase().includes(q)
    )
  }, [currentList, searchQuery])

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedIds.length === filteredApps.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredApps.map((a) => a.id))
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
      .reduce((sum, app) => sum + (Number(app.pending_amount) || 0), 0)
  }, [applications, selectedIds])

  // Export Bank NEFT / Excel CSV
  const handleExportNEFT = () => {
    const appsToExport = selectedIds.length > 0
      ? applications.filter((a) => selectedIds.includes(a.id))
      : filteredApps

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
      app.pending_amount || 0,
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
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <BrandLoader />
      </div>
    )
  }

  const totalFinanceQueueAmount = financeQueueApps.reduce((acc, a) => acc + (Number(a.pending_amount) || 0), 0)
  const totalDualApprovalAmount = pendingDualApprovalApps.reduce((acc, a) => acc + (Number(a.form_data?.payment_initiation?.prepared_amount || a.pending_amount) || 0), 0)

  return (
    <div className="space-y-6">
      <SetAdminHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-md">
            <IndianRupee className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Finance Payout Desk</h1>
            <p className="text-xs text-slate-400">Maker-Checker Dual Approval & Bulk NEFT Payout System</p>
          </div>
        </div>
      </SetAdminHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ready for Finance Payout</p>
            <p className="text-2xl font-black text-emerald-400">₹{totalFinanceQueueAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{financeQueueApps.length} Verified Applications</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Awaiting 2nd Admin Approval</p>
            <p className="text-2xl font-black text-amber-400">₹{totalDualApprovalAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{pendingDualApprovalApps.length} Approvals Pending</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-lg flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selected Batch Value</p>
            <p className="text-2xl font-black text-indigo-400">₹{selectedTotalAmount.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{selectedIds.length} Payees Selected</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Building className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-3 rounded-2xl border border-white/10 backdrop-blur-xl">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => { setActiveTab('finance_queue'); setSelectedIds([]) }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'finance_queue'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            Finance Payout Queue ({financeQueueApps.length})
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('dual_approval'); setSelectedIds([]) }}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'dual_approval'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Dual-Approval Queue ({pendingDualApprovalApps.length})
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search payee, bank, A/C..."
              className="bg-slate-950/60 border-white/10 text-white pl-9 h-10 text-xs rounded-xl focus:ring-indigo-500"
            />
          </div>

          <Button
            type="button"
            onClick={handleExportNEFT}
            className="h-10 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-white/10 text-xs font-bold cursor-pointer flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Export NEFT CSV
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
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs cursor-pointer shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Send className="h-4 w-4" />
              Bulk Disburse ({selectedIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-3xl border border-white/10 bg-slate-900/60 backdrop-blur-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-white/10">
              <tr>
                {activeTab === 'finance_queue' && (
                  <th className="p-4 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                    >
                      {selectedIds.length > 0 && selectedIds.length === filteredApps.length ? (
                        <CheckSquare className="h-4 w-4 text-emerald-400" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                )}
                <th className="p-4">Payee & Influencer</th>
                <th className="p-4">Campaign</th>
                <th className="p-4">Bank A/C & IFSC</th>
                <th className="p-4 text-right">Payable Amount</th>
                <th className="p-4 text-center">Maker-Checker Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredApps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-500">
                    No applications currently matching this finance filter.
                  </td>
                </tr>
              ) : (
                filteredApps.map((app) => {
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
                        <td className="p-4">
                          <button
                            type="button"
                            onClick={() => toggleSelect(app.id)}
                            className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      )}

                      <td className="p-4">
                        <div className="font-bold text-white text-sm">{payeeName}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span>{app.users?.influencer_id}</span>
                          {app.users?.instagram_username && (
                            <span className="text-pink-400 font-semibold">@{app.users.instagram_username}</span>
                          )}
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-semibold text-slate-200">{app.campaigns?.brand_name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{app.campaigns?.campaign_code}</div>
                      </td>

                      <td className="p-4">
                        {app.users?.account_number ? (
                          <div className="space-y-0.5 font-mono">
                            <div className="text-slate-200 font-bold tracking-wider">
                              {app.users.account_number}
                            </div>
                            <div className="text-[10px] text-indigo-400 uppercase font-semibold">
                              IFSC: {app.users.ifsc_code}
                            </div>
                          </div>
                        ) : (
                          <span className="text-red-400 italic text-[11px]">Bank details missing</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        <div className="text-base font-extrabold text-emerald-400">
                          ₹{Number(app.pending_amount || 0).toLocaleString()}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Total: ₹{((app.partial_payment || 0) + (app.pending_amount || 0)).toLocaleString()}
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        {init?.status === 'approved_for_finance' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 inline-flex items-center gap-1">
                            <UserCheck className="h-3 w-3" />
                            Approved by 2 Admins
                          </span>
                        ) : init?.status === 'pending_second_approval' ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/25 inline-flex items-center gap-1">
                            <Clock className="h-3 w-3 animate-pulse" />
                            Awaiting 2nd Admin
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                            {app.status}
                          </span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        {activeTab === 'dual_approval' ? (
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleDualApprove(app.id)}
                            disabled={approvingId === app.id}
                            className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-md"
                          >
                            {approvingId === app.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                                Approve for Finance
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
                            className="h-8 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs cursor-pointer shadow-md"
                          >
                            <Send className="h-3.5 w-3.5 mr-1" />
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
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Bank UTR / Transaction Reference Number <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    value={utrNumber}
                    onChange={(e) => setUtrNumber(e.target.value)}
                    placeholder="e.g. HDFCN26082300129"
                    className="bg-slate-950/60 border-white/10 text-white font-mono h-11 text-xs rounded-xl focus:ring-emerald-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Batch / Run ID (Optional)
                  </label>
                  <Input
                    type="text"
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    placeholder={`BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-01`}
                    className="bg-slate-950/60 border-white/10 text-white font-mono h-11 text-xs rounded-xl focus:ring-emerald-500"
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
