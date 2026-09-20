'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Send, Instagram, Filter, CheckCircle2, Eye, MessageSquare, RotateCcw, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import ApplicationReviewModal from '@/components/modals/ApplicationReviewModal'
import BrandLoader from '@/components/ui/BrandLoader'
import { toast } from 'sonner'

interface Application {
  id: string
  status: string
  form_data: any
  partial_payment: number
  final_payment: number
  pending_amount: number
  created_at: string
  updated_at: string
  selected_store?: any
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
  'Applied': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Under Process': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Under Review': 'bg-amber-50 text-amber-700 border border-amber-200',
  'Approved': 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  'Rejected': 'bg-red-50 text-red-700 border border-red-200',
  'Completed': 'bg-purple-50 text-purple-700 border border-purple-200',
  'Payment Initiated': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Payment Approved': 'bg-blue-50 text-blue-700 border border-blue-200',
  'Order Details Pending': 'bg-cyan-50 text-cyan-700 border border-cyan-200',
}

const statuses = ['All', 'Applied', 'Under Process', 'Rejected']

export default function VirtualProfileAppliedPage() {
  const { userId } = useParams<{ userId: string }>()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [reviewApp, setReviewApp] = useState<Application | null>(null)

  const fetchApplications = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/virtual-profile/${userId}?action=applications`)
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      toast.error('Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (userId) fetchApplications()
  }, [userId, fetchApplications])

  const approvedStatuses = ['Approved', 'Payment Requested', 'Payment Initiated', 'Payment Approved', 'Completed']
  const appliedPageApps = applications.filter(app => {
    if (!approvedStatuses.includes(app.status)) return true
    if (app.campaigns?.order_form && !app.form_data?.order_details_approved) return true
    return false
  })

  const filteredApps = activeFilter === 'All'
    ? appliedPageApps
    : appliedPageApps.filter(app => app.status === activeFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  return (
    <div className="space-y-3.5">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-sm font-extrabold text-charcoal-surface tracking-tight">Applied Campaigns</h1>
          <p className="text-[11px] text-secondary">Creator&apos;s submitted applications</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-secondary mr-1 shrink-0" />
          {statuses.map(status => (
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
              {/* Campaign Header */}
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
                  {app.campaigns?.order_form && app.status === 'Approved' && !app.form_data?.order_details && (
                    <span className="rounded-md px-3 py-1.5 text-[11px] font-bold bg-blue-600 text-white shadow-sm">
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
                        : app.status === 'Rejected' ? 'Rejected' : app.status}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="px-5 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Platform</p>
                    <p className="text-sm font-semibold text-charcoal-surface">{app.campaigns?.platform || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-1.5">Budget Type</p>
                    <p className="text-sm font-semibold text-charcoal-surface capitalize">{app.campaigns?.budget_type || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Rejection reason */}
              {app.status === 'Rejected' && (app.form_data?.rejection_reason || app.form_data?.revocation_note) && (
                <div className="mx-4 sm:mx-5 mb-3.5">
                  <div className="rounded-xl bg-rose-50/80 border border-rose-200/90 p-3.5 shadow-2xs">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-rose-100 text-rose-600 border border-rose-200/80 shrink-0">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-rose-950 uppercase tracking-wide">Rejection Reason</span>
                        <p className="text-xs font-semibold text-rose-900 leading-relaxed mt-1">
                          {app.form_data?.rejection_reason || app.form_data?.revocation_note}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="px-5 pb-4">
                <button
                  type="button"
                  onClick={() => setReviewApp(app)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-slate-500" />
                  Review Submitted Details
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <ApplicationReviewModal
        isOpen={!!reviewApp}
        onClose={() => setReviewApp(null)}
        application={reviewApp}
      />
    </div>
  )
}
