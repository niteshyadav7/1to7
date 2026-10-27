'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckSquare,
  Search,
  Filter,
  Building2,
  Mail,
  Phone,
  Calendar,
  Users,
  Instagram,
  Video,
  Download,
  ExternalLink,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Loader2,
  MessageSquare,
  Lock,
  X,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandShortlist, SampleListItem } from '@/types/sample-roster'

export default function BrandShortlistsDeskPage() {
  const [shortlists, setShortlists] = useState<BrandShortlist[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [activeTab, setActiveTab] = useState<'all' | 'new' | 'under_review' | 'converted_to_campaign' | 'archived'>('all')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Drawer / Detail Modal
  const [selectedShortlist, setSelectedShortlist] = useState<BrandShortlist | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchShortlists()
  }, [activeTab, selectedBrand])

  const fetchShortlists = async () => {
    setLoading(true)
    try {
      const qs = new URLSearchParams()
      if (activeTab !== 'all') qs.set('status', activeTab)
      if (selectedBrand !== 'all') qs.set('brand', selectedBrand)

      const res = await fetch(`/api/admin/brand-shortlists?${qs.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setShortlists(data.shortlists || [])
        setBrands(data.brands || [])
      } else {
        toast.error(data.error || 'Failed to load brand shortlists')
      }
    } catch {
      toast.error('Failed to load brand shortlists')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (shortlistId: string, newStatus: string) => {
    setUpdatingId(shortlistId)
    try {
      const res = await fetch(`/api/admin/brand-shortlists/${shortlistId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')

      setShortlists((prev) =>
        prev.map((s) => (s.id === shortlistId ? { ...s, status: newStatus as any } : s))
      )
      if (selectedShortlist && selectedShortlist.id === shortlistId) {
        setSelectedShortlist((prev) => prev ? { ...prev, status: newStatus as any } : null)
      }
      toast.success(`Updated status to ${newStatus.replace(/_/g, ' ')}`)
    } catch (err: any) {
      toast.error(err.message || 'Status update failed')
    } finally {
      setUpdatingId(null)
    }
  }

  // Export Shortlist to CSV
  const handleExportShortlistCSV = (shortlist: BrandShortlist) => {
    const items = shortlist.shortlisted_items || []
    if (items.length === 0) return toast.error('No creators in this shortlist to export')

    const headers = [
      'Creator Name',
      'Instagram Handle',
      'Followers',
      'Avg Reels Views',
      'Engagement Rate',
      'City',
      'Niche',
      'Sample Reel URL',
      'Client Commercial (INR)',
      'Internal Cost (INR)',
    ]

    const rows = items.map((i) => [
      `"${i.creator_name}"`,
      `"@${i.instagram_username}"`,
      i.followers,
      i.avg_reels_views,
      `${i.engagement_rate}%`,
      `"${i.city || 'Pan India'}"`,
      `"${i.niche || 'General'}"`,
      `"${i.sample_reel_url || ''}"`,
      i.brand_commercial || '',
      i.internal_cost || '',
    ].join(','))

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${shortlist.brand_name}_shortlist_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Shortlist CSV downloaded successfully!')
  }

  const filteredShortlists = shortlists.filter((s) => {
    const q = search.toLowerCase()
    return (
      s.brand_name.toLowerCase().includes(q) ||
      (s.brand_poc_name && s.brand_poc_name.toLowerCase().includes(q)) ||
      (s.brand_poc_email && s.brand_poc_email.toLowerCase().includes(q)) ||
      (s.brand_feedback_notes && s.brand_feedback_notes.toLowerCase().includes(q)) ||
      (s.sample_list_title && s.sample_list_title.toLowerCase().includes(q))
    )
  })

  // Metric counts
  const newCount = shortlists.filter((s) => s.status === 'new').length
  const underReviewCount = shortlists.filter((s) => s.status === 'under_review').length
  const convertedCount = shortlists.filter((s) => s.status === 'converted_to_campaign').length
  const totalCreators = shortlists.reduce((acc, s) => acc + (s.shortlisted_creators_count || 0), 0)

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <CheckSquare className="h-6 w-6 text-purple-400" />
            <span>Brand Shortlists & Inbound Selections</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Aggregated creator selections submitted by client brands from your sample pitch decks.
          </p>
        </div>

        <button
          onClick={fetchShortlists}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto border border-white/5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/20 space-y-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          <p className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
            New Responses
          </p>
          <p className="text-2xl font-black text-white">{newCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Under Discussion</p>
          <p className="text-2xl font-black text-amber-400">{underReviewCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Converted to Campaign</p>
          <p className="text-2xl font-black text-emerald-400">{convertedCount}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Creators Chosen</p>
          <p className="text-2xl font-black text-white">{totalCreators.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 custom-scrollbar">
            {[
              { key: 'all', label: 'All Shortlists', count: shortlists.length },
              { key: 'new', label: '🔔 New Responses', count: newCount },
              { key: 'under_review', label: 'Under Review', count: underReviewCount },
              { key: 'converted_to_campaign', label: 'Converted', count: convertedCount },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white shadow-md shadow-purple-500/25'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{tab.label}</span>
                <span className="text-[10px] opacity-75">({tab.count})</span>
              </button>
            ))}
          </div>

          {/* Brand Dropdown Filter */}
          {brands.length > 0 && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-semibold">Brand:</span>
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="bg-slate-900 border border-white/10 text-white text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:border-purple-400 cursor-pointer"
              >
                <option value="all">All Brands ({brands.length})</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by brand name, POC contact, notes, or pitch deck title..."
            className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
          />
        </div>
      </div>

      {/* Inbound Shortlists List */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          <p className="text-xs text-slate-400">Loading incoming brand shortlists...</p>
        </div>
      ) : filteredShortlists.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-slate-900/40 border border-dashed border-white/10 p-8 space-y-3">
          <CheckSquare className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Shortlists Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {search || activeTab !== 'all' || selectedBrand !== 'all'
              ? 'No brand shortlists match your filters.'
              : 'When brands select creators from your sample pitch links, their selections will appear here automatically.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredShortlists.map((shortlist) => {
            const isNew = shortlist.status === 'new'
            const isConverted = shortlist.status === 'converted_to_campaign'
            return (
              <motion.div
                key={shortlist.id}
                whileHover={{ scale: 1.002 }}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 ${
                  isNew
                    ? 'bg-purple-950/20 border-purple-500/40 shadow-lg shadow-purple-500/5'
                    : 'bg-slate-900 border-white/5 hover:border-white/15'
                }`}
              >
                {/* Brand & POC Info */}
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        isNew
                          ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 animate-pulse'
                          : isConverted
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {shortlist.status.replace(/_/g, ' ')}
                    </span>

                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(shortlist.submitted_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>

                    {shortlist.sample_list_title && (
                      <span className="text-xs text-slate-400 truncate max-w-xs">
                        From pitch: <strong className="text-slate-300 font-semibold">{shortlist.sample_list_title}</strong>
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-purple-400 shrink-0" />
                      <span>{shortlist.brand_name}</span>
                    </h3>

                    {/* POC Details */}
                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                      {shortlist.brand_poc_name && (
                        <span className="font-semibold text-slate-300">{shortlist.brand_poc_name}</span>
                      )}
                      {shortlist.brand_poc_email && (
                        <a
                          href={`mailto:${shortlist.brand_poc_email}`}
                          className="hover:text-purple-300 flex items-center gap-1"
                        >
                          <Mail className="h-3 w-3" />
                          <span>{shortlist.brand_poc_email}</span>
                        </a>
                      )}
                      {shortlist.brand_poc_phone && (
                        <a
                          href={`tel:${shortlist.brand_poc_phone}`}
                          className="hover:text-purple-300 flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{shortlist.brand_poc_phone}</span>
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Feedback Note */}
                  {shortlist.brand_feedback_notes && (
                    <div className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 italic flex items-start gap-2">
                      <MessageSquare className="h-3.5 w-3.5 text-purple-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">"{shortlist.brand_feedback_notes}"</span>
                    </div>
                  )}
                </div>

                {/* Creators Count Badge & Action Buttons */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap justify-between lg:justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-white/5">
                  <div className="px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 text-xs font-bold flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    <span>{shortlist.shortlisted_creators_count} Shortlisted</span>
                  </div>

                  <button
                    onClick={() => handleExportShortlistCSV(shortlist)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs transition-colors cursor-pointer"
                    title="Export shortlisted creators to CSV"
                  >
                    <Download className="h-4 w-4" />
                  </button>

                  <button
                    onClick={() => setSelectedShortlist(shortlist)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                  >
                    <span>Inspect Shortlist</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Detail Modal / Drawer */}
      <AnimatePresence>
        {selectedShortlist && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-4xl bg-slate-900 border border-purple-500/30 rounded-2xl p-6 shadow-2xl space-y-5 text-white max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">
                      {selectedShortlist.brand_name} Creator Shortlist
                    </h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      {selectedShortlist.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedShortlist.shortlisted_creators_count} creators selected on{' '}
                    {new Date(selectedShortlist.submitted_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedShortlist(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* POC & Notes Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 space-y-2 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Brand POC</span>
                    <p className="font-semibold text-white">{selectedShortlist.brand_poc_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email</span>
                    <p className="text-slate-300 truncate">{selectedShortlist.brand_poc_email || '—'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Phone</span>
                    <p className="text-slate-300">{selectedShortlist.brand_poc_phone || '—'}</p>
                  </div>
                </div>

                {selectedShortlist.brand_feedback_notes && (
                  <div className="pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Brand Notes / Feedback</span>
                    <p className="text-purple-200/90 italic mt-0.5">"{selectedShortlist.brand_feedback_notes}"</p>
                  </div>
                )}
              </div>

              {/* Creators Table */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                <div className="rounded-xl border border-white/10 overflow-hidden bg-slate-950">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="border-b border-white/10 bg-slate-900/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2 px-2">Creator</th>
                        <th className="py-2 px-2 text-center">Followers</th>
                        <th className="py-2 px-2 text-center">Avg Views</th>
                        <th className="py-2 px-2 text-center">Eng. Rate</th>
                        <th className="py-2 px-2">Location</th>
                        <th className="py-2 px-2">Sample Reel</th>
                        <th className="py-2 px-2 text-right">Quoted Price (₹)</th>
                        <th className="py-2 px-2 text-right text-amber-400">Secret Cost (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(selectedShortlist.shortlisted_items || []).map((item) => (
                        <tr key={item.id} className="hover:bg-white/[0.02]">
                          <td className="py-1.5 px-2">
                            <p className="font-bold text-white text-[11px] truncate max-w-[140px]" title={item.creator_name}>{item.creator_name}</p>
                            <a
                              href={`https://instagram.com/${item.instagram_username}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-pink-400 hover:underline inline-flex items-center gap-0.5 truncate max-w-[120px]"
                              title={`@${item.instagram_username}`}
                            >
                              <span>@{item.instagram_username}</span>
                              <ExternalLink className="h-2 w-2" />
                            </a>
                          </td>
                          <td className="py-1.5 px-2 text-center font-bold text-[11px]">
                            {item.followers ? item.followers.toLocaleString() : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-center text-slate-300 text-[11px]">
                            {item.avg_reels_views ? item.avg_reels_views.toLocaleString() : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300">
                              {item.engagement_rate}%
                            </span>
                          </td>
                          <td className="py-1.5 px-2 text-slate-300 text-[10px] truncate max-w-[100px]">{item.city || 'Pan India'}</td>
                          <td className="py-1.5 px-2">
                            {item.sample_reel_url ? (
                              <a
                                href={item.sample_reel_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-300 hover:underline inline-flex items-center gap-1 text-[10px] h-6 px-1.5 rounded bg-purple-500/10 border border-purple-500/20"
                              >
                                <Video className="h-2.5 w-2.5" />
                                <span>Watch</span>
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-slate-200 text-[11px]">
                            {item.brand_commercial ? `₹${item.brand_commercial.toLocaleString()}` : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono text-amber-300 text-[11px]">
                            {item.internal_cost ? `₹${item.internal_cost.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Status Update & Actions Footer */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => handleExportShortlistCSV(selectedShortlist)}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white flex items-center gap-1.5 border border-white/10"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Shortlist CSV</span>
                </button>

                <div className="flex items-center gap-2">
                  {selectedShortlist.status !== 'converted_to_campaign' && (
                    <button
                      type="button"
                      disabled={Boolean(updatingId)}
                      onClick={() => handleUpdateStatus(selectedShortlist.id, 'converted_to_campaign')}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      <span>Convert to Campaign</span>
                    </button>
                  )}

                  {selectedShortlist.status === 'new' && (
                    <button
                      type="button"
                      disabled={Boolean(updatingId)}
                      onClick={() => handleUpdateStatus(selectedShortlist.id, 'under_review')}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white cursor-pointer disabled:opacity-50"
                    >
                      <span>Mark Under Review</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedShortlist(null)}
                    className="px-3.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10"
                  >
                    Close
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
