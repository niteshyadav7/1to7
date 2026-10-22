'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, CreditCard, AlertCircle, FileCheck, Sparkles, Phone, MessageCircle, MapPin, Package, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import ApprovedCampaignModal from '@/components/campaigns/ApprovedCampaignModal'
import AddressConfirmationModal from '@/components/campaigns/AddressConfirmationModal'
import { useRealtime } from '@/hooks/useRealtime'
import BrandLoader from '@/components/ui/BrandLoader'
import { getApplicationCommercialAmount, isPaidCollaboration } from '@/lib/utils/commercial-utils'

interface Application {
  id: string
  status: string
  form_data?: any
  partial_payment: number
  final_payment: number
  pending_amount: number
  is_ghosted?: boolean
  ghosted_at?: string | null
  manager_phone?: string | null
  manager?: {
    name?: string
    phone?: string | null
    email?: string | null
    avatarUrl?: string | null
  }
  created_at: string
  updated_at: string
  campaigns: {
    id: string
    brand_name: string
    campaign_code: string
    platform: string
    category: string
    budget_type: string
    deliverables: string
    manager_phone?: string | null
    order_form?: boolean
    payment_form_fields?: any[]
    address_required?: boolean
  }
}

import { getFastCache, setFastCache } from '@/lib/utils/cache-utils'

