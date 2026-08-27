'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  FileText,
  CreditCard,
  PieChart,
  AlertCircle,
  Tag,
  CheckCircle2,
  Loader2,
  IndianRupee,
  Info,
  UploadCloud,
  ExternalLink,
  Calendar,
  Clock,
  Sparkles,
  Link2,
  Eye,
  Check,
  Building,
  Store,
  Instagram,
  User,
  MapPin,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  ClipboardList,
  ShoppingBag,
  Gift,
  Users,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import PaymentFormModal from './PaymentFormModal'
import { getApplicationCommercialAmount, isPaidCollaboration } from '@/lib/utils/commercial-utils'
import { checkLiveDateMaturation } from '@/lib/utils/completion-timeline-utils'

interface Application {
  id: string
  status: string
  partial_payment: number
  final_payment: number
  pending_amount: number
  created_at: string
  updated_at: string
  completion_submitted_at?: string | null
  commercial_amount?: number | null
  selected_store?: any
  campaigns: {
    id: string
    brand_name: string
    campaign_code: string
    platform: string
    category?: string
    deliverables: string
    budget_type?: string
    budget_amount?: number | null
    commercial_amount?: number | null
    requirements?: string | null
    looking_for?: string | null
    additional_info?: string | null
    collab_date?: string | null
    product_links?: string[] | null
    brief_document_url?: string | null
    location?: string | null
    location_type?: string | null
    target_states?: string[] | null
    target_cities?: string[] | null
    store_locations?: any[] | null
    completion_days?: number | null
    completion_deadline?: string | null
    enforce_completion_deadline?: boolean
    payment_form_fields?: any[]
    custom_fields?: any[]
    form_fields?: any[]
  }
  form_data?: any
}

interface ApprovedCampaignModalProps {
  isOpen: boolean
  onClose: () => void
  onRefresh?: () => void
  application: Application | null
}

type ModalTab = 'details' | 'completion' | 'payout'

