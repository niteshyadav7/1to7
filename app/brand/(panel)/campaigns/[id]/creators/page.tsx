'use client'

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  XCircle,
  Clock,
  Instagram,
  MapPin,
  Search,
  Check,
  X,
  ArrowLeft,
  Loader2,
  Package,
  Truck,
  Copy,
  IndianRupee,
  LayoutGrid,
  List,
  ArrowUpRight,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandCreatorItem } from '@/types/brand'
import { formatFollowerCount } from '@/lib/utils/brand-privacy-utils'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'
import { EllipsisTooltip } from '@/components/brand/EllipsisTooltip'
import { brandCache } from '@/lib/brand-cache'

const rejectionReasons = [
  'Aesthetic does not match brand style',
  'Low engagement rate / inactive audience',
  'Outside target demographic / city',
  'Too many competitor brand sponsorships',
  'Profile not verified / follower anomaly',
  'Other / criteria not satisfied',
]

const AVATAR_GRADIENTS = [
  'from-[#F95738] to-[#FF8A5B] shadow-[#F95738]/25',
  'from-violet-600 to-indigo-600 shadow-violet-500/25',
  'from-rose-500 to-pink-600 shadow-rose-500/25',
  'from-emerald-500 to-teal-600 shadow-emerald-500/25',
  'from-blue-600 to-cyan-500 shadow-blue-500/25',
  'from-amber-500 to-orange-600 shadow-amber-500/25',
]

