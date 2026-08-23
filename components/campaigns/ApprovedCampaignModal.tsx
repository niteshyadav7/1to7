'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, MessageCircle, FileText, CreditCard, PieChart, AlertCircle, Tag, CheckCircle2, Loader2, IndianRupee, Info, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import PaymentFormModal from './PaymentFormModal'

interface Application {
  id: string
  status: string
  partial_payment: number
  final_payment: number
  pending_amount: number
  created_at: string
  updated_at: string
  campaigns: {
    id: string
    brand_name: string
    campaign_code: string
    platform: string
    deliverables: string
    payment_form_fields?: any[]
  }
  form_data?: any
}

interface ApprovedCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
  application: Application | null
}

export default function ApprovedCampaignModal({ isOpen, onClose, onRefresh, application }: ApprovedCampaignModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [showPaymentForm, setShowPaymentForm] = React.useState(false)
  const [showProfileAlert, setShowProfileAlert] = React.useState(false)
  const [showPartialModal, setShowPartialModal] = React.useState(false)
  const [submittingPartial, setSubmittingPartial] = React.useState(false)
  const [partialAmount, setPartialAmount] = React.useState('')
  const [partialReason, setPartialReason] = React.useState('')
  // Appeal state
  const [showAppealModal, setShowAppealModal] = React.useState(false)
  const [submittingAppeal, setSubmittingAppeal] = React.useState(false)
  const [appealReason, setAppealReason] = React.useState('')
  const [appealScreenshot, setAppealScreenshot] = React.useState('')
  const [uploadingAppealImg, setUploadingAppealImg] = React.useState(false)

  const allAppeals = React.useMemo(() => {
    const reqs = application?.form_data?.requests || []
    return reqs
      .filter((r: any) => r.type === 'appeal')
      .sort((a: any, b: any) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime())
  }, [application])

  const activePendingAppeal = allAppeals.find((r: any) => r.status === 'pending')

  // Reset form when modal opens
  React.useEffect(() => {
    if (showPartialModal && application) {
      setPartialAmount(String(application.pending_amount || ''))
      setPartialReason('')
    }
  }, [showPartialModal, application])

  const handlePartialSubmit = async () => {
    if (!application) return
    const amt = parseFloat(partialAmount) || 0
    if (amt <= 0) {
      toast.error('Please enter a valid amount')
      return
    }
    if (balance > 0 && amt > balance) {
      toast.error(`Amount cannot exceed the current balance (₹${balance.toLocaleString()})`)
      return
    }
    setSubmittingPartial(true)
    try {
      const res = await fetch(`/api/dashboard/applications/${application.id}/request`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'partial',
          amount: amt,
          reason: partialReason || `Partial payment release request for ${application.campaigns?.brand_name || 'campaign'}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Partial payment request submitted! Admin will review.')
      setShowPartialModal(false)
      onRefresh?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit request')
    } finally {
      setSubmittingPartial(false)
    }
  }

  const handleAppealImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAppealImg(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setAppealScreenshot(data.url)
      toast.success('Screenshot uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload')
    } finally {
      setUploadingAppealImg(false)
    }
  }

  const handleAppealSubmit = async () => {
    if (!application) return
    if (!appealReason.trim()) {
      toast.error('Please enter an appeal reason')
      return
    }
    if (activePendingAppeal) {
      toast.error('You already have an active appeal under review. Please wait for Finance to resolve it.')
      return
    }
    setSubmittingAppeal(true)
    try {
      const res = await fetch(`/api/dashboard/applications/${application.id}/request`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'appeal',
          amount: 0,
          reason: appealReason.trim(),
          screenshot: appealScreenshot || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit appeal')
      toast.success('Appeal submitted directly to Finance Team! They will review and resolve it.')
      setShowAppealModal(false)
      setAppealReason('')
      setAppealScreenshot('')
      onRefresh?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit appeal')
    } finally {
      setSubmittingAppeal(false)
    }
  }

  // We handle rendering conditionally inside the render method instead of returning null
  // so that AnimatePresence can track exit animations properly.

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10'
      case 'Payment Requested': return 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10'
      case 'Payment Initiated': return 'text-blue-400 border-blue-500/20 bg-blue-500/10'
      case 'Completed': return 'text-purple-400 border-purple-500/20 bg-purple-500/10'
      default: return 'text-slate-400 border-white/10 bg-white/5'
    }
  }

  const totalAmount = application?.form_data?.total_deal
    ? Number(application.form_data.total_deal)
    : ((application?.partial_payment || 0) + (application?.final_payment || 0) + (application?.pending_amount || 0))

  const received = (application?.partial_payment || 0) + (application?.final_payment || 0)

  // Only show balance if they have submitted the payment form
  const hasRequested = !!application?.form_data?.payment_request;
  const balance = hasRequested ? (application?.pending_amount || 0) : 0;

  return (
    <>
      <AnimatePresence>
        {isOpen && application && (
          <div key="approved-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900"
            >
              {/* Header */}
              <div className="bg-slate-50 p-4 sm:p-6 pb-6 sm:pb-8 relative shrink-0 border-b border-slate-200/80">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1.5">Campaign ID</p>
                <h2 className="text-2xl font-extrabold text-slate-900 mb-2">{application.campaigns?.campaign_code || application.id.split('-')[0].toUpperCase()}</h2>
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
                  <Tag className="h-4 w-4 text-amber-500" />
                  {application.campaigns?.brand_name}
                </div>
              </div>

              <div className="p-4 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto max-h-[85vh]">
                {/* Status & Date Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Status</p>
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getStatusColor(application.status)}`}>
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-semibold">{application.status}</span>
                    </div>
                  </div>
                  <div className="sm:text-right space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Date</p>
                    <p className="text-sm font-semibold text-slate-900">
                      {new Date(application.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Financial Summary */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <PieChart className="h-5 w-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">Financial Summary</h3>
                  </div>
                  <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 grid grid-cols-3 gap-4 shadow-sm">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Amount</p>
                      <p className="text-lg font-extrabold text-slate-900">₹{totalAmount.toLocaleString()}</p>
                    </div>
                    <div className="text-center border-l-2 border-r-2 border-slate-200">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Received</p>
                      <p className="text-lg font-extrabold text-emerald-600">₹{received.toLocaleString()}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Balance Due</p>
                      <p className="text-lg font-extrabold text-amber-600">₹{balance.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Available Actions */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <h3 className="text-sm font-bold text-slate-900">Available Actions</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {/* Show Submit Payment Form only when status is Approved (before submission) */}
                    {application?.status === 'Approved' ? (
                      <button
                        onClick={() => {
                          if (user?.account_name && user?.account_number && user?.ifsc_code) {
                            setShowPaymentForm(true)
                          } else {
                            setShowProfileAlert(true)
                          }
                        }}
                        className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-colors group cursor-pointer"
                      >
                        <CreditCard className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform mb-3" />
                        <span className="text-[11px] sm:text-xs font-bold text-amber-900 text-center">Submit Payment Form</span>
                      </button>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <CheckCircle2 className="h-6 w-6 text-emerald-600 mb-3" />
                        <span className="text-[11px] sm:text-xs font-bold text-emerald-800 text-center">
                          {application?.status === 'Payment Requested' ? 'Form Submitted' : 'Payment Processing'}
                        </span>
                      </div>
                    )}
                    {application?.status === 'Payment Initiated' && balance > 0 && (
                      <button
                        onClick={() => setShowPartialModal(true)}
                        className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200 transition-colors group cursor-pointer">
                        <PieChart className="h-6 w-6 text-cyan-600 group-hover:scale-110 transition-transform mb-3" />
                        <span className="text-[11px] sm:text-xs font-bold text-cyan-900 text-center">Partial Request</span>
                      </button>
                    )}
                    {/* Appeal Button / Status */}
                    {activePendingAppeal ? (
                      <button
                        onClick={() => setShowAppealModal(true)}
                        className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-300 transition-colors group cursor-pointer"
                        title="Your appeal is currently under review by Finance team"
                      >
                        <div className="relative mb-3">
                          <AlertCircle className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform" />
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                        </div>
                        <span className="text-[11px] sm:text-xs font-bold text-amber-900 text-center">Appeal In Review</span>
                        <span className="text-[9px] text-amber-700 font-semibold mt-0.5">Finance Resolving</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => { setShowAppealModal(true); setAppealReason(''); setAppealScreenshot('') }}
                        className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 transition-colors group cursor-pointer"
                      >
                        <AlertCircle className="h-6 w-6 text-red-600 group-hover:scale-110 transition-transform mb-3" />
                        <span className="text-[11px] sm:text-xs font-bold text-red-900 text-center">Raise Appeal</span>
                        {allAppeals.length > 0 && (
                          <span className="text-[9px] text-red-700 font-semibold mt-0.5">{allAppeals.length} Past Appeal{allAppeals.length > 1 ? 's' : ''}</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Form Modal */}
      <PaymentFormModal
        isOpen={showPaymentForm}
        onClose={() => setShowPaymentForm(false)}
        onSuccess={onRefresh}
        application={application}
      />

      {/* Partial Request Modal */}
      <AnimatePresence>
        {showPartialModal && application && (
          <div key="partial-request-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !submittingPartial && setShowPartialModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden text-slate-900"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200/80 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-md">
                      <PieChart className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Request Partial Payment</h3>
                      <p className="text-[11px] text-slate-500">Campaign: <span className="text-cyan-700 font-semibold">{application.campaigns?.brand_name}</span></p>
                    </div>
                  </div>
                  <button onClick={() => !submittingPartial && setShowPartialModal(false)} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Current Financials */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Total Deal</p>
                    <p className="text-sm font-bold text-slate-900">₹{totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="border-l border-r border-slate-200">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Received</p>
                    <p className="text-sm font-bold text-emerald-600">₹{received.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Balance</p>
                    <p className="text-sm font-bold text-amber-600">₹{balance.toLocaleString()}</p>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5 block">Request Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      value={partialAmount}
                      onChange={e => setPartialAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-semibold rounded-xl px-3 py-3 pl-7 focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5 block">Reason (optional)</label>
                  <textarea
                    value={partialReason}
                    onChange={e => setPartialReason(e.target.value)}
                    placeholder="Why do you need a partial release?"
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none transition-all placeholder:text-slate-400"
                  />
                </div>

                {/* Info Banner */}
                <div className="flex items-start gap-2.5 bg-cyan-50 border border-cyan-200 rounded-xl p-3">
                  <Info className="h-4 w-4 text-cyan-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-600 leading-relaxed">Your request will be reviewed by the admin team. You&apos;ll receive the payment once it&apos;s approved and processed.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-slate-200/80 bg-slate-50 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => !submittingPartial && setShowPartialModal(false)}
                  disabled={submittingPartial}
                  className="flex-1 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-200/60 bg-white cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePartialSubmit}
                  disabled={submittingPartial || !partialAmount}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 border-none cursor-pointer disabled:opacity-50"
                >
                  {submittingPartial ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><IndianRupee className="mr-1.5 h-4 w-4" /> Submit Request</>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Appeal Modal */}
      <AnimatePresence>
        {showAppealModal && application && (
          <div key="appeal-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => !submittingAppeal && setShowAppealModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden text-slate-900 flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-md ${activePendingAppeal ? 'bg-amber-600' : 'bg-red-600'}`}>
                    <AlertCircle className="h-4.5 w-4.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {activePendingAppeal ? 'Active Appeal In Review' : 'Raise Payment Appeal'}
                    </h3>
                    <p className="text-[11px] text-slate-500">Direct Finance Resolution Center</p>
                  </div>
                </div>
                <button onClick={() => !submittingAppeal && setShowAppealModal(false)} className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* Active Pending Appeal Notice */}
                {activePendingAppeal ? (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                        Under Finance Review
                      </span>
                      <span className="text-[11px] text-amber-800 font-semibold">
                        {activePendingAppeal.submitted_at ? new Date(activePendingAppeal.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'Recently Submitted'}
                      </span>
                    </div>
                    <div>
                      <p className="text-[10px] text-amber-800 uppercase font-bold">Your Appeal Reason</p>
                      <p className="text-xs text-amber-950 font-medium mt-0.5 leading-relaxed bg-white/70 p-2.5 rounded-lg border border-amber-200/60">
                        {activePendingAppeal.reason}
                      </p>
                    </div>
                    {activePendingAppeal.screenshot && (
                      <div>
                        <p className="text-[10px] text-amber-800 uppercase font-bold mb-1">Attached Proof</p>
                        <a href={activePendingAppeal.screenshot} target="_blank" rel="noopener noreferrer" className="inline-block relative rounded-lg border border-amber-200 overflow-hidden group">
                          <img src={activePendingAppeal.screenshot} alt="Proof" className="h-20 w-36 object-cover" />
                        </a>
                      </div>
                    )}
                    <p className="text-[11px] text-amber-800 bg-amber-100/70 p-2 rounded-lg leading-snug">
                      ℹ️ Our Finance team has received your ticket and is verifying your payout details. You can submit another appeal once this active ticket is closed.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Campaign Info */}
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5 block">Campaign Code</label>
                      <input
                        type="text"
                        value={application.campaigns?.campaign_code || application.id.split('-')[0].toUpperCase()}
                        readOnly
                        className="w-full bg-slate-100 border border-slate-200 text-slate-700 text-sm rounded-xl px-3 py-2.5 cursor-not-allowed font-mono"
                      />
                    </div>

                    {/* Appeal Reason */}
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5 block">
                        Appeal Reason / Issue Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={appealReason}
                        onChange={e => setAppealReason(e.target.value)}
                        placeholder="Please describe why you are appealing (e.g. incorrect amount, payment delayed, UTR not received)..."
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none placeholder:text-slate-400"
                      />
                    </div>

                    {/* Screenshot Upload */}
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5 block">Proof Screenshot (Optional)</label>
                      {appealScreenshot ? (
                        <div className="relative rounded-xl border border-slate-200 overflow-hidden bg-slate-100 aspect-[3/1] flex items-center justify-center">
                          <img src={appealScreenshot} alt="Appeal proof" className="max-w-full max-h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setAppealScreenshot('')}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500 transition-colors cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="relative flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-slate-300 hover:border-red-500 bg-slate-50 hover:bg-red-500/5 transition-all cursor-pointer group">
                          {uploadingAppealImg ? (
                            <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
                          ) : (
                            <>
                              <UploadCloud className="h-6 w-6 text-red-500 group-hover:text-red-600 mb-1 transition-colors" />
                              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Upload Screenshot / Statement</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingAppealImg}
                            onChange={handleAppealImageUpload}
                          />
                        </label>
                      )}
                    </div>
                  </>
                )}

                {/* Appeal History Timeline */}
                {allAppeals.length > 0 && (
                  <div className="pt-3 border-t border-slate-200">
                    <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center justify-between">
                      <span>Appeal History ({allAppeals.length})</span>
                      <span className="text-[10px] text-slate-500 font-semibold">Chronological</span>
                    </h4>
                    <div className="space-y-3">
                      {allAppeals.map((appeal: any, idx: number) => {
                        const isPending = appeal.status === 'pending'
                        const isResolved = appeal.status === 'resolved'
                        return (
                          <div key={appeal.id || idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                isPending
                                  ? 'bg-amber-500/15 text-amber-800 border-amber-300'
                                  : isResolved
                                  ? 'bg-emerald-500/15 text-emerald-800 border-emerald-300'
                                  : 'bg-red-500/15 text-red-800 border-red-300'
                              }`}>
                                {isPending ? '🟡 In Review' : isResolved ? '🟢 Resolved / Settled' : '🔴 Rejected'}
                              </span>
                              <span className="text-[10px] text-slate-500 font-medium">
                                📅 {appeal.submitted_at ? new Date(appeal.submitted_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : '—'}
                              </span>
                            </div>

                            <p className="text-slate-800 font-medium leading-snug break-words">
                              {appeal.reason}
                            </p>

                            {appeal.admin_note && (
                              <div className="p-2 rounded-lg bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-900">
                                <span className="font-bold">💼 Finance Note: </span>
                                {appeal.admin_note}
                                {appeal.resolved_at && (
                                  <span className="block text-[10px] text-indigo-600 mt-0.5">
                                    Resolved on {new Date(appeal.resolved_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })}
                                  </span>
                                )}
                              </div>
                            )}

                            {appeal.screenshot && (
                              <div className="pt-1">
                                <a href={appeal.screenshot} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1">
                                  🖼️ View Submitted Screenshot
                                </a>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-slate-200/80 bg-slate-50 flex gap-3 shrink-0">
                <Button
                  variant="outline"
                  onClick={() => !submittingAppeal && setShowAppealModal(false)}
                  disabled={submittingAppeal}
                  className="flex-1 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-200/60 bg-white cursor-pointer"
                >
                  Close
                </Button>
                {!activePendingAppeal && (
                  <Button
                    onClick={handleAppealSubmit}
                    disabled={submittingAppeal || !appealReason.trim()}
                    className="flex-[2] rounded-xl bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold shadow-md shadow-red-500/20 border-none cursor-pointer disabled:opacity-50"
                  >
                    {submittingAppeal ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting to Finance...</>
                    ) : (
                      <><AlertCircle className="mr-1.5 h-4 w-4" /> Submit Appeal to Finance</>
                    )}
                  </Button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Profile Alert Modal */}
      <AnimatePresence>
        {showProfileAlert && (
          <div key="profile-alert-modal" className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => setShowProfileAlert(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white border border-slate-200/80 rounded-2xl shadow-2xl overflow-hidden text-center p-6 text-slate-900"
            >
              <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4 border border-amber-200">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Complete Bank Details</h3>
              <p className="text-sm text-slate-600 mb-6">
                To submit a payment request, you must first complete your banking and payout details in your creator profile.
              </p>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowProfileAlert(false)}
                  className="flex-1 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-100 bg-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    setShowProfileAlert(false)
                    onClose()
                    router.push('/dashboard/profile')
                  }}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 border-none cursor-pointer"
                >
                  Update Profile
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