export default function ApprovedCampaignModal({
  isOpen,
  onClose,
  onRefresh,
  application,
}: ApprovedCampaignModalProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<ModalTab>('details')

  // Completion Form State
  const [liveDate, setLiveDate] = useState('')
  const [deliverableLink, setDeliverableLink] = useState('')
  const [viewsCount, setViewsCount] = useState('')
  const [completionNotes, setCompletionNotes] = useState('')
  const [proofUrl, setProofUrl] = useState('')
  const [uploadingProof, setUploadingProof] = useState(false)
  const [submittingCompletion, setSubmittingCompletion] = useState(false)

  // Payment Form & Partial & Appeal State
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [showProfileAlert, setShowProfileAlert] = useState(false)
  const [showPartialModal, setShowPartialModal] = useState(false)
  const [submittingPartial, setSubmittingPartial] = useState(false)
  const [partialAmount, setPartialAmount] = useState('')
  const [partialReason, setPartialReason] = useState('')

  const [showAppealModal, setShowAppealModal] = useState(false)
  const [submittingAppeal, setSubmittingAppeal] = useState(false)
  const [appealReason, setAppealReason] = useState('')
  const [appealScreenshot, setAppealScreenshot] = useState('')
  const [uploadingAppealImg, setUploadingAppealImg] = useState(false)

  // Populate existing completion data if submitted previously
  useEffect(() => {
    if (application?.form_data?.completion_submission) {
      const sub = application.form_data.completion_submission
      setLiveDate(sub.live_date || '')
      setDeliverableLink(sub.deliverable_link || '')
      setViewsCount(sub.views_count || '')
      setCompletionNotes(sub.notes || '')
      setProofUrl(sub.supporting_document || '')
    } else if (application?.form_data?.payment_request?.live_date) {
      setLiveDate(application.form_data.payment_request.live_date)
      setProofUrl(application.form_data.payment_request.supporting_document || '')
    }
  }, [application])

  const totalAmount = useMemo(() => getApplicationCommercialAmount(application), [application])
  const isPaid = useMemo(() => isPaidCollaboration(application), [application])
  const received = (application?.partial_payment || 0) + (application?.final_payment || 0)
  const hasRequested = Boolean(application?.form_data?.payment_request)
  const balance = hasRequested ? (application?.pending_amount || 0) : totalAmount - received

  // 7-day maturation check
  const maturation = useMemo(() => {
    return checkLiveDateMaturation(liveDate, 7)
  }, [liveDate])

  const isCompletionSubmitted = Boolean(
    application?.completion_submitted_at || application?.form_data?.completion_submission
  )

  const allAppeals = useMemo(() => {
    const reqs = application?.form_data?.requests || []
    return reqs
      .filter((r: any) => r.type === 'appeal')
      .sort((a: any, b: any) => new Date(b.submitted_at || 0).getTime() - new Date(a.submitted_at || 0).getTime())
  }, [application])

  const activePendingAppeal = allAppeals.find((r: any) => r.status === 'pending')

  // Reset partial form on open
  useEffect(() => {
    if (showPartialModal && application) {
      setPartialAmount(String(application.pending_amount || totalAmount - received || ''))
      setPartialReason('')
    }
  }, [showPartialModal, application, totalAmount, received])

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size exceeds 5MB limit')
      return
    }
    setUploadingProof(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setProofUrl(data.url)
      toast.success('Analytics screenshot uploaded')
    } catch (err: any) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploadingProof(false)
    }
  }

  const handleCompletionSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!application) return

    if (!liveDate) {
      toast.error('Please enter the date when your content went live')
      return
    }

    if (!maturation.canSubmit) {
      toast.error(maturation.message)
      return
    }

    if (!deliverableLink && !proofUrl) {
      toast.error('Please provide at least a live link or screenshot proof')
      return
    }

    setSubmittingCompletion(true)
    try {
      const res = await fetch(`/api/dashboard/applications/${application.id}/completion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          live_date: liveDate,
          deliverable_link: deliverableLink.trim(),
          supporting_document: proofUrl,
          views_count: viewsCount.trim(),
          notes: completionNotes.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      toast.success('Campaign deliverables submitted successfully! Admin will review.')
      onRefresh?.()
    } catch (err: any) {
      toast.error(err.message || 'Submission failed')
    } finally {
      setSubmittingCompletion(false)
    }
  }

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Active / Approved</span>
      case 'Payment Requested':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-amber-600" /> Payment Requested</span>
      case 'Payment Initiated':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5"><CreditCard className="h-3.5 w-3.5 text-blue-600" /> Payment In Progress</span>
      case 'Completed':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-purple-600" /> Completed</span>
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">{status}</span>
    }
  }

  return (
    <>
      <AnimatePresence>
        {isOpen && application && (
          <div key="approved-modal" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={onClose}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 max-h-[90vh]"
            >
              {/* Header */}
              <div className="bg-slate-50 p-5 sm:p-6 pb-4 relative shrink-0 border-b border-slate-200/80">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Campaign Code: <strong className="text-slate-900 font-mono">{application.campaigns?.campaign_code || application.id.split('-')[0].toUpperCase()}</strong>
                  </span>
                  {isPaid ? (
                    <span className="text-[9px] px-2 py-0.5 rounded font-black bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
                      Paid Campaign
                    </span>
                  ) : (
                    <span className="text-[9px] px-2 py-0.5 rounded font-black bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">
                      Barter / Product Collab
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                      <Tag className="h-5 w-5 text-amber-500" />
                      {application.campaigns?.brand_name}
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Deliverables: <span className="text-slate-800 font-semibold">{application.campaigns?.deliverables || 'Social Media Post / Reel'}</span>
                    </p>
                  </div>
                  <div>{getStatusBadge(application.status)}</div>
                </div>

                {/* 3 Distinct Modern Tabs */}
                <div className="flex gap-1 p-1 bg-slate-200/70 rounded-xl mt-4 border border-slate-300/60">
                  <button
                    type="button"
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'details'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ClipboardList className="h-3.5 w-3.5 text-indigo-600" />
                    Campaign Details
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('completion')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'completion'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Completion Form
                    {isCompletionSubmitted && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500" title="Deliverable Submitted" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('payout')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'payout'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5 text-amber-600" />
                    Payment & Payout
                    {isPaid && totalAmount > 0 && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-mono">
                        ₹{totalAmount.toLocaleString()}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Modal Body with Tab Contents */}
              <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">

                {/* ═══════════════════════════════════════════
                    TAB 1: CAMPAIGN DETAILS & OVERVIEW (DEFAULT)
                ═══════════════════════════════════════════ */}
                {activeTab === 'details' && (
                  <div className="space-y-4">
                    {/* 1. Quick Highlights Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1 shadow-2xs">
                        <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                          <Tag className="h-3 w-3 text-indigo-600" /> Deliverables
                        </p>
                        <p className="text-xs font-bold text-slate-900 line-clamp-2">
                          {application.campaigns?.deliverables || '1 Reel / Post'}
                        </p>
                      </div>

                      <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1 shadow-2xs">
                        <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                          <IndianRupee className="h-3 w-3 text-emerald-600" /> Deal Value
                        </p>
                        <p className="text-xs font-bold text-emerald-700">
                          {isPaid ? `₹${totalAmount.toLocaleString()}` : (application.campaigns?.budget_type || 'Barter Collab')}
                        </p>
                      </div>

                      <div className="p-3 bg-pink-50/70 border border-pink-100 rounded-xl space-y-1 shadow-2xs">
                        <p className="text-[10px] font-bold text-pink-900 uppercase tracking-wider flex items-center gap-1">
                          <Instagram className="h-3 w-3 text-pink-600" /> Platform & Niche
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {application.campaigns?.platform || 'Instagram'} {application.campaigns?.category ? `• ${application.campaigns.category}` : ''}
                        </p>
                      </div>

                      <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1 shadow-2xs">
                        <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                          <Clock className="h-3 w-3 text-amber-600" /> Timeline
                        </p>
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {application.campaigns?.collab_date 
                            ? application.campaigns.collab_date 
                            : (application.campaigns?.completion_days ? `${application.campaigns.completion_days} Days post-approval` : 'Standard timeline')}
                        </p>
                      </div>
                    </div>

                    {/* 2. Official Campaign Brief Document Banner (if attached) */}
                    {application.campaigns?.brief_document_url && (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-indigo-950/20">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center text-amber-300 shrink-0">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black uppercase tracking-wider text-white">
                              Official Brand Brief & Guidelines Document
                            </h4>
                            <p className="text-[11px] text-purple-200 mt-0.5">
                              Download or preview the official guidelines PDF provided by {application.campaigns?.brand_name}
                            </p>
                          </div>
                        </div>
                        <a
                          href={application.campaigns.brief_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white text-slate-950 hover:bg-slate-100 text-xs font-extrabold shadow-sm transition-all cursor-pointer shrink-0"
                        >
                          <FileText className="h-3.5 w-3.5 text-purple-700" />
                          Open Campaign Brief ↗
                        </a>
                      </div>
                    )}

                    {/* 3. Campaign Requirements, Instructions & Brief Details */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3.5">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            Campaign Guidelines & Instructions
                          </span>
                        </div>
                      </div>

                      {/* Requirements */}
                      {application.campaigns?.requirements && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            What You Need To Do (Deliverables & Shooting Guidelines)
                          </p>
                          <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                            {application.campaigns.requirements}
                          </div>
                        </div>
                      )}

                      {/* Looking For */}
                      {application.campaigns?.looking_for && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Target Creator Profile
                          </p>
                          <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-800 font-medium">
                            {application.campaigns.looking_for}
                          </div>
                        </div>
                      )}

                      {/* Additional Info / Do's & Don'ts */}
                      {application.campaigns?.additional_info && (
                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Important Notes & Guidelines
                          </p>
                          <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                            {application.campaigns.additional_info}
                          </div>
                        </div>
                      )}

                      {/* Product Links if available */}
                      {application.campaigns?.product_links && application.campaigns.product_links.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Featured Product Reference Links
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {application.campaigns.product_links.map((link: string, idx: number) => (
                              <a
                                key={idx}
                                href={link.startsWith('http') ? link : `https://${link}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:border-indigo-300 shadow-2xs transition-all"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Product Link #{idx + 1}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Location & Store Details */}
                      {(application.selected_store || application.campaigns?.location || application.campaigns?.target_states?.length || application.campaigns?.target_cities?.length) && (
                        <div className="space-y-2 pt-1">
                          {application.selected_store ? (
                            <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                              <p className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                <Store className="h-3.5 w-3.5" /> Selected Store Branch
                              </p>
                              <p className="text-xs font-bold text-purple-950">{application.selected_store.name}</p>
                              {application.selected_store.address && (
                                <p className="text-[11px] text-purple-800">{application.selected_store.address}</p>
                              )}
                            </div>
                          ) : (
                            <div className="p-3 bg-white rounded-xl border border-slate-200/70 space-y-1">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                <MapPin className="h-3 w-3 text-slate-500" /> Target Campaign Locations
                              </p>
                              <p className="text-xs font-semibold text-slate-800">
                                {[
                                  ...(application.campaigns?.target_states || []),
                                  ...(application.campaigns?.target_cities || []),
                                  application.campaigns?.location
                                ].filter(Boolean).join(', ') || 'All India / Open Location'}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 4. My Submitted Application Answers */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-indigo-600" />
                          <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                            My Submitted Application Answers
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium">
                          Applied: {new Date(application.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>

                      {/* Custom Form Responses */}
                      {application.form_data && Object.keys(application.form_data).length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                          {Object.entries(application.form_data).map(([key, val]) => {
                            if (['payment_request', 'completion_submission', 'requests', 'total_deal', 'rejection_reason', 'revocation_note', 'order_details', 'order_details_approved'].includes(key)) {
                              return null
                            }
                            return (
                              <div key={key} className="p-2.5 bg-white rounded-xl border border-slate-200/60 space-y-0.5 shadow-2xs">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                                  {key.replace(/_/g, ' ')}
                                </p>
                                <p className="text-xs font-semibold text-slate-800 break-words">
                                  {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val) || '—'}
                                </p>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No additional questionnaire was required for this campaign application.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* ═══════════════════════════════════════════
                    TAB 2: DELIVERABLES & COMPLETION FORM
                ═══════════════════════════════════════════ */}
                {activeTab === 'completion' && (
                  <div className="space-y-5">
                    {/* Gated Campaign Brief Document (Unlocked for Approved Profiles) */}
                    {application.campaigns?.brief_document_url && (
                      <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                            <Sparkles className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                                Official Campaign Brief & Guidelines
                              </h4>
                              <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-purple-100 text-purple-700 uppercase">
                                Unlocked
                              </span>
                            </div>
                            <p className="text-[11px] text-purple-800/80 mt-0.5">
                              Attached by brand for approved creators
                            </p>
                          </div>
                        </div>
                        <a
                          href={application.campaigns.brief_document_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          View Brief
                        </a>
                      </div>
                    )}

                    {/* Completion Status Alert if already submitted */}
                    {isCompletionSubmitted && (
                      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wider">Deliverables Submitted</h4>
                          <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                            Your campaign completion proof was submitted on{' '}
                            <strong>
                              {application.completion_submitted_at
                                ? new Date(application.completion_submitted_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                                : 'recently'}
                            </strong>
                            . You can update your links or screenshots below if needed.
                          </p>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleCompletionSubmit} className="space-y-4">
                      {/* Live Date Input */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Calendar className="h-4 w-4 text-indigo-600" />
                          Content Live Date <span className="text-red-500">*</span>
                        </label>
                        <Input
                          type="date"
                          value={liveDate}
                          onChange={(e) => setLiveDate(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                          className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl focus:ring-indigo-500"
                          required
                        />
                        <p className="text-[11px] text-slate-500">
                          Select the date your Reel / Post / Video went live on social media.
                        </p>
                      </div>

                      {/* 7-Day Live Date Maturation Card */}
                      {liveDate && (
                        <div>
                          {!maturation.canSubmit ? (
                            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5">
                              <Clock className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                              <div>
                                <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                                  Analytics Maturation in Progress
                                </h5>
                                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                                  {maturation.message}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                              <div>
                                <h5 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                                  7-Day Maturation Complete
                                </h5>
                                <p className="text-xs text-emerald-800 mt-0.5 leading-relaxed">
                                  {maturation.message}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Deliverable Live Link */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Link2 className="h-4 w-4 text-indigo-600" />
                          Live Content Link (Instagram Reel / Post / YouTube URL)
                        </label>
                        <Input
                          type="url"
                          value={deliverableLink}
                          onChange={(e) => setDeliverableLink(e.target.value)}
                          placeholder="https://www.instagram.com/reel/..."
                          className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl focus:ring-indigo-500 font-mono text-xs"
                        />
                      </div>

                      {/* Views / Reach Achieved */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Eye className="h-4 w-4 text-indigo-600" />
                          Total Views / Reach Achieved (Approx.)
                        </label>
                        <Input
                          type="text"
                          value={viewsCount}
                          onChange={(e) => setViewsCount(e.target.value)}
                          placeholder="e.g. 25,000 Views"
                          className="bg-slate-50 border-slate-200 text-slate-900 h-12 rounded-xl focus:ring-indigo-500"
                        />
                      </div>

                      {/* Analytics Screenshot Upload */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <UploadCloud className="h-4 w-4 text-indigo-600" />
                          Insights & Analytics Screenshot Proof
                        </label>

                        {proofUrl ? (
                          <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 p-2 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <img src={proofUrl} alt="Proof" className="h-14 w-20 object-cover rounded-lg border border-slate-200" />
                              <div>
                                <p className="text-xs font-bold text-slate-800">Screenshot Attached</p>
                                <a href={proofUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1">
                                  <ExternalLink className="h-3 w-3" /> View full image
                                </a>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setProofUrl('')}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <label className="relative flex flex-col items-center justify-center w-full h-24 rounded-2xl border-2 border-dashed border-slate-300 hover:border-indigo-500 bg-slate-50 hover:bg-indigo-50/5 transition-all cursor-pointer group">
                            {uploadingProof ? (
                              <Loader2 className="h-6 w-6 text-indigo-600 animate-spin" />
                            ) : (
                              <>
                                <UploadCloud className="h-6 w-6 text-indigo-600 group-hover:scale-110 transition-transform mb-1" />
                                <span className="text-xs font-bold text-slate-700">Upload Analytics / Post Insights Proof</span>
                                <span className="text-[10px] text-slate-400">PNG, JPG, PDF up to 5MB</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingProof}
                              onChange={handleProofUpload}
                            />
                          </label>
                        )}
                      </div>

                      {/* Additional Notes */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700">Additional Remarks / Deliverable Notes</label>
                        <textarea
                          value={completionNotes}
                          onChange={(e) => setCompletionNotes(e.target.value)}
                          placeholder="Any specific comments, engagement highlights or notes for the brand team..."
                          rows={2}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-xs rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                        />
                      </div>

                      {/* Submit Button */}
                      <Button
                        type="submit"
                        disabled={submittingCompletion || !liveDate || !maturation.canSubmit}
                        className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50 mt-2"
                      >
                        {submittingCompletion ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting Deliverables...</>
                        ) : isCompletionSubmitted ? (
                          <><CheckCircle2 className="mr-2 h-4 w-4" /> Update Submitted Deliverables</>
                        ) : (
                          <><FileCheck className="mr-2 h-4 w-4" /> Submit Campaign Completion</>
                        )}
                      </Button>
                    </form>
                  </div>
                )}

                {/* ═══════════════════════════════════════════
                    TAB 2: PAYMENT & PAYOUT
                ═══════════════════════════════════════════ */}
                {activeTab === 'payout' && (
                  <div className="space-y-5">
                    {/* Financial Deal Card */}
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <IndianRupee className="h-4 w-4 text-emerald-600" />
                          Commercial Payout Summary
                        </span>
                        <span className="text-xs font-bold text-slate-500">
                          {isPaid ? 'Paid Collaboration' : 'Barter Deal'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-3 text-center">
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Total Agreed Deal</p>
                          <p className="text-base sm:text-lg font-extrabold text-slate-900">₹{totalAmount.toLocaleString()}</p>
                        </div>
                        <div className="border-l border-r border-slate-200">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Amount Received</p>
                          <p className="text-base sm:text-lg font-extrabold text-emerald-600">₹{received.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-0.5">Pending Balance</p>
                          <p className="text-base sm:text-lg font-extrabold text-amber-600">₹{balance.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>

                    {!isPaid || totalAmount === 0 ? (
                      <div className="p-5 rounded-2xl bg-purple-50 border border-purple-200 text-center space-y-2">
                        <Sparkles className="h-7 w-7 text-purple-600 mx-auto" />
                        <h4 className="text-sm font-bold text-purple-950">Barter Collaboration</h4>
                        <p className="text-xs text-purple-800 max-w-md mx-auto leading-relaxed">
                          This collaboration is non-monetary (product / experience barter). You do not need to submit any payment request. Please complete your post submissions in the <strong>Completion Form</strong> tab.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {/* Bank Details Verification Card */}
                        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <Building className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-xs font-bold text-slate-900">Your Registered Bank Account</p>
                              {user?.account_number ? (
                                <p className="text-xs text-slate-600 font-mono mt-0.5">
                                  {user.account_name} • A/C: {user.account_number} • IFSC: {user.ifsc_code}
                                </p>
                              ) : (
                                <p className="text-xs text-red-600 font-medium mt-0.5">
                                  No bank details added yet in your profile.
                                </p>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => { onClose(); router.push('/dashboard/profile') }}
                            className="text-xs font-bold text-indigo-600 hover:underline shrink-0 cursor-pointer"
                          >
                            Edit
                          </button>
                        </div>

                        {/* Action Buttons: Payout Request / Partial Request / Appeal */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {application.status === 'Approved' ? (
                            <button
                              type="button"
                              onClick={() => {
                                if (user?.account_name && user?.account_number && user?.ifsc_code) {
                                  setShowPaymentForm(true)
                                } else {
                                  setShowProfileAlert(true)
                                }
                              }}
                              className="p-4 rounded-2xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer group shadow-2xs"
                            >
                              <CreditCard className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-extrabold text-amber-900">Submit Payout Request</span>
                              <span className="text-[10px] text-amber-700 font-medium">Request ₹{totalAmount.toLocaleString()} Payout</span>
                            </button>
                          ) : (
                            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col items-center justify-center gap-1.5">
                              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                              <span className="text-xs font-extrabold text-emerald-900">
                                {application.status === 'Payment Requested' ? 'Payout Requested' : 'Processing Payment'}
                              </span>
                              <span className="text-[10px] text-emerald-700 font-medium">Under Finance Review</span>
                            </div>
                          )}

                          {/* Appeal Button */}
                          {activePendingAppeal ? (
                            <button
                              type="button"
                              onClick={() => setShowAppealModal(true)}
                              className="p-4 rounded-2xl bg-amber-50 border border-amber-300 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                            >
                              <div className="relative">
                                <AlertCircle className="h-6 w-6 text-amber-600 group-hover:scale-110 transition-transform" />
                                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
                              </div>
                              <span className="text-xs font-extrabold text-amber-900">Appeal In Review</span>
                              <span className="text-[10px] text-amber-700 font-medium">Finance Team Resolving</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setShowAppealModal(true); setAppealReason(''); setAppealScreenshot('') }}
                              className="p-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer group"
                            >
                              <AlertCircle className="h-6 w-6 text-red-600 group-hover:scale-110 transition-transform" />
                              <span className="text-xs font-extrabold text-red-900">Raise Payment Appeal</span>
                              <span className="text-[10px] text-red-700 font-medium">Direct to Finance Desk</span>
                            </button>
                          )}
                        </div>

                        {/* Partial Payment Release option if already in payment process */}
                        {application.status === 'Payment Initiated' && balance > 0 && (
                          <div className="pt-2">
                            <Button
                              type="button"
                              onClick={() => setShowPartialModal(true)}
                              className="w-full h-11 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 font-bold text-xs cursor-pointer"
                            >
                              <PieChart className="mr-2 h-4 w-4 text-cyan-700" />
                              Request Partial Payment Release (₹{balance.toLocaleString()} remaining)
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
              <div className="p-5 border-b border-slate-200/80 bg-slate-50 flex items-center justify-between">
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

              {/* Body */}
              <div className="p-5 space-y-4">
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

              <div className="p-5 space-y-5 overflow-y-auto flex-1">
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
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="text-[10px] text-slate-600 uppercase tracking-wider font-semibold mb-1.5 block">
                        Appeal Reason / Issue Description <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={appealReason}
                        onChange={e => setAppealReason(e.target.value)}
                        placeholder="Describe your payment or deliverable dispute..."
                        rows={4}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none placeholder:text-slate-400"
                      />
                    </div>

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
                              <span className="text-xs font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Upload Screenshot</span>
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
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

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
