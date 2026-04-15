'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Instagram, Youtube, ShoppingBag, Loader2, Filter, UploadCloud, CheckCircle2, ClipboardList, Info, MessageSquare, ExternalLink, IndianRupee, Image, FileText } from 'lucide-react'
import OrderVerificationModal from '@/components/campaigns/OrderVerificationModal'
import { useAuth } from '@/components/providers/AuthProvider'

interface Application {
  id: string
  status: string
  form_data: any
  partial_payment: number
  final_payment: number
  pending_amount: number
  created_at: string
  updated_at: string
  campaigns: {
    id: string
    campaign_code: string
    brand_name: string
    platform: string
    category: string
    budget_type: string
    deliverables: string
    order_form?: boolean
    order_form_fields?: any[]
  }
}

const statusColors: Record<string, string> = {
  'Applied': 'bg-amber-500/90 text-white',
  'Approved': 'bg-emerald-500/90 text-white',
  'Rejected': 'bg-red-500/90 text-white',
  'Completed': 'bg-purple-500/90 text-white',
  'Payment Initiated': 'bg-blue-500/90 text-white',
}

const statuses = ['All', 'Applied', 'Rejected']

export default function AppliedCampaignsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const { user } = useAuth()

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/dashboard/applications')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      console.error('Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }

  // Only show Applied & Rejected here — Approved and beyond are on the Approved page
  const approvedStatuses = ['Approved', 'Payment Requested', 'Payment Initiated', 'Completed']
  const appliedPageApps = applications.filter(app => !approvedStatuses.includes(app.status))

  const filteredApps = activeFilter === 'All'
    ? appliedPageApps
    : appliedPageApps.filter((app) => app.status === activeFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Applied Campaigns</h1>
        <p className="text-sm text-slate-400 mt-1">All campaigns you&apos;ve applied to</p>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-slate-500 mr-1" />
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setActiveFilter(status)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
              activeFilter === status
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
          <Send className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            {activeFilter === 'All' ? 'No applications yet' : `No ${activeFilter.toLowerCase()} applications`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredApps.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden hover:bg-slate-900/80 transition-colors"
            >
              {/* Campaign Header - Dark gradient bar */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-800/80 px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-700/80 text-white font-bold text-sm shrink-0">
                    {app.campaigns?.brand_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{app.campaigns?.brand_name || 'Campaign'}</h3>
                    <p className="text-[11px] text-slate-400">ID: {app.campaigns?.campaign_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {app.campaigns?.order_form && !app.form_data?.order_details && app.status === 'Approved' && (
                    <span className="rounded-md px-3 py-1.5 text-[11px] font-semibold bg-blue-500/90 text-white">
                      Fill Order Form
                    </span>
                  )}
                  <span className={`rounded-md px-3 py-1.5 text-[11px] font-semibold ${statusColors[app.status] || 'bg-slate-500/90 text-white'}`}>
                    {app.status === 'Applied' ? 'Pending' : app.status}
                  </span>
                </div>
              </div>

              {/* Info Row - Instagram + Followers */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Instagram */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Instagram</p>
                    {user?.instagram_username ? (
                      <a
                        href={`https://instagram.com/${user.instagram_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-medium text-pink-400 hover:text-pink-300 transition-colors"
                      >
                        <Instagram className="h-4 w-4" />
                        View Profile
                      </a>
                    ) : (
                      <span className="text-sm text-slate-500">Not set</span>
                    )}
                  </div>
                  {/* Followers */}
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Followers</p>
                    <p className="text-sm font-semibold text-white">
                      {user?.followers ? (
                        user.followers >= 1000 
                          ? `${(user.followers / 1000).toFixed(user.followers % 1000 === 0 ? 0 : 1)}k Followers`
                          : `${user.followers}`
                      ) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>


            
              {/* Payment Info - when admin has initiated payment */}
             
              {app.status === 'Rejected' && app.form_data?.rejection_reason && (
                <div className="mx-5 mb-3">
                  <div className="rounded-xl bg-gradient-to-r from-red-500/10 to-red-500/5 border border-red-500/20 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm font-bold text-red-300 block mb-1">Order Rejected</span>
                        <span className="text-xs font-medium text-slate-300">{app.form_data.rejection_reason}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Row */}
              <div className="px-5 pb-4">
                <div className="flex items-center justify-end gap-3">
                  {/* Upload Order Details - when approved or rejected */}
                  {(app.status === 'Approved' || app.status === 'Rejected') && app.campaigns?.order_form && (
                    <button
                      onClick={() => setSelectedApplication(app)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all text-xs font-semibold cursor-pointer"
                    >
                      {app.form_data?.order_details ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          Update Order Details
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-4 w-4" />
                          Upload Order Details
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <OrderVerificationModal
        isOpen={!!selectedApplication}
        onClose={() => setSelectedApplication(null)}
        application={selectedApplication}
        onSuccess={fetchApplications}
      />
    </div>
  )
}