export default function CreatorReviewStudioPage() {
  const { id: campaignId } = useParams<{ id: string }>()
  const cacheKey = `brand_creators_${campaignId}`
  const cachedCreators = brandCache.get<BrandCreatorItem[]>(cacheKey) || []
  const [creators, setCreators] = useState<BrandCreatorItem[]>(cachedCreators)
  const [allowBrandCuration, setAllowBrandCuration] = useState<boolean>(true)
  const [loading, setLoading] = useState(cachedCreators.length === 0)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set())
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<BrandCreatorItem | null>(null)
  const [selectedReason, setSelectedReason] = useState(rejectionReasons[0])
  const [customNote, setCustomNote] = useState('')

  // Fetch creators for this campaign
  const fetchCreators = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true)
        const res = await fetch(`/api/brand/campaigns/${campaignId}/creators`, { cache: 'no-store' })
        const data = await res.json()
        if (res.ok && data.creators) {
          setCreators(data.creators)
          const canCurate = data.allow_brand_curation !== false
          setAllowBrandCuration(canCurate)
          if (!canCurate) {
            setSelectedAppIds(new Set())
          }
          brandCache.set(cacheKey, data.creators)
        } else if (!silent) {
          toast.error(data.error || 'Failed to fetch creators')
        }
      } catch {
        if (!silent) toast.error('Network error loading creators')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [campaignId, cacheKey]
  )

  useEffect(() => {
    fetchCreators(cachedCreators.length > 0)

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchCreators(true)
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [fetchCreators, cachedCreators.length])

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: creators.length,
      pending: creators.filter((c) => c.brand_review_status === 'pending_brand_review').length,
      approved: creators.filter((c) => c.brand_review_status === 'brand_approved').length,
      rejected: creators.filter((c) => c.brand_review_status === 'brand_rejected').length,
    }
  }, [creators])

  // Auto-switch from pending to all if there are 0 pending but > 0 approved/rejected on initial load
  useEffect(() => {
    if (!loading && creators.length > 0 && counts.pending === 0 && activeTab === 'pending') {
      setActiveTab('all')
    }
  }, [loading, creators.length, counts.pending, activeTab])

  // Filtered creators based on active tab & search
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
      if (deferredSearch.trim()) {
        const q = deferredSearch.toLowerCase()
        return (
          creator.creator_name?.toLowerCase().includes(q) ||
          creator.instagram_username?.toLowerCase().includes(q) ||
          creator.city?.toLowerCase().includes(q) ||
          creator.selected_variant?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [creators, activeTab, deferredSearch])

  const toggleSelectApp = (appId: string) => {
    const next = new Set(selectedAppIds)
    if (next.has(appId)) next.delete(appId)
    else next.add(appId)
    setSelectedAppIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedAppIds.size === filteredCreators.length && filteredCreators.length > 0) {
      setSelectedAppIds(new Set())
    } else {
      setSelectedAppIds(new Set(filteredCreators.map((c) => c.application_id)))
    }
  }

  // ⚡ 1-Click Instant Optimistic Approve Action
  const handleApprove = async (applicationId: string, creatorName: string) => {
    // 1. Optimistically update local state immediately
    const previousCreators = creators
    setCreators((prev) =>
      prev.map((c) =>
        c.application_id === applicationId
          ? {
              ...c,
              brand_review_status: 'brand_approved',
              brand_reviewed_at: new Date().toISOString(),
            }
          : c
      )
    )
    setSelectedAppIds((prev) => {
      const next = new Set(prev)
      next.delete(applicationId)
      return next
    })
    toast.success(`Approved ${creatorName}! Sample dispatch queued.`)

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

      brandCache.invalidate(cacheKey)
    } catch (err: any) {
      // Rollback on error
      setCreators(previousCreators)
      toast.error(err.message || 'Approval failed. Reverted state.')
    } finally {
      setActionInProgress(null)
    }
  }

  // ⚡ Instant Optimistic Rejection
  const handleRejectSubmit = async () => {
    if (!rejectModalItem) return

    const targetItem = rejectModalItem
    const previousCreators = creators

    // 1. Optimistically update local state & close modal
    setCreators((prev) =>
      prev.map((c) =>
        c.application_id === targetItem.application_id
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
    toast.info(`Marked ${targetItem.creator_name} as rejected`)

    try {
      setActionInProgress(targetItem.application_id)
      const res = await fetch(`/api/brand/campaigns/${campaignId}/creators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          application_ids: [targetItem.application_id],
          reason: selectedReason,
          notes: customNote.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject creator')

      brandCache.invalidate(cacheKey)
    } catch (err: any) {
      setCreators(previousCreators)
      toast.error(err.message || 'Rejection failed. Reverted state.')
    } finally {
      setActionInProgress(null)
    }
  }

  // ⚡ Instant Optimistic Bulk Actions
  const handleBulkAction = async (selected: BrandCreatorItem[], isApprove: boolean) => {
    const ids = selected.map((s) => s.application_id)
    if (ids.length === 0) return

    const previousCreators = creators

    // 1. Optimistic update
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
    setSelectedAppIds(new Set())
    toast.success(
      isApprove
        ? `Approved ${ids.length} creators! Auto-dispatch queued.`
        : `Rejected ${ids.length} creators.`
    )

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

      brandCache.invalidate(cacheKey)
    } catch (err: any) {
      setCreators(previousCreators)
      toast.error(err.message || 'Bulk action failed. Reverted.')
    } finally {
      setActionInProgress(null)
    }
  }

  const selectedCreatorItems = useMemo(
    () => creators.filter((c) => selectedAppIds.has(c.application_id)),
    [creators, selectedAppIds]
  )

  return (
    <div className="space-y-4 pb-28 font-sans text-slate-900">
      {/* ─── 1. COMPACT MOBILE-FIRST HEADER & FILTER BAR ─── */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#2E1035] text-white relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#F95738]/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <Link
                href="/brand/campaigns"
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white transition shrink-0 mt-0.5 sm:mt-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base sm:text-xl font-black text-white tracking-tight">
                    Campaign Creator Applications
                  </h1>
                  {!allowBrandCuration && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/25 border border-indigo-400/40 text-[10px] font-bold text-indigo-200">
                      <Eye className="w-3 h-3 text-indigo-300" />
                      <span>View-Only Catalog • Managed by Account Manager</span>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  {allowBrandCuration
                    ? '1-tap approve or reject shortlisted creators for product sample dispatch.'
                    : 'Browse curated creator profiles for your campaign. Final selection is managed by your Account Manager.'}
                </p>
              </div>
            </div>

            {/* Status Filter Pills inside Header */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 sm:pb-0">
              {[
                { key: 'pending', label: 'Pending', count: counts.pending },
                { key: 'approved', label: 'Approved', count: counts.approved },
                { key: 'rejected', label: 'Rejected', count: counts.rejected },
                { key: 'all', label: 'All', count: counts.all },
              ].map((tab) => {
                const isActive = activeTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-[#F95738] text-white shadow-sm'
                        : 'bg-white/10 text-slate-300 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isActive ? 'bg-black/25 text-white' : 'bg-white/10 text-slate-200'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Search + View Toggle + Select All Strip */}
        <div className="p-3 sm:p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creator name, @handle, city, sample variant..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#F95738] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#F95738] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>

            {allowBrandCuration && filteredCreators.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-[#F95738]/30 bg-[#FFF2EF] hover:bg-[#F95738] text-[#D83B1C] hover:text-white transition-colors cursor-pointer"
              >
                {selectedAppIds.size === filteredCreators.length ? 'Clear All' : 'Select All'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ─── 2. CREATOR CARDS OR TABLE ─── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-3xl bg-slate-200/60" />
          ))}
        </div>
      ) : viewMode === 'cards' ? (
        filteredCreators.length === 0 ? (
          <div className="py-14 text-center text-xs text-slate-500 bg-white rounded-3xl border border-slate-200 p-8">
            No creators found in this filter view.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredCreators.map((c, idx) => {
              const isApproved = c.brand_review_status === 'brand_approved'
              const isRejected = c.brand_review_status === 'brand_rejected'
              const isOnHold = c.brand_review_status === 'on_hold'
              const isSelected = selectedAppIds.has(c.application_id)
              const gradientClass = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
              const isVerifiedAddr =
                c.address_verification_status === 'Verified' && c.verified_address

              return (
                <div
                  key={c.application_id}
                  className={`rounded-3xl bg-white border transform-gpu transition-all duration-150 active:scale-[0.985] flex flex-col justify-between overflow-hidden shadow-xs ${
                    isApproved
                      ? 'border-emerald-500/70 bg-gradient-to-b from-emerald-50/20 via-white to-white'
                      : isRejected
                        ? 'border-red-200 bg-slate-50/40'
                        : isOnHold
                          ? 'border-amber-300 bg-amber-50/20'
                          : isSelected
                            ? 'border-[#F95738] ring-2 ring-[#F95738]/20'
                            : 'border-slate-200/90 hover:border-[#F95738]/50'
                  }`}
                >
                  <div
                    className={`h-1 w-full bg-gradient-to-r ${
                      isApproved
                        ? 'from-emerald-400 to-teal-600'
                        : isRejected
                          ? 'from-red-400 to-rose-500'
                          : isOnHold
                            ? 'from-amber-400 to-orange-500'
                            : gradientClass.split(' ').slice(0, 2).join(' ')
                    }`}
                  />

                  <div className="p-4 space-y-3">
                    {/* Top Row: Avatar + Name + Instagram + Checkbox */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm`}
                        >
                          {c.creator_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-sm text-slate-900 truncate">
                            {c.creator_name}
                          </h3>
                          <a
                            href={`https://instagram.com/${c.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:underline mt-0.5"
                          >
                            <Instagram className="h-3 w-3 shrink-0 text-pink-500" />
                            <span className="truncate">@{c.instagram_username}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
                          </a>
                        </div>
                      </div>

                      {allowBrandCuration && (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectApp(c.application_id)}
                          className="h-4 w-4 rounded border-slate-300 accent-[#F95738] cursor-pointer mt-1 shrink-0"
                        />
                      )}
                    </div>

                    {/* Metrics & Badges Row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200/70 text-[10px] font-extrabold">
                        <span>{formatFollowerCount(c.followers)} Followers</span>
                      </span>

                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                        <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                        <span className="truncate max-w-[110px]">{c.city || 'Pan India'}</span>
                      </span>

                      {c.client_commercial ? (
                        <span className="inline-flex items-center gap-0.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold">
                          <IndianRupee className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span>₹{c.client_commercial.toLocaleString('en-IN')}</span>
                        </span>
                      ) : null}
                    </div>

                    {/* Product Variant & Delivery Address Strip */}
                    <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-2.5 space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-slate-500 font-semibold flex items-center gap-1">
                          <Package className="w-3 h-3 text-[#F95738] shrink-0" />
                          <span>Sample:</span>
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {c.selected_variant || 'Standard Sample'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/60">
                        <span className="text-slate-500 font-semibold flex items-center gap-1">
                          <Truck className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>Address:</span>
                        </span>
                        {isVerifiedAddr && c.verified_address ? (
                          <button
                            type="button"
                            onClick={() => {
                              if (c.verified_address?.courier_text) {
                                navigator.clipboard.writeText(c.verified_address.courier_text)
                                toast.success(`Copied courier manifest for ${c.creator_name}`)
                              }
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            <span>
                              {c.verified_address.city}, {c.verified_address.pincode}
                            </span>
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                        ) : c.address_verification_status === 'Pending' ? (
                          <span className="text-[10px] font-bold text-amber-700">
                            Verification Pending
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Awaiting</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: 1-Tap Approve / Reject or View-Only Status */}
                  <div className="px-4 pb-4 pt-1">
                    {!allowBrandCuration ? (
                      <div
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border ${
                          isApproved
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : isRejected
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : isOnHold
                                ? 'bg-amber-50 border-amber-200 text-amber-800'
                                : 'bg-slate-50 border-slate-200 text-slate-600'
                        }`}
                      >
                        <span className="font-extrabold text-xs flex items-center gap-1.5">
                          {isApproved ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>Approved Profile</span>
                            </>
                          ) : isRejected ? (
                            <>
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span>Not Selected</span>
                            </>
                          ) : isOnHold ? (
                            <>
                              <Clock className="w-4 h-4 text-amber-600" />
                              <span>On Hold / Backup</span>
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 text-indigo-500" />
                              <span>Curated Profile • View Only</span>
                            </>
                          )}
                        </span>
                      </div>
                    ) : c.brand_review_status === 'pending_brand_review' || isOnHold ? (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(c.application_id, c.creator_name)}
                          disabled={actionInProgress === c.application_id}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-[#F95738]/20 transition cursor-pointer disabled:opacity-50"
                        >
                          {actionInProgress === c.application_id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                              <span>Approve Creator</span>
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
                          className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    ) : isApproved ? (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
                        <span className="text-emerald-800 font-extrabold text-xs flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Approved for Dispatch</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalItem(c)
                            setSelectedReason(rejectionReasons[0])
                            setCustomNote('')
                          }}
                          className="text-[11px] font-bold text-slate-500 hover:text-red-600 underline cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-red-50 border border-red-200">
                        <span className="text-red-700 font-extrabold text-xs flex items-center gap-1.5 truncate">
                          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                          <span className="truncate">{c.brand_rejection_reason || 'Rejected'}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleApprove(c.application_id, c.creator_name)}
                          className="text-[11px] font-bold text-emerald-700 hover:underline shrink-0 ml-2 cursor-pointer"
                        >
                          Approve
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      ) : (
        /* ─── DESKTOP TABLE VIEW ─── */
        <DynamicDataTable<BrandCreatorItem>
          theme="light"
          keyField="application_id"
          tableLayout="fixed"
          loading={loading}
          title="Campaign Creator Shortlists"
          subtitle={
            allowBrandCuration
              ? '1-click approve creators or bulk select candidates for automated courier dispatch'
              : 'View-only curated creator roster managed by your Account Manager'
          }
          data={filteredCreators}
          exportFilename={`thehype_campaign_${campaignId}_creators.csv`}
          searchPlaceholder="Search creator handle, name, city, or sample..."
          bulkActions={
            allowBrandCuration
              ? [
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
                ]
              : undefined
          }
          columns={[
            {
              key: 'creator_name',
              header: 'Creator & Instagram Profile',
              sortable: true,
              width: '26%',
              render: (c) => (
                <div className="flex items-center gap-2 min-w-0 max-w-full">
                  <div className="w-7 h-7 rounded-lg bg-[#FFF2EF] border border-[#F95738]/25 text-[#D83B1C] font-black flex items-center justify-center shrink-0 text-[10px]">
                    {c.creator_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <EllipsisTooltip
                      text={c.creator_name}
                      subtext={`@${c.instagram_username} • ${c.city || 'Pan India'}`}
                    >
                      <div className="font-bold text-slate-900 text-[11px] truncate cursor-default max-w-[140px]">
                        {c.creator_name}
                      </div>
                    </EllipsisTooltip>
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <a
                        href={`https://instagram.com/${c.instagram_username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-pink-600 hover:text-pink-700 font-medium inline-flex items-center gap-0.5 truncate max-w-[120px]"
                      >
                        <Instagram className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">@{c.instagram_username}</span>
                      </a>
                    </div>
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
                <span className="font-bold text-slate-900 text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-slate-200 whitespace-nowrap">
                  {formatFollowerCount(c.followers)}
                </span>
              ),
            },
            {
              key: 'city',
              header: 'City',
              sortable: true,
              width: '12%',
              render: (c) => (
                <div className="inline-flex items-center gap-1 text-slate-600 text-[10px] truncate max-w-full">
                  <MapPin className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                  <span className="truncate">{c.city || 'Pan India'}</span>
                </div>
              ),
            },
            {
              key: 'selected_variant',
              header: 'Sample & Commercial Quote',
              width: '20%',
              render: (c) => (
                <div className="flex flex-col gap-1 max-w-full">
                  <span className="text-[10px] font-semibold text-slate-700 truncate">
                    {c.selected_variant || 'Standard Sample'}
                  </span>
                  {c.client_commercial ? (
                    <span className="text-[10px] font-bold text-emerald-700">
                      ₹{c.client_commercial.toLocaleString('en-IN')}
                    </span>
                  ) : null}
                </div>
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
                const isOnHold = c.brand_review_status === 'on_hold'
                return (
                  <span
                    className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border whitespace-nowrap ${
                      isApproved
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : isRejected
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : isOnHold
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-[#FFF2EF] text-[#D83B1C] border-[#F95738]/30'
                    }`}
                  >
                    {isApproved
                      ? 'Approved'
                      : isRejected
                        ? 'Rejected'
                        : isOnHold
                          ? 'On Hold'
                          : 'Pending'}
                  </span>
                )
              },
            },
            {
              key: 'actions',
              header: allowBrandCuration ? '1-Click Decision' : 'Mode',
              align: 'right',
              sortable: false,
              width: '16%',
              render: (c) => (
                <div className="flex items-center justify-end gap-1">
                  {!allowBrandCuration ? (
                    <span className="text-slate-500 font-semibold text-[10px] inline-flex items-center gap-1">
                      <Eye className="w-3 h-3 text-indigo-500" />
                      <span>View Only</span>
                    </span>
                  ) : c.brand_review_status === 'pending_brand_review' ||
                    c.brand_review_status === 'on_hold' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleApprove(c.application_id, c.creator_name)}
                        disabled={actionInProgress === c.application_id}
                        className="h-6 px-2.5 rounded-md bg-[#F95738] hover:bg-[#E04728] text-white font-bold text-[10px] shadow-sm transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3 h-3 stroke-[2.5]" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectModalItem(c)
                          setSelectedReason(rejectionReasons[0])
                          setCustomNote('')
                        }}
                        className="h-6 w-6 rounded-md border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center transition cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </>
                  ) : c.brand_review_status === 'brand_approved' ? (
                    <span className="text-emerald-700 font-semibold text-[10px]">Approved</span>
                  ) : (
                    <span className="text-red-600 font-semibold text-[10px]">Rejected</span>
                  )}
                </div>
              ),
            },
          ]}
        />
      )}

      {/* ─── FLOATING MOBILE BULK DECISION DOCK ─── */}
      {allowBrandCuration && selectedAppIds.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 sm:bottom-5 sm:inset-x-4 max-w-xl mx-auto z-40">
          <div className="p-3 sm:px-5 sm:py-3.5 sm:rounded-2xl bg-[#0F172A]/95 backdrop-blur-xl border-t sm:border border-white/15 shadow-2xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#F95738] text-white flex items-center justify-center font-black text-xs">
                {selectedAppIds.size}
              </div>
              <div>
                <p className="text-xs font-extrabold text-white">
                  {selectedAppIds.size} Creator{selectedAppIds.size === 1 ? '' : 's'} Selected
                </p>
                <button
                  type="button"
                  onClick={() => setSelectedAppIds(new Set())}
                  className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
                >
                  Clear selection
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={actionInProgress === 'bulk'}
                onClick={() => handleBulkAction(selectedCreatorItems, false)}
                className="px-3 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 font-bold text-xs cursor-pointer"
              >
                Reject ({selectedAppIds.size})
              </button>
              <button
                type="button"
                disabled={actionInProgress === 'bulk'}
                onClick={() => handleBulkAction(selectedCreatorItems, true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-extrabold text-xs shadow-md cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Approve ({selectedAppIds.size})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── REJECTION REASON MODAL ─── */}
      <AnimatePresence>
        {rejectModalItem && (
          <div
            onClick={() => setRejectModalItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 cursor-default max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <h3 className="font-bold text-base text-[#1a1c1c]">Reject Creator</h3>
                </div>
                <button
                  onClick={() => setRejectModalItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#FFF2EF] border border-[#F95738]/20 text-[#D83B1C] font-black flex items-center justify-center text-xs shrink-0">
                  {rejectModalItem.creator_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <h4 className="font-bold text-xs text-slate-900 truncate">
                    {rejectModalItem.creator_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate">
                    @{rejectModalItem.instagram_username}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Rejection Reason
                  </label>
                  <div className="space-y-1.5">
                    {rejectionReasons.map((reason) => (
                      <label
                        key={reason}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-xs transition border cursor-pointer ${
                          selectedReason === reason
                            ? 'bg-[#FFF2EF] border-[#F95738]/40 text-[#D83B1C] font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rejectionReason"
                          checked={selectedReason === reason}
                          onChange={() => setSelectedReason(reason)}
                          className="accent-[#F95738]"
                        />
                        <span>{reason}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Additional Feedback (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Specific comments for the curation team..."
                    className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#F95738] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalItem(null)}
                    className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectSubmit}
                    disabled={actionInProgress === rejectModalItem.application_id}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {actionInProgress === rejectModalItem.application_id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    <span>Confirm Rejection</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
