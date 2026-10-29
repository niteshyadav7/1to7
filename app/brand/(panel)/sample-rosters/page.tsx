'use client'

import React, { useState, useEffect, useMemo, useDeferredValue, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookmarkPlus,
  Users,
  Search,
  Sparkles,
  Instagram,
  Check,
  CheckCircle2,
  Send,
  Video,
  MapPin,
  Clock,
  Loader2,
  X,
  Eye,
  ArrowUpRight,
  Flame,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SampleList, SampleListItem } from '@/types/sample-roster'
import { brandCache } from '@/lib/brand-cache'
import { useBrandSearch } from '@/components/brand/BrandSearchContext'

function formatCompactNumber(num: number): string {
  const n = Number(num) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('en-IN')
}

const AVATAR_GRADIENTS = [
  'from-[#10b981] to-[#FF8A5B] shadow-[#10b981]/25',
  'from-violet-600 to-indigo-600 shadow-violet-500/25',
  'from-rose-500 to-pink-600 shadow-rose-500/25',
  'from-emerald-500 to-teal-600 shadow-emerald-500/25',
  'from-blue-600 to-cyan-500 shadow-blue-500/25',
  'from-amber-500 to-orange-600 shadow-amber-500/25',
]

export default function BrandSampleRostersPage() {
  const cachedRosters = brandCache.get<SampleList[]>('brand_sample_rosters') || []
  const [rosters, setRosters] = useState<SampleList[]>(cachedRosters)
  const [loading, setLoading] = useState(cachedRosters.length === 0)
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(
    cachedRosters.length > 0 ? cachedRosters[0].id : null
  )
  const [activeRoster, setActiveRoster] = useState<SampleList | null>(null)
  const [creators, setCreators] = useState<SampleListItem[]>([])
  const [creatorsLoading, setCreatorsLoading] = useState(false)
  const [existingShortlist, setExistingShortlist] = useState<any>(null)

  // Selection & Search
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const { searchQuery, setSearchQuery, setPlaceholder } = useBrandSearch()

  useEffect(() => {
    setPlaceholder('Search creator name, @handle, city, niche...')
  }, [setPlaceholder])

  const deferredSearch = useDeferredValue(searchQuery)
  const [filterTab, setFilterTab] = useState<'all' | 'selected'>('all')
  const [showShortlistModal, setShowShortlistModal] = useState(false)
  const [submittingShortlist, setSubmittingShortlist] = useState(false)
  const [notes, setNotes] = useState('')
  const [pocName, setPocName] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  const [pocPhone, setPocPhone] = useState('')

  const isFetchingRef = useRef(false)
  const lastFetchTimeRef = useRef<number>(0)

  const fetchRosters = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return
    const now = Date.now()
    if (silent && now - lastFetchTimeRef.current < 20000) return

    isFetchingRef.current = true
    lastFetchTimeRef.current = now

    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/brand/sample-rosters', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && data.rosters) {
        const fetchedRosters: SampleList[] = data.rosters
        setRosters(fetchedRosters)
        brandCache.set('brand_sample_rosters', fetchedRosters)

        const urlRosterId =
          typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('rosterId')
            : null

        setSelectedRosterId((prevId) => {
          if (urlRosterId && fetchedRosters.some((r) => r.id === urlRosterId)) {
            return urlRosterId
          }
          if (prevId && fetchedRosters.some((r) => r.id === prevId)) {
            return prevId
          }
          return fetchedRosters.length > 0 ? fetchedRosters[0].id : null
        })
      } else if (!silent) {
        toast.error(data.error || 'Failed to load pitch decks')
      }
    } catch {
      if (!silent) toast.error('Failed to connect to brand portal service')
    } finally {
      isFetchingRef.current = false
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const initialList = brandCache.get<SampleList[]>('brand_sample_rosters') || []
    fetchRosters(initialList.length > 0)

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchRosters(true)
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [fetchRosters])

  useEffect(() => {
    if (selectedRosterId) {
      fetchRosterDetail(selectedRosterId)
    }
  }, [selectedRosterId])

  const fetchRosterDetail = async (id: string) => {
    const cachedDetail = brandCache.get<any>(`brand_roster_${id}`)
    if (cachedDetail) {
      // Instant 0ms render from SWR cache
      setActiveRoster(cachedDetail.roster)
      setCreators(cachedDetail.items || [])
      setExistingShortlist(cachedDetail.existing_shortlist || null)
      if (cachedDetail.existing_shortlist?.shortlisted_item_ids) {
        setSelectedIds(new Set<string>(cachedDetail.existing_shortlist.shortlisted_item_ids))
      }
    } else {
      setCreatorsLoading(true)
      setSelectedIds(new Set())
    }

    try {
      const res = await fetch(`/api/brand/sample-rosters/${id}`, { cache: 'no-store' })
      const data = await res.json()
      if (res.ok) {
        setActiveRoster(data.roster)
        setCreators(data.items || [])
        setExistingShortlist(data.existing_shortlist || null)
        brandCache.set(`brand_roster_${id}`, data)
        if (data.existing_shortlist?.shortlisted_item_ids) {
          const preSelected = new Set<string>(data.existing_shortlist.shortlisted_item_ids)
          setSelectedIds(preSelected)
        }
      } else if (!cachedDetail) {
        toast.error(data.error || 'Failed to load creator list')
      }
    } catch {
      if (!cachedDetail) toast.error('Failed to load roster creators')
    } finally {
      setCreatorsLoading(false)
    }
  }

  const canShortlist = activeRoster?.allow_brand_shortlisting !== false

  const toggleSelect = (id: string) => {
    if (!canShortlist) return
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (!canShortlist) return
    if (selectedIds.size === filteredCreators.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCreators.map((c) => c.id)))
    }
  }

  const filteredCreators = useMemo(() => {
    return creators.filter((c) => {
      if (filterTab === 'selected' && !selectedIds.has(c.id)) return false
      if (!deferredSearch.trim()) return true
      const q = deferredSearch.toLowerCase()
      return (
        c.creator_name.toLowerCase().includes(q) ||
        c.instagram_username.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.niche && c.niche.toLowerCase().includes(q))
      )
    })
  }, [creators, deferredSearch, filterTab, selectedIds])

  const handleSubmitShortlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRosterId || selectedIds.size === 0) {
      return toast.error('Please select at least 1 creator to shortlist')
    }

    const previousShortlist = existingShortlist
    const submittedIds = Array.from(selectedIds)

    // ⚡ Optimistic UI: Immediately update local state & close modal with zero delay
    setExistingShortlist({
      id: 'optimistic-' + Date.now(),
      shortlisted_item_ids: submittedIds,
      shortlisted_creators_count: submittedIds.length,
      status: 'new',
    })
    setShowShortlistModal(false)
    toast.success(`Shortlist (${submittedIds.length} creators) submitted to TheHype!`)

    setSubmittingShortlist(true)
    try {
      const res = await fetch(`/api/brand/sample-rosters/${selectedRosterId}/shortlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_item_ids: submittedIds,
          brand_feedback_notes: notes.trim() || undefined,
          brand_poc_name: pocName.trim() || undefined,
          brand_poc_email: pocEmail.trim() || undefined,
          brand_poc_phone: pocPhone.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit shortlist')

      // Update cache
      brandCache.invalidate(`brand_roster_${selectedRosterId}`)
      setNotes('')
    } catch (err: any) {
      // Rollback on failure
      setExistingShortlist(previousShortlist)
      toast.error(err.message || 'Failed to submit shortlist. Please try again.')
    } finally {
      setSubmittingShortlist(false)
    }
  }

  const isColVisible = (key: string) => {
    if (!activeRoster?.visible_columns) return true
    return (activeRoster.visible_columns as string[]).includes(key)
  }

  const totalFollowers = useMemo(
    () => creators.reduce((acc, c) => acc + (Number(c.followers) || 0), 0),
    [creators]
  )
  const totalViews = useMemo(
    () => creators.reduce((acc, c) => acc + (Number(c.avg_reels_views) || 0), 0),
    [creators]
  )

  return (
    <div
      className="space-y-4 pb-28 font-sans text-slate-900"
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-44 rounded-xl bg-slate-200/70" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="h-56 rounded-xl bg-slate-200/60" />
            <div className="h-56 rounded-xl bg-slate-200/60" />
            <div className="h-56 rounded-xl bg-slate-200/60" />
          </div>
        </div>
      ) : rosters.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-xl bg-white border border-dashed border-slate-300 p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF2EF] border border-[#10b981]/25 flex items-center justify-center mx-auto text-[#10b981]">
            <BookmarkPlus className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No Sample Pitch Decks Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Your TheHype Account Manager will publish curated creator rosters here for your upcoming campaigns.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ─── 1. HORIZONTAL SWIPEABLE DECK SWITCHER (Shown when > 1 deck exists) ─── */}
          {rosters.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between px-0.5">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Switch Pitch Deck ({rosters.length})
                </span>
                <span className="text-[10px] text-slate-400 sm:hidden">Swipe →</span>
              </div>

              <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5 overflow-x-auto pb-1 no-scrollbar snap-x">
                {rosters.map((r) => {
                  const isSelected = r.id === selectedRosterId
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRosterId(r.id)}
                      className={`min-w-[230px] sm:min-w-0 snap-start p-3.5 rounded-lg text-left transition-all cursor-pointer border relative overflow-hidden shrink-0 ${
                        isSelected
                          ? 'bg-slate-50 border-[#10b981] ring-1 ring-[#10b981] shadow-2xs'
                          : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-bold text-xs sm:text-sm text-slate-800 truncate">
                              {r.title}
                            </h3>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                              {r.category_niche || 'General'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
                            <span className="font-bold text-slate-700">
                              {r.items_count || 0} creators
                            </span>
                            <span>•</span>
                            <span>
                              {r.published_at
                                ? new Date(r.published_at).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                  })
                                : 'Recent'}
                            </span>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-md bg-[#10b981] text-white flex items-center justify-center shrink-0">
                            <Check className="h-3 w-3 stroke-[3]" />
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* ─── 2. ACTIVE ROSTER COMPACT HERO & CONTROLS ─── */}
          {activeRoster && (
            <div className="space-y-3.5">
              {/* Compact Hero + Search/Filter Card */}
              <div className="rounded-xl bg-white border border-slate-200/90 shadow-2xs overflow-hidden">
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        {activeRoster.category_niche || 'Curated Pitch Deck'}
                      </span>
                      {existingShortlist && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                          <span>
                            Shortlist Submitted ({existingShortlist.shortlisted_creators_count})
                          </span>
                        </span>
                      )}
                    </div>

                    <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight truncate">
                      {activeRoster.title}
                    </h1>

                    {activeRoster.pitch_note_to_brand && (
                      <p className="text-xs text-slate-500 line-clamp-2">
                        <strong className="text-slate-700 font-bold">KAM Note:</strong>{' '}
                        {activeRoster.pitch_note_to_brand}
                      </p>
                    )}
                  </div>

                  {/* Compact KPI Pills */}
                  <div className="grid grid-cols-3 gap-2 shrink-0">
                    <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-center min-w-[75px]">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                        Creators
                      </span>
                      <span className="text-base font-bold text-slate-800">
                        {creators.length}
                      </span>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-center min-w-[75px]">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-slate-400 block">
                        Reach
                      </span>
                      <span className="text-base font-bold text-slate-800">
                        {formatCompactNumber(totalFollowers)}
                      </span>
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center min-w-[75px]">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-600 block">
                        Selected
                      </span>
                      <span className="text-base font-bold text-emerald-700">
                        {selectedIds.size}/{creators.length}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Controls & Search Bar */}
                <div className="p-3 sm:p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search creator name, @handle, city, niche..."
                      className="w-full bg-white border border-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                    {canShortlist && (
                      <div className="inline-flex items-center p-0.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterTab('all')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            filterTab === 'all'
                              ? 'bg-slate-100 text-[#10b981]'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All ({creators.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterTab('selected')}
                          className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                            filterTab === 'selected'
                              ? 'bg-[#10b981] text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Selected ({selectedIds.size})
                        </button>
                      </div>
                    )}

                    {canShortlist ? (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer"
                      >
                        {selectedIds.size === filteredCreators.length &&
                        filteredCreators.length > 0
                          ? 'Clear All'
                          : 'Select All'}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Creators Table */}
              {creatorsLoading ? (
                <div className="bg-white rounded-xl border border-slate-200/80 p-6 space-y-3 animate-pulse">
                  <div className="h-8 bg-slate-200/70 rounded-lg w-1/3" />
                  <div className="h-10 bg-slate-100 rounded-lg w-full" />
                  <div className="h-10 bg-slate-100 rounded-lg w-full" />
                  <div className="h-10 bg-slate-100 rounded-lg w-full" />
                  <div className="h-10 bg-slate-100 rounded-lg w-full" />
                </div>
              ) : filteredCreators.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-xl border border-slate-200">
                  No creators found matching your search.
                </div>
              ) : (
                /* ─── COMPACT LIST VIEW ─── */
                <div className="rounded-none border border-slate-200 bg-white overflow-hidden shadow-2xs">
                  {/* Table Header Strip */}
                  <div className="bg-[#192231] text-white border-b border-[#243044] px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider">
                    <div className="flex items-center gap-2.5">
                      {canShortlist && (
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size === filteredCreators.length &&
                            filteredCreators.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-slate-600 accent-[#10b981] cursor-pointer h-4 w-4"
                        />
                      )}
                      <span>Creator & Performance Metrics</span>
                    </div>
                    <span>Reel & Shortlist</span>
                  </div>

                  {/* Responsive Creator Rows — Zero Horizontal Scroll */}
                  <div className="divide-y divide-slate-100">
                    {filteredCreators.map((creator, idx) => {
                      const isSelected = selectedIds.has(creator.id)
                      const gradientClass = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
                      return (
                        <div
                          key={creator.id}
                          onClick={() => toggleSelect(creator.id)}
                          className={`p-3 sm:px-5 sm:py-3.5 transition-colors ${
                            canShortlist ? 'cursor-pointer' : ''
                          } ${
                            isSelected
                              ? 'bg-gradient-to-r from-emerald-50/60 via-emerald-50/20 to-white'
                              : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              {canShortlist && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0 flex items-center"
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleSelect(creator.id)}
                                    className="rounded border-slate-300 accent-emerald-600 cursor-pointer h-4 w-4"
                                  />
                                </div>
                              )}

                              <div
                                className={`h-9 w-9 rounded-xl bg-gradient-to-br ${gradientClass} text-white font-black flex items-center justify-center shrink-0 text-xs shadow-xs`}
                              >
                                {creator.creator_name.charAt(0).toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                                    {creator.creator_name}
                                  </p>
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                                    #{idx + 1}
                                  </span>
                                </div>
                                <a
                                  href={`https://instagram.com/${creator.instagram_username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] text-pink-600 hover:underline inline-flex items-center gap-0.5 font-bold max-w-full"
                                >
                                  <span className="truncate">@{creator.instagram_username}</span>
                                  <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
                                </a>
                              </div>
                            </div>

                            <div
                              className="flex items-center gap-1.5 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isColVisible('sample_reel_url') && creator.sample_reel_url && (
                                <a
                                  href={creator.sample_reel_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-50 to-purple-50 hover:from-rose-100 hover:to-purple-100 text-pink-700 border border-pink-200/80 text-[11px] font-bold inline-flex items-center gap-1 transition-all"
                                >
                                  <Video className="h-3 w-3 text-pink-600 shrink-0" />
                                  <span>Reel</span>
                                </a>
                              )}

                              {canShortlist && (
                                <button
                                  type="button"
                                  onClick={() => toggleSelect(creator.id)}
                                  className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-extrabold cursor-pointer transition-all inline-flex items-center gap-1 ${
                                    isSelected
                                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xs'
                                      : 'bg-gradient-to-r from-[#10b981] to-[#059669] hover:from-[#047857] hover:to-[#10b981] text-white shadow-xs'
                                  }`}
                                >
                                  <Check className={`h-3 w-3 ${isSelected ? 'stroke-[3]' : ''}`} />
                                  <span>{isSelected ? 'Added' : 'Shortlist'}</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            className={`mt-2 flex items-center gap-1.5 flex-wrap ${
                              canShortlist ? 'pl-6 sm:pl-16' : 'pl-11'
                            }`}
                          >
                            {isColVisible('followers') && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/80 border border-indigo-200/60 text-[10px] font-bold text-indigo-950">
                                <span className="text-indigo-500 font-extrabold uppercase text-[9px]">
                                  Followers
                                </span>
                                <span>{formatCompactNumber(creator.followers)}</span>
                              </span>
                            )}

                            {isColVisible('avg_reels_views') && creator.avg_reels_views > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50/80 border border-violet-200/60 text-[10px] font-bold text-violet-950">
                                <span className="text-violet-500 font-extrabold uppercase text-[9px]">
                                  Views
                                </span>
                                <span>{formatCompactNumber(creator.avg_reels_views)}</span>
                              </span>
                            )}

                            {isColVisible('engagement_rate') && creator.engagement_rate > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/70 text-[10px] font-extrabold text-emerald-700">
                                <span className="text-emerald-500 uppercase text-[9px]">Eng</span>
                                <span>{creator.engagement_rate}%</span>
                              </span>
                            )}

                            {isColVisible('city') && creator.city && (
                              <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[90px]">{creator.city}</span>
                              </span>
                            )}

                            {isColVisible('brand_commercial') &&
                              Number(creator.brand_commercial) > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFF2EF] border border-[#10b981]/25 text-[10px] font-black text-[#D83B1C]">
                                  ₹{Number(creator.brand_commercial).toLocaleString('en-IN')}
                                </span>
                              )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── 4. STICKY MOBILE BOTTOM DOCK ─── */}
      {activeRoster && canShortlist && selectedIds.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 sm:bottom-5 sm:inset-x-4 max-w-xl mx-auto z-40">
          <div className="bg-[#172D3D] text-white border-t sm:border border-white/10 sm:rounded-xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-[#10b981] text-white flex items-center justify-center font-bold text-xs">
                {selectedIds.size}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Creators Selected</p>
                <p className="text-[10px] text-slate-300">Ready to send to your KAM</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowShortlistModal(true)}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Confirm Shortlist ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 5. SHORTLIST MODAL ─── */}
      <AnimatePresence>
        {showShortlistModal && activeRoster && (
          <div
            onClick={() => {
              if (!submittingShortlist) setShowShortlistModal(false)
            }}
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs cursor-pointer"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white border-t sm:border border-slate-200 rounded-t-2xl sm:rounded-xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 cursor-default max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#10b981] text-white shadow-xs">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      Submit Creator Shortlist
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sends directly to your TheHype Account Manager
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShortlistModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Target Pitch Roster:</span>
                  <strong className="text-slate-800 font-bold">{activeRoster.title}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Creators Selected:</span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
                    {selectedIds.size} Creators
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitShortlist} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                    Your Name / Reviewer POC (Optional)
                  </label>
                  <input
                    type="text"
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    placeholder="e.g. Vikram Mehta (Brand Manager)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                      POC Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={pocEmail}
                      onChange={(e) => setPocEmail(e.target.value)}
                      placeholder="vikram@brand.in"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                      POC Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={pocPhone}
                      onChange={(e) => setPocPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                    Campaign Requirements & Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. We love these creators for our campaign. Please confirm dispatch schedule."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] focus:bg-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowShortlistModal(false)}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingShortlist || selectedIds.size === 0}
                    className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {submittingShortlist ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Confirm Shortlist ({selectedIds.size})</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
