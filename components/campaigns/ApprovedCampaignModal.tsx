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
  }
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
      if (!res.ok) throw new Error(data.error || 'Failed')
      toast.success('Appeal submitted successfully! Admin will review.')
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

  const totalAmount = (application?.partial_payment || 0) + (application?.final_payment || 0) + (application?.pending_amount || 0)
  const received = (application?.partial_payment || 0) + (application?.final_payment || 0)
  const balance = application?.pending_amount || 0

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
          className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-slate-950/50 p-6 pb-8 relative shrink-0 border-b border-white/5">
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Campaign ID</p>
            <h2 className="text-2xl font-bold text-white mb-2">{application.campaigns?.campaign_code || application.id.split('-')[0].toUpperCase()}</h2>
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-300">
              <Tag className="h-4 w-4" />
              {application.campaigns?.brand_name}
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6 sm:space-y-8 overflow-y-auto max-h-[85vh]">
            {/* Status & Date Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Status</p>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border ${getStatusColor(application.status)}`}>
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-semibold">{application.status}</span>
                </div>
              </div>
              <div className="sm:text-right space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Date</p>
                <p className="text-sm font-semibold text-white">
                  {new Date(application.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
            {/* Financial Summary */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-5 w-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Financial Summary</h3>
              </div>
              <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-5 grid grid-cols-3 gap-4 shadow-sm">
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Amount</p>
                  <p className="text-lg font-bold text-white">₹{totalAmount.toLocaleString()}</p>
                </div>
                <div className="text-center border-l-2 border-r-2 border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Received</p>
                  <p className="text-lg font-bold text-emerald-400">₹{received.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Balance Due</p>
                  <p className="text-lg font-bold text-amber-400">₹{balance.toLocaleString()}</p>
                </div>
              </div>
            </div>
            {/* Available Actions */}
            <div>
               <div className="flex items-center gap-2 mb-4">
                <AlertCircle className="h-5 w-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Available Actions</h3>
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
                    className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors group cursor-pointer"
                  >
                    <CreditCard className="h-6 w-6 text-indigo-400 group-hover:scale-110 transition-transform mb-3" />
                    <span className="text-[11px] sm:text-xs font-bold text-indigo-300 text-center">Submit Payment Form</span>
                  </button>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-emerald-500/5 border border-emerald-500/15">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 mb-3" />
                    <span className="text-[11px] sm:text-xs font-bold text-emerald-300 text-center">
                      {application?.status === 'Payment Requested' ? 'Form Submitted' : 'Payment Processing'}
                    </span>
                  </div>
                )}
                {application?.status === 'Payment Initiated' && balance > 0 && (
                  <button 
                    onClick={() => setShowPartialModal(true)}
                    className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors group cursor-pointer">
                    <PieChart className="h-6 w-6 text-cyan-400 group-hover:scale-110 transition-transform mb-3" />
                    <span className="text-[11px] sm:text-xs font-bold text-cyan-300 text-center">Partial Request</span>
                  </button>
                )}
                <button onClick={() => { setShowAppealModal(true); setAppealReason(''); setAppealScreenshot('') }} className="flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-colors group cursor-pointer">
                  <AlertCircle className="h-6 w-6 text-red-400 group-hover:scale-110 transition-transform mb-3" />
                  <span className="text-[11px] sm:text-xs font-bold text-red-300 text-center">Raise Appeal</span>
                </button>
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => !submittingPartial && setShowPartialModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-600 to-teal-500 shadow-lg shadow-cyan-500/20">
                      <PieChart className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Request Partial Payment</h3>
                      <p className="text-[11px] text-slate-500">Campaign: <span className="text-cyan-400 font-semibold">{application.campaigns?.brand_name}</span></p>
                    </div>
                  </div>
                  <button onClick={() => !submittingPartial && setShowPartialModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {/* Current Financials */}
                <div className="bg-slate-800/50 border border-white/5 rounded-xl p-4 grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Total Deal</p>
                    <p className="text-sm font-bold text-white">₹{totalAmount.toLocaleString()}</p>
                  </div>
                  <div className="border-l border-r border-white/5">
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Received</p>
                    <p className="text-sm font-bold text-emerald-400">₹{received.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Balance</p>
                    <p className="text-sm font-bold text-amber-400">₹{balance.toLocaleString()}</p>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Request Amount *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">₹</span>
                    <input
                      type="number"
                      value={partialAmount}
                      onChange={e => setPartialAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full bg-slate-800 border border-white/10 text-white text-sm font-semibold rounded-xl px-3 py-3 pl-7 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Reason (optional)</label>
                  <textarea
                    value={partialReason}
                    onChange={e => setPartialReason(e.target.value)}
                    placeholder="Why do you need a partial release?"
                    rows={2}
                    className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500/50 resize-none transition-all placeholder:text-slate-600"
                  />
                </div>

                {/* Info Banner */}
                <div className="flex items-start gap-2.5 bg-cyan-500/5 border border-cyan-500/15 rounded-xl p-3">
                  <Info className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-slate-400 leading-relaxed">Your request will be reviewed by the admin team. You&apos;ll receive the payment once it&apos;s approved and processed.</p>
                </div>
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-white/5 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => !submittingPartial && setShowPartialModal(false)}
                  disabled={submittingPartial}
                  className="flex-1 rounded-xl border-white/10 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePartialSubmit}
                  disabled={submittingPartial || !partialAmount}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-white font-bold shadow-lg shadow-cyan-500/20 border-none cursor-pointer disabled:opacity-50"
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => !submittingAppeal && setShowAppealModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-red-600 to-orange-500 shadow-lg shadow-red-500/20">
                      <AlertCircle className="h-4.5 w-4.5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">Raise an Appeal</h3>
                      <p className="text-[11px] text-slate-500">Use this form if you have issues with payment rejection or verification.</p>
                    </div>
                  </div>
                  <button onClick={() => !submittingAppeal && setShowAppealModal(false)} className="p-1.5 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white cursor-pointer">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Campaign ID */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Campaign ID</label>
                  <input
                    type="text"
                    value={application.campaigns?.campaign_code || application.id.split('-')[0].toUpperCase()}
                    readOnly
                    className="w-full bg-slate-800 border border-white/10 text-slate-300 text-sm rounded-xl px-3 py-3 cursor-not-allowed opacity-80"
                  />
                </div>

                {/* Appeal Reason */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Appeal Reason <span className="text-red-500">*</span></label>
                  <textarea
                    value={appealReason}
                    onChange={e => setAppealReason(e.target.value)}
                    placeholder="Please describe why you are appealing..."
                    rows={4}
                    className="w-full bg-slate-800 border border-white/10 text-white text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500/50 resize-none placeholder:text-slate-600"
                  />
                </div>

                {/* Screenshot Upload */}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1.5 block">Screenshot (Optional)</label>
                  {appealScreenshot ? (
                    <div className="relative rounded-xl border border-white/10 overflow-hidden bg-slate-950 aspect-[3/1] flex items-center justify-center">
                      <img src={appealScreenshot} alt="Appeal proof" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setAppealScreenshot('')}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="relative flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-red-500 bg-slate-950/50 hover:bg-red-500/5 transition-all cursor-pointer group">
                      {uploadingAppealImg ? (
                        <Loader2 className="h-6 w-6 text-red-500 animate-spin" />
                      ) : (
                        <>
                          <UploadCloud className="h-6 w-6 text-red-500 group-hover:text-red-400 mb-1 transition-colors" />
                          <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Upload Proof</span>
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
              </div>

              {/* Actions */}
              <div className="p-5 border-t border-white/5 flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => !submittingAppeal && setShowAppealModal(false)}
                  disabled={submittingAppeal}
                  className="flex-1 rounded-xl border-white/10 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAppealSubmit}
                  disabled={submittingAppeal || !appealReason.trim()}
                  className="flex-[2] rounded-xl bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-400 hover:to-orange-400 text-white font-bold shadow-lg shadow-red-500/20 border-none cursor-pointer disabled:opacity-50"
                >
                  {submittingAppeal ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                  ) : (
                    <><AlertCircle className="mr-1.5 h-4 w-4" /> Submit Appeal</>
                  )}
                </Button>
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
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              onClick={() => setShowProfileAlert(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-center p-6"
            >
               <div className="mx-auto w-12 h-12 bg-amber-500/10 text-amber-400 rounded-full flex items-center justify-center mb-4 border border-amber-500/20">
                 <AlertCircle className="h-6 w-6" />
               </div>
               <h3 className="text-lg font-bold text-white mb-2">Complete Bank Details</h3>
               <p className="text-sm text-slate-400 mb-6">
                 To submit a payment request, you must first complete your banking and payout details in your creator profile.
               </p>
               <div className="flex gap-3">
                 <Button
                   variant="outline"
                   onClick={() => setShowProfileAlert(false)}
                   className="flex-1 rounded-xl border-white/10 text-slate-400 hover:text-white"
                 >
                   Cancel
                 </Button>
                 <Button
                   onClick={() => {
                     setShowProfileAlert(false)
                     onClose()
                     router.push('/dashboard/profile')
                   }}
                   className="flex-[2] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
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
