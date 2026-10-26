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
      toast.success('Your shortlist has been submitted to the 1to7 Campaign Team!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit shortlist')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-white">
        <Loader2 className="h-8 w-8 animate-spin text-purple-400 mb-2" />
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
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-white/10 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-purple-500/20">
            1to7
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
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
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#febd1c] hover:bg-[#e5a812] text-black shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Submit Shortlist ({selectedIds.length})</span>
          </button>
        )}
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Pitch Hero Card */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-purple-950/40 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {roster.category_niche || 'Curated Pitch'}
              </span>
              <span className="text-xs text-slate-400">
                Prepared by <strong>1to7 Media</strong> for <strong>{roster.brand_name}</strong>
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
                <Users className="h-4 w-4 text-purple-400" />
                {items.length} Creators in Proposal
              </span>
              {roster.allow_brand_shortlisting && (
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  1-Click Shortlisting Enabled
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Shortlist Success Notification */}
        {submittedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                <Check className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Shortlist Successfully Submitted!</h4>
                <p className="text-xs text-emerald-300/90 mt-0.5">
                  Your selection of <strong>{selectedIds.length} creators</strong> has been routed to our Campaign Operations team. We will connect with you shortly with next steps.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Table Instructions / Selection Header */}
        {roster.allow_brand_shortlisting && !submittedSuccess && (
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <p>
              Select the creators you want to proceed with by ticking the <strong>Shortlist</strong> box.
            </p>
            <button
              onClick={selectAll}
              className="text-purple-400 hover:text-purple-300 font-bold hover:underline cursor-pointer"
            >
              {selectedIds.length === items.length ? 'Deselect All' : `Select All (${items.length})`}
            </button>
          </div>
        )}

        {/* Presentation Table */}
        <div className="rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-slate-950/70 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {roster.allow_brand_shortlisting && (
                    <th className="py-3 px-4 w-12 text-center">Shortlist</th>
                  )}
                  {visibleCols.includes('creator_name') && (
                    <th className="py-3 px-4">Creator & Instagram</th>
                  )}
                  {visibleCols.includes('followers') && (
                    <th className="py-3 px-3 text-center">Followers</th>
                  )}
                  {visibleCols.includes('avg_reels_views') && (
                    <th className="py-3 px-3 text-center">Avg Reels Views</th>
                  )}
                  {visibleCols.includes('engagement_rate') && (
                    <th className="py-3 px-3 text-center">Eng. Rate</th>
                  )}
                  {visibleCols.includes('city') && (
                    <th className="py-3 px-3">Location</th>
                  )}
                  {visibleCols.includes('niche') && (
                    <th className="py-3 px-3">Category</th>
                  )}
                  {visibleCols.includes('sample_reel_url') && (
                    <th className="py-3 px-3">Reel Showcase</th>
                  )}
                  {visibleCols.includes('brand_commercial') && (
                    <th className="py-3 px-4 text-right">Commercial (₹)</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => {
                  const isSelected = selectedIds.includes(item.id)
                  return (
                    <tr
                      key={item.id}
                      onClick={() => roster.allow_brand_shortlisting && !submittedSuccess && toggleSelect(item.id)}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-purple-950/30 hover:bg-purple-950/40'
                          : 'hover:bg-white/[0.02]'
                      } ${roster.allow_brand_shortlisting && !submittedSuccess ? 'cursor-pointer' : ''}`}
                    >
                      {/* Shortlist Checkbox */}
                      {roster.allow_brand_shortlisting && (
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              !submittedSuccess && toggleSelect(item.id)
                            }}
                            disabled={submittedSuccess}
                            className={`p-1.5 rounded-lg transition-all ${
                              isSelected
                                ? 'bg-[#febd1c] text-black shadow-sm'
                                : 'bg-white/5 text-slate-500 hover:text-slate-300'
                            }`}
                          >
                            <Star className={`h-4 w-4 ${isSelected ? 'fill-black' : ''}`} />
                          </button>
                        </td>
                      )}

                      {/* Creator & Handle */}
                      {visibleCols.includes('creator_name') && (
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center border border-purple-500/30 text-xs shrink-0">
                              {item.creator_name ? item.creator_name.charAt(0).toUpperCase() : 'C'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-white truncate">{item.creator_name}</p>
                              {visibleCols.includes('instagram_username') && item.instagram_username && (
                                <a
                                  href={`https://instagram.com/${item.instagram_username}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-[11px] text-pink-400 hover:text-pink-300 font-medium inline-flex items-center gap-1 truncate"
                                >
                                  <Instagram className="h-3 w-3 shrink-0" />
                                  <span>@{item.instagram_username}</span>
                                  <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                      )}

                      {/* Followers */}
                      {visibleCols.includes('followers') && (
                        <td className="py-3 px-3 text-center font-bold text-slate-200">
                          {item.followers > 0 ? item.followers.toLocaleString() : '—'}
                        </td>
                      )}

                      {/* Avg Reels Views */}
                      {visibleCols.includes('avg_reels_views') && (
                        <td className="py-3 px-3 text-center font-semibold text-slate-300">
                          {item.avg_reels_views > 0 ? item.avg_reels_views.toLocaleString() : '—'}
                        </td>
                      )}

                      {/* Engagement Rate */}
                      {visibleCols.includes('engagement_rate') && (
                        <td className="py-3 px-3 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                            {item.engagement_rate > 0 ? `${item.engagement_rate}%` : '—'}
                          </span>
                        </td>
                      )}

                      {/* City */}
                      {visibleCols.includes('city') && (
                        <td className="py-3 px-3 text-slate-300">
                          <span className="truncate">{item.city || 'Pan India'}</span>
                        </td>
                      )}

                      {/* Niche */}
                      {visibleCols.includes('niche') && (
                        <td className="py-3 px-3">
                          <span className="text-[10px] font-semibold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                            {item.niche || 'General'}
                          </span>
                        </td>
                      )}

                      {/* Sample Reel */}
                      {visibleCols.includes('sample_reel_url') && (
                        <td className="py-3 px-3">
                          {item.sample_reel_url ? (
                            <a
                              href={item.sample_reel_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 hover:text-purple-200 inline-flex items-center gap-1 text-[11px] font-semibold transition-colors"
                            >
                              <Video className="h-3 w-3" />
                              <span>View Reel</span>
                            </a>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">Pending</span>
                          )}
                        </td>
                      )}

                      {/* Commercial */}
                      {visibleCols.includes('brand_commercial') && (
                        <td className="py-3 px-4 text-right font-bold text-slate-200">
                          {item.brand_commercial ? `₹${item.brand_commercial.toLocaleString()}` : '—'}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Floating Bottom Bar for Shortlist Confirmation */}
      {roster.allow_brand_shortlisting && !submittedSuccess && selectedIds.length > 0 && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="fixed bottom-6 inset-x-4 max-w-lg mx-auto z-40 p-3 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-2xl backdrop-blur-md flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-2 pl-2">
            <div className="w-8 h-8 rounded-full bg-[#febd1c] text-black font-black flex items-center justify-center text-xs">
              {selectedIds.length}
            </div>
            <div>
              <p className="text-xs font-bold text-white">Creators Selected</p>
              <p className="text-[10px] text-slate-400">Ready to submit to 1to7</p>
            </div>
          </div>

          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-[#febd1c] hover:bg-[#e5a812] text-black shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
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
              className="w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Confirm Creator Shortlist</h3>
                    <p className="text-xs text-slate-400">
                      Submitting <strong>{selectedIds.length} creators</strong> to 1to7 Team
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
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
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
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
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
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#febd1c] hover:bg-[#e5a812] text-black flex items-center gap-1.5 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Submitting Shortlist...
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        Confirm & Send to 1to7
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
