'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Instagram,
  MapPin,
  Search,
  Filter,
  Check,
  X,
  Sparkles,
  ArrowLeft,
  Loader2,
  ExternalLink,
  ShieldCheck,
  Package,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandCreatorItem } from '@/types/brand'
import { formatFollowerCount } from '@/lib/utils/brand-privacy-utils'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'
import { EllipsisTooltip } from '@/components/brand/EllipsisTooltip'

const rejectionReasons = [
  'Aesthetic does not match brand style',
  'Low engagement rate / inactive audience',
  'Outside target demographic / city',
  'Too many competitor brand sponsorships',
  'Profile not verified / follower anomaly',
  'Other / criteria not satisfied',
]

export default function CreatorReviewStudioPage() {
  const { id: campaignId } = useParams<{ id: string }>()
  const [creators, setCreators] = useState<BrandCreatorItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<BrandCreatorItem | null>(null)
  const [selectedReason, setSelectedReason] = useState(rejectionReasons[0])
  const [customNote, setCustomNote] = useState('')

  // Fetch creators for this campaign
  const fetchCreators = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/brand/campaigns/${campaignId}/creators`)
      const data = await res.json()
      if (res.ok && data.creators) {
        setCreators(data.creators)
      } else {
        toast.error(data.error || 'Failed to fetch creators')
      }
    } catch {
      toast.error('Network error loading creators')
    } finally {
      setLoading(false)
    }
  }, [campaignId])

  useEffect(() => {
    fetchCreators()
  }, [fetchCreators])

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: creators.length,
      pending: creators.filter((c) => c.brand_review_status === 'pending_brand_review').length,
      approved: creators.filter((c) => c.brand_review_status === 'brand_approved').length,
      rejected: creators.filter((c) => c.brand_review_status === 'brand_rejected').length,
    }
  }, [creators])

  // Filtered creators based on active tab
  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      if (activeTab === 'pending' && creator.brand_review_status !== 'pending_brand_review') {
        return false
      }
      if (activeTab === 'approved' && creator.brand_review_status !== 'brand_approved') {
        return false
      }
      if (activeTab === 'rejected' && creator.brand_review_status !== 'brand_rejected') {
        return false
      }
      return true
    })
  }, [creators, activeTab])

  // 1-Click Approve Action
  const handleApprove = async (applicationId: string, creatorName: string) => {
    try {
      setActionInProgress(applicationId)
      const res = await fetch(`/api/brand/campaigns/${campaignId}/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          application_ids: [applicationId],
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve creator')

      toast.success(`Approved ${creatorName}! Product sample dispatch is queued.`)
      
      setCreators((prev) =>
        prev.map((c) =>
          c.application_id === applicationId
            ? { ...c, brand_review_status: 'brand_approved', brand_reviewed_at: new Date().toISOString() }
            : c
        )
      )
    } catch (err: any) {
      toast.error(err.message || 'Approval failed')
    } finally {
      setActionInProgress(null)
    }
  }

  // Submit Rejection
  const handleRejectSubmit = async () => {
    if (!rejectModalItem) return

    try {
      setActionInProgress(rejectModalItem.application_id)
      const res = await fetch(`/api/brand/campaigns/${campaignId}/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          application_ids: [rejectModalItem.application_id],
          reason: selectedReason,
          notes: customNote.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject creator')

      toast.info(`Marked ${rejectModalItem.creator_name} as rejected`)

      setCreators((prev) =>
        prev.map((c) =>
          c.application_id === rejectModalItem.application_id
            ? {
                ...c,
                brand_review_status: 'brand_rejected',
                brand_rejection_reason: selectedReason,
                brand_reviewed_at: new Date().toISOString(),
              }
            : c
        )
      )

      setRejectModalItem(null)
      setCustomNote('')
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed')
    } finally {
      setActionInProgress(null)
    }
  }

  // Bulk Actions
  const handleBulkAction = async (selected: BrandCreatorItem[], isApprove: boolean) => {
    const ids = selected.map((s) => s.application_id)
    if (ids.length === 0) return

    try {
      setActionInProgress('bulk')
      const res = await fetch(`/api/brand/campaigns/${campaignId}/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isApprove ? 'batch_approve' : 'batch_reject',
          application_ids: ids,
          reason: isApprove ? undefined : 'Bulk rejected during brand screening',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process bulk decision')

      toast.success(
        isApprove
          ? `Approved ${ids.length} creators! Auto-dispatch queued.`
          : `Rejected ${ids.length} creators.`
      )

      setCreators((prev) =>
        prev.map((c) =>
          ids.includes(c.application_id)
            ? {
                ...c,
                brand_review_status: isApprove ? 'brand_approved' : 'brand_rejected',
                brand_reviewed_at: new Date().toISOString(),
              }
            : c
        )
      )
    } catch (err: any) {
      toast.error(err.message || 'Bulk action failed')
    } finally {
      setActionInProgress(null)
    }
  }

  return (
    <div className="space-y-6 pb-20 font-sans">
      {/* ─── BREADCRUMBS & TOP BAR ─── */}
      <div className="flex items-center gap-3">
        <Link
          href="/brand/campaigns"
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50 transition shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Creator Review Studio
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Review and 1-click approve shortlisted creators for sample dispatch.
          </p>
        </div>
      </div>

      {/* ─── PRODUCTION GRADE DYNAMIC DATA TABLE ─── */}
      <DynamicDataTable<BrandCreatorItem>
        theme="light"
        keyField="application_id"
        tableLayout="fixed"
        loading={loading}
        title="Campaign Creator Shortlists"
        subtitle="1-click approve creators or bulk select candidates for automated courier dispatch"
        data={filteredCreators}
        exportFilename={`campaign_${campaignId}_creators.csv`}
        searchPlaceholder="Search creator handle, name, city, or sample..."
        filterTabs={{
          key: 'status',
          options: [
            { label: 'Pending Review', value: 'pending', count: counts.pending },
            { label: 'Approved', value: 'approved', count: counts.approved },
            { label: 'Rejected', value: 'rejected', count: counts.rejected },
            { label: 'All Creators', value: 'all', count: counts.all },
          ],
          activeValue: activeTab,
          onChange: (val) => setActiveTab(val as any),
        }}
        bulkActions={[
          {
            label: 'Bulk 1-Click Approve',
            icon: Check,
            variant: 'default',
            onClick: async (selected) => {
              await handleBulkAction(selected, true)
            },
          },
          {
            label: 'Bulk Reject',
            icon: X,
            variant: 'danger',
            onClick: async (selected) => {
              await handleBulkAction(selected, false)
            },
          },
        ]}
        columns={[
          {
            key: 'creator_name',
            header: 'Creator & Instagram Profile',
            sortable: true,
            width: '26%',
            render: (c) => (
              <div className="flex items-center gap-2.5 min-w-0 max-w-full">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-900 font-bold flex items-center justify-center shrink-0 text-xs">
                  {c.creator_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <EllipsisTooltip text={c.creator_name} subtext={`@${c.instagram_username} • ${c.city || 'Pan India'}`}>
                    <div className="font-bold text-slate-900 text-xs sm:text-sm truncate cursor-default">
                      {c.creator_name}
                    </div>
                  </EllipsisTooltip>
                  <a
                    href={`https://instagram.com/${c.instagram_username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-pink-600 hover:text-pink-700 font-medium inline-flex items-center gap-1 truncate max-w-full"
                  >
                    <Instagram className="w-3 h-3 shrink-0" />
                    <span className="truncate">@{c.instagram_username}</span>
                  </a>
                </div>
              </div>
            ),
          },
          {
            key: 'follower_count',
            header: 'Followers',
            sortable: true,
            align: 'center',
            width: '12%',
            render: (c) => (
              <span className="font-bold text-slate-900 text-xs px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 whitespace-nowrap">
                {formatFollowerCount(c.follower_count)}
              </span>
            ),
          },
          {
            key: 'city',
            header: 'City',
            sortable: true,
            width: '12%',
            render: (c) => (
              <EllipsisTooltip text={c.city || 'Pan India'} subtext="Creator Location">
                <div className="inline-flex items-center gap-1 text-slate-600 text-xs truncate max-w-full cursor-default">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{c.city || 'Pan India'}</span>
                </div>
              </EllipsisTooltip>
            ),
          },
          {
            key: 'selected_variant',
            header: 'Selected Sample Kit',
            width: '20%',
            render: (c) => (
              c.selected_variant ? (
                <EllipsisTooltip text={c.selected_variant} subtext="Product Sample Choice">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs max-w-full min-w-0 overflow-hidden cursor-default">
                    <Package className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span className="truncate block min-w-0">{c.selected_variant}</span>
                  </div>
                </EllipsisTooltip>
              ) : (
                <span className="text-slate-400 text-xs italic">Standard Sample</span>
              )
            ),
          },
          {
            key: 'brand_review_status',
            header: 'Status',
            align: 'center',
            sortable: true,
            width: '14%',
            render: (c) => {
              const isApproved = c.brand_review_status === 'brand_approved'
              const isRejected = c.brand_review_status === 'brand_rejected'
              return (
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                      isApproved
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isRejected
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Pending Review'}
                  </span>
                  {c.brand_rejection_reason && (
                    <div className="text-[10px] text-red-600 mt-0.5 truncate max-w-[140px]" title={c.brand_rejection_reason}>
                      {c.brand_rejection_reason}
                    </div>
                  )}
                </div>
              )
            },
          },
          {
            key: 'actions',
            header: '1-Click Decision',
            align: 'right',
            sortable: false,
            width: '16%',
            render: (c) => (
              <div className="flex items-center justify-end gap-1.5">
                {c.brand_review_status === 'pending_brand_review' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApprove(c.application_id, c.creator_name)}
                      disabled={actionInProgress === c.application_id}
                      className="px-3 py-1.5 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {actionInProgress === c.application_id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Approve</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalItem(c)
                        setSelectedReason(rejectionReasons[0])
                        setCustomNote('')
                      }}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs transition cursor-pointer"
                      title="Decline Creator"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : c.brand_review_status === 'brand_approved' ? (
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-700 font-semibold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectModalItem(c)
                        setSelectedReason(rejectionReasons[0])
                        setCustomNote('')
                      }}
                      className="text-[11px] text-slate-400 hover:text-red-600 underline cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-semibold text-xs flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Rejected
                    </span>
                    <button
                      type="button"
                      onClick={() => handleApprove(c.application_id, c.creator_name)}
                      className="text-[11px] text-slate-400 hover:text-emerald-700 underline cursor-pointer"
                    >
                      Approve
                    </button>
                  </div>
                )}
              </div>
            ),
          },
        ]}
      />

      {/* ─── REJECTION REASON MODAL ─── */}
      <AnimatePresence>
        {rejectModalItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#1a1c1c]">Reject Creator</h3>
                </div>
                <button
                  onClick={() => setRejectModalItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-black transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 mb-4">
                Please select a reason for rejecting{' '}
                <strong>{rejectModalItem.creator_name}</strong> (@{rejectModalItem.instagram_username}).
              </p>

              {/* Reasons Radio List */}
              <div className="space-y-2 mb-4">
                {rejectionReasons.map((reason) => (
                  <label
                    key={reason}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                      selectedReason === reason
                        ? 'border-[#febd1c] bg-amber-50/50 text-slate-900 font-medium'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="rejectionReason"
                      checked={selectedReason === reason}
                      onChange={() => setSelectedReason(reason)}
                      className="mt-0.5 text-[#febd1c] focus:ring-[#febd1c]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {/* Optional Custom Note */}
              <div className="mb-5">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Internal Notes (Optional)
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="e.g. Try them next month for haircare"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#febd1c]"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRejectSubmit}
                  disabled={actionInProgress === rejectModalItem.application_id}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
