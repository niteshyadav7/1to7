'use client'

import React, { useState, useEffect, useMemo, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Instagram,
  Video,
  MapPin,
  ExternalLink,
  Users,
  Send,
  Loader2,
  Check,
  X,
  AlertCircle,
  Search,
  LayoutGrid,
  List,
  Eye,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'
import { toast } from 'sonner'

function formatCompactNumber(num: number): string {
  const n = Number(num) || 0
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return n.toLocaleString('en-IN')
}

export default function PublicRosterViewerPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = use(params)
  const [roster, setRoster] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // UI & Filter state
  const [search, setSearch] = useState('')
  const [filterTab, setFilterTab] = useState<'all' | 'selected'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')

  // Shortlisting state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [pocName, setPocName] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  const [pocPhone, setPocPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submittedSuccess, setSubmittedSuccess] = useState(false)

  useEffect(() => {
    fetchRoster()
  }, [token])

  const fetchRoster = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/public/roster/${token}`)
      const data = await res.json()
      if (res.ok) {
        setRoster(data.roster)
        setItems(data.items || [])
        if (typeof document !== 'undefined' && data.roster) {
          document.title = `${data.roster.title} • ${data.roster.brand_name} | TheHype`
        }
      } else {
        setError(data.error || 'Failed to load presentation')
      }
    } catch {
      setError('Failed to connect to presentation service')
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (id: string) => {
    if (!roster?.allow_brand_shortlisting || submittedSuccess) return
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const selectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(items.map((i) => i.id))
    }
  }

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (filterTab === 'selected' && !selectedIds.includes(item.id)) return false
      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        (item.creator_name || '').toLowerCase().includes(q) ||
        (item.instagram_username || '').toLowerCase().includes(q) ||
        (item.city || '').toLowerCase().includes(q) ||
        (item.niche || '').toLowerCase().includes(q)
      )
    })
  }, [items, search, filterTab, selectedIds])

  // Aggregate Proposal Metrics
  const aggregateStats = useMemo(() => {
    const totalFollowers = items.reduce((acc, i) => acc + (Number(i.followers) || 0), 0)
    const totalViews = items.reduce((acc, i) => acc + (Number(i.avg_reels_views) || 0), 0)
    const engItems = items.filter((i) => Number(i.engagement_rate) > 0)
    const avgEng =
      engItems.length > 0
        ? (
            engItems.reduce((acc, i) => acc + Number(i.engagement_rate), 0) /
            engItems.length
          ).toFixed(1)
        : '—'
    return { totalFollowers, totalViews, avgEng }
  }, [items])

  const handleSubmitShortlist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedIds.length === 0) return toast.error('Please select at least one creator')

    setSubmitting(true)
    try {
      const res = await fetch(`/api/public/roster/${token}/shortlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shortlisted_item_ids: selectedIds,
          brand_poc_name: pocName.trim() || undefined,
          brand_poc_email: pocEmail.trim() || undefined,
          brand_poc_phone: pocPhone.trim() || undefined,
          brand_feedback_notes: notes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')

      setSubmittedSuccess(true)
      setShowSubmitModal(false)
      toast.success('Your shortlist has been submitted to TheHype Campaign Team!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit shortlist')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-6 text-zinc-900">
        <div className="h-10 w-10 rounded-xl bg-zinc-950 text-white flex items-center justify-center mb-3 shadow-sm">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-zinc-500">
          Loading Curated Pitch Deck...
        </p>
      </div>
    )
  }

  if (error || !roster) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex flex-col items-center justify-center p-4 text-zinc-900">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white border border-zinc-200 text-center space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6 text-zinc-900" />
          </div>
          <h2 className="text-base font-black text-zinc-950">Presentation Unavailable</h2>
          <p className="text-xs text-zinc-500 leading-relaxed">
            {error || 'This sample roster presentation link may have expired or was deactivated.'}
          </p>
        </div>
      </div>
    )
  }

  const visibleCols: string[] = roster.visible_columns || []
  const canShortlist = Boolean(roster.allow_brand_shortlisting)

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-zinc-950 selection:bg-zinc-950 selection:text-white pb-28 sm:pb-24">
      {/* ─── 1. STICKY MONOCHROME HEADER BAR ─── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-zinc-200/90">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-lg bg-zinc-950 flex items-center justify-center shrink-0 p-1 shadow-xs">
              <img
                src="/thehype-logo.png"
                alt="TheHype"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-zinc-950 tracking-tight">TheHype</span>
                <span className="text-zinc-300">•</span>
                <span className="text-[11px] font-bold text-zinc-600 truncate">
                  {roster.brand_name}
                </span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 leading-none mt-0.5">
                Influencer Pitch Deck
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle (Grid / List) */}
            <div className="inline-flex items-center p-0.5 rounded-lg bg-zinc-100 border border-zinc-200">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
                title="Card View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-zinc-950 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
                title="Compact List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {canShortlist && !submittedSuccess && (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={selectedIds.length === 0}
                className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-bold bg-zinc-950 hover:bg-zinc-800 text-white transition-all items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shadow-xs"
              >
                <Send className="h-3 w-3" />
                <span>Submit Shortlist ({selectedIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── 2. MAIN CONTAINER ─── */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-7 space-y-4 sm:space-y-6">
        {/* ─── EDITORIAL PITCH HERO CARD ─── */}
        <section className="bg-white rounded-2xl border border-zinc-200/90 p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.03)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-zinc-950 text-white">
                  {roster.category_niche || 'CURATED PITCH'}
                </span>
                {canShortlist ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 border border-zinc-200">
                    <CheckCircle2 className="h-3 w-3 text-zinc-950" />
                    1-Click Shortlisting Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 border border-zinc-200">
                    <Eye className="h-3 w-3 text-zinc-600" />
                    Curated Showcase • View Only
                  </span>
                )}
              </div>

              <h1 className="text-xl sm:text-3xl font-black text-zinc-950 tracking-tight leading-tight">
                {roster.title}
              </h1>

              <p className="text-xs text-zinc-500">
                Prepared by <strong className="text-zinc-900 font-bold">TheHype</strong> for{' '}
                <strong className="text-zinc-900 font-bold">{roster.brand_name}</strong>
              </p>

              {roster.description && (
                <p className="text-xs text-zinc-600 max-w-3xl leading-relaxed pt-1">
                  {roster.description}
                </p>
              )}
            </div>

            {submittedSuccess && (
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-950 text-white text-xs font-bold shrink-0">
                <Check className="h-4 w-4" />
                <span>Shortlist Submitted ({selectedIds.length})</span>
              </div>
            )}
          </div>

          {/* 4-Column Compact Monochrome KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="p-2.5 sm:p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Creators Pitched
              </span>
              <span className="text-base sm:text-lg font-black text-zinc-950 mt-0.5 block">
                {items.length}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Combined Reach
              </span>
              <span className="text-base sm:text-lg font-black text-zinc-950 mt-0.5 block">
                {formatCompactNumber(aggregateStats.totalFollowers)}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Est. Reel Views
              </span>
              <span className="text-base sm:text-lg font-black text-zinc-950 mt-0.5 block">
                {aggregateStats.totalViews > 0
                  ? formatCompactNumber(aggregateStats.totalViews)
                  : '—'}
              </span>
            </div>

            <div className="p-2.5 sm:p-3 rounded-xl bg-[#FAFAFA] border border-zinc-200/80">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                {canShortlist ? 'Your Selection' : 'Avg Engagement'}
              </span>
              <span className="text-base sm:text-lg font-black text-zinc-950 mt-0.5 block">
                {canShortlist
                  ? `${selectedIds.length} / ${items.length}`
                  : aggregateStats.avgEng !== '—'
                  ? `${aggregateStats.avgEng}%`
                  : '—'}
              </span>
            </div>
          </div>
        </section>

        {/* ─── 3. MOBILE-FIRST SEARCH, FILTER & BULK BAR ─── */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-zinc-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creator name, @handle, or city..."
              className="w-full bg-[#FAFAFA] border border-zinc-200 rounded-xl pl-8 pr-8 py-2 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills & Select All */}
          {canShortlist && (
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="inline-flex items-center p-0.5 rounded-xl bg-zinc-100 border border-zinc-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-zinc-950 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('selected')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterTab === 'selected'
                      ? 'bg-zinc-950 text-white shadow-2xs'
                      : 'text-zinc-600 hover:text-zinc-950'
                  }`}
                >
                  Shortlisted ({selectedIds.length})
                </button>
              </div>

              {!submittedSuccess && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-900 transition-colors cursor-pointer shrink-0"
                >
                  {selectedIds.length === items.length && items.length > 0
                    ? 'Clear All'
                    : 'Select All'}
                </button>
              )}
            </div>
          )}
        </section>

        {/* ─── 4. CREATOR ROSTER DISPLAY (GRID OR COMPACT LIST) ─── */}
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-10 text-center space-y-2">
            <p className="text-sm font-bold text-zinc-900">No creators match your filter</p>
            <p className="text-xs text-zinc-500">
              Try clearing your search query or switching back to All Creators.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setFilterTab('all')
              }}
              className="mt-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-zinc-950 text-white cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── 4A. MOBILE-FIRST EDITORIAL CARDS GRID ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredItems.map((item, idx) => {
              const isSelected = selectedIds.includes(item.id)
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (canShortlist && !submittedSuccess) toggleSelect(item.id)
                  }}
                  className={`group rounded-2xl bg-white border transition-all duration-150 flex flex-col justify-between overflow-hidden ${
                    canShortlist && !submittedSuccess ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-zinc-950 ring-1 ring-zinc-950 shadow-md'
                      : 'border-zinc-200/90 hover:border-zinc-400 shadow-[0_1px_3px_rgba(0,0,0,0.03)]'
                  }`}
                >
                  <div className="p-4 space-y-3.5">
                    {/* Top Row: Avatar + Name/Handle + Checkbox */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-11 w-11 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors ${
                            isSelected
                              ? 'bg-zinc-950 text-white'
                              : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                          }`}
                        >
                          {item.creator_name?.charAt(0)?.toUpperCase() || '#'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-zinc-950 truncate">
                              {item.creator_name}
                            </h3>
                            <span className="text-[10px] font-bold text-zinc-400">
                              #{idx + 1}
                            </span>
                          </div>

                          <a
                            href={`https://instagram.com/${item.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 hover:underline mt-0.5 max-w-full"
                          >
                            <Instagram className="h-3 w-3 shrink-0 text-zinc-900" />
                            <span className="truncate">@{item.instagram_username}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-60" />
                          </a>
                        </div>
                      </div>

                      {/* Top-Right Selection Button */}
                      {canShortlist && !submittedSuccess && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelect(item.id)
                          }}
                          className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-950 border-zinc-950 text-white shadow-xs'
                              : 'bg-white border-zinc-300 text-zinc-400 group-hover:border-zinc-900 group-hover:text-zinc-900'
                          }`}
                          aria-label={isSelected ? 'Remove from shortlist' : 'Add to shortlist'}
                        >
                          <Check className={`h-4 w-4 ${isSelected ? 'stroke-[3]' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Location & Niche Micro-Pills */}
                    {(visibleCols.includes('city') || item.niche) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {visibleCols.includes('city') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px] font-semibold">
                            <MapPin className="h-2.5 w-2.5 text-zinc-500 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {item.city || 'Pan India'}
                            </span>
                          </span>
                        )}
                        {item.niche && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 text-[10px] font-medium truncate max-w-[160px]">
                            {item.niche}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Unified 3-Column Horizontal Metrics Strip (Mobile-First!) */}
                    <div className="grid grid-cols-3 divide-x divide-zinc-200/80 rounded-xl bg-[#FAFAFA] border border-zinc-200/80 py-2.5 px-1 text-center">
                      {visibleCols.includes('followers') && (
                        <div className="px-1.5">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block">
                            Followers
                          </span>
                          <span className="font-black text-zinc-950 text-xs sm:text-sm mt-0.5 block">
                            {formatCompactNumber(item.followers)}
                          </span>
                        </div>
                      )}

                      {visibleCols.includes('avg_reels_views') && (
                        <div className="px-1.5">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block">
                            Avg Views
                          </span>
                          <span className="font-black text-zinc-950 text-xs sm:text-sm mt-0.5 block">
                            {item.avg_reels_views > 0
                              ? formatCompactNumber(item.avg_reels_views)
                              : '—'}
                          </span>
                        </div>
                      )}

                      {visibleCols.includes('engagement_rate') && (
                        <div className="px-1.5">
                          <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-400 block">
                            Engagement
                          </span>
                          <span className="font-black text-zinc-950 text-xs sm:text-sm mt-0.5 block">
                            {item.engagement_rate > 0 ? `${item.engagement_rate}%` : '—'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pitch note if available */}
                    {item.pitch_note && (
                      <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200/70 text-[11px] text-zinc-600 italic leading-relaxed">
                        &ldquo;{item.pitch_note}&rdquo;
                      </div>
                    )}

                    {/* Commercial Quote if visible */}
                    {visibleCols.includes('brand_commercial') &&
                      Number(item.brand_commercial) > 0 && (
                        <div className="px-3 py-2 rounded-xl bg-zinc-100/80 border border-zinc-200 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-600 font-semibold">
                            Quoted Commercial
                          </span>
                          <span className="text-xs font-black text-zinc-950">
                            ₹{Number(item.brand_commercial).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Card Footer: Side-by-Side Thumb Actions */}
                  <div
                    className="px-4 pb-4 pt-1 flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {visibleCols.includes('sample_reel_url') && item.sample_reel_url && (
                      <a
                        href={item.sample_reel_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-300 text-zinc-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Video className="h-3.5 w-3.5 text-zinc-900 shrink-0" />
                        <span>Sample Reel</span>
                        <ArrowUpRight className="h-3 w-3 opacity-60 shrink-0" />
                      </a>
                    )}

                    {canShortlist && !submittedSuccess && (
                      <button
                        type="button"
                        onClick={() => toggleSelect(item.id)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 border ${
                          isSelected
                            ? 'bg-zinc-950 text-white border-zinc-950 shadow-xs'
                            : 'bg-zinc-100 hover:bg-zinc-950 text-zinc-900 hover:text-white border-zinc-200 hover:border-zinc-950'
                        }`}
                      >
                        <Check className={`h-3.5 w-3.5 ${isSelected ? 'stroke-[3]' : ''}`} />
                        <span>{isSelected ? 'Shortlisted' : 'Shortlist'}</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          /* ─── 4B. COMPACT MONOCHROME LIST / TABLE VIEW ─── */
          <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.03)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAFAFA] text-zinc-500 text-[10px] font-bold uppercase tracking-wider border-b border-zinc-200">
                    {canShortlist && !submittedSuccess && (
                      <th className="py-3 px-3 w-10 text-center">
                        <input
                          type="checkbox"
                          checked={
                            selectedIds.length === items.length && items.length > 0
                          }
                          onChange={selectAll}
                          className="rounded border-zinc-300 accent-zinc-950 cursor-pointer h-3.5 w-3.5"
                        />
                      </th>
                    )}
                    <th className="py-3 px-3">Creator</th>
                    {visibleCols.includes('followers') && (
                      <th className="py-3 px-3 text-right">Followers</th>
                    )}
                    {visibleCols.includes('avg_reels_views') && (
                      <th className="py-3 px-3 text-right">Avg Views</th>
                    )}
                    {visibleCols.includes('engagement_rate') && (
                      <th className="py-3 px-3 text-right hidden sm:table-cell">Eng %</th>
                    )}
                    {visibleCols.includes('city') && (
                      <th className="py-3 px-3 hidden md:table-cell">Location</th>
                    )}
                    {visibleCols.includes('brand_commercial') && (
                      <th className="py-3 px-3 text-right">Quote</th>
                    )}
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredItems.map((item) => {
                    const isSelected = selectedIds.includes(item.id)
                    return (
                      <tr
                        key={item.id}
                        onClick={() => {
                          if (canShortlist && !submittedSuccess) toggleSelect(item.id)
                        }}
                        className={`transition-colors ${
                          canShortlist && !submittedSuccess ? 'cursor-pointer' : ''
                        } ${isSelected ? 'bg-zinc-100/70' : 'hover:bg-zinc-50'}`}
                      >
                        {canShortlist && !submittedSuccess && (
                          <td
                            className="py-2.5 px-3 text-center"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item.id)}
                              className="rounded border-zinc-300 accent-zinc-950 cursor-pointer h-3.5 w-3.5"
                            />
                          </td>
                        )}

                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                                isSelected
                                  ? 'bg-zinc-950 text-white'
                                  : 'bg-zinc-100 text-zinc-900 border border-zinc-200'
                              }`}
                            >
                              {item.creator_name?.charAt(0)?.toUpperCase() || '#'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-zinc-950 text-xs truncate max-w-[140px] sm:max-w-[200px]">
                                {item.creator_name}
                              </p>
                              <a
                                href={`https://instagram.com/${item.instagram_username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[11px] text-zinc-500 hover:text-zinc-950 hover:underline inline-flex items-center gap-0.5"
                              >
                                <span>@{item.instagram_username}</span>
                                <ArrowUpRight className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          </div>
                        </td>

                        {visibleCols.includes('followers') && (
                          <td className="py-2.5 px-3 text-right font-extrabold text-zinc-950">
                            {formatCompactNumber(item.followers)}
                          </td>
                        )}

                        {visibleCols.includes('avg_reels_views') && (
                          <td className="py-2.5 px-3 text-right font-semibold text-zinc-700">
                            {item.avg_reels_views > 0
                              ? formatCompactNumber(item.avg_reels_views)
                              : '—'}
                          </td>
                        )}

                        {visibleCols.includes('engagement_rate') && (
                          <td className="py-2.5 px-3 text-right hidden sm:table-cell font-bold text-zinc-900">
                            {item.engagement_rate > 0 ? `${item.engagement_rate}%` : '—'}
                          </td>
                        )}

                        {visibleCols.includes('city') && (
                          <td className="py-2.5 px-3 hidden md:table-cell text-zinc-600 text-[11px]">
                            {item.city || 'Pan India'}
                          </td>
                        )}

                        {visibleCols.includes('brand_commercial') && (
                          <td className="py-2.5 px-3 text-right font-bold text-zinc-950">
                            {item.brand_commercial
                              ? `₹${Number(item.brand_commercial).toLocaleString('en-IN')}`
                              : '—'}
                          </td>
                        )}

                        <td
                          className="py-2.5 px-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {visibleCols.includes('sample_reel_url') &&
                              item.sample_reel_url && (
                                <a
                                  href={item.sample_reel_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2.5 py-1 rounded-lg bg-white hover:bg-zinc-100 text-zinc-900 border border-zinc-300 text-[11px] font-bold inline-flex items-center gap-1"
                                >
                                  <Video className="h-3 w-3" />
                                  <span className="hidden sm:inline">Reel</span>
                                </a>
                              )}

                            {canShortlist && !submittedSuccess && (
                              <button
                                type="button"
                                onClick={() => toggleSelect(item.id)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-zinc-950 text-white border-zinc-950'
                                    : 'bg-zinc-100 hover:bg-zinc-950 text-zinc-900 hover:text-white border-zinc-200'
                                }`}
                              >
                                {isSelected ? '✓ Selected' : '+ Select'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* ─── 5. THUMB-FRIENDLY STICKY BOTTOM DOCK (MOBILE & DESKTOP) ─── */}
      {canShortlist && !submittedSuccess && (
        <div className="fixed bottom-0 inset-x-0 sm:bottom-5 sm:inset-x-4 max-w-xl mx-auto z-40">
          <div className="bg-zinc-950 text-white border-t sm:border border-zinc-800 sm:rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-black text-xs shrink-0">
                {selectedIds.length}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {selectedIds.length === 0
                    ? 'Tap creators to shortlist'
                    : `${selectedIds.length} of ${items.length} Creators Selected`}
                </p>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-[10px] text-zinc-400 hover:text-white underline cursor-pointer block"
                >
                  {selectedIds.length === items.length ? 'Clear selection' : 'Select all creators'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={selectedIds.length === 0}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-white hover:bg-zinc-100 text-zinc-950 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0 shadow-sm"
            >
              <Send className="h-3.5 w-3.5" />
              <span>Confirm Shortlist ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 6. MONOCHROME BLACK & WHITE SUBMISSION MODAL (MOBILE BOTTOM SHEET) ─── */}
      <AnimatePresence>
        {showSubmitModal && (
          <div
            onClick={() => {
              if (!submitting) setShowSubmitModal(false)
            }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white border-t sm:border border-zinc-200 rounded-t-3xl sm:rounded-2xl p-5 sm:p-6 shadow-2xl space-y-4 text-zinc-950 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-zinc-950 text-white flex items-center justify-center shrink-0">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-zinc-950">
                      Confirm Creator Shortlist
                    </h3>
                    <p className="text-xs text-zinc-500">
                      Sending <strong className="text-zinc-950">{selectedIds.length} creators</strong> to TheHype Team
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-950 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitShortlist} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    Your Name / Reviewer POC *
                  </label>
                  <input
                    type="text"
                    required
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full bg-[#FAFAFA] border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={pocEmail}
                      onChange={(e) => setPocEmail(e.target.value)}
                      placeholder="rajesh@brand.com"
                      className="w-full bg-[#FAFAFA] border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      Contact Phone
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
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    Campaign Notes / Feedback (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Approved these creators for the upcoming launch. Please share dispatch dates."
                    className="w-full bg-[#FAFAFA] border border-zinc-300 rounded-xl px-3.5 py-2.5 text-xs text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:border-zinc-950 focus:bg-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-zinc-600 hover:text-zinc-950 border border-zinc-200 hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold bg-zinc-950 hover:bg-zinc-800 text-white flex items-center justify-center gap-1.5 shadow-md disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Submit Shortlist ({selectedIds.length})</span>
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
