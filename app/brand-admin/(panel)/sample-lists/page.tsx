'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookmarkPlus,
  Plus,
  Search,
  Building2,
  Users,
  Eye,
  Share2,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Trash2,
  Loader2,
  Sparkles,
  Calendar,
  X,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SampleList } from '@/types/sample-roster'

export default function SampleListsDashboardPage() {
  const [lists, setLists] = useState<SampleList[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [title, setTitle] = useState('')
  const [brandName, setBrandName] = useState('')
  const [categoryNiche, setCategoryNiche] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchLists()
  }, [])

  const fetchLists = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sample-lists?status=active')
      const data = await res.json()
      if (res.ok) {
        setLists(data.lists || [])
      } else {
        toast.error(data.error || 'Failed to load sample rosters')
      }
    } catch {
      toast.error('Failed to load sample rosters')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateList = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !brandName.trim()) {
      return toast.error('Please enter a title and brand name')
    }

    setCreating(true)
    try {
      const res = await fetch('/api/admin/sample-lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          brand_name: brandName.trim(),
          category_niche: categoryNiche.trim() || undefined,
          description: description.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create roster')

      toast.success(`Created "${data.list.title}"!`)
      setShowCreateModal(false)
      setTitle('')
      setBrandName('')
      setCategoryNiche('')
      setDescription('')
      fetchLists()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create sample roster')
    } finally {
      setCreating(false)
    }
  }

  const handleCopyLink = (list: SampleList, e: React.MouseEvent) => {
    e.stopPropagation()
    const url = `${window.location.origin}/view/roster/${list.share_token}`
    navigator.clipboard.writeText(url)
    setCopiedId(list.id)
    toast.success('Client presentation link copied to clipboard!')
    setTimeout(() => setCopiedId(null), 2500)
  }

  const filteredLists = lists.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.brand_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.category_niche && l.category_niche.toLowerCase().includes(search.toLowerCase()))
  )

  const totalCreatorsCurated = lists.reduce((acc, l) => acc + (l.items_count || 0), 0)

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
            <BookmarkPlus className="h-6 w-6 text-purple-400" />
            <span>Sample Influencer Rosters</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Build curated creator pitch decks, import sheets, and share sanitized interactive links with brands.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <a
            href="/api/admin/sample-lists/template"
            download="sample_creator_roster_template.csv"
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-2 transition-all cursor-pointer"
            title="Download ready-to-use CSV import template"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Download CSV Template</span>
          </a>

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Sample Roster</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Rosters</p>
          <p className="text-2xl font-black text-white">{lists.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Creators Curated</p>
          <p className="text-2xl font-black text-purple-400">{totalCreatorsCurated.toLocaleString()}</p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Brand Views</p>
          <p className="text-2xl font-black text-emerald-400">
            {lists.reduce((acc, l) => acc + (l.view_count || 0), 0)}
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inbound Loop</p>
          <Link
            href="/brand-admin/brand-shortlists"
            className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1"
          >
            <span>View Shortlists</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search sample rosters by title, brand name, or category..."
          className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400 shadow-sm"
        />
      </div>

      {/* Rosters Grid */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
          <p className="text-xs text-slate-400">Loading sample rosters...</p>
        </div>
      ) : filteredLists.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-slate-900/40 border border-dashed border-white/10 p-8 space-y-3">
          <BookmarkPlus className="h-10 w-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">No Sample Rosters Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {search
              ? 'No rosters match your search query.'
              : 'Create your first sample roster to pitch creators or curate talent catalogs for brands.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Roster</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLists.map((list) => {
            const isCopied = copiedId === list.id
            return (
              <motion.div
                key={list.id}
                whileHover={{ y: -2 }}
                className="rounded-2xl bg-slate-900 border border-white/5 hover:border-purple-500/30 p-5 shadow-lg flex flex-col justify-between transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/25">
                      {list.category_niche || 'General Pitch'}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(list.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-1">
                      {list.title}
                    </h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="h-3.5 w-3.5 text-slate-500" />
                      <strong className="text-slate-300 font-semibold">{list.brand_name}</strong>
                    </p>
                  </div>

                  {list.description && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {list.description}
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t border-white/5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-semibold text-white">
                      <Users className="h-3.5 w-3.5 text-purple-400" />
                      {list.items_count || 0} Creators
                    </span>
                    <span className="flex items-center gap-1 text-[11px]">
                      <Eye className="h-3 w-3 text-slate-500" />
                      {list.view_count || 0} views
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(list, e)}
                      className={`p-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                      title="Copy public client review link"
                    >
                      {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>

                    <Link
                      href={`/brand-admin/sample-lists/${list.id}`}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <span>Open Studio</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <BookmarkPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Create Sample Roster</h3>
                    <p className="text-xs text-slate-400">Curate influencers for brand client pitches</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateList} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Roster Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Festive Season Beauty Pitch - Mamaearth"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Target Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Mamaearth, Nykaa, BoAt"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Category / Niche (Optional)
                  </label>
                  <input
                    type="text"
                    value={categoryNiche}
                    onChange={(e) => setCategoryNiche(e.target.value)}
                    placeholder="e.g. Beauty & Skincare, Tech & Gadgets, Fashion"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Pitch Notes / Scope (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Curated for Q4 Diwali Hamper Campaign with >50k followers"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 resize-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        Create Roster
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