export default function ApprovedCampaignsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [pendingDetailsApps, setPendingDetailsApps] = useState<Application[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [addressApp, setAddressApp] = useState<Application | null>(null)

  const fetchApproved = useCallback(async (isBackground = false) => {
    if (!isBackground && applications.length === 0) {
      setLoading(true)
    }
    try {
      const res = await fetch('/api/dashboard/applications')
      const data = await res.json()
      const validStatuses = ['Approved', 'Payment Requested', 'Payment Initiated', 'Payment Approved', 'Completed']
      const allApps = data.applications || []

      // Identify approved campaigns that need missing details
      const missingDetails = allApps.filter((app: Application) => {
        if (app.status !== 'Approved') return false
        const needsOrder = Boolean(app.campaigns?.order_form && !app.form_data?.order_details_approved)
        const needsAddr = Boolean((app.campaigns?.address_required || app.campaigns?.order_form) && !app.form_data?.address_confirmed)
        return needsOrder || needsAddr
      })
      setPendingDetailsApps(missingDetails)

      const filtered = allApps.filter((app: Application) => {
        if (!validStatuses.includes(app.status)) return false
        if (app.campaigns?.order_form && app.status === 'Approved') {
          if (!app.form_data?.order_details_approved) {
            return false
          }
        }
        return true
      })
      setApplications(filtered)
      setFastCache('creator_approved_apps', filtered)
    } catch {
      console.error('Failed to fetch approved campaigns')
    } finally {
      setLoading(false)
    }
  }, [applications.length])

  useEffect(() => {
    const cached = getFastCache<Application[]>('creator_approved_apps')
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setApplications(cached)
      setLoading(false)
      fetchApproved(true)
    } else {
      fetchApproved(false)
    }
  }, [fetchApproved])

  // Auto-refresh when admin updates applications
  useRealtime({ table: 'applications', onChange: fetchApproved })

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  return (
    <div className="space-y-3.5 pb-16">
      {/* Compact Header Strip */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-sm font-extrabold text-charcoal-surface tracking-tight flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            Approved Campaigns
          </h1>
          <p className="text-[11px] text-secondary mt-0.5">Manage your active and completed collaborations</p>
        </div>
        <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shrink-0">
          Total: {applications.length}
        </div>
      </div>

      {/* Prominent Section: Approved & Missing Details */}
      {pendingDetailsApps.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-600 text-white shadow-2xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  Action Required: Approved & Missing Details
                  <span className="h-5 px-2 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                    {pendingDetailsApps.length}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-600 font-medium mt-0.5">
                  You are shortlisted for these campaigns! Complete the required details below to begin:
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingDetailsApps.map((pApp) => {
              const needsAddress = Boolean((pApp.campaigns?.address_required || pApp.campaigns?.order_form) && !pApp.form_data?.address_confirmed)
              const needsOrder = Boolean(pApp.campaigns?.order_form && !pApp.form_data?.order_details_approved)

              return (
                <div
                  key={pApp.id}
                  className="bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-2xs flex flex-col justify-between gap-3 hover:border-emerald-400 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-xs font-bold text-slate-900">
                        {pApp.campaigns?.brand_name || 'Campaign'}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Shortlisted
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Code: <span className="font-mono font-bold text-slate-700">{pApp.campaigns?.campaign_code}</span>
                    </p>
                    <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/80 border border-amber-200 rounded-lg p-2 font-medium flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                      {needsAddress ? 'Delivery address required' : 'Order details verification required'}
                    </div>
                  </div>

                  <div className="pt-1">
                    {needsAddress ? (
                      <button
                        type="button"
                        onClick={() => setAddressApp(pApp)}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-2xs transition-all cursor-pointer"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        Confirm Delivery Address
                      </button>
                    ) : (
                      <Link
                        href="/dashboard/campaigns"
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-all"
                      >
                        <FileCheck className="h-3.5 w-3.5" />
                        Submit Order Form →
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-white p-12 text-center shadow-sm">
          <CheckCircle2 className="h-10 w-10 text-secondary mx-auto mb-3" />
          <p className="text-sm text-charcoal-surface font-bold">No active collaborations yet.</p>
          <p className="text-xs text-secondary mt-1">Keep applying — brands are reviewing your profile!</p>
          <Link
            href="/"
            className="inline-block mt-4 text-xs font-bold px-4 py-2 rounded-md bg-primary-container text-black hover:bg-primary-container/90 transition-all shadow-sm cursor-pointer"
          >
            Browse Campaigns
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app, i) => {
            const campCode = app.campaigns?.campaign_code || app.id.split('-')[0].toUpperCase()
            const brandName = app.campaigns?.brand_name || 'Brand'
            const totalDeal = getApplicationCommercialAmount(app)
            const isPaid = isPaidCollaboration(app)
            const isCompleted = app.status === 'Completed' || Boolean(app.form_data?.finance_payout_completed)
            const received = isCompleted
              ? ((app.partial_payment || 0) + (app.final_payment || 0))
              : (app.form_data?.finance_payout_completed?.amount_paid || (app.partial_payment || 0))
            const hasRequested = !!app?.form_data?.payment_request
            const pending = hasRequested ? (app.pending_amount || 0) : Math.max(0, totalDeal - received)
            const progress = totalDeal > 0 ? (received / totalDeal) * 100 : 0
            const statusDisplay = (progress >= 100 && isCompleted) ? 'FULLY PAID' :
              app.status === 'Approved' ? 'APPROVED - ACTIVE' :
                app.status === 'Payment Requested' ? 'PAYMENT REQUESTED' :
                  (app.status === 'Payment Initiated' || app.status === 'Payment Approved') ? 'PAYMENT INITIATED - PROCESSING' :
                    app.status === 'Completed' ? 'COMPLETED' : 'PAYMENT INITIATED - PROCESSING'

            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedApp(app)}
                className="rounded-md bg-white border border-border-subtle overflow-hidden shadow-sm hover:shadow-md hover:border-primary-container/40 transition-all cursor-pointer flex flex-col group"
              >
                {/* Card Top / Header */}
                <div className="bg-slate-50 border-b border-border-subtle p-4 flex flex-col gap-2 shrink-0">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span className="text-sm font-bold text-charcoal-surface truncate w-full sm:max-w-[50%] flex items-center gap-1.5">
                      <span className="opacity-50 text-primary">#</span> {campCode}
                    </span>
                    <span className={`text-[9px] font-bold px-2 py-1 flex items-center shrink-0 uppercase tracking-wider rounded-sm border ${progress >= 100 && isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : (app.status === 'Payment Initiated' || app.status === 'Payment Approved') ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-primary-container/20 text-black border-primary-container/30'}`}>
                      {statusDisplay}
                    </span>
                  </div>
                </div>

                {/* Overdue / Action Required Banner */}
                {app.is_ghosted && (
                  <div className="bg-rose-50 border-b border-rose-200 px-4 py-2.5 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-rose-800 leading-tight">
                        Too delayed to complete the completion form. Please fill at the earliest or contact your POC.
                      </p>
                      <p className="text-[10px] text-rose-600 mt-0.5 font-medium">
                        New campaign applications are paused until submitted.
                      </p>
                    </div>
                  </div>
                )}

                {/* Card Middle / Body */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Brand Row */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2 mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-primary-container text-black font-bold flex items-center justify-center text-xs">
                        {brandName.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-charcoal-surface">{brandName}</span>
                    </div>
                    {app.form_data?.payment_initiated?.bank_code && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-secondary font-bold uppercase tracking-widest whitespace-nowrap">Bank Code</span>
                        <span className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded text-xs font-mono font-medium truncate max-w-[150px]" title={app.form_data.payment_initiated.bank_code}>
                          {app.form_data.payment_initiated.bank_code}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Brand Manager Contact Strip */}
                  {(() => {
                    const mgrPhone = app.manager?.phone || app.manager_phone || app.campaigns?.manager_phone
                    const mgrName = app.manager?.name || 'Brand Manager'
                    const cleanPhone = mgrPhone ? String(mgrPhone).replace(/\D/g, '') : ''
                    const phone10 = cleanPhone ? (cleanPhone.length === 12 && cleanPhone.startsWith('91') ? cleanPhone.slice(2) : cleanPhone) : ''

                    return (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="mb-3.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2 shadow-2xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {mgrName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 truncate block">
                              {mgrName}
                            </span>
                            <span className="text-[9px] text-slate-500 font-medium">
                              Brand Manager {phone10 ? `• +91 ${phone10}` : ''}
                            </span>
                          </div>
                        </div>

                        {phone10 ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={`https://wa.me/91${phone10}?text=${encodeURIComponent(
                                `Hi ${mgrName}, I am collaborating on ${brandName} (${campCode}). I have a query regarding my collaboration.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                              title="WhatsApp Brand Manager"
                            >
                              <MessageCircle className="h-3 w-3" />
                              WhatsApp
                            </a>
                            <a
                              href={`tel:+91${phone10}`}
                              className="p-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                              title="Call Brand Manager"
                            >
                              <Phone className="h-3 w-3" />
                            </a>
                          </div>
                        ) : (
                          <span className="text-[9px] text-slate-400 italic shrink-0">Assigned POC</span>
                        )}
                      </div>
                    )
                  })()}

                  {/* Financials Row */}
                  <div className="grid grid-cols-3 gap-2 mb-3 mt-auto">
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-secondary font-bold uppercase tracking-widest mb-1 text-center">Total Deal</span>
                      <span className="text-sm font-bold text-charcoal-surface">₹{totalDeal.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-center border-l border-r border-slate-100">
                      <span className="text-[9px] text-secondary font-bold uppercase tracking-widest mb-1 text-center">Received</span>
                      <span className="text-sm font-bold text-emerald-600">₹{received.toLocaleString()}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-[9px] text-secondary font-bold uppercase tracking-widest mb-1 text-center">Pending</span>
                      <span className="text-sm font-bold text-amber-600">₹{pending.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-6">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#f50057] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[9px] font-bold text-secondary text-right uppercase tracking-wider">{Math.round(progress)}% Received</p>
                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-slate-50 flex items-center justify-center text-[8px] border border-slate-200 opacity-80 pl-[1px]">📅</div>
                      {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-[#f50057] bg-[#f50057]/10 border border-[#f50057]/20 transition-all hover:bg-[#f50057]/20 cursor-pointer"
                      >
                        Payments
                      </button>
                      {(() => {
                        const requests = app.form_data?.requests || []
                        const hasPendingAppeal = requests.some((r: any) => r.type === 'appeal' && r.status === 'pending')
                        const hasResolvedAppeal = requests.some((r: any) => r.type === 'appeal' && r.status === 'resolved')

                        if (hasPendingAppeal) {
                          return (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 transition-all hover:bg-amber-200 cursor-pointer animate-pulse"
                              title="Appeal is currently under review by Finance"
                            >
                              🟡 Appeal In Review
                            </button>
                          )
                        }

                        if (hasResolvedAppeal) {
                          return (
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 transition-all hover:bg-emerald-200 cursor-pointer"
                            >
                              🟢 Appeal Settled
                            </button>
                          )
                        }

                        return (
                          <button 
                            onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 transition-all hover:bg-red-100 cursor-pointer"
                          >
                            Appeal
                          </button>
                        )
                      })()}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
      <ApprovedCampaignModal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        onRefresh={() => { fetchApproved(); setSelectedApp(null) }}
        application={selectedApp}
      />

      {/* In-Place Address Confirmation Modal (Zero Redirect) */}
      <AddressConfirmationModal
        isOpen={!!addressApp}
        onClose={() => setAddressApp(null)}
        application={addressApp}
        onSuccess={fetchApproved}
      />
    </div>
  )
}


// DOne EVERY things