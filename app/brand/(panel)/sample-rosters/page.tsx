'use client'

import React, { useState, useEffect, useMemo, useDeferredValue } from 'react'
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
  LayoutGrid,
  List,
  Eye,
  ArrowUpRight,
  Flame,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SampleList, SampleListItem } from '@/types/sample-roster'
import { brandCache } from '@/lib/brand-cache'

function formatCompactNumber(num: number): string {
  const n = Number(num) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('en-IN')
}

const AVATAR_GRADIENTS = [
  'from-[#F95738] to-[#FF8A5B] shadow-[#F95738]/25',
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

  // Selection, Search & View Mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [filterTab, setFilterTab] = useState<'all' | 'selected'>('all')
  const [showShortlistModal, setShowShortlistModal] = useState(false)
  const [submittingShortlist, setSubmittingShortlist] = useState(false)
  const [notes, setNotes] = useState('')
  const [pocName, setPocName] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  const [pocPhone, setPocPhone] = useState('')

  useEffect(() => {
    // If cached, revalidate silently
    fetchRosters(cachedRosters.length > 0)

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
  }, [])

  const fetchRosters = async (silent = false) => {
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
      if (!silent) setLoading(false)
    }
  }

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
    <div className="space-y-4 pb-28 font-sans text-slate-900">
      {loading ? (
        <div className="space-y-4 animate-pulse">
          <div className="h-44 rounded-3xl bg-slate-200/70" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            <div className="h-56 rounded-3xl bg-slate-200/60" />
            <div className="h-56 rounded-3xl bg-slate-200/60" />
            <div className="h-56 rounded-3xl bg-slate-200/60" />
          </div>
        </div>
      ) : rosters.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-3xl bg-white border border-dashed border-slate-300 p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF2EF] border border-[#F95738]/25 flex items-center justify-center mx-auto text-[#F95738]">
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
                      className={`min-w-[230px] sm:min-w-0 snap-start p-3.5 rounded-2xl text-left transition-all cursor-pointer border relative overflow-hidden shrink-0 ${
                        isSelected
                          ? 'bg-gradient-to-br from-[#FFF2EF] via-white to-orange-50/40 border-[#F95738] ring-2 ring-[#F95738]/20 shadow-sm'
                          : 'bg-white text-slate-900 border-slate-200 hover:border-[#F95738]/40 shadow-2xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 truncate">
                              {r.title}
                            </h3>
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
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
                          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white flex items-center justify-center shrink-0 shadow-xs">
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
              <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
                {/* Dark Gradient Top Strip inside Card */}
                <div className="p-4 sm:p-5 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#2E1035] text-white relative overflow-hidden">
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#F95738]/25 rounded-full blur-2xl pointer-events-none" />
                  <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#F95738] to-[#FF7659] text-white text-[9px] font-extrabold uppercase tracking-wider">
                          <Flame className="h-2.5 w-2.5" />
                          <span>{activeRoster.category_niche || 'Curated Pitch'}</span>
                        </span>
                        {existingShortlist && (
                          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span>
                              Shortlist Submitted ({existingShortlist.shortlisted_creators_count})
                            </span>
                          </span>
                        )}
                      </div>

                      <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">
                        {activeRoster.title}
                      </h1>

                      {activeRoster.pitch_note_to_brand && (
                        <p className="text-xs text-slate-300 line-clamp-2">
                          <strong className="text-[#FF8A70]">KAM Note:</strong>{' '}
                          {activeRoster.pitch_note_to_brand}
                        </p>
                      )}
                    </div>

                    {/* Compact KPI Pills */}
                    <div className="grid grid-cols-3 gap-2 shrink-0">
                      <div className="px-3 py-1.5 rounded-2xl bg-white/10 border border-white/10 text-center">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-slate-300 block">
                          Creators
                        </span>
                        <span className="text-sm sm:text-base font-black text-white">
                          {creators.length}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-2xl bg-white/10 border border-white/10 text-center">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-indigo-300 block">
                          Reach
                        </span>
                        <span className="text-sm sm:text-base font-black text-white">
                          {formatCompactNumber(totalFollowers)}
                        </span>
                      </div>
                      <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-center">
                        <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-300 block">
                          Selected
                        </span>
                        <span className="text-sm sm:text-base font-black text-emerald-300">
                          {selectedIds.size}/{creators.length}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Controls & Search Bar */}
                <div className="p-3 sm:p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search creator name, @handle, city, niche..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
                    {canShortlist && (
                      <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterTab('all')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            filterTab === 'all'
                              ? 'bg-[#F95738] text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          All ({creators.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterTab('selected')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            filterTab === 'selected'
                              ? 'bg-emerald-600 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Selected ({selectedIds.size})
                        </button>
                      </div>
                    )}

                    {/* View Mode Toggle: Cards vs Compact List */}
                    <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          viewMode === 'grid'
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
                        <span>List</span>
                      </button>
                    </div>

                    {canShortlist ? (
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-[#F95738]/30 bg-[#FFF2EF] hover:bg-[#F95738] text-[#D83B1C] hover:text-white transition-colors cursor-pointer"
                      >
                        {selectedIds.size === filteredCreators.length &&
                        filteredCreators.length > 0
                          ? 'Clear All'
                          : 'Select All'}
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold">
                        <Eye className="w-3 h-3 text-amber-600" />
                        <span>View Only</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Creators Grid or Table */}
              {creatorsLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 animate-pulse">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-64 rounded-3xl bg-slate-200/60" />
                  ))}
                </div>
              ) : filteredCreators.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
                  No creators found matching your search.
                </div>
              ) : viewMode === 'grid' ? (
                /* ─── MOBILE-FIRST COLORFUL CARDS GRID ─── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredCreators.map((creator, idx) => {
                    const isSelected = selectedIds.has(creator.id)
                    const gradientClass = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]

                    return (
                      <div
                        key={creator.id}
                        onClick={() => toggleSelect(creator.id)}
                        className={`group rounded-3xl bg-white border transform-gpu transition-all duration-150 active:scale-[0.985] flex flex-col justify-between overflow-hidden relative ${
                          canShortlist ? 'cursor-pointer' : ''
                        } ${
                          isSelected
                            ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 bg-gradient-to-b from-emerald-50/30 via-white to-white'
                            : 'border-slate-200/90 hover:border-[#F95738]/50 hover:shadow-md shadow-xs'
                        }`}
                      >
                        <div
                          className={`h-1 w-full bg-gradient-to-r ${
                            isSelected
                              ? 'from-emerald-400 via-teal-500 to-emerald-600'
                              : gradientClass.split(' ').slice(0, 2).join(' ')
                          }`}
                        />

                        <div className="p-4 space-y-3.5">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md`}
                              >
                                {creator.creator_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-extrabold text-sm text-slate-900 truncate">
                                    {creator.creator_name}
                                  </h3>
                                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                                    #{idx + 1}
                                  </span>
                                </div>
                                <a
                                  href={`https://instagram.com/${creator.instagram_username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-700 hover:underline mt-0.5"
                                >
                                  <Instagram className="h-3 w-3 shrink-0 text-pink-500" />
                                  <span className="truncate">@{creator.instagram_username}</span>
                                  <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
                                </a>
                              </div>
                            </div>

                            {canShortlist && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  toggleSelect(creator.id)
                                }}
                                className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                                  isSelected
                                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
                                    : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:border-[#F95738] group-hover:text-[#F95738]'
                                }`}
                              >
                                <Check className={`h-4 w-4 ${isSelected ? 'stroke-[3]' : ''}`} />
                              </button>
                            )}
                          </div>

                          {(isColVisible('city') || creator.niche) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isColVisible('city') && (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-bold">
                                  <MapPin className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                                  <span className="truncate max-w-[130px]">
                                    {creator.city || 'Pan-India'}
                                  </span>
                                </span>
                              )}
                              {creator.niche && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-bold truncate max-w-[150px]">
                                  {creator.niche}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 3-Column Horizontal Metrics Strip */}
                          <div className="grid grid-cols-3 divide-x divide-slate-200/80 rounded-2xl bg-gradient-to-b from-slate-50/90 to-slate-100/50 border border-slate-200/80 py-2.5 px-1 text-center">
                            {isColVisible('followers') && (
                              <div className="px-1.5">
                                <span className="text-[9px] uppercase font-extrabold tracking-wider text-indigo-500 block">
                                  Followers
                                </span>
                                <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                                  {formatCompactNumber(creator.followers)}
                                </span>
                              </div>
                            )}

                            {isColVisible('avg_reels_views') && (
                              <div className="px-1.5">
                                <span className="text-[9px] uppercase font-extrabold tracking-wider text-violet-500 block">
                                  Avg Views
                                </span>
                                <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                                  {creator.avg_reels_views > 0
                                    ? formatCompactNumber(creator.avg_reels_views)
                                    : '—'}
                                </span>
                              </div>
                            )}

                            {isColVisible('engagement_rate') && (
                              <div className="px-1.5">
                                <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-600 block">
                                  Engagement
                                </span>
                                <span className="font-black text-emerald-600 text-xs sm:text-sm mt-0.5 block">
                                  {creator.engagement_rate > 0
                                    ? `${creator.engagement_rate}%`
                                    : '—'}
                                </span>
                              </div>
                            )}
                          </div>

                          {isColVisible('brand_commercial') &&
                            Number(creator.brand_commercial) > 0 && (
                              <div className="px-3 py-2 rounded-xl bg-[#FFF2EF] border border-[#F95738]/25 flex items-center justify-between">
                                <span className="text-[11px] text-[#D83B1C] font-bold">
                                  Commercial Rate
                                </span>
                                <span className="text-xs font-black text-[#D83B1C]">
                                  ₹{Number(creator.brand_commercial).toLocaleString('en-IN')}
                                </span>
                              </div>
                            )}
                        </div>

                        <div
                          className="px-4 pb-4 pt-1 flex items-center gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isColVisible('sample_reel_url') && creator.sample_reel_url && (
                            <a
                              href={creator.sample_reel_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-rose-50 via-pink-50 to-purple-50 hover:from-rose-100 hover:to-purple-100 border border-pink-200/80 text-pink-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                            >
                              <Video className="h-3.5 w-3.5 text-pink-600 shrink-0" />
                              <span>Sample Reel</span>
                              <ArrowUpRight className="h-3 w-3 opacity-70 shrink-0" />
                            </a>
                          )}

                          {canShortlist && (
                            <button
                              type="button"
                              onClick={() => toggleSelect(creator.id)}
                              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                isSelected
                                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                                  : 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white shadow-sm shadow-[#F95738]/20'
                              }`}
                            >
                              <Check
                                className={`h-3.5 w-3.5 ${isSelected ? 'stroke-[3]' : ''}`}
                              />
                              <span>{isSelected ? 'Shortlisted' : 'Shortlist'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                /* ─── ZERO-SCROLL MOBILE-FIRST COMPACT LIST VIEW ─── */
                <div className="rounded-3xl border border-slate-200/90 bg-white overflow-hidden shadow-xs">
                  {/* List Header Strip */}
                  <div className="bg-slate-50/90 border-b border-slate-200 px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    <div className="flex items-center gap-2.5">
                      {canShortlist && (
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.size === filteredCreators.length &&
                            filteredCreators.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-slate-300 accent-[#F95738] cursor-pointer h-4 w-4"
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
                                      : 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white shadow-xs'
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
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFF2EF] border border-[#F95738]/25 text-[10px] font-black text-[#D83B1C]">
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
          <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white border-t sm:border border-white/15 sm:rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-black text-xs shadow-sm">
                {selectedIds.size}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Creators Selected</p>
                <p className="text-[10px] text-orange-300 font-semibold">Ready to send to your KAM</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowShortlistModal(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-lg shadow-[#F95738]/30"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Confirm Shortlist ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 5. COLORFUL SHORTLIST MODAL ─── */}
      <AnimatePresence>
        {showShortlistModal && activeRoster && (
          <div
            onClick={() => {
              if (!submittingShortlist) setShowShortlistModal(false)
            }}
            className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-xs cursor-pointer"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 cursor-default max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#F95738] to-[#FF7659] text-white shadow-md shadow-[#F95738]/25">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
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
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Target Pitch Roster:</span>
                  <strong className="text-slate-900 font-bold">{activeRoster.title}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Creators Selected:</span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white"
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowShortlistModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingShortlist || selectedIds.size === 0}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white flex items-center justify-center gap-1.5 shadow-lg shadow-[#F95738]/25 disabled:opacity-50 cursor-pointer transition-all"
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
