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
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandCreatorItem, BrandReviewStatus } from '@/types/brand'
import { formatFollowerCount } from '@/lib/utils/brand-privacy-utils'

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
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
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

  // Filtered creators based on tab and search query
  const filteredCreators = useMemo(() => {
    return creators.filter((creator) => {
      // Tab Filter
      if (activeTab === 'pending' && creator.brand_review_status !== 'pending_brand_review') {
        return false
      }
      if (activeTab === 'approved' && creator.brand_review_status !== 'brand_approved') {
        return false
      }
      if (activeTab === 'rejected' && creator.brand_review_status !== 'brand_rejected') {
        return false
      }

      // Search Filter
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const matchName = creator.creator_name.toLowerCase().includes(q)
        const matchHandle = creator.instagram_username.toLowerCase().includes(q)
        const matchCity = (creator.city || '').toLowerCase().includes(q)
        const matchVariant = (creator.selected_variant || '').toLowerCase().includes(q)
        if (!matchName && !matchHandle && !matchCity && !matchVariant) {
          return false
        }
      }

      return true
    })
  }, [creators, activeTab, search])

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
      
      // Update local state immediately
      setCreators((prev) =>
        prev.map((c) =>
          c.application_id === applicationId
            ? { ...c, brand_review_status: 'brand_approved', brand_reviewed_at: new Date().toISOString() }
            : c
        )
      )
      setSelectedIds((prev) => prev.filter((id) => id !== applicationId))
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

      // Update local state
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
  const handleBulkAction = async (isApprove: boolean) => {
    if (selectedIds.length === 0) return

    try {
      setActionInProgress('bulk')
      const res = await fetch(`/api/brand/campaigns/${campaignId}/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isApprove ? 'batch_approve' : 'batch_reject',
          application_ids: selectedIds,
          reason: isApprove ? undefined : 'Bulk rejected during brand screening',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to process bulk decision')

      toast.success(
        isApprove
          ? `Approved ${selectedIds.length} creators! Auto-dispatch queued.`
          : `Rejected ${selectedIds.length} creators.`
      )

      // Update local state
      setCreators((prev) =>
        prev.map((c) =>
          selectedIds.includes(c.application_id)
            ? {
                ...c,
                brand_review_status: isApprove ? 'brand_approved' : 'brand_rejected',
                brand_reviewed_at: new Date().toISOString(),
              }
            : c
        )
      )

      setSelectedIds([])
    } catch (err: any) {
      toast.error(err.message || 'Bulk action failed')
    } finally {
      setActionInProgress(null)
    }
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredCreators.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredCreators.map((c) => c.application_id))
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* ─── BREADCRUMBS & TOP BAR ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/brand/campaigns"
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50 transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#1a1c1c] tracking-tight">
              Creator Review Studio
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and 1-click approve shortlisted creators for sample dispatch.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search handle, name, city..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#febd1c] transition"
          />
        </div>
      </div>

      {/* ─── STATUS FILTER TABS ─── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-[#febd1c] text-black shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending Review</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 font-bold">
            {counts.pending}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'approved'
              ? 'bg-[#febd1c] text-black shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Approved</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 font-bold">
            {counts.approved}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'rejected'
              ? 'bg-[#febd1c] text-black shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Rejected</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 font-bold">
            {counts.rejected}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-[#febd1c] text-black shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>All Creators</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/10 font-bold">
            {counts.all}
          </span>
        </button>

        {filteredCreators.length > 0 && (
          <button
            onClick={toggleSelectAll}
            className="ml-auto text-xs font-semibold text-slate-500 hover:text-black py-2 px-3 rounded-xl border border-slate-200 bg-white transition cursor-pointer shrink-0"
          >
            {selectedIds.length === filteredCreators.length ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* ─── CREATOR CARDS GRID (Mobile First) ─── */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#febd1c]" />
          <p className="text-sm">Loading shortlisted creators...</p>
        </div>
      ) : filteredCreators.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#febd1c] mx-auto flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#1a1c1c]">No Creators in this Tab</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            {activeTab === 'pending'
              ? 'All shortlisted creators for this campaign have been reviewed!'
              : 'Try switching to another tab or clearing search filters.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredCreators.map((creator) => {
            const isSelected = selectedIds.includes(creator.application_id)
            const isApproved = creator.brand_review_status === 'brand_approved'
            const isRejected = creator.brand_review_status === 'brand_rejected'
            const isPending = creator.brand_review_status === 'pending_brand_review'

            return (
              <motion.div
                key={creator.application_id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`bg-white rounded-2xl border transition-all shadow-sm flex flex-col justify-between overflow-hidden ${
                  isSelected
                    ? 'border-[#febd1c] ring-2 ring-[#febd1c]/40'
                    : isApproved
                    ? 'border-emerald-200 bg-emerald-50/20'
                    : isRejected
                    ? 'border-red-200 bg-red-50/10 opacity-75'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Card Header & Profile */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Creator Avatar & Basic Info */}
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-[#2d3132] text-white flex items-center justify-center font-bold text-base shadow-sm overflow-hidden shrink-0">
                          {creator.profile_photo || creator.instagram_profile_pic ? (
                            <img
                              src={creator.profile_photo || creator.instagram_profile_pic || ''}
                              alt={creator.creator_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            creator.creator_name.slice(0, 2).toUpperCase()
                          )}
                        </div>
                        <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-xs">
                          <Instagram className="w-3.5 h-3.5 text-pink-600" />
                        </span>
                      </div>

                      <div className="space-y-0.5">
                        <h4 className="text-base font-bold text-[#1a1c1c] leading-tight">
                          {creator.creator_name}
                        </h4>
                        <a
                          href={`https://instagram.com/${creator.instagram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-pink-600 hover:underline flex items-center gap-1"
                        >
                          <span>@{creator.instagram_username}</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{creator.city ? `${creator.city}, ${creator.state || 'India'}` : 'Location unlisted'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Checkbox for Batch Action */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelectedIds((prev) =>
                          isSelected
                            ? prev.filter((id) => id !== creator.application_id)
                            : [...prev, creator.application_id]
                        )
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-[#febd1c] focus:ring-[#febd1c] cursor-pointer mt-1"
                    />
                  </div>

                  {/* Metrics Strip */}
                  <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-around text-center">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Followers</span>
                      <span className="text-sm font-bold text-[#1a1c1c]">
                        {formatFollowerCount(creator.followers)}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Creator ID</span>
                      <span className="text-xs font-mono font-semibold text-slate-600">
                        {creator.influencer_id || 'HY-Verified'}
                      </span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Status</span>
                      <span
                        className={`text-xs font-semibold ${
                          isApproved
                            ? 'text-emerald-700'
                            : isRejected
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        {isApproved ? 'Approved' : isRejected ? 'Rejected' : 'Needs Review'}
                      </span>
                    </div>
                  </div>

                  {/* Sample Variant Requested (If barter) */}
                  {creator.selected_variant && (
                    <div className="mt-3 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/60 flex items-center gap-2 text-xs text-amber-900">
                      <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">
                        <strong>Sample Choice:</strong> {creator.selected_variant}
                      </span>
                    </div>
                  )}

                  {/* Rejection Note (If rejected) */}
                  {isRejected && creator.brand_rejection_reason && (
                    <div className="mt-2.5 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                      <strong>Reason:</strong> {creator.brand_rejection_reason}
                    </div>
                  )}
                </div>

                {/* ─── ACTION BUTTONS (1-CLICK DECISION) ─── */}
                <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex items-center gap-2">
                  {isPending ? (
                    <>
                      <button
                        onClick={() => handleApprove(creator.application_id, creator.creator_name)}
                        disabled={actionInProgress === creator.application_id}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        {actionInProgress === creator.application_id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Approve</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => setRejectModalItem(creator)}
                        disabled={actionInProgress === creator.application_id}
                        className="py-2 px-3 rounded-xl bg-white hover:bg-red-50 border border-slate-200 text-red-600 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : isApproved ? (
                    <div className="w-full py-1.5 px-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Approved & Queued for Dispatch</span>
                      </div>
                      <button
                        onClick={() => setRejectModalItem(creator)}
                        className="text-[11px] text-slate-500 hover:text-red-600 underline cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : (
                    <div className="w-full py-1.5 px-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Rejected</span>
                      </div>
                      <button
                        onClick={() => handleApprove(creator.application_id, creator.creator_name)}
                        className="text-[11px] text-slate-500 hover:text-emerald-700 underline cursor-pointer"
                      >
                        Approve Instead
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ─── FLOATING BULK ACTIONS BAR (When Creators Selected) ─── */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="fixed bottom-16 md:bottom-6 inset-x-4 max-w-lg mx-auto z-50 bg-[#2d3132] text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl border border-white/10 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-xl bg-[#febd1c] text-black font-bold text-xs flex items-center justify-center">
                {selectedIds.length}
              </span>
              <span className="text-xs sm:text-sm font-semibold">Selected</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction(true)}
                disabled={actionInProgress === 'bulk'}
                className="py-2 px-4 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {actionInProgress === 'bulk' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Approve ({selectedIds.length})</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleBulkAction(false)}
                disabled={actionInProgress === 'bulk'}
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-red-500/20 text-white hover:text-red-300 text-xs font-medium transition cursor-pointer"
              >
                <span>Reject</span>
              </button>

              <button
                onClick={() => setSelectedIds([])}
                className="p-2 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
