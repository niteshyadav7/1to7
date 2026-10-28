'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
} from 'lucide-react'
import { toast } from 'sonner'
import type { SampleList, SampleListItem } from '@/types/sample-roster'

function formatCompactNumber(num: number): string {
  const n = Number(num) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('en-IN')
}

export default function BrandSampleRostersPage() {
  const [rosters, setRosters] = useState<SampleList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null)
  const [activeRoster, setActiveRoster] = useState<SampleList | null>(null)
  const [creators, setCreators] = useState<SampleListItem[]>([])
  const [creatorsLoading, setCreatorsLoading] = useState(false)
  const [existingShortlist, setExistingShortlist] = useState<any>(null)

  // Selection, Search & View Mode
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [filterTab, setFilterTab] = useState<'all' | 'selected'>('all')
  const [showShortlistModal, setShowShortlistModal] = useState(false)
  const [submittingShortlist, setSubmittingShortlist] = useState(false)
  const [notes, setNotes] = useState('')
  const [pocName, setPocName] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  const [pocPhone, setPocPhone] = useState('')

  useEffect(() => {
    fetchRosters()
  }, [])

  const fetchRosters = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/brand/sample-rosters')
      const data = await res.json()
      if (res.ok && data.rosters) {
        setRosters(data.rosters)
        if (data.rosters.length > 0) {
          setSelectedRosterId(data.rosters[0].id)
        }
      } else {
        toast.error(data.error || 'Failed to load pitch decks')
      }
    } catch {
      toast.error('Failed to connect to brand portal service')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedRosterId) {
      fetchRosterDetail(selectedRosterId)
    }
  }, [selectedRosterId])

  const fetchRosterDetail = async (id: string) => {
    setCreatorsLoading(true)
    setSelectedIds(new Set())
    try {
      const res = await fetch(`/api/brand/sample-rosters/${id}`)
      const data = await res.json()
      if (res.ok) {
        setActiveRoster(data.roster)
        setCreators(data.items || [])
        setExistingShortlist(data.existing_shortlist || null)
        if (data.existing_shortlist?.shortlisted_item_ids) {
          const preSelected = new Set<string>(data.existing_shortlist.shortlisted_item_ids)
          setSelectedIds(preSelected)
        }
      } else {
        toast.error(data.error || 'Failed to load creator list')
      }
    } catch {
      toast.error('Failed to load roster creators')
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
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        c.creator_name.toLowerCase().includes(q) ||
        c.instagram_username.toLowerCase().includes(q) ||
        (c.city && c.city.toLowerCase().includes(q)) ||
        (c.niche && c.niche.toLowerCase().includes(q))
      )
    })
  }, [creators, search, filterTab, selectedIds])

  const handleSubmitShortlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRosterId || selectedIds.size === 0) {
      return toast.error('Please select at least 1 creator to shortlist')
    }

    setSubmittingShortlist(true)
    try {
      const res = await fetch(`/api/brand/sample-rosters/${selectedRosterId}/shortlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          selected_item_ids: Array.from(selectedIds),
          brand_feedback_notes: notes.trim() || undefined,
          brand_poc_name: pocName.trim() || undefined,
          brand_poc_email: pocEmail.trim() || undefined,
          brand_poc_phone: pocPhone.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit shortlist')

      toast.success(data.message || `Shortlist submitted to TheHype!`)
      setShowShortlistModal(false)
      setNotes('')
      fetchRosterDetail(selectedRosterId)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit shortlist')
    } finally {
      setSubmittingShortlist(false)
    }
  }

  const isColVisible = (key: string) => {
    if (!activeRoster?.visible_columns) return true
    return (activeRoster.visible_columns as string[]).includes(key)
  }

  return (
    <div className="space-y-5 pb-28 font-sans text-zinc-950">
      {/* ─── 1. PAGE HEADER (Editorial Monochrome White Banner) ─── */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-zinc-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="max-w-3xl space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-zinc-950 text-white text-[10px] font-extrabold uppercase tracking-widest">
            <Sparkles className="h-3 w-3" />
            <span>Curated Pitch Decks</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-zinc-950 tracking-tight">
            Sample Creator Rosters
          </h1>
          <p className="text-xs text-zinc-500 leading-relaxed">
            Hand-picked influencer proposals curated for your brand. Review creator reach, watch sample Reels, and shortlist approved talent in 1 tap.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3 bg-white rounded-2xl border border-zinc-200">
          <Loader2 className="h-6 w-6 animate-spin text-zinc-950 mx-auto" />
          <p className="text-xs text-zinc-500 font-semibold">Loading pitch rosters...</p>
        </div>
      ) : rosters.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-2xl bg-white border border-dashed border-zinc-300 p-8">
          <div className="w-12 h-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto text-zinc-900">
            <BookmarkPlus className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-zinc-950">No Sample Pitch Decks Yet</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto leading-relaxed">
              Your TheHype Account Manager will publish curated creator rosters here for your upcoming campaigns.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* ─── 2. PITCHED ROSTERS SELECTOR STRIP ─── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-500">
                Available Pitch Decks ({rosters.length})
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {rosters.map((r) => {
                const isSelected = r.id === selectedRosterId
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedRosterId(r.id)}
                    className={`p-3.5 rounded-2xl text-left transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-zinc-950 text-white border-zinc-950 shadow-md'
                        : 'bg-white text-zinc-950 border-zinc-200 hover:border-zinc-400'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="font-extrabold text-xs sm:text-sm truncate">
                            {r.title}
                          </h3>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                              isSelected
                                ? 'bg-white/15 text-white'
                                : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                            }`}
                          >
                            {r.category_niche || 'General'}
                          </span>
                        </div>
                        {r.pitch_note_to_brand && (
                          <p
                            className={`text-[11px] italic line-clamp-1 ${
                              isSelected ? 'text-zinc-300' : 'text-zinc-500'
                            }`}
                          >
                            &ldquo;{r.pitch_note_to_brand}&rdquo;
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-white text-zinc-950 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-3 mt-2.5 pt-2.5 border-t text-[11px] ${
                        isSelected
                          ? 'border-white/15 text-zinc-300'
                          : 'border-zinc-100 text-zinc-500'
                      }`}
                    >
                      <span className="flex items-center gap-1 font-semibold">
                        <Users className="h-3 w-3" />
                        <strong>{r.items_count || 0}</strong> creators
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {r.published_at
                          ? new Date(r.published_at).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : 'Recent'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ─── 3. ACTIVE ROSTER WORKSPACE ─── */}
          {activeRoster && (
            <div className="space-y-4">
              {/* Roster Header & Controls Card */}
              <div className="rounded-2xl bg-white border border-zinc-200 p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-zinc-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-base sm:text-xl font-black text-zinc-950">
                        {activeRoster.title}
                      </h2>
                      <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200 font-bold">
                        {creators.length} Creators
                      </span>
                      {existingShortlist && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-zinc-950 text-white font-bold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>
                            Shortlist Submitted ({existingShortlist.shortlisted_creators_count})
                          </span>
                        </span>
                      )}
                    </div>

                    {activeRoster.pitch_note_to_brand && (
                      <p className="text-xs text-zinc-600 pt-1">
                        <strong className="text-zinc-950">KAM Note:</strong>{' '}
                        {activeRoster.pitch_note_to_brand}
                      </p>
                    )}
                  </div>

                  {/* Right Controls: View Switcher + Primary Action */}
                  <div className="flex items-center gap-2 self-start sm:self-auto">
                    <div className="inline-flex items-center p-0.5 rounded-xl bg-zinc-100 border border-zinc-200">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          viewMode === 'grid'
                            ? 'bg-white text-zinc-950 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-950'
                        }`}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Cards</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('table')}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                          viewMode === 'table'
                            ? 'bg-white text-zinc-950 shadow-2xs'
                            : 'text-zinc-500 hover:text-zinc-950'
                        }`}
                      >
                        <List className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Table</span>
                      </button>
                    </div>

                    {canShortlist ? (
                      <button
                        type="button"
                        disabled={selectedIds.size === 0}
                        onClick={() => setShowShortlistModal(true)}
                        className="px-4 py-2 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>Shortlist ({selectedIds.size})</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-bold">
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Only</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Search & Selection Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search creator name, @handle, city, niche..."
                      className="w-full bg-[#FAFAFA] border border-zinc-200 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white transition-colors"
                    />
                  </div>

                  {canShortlist && (
                    <div className="flex items-center justify-between sm:justify-end gap-2">
                      <div className="inline-flex items-center p-0.5 rounded-xl bg-zinc-100 border border-zinc-200 text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setFilterTab('all')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            filterTab === 'all'
                              ? 'bg-zinc-950 text-white'
                              : 'text-zinc-600 hover:text-zinc-950'
                          }`}
                        >
                          All ({creators.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setFilterTab('selected')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            filterTab === 'selected'
                              ? 'bg-zinc-950 text-white'
                              : 'text-zinc-600 hover:text-zinc-950'
                          }`}
                        >
                          Selected ({selectedIds.size})
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 cursor-pointer"
                      >
                        {selectedIds.size === filteredCreators.length &&
                        filteredCreators.length > 0
                          ? 'Clear All'
                          : 'Select All'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Creators Grid or Table */}
              {creatorsLoading ? (
                <div className="py-16 text-center space-y-2 bg-white rounded-2xl border border-zinc-200">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-950 mx-auto" />
                  <p className="text-xs text-zinc-500 font-semibold">Loading creator profiles...</p>
                </div>
              ) : filteredCreators.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 bg-white rounded-2xl border border-zinc-200">
                  No creators found matching your search.
                </div>
              ) : viewMode === 'grid' ? (
                /* ─── MOBILE-FIRST MONOCHROME CARDS GRID ─── */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredCreators.map((creator, idx) => {
                    const isSelected = selectedIds.has(creator.id)
                    return (
                      <div
                        key={creator.id}
                        onClick={() => toggleSelect(creator.id)}
                        className={`rounded-2xl bg-white border transition-all duration-150 flex flex-col justify-between overflow-hidden ${
                          canShortlist ? 'cursor-pointer' : ''
                        } ${
                          isSelected
                            ? 'border-zinc-950 ring-1 ring-zinc-950 shadow-md'
                            : 'border-zinc-200/90 hover:border-zinc-400 shadow-[0_1px_2px_rgba(0,0,0,0.03)]'
                        }`}
                      >
                        <div className="p-4 space-y-3.5">
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                                  isSelected
                                    ? 'bg-zinc-950 text-white'
                                    : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                                }`}
                              >
                                {creator.creator_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h3 className="font-extrabold text-sm text-zinc-950 truncate">
                                    {creator.creator_name}
                                  </h3>
                                  <span className="text-[10px] font-bold text-zinc-400">
                                    #{idx + 1}
                                  </span>
                                </div>
                                <a
                                  href={`https://instagram.com/${creator.instagram_username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 hover:underline mt-0.5"
                                >
                                  <Instagram className="h-3 w-3 shrink-0 text-zinc-900" />
                                  <span className="truncate">@{creator.instagram_username}</span>
                                  <ArrowUpRight className="h-3 w-3 shrink-0 opacity-60" />
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
                                    ? 'bg-zinc-950 border-zinc-950 text-white'
                                    : 'bg-white border-zinc-300 text-zinc-400 hover:border-zinc-950 hover:text-zinc-950'
                                }`}
                              >
                                <Check className={`h-4 w-4 ${isSelected ? 'stroke-[3]' : ''}`} />
                              </button>
                            )}
                          </div>

                          {(isColVisible('city') || creator.niche) && (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isColVisible('city') && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px] font-semibold">
                                  <MapPin className="h-2.5 w-2.5 text-zinc-500 shrink-0" />
                                  <span className="truncate max-w-[130px]">
                                    {creator.city || 'Pan-India'}
                                  </span>
                                </span>
                              )}
                              {creator.niche && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-medium truncate max-w-[150px]">
                                  {creator.niche}
                                </span>
                              )}
                            </div>
                          )}

                          {/* 3-Column Horizontal Metrics Strip */}
                          <div className="grid grid-cols-3 divide-x divide-zinc-200/80 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 py-2.5 px-1 text-center">
                            {isColVisible('followers') && (
                              <div className="px-1.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block">
                                  Followers
                                </span>
                                <span className="font-black text-zinc-950 text-xs sm:text-sm mt-0.5 block">
                                  {formatCompactNumber(creator.followers)}
                                </span>
                              </div>
                            )}

                            {isColVisible('avg_reels_views') && (
                              <div className="px-1.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block">
                                  Avg Views
                                </span>
                                <span className="font-black text-zinc-950 text-xs sm:text-sm mt-0.5 block">
                                  {creator.avg_reels_views > 0
                                    ? formatCompactNumber(creator.avg_reels_views)
                                    : '—'}
                                </span>
                              </div>
                            )}

                            {isColVisible('engagement_rate') && (
                              <div className="px-1.5">
                                <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block">
                                  Engagement
                                </span>
                                <span className="font-black text-zinc-950 text-xs sm:text-sm mt-0.5 block">
                                  {creator.engagement_rate > 0
                                    ? `${creator.engagement_rate}%`
                                    : '—'}
                                </span>
                              </div>
                            )}
                          </div>

                          {isColVisible('brand_commercial') &&
                            Number(creator.brand_commercial) > 0 && (
                              <div className="px-3 py-2 rounded-xl bg-zinc-100/80 border border-zinc-200 flex items-center justify-between">
                                <span className="text-[11px] text-zinc-600 font-semibold">
                                  Commercial Rate
                                </span>
                                <span className="text-xs font-black text-zinc-950">
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
                              className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Video className="h-3.5 w-3.5 shrink-0" />
                              <span>Sample Reel</span>
                              <ArrowUpRight className="h-3 w-3 opacity-60 shrink-0" />
                            </a>
                          )}

                          {canShortlist && (
                            <button
                              type="button"
                              onClick={() => toggleSelect(creator.id)}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                                isSelected
                                  ? 'bg-zinc-950 text-white border-zinc-950'
                                  : 'bg-zinc-100 hover:bg-zinc-950 text-zinc-900 hover:text-white border-zinc-200 hover:border-zinc-950'
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
                /* ─── COMPACT MONOCHROME TABLE VIEW ─── */
                <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFA] text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-200">
                        {canShortlist && (
                          <th className="p-3 w-9 text-center">
                            <input
                              type="checkbox"
                              checked={
                                selectedIds.size === filteredCreators.length &&
                                filteredCreators.length > 0
                              }
                              onChange={toggleSelectAll}
                              className="rounded border-zinc-300 accent-zinc-950 cursor-pointer"
                            />
                          </th>
                        )}
                        <th className="py-3 px-3">Creator & Instagram</th>
                        {isColVisible('followers') && (
                          <th className="py-3 px-3 text-right">Followers</th>
                        )}
                        {isColVisible('avg_reels_views') && (
                          <th className="py-3 px-3 text-right">Avg Views</th>
                        )}
                        {isColVisible('engagement_rate') && (
                          <th className="py-3 px-3 text-right">Eng. Rate</th>
                        )}
                        {isColVisible('city') && <th className="py-3 px-3">City & Niche</th>}
                        {isColVisible('sample_reel_url') && (
                          <th className="py-3 px-3 text-center">Sample Reel</th>
                        )}
                        {isColVisible('brand_commercial') && (
                          <th className="py-3 px-3 text-right">Commercial (₹)</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 bg-white">
                      {filteredCreators.map((creator) => {
                        const isSelected = selectedIds.has(creator.id)
                        return (
                          <tr
                            key={creator.id}
                            onClick={() => toggleSelect(creator.id)}
                            className={`transition-colors ${
                              canShortlist ? 'cursor-pointer' : ''
                            } ${isSelected ? 'bg-zinc-100/70' : 'hover:bg-zinc-50'}`}
                          >
                            {canShortlist && (
                              <td
                                className="p-3 w-9 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(creator.id)}
                                  className="rounded border-zinc-300 accent-zinc-950 cursor-pointer"
                                />
                              </td>
                            )}

                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-lg font-black flex items-center justify-center shrink-0 text-xs ${
                                    isSelected
                                      ? 'bg-zinc-950 text-white'
                                      : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                                  }`}
                                >
                                  {creator.creator_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-zinc-950 text-xs truncate max-w-[160px]">
                                    {creator.creator_name}
                                  </div>
                                  <a
                                    href={`https://instagram.com/${creator.instagram_username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[11px] text-zinc-500 hover:text-zinc-950 flex items-center gap-0.5 truncate max-w-[140px] font-medium"
                                  >
                                    <span>@{creator.instagram_username}</span>
                                    <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
                                  </a>
                                </div>
                              </div>
                            </td>

                            {isColVisible('followers') && (
                              <td className="py-2.5 px-3 text-right font-extrabold text-zinc-950">
                                {formatCompactNumber(creator.followers)}
                              </td>
                            )}

                            {isColVisible('avg_reels_views') && (
                              <td className="py-2.5 px-3 text-right font-semibold text-zinc-700">
                                {creator.avg_reels_views > 0
                                  ? formatCompactNumber(creator.avg_reels_views)
                                  : '—'}
                              </td>
                            )}

                            {isColVisible('engagement_rate') && (
                              <td className="py-2.5 px-3 text-right font-bold text-zinc-950">
                                {creator.engagement_rate > 0 ? `${creator.engagement_rate}%` : '—'}
                              </td>
                            )}

                            {isColVisible('city') && (
                              <td className="py-2.5 px-3">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1 text-zinc-800 text-[11px] font-medium">
                                    <MapPin className="h-2.5 w-2.5 text-zinc-400 shrink-0" />
                                    <span className="truncate max-w-[110px]">
                                      {creator.city || 'Pan-India'}
                                    </span>
                                  </div>
                                  {creator.niche && (
                                    <span className="text-[10px] text-zinc-500 truncate max-w-[110px] block">
                                      {creator.niche}
                                    </span>
                                  )}
                                </div>
                              </td>
                            )}

                            {isColVisible('sample_reel_url') && (
                              <td
                                className="py-2.5 px-3 text-center"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {creator.sample_reel_url ? (
                                  <a
                                    href={creator.sample_reel_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 text-zinc-900 inline-flex items-center gap-1 text-[11px] font-bold border border-zinc-300 transition-colors"
                                  >
                                    <Video className="h-3 w-3" />
                                    <span>Watch</span>
                                  </a>
                                ) : (
                                  <span className="text-zinc-400 text-[11px]">—</span>
                                )}
                              </td>
                            )}

                            {isColVisible('brand_commercial') && (
                              <td className="py-2.5 px-3 text-right font-black text-zinc-950">
                                {creator.brand_commercial
                                  ? `₹${Number(creator.brand_commercial).toLocaleString('en-IN')}`
                                  : '—'}
                              </td>
                            )}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── 4. STICKY MOBILE BOTTOM DOCK ─── */}
      {activeRoster && canShortlist && selectedIds.size > 0 && (
        <div className="fixed bottom-0 inset-x-0 sm:bottom-5 sm:inset-x-4 max-w-xl mx-auto z-40">
          <div className="bg-zinc-950 text-white border-t sm:border border-zinc-800 sm:rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-black text-xs">
                {selectedIds.size}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Creators Selected</p>
                <p className="text-[10px] text-zinc-400">Ready to send to your KAM</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowShortlistModal(true)}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white hover:bg-zinc-100 text-zinc-950 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Confirm Shortlist ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 5. MONOCHROME BLACK & WHITE SHORTLIST MODAL ─── */}
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
              className="w-full max-w-lg bg-white border-t sm:border border-zinc-200 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-950 cursor-default max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-zinc-950 text-white">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-950">
                      Submit Creator Shortlist
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Sends directly to your TheHype Account Manager
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowShortlistModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Target Pitch Roster:</span>
                  <strong className="text-zinc-950 font-bold">{activeRoster.title}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Creators Selected:</span>
                  <span className="px-2.5 py-0.5 rounded-md bg-zinc-950 text-white font-bold">
                    {selectedIds.size} Creators
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitShortlist} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-zinc-700 font-bold uppercase text-[11px] tracking-wider">
                    Your Name / Reviewer POC (Optional)
                  </label>
                  <input
                    type="text"
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    placeholder="e.g. Vikram Mehta (Brand Manager)"
                    className="w-full bg-[#FAFAFA] border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-zinc-700 font-bold uppercase text-[11px] tracking-wider">
                      POC Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={pocEmail}
                      onChange={(e) => setPocEmail(e.target.value)}
                      placeholder="vikram@brand.in"
                      className="w-full bg-[#FAFAFA] border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-zinc-700 font-bold uppercase text-[11px] tracking-wider">
                      POC Phone (Optional)
                    </label>
                    <input
                      type="tel"
                      value={pocPhone}
                      onChange={(e) => setPocPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-[#FAFAFA] border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-700 font-bold uppercase text-[11px] tracking-wider">
                    Campaign Requirements & Notes
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. We love these creators for our campaign. Please confirm dispatch schedule."
                    className="w-full bg-[#FAFAFA] border border-zinc-300 rounded-xl p-3 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowShortlistModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-950 border border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingShortlist || selectedIds.size === 0}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer transition-all"
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
