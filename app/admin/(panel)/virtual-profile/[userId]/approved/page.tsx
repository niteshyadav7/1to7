'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import ApprovedCampaignModal from '@/components/campaigns/ApprovedCampaignModal'
import BrandLoader from '@/components/ui/BrandLoader'
import { toast } from 'sonner'
import { getApplicationCommercialAmount, isPaidCollaboration } from '@/lib/utils/commercial-utils'

interface Application {
  id: string
  status: string
  form_data?: any
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
    category: string
    budget_type: string
    deliverables: string
    order_form?: boolean
    payment_form_fields?: any[]
  }
}

export default function VirtualProfileApprovedPage() {
  const { userId } = useParams<{ userId: string }>()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)

  const fetchApproved = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/virtual-profile/${userId}?action=applications`)
      const data = await res.json()
      const validStatuses = ['Approved', 'Payment Requested', 'Payment Initiated', 'Payment Approved', 'Completed']
      const filtered = (data.applications || []).filter((app: Application) => {
        if (!validStatuses.includes(app.status)) return false
        if (app.campaigns?.order_form && app.status === 'Approved') {
          if (!app.form_data?.order_details_approved) return false
        }
        return true
      })
      setApplications(filtered)
    } catch {
      toast.error('Failed to fetch approved campaigns')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) fetchApproved()
  }, [userId, fetchApproved])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  return (
    <div className="space-y-3.5 pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-sm font-extrabold text-charcoal-surface tracking-tight flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            Approved Campaigns
          </h1>
          <p className="text-[11px] text-secondary mt-0.5">Creator&apos;s active and completed collaborations</p>
        </div>
        <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 shrink-0">
          Total: {applications.length}
        </div>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-white p-12 text-center shadow-sm">
          <CheckCircle2 className="h-10 w-10 text-secondary mx-auto mb-3" />
          <p className="text-sm text-charcoal-surface font-bold">No active collaborations yet.</p>
          <p className="text-xs text-secondary mt-1">This creator hasn&apos;t been approved for any campaigns.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app, i) => {
            const campCode = app.campaigns?.campaign_code || app.id.split('-')[0].toUpperCase()
            const brandName = app.campaigns?.brand_name || 'Brand'
            const totalDeal = getApplicationCommercialAmount(app)
            const received = (app.partial_payment || 0) + (app.final_payment || 0)
            const hasRequested = !!app?.form_data?.payment_request
            const pending = hasRequested ? (app.pending_amount || 0) : Math.max(0, totalDeal - received)
            const progress = totalDeal > 0 ? (received / totalDeal) * 100 : 0
            const isCompleted = app.status === 'Completed' || Boolean(app.form_data?.finance_payout_completed)
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
                {/* Card Header */}
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

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col">
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

                  {/* Financials */}
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

                  {/* Progress */}
                  <div className="space-y-1 mb-6">
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-[#f50057] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[9px] font-bold text-secondary text-right uppercase tracking-wider">{Math.round(progress)}% Received</p>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-[11px] font-bold text-secondary flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-slate-50 flex items-center justify-center text-[8px] border border-slate-200 opacity-80 pl-[1px]">📅</div>
                      {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedApp(app); }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-[#f50057] bg-[#f50057]/10 border border-[#f50057]/20 transition-all hover:bg-[#f50057]/20 cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      <ApprovedCampaignModal
        isOpen={!!selectedApp}
        onClose={() => setSelectedApp(null)}
        onRefresh={() => { fetchApproved(); setSelectedApp(null) }}
        application={selectedApp}
      />
    </div>
  )
}
