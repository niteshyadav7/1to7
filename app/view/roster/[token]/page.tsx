'use client'

import React, { useState, useEffect, useMemo, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  Instagram,
  Video,
  MapPin,
  Send,
  Loader2,
  Check,
  X,
  AlertCircle,
  Eye,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { DynamicDataTable, ColumnDef } from '@/components/brand/DynamicDataTable'

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

  // Filter state
  const [filterTab, setFilterTab] = useState<'all' | 'selected'>('all')

  // Shortlisting state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [submitBrandName, setSubmitBrandName] = useState('')
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
        if (data.roster?.brand_name && data.roster.brand_name !== 'General Pitch') {
          setSubmitBrandName(data.roster.brand_name)
        }
        if (data.existing_shortlist) {
          const rawIds = data.existing_shortlist.shortlisted_item_ids
          const savedIds = Array.isArray(rawIds) ? rawIds.map(String) : []
          setSelectedIds(savedIds)
          setSubmittedSuccess(true)
          if (data.existing_shortlist.brand_name) setSubmitBrandName(data.existing_shortlist.brand_name)
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

  const displayedItems = useMemo(() => {
    if (filterTab === 'selected') {
      return items.filter((item) => selectedIds.includes(item.id))
    }
    return items
  }, [items, filterTab, selectedIds])

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
          brand_name: submitBrandName.trim() || roster?.brand_name || undefined,
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
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-slate-900 font-sans">
        <div className="h-10 w-10 rounded-full bg-[#161e2b] text-white flex items-center justify-center mb-3 shadow-md border border-[#243044]">
          <Loader2 className="h-5 w-5 animate-spin text-[#10b981]" />
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          Loading Curated Talent Roster...
        </p>
      </div>
    )
  }

  if (error || !roster) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-4 text-slate-900 font-sans">
        <div className="max-w-md w-full p-6 rounded-none bg-white border border-slate-200 text-center space-y-3 shadow-sm">
          <div className="h-12 w-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6 text-rose-500" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Presentation Unavailable</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            {error || 'This sample roster presentation link may have expired or was deactivated.'}
          </p>
        </div>
      </div>
    )
  }

  const visibleCols: string[] = roster.visible_columns || []
  const canShortlist = Boolean(roster.allow_brand_shortlisting)

  // Construct Data Table Columns
  const columns: ColumnDef<any>[] = []

  // 1. Selection Checkbox Column
  if (canShortlist) {
    columns.push({
      key: 'selection',
      header: '',
      width: '44px',
      align: 'center',
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(item.id)}
          onChange={() => toggleSelect(item.id)}
          className="rounded-none border-slate-300 text-[#10b981] accent-[#10b981] cursor-pointer h-4 w-4"
        />
      ),
    })
  }

  // 2. Creator & Instagram
  columns.push({
    key: 'creator_name',
    header: 'CREATOR & INSTAGRAM',
    sortable: true,
    width: canShortlist ? '26%' : '32%',
    render: (item) => (
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-full bg-slate-900 text-emerald-400 border border-slate-700 font-bold flex items-center justify-center shrink-0 text-xs">
          {item.creator_name?.charAt(0)?.toUpperCase() || '#'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-slate-900 text-xs truncate">
            {item.creator_name}
          </div>
          <a
            href={`https://instagram.com/${item.instagram_username}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-pink-600 hover:text-pink-700 hover:underline inline-flex items-center gap-0.5 truncate font-medium"
          >
            <Instagram className="w-3 h-3 text-pink-500 shrink-0" />
            <span>@{item.instagram_username}</span>
            <ArrowUpRight className="w-2.5 h-2.5 opacity-70 shrink-0" />
          </a>
        </div>
      </div>
    ),
  })

  // 3. Followers
  if (visibleCols.length === 0 || visibleCols.includes('followers')) {
    columns.push({
      key: 'followers',
      header: 'FOLLOWERS',
      sortable: true,
      width: '12%',
      render: (item) => (
        <span className="font-mono tabular-nums font-bold text-xs text-slate-900">
          {formatCompactNumber(item.followers)}
        </span>
      ),
    })
  }

  // 4. Avg Reels Views
  if (visibleCols.length === 0 || visibleCols.includes('avg_reels_views')) {
    columns.push({
      key: 'avg_reels_views',
      header: 'EST. REEL VIEWS',
      sortable: true,
      width: '13%',
      render: (item) => (
        <span className="font-mono tabular-nums text-xs text-slate-700">
          {item.avg_reels_views > 0 ? formatCompactNumber(item.avg_reels_views) : '—'}
        </span>
      ),
    })
  }

  // 5. Engagement Rate
  if (visibleCols.length === 0 || visibleCols.includes('engagement_rate')) {
    columns.push({
      key: 'engagement_rate',
      header: 'ENGAGEMENT',
      sortable: true,
      width: '11%',
      render: (item) => (
        <span className="font-mono tabular-nums font-bold text-xs text-emerald-600">
          {Number(item.engagement_rate) > 0 ? `${item.engagement_rate}%` : '—'}
        </span>
      ),
    })
  }

  // 6. City & Niche
  if (visibleCols.length === 0 || visibleCols.includes('city')) {
    columns.push({
      key: 'city',
      header: 'LOCATION & NICHE',
      sortable: true,
      width: '15%',
      render: (item) => (
        <div className="flex flex-col gap-0.5 min-w-0">
          {item.city && (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-700 truncate">
              <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
              <span>{item.city}</span>
            </span>
          )}
          {item.niche && (
            <span className="text-[10px] text-slate-400 truncate">
              {item.niche}
            </span>
          )}
          {!item.city && !item.niche && <span className="text-slate-400 text-xs">—</span>}
        </div>
      ),
    })
  }

  // 7. Sample Reel
  if (visibleCols.length === 0 || visibleCols.includes('sample_reel_url')) {
    columns.push({
      key: 'sample_reel_url',
      header: 'SAMPLE REEL',
      width: '12%',
      render: (item) =>
        item.sample_reel_url ? (
          <a
            href={item.sample_reel_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-none border border-pink-200 bg-pink-50 hover:bg-pink-100 text-pink-700 text-[11px] font-semibold transition"
          >
            <Video className="w-3 h-3 text-pink-600 shrink-0" />
            <span>Sample Reel ↗</span>
          </a>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    })
  }

  // 8. Commercial Quote
  if (visibleCols.includes('brand_commercial')) {
    columns.push({
      key: 'brand_commercial',
      header: 'COMMERCIAL',
      sortable: true,
      width: '12%',
      render: (item) => (
        <span className="font-mono tabular-nums font-bold text-xs text-emerald-700">
          {Number(item.brand_commercial) > 0
            ? `₹${Number(item.brand_commercial).toLocaleString('en-IN')}`
            : '—'}
        </span>
      ),
    })
  }

  // 9. Shortlist Action
  if (canShortlist) {
    columns.push({
      key: 'action',
      header: 'SHORTLIST',
      width: '12%',
      align: 'center',
      render: (item) => {
        const isSelected = selectedIds.includes(item.id)
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              toggleSelect(item.id)
            }}
            className={`w-full py-1.5 px-2 rounded-none text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
              isSelected
                ? 'bg-[#10b981] hover:bg-[#059669] text-white shadow-2xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
            }`}
          >
            {isSelected ? (
              <>
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>Shortlisted</span>
              </>
            ) : (
              <span>+ Shortlist</span>
            )}
          </button>
        )
      },
    })
  }

  return (
    <div
      className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-28 font-sans"
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* ─── 1. APPLE-STYLE CENTER FLOATING FROSTED GLASS HEADER ─── */}
      <header className="sticky top-0 z-40 w-full pt-3 pb-1 sm:pt-3.5 sm:pb-1.5 bg-[#F8FAFC]/85 backdrop-blur-md transition-all">
        <div className="max-w-[1440px] w-full mx-auto px-3.5 sm:px-5 lg:px-6">
          <div className="bg-white/95 backdrop-blur-2xl border border-slate-300/80 shadow-[0_4px_24px_rgba(15,23,42,0.08)] rounded-full px-4 sm:px-6 h-12 flex items-center justify-between gap-3">
            {/* Brand Identity */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-7 w-7 rounded-full bg-slate-900 border border-slate-700/80 overflow-hidden flex items-center justify-center shrink-0 p-0.5 shadow-xs">
                <img
                  src="https://thehype.in/img/logo.png"
                  alt="TheHype"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/thehype-logo.png'
                  }}
                />
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-extrabold text-xs sm:text-sm text-slate-950 tracking-tight">TheHype</span>
                <span className="text-slate-400 font-bold">•</span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/90 text-emerald-900 border border-emerald-300 truncate max-w-[140px] sm:max-w-[220px]">
                  {roster.brand_name}
                </span>
                <span className="hidden md:inline-block text-xs font-semibold text-slate-600 truncate">
                  Curated Talent Proposal
                </span>
              </div>
            </div>

            {/* Right Header Controls */}
            <div className="flex items-center gap-2 shrink-0">
              {canShortlist && (
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(true)}
                  disabled={selectedIds.length === 0}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                    selectedIds.length > 0
                      ? 'bg-[#10b981] hover:bg-[#059669] text-white shadow-emerald-500/20'
                      : 'bg-slate-100 text-slate-500 border border-slate-300/80 cursor-not-allowed opacity-90'
                  }`}
                >
                  <Send className="h-3 w-3" />
                  <span>
                    {submittedSuccess
                      ? `Update Shortlist (${selectedIds.length})`
                      : `Confirm Shortlist (${selectedIds.length})`}
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── 2. MAIN WORKSPACE CANVAS ─── */}
      <main className="max-w-[1440px] w-full mx-auto px-3.5 sm:px-5 lg:px-6 pt-2 sm:pt-3 space-y-3 sm:space-y-4">
        {/* ─── COMPACT EXECUTIVE PROPOSAL OVERVIEW STRIP ─── */}
        <section className="bg-white border border-slate-300/90 rounded-2xl p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            {/* Left: Title, Tag & Metadata in a tight group */}
            <div className="space-y-1.5 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-2xl font-black text-slate-950 tracking-tight truncate">
                  {roster.title}
                </h1>
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-900 border border-slate-300">
                  {roster.category_niche || 'CURATED ROSTER'}
                </span>
                {canShortlist ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-300">
                    <CheckCircle2 className="h-3 w-3 text-emerald-700" />
                    1-Click Shortlist
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300">
                    <Eye className="h-3 w-3 text-slate-600" />
                    Curated Showcase
                  </span>
                )}
                {submittedSuccess && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-400 text-emerald-900 text-[11px] font-extrabold">
                    <Check className="h-3.5 w-3.5 stroke-[3] text-emerald-700" />
                    Submitted ({selectedIds.length})
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-[13px] text-slate-700 font-medium truncate">
                Prepared exclusively by <strong className="text-slate-950 font-bold">TheHype</strong> for{' '}
                <strong className="text-emerald-900 font-bold underline decoration-emerald-400 decoration-2 underline-offset-2">{roster.brand_name}</strong>
                {roster.description ? ` • ${roster.description}` : ''}
              </p>
            </div>

            {/* Right: 4 Compact Inline KPI Metric Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-300 text-center min-w-[75px] shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 block">
                  Pitched
                </span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-slate-950 block mt-0.5">
                  {items.length}
                </span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-300 text-center min-w-[80px] shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 block">
                  Reach
                </span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-slate-950 block mt-0.5">
                  {formatCompactNumber(aggregateStats.totalFollowers)}
                </span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-100/90 border border-slate-300 text-center min-w-[85px] shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 block">
                  Reel Views
                </span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-slate-950 block mt-0.5">
                  {aggregateStats.totalViews > 0
                    ? formatCompactNumber(aggregateStats.totalViews)
                    : '—'}
                </span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-emerald-100/80 border border-emerald-300 text-center min-w-[90px] shadow-2xs">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-900 block">
                  {canShortlist ? 'Shortlisted' : 'Avg Eng'}
                </span>
                <span className="text-sm sm:text-base font-black font-mono tabular-nums text-emerald-950 block mt-0.5">
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

        {/* ─── PURE HIGH-DENSITY DATA TABLE (LIST VIEW) ─── */}
        <DynamicDataTable<any>
          theme="light"
          keyField="id"
          tableLayout="fixed"
          minTableWidth="min-w-[800px]"
          data={displayedItems}
          columns={columns}
          searchPlaceholder="Search creator name, @handle, city, niche..."
          exportFilename={`${roster.title.replace(/\s+/g, '_')}_Talent_Deck.csv`}
          defaultPageSize={25}
          pageSizeOptions={[10, 25, 50, 100]}
          controlsLeft={
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              {canShortlist && (
                <div className="inline-flex items-center p-0.5 rounded-none bg-slate-100 border border-slate-200/80 gap-1">
                  <button
                    type="button"
                    onClick={() => setFilterTab('all')}
                    className={`px-2.5 py-1 rounded-none text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterTab === 'all'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>All</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        filterTab === 'all'
                          ? 'bg-[#10b981] text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {items.length}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterTab('selected')}
                    className={`px-2.5 py-1 rounded-none text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      filterTab === 'selected'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>Shortlisted</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        filterTab === 'selected'
                          ? 'bg-[#10b981] text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {selectedIds.length}
                    </span>
                  </button>
                </div>
              )}

              {canShortlist && (
                <button
                  type="button"
                  onClick={selectAll}
                  className="px-2.5 py-1 rounded-none text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition cursor-pointer shrink-0"
                >
                  {selectedIds.length === items.length && items.length > 0
                    ? 'Clear All'
                    : 'Select All'}
                </button>
              )}
            </div>
          }
        />
      </main>

      {/* ─── 3. STICKY BOTTOM SHORTLIST DOCK (WHEN SHORTLISTING ACTIVE) ─── */}
      {canShortlist && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-[#161e2b] border-t border-[#243044] text-white px-4 py-2.5 shadow-2xl">
          <div className="max-w-[1440px] w-full mx-auto px-3.5 sm:px-5 lg:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="px-2 py-0.5 rounded-none bg-[#10b981] text-white font-mono font-bold text-xs shrink-0">
                {selectedIds.length}
              </span>
              <p className="text-xs font-semibold text-white truncate">
                {selectedIds.length === 0
                  ? 'Select creators from the list to shortlist'
                  : `${selectedIds.length} of ${items.length} Creators Selected`}
              </p>
              <button
                type="button"
                onClick={selectAll}
                className="text-xs text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer ml-1 hidden sm:inline"
              >
                {selectedIds.length === items.length ? 'Clear selection' : 'Select all creators'}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowSubmitModal(true)}
              disabled={selectedIds.length === 0}
              className="px-4 sm:px-5 py-2 rounded-none text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md"
            >
              <Send className="h-3.5 w-3.5" />
              <span>
                {submittedSuccess
                  ? `Update Shortlist (${selectedIds.length})`
                  : `Confirm Shortlist (${selectedIds.length})`}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 4. ENTERPRISE SHORTLIST SUBMISSION MODAL ─── */}
      <AnimatePresence>
        {showSubmitModal && (
          <div
            onClick={() => {
              if (!submitting) setShowSubmitModal(false)
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
          >
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-white border border-slate-200 rounded-none p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-full bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0 border border-slate-700">
                    <Send className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Confirm Creator Shortlist
                    </h3>
                    <p className="text-xs text-slate-500">
                      Submitting <strong className="text-emerald-700 font-semibold">{selectedIds.length} creators</strong> to TheHype Team
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="p-1.5 rounded-none text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitShortlist} className="space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Brand / Company *
                    </label>
                    <input
                      type="text"
                      required
                      value={submitBrandName}
                      onChange={(e) => setSubmitBrandName(e.target.value)}
                      placeholder="e.g. Invergy, Mamaearth"
                      className="w-full bg-white border border-slate-300 rounded-none px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Reviewer Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={pocName}
                      onChange={(e) => setPocName(e.target.value)}
                      placeholder="e.g. Nitesh Yadav"
                      className="w-full bg-white border border-slate-300 rounded-none px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981]"
                    />
                  </div>
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
                      placeholder="poc@brand.com"
                      className="w-full bg-white border border-slate-300 rounded-none px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981]"
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
                      className="w-full bg-white border border-slate-300 rounded-none px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981]"
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
                    placeholder="e.g. Approved these creators for the upcoming campaign. Please coordinate dispatch."
                    className="w-full bg-white border border-slate-300 rounded-none px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#10b981] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-4 py-2 rounded-none text-xs font-semibold text-slate-700 hover:text-slate-900 border border-slate-300 hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-none text-xs font-bold bg-[#10b981] hover:bg-[#059669] text-white flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>
                          {submittedSuccess
                            ? `Update Shortlist (${selectedIds.length})`
                            : `Submit Shortlist (${selectedIds.length})`}
                        </span>
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
