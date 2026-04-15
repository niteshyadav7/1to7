'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, CreditCard, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import ApprovedCampaignModal from '@/components/campaigns/ApprovedCampaignModal'

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
  }
}

export default function ApprovedCampaignsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)

  useEffect(() => {
    fetchApproved()
  }, [])

  const fetchApproved = async () => {
    try {
      const res = await fetch('/api/dashboard/applications')
      const data = await res.json()
      // Filter for approved/completed statuses
      const validStatuses = ['Approved', 'Payment Requested', 'Payment Initiated', 'Completed']
      const filtered = (data.applications || []).filter((app: Application) => {
        if (!validStatuses.includes(app.status)) return false
        
        // If it requires an order form, ONLY show on the Approved page if they've submitted the order details
        if (app.status === 'Approved' && app.campaigns?.order_form) {
          if (!app.form_data?.order_details) {
            return false
          }
        }
        return true
      })
      setApplications(filtered)
    } catch {
      console.error('Failed to fetch approved campaigns')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-slate-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <h1 className="text-xl font-bold text-white">Approved Campaigns</h1>
        </div>
        <div className="px-3 py-1 bg-slate-800 rounded text-xs font-semibold text-slate-300">
          Total: {applications.length}
        </div>
      </div>
      <p className="text-sm text-slate-400 mt-1">Manage your active and completed collaborations.</p>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No active collaborations yet.</p>
          <p className="text-xs text-slate-500 mt-1">Keep applying — brands are reviewing your profile!</p>
          <Link
            href="/"
            className="inline-block mt-4 text-xs font-medium px-4 py-2 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/25 transition-colors cursor-pointer"
          >
            Browse Campaigns
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {applications.map((app, i) => {
            const campCode = app.campaigns?.campaign_code || app.id.split('-')[0].toUpperCase()
            const brandName = app.campaigns?.brand_name || 'Brand'
            const totalDeal = (app.partial_payment || 0) + (app.final_payment || 0) + (app.pending_amount || 0)
            const received = (app.partial_payment || 0) + (app.final_payment || 0)
            const pending = app.pending_amount || 0
            const progress = totalDeal > 0 ? (received / totalDeal) * 100 : 0
            const statusDisplay = app.status === 'Approved' ? 'APPROVED - AWAITING ACTION' : app.status === 'Payment Requested' ? 'PAYMENT REQUESTED' : app.status === 'Completed' ? 'COMPLETED' : 'PAYMENT INITIATED - PROCESSING'
            
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedApp(app)}
                className="rounded-2xl bg-slate-900/60 backdrop-blur-lg border border-white/5 overflow-hidden shadow-lg hover:shadow-indigo-500/5 hover:border-indigo-500/30 transition-all cursor-pointer flex flex-col group"
              >
                {/* Card Top / Header */}
                <div className="bg-slate-950/50 border-b border-white/5 p-4 flex flex-col gap-2 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-white truncate max-w-[50%] flex items-center gap-1.5">
                      <span className="opacity-50 text-indigo-400">#</span> {campCode}
                    </span>
                    <span className="bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 text-[9px] font-bold px-2 py-1 flex items-center shrink-0 uppercase tracking-wider rounded-sm">
                      {statusDisplay}
                    </span>
                  </div>
                </div>

                {/* Card Middle / Body */}
                <div className="p-5 flex-1 flex flex-col">
                  {/* Brand Row */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-sm bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 font-bold flex items-center justify-center text-xs">
                        {brandName.charAt(0)}
                      </div>
                      <span className="text-sm font-bold text-white">{brandName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest whitespace-nowrap">Bank Code</span>
                      <span className="bg-slate-950 border border-white/10 text-slate-400 px-2 py-0.5 rounded text-xs font-mono font-medium">
                        {app.form_data?.payment_initiated?.bank_code || app.id.substring(0,8)}
                      </span>
                    </div>
                  </div>

                  {/* Financials Row */}
                  <div className="grid grid-cols-3 gap-2 mb-3 mt-auto">
                     <div className="flex flex-col items-center">
                       <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Total Deal</span>
                       <span className="text-sm font-bold text-white">₹{totalDeal.toLocaleString()}</span>
                     </div>
                     <div className="flex flex-col items-center border-l-2 border-r-2 border-white/5">
                       <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Received</span>
                       <span className="text-sm font-bold text-emerald-400">₹{received.toLocaleString()}</span>
                     </div>
                     <div className="flex flex-col items-center">
                       <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-1 text-center">Pending</span>
                       <span className="text-sm font-bold text-amber-400">₹{pending.toLocaleString()}</span>
                     </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 mb-6">
                     <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-1000" style={{ width: `${progress}%` }} />
                     </div>
                     <p className="text-[9px] font-bold text-slate-500 text-right uppercase tracking-wider">{Math.round(progress)}% Received</p>
                  </div>

                  {/* Footer Row */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <span className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-slate-800 flex items-center justify-center text-[8px] border border-white/5 opacity-80 pl-[1px]">📅</div>
                      {new Date(app.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </span>
                    <div className="flex items-center gap-2">
                      <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 transition-colors group-hover:bg-indigo-500/20">
                        Payments
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold text-red-300 bg-red-500/10 border border-red-500/20 transition-colors group-hover:bg-red-500/20">
                        Appeal
                      </button>
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
    </div>
  )
}
