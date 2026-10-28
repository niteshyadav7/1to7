'use client'

import React, { useState, useEffect, use } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  CheckCircle2,
  Instagram,
  Video,
  MapPin,
  ExternalLink,
  Star,
  Users,
  Building2,
  Calendar,
  Send,
  Loader2,
  Check,
  X,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

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
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-[#F95738] mb-2" />
        <p className="text-sm text-slate-400">Loading influencer presentation...</p>
      </div>
    )
  }

  if (error || !roster) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-white/10 text-center space-y-3">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
          <h2 className="text-lg font-bold">Presentation Not Available</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'This sample roster presentation link may have expired or was deactivated by the agency.'}
          </p>
        </div>
      </div>
    )
  }

  const visibleCols: string[] = roster.visible_columns || []

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-[#F95738]/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <img
              src="/thehype-logo.png"
              alt="TheHype"
              className="w-8 h-8 object-contain rounded-lg bg-white/5 p-0.5"
            />
            <span className="font-black text-sm text-white tracking-tight">TheHype</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF7659]">
                Influencer Pitch Deck
              </span>
              <span className="text-[10px] text-slate-500">•</span>
              <span className="text-xs text-slate-300 font-semibold">{roster.brand_name}</span>
            </div>
          </div>
        </div>

        {roster.allow_brand_shortlisting && !submittedSuccess && (
          <button
            onClick={() => setShowSubmitModal(true)}
            disabled={selectedIds.length === 0}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F95738] hover:bg-[#E04728] text-white shadow-md shadow-[#F95738]/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit Shortlist ({selectedIds.length})</span>
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Pitch Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-orange-950/30 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#F95738]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F95738]/20 text-[#FF8C73] border border-[#F95738]/30">
                {roster.category_niche || 'Curated Pitch'}
              </span>
              <span className="text-xs text-slate-400">
                Prepared by <strong>TheHype</strong> for <strong>{roster.brand_name}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {roster.title}
            </h1>

            {roster.description && (
              <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
                {roster.description}
              </p>
            )}

            <div className="flex items-center gap-4 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <Users className="h-4 w-4 text-[#F95738]" />
                {items.length} Creators in Proposal
              </span>
              {roster.target_reach && (
                <>
                  <span>•</span>
                  <span>Target Reach: <strong className="text-white font-semibold">{roster.target_reach}</strong></span>
                </>
              )}
              {roster.allow_brand_shortlisting && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 1-Click Shortlisting Active
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Shortlisting Progress Bar */}
        {roster.allow_brand_shortlisting && (
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300">
                Selected <strong className="text-[#FF8C73] text-sm">{selectedIds.length}</strong> of {items.length} creators
              </span>
              <button
                onClick={selectAll}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                {selectedIds.length === items.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {submittedSuccess ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <Check className="h-4 w-4" />
                <span>Shortlist Confirmed & Synced with Account Manager</span>
              </div>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                disabled={selectedIds.length === 0}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#F95738] hover:bg-[#E04728] text-white shadow-lg shadow-[#F95738]/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                <span>Confirm & Submit Shortlist ({selectedIds.length})</span>
              </button>
            )}
          </div>
        )}

        {/* Creator Showcase Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((item) => {
            const isSelected = selectedIds.includes(item.id)
            return (
              <div
                key={item.id}
                className={`rounded-3xl border transition-all duration-200 overflow-hidden relative flex flex-col ${
                  isSelected
                    ? 'bg-slate-900 border-[#F95738] shadow-lg shadow-[#F95738]/20 ring-1 ring-[#F95738]'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/20'
                }`}
              >
                {/* Header card with profile image & basic info */}
                <div className="p-5 flex-1 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-[#F95738] to-[#FF7659] flex items-center justify-center font-bold text-white text-base shadow-inner shrink-0">
                        {item.creator_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <h3 className="font-bold text-sm text-white truncate">{item.creator_name}</h3>
                        <a
                          href={`https://instagram.com/${item.instagram_username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#FF7659] hover:underline flex items-center gap-1 font-medium"
                        >
                          <Instagram className="h-3 w-3" />
                          <span>@{item.instagram_username}</span>
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </a>
                      </div>
                    </div>

                    {roster.allow_brand_shortlisting && !submittedSuccess && (
                      <button
                        onClick={() => toggleSelect(item.id)}
                        className={`p-2 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#F95738] border-[#F95738] text-white shadow-md shadow-[#F95738]/30'
                            : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                        }`}
                        title={isSelected ? 'Remove from shortlist' : 'Add to shortlist'}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Pitch note if available */}
                  {item.pitch_note && (
                    <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-300 italic">
                      "{item.pitch_note}"
                    </div>
                  )}

                  {/* Metric Chips */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {visibleCols.includes('followers') && (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Followers</span>
                        <span className="font-bold text-white text-sm">
                          {Number(item.followers).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {visibleCols.includes('avg_reels_views') && (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Reel Views</span>
                        <span className="font-bold text-white text-sm">
                          {item.avg_reels_views > 0 ? Number(item.avg_reels_views).toLocaleString() : '—'}
                        </span>
                      </div>
                    )}
                    {visibleCols.includes('engagement_rate') && (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Engagement</span>
                        <span className="font-bold text-emerald-400 text-sm">
                          {item.engagement_rate > 0 ? `${item.engagement_rate}%` : '—'}
                        </span>
                      </div>
                    )}
                    {visibleCols.includes('city') && (
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Location</span>
                        <span className="font-medium text-white text-xs truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                          <span className="truncate">{item.city || 'Pan India'}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Commercial Quote */}
                  {visibleCols.includes('brand_commercial') && item.brand_commercial && (
                    <div className="p-3 rounded-2xl bg-[#FFF2EF]/10 border border-[#F95738]/30 flex items-center justify-between">
                      <span className="text-xs text-slate-300 font-medium">Commercial Rate</span>
                      <span className="text-sm font-black text-[#FF7659]">
                        ₹{Number(item.brand_commercial).toLocaleString('en-IN')}
                      </span>
                    </div>
                  )}

                  {/* Sample Reel button */}
                  {visibleCols.includes('sample_reel_url') && item.sample_reel_url && (
                    <a
                      href={item.sample_reel_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-pink-500/20 to-purple-500/20 hover:from-pink-500/30 hover:to-purple-500/30 border border-pink-500/30 text-pink-300 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Video className="h-3.5 w-3.5" />
                      <span>Watch Creator Sample Reel</span>
                      <ExternalLink className="h-3 w-3 opacity-60" />
                    </a>
                  )}
                </div>

                {/* Card footer select button */}
                {roster.allow_brand_shortlisting && !submittedSuccess && (
                  <button
                    onClick={() => toggleSelect(item.id)}
                    className={`w-full py-2.5 text-xs font-bold transition-all border-t cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelected
                        ? 'bg-[#F95738] text-white border-[#F95738]'
                        : 'bg-white/[0.02] text-slate-400 hover:text-white hover:bg-white/5 border-white/5'
                    }`}
                  >
                    <Check className={`h-3.5 w-3.5 ${isSelected ? 'stroke-[3]' : 'opacity-60'}`} />
                    <span>{isSelected ? 'Shortlisted' : 'Shortlist Creator'}</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </main>

      {/* Floating Bottom Action Bar */}
      {roster.allow_brand_shortlisting && selectedIds.length > 0 && !submittedSuccess && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 inset-x-4 max-w-xl mx-auto z-40 bg-slate-900/95 backdrop-blur-xl border border-[#F95738]/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3 pl-2">
            <div className="h-7 w-7 rounded-lg bg-[#F95738] text-white flex items-center justify-center font-bold text-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-white">Creators Selected</p>
              <p className="text-[10px] text-slate-400">Ready to submit to TheHype</p>
            </div>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F95738] hover:bg-[#E04728] text-white shadow-lg shadow-[#F95738]/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Confirm & Send Shortlist</span>
          </button>
        </motion.div>
      )}

      {/* Submission Modal */}
      <AnimatePresence>
        {showSubmitModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-[#F95738]/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#F95738]/20 text-[#FF8C73] border border-[#F95738]/30">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Confirm Creator Shortlist</h3>
                    <p className="text-xs text-slate-400">
                      Submitting <strong>{selectedIds.length} creators</strong> to TheHype Team
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSubmitModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmitShortlist} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Your Name / POC *
                  </label>
                  <input
                    type="text"
                    required
                    value={pocName}
                    onChange={(e) => setPocName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F95738]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Work Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={pocEmail}
                      onChange={(e) => setPocEmail(e.target.value)}
                      placeholder="rajesh@brand.com"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F95738]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={pocPhone}
                      onChange={(e) => setPocPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F95738]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Campaign Scope / Feedback Notes (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. We love these creators for our Diwali campaign. Please confirm delivery dates and draft briefs."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#F95738] resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#F95738] hover:bg-[#E04728] text-white flex items-center gap-1.5 shadow-lg shadow-[#F95738]/20 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Submitting Shortlist...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Confirm & Send to TheHype</span>
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
