'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookmarkPlus,
  Users,
  Search,
  Sparkles,
  ExternalLink,
  Instagram,
  Check,
  CheckCircle2,
  Calendar,
  Building2,
  Send,
  Video,
  MapPin,
  Clock,
  Loader2,
  AlertCircle,
  X,
  FileSpreadsheet,
  Download,
  Filter,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SampleList, SampleListItem } from '@/types/sample-roster'

export default function BrandSampleRostersPage() {
  const [rosters, setRosters] = useState<SampleList[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRosterId, setSelectedRosterId] = useState<string | null>(null)
  const [activeRoster, setActiveRoster] = useState<SampleList | null>(null)
  const [creators, setCreators] = useState<SampleListItem[]>([])
  const [creatorsLoading, setCreatorsLoading] = useState(false)
  const [existingShortlist, setExistingShortlist] = useState<any>(null)

  // Selection & Search
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
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

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCreators.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredCreators.map((c) => c.id)))
    }
  }

  const filteredCreators = useMemo(() => {
    return creators.filter(
      (c) =>
        c.creator_name.toLowerCase().includes(search.toLowerCase()) ||
        c.instagram_username.toLowerCase().includes(search.toLowerCase()) ||
        (c.city && c.city.toLowerCase().includes(search.toLowerCase())) ||
        (c.niche && c.niche.toLowerCase().includes(search.toLowerCase()))
    )
  }, [creators, search])

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

      toast.success(data.message || `Shortlist submitted to 1to7 Media!`)
      setShowShortlistModal(false)
      setNotes('')
      fetchRosterDetail(selectedRosterId)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit shortlist')
    } finally {
      setSubmittingShortlist(false)
    }
  }

  // Column visibility checker based on active roster configuration
  const isColVisible = (key: string) => {
    if (!activeRoster?.visible_columns) return true
    return (activeRoster.visible_columns as string[]).includes(key)
  }

  return (
    <div className="space-y-6 pb-24 text-white">
      {/* Page Header */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/10 relative overflow-hidden shadow-2xl">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 text-xs font-bold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Curated by 1to7 Media Agency Ops</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Curated Creator Pitch Decks
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Sample influencer rosters hand-picked specifically for your brand campaigns.
            Review creator metrics, sample reel content, and select your approved talent with 1 click.
          </p>
        </div>

        {/* Ambient Glow */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {loading ? (
        <div className="py-20 text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-purple-400 mx-auto" />
          <p className="text-xs text-slate-400">Loading pitch rosters from 1to7 Ops...</p>
        </div>
      ) : rosters.length === 0 ? (
        <div className="py-20 text-center space-y-3 rounded-2xl bg-slate-900/60 border border-white/10 p-8">
          <BookmarkPlus className="h-12 w-12 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-white">No Sample Pitch Decks Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Your 1to7 Key Account Manager will pitch curated creator rosters here for your upcoming campaigns. Check back soon!
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pitch Decks Horizontal Selector Carousel */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Pitched Rosters ({rosters.length})
              </span>
              <span className="text-[11px] text-purple-400 font-medium">Select a roster to review creators</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {rosters.map((r) => {
                const isSelected = r.id === selectedRosterId
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRosterId(r.id)}
                    className={`p-4 rounded-2xl text-left transition-all cursor-pointer border relative overflow-hidden ${
                      isSelected
                        ? 'bg-slate-900 border-amber-400/80 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50'
                        : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-white truncate">{r.title}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {r.category_niche || 'General'}
                          </span>
                        </div>
                        {r.pitch_note_to_brand && (
                          <p className="text-[11px] text-amber-200/90 italic line-clamp-1">
                            💬 "{r.pitch_note_to_brand}"
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 stroke-[3]" />
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/5 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3 text-slate-500" />
                        <strong className="text-white">{r.items_count || 0}</strong> creators
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-500" />
                        {r.published_at ? new Date(r.published_at).toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Active Roster Studio Table */}
          {activeRoster && (
            <div className="rounded-3xl bg-slate-900/90 border border-white/10 overflow-hidden shadow-2xl space-y-4 p-5">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-white/10">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-black text-white">{activeRoster.title}</h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                      {creators.length} Creators in Deck
                    </span>
                    {existingShortlist && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Shortlist Submitted ({existingShortlist.shortlisted_creators_count})</span>
                      </span>
                    )}
                  </div>
                  {activeRoster.pitch_note_to_brand && (
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200 mt-2">
                      <strong className="text-amber-300">Note from 1to7 KAM:</strong> {activeRoster.pitch_note_to_brand}
                    </div>
                  )}
                </div>

                {/* Right Action: Shortlist Trigger */}
                <div className="flex items-center gap-2">
                  <button
                    disabled={selectedIds.size === 0}
                    onClick={() => setShowShortlistModal(true)}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-400/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span>
                      {selectedIds.size > 0
                        ? `Shortlist Selected (${selectedIds.size})`
                        : 'Select Creators to Shortlist'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Table Controls (Search & Bulk Selection) */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search creator name, handle, city, niche..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    {selectedIds.size === filteredCreators.length && filteredCreators.length > 0
                      ? 'Deselect All'
                      : `Select All (${filteredCreators.length})`}
                  </button>
                  <span className="text-slate-600">|</span>
                  <span className="text-slate-400">
                    <strong className="text-amber-400">{selectedIds.size}</strong> selected
                  </span>
                </div>
              </div>

              {/* Creators Table */}
              {creatorsLoading ? (
                <div className="py-16 text-center space-y-2">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-400 mx-auto" />
                  <p className="text-xs text-slate-400">Loading creator profiles...</p>
                </div>
              ) : filteredCreators.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 bg-slate-950/40 rounded-2xl border border-white/5">
                  No creators found matching your search.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-950/80 text-slate-400 text-[10px] font-bold uppercase tracking-wider border-b border-white/10">
                        <th className="p-2 w-9 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === filteredCreators.length && filteredCreators.length > 0}
                            onChange={toggleSelectAll}
                            className="rounded border-white/20 bg-slate-900 text-amber-400 focus:ring-0 cursor-pointer"
                          />
                        </th>
                        <th className="py-2 px-2">Creator & Instagram</th>
                        {isColVisible('followers') && <th className="py-2 px-2 text-right">Followers</th>}
                        {isColVisible('avg_reels_views') && <th className="py-2 px-2 text-right">Avg Views</th>}
                        {isColVisible('engagement_rate') && <th className="py-2 px-2 text-right">Eng. Rate</th>}
                        {isColVisible('city') && <th className="py-2 px-2">City & Niche</th>}
                        {isColVisible('sample_reel_url') && <th className="py-2 px-2 text-center">Sample Reel</th>}
                        {isColVisible('brand_commercial') && <th className="py-2 px-2 text-right">Commercial (₹)</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredCreators.map((creator) => {
                        const isSelected = selectedIds.has(creator.id)
                        return (
                          <tr
                            key={creator.id}
                            onClick={() => toggleSelect(creator.id)}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-amber-400/10 hover:bg-amber-400/15'
                                : 'hover:bg-white/5'
                            }`}
                          >
                            <td className="p-2 w-9 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(creator.id)}
                                className="rounded border-white/20 bg-slate-900 text-amber-400 focus:ring-0 cursor-pointer"
                              />
                            </td>

                            <td className="py-1.5 px-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center border border-purple-500/30 shrink-0 text-[10px]">
                                  {creator.creator_name.charAt(0).toUpperCase()}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-white text-[11px] truncate max-w-[140px]" title={creator.creator_name}>
                                    {creator.creator_name}
                                  </div>
                                  <a
                                    href={`https://instagram.com/${creator.instagram_username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-[10px] text-pink-400 hover:text-pink-300 flex items-center gap-0.5 truncate max-w-[120px]"
                                    title={`@${creator.instagram_username}`}
                                  >
                                    <Instagram className="h-2.5 w-2.5 shrink-0" />
                                    <span className="truncate">@{creator.instagram_username}</span>
                                    <ExternalLink className="h-2 w-2 opacity-60" />
                                  </a>
                                </div>
                              </div>
                            </td>

                            {isColVisible('followers') && (
                              <td className="py-1.5 px-2 text-right font-bold text-slate-200 text-[11px]">
                                {Number(creator.followers).toLocaleString()}
                              </td>
                            )}

                            {isColVisible('avg_reels_views') && (
                              <td className="py-1.5 px-2 text-right text-slate-300 text-[11px]">
                                {creator.avg_reels_views > 0
                                  ? Number(creator.avg_reels_views).toLocaleString()
                                  : '—'}
                              </td>
                            )}

                            {isColVisible('engagement_rate') && (
                              <td className="py-1.5 px-2 text-right">
                                {creator.engagement_rate > 0 ? (
                                  <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                                    {creator.engagement_rate}%
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">—</span>
                                )}
                              </td>
                            )}

                            {isColVisible('city') && (
                              <td className="py-1.5 px-2">
                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-center gap-1 text-slate-300 text-[10px]">
                                    <MapPin className="h-2.5 w-2.5 text-slate-500 shrink-0" />
                                    <span className="truncate max-w-[100px]">{creator.city || 'Pan-India'}</span>
                                  </div>
                                  {creator.niche && (
                                    <span className="text-[9px] text-purple-300 truncate max-w-[100px] block">{creator.niche}</span>
                                  )}
                                </div>
                              </td>
                            )}

                            {isColVisible('sample_reel_url') && (
                              <td className="py-1.5 px-2 text-center" onClick={(e) => e.stopPropagation()}>
                                {creator.sample_reel_url ? (
                                  <a
                                    href={creator.sample_reel_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="h-6 px-2 rounded-md bg-pink-500/15 hover:bg-pink-500/25 text-pink-300 inline-flex items-center gap-1 text-[10px] font-semibold border border-pink-500/30 transition-colors"
                                  >
                                    <Video className="h-2.5 w-2.5" />
                                    <span>Watch</span>
                                  </a>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">—</span>
                                )}
                              </td>
                            )}

                            {isColVisible('brand_commercial') && (
                              <td className="py-1.5 px-2 text-right font-black text-amber-400 text-[11px]">
                                {creator.brand_commercial ? `₹${Number(creator.brand_commercial).toLocaleString()}` : '—'}
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

      {/* Shortlist Submission Modal */}
      <AnimatePresence>
        {showShortlistModal && activeRoster && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-amber-400/30 rounded-3xl p-6 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Submit Creator Shortlist</h3>
                    <p className="text-xs text-slate-400">Sends directly to your 1to7 Key Account Manager</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShortlistModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-950/80 border border-white/5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Target Pitch Roster:</span>
                  <strong className="text-white">{activeRoster.title}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Creators Selected:</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-bold">
                    {selectedIds.size} Creators
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitShortlist} className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Your Name / Reviewer POC (Optional)</label>
                  <input
                    type="text"
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    placeholder="e.g. Vikram Mehta (Brand Manager)"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">POC Email (Optional)</label>
                    <input
                      type="email"
                      value={pocEmail}
                      onChange={(e) => setPocEmail(e.target.value)}
                      placeholder="vikram@brand.in"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-300 font-semibold">POC Phone (Optional)</label>
                    <input
                      type="tel"
                      value={pocPhone}
                      onChange={(e) => setPocPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold">Campaign Requirements & Notes</label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. We love these creators for our Diwali drop. Need 1 dedicated Reel + 1 Story. Commercials look acceptable."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowShortlistModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingShortlist || selectedIds.size === 0}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 flex items-center gap-1.5 shadow-lg shadow-amber-400/25 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {submittingShortlist ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Submitting to 1to7...</span>
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
