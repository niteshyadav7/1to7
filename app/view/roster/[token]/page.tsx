'use client'

import React, { useState, useEffect, useMemo, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Instagram,
  Video,
  MapPin,
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
  TrendingUp,
  Flame,
} from 'lucide-react'
import { toast } from 'sonner'

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
        if (data.existing_shortlist) {
          const rawIds = data.existing_shortlist.shortlisted_item_ids
          const savedIds = Array.isArray(rawIds) ? rawIds.map(String) : []
          setSelectedIds(savedIds)
          setSubmittedSuccess(true)
          if (data.existing_shortlist.brand_poc_name) setPocName(data.existing_shortlist.brand_poc_name)
          if (data.existing_shortlist.brand_poc_email) setPocEmail(data.existing_shortlist.brand_poc_email)
          if (data.existing_shortlist.brand_poc_phone) setPocPhone(data.existing_shortlist.brand_poc_phone)
          if (data.existing_shortlist.brand_feedback_notes) setNotes(data.existing_shortlist.brand_feedback_notes)
        }
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
    if (!roster?.allow_brand_shortlisting) return
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
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-900">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#F95738] to-[#FF8A5B] text-white flex items-center justify-center mb-3 shadow-lg shadow-[#F95738]/25">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-xs font-extrabold uppercase tracking-widest text-slate-500">
          Loading Curated Pitch Deck...
        </p>
      </div>
    )
  }

  if (error || !roster) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-slate-900">
        <div className="max-w-md w-full p-6 rounded-3xl bg-white border border-slate-200 text-center space-y-3 shadow-xl">
          <div className="h-12 w-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6 text-rose-500" />
          </div>
          <h2 className="text-base font-black text-slate-900">Presentation Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'This sample roster presentation link may have expired or was deactivated.'}
          </p>
        </div>
      </div>
    )
  }

  const visibleCols: string[] = roster.visible_columns || []
  const canShortlist = Boolean(roster.allow_brand_shortlisting)

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-[#F95738]/20 selection:text-[#D83B1C] pb-28 sm:pb-24">
      {/* ─── 1. STICKY PREMIUM HEADER BAR ─── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
        <div className="max-w-6xl mx-auto px-3.5 sm:px-6 h-14 flex items-center justify-between gap-2">
          {/* Brand Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center shrink-0 p-1 shadow-sm border border-slate-700">
              <img
                src="/thehype-logo.png"
                alt="TheHype"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-sm text-slate-900 tracking-tight">TheHype</span>
                <span className="text-slate-300">•</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FFF2EF] text-[#D83B1C] border border-[#F95738]/25 truncate">
                  {roster.brand_name}
                </span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 leading-none mt-0.5">
                Curated Talent Proposal
              </p>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-2 shrink-0">
            {/* View Mode Toggle (Grid / List) */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#F95738] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Card View"
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-[#F95738] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Compact List View"
              >
                <List className="h-3.5 w-3.5" />
              </button>
            </div>

            {canShortlist && (
              <button
                type="button"
                onClick={() => setShowSubmitModal(true)}
                disabled={selectedIds.length === 0}
                className="hidden sm:inline-flex px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white transition-all items-center gap-1.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shadow-md shadow-[#F95738]/20"
              >
                <Send className="h-3 w-3" />
                <span>{submittedSuccess ? `Update Shortlist (${selectedIds.length})` : `Submit Shortlist (${selectedIds.length})`}</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ─── 2. MAIN CONTAINER ─── */}
      <main className="max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 space-y-4 sm:space-y-5">
        {/* ─── VIBRANT PREMIUM PITCH HERO CARD ─── */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#2E1035] text-white p-5 sm:p-7 shadow-xl border border-white/10">
          {/* Ambient Glow Orbs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-[#F95738]/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="space-y-2 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#F95738] to-[#FF7659] text-white shadow-sm shadow-[#F95738]/30">
                    <Flame className="h-3 w-3" />
                    {roster.category_niche || 'CURATED PITCH'}
                  </span>
                  {canShortlist ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                      1-Click Shortlisting Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-slate-200 border border-white/15">
                      <Eye className="h-3 w-3 text-amber-300" />
                      Curated Showcase • View Only
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                  {roster.title}
                </h1>

                <p className="text-xs text-slate-300">
                  Prepared exclusively by <strong className="text-white font-bold">TheHype</strong>{' '}
                  for <strong className="text-[#FF8A5B] font-bold">{roster.brand_name}</strong>
                </p>

                {roster.description && (
                  <p className="text-xs text-slate-300/90 max-w-3xl leading-relaxed pt-0.5">
                    {roster.description}
                  </p>
                )}
              </div>

              {submittedSuccess && (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-500/25 shrink-0">
                  <Check className="h-4 w-4 stroke-[3]" />
                  <span>Shortlist Submitted ({selectedIds.length})</span>
                </div>
              )}
            </div>

            {/* 4-Column Glassmorphic Colorful KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-300 block">
                  Creators Pitched
                </span>
                <span className="text-base sm:text-xl font-black text-white mt-0.5 block">
                  {items.length}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-violet-300 block">
                  Combined Reach
                </span>
                <span className="text-base sm:text-xl font-black text-white mt-0.5 block">
                  {formatCompactNumber(aggregateStats.totalFollowers)}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-300 block">
                  Est. Reel Views
                </span>
                <span className="text-base sm:text-xl font-black text-white mt-0.5 block">
                  {aggregateStats.totalViews > 0
                    ? formatCompactNumber(aggregateStats.totalViews)
                    : '—'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block">
                  {canShortlist ? 'Shortlisted' : 'Avg Engagement'}
                </span>
                <span className="text-base sm:text-xl font-black text-white mt-0.5 block">
                  {canShortlist
                    ? `${selectedIds.length} / ${items.length}`
                    : aggregateStats.avgEng !== '—'
                    ? `${aggregateStats.avgEng}%`
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ─── 3. MOBILE-FIRST SEARCH, FILTER & BULK BAR ─── */}
        <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/90 shadow-xs">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search creator name, @handle, or city..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-8 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white transition-all"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills & Select All */}
          {canShortlist && (
            <div className="flex items-center justify-between sm:justify-end gap-2">
              <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterTab === 'all'
                      ? 'bg-[#F95738] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('selected')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    filterTab === 'selected'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Shortlisted ({selectedIds.length})
                </button>
              </div>

              {!submittedSuccess && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-[#F95738]/30 bg-[#FFF2EF] hover:bg-[#F95738] text-[#D83B1C] hover:text-white transition-colors cursor-pointer shrink-0"
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
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-2 shadow-xs">
            <p className="text-sm font-bold text-slate-900">No creators match your filter</p>
            <p className="text-xs text-slate-500">
              Try clearing your search query or switching back to All Creators.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                setFilterTab('all')
              }}
              className="mt-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#F95738] text-white cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          /* ─── 4A. MOBILE-FIRST COLORFUL PREMIUM CARDS GRID ─── */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            {filteredItems.map((item, idx) => {
              const isSelected = selectedIds.includes(item.id)
              const gradientClass = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (canShortlist) toggleSelect(item.id)
                  }}
                  className={`group rounded-3xl bg-white border transition-all duration-200 flex flex-col justify-between overflow-hidden relative ${
                    canShortlist ? 'cursor-pointer' : ''
                  } ${
                    isSelected
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-lg shadow-emerald-500/10 bg-gradient-to-b from-emerald-50/30 via-white to-white'
                      : 'border-slate-200/90 hover:border-[#F95738]/50 hover:shadow-md shadow-xs'
                  }`}
                >
                  {/* Top Accent Line */}
                  <div
                    className={`h-1 w-full bg-gradient-to-r ${
                      isSelected
                        ? 'from-emerald-400 via-teal-500 to-emerald-600'
                        : gradientClass.split(' ').slice(0, 2).join(' ')
                    }`}
                  />

                  <div className="p-4 space-y-3.5">
                    {/* Top Row: Vibrant Avatar + Name/Handle + Checkbox */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`h-11 w-11 rounded-2xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-md`}
                        >
                          {item.creator_name?.charAt(0)?.toUpperCase() || '#'}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-extrabold text-sm text-slate-900 truncate">
                              {item.creator_name}
                            </h3>
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                              #{idx + 1}
                            </span>
                          </div>

                          <a
                            href={`https://instagram.com/${item.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs font-bold text-pink-600 hover:text-pink-700 hover:underline mt-0.5 max-w-full"
                          >
                            <Instagram className="h-3 w-3 shrink-0 text-pink-500" />
                            <span className="truncate">@{item.instagram_username}</span>
                            <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
                          </a>
                        </div>
                      </div>

                      {/* Top-Right Selection Button */}
                      {canShortlist && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleSelect(item.id)
                          }}
                          className={`h-8 w-8 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/30'
                              : 'bg-slate-50 border-slate-200 text-slate-400 group-hover:border-[#F95738] group-hover:text-[#F95738]'
                          }`}
                          aria-label={isSelected ? 'Remove from shortlist' : 'Add to shortlist'}
                        >
                          <Check className={`h-4 w-4 ${isSelected ? 'stroke-[3]' : ''}`} />
                        </button>
                      )}
                    </div>

                    {/* Colorful Location & Niche Micro-Pills */}
                    {(visibleCols.includes('city') || item.niche) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {visibleCols.includes('city') && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60 text-[10px] font-bold">
                            <MapPin className="h-2.5 w-2.5 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[140px]">
                              {item.city || 'Pan India'}
                            </span>
                          </span>
                        )}
                        {item.niche && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 text-[10px] font-bold truncate max-w-[160px]">
                            {item.niche}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Unified 3-Column Horizontal Metrics Strip with Rich Accents */}
                    <div className="grid grid-cols-3 divide-x divide-slate-200/80 rounded-2xl bg-gradient-to-b from-slate-50/90 to-slate-100/50 border border-slate-200/80 py-2.5 px-1 text-center">
                      {visibleCols.includes('followers') && (
                        <div className="px-1.5">
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-indigo-500 block">
                            Followers
                          </span>
                          <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                            {formatCompactNumber(item.followers)}
                          </span>
                        </div>
                      )}

                      {visibleCols.includes('avg_reels_views') && (
                        <div className="px-1.5">
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-violet-500 block">
                            Avg Views
                          </span>
                          <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                            {item.avg_reels_views > 0
                              ? formatCompactNumber(item.avg_reels_views)
                              : '—'}
                          </span>
                        </div>
                      )}

                      {visibleCols.includes('engagement_rate') && (
                        <div className="px-1.5">
                          <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-600 block">
                            Engagement
                          </span>
                          <span className="font-black text-emerald-600 text-xs sm:text-sm mt-0.5 block">
                            {item.engagement_rate > 0 ? `${item.engagement_rate}%` : '—'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Pitch note if available */}
                    {item.pitch_note && (
                      <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200/70 text-[11px] text-amber-900 italic leading-relaxed">
                        &ldquo;{item.pitch_note}&rdquo;
                      </div>
                    )}

                    {/* Commercial Quote if visible */}
                    {visibleCols.includes('brand_commercial') &&
                      Number(item.brand_commercial) > 0 && (
                        <div className="px-3 py-2 rounded-xl bg-[#FFF2EF] border border-[#F95738]/25 flex items-center justify-between">
                          <span className="text-[11px] text-[#D83B1C] font-bold">
                            Commercial Quote
                          </span>
                          <span className="text-xs font-black text-[#D83B1C]">
                            ₹{Number(item.brand_commercial).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                  </div>

                  {/* Card Footer: Vibrant Side-by-Side Thumb Actions */}
                  <div
                    className="px-4 pb-4 pt-1 flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {visibleCols.includes('sample_reel_url') && item.sample_reel_url && (
                      <a
                        href={item.sample_reel_url}
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
                        onClick={() => toggleSelect(item.id)}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/25'
                            : 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white shadow-sm shadow-[#F95738]/20'
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
          /* ─── 4B. ZERO-SCROLL MOBILE-FIRST COMPACT LIST VIEW ─── */
          <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
            {/* List Header Strip */}
            <div className="bg-slate-50/90 border-b border-slate-200 px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
              <div className="flex items-center gap-2.5">
                {canShortlist && (
                  <input
                    type="checkbox"
                    checked={selectedIds.length === items.length && items.length > 0}
                    onChange={selectAll}
                    className="rounded border-slate-300 accent-[#F95738] cursor-pointer h-4 w-4"
                  />
                )}
                <span>Creator & Performance Metrics</span>
              </div>
              <span>Reel & Shortlist</span>
            </div>

            {/* Responsive Creator Rows — Zero Horizontal Scroll */}
            <div className="divide-y divide-slate-100">
              {filteredItems.map((item, idx) => {
                const isSelected = selectedIds.includes(item.id)
                const gradientClass = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (canShortlist) toggleSelect(item.id)
                    }}
                    className={`p-3 sm:px-5 sm:py-3.5 transition-colors ${
                      canShortlist ? 'cursor-pointer' : ''
                    } ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-50/60 via-emerald-50/20 to-white'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Top Line: Identity on Left + Action Buttons on Right */}
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
                              onChange={() => toggleSelect(item.id)}
                              className="rounded border-slate-300 accent-emerald-600 cursor-pointer h-4 w-4"
                            />
                          </div>
                        )}

                        <div
                          className={`h-9 w-9 rounded-xl bg-gradient-to-br ${gradientClass} text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs`}
                        >
                          {item.creator_name?.charAt(0)?.toUpperCase() || '#'}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-extrabold text-slate-900 text-xs sm:text-sm truncate">
                              {item.creator_name}
                            </p>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 shrink-0">
                              #{idx + 1}
                            </span>
                          </div>
                          <a
                            href={`https://instagram.com/${item.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[11px] text-pink-600 hover:underline inline-flex items-center gap-0.5 font-bold max-w-full"
                          >
                            <span className="truncate">@{item.instagram_username}</span>
                            <ArrowUpRight className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        </div>
                      </div>

                      {/* Right Actions — Always visible without horizontal scroll */}
                      <div
                        className="flex items-center gap-1.5 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {visibleCols.includes('sample_reel_url') && item.sample_reel_url && (
                          <a
                            href={item.sample_reel_url}
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
                            onClick={() => toggleSelect(item.id)}
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

                    {/* Second Line: Compact Colorful Metrics Strip (Fits 100% on Mobile) */}
                    <div
                      className={`mt-2 flex items-center gap-1.5 flex-wrap ${
                        canShortlist ? 'pl-6 sm:pl-16' : 'pl-11'
                      }`}
                    >
                      {visibleCols.includes('followers') && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-50/80 border border-indigo-200/60 text-[10px] font-bold text-indigo-950">
                          <span className="text-indigo-500 font-extrabold uppercase text-[9px]">
                            Followers
                          </span>
                          <span>{formatCompactNumber(item.followers)}</span>
                        </span>
                      )}

                      {visibleCols.includes('avg_reels_views') && item.avg_reels_views > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50/80 border border-violet-200/60 text-[10px] font-bold text-violet-950">
                          <span className="text-violet-500 font-extrabold uppercase text-[9px]">
                            Views
                          </span>
                          <span>{formatCompactNumber(item.avg_reels_views)}</span>
                        </span>
                      )}

                      {visibleCols.includes('engagement_rate') && item.engagement_rate > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200/70 text-[10px] font-extrabold text-emerald-700">
                          <span className="text-emerald-500 uppercase text-[9px]">Eng</span>
                          <span>{item.engagement_rate}%</span>
                        </span>
                      )}

                      {visibleCols.includes('city') && item.city && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          <MapPin className="h-2.5 w-2.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[90px]">{item.city}</span>
                        </span>
                      )}

                      {visibleCols.includes('brand_commercial') &&
                        Number(item.brand_commercial) > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FFF2EF] border border-[#F95738]/25 text-[10px] font-black text-[#D83B1C]">
                            ₹{Number(item.brand_commercial).toLocaleString('en-IN')}
                          </span>
                        )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </main>

      {/* ─── 5. THUMB-FRIENDLY STICKY BOTTOM DOCK (MOBILE & DESKTOP) ─── */}
      {canShortlist && (
        <div className="fixed bottom-0 inset-x-0 sm:bottom-5 sm:inset-x-4 max-w-xl mx-auto z-40">
          <div className="bg-gradient-to-r from-[#0F172A] via-[#1E1B4B] to-[#0F172A] text-white border-t sm:border border-white/15 sm:rounded-2xl px-4 py-3 shadow-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
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
                  className="text-[10px] text-orange-300 hover:text-white underline cursor-pointer block font-semibold"
                >
                  {selectedIds.length === items.length ? 'Clear selection' : 'Select all creators'}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={selectedIds.length === 0}
              className="px-4 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed shrink-0 shadow-lg shadow-[#F95738]/30"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{submittedSuccess ? `Update Shortlist (${selectedIds.length})` : `Confirm Shortlist (${selectedIds.length})`}</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 6. PREMIUM SUBMISSION MODAL (MOBILE BOTTOM SHEET) ─── */}
      <AnimatePresence>
        {showSubmitModal && (
          <div
            onClick={() => {
              if (!submitting) setShowSubmitModal(false)
            }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-slate-950/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white border-t sm:border border-slate-200 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#F95738] to-[#FF7659] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#F95738]/25">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">
                      Confirm Creator Shortlist
                    </h3>
                    <p className="text-xs text-slate-500">
                      Sending <strong className="text-[#D83B1C]">{selectedIds.length} creators</strong> to TheHype Team
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitShortlist} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Your Name / Reviewer POC *
                  </label>
                  <input
                    type="text"
                    required
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={pocEmail}
                      onChange={(e) => setPocEmail(e.target.value)}
                      placeholder="rajesh@brand.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Contact Phone
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
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    Campaign Notes / Feedback (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Approved these creators for the upcoming launch. Please share dispatch dates."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold bg-gradient-to-r from-[#F95738] to-[#FF6B4A] hover:from-[#E04728] hover:to-[#F95738] text-white flex items-center justify-center gap-1.5 shadow-lg shadow-[#F95738]/25 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>{submittedSuccess ? `Update Shortlist (${selectedIds.length})` : `Submit Shortlist (${selectedIds.length})`}</span>
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
