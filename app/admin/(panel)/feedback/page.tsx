'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquareHeart, Star, Filter, Search, Download, RefreshCw,
  Loader2, User, Mail, Phone, Calendar, Sparkles, Tag, ChevronDown,
  X, ExternalLink, CheckCircle2, MessageSquare, AlertCircle, ArrowUpDown
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { getFastCache, setFastCache } from '@/lib/utils/cache-utils'
import { getInstagramDisplayHandle, getInstagramUrl } from '@/lib/instagram-utils'

interface FeedbackItem {
  id: string
  user_id?: string
  influencer_id?: string
  full_name?: string
  email?: string
  mobile?: string
  rating: number
  category: string
  message: string
  created_at: string
}

interface Stats {
  total: number
  avgRating: number
  categoryCounts: Record<string, number>
  ratingCounts: Record<number, number>
}

const CATEGORIES = [
  'All Categories',
  'General Improvement',
  'Feature Request',
  'Bug Report',
  'Campaigns & Payments',
  'UI/UX Experience'
]

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([])
  const [stats, setStats] = useState<Stats>({
    total: 0,
    avgRating: 0,
    categoryCounts: {},
    ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  })
  const [loading, setLoading] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('All Categories')
  const [selectedRating, setSelectedRating] = useState<string>('all')
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null)

  // Fetch Feedback
  const fetchFeedback = async (isBackground = false) => {
    if (!isBackground && feedback.length === 0) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'All Categories') params.set('category', selectedCategory)
      if (selectedRating !== 'all') params.set('rating', selectedRating)
      if (searchQuery.trim()) params.set('q', searchQuery.trim())

      const res = await fetch(`/api/admin/feedback?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to fetch feedback')

      setFeedback(data.feedback || [])
      setStats(data.stats || {
        total: 0,
        avgRating: 0,
        categoryCounts: {},
        ratingCounts: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      })
      if (selectedCategory === 'All Categories' && selectedRating === 'all' && !searchQuery.trim()) {
        setFastCache('admin_feedback_cache', data)
      }
    } catch (err: any) {
      if (!isBackground) toast.error(err.message || 'Error loading feedback')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cached = getFastCache<any>('admin_feedback_cache')
    if (cached && selectedCategory === 'All Categories' && selectedRating === 'all' && !searchQuery.trim()) {
      setFeedback(cached.feedback || [])
      if (cached.stats) setStats(cached.stats)
      setLoading(false)
      fetchFeedback(true)
    } else {
      fetchFeedback(false)
    }
  }, [selectedCategory, selectedRating])

  // Filtered by Search query locally as well for instantaneous responsiveness
  const filteredFeedback = useMemo(() => {
    if (!searchQuery.trim()) return feedback
    const q = searchQuery.toLowerCase()
    return feedback.filter(item =>
      (item.full_name || '').toLowerCase().includes(q) ||
      (item.email || '').toLowerCase().includes(q) ||
      (item.influencer_id || '').toLowerCase().includes(q) ||
      (item.message || '').toLowerCase().includes(q) ||
      (item.category || '').toLowerCase().includes(q)
    )
  }, [feedback, searchQuery])

  // Export CSV
  const handleExportCSV = () => {
    if (filteredFeedback.length === 0) {
      toast.error('No feedback entries to export')
      return
    }

    const headers = ['Feedback ID', 'Date', 'User Name', 'Influencer ID', 'Email', 'Rating', 'Category', 'Message']
    const csvRows = [headers.join(',')]

    for (const item of filteredFeedback) {
      const row = [
        `"${item.id}"`,
        `"${new Date(item.created_at).toLocaleString()}"`,
        `"${item.full_name || 'Anonymous'}"`,
        `"${item.influencer_id || ''}"`,
        `"${item.email || ''}"`,
        item.rating,
        `"${item.category}"`,
        `"${item.message.replace(/"/g, '""')}"`
      ]
      csvRows.push(row.join(','))
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `user_feedback_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Feedback exported successfully')
  }

  return (
    <>
      <SetAdminHeader>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <MessageSquareHeart className="h-5 w-5 text-amber-400" /> User Feedback & Suggestions
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Review platform reviews, feature requests, bug reports, and rating breakdown from creators.
          </p>
        </div>
      </SetAdminHeader>

      <div className="space-y-6 text-slate-100">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <MessageSquareHeart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Submissions</p>
              <h3 className="text-2xl font-extrabold text-white mt-0.5">{stats.total}</h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400 shrink-0">
              <Star className="h-6 w-6 fill-yellow-400" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Average Rating</p>
              <div className="flex items-center gap-2 mt-0.5">
                <h3 className="text-2xl font-extrabold text-white">{stats.avgRating}</h3>
                <span className="text-xs text-yellow-400 font-bold">/ 5.0</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Feature Requests</p>
              <h3 className="text-2xl font-extrabold text-white mt-0.5">
                {stats.categoryCounts['Feature Request'] || 0}
              </h3>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Bug Reports</p>
              <h3 className="text-2xl font-extrabold text-white mt-0.5">
                {stats.categoryCounts['Bug Report'] || 0}
              </h3>
            </div>
          </div>
        </div>

        {/* Filters & Actions Bar */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search user, ID, message..."
                className="pl-10 bg-slate-950/70 border border-slate-800 text-white placeholder:text-slate-500 h-10 text-xs rounded-xl focus:border-amber-500/60 transition-all"
              />
            </div>

            {/* Category Filter Pills & Rating Dropdown */}
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
              <select
                value={selectedRating}
                onChange={(e) => setSelectedRating(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">⭐ All Ratings</option>
                <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                <option value="3">⭐⭐⭐ 3 Stars</option>
                <option value="2">⭐⭐ 2 Stars</option>
                <option value="1">⭐ 1 Star</option>
              </select>

              <Button
                variant="outline"
                onClick={() => fetchFeedback()}
                className="h-10 px-3 rounded-xl border-slate-800 bg-slate-950/80 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-semibold cursor-pointer"
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>

              <Button
                onClick={handleExportCSV}
                className="h-10 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer border-none"
              >
                <Download className="h-4 w-4 mr-1.5" /> Export CSV
              </Button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 scrollbar-none">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              )
            })}
          </div>
        </div>

        {/* Feedback List / Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
          {loading && feedback.length === 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="px-5 py-3.5">User / Creator</th>
                    <th className="px-5 py-3.5">Rating</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Suggestion / Message</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse border-b border-slate-800/60">
                      <td className="px-5 py-4">
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 rounded bg-slate-800" />
                          <div className="w-16 h-2.5 rounded bg-slate-800/60" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map(s => (
                            <div key={s} className="w-3.5 h-3.5 rounded bg-slate-800" />
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-20 h-5 rounded-full bg-slate-800" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1 max-w-xs">
                          <div className="w-48 h-3 rounded bg-slate-800" />
                          <div className="w-32 h-2.5 rounded bg-slate-800/60" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-16 h-3 rounded bg-slate-800" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="w-14 h-6 rounded-lg bg-slate-800 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredFeedback.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="h-12 w-12 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-500 mx-auto">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-white">No Feedback Submissions Found</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No feedback matches the selected category or search filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/70 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="px-5 py-3.5">User / Creator</th>
                    <th className="px-5 py-3.5">Rating</th>
                    <th className="px-5 py-3.5">Category</th>
                    <th className="px-5 py-3.5">Suggestion / Message</th>
                    <th className="px-5 py-3.5">Date</th>
                    <th className="px-5 py-3.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredFeedback.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedFeedback(item)}
                      className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4">
                        <div className="font-bold text-white text-sm">{item.full_name || 'Anonymous Creator'}</div>
                        <div className="text-[11px] text-amber-400 font-mono mt-0.5">{item.influencer_id || 'No ID'}</div>
                        {item.email && <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{item.email}</div>}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3.5 w-3.5 ${
                                star <= item.rating
                                  ? 'text-amber-400 fill-amber-400'
                                  : 'text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 mt-1 inline-block">
                          {item.rating} / 5
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-sm">
                        <p className="text-slate-300 font-medium line-clamp-2 leading-relaxed">
                          "{item.message}"
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-400 whitespace-nowrap text-[11px]">
                        {new Date(item.created_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setSelectedFeedback(item)
                          }}
                          className="h-8 px-3 rounded-lg border-slate-700 text-xs text-slate-300 group-hover:border-amber-500/50 group-hover:text-amber-400 bg-slate-950/60 cursor-pointer"
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Feedback Details Modal Drawer */}
        <AnimatePresence>
          {selectedFeedback && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl w-full max-w-md text-white relative space-y-4"
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <MessageSquareHeart className="h-5 w-5 text-amber-400" /> Feedback Details
                  </h3>
                  <button
                    onClick={() => setSelectedFeedback(null)}
                    className="h-7 w-7 rounded-lg bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Creator Info</p>
                    <p className="text-sm font-bold text-white">{selectedFeedback.full_name || 'Anonymous Creator'}</p>
                    <p className="text-xs text-amber-400 font-mono">ID: {selectedFeedback.influencer_id || 'N/A'}</p>
                    {selectedFeedback.email && <p className="text-xs text-slate-300">Email: {selectedFeedback.email}</p>}
                    {selectedFeedback.mobile && <p className="text-xs text-slate-300">Mobile: {selectedFeedback.mobile}</p>}
                  </div>

                  <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Category</p>
                      <p className="text-xs font-bold text-amber-300 mt-0.5">{selectedFeedback.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Rating</p>
                      <div className="flex items-center gap-0.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-3.5 w-3.5 ${
                              star <= selectedFeedback.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-700'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Feedback Message</p>
                    <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-slate-200 text-xs leading-relaxed max-h-60 overflow-y-auto font-medium">
                      {selectedFeedback.message}
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-500 text-right">
                    Submitted on {new Date(selectedFeedback.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    onClick={() => setSelectedFeedback(null)}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold h-10 rounded-xl cursor-pointer"
                  >
                    Close
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
