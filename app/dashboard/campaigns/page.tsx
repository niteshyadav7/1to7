'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, Instagram, Youtube, ShoppingBag, Loader2, Filter, UploadCloud, CheckCircle2, ClipboardList, Info, MessageSquare, ExternalLink, IndianRupee, Image, FileText } from 'lucide-react'
import OrderVerificationModal from '@/components/campaigns/OrderVerificationModal'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/hooks/useRealtime'
import BrandLoader from '@/components/ui/BrandLoader'

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
  'Applied': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Approved': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Rejected': 'bg-red-50 text-red-700 border border-red-200',
  'Completed': 'bg-purple-50 text-purple-700 border border-purple-200',
  'Payment Initiated': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Order Details Pending': 'bg-cyan-50 text-cyan-700 border border-cyan-200',
}

const statuses = ['All', 'Applied', 'Rejected']

export default function AppliedCampaignsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null)
  const { user } = useAuth()

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch('/api/dashboard/applications')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      console.error('Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  // Auto-refresh when admin updates any application
  useRealtime({ table: 'applications', onChange: fetchApplications })

  // Only show Applied & Rejected here — Approved and beyond are on the Approved page
  // BUT: if the campaign requires an order form and order_details haven't been approved yet,
  // keep it visible on the Applied page so the influencer can fill the order form
  const approvedStatuses = ['Approved', 'Payment Requested', 'Payment Initiated', 'Completed']
  const appliedPageApps = applications.filter(app => {
    // Always show Applied & Rejected
    if (!approvedStatuses.includes(app.status)) return true
    // For campaigns with order forms: keep in Applied until order_details are approved by admin
    if (app.campaigns?.order_form && !app.form_data?.order_details_approved) return true
    return false
  })

  const filteredApps = activeFilter === 'All'
    ? appliedPageApps
    : appliedPageApps.filter((app) => app.status === activeFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  return (
    <div className="space-y-3.5">
      {/* Compact Header & Filter Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-sm font-extrabold text-charcoal-surface tracking-tight">Applied Campaigns</h1>
          <p className="text-[11px] text-secondary">All campaigns you&apos;ve applied to</p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-secondary mr-1 shrink-0" />
          {statuses.map((status) => (
            <button
              key={status}
              onClick={() => setActiveFilter(status)}
              className={`rounded-lg px-3 py-1 text-xs font-semibold border transition-all cursor-pointer ${activeFilter === status
                  ? 'bg-primary-container text-black border-primary-container/30 shadow-2xs'
                  : 'bg-slate-50 text-secondary border-slate-200 hover:bg-slate-100 hover:text-charcoal-surface'
                }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="rounded-md border border-border-subtle bg-white p-12 text-center shadow-sm">
          <Send className="h-10 w-10 text-secondary mx-auto mb-3" />
          <p className="text-sm text-secondary">
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
              className="rounded-md border border-border-subtle bg-white overflow-hidden hover:bg-slate-50/20 transition-all shadow-sm"
            >
              {/* Campaign Header - Light gray bar */}
              <div className="bg-slate-50 border-b border-border-subtle px-4 sm:px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary-container text-black font-bold text-sm shrink-0 shadow-sm">
                    {app.campaigns?.brand_name?.charAt(0) || 'C'}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-charcoal-surface">{app.campaigns?.brand_name || 'Campaign'}</h3>
                    <p className="text-[11px] text-secondary font-medium">ID: {app.campaigns?.campaign_code}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* Show contextual status for order-form campaigns */}
                  {app.campaigns?.order_form && app.status === 'Approved' && !app.form_data?.order_details && (
                    <span className="rounded-md px-3 py-1.5 text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all">
                      Fill Order Form
                    </span>
                  )}
                  <span className={`rounded-md px-3 py-1.5 text-[11px] font-bold ${app.status === 'Applied'
                      ? statusColors['Applied']
                      : app.campaigns?.order_form && app.status === 'Approved' && app.form_data?.order_details && !app.form_data?.order_details_approved
                        ? statusColors['Order Details Pending']
                        : statusColors[app.status] || 'bg-slate-100 text-secondary border border-slate-200'
                    }`}>
                    {app.status === 'Applied'
                      ? 'Pending'
                      : app.campaigns?.order_form && app.status === 'Approved' && app.form_data?.order_details && !app.form_data?.order_details_approved
                        ? 'Order Details Pending'
                        : app.status}
                  </span>
                </div>
              </div>

              {/* Info Row - Instagram + Followers */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  {/* Instagram */}
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Instagram</p>
                    {user?.instagram_username ? (
                      <a
                        href={`https://instagram.com/${user.instagram_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-sm font-bold text-[#f50057] hover:text-[#d8004c] transition-colors"
                      >
                        <Instagram className="h-4 w-4" />
                        View Profile
                      </a>
                    ) : (
                      <span className="text-sm text-secondary font-medium">Not set</span>
                    )}
                  </div>
                  {/* Followers */}
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Followers</p>
                    <p className="text-sm font-semibold text-charcoal-surface">
                      {user?.followers ? (
                        user.followers >= 1000
                          ? `${(user.followers / 1000).toFixed(user.followers % 1000 === 0 ? 0 : 1)}k Followers`
                          : `${user.followers}`
                      ) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {app.status === 'Rejected' && app.form_data?.rejection_reason && (
                <div className="mx-5 mb-3">
                  <div className="rounded-md bg-red-50/50 border border-red-200/60 px-4 py-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm font-bold text-red-700 block mb-1">Order Rejected</span>
                        <span className="text-xs font-semibold text-red-600">{app.form_data.rejection_reason}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions Row */}
              <div className="px-5 pb-4">
                <div className="flex items-center justify-end gap-3">
                  {/* Upload Order Details - only show if approved, or if rejected AFTER they already submitted order details */}
                  {((app.status === 'Approved') || (app.status === 'Rejected' && !!app.form_data?.order_details)) && app.campaigns?.order_form && (
                    <button
                      onClick={() => setSelectedApplication(app)}
                      disabled={!!app.form_data?.order_details && app.status !== 'Rejected'}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-md transition-all text-xs font-semibold ${!!app.form_data?.order_details && app.status !== 'Rejected'
                          ? 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm cursor-pointer'
                        }`}
                    >
                      {app.form_data?.order_details ? (
                        <>
                          <CheckCircle2 className="h-4 w-4" />
                          {app.status !== 'Rejected' ? 'Order Details Submitted' : 'Update Order Details'}
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
