'use client'

import React, { useState, useEffect, useMemo, useCallback, useDeferredValue, useRef } from 'react'
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
import { useBrandSearch } from '@/components/brand/BrandSearchContext'

const rejectionReasons = [
  'Aesthetic does not match brand style',
  'Low engagement rate / inactive audience',
  'Outside target demographic / city',
  'Too many competitor brand sponsorships',
  'Profile not verified / follower anomaly',
  'Other / criteria not satisfied',
]

const AVATAR_GRADIENTS = [
  'from-[#10b981] to-[#FF8A5B] shadow-[#10b981]/25',
  'from-violet-600 to-indigo-600 shadow-violet-500/25',
  'from-rose-500 to-pink-600 shadow-rose-500/25',
  'from-emerald-500 to-teal-600 shadow-emerald-500/25',
  'from-blue-600 to-cyan-500 shadow-blue-500/25',
  'from-amber-500 to-orange-600 shadow-amber-500/25',
]

export default function CreatorReviewStudioPage() {
  const { id: campaignId } = useParams<{ id: string }>()
  const cacheKey = `brand_creators_${campaignId}`
  const [creators, setCreators] = useState<BrandCreatorItem[]>(() => brandCache.get<BrandCreatorItem[]>(cacheKey) || [])
  const [allowBrandCuration, setAllowBrandCuration] = useState<boolean>(true)
  const [loading, setLoading] = useState(() => (brandCache.get<BrandCreatorItem[]>(cacheKey) || []).length === 0)
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const { searchQuery, setSearchQuery, setPlaceholder } = useBrandSearch()

  useEffect(() => {
    setPlaceholder('Search creator name, @handle, city, variant...')
  }, [setPlaceholder])

  const deferredSearch = useDeferredValue(searchQuery)
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set())
  const [actionInProgress, setActionInProgress] = useState<string | null>(null)

  // Rejection modal state
  const [rejectModalItem, setRejectModalItem] = useState<BrandCreatorItem | null>(null)
  const [selectedReason, setSelectedReason] = useState(rejectionReasons[0])
  const [customNote, setCustomNote] = useState('')

  const isFetchingRef = useRef(false)
  const lastFetchTimeRef = useRef<number>(0)

  // Fetch creators for this campaign
  const fetchCreators = useCallback(
    async (silent = false) => {
      if (isFetchingRef.current) return
      const now = Date.now()
      if (silent && now - lastFetchTimeRef.current < 20000) return

      isFetchingRef.current = true
      lastFetchTimeRef.current = now

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
        isFetchingRef.current = false
        if (!silent) setLoading(false)
      }
    },
    [campaignId, cacheKey]
  )

  useEffect(() => {
    const initialCached = brandCache.get<BrandCreatorItem[]>(cacheKey) || []
    fetchCreators(initialCached.length > 0)

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
  }, [fetchCreators])

  // Tab counts
  const counts = useMemo(() => {
    return {
      all: creators.length,
      pending: creators.filter((c) => c.brand_review_status === 'pending_brand_review' || c.brand_review_status === 'on_hold').length,
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
      // Only filter by status tabs when brand has curation permissions
      if (allowBrandCuration) {
        if (activeTab === 'pending' && creator.brand_review_status !== 'pending_brand_review') {
          return false
        }
        if (activeTab === 'approved' && creator.brand_review_status !== 'brand_approved') {
          return false
        }
        if (activeTab === 'rejected' && creator.brand_review_status !== 'brand_rejected') {
          return false
        }
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
  }, [creators, activeTab, deferredSearch, allowBrandCuration])

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
    <div
      className="space-y-3 pb-28 font-sans text-slate-900"
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Active Search Filter Banner (If search entered in Header) */}
      {searchQuery && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Searching for &ldquo;<strong>{searchQuery}</strong>&rdquo; • {filteredCreators.length} creator{filteredCreators.length === 1 ? '' : 's'} found
            </span>
          </div>
          <button
            onClick={() => setSearchQuery('')}
            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* ─── CREATOR SHORTLISTS TABLE VIEW (With Integrated Status Tabs in Controls Bar) ─── */}
      <DynamicDataTable<BrandCreatorItem>
        theme="light"
        keyField="application_id"
        tableLayout="fixed"
        minTableWidth="min-w-[760px]"
        hideSearch={true}
        hideHeaderOnMobile={true}
        loading={loading}
        data={filteredCreators}
        exportFilename={`thehype_campaign_${campaignId}_creators.csv`}
        controlsLeft={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Back to Campaigns */}
            <Link
              href="/brand/campaigns"
              className="p-1.5 rounded-none bg-slate-100 hover:bg-slate-200 text-slate-700 transition shrink-0 border border-slate-200"
              title="Back to Campaigns"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* When brand curation is enabled, show the status filter tabs and bulk select */}
            {allowBrandCuration ? (
              <>
                <div className="inline-flex items-center p-0.5 rounded-none bg-slate-100 border border-slate-200/80 gap-1 overflow-x-auto scrollbar-none">
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
                        className={`px-2.5 py-1 rounded-none text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? 'bg-white text-slate-900 shadow-2xs font-bold'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <span>{tab.label}</span>
                        <span
                          className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                            isActive ? 'bg-[#10b981] text-white' : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {tab.count}
                        </span>
                      </button>
                    )
                  })}
                </div>

                {filteredCreators.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="px-2.5 py-1 rounded-none text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shrink-0"
                  >
                    {selectedAppIds.size === filteredCreators.length ? 'Clear All' : 'Select All'}
                  </button>
                )}
              </>
            ) : (
              <span className="text-xs font-semibold text-slate-600 px-2 py-1 bg-slate-100 border border-slate-200">
                {creators.length} Creators
              </span>
            )}
          </div>
        }
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
              width: allowBrandCuration ? '26%' : '34%',
              minWidth: '180px',
              render: (c) => (
                <div className="flex items-center gap-2 min-w-0 max-w-full">
                  <div className="w-7 h-7 rounded-none bg-[#FFF2EF] border border-[#10b981]/25 text-[#D83B1C] font-black flex items-center justify-center shrink-0 text-[10px]">
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
              width: allowBrandCuration ? '12%' : '16%',
              minWidth: '85px',
              render: (c) => (
                <span className="font-bold text-slate-900 text-[11px] px-2 py-0.5 rounded-none bg-slate-100 border border-slate-200 whitespace-nowrap">
                  {formatFollowerCount(c.followers)}
                </span>
              ),
            },
            {
              key: 'city',
              header: 'City',
              sortable: true,
              width: allowBrandCuration ? '12%' : '16%',
              minWidth: '95px',
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
              width: allowBrandCuration ? '18%' : '20%',
              minWidth: '130px',
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
            ...(allowBrandCuration
              ? [
                  {
                    key: 'brand_review_status',
                    header: 'Status',
                    align: 'center' as const,
                    sortable: true,
                    width: '14%',
                    minWidth: '100px',
                    render: (c: BrandCreatorItem) => {
                      const isApproved = c.brand_review_status === 'brand_approved'
                      const isRejected = c.brand_review_status === 'brand_rejected'
                      const isOnHold = c.brand_review_status === 'on_hold'
                      return (
                        <span
                          className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-none border whitespace-nowrap inline-flex items-center justify-center shrink-0 ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isRejected
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : isOnHold
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-[#FFF2EF] text-[#D83B1C] border-[#10b981]/30'
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
                    header: '1-Click Decision',
                    align: 'right' as const,
                    sortable: false,
                    width: '18%',
                    minWidth: '140px',
                    render: (c: BrandCreatorItem) => (
                      <div className="flex items-center justify-end gap-1.5 shrink-0 whitespace-nowrap">
                        {c.brand_review_status === 'pending_brand_review' ||
                        c.brand_review_status === 'on_hold' ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(c.application_id, c.creator_name)}
                              disabled={actionInProgress === c.application_id}
                              className="h-6 px-2.5 rounded-none bg-[#10b981] hover:bg-[#047857] text-white font-bold text-[10px] shadow-sm transition flex items-center gap-1 cursor-pointer disabled:opacity-50 shrink-0"
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
                              className="h-6 w-6 rounded-none border border-slate-200 hover:border-red-300 hover:bg-red-50 text-slate-500 hover:text-red-600 flex items-center justify-center transition cursor-pointer shrink-0"
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
                ]
              : [
                  {
                    key: 'instagram_profile',
                    header: 'Profile',
                    align: 'right' as const,
                    sortable: false,
                    width: '14%',
                    minWidth: '110px',
                    render: (c: BrandCreatorItem) => (
                      <div className="flex items-center justify-end">
                        <a
                          href={`https://instagram.com/${c.instagram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 hover:text-[#10b981] bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-none transition"
                        >
                          <Instagram className="w-3 h-3 text-pink-600 shrink-0" />
                          <span>View Profile ↗</span>
                        </a>
                      </div>
                    ),
                  },
                ]
            ),
          ]}
        />

      {/* ─── FLOATING MOBILE BULK DECISION DOCK ─── */}
      {allowBrandCuration && selectedAppIds.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 sm:bottom-5 sm:inset-x-4 max-w-xl mx-auto z-40">
          <div className="p-3 sm:px-5 sm:py-3.5 sm:rounded-xl bg-[#172D3D] border-t sm:border border-white/10 shadow-2xl flex items-center justify-between gap-3 text-white">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#10b981] text-white flex items-center justify-center font-bold text-xs">
                {selectedAppIds.size}
              </div>
              <div>
                <p className="text-xs font-bold text-white">
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
                className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 text-red-200 font-bold text-xs cursor-pointer"
              >
                Reject ({selectedAppIds.size})
              </button>
              <button
                type="button"
                disabled={actionInProgress === 'bulk'}
                onClick={() => handleBulkAction(selectedCreatorItems, true)}
                className="px-3.5 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs shadow-xs cursor-pointer flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
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
              className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 cursor-default max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-5 h-5" />
                  <h3 className="font-bold text-base text-slate-800">Reject Creator</h3>
                </div>
                <button
                  onClick={() => setRejectModalItem(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 mb-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0">
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
                        className={`flex items-center gap-2.5 p-2 rounded-lg text-xs transition border cursor-pointer ${
                          selectedReason === reason
                            ? 'bg-red-50 border-red-200 text-red-700 font-semibold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="rejectionReason"
                          checked={selectedReason === reason}
                          onChange={() => setSelectedReason(reason)}
                          className="accent-red-600"
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
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-none focus:border-[#10b981] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRejectModalItem(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRejectSubmit}
                    disabled={actionInProgress === rejectModalItem.application_id}
                    className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
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
