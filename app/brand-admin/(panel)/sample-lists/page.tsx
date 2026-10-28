'use client'

import React, { useState, useEffect, useMemo } from 'react'
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
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  CheckSquare,
  AlertCircle,
  Tag,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { SampleList } from '@/types/sample-roster'

export default function SampleListsDashboardPage() {
  const [lists, setLists] = useState<SampleList[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedBrand, setSelectedBrand] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'creators' | 'views' | 'title'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [title, setTitle] = useState('')
  const [brandName, setBrandName] = useState('')
  const [categoryNiche, setCategoryNiche] = useState('')
  const [description, setDescription] = useState('')
  const [allowBrandShortlisting, setAllowBrandShortlisting] = useState(true)
  const [creating, setCreating] = useState(false)

  // Delete Modal
  const [rosterToDelete, setRosterToDelete] = useState<SampleList | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Load view mode preference
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem('sample_lists_view_mode')
      if (savedMode === 'grid' || savedMode === 'table') {
        setViewMode(savedMode)
      }
    } catch { /* ignore */ }
  }, [])

  const handleSetViewMode = (mode: 'grid' | 'table') => {
    setViewMode(mode)
    try {
      localStorage.setItem('sample_lists_view_mode', mode)
    } catch { /* ignore */ }
  }

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
          allow_brand_shortlisting: allowBrandShortlisting,
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

  const handleDeleteRoster = async () => {
    if (!rosterToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/sample-lists/${rosterToDelete.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete roster')
      }
      toast.success(`Deleted "${rosterToDelete.title}"`)
      setLists((prev) => prev.filter((l) => l.id !== rosterToDelete.id))
      setRosterToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete sample roster')
    } finally {
      setIsDeleting(false)
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

  // Extract unique brands for dropdown filter
  const uniqueBrands = useMemo(() => {
    const brands = new Set<string>()
    lists.forEach((l) => {
      if (l.brand_name) brands.add(l.brand_name)
    })
    return Array.from(brands).sort()
  }, [lists])

  // Filter & Sort
  const processedLists = useMemo(() => {
    let result = lists.filter((l) => {
      const matchesSearch =
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.brand_name.toLowerCase().includes(search.toLowerCase()) ||
        (l.category_niche && l.category_niche.toLowerCase().includes(search.toLowerCase()))

      const matchesBrand = selectedBrand === 'all' || l.brand_name.toLowerCase() === selectedBrand.toLowerCase()

      return matchesSearch && matchesBrand
    })

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      if (sortBy === 'creators') return (b.items_count || 0) - (a.items_count || 0)
      if (sortBy === 'views') return (b.view_count || 0) - (a.view_count || 0)
      if (sortBy === 'title') return a.title.localeCompare(b.title)
      return 0
    })

    return result
  }, [lists, search, selectedBrand, sortBy])

  const totalCreatorsCurated = useMemo(() => {
    return lists.reduce((acc, l) => acc + (l.items_count || 0), 0)
  }, [lists])

  const totalBrandViews = useMemo(() => {
    return lists.reduce((acc, l) => acc + (l.view_count || 0), 0)
  }, [lists])

  // Helper to split comma-separated categories cleanly
  const parseCategories = (cat?: string | null): string[] => {
    if (!cat) return []
    return cat
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }

  return (
    <div className="space-y-6 pb-24 max-w-[1600px] mx-auto">
      {/* ─── 1. HEADER & ACTIONS ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <BookmarkPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Sample Influencer Rosters
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#febd1c] text-neutral-950">
                  {lists.length}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                Curate creator pitch decks, preview client presentations, and dispatch interactive rosters to brands.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <a
            href="/api/admin/sample-lists/template"
            download="sample_creator_roster_template.csv"
            className="h-9 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-xs"
            title="Download CSV import template"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Download CSV Template</span>
          </a>

          <button
            onClick={() => setShowCreateModal(true)}
            className="h-9 px-4 rounded-xl bg-[#febd1c] hover:bg-amber-300 text-neutral-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Sample Roster</span>
          </button>
        </div>
      </div>

      {/* ─── 2. STATS STRIP ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#121620] border border-white/10 space-y-1 relative overflow-hidden group hover:border-amber-500/30 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Rosters</span>
            <BookmarkPlus className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">{lists.length}</div>
          <p className="text-[10px] text-neutral-500">Live & pitchable decks</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121620] border border-white/10 space-y-1 relative overflow-hidden group hover:border-purple-500/30 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Creators Curated</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">{totalCreatorsCurated.toLocaleString()}</div>
          <p className="text-[10px] text-neutral-500">Across all active rosters</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121620] border border-white/10 space-y-1 relative overflow-hidden group hover:border-emerald-500/30 transition-colors shadow-lg">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Client Link Views</span>
            <Eye className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">{totalBrandViews.toLocaleString()}</div>
          <p className="text-[10px] text-neutral-500">Interactive presentations viewed</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#121620] border border-white/10 space-y-1 relative overflow-hidden group hover:border-sky-500/30 transition-colors shadow-lg flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Inbound Shortlists</span>
            <CheckSquare className="h-4 w-4 text-sky-400" />
          </div>
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-neutral-300">Brand Feedback</span>
            <Link
              href="/brand-admin/brand-shortlists"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 bg-sky-500/10 hover:bg-sky-500/20 px-2 py-1 rounded-lg border border-sky-500/20 transition-all"
            >
              <span>View Inbound</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 3. SEARCH, FILTER & VIEW CONTROLS ─── */}
      <div className="bg-[#121620] p-3 rounded-2xl border border-white/10 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search sample rosters by title, brand name, or niche..."
            className="w-full bg-[#0c1017] border border-white/10 rounded-xl pl-10 pr-9 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 placeholder:text-neutral-500 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Brand Filter */}
          <div className="flex items-center gap-1.5 bg-[#0c1017] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-neutral-300">
            <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="all" className="bg-[#121620] text-white">All Brands</option>
              {uniqueBrands.map((b) => (
                <option key={b} value={b} className="bg-[#121620] text-white">
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="flex items-center gap-1.5 bg-[#0c1017] border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-neutral-300">
            <ArrowUpDown className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-white text-xs focus:outline-none cursor-pointer pr-1"
            >
              <option value="newest" className="bg-[#121620] text-white">Newest First</option>
              <option value="creators" className="bg-[#121620] text-white">Most Creators</option>
              <option value="views" className="bg-[#121620] text-white">Most Client Views</option>
              <option value="title" className="bg-[#121620] text-white">Title (A-Z)</option>
              <option value="oldest" className="bg-[#121620] text-white">Oldest First</option>
            </select>
          </div>

          {/* View Mode Toggle: Grid vs Table */}
          <div className="flex items-center bg-[#0c1017] border border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => handleSetViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleSetViewMode('table')}
              title="Compact Table View"
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-500/20 text-amber-300 font-bold'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── 4. ROSTERS PRESENTATION CANVAS ─── */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-7 w-7 animate-spin text-amber-400" />
          <p className="text-xs text-neutral-400 font-medium">Loading sample rosters...</p>
        </div>
      ) : processedLists.length === 0 ? (
        <div className="py-20 text-center rounded-2xl bg-[#121620] border border-dashed border-white/10 p-8 space-y-3 shadow-xl">
          <BookmarkPlus className="h-10 w-10 text-neutral-500 mx-auto" />
          <h3 className="text-base font-bold text-white">No Sample Rosters Found</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto">
            {search || selectedBrand !== 'all'
              ? 'No sample rosters match your active search or brand filter.'
              : 'Create your first sample roster to pitch creators or curate talent catalogs for brands.'}
          </p>
          <button
            onClick={() => {
              setSearch('')
              setSelectedBrand('all')
              if (lists.length === 0) setShowCreateModal(true)
            }}
            className="px-4 py-2 rounded-xl bg-[#febd1c] hover:bg-amber-300 text-neutral-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20 transition-all"
          >
            {lists.length === 0 ? (
              <>
                <Plus className="h-4 w-4" />
                <span>Create First Roster</span>
              </>
            ) : (
              <span>Clear Filters</span>
            )}
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* ─── 4A. ENHANCED SAAS GRID VIEW ─── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {processedLists.map((list) => {
            const isCopied = copiedId === list.id
            const categories = parseCategories(list.category_niche)

            return (
              <motion.div
                key={list.id}
                whileHover={{ y: -3 }}
                transition={{ duration: 0.2 }}
                className="rounded-2xl bg-[#121620] hover:bg-[#151a26] border border-white/10 hover:border-amber-500/35 p-5 shadow-xl flex flex-col justify-between transition-all group relative overflow-hidden"
              >
                {/* Subtle Top Glow Accent Line */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500/70 via-purple-500/60 to-transparent group-hover:from-amber-400 group-hover:via-purple-400 transition-all" />

                <div className="space-y-3.5">
                  {/* Top Bar: Brand Pill + Live Status & Date */}
                  <div className="flex items-center justify-between gap-2">
                    <div
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-bold truncate max-w-[170px]"
                      title={`Target Brand: ${list.brand_name}`}
                    >
                      <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span className="truncate">{list.brand_name}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Live Link</span>
                      </span>
                      <span className="text-[10px] text-neutral-400 flex items-center gap-1" title="Created date">
                        <Calendar className="h-3 w-3 text-neutral-500" />
                        {new Date(list.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <Link
                      href={`/brand-admin/sample-lists/${list.id}`}
                      className="text-base font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1 block"
                      title={list.title}
                    >
                      {list.title}
                    </Link>

                    {list.description ? (
                      <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                        {list.description}
                      </p>
                    ) : (
                      <p className="text-[11px] text-neutral-500 italic mt-1">
                        Curated talent roster for client review & shortlisting
                      </p>
                    )}
                  </div>

                  {/* Clean Category Micro-Chips (No awkward wrapping) */}
                  {categories.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {categories.slice(0, 2).map((cat, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md text-[9px] font-semibold bg-white/5 border border-white/10 text-neutral-300 max-w-[140px] truncate"
                          title={cat}
                        >
                          {cat}
                        </span>
                      ))}
                      {categories.length > 2 && (
                        <span
                          className="px-1.5 py-0.5 rounded-md text-[9px] font-semibold bg-white/5 border border-white/10 text-neutral-400"
                          title={categories.slice(2).join(', ')}
                        >
                          +{categories.length - 2} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Metrics Box */}
                  <div className="bg-[#0c1017] p-2.5 rounded-xl border border-white/5 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 text-neutral-300">
                      <Users className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>
                        <strong className="text-white font-bold">{list.items_count || 0}</strong> Creators
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-neutral-400">
                      <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>
                        <strong className="text-white font-bold">{list.view_count || 0}</strong> Views
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      {Number(list.shortlisted_creators_count || 0) > 0 ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                          <Check className="w-3 h-3 shrink-0" />
                          {list.shortlisted_creators_count} Approved by Brand
                        </span>
                      ) : list.allow_brand_shortlisting ? (
                        <span className="px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold flex items-center gap-1">
                          <CheckSquare className="w-3 h-3 shrink-0" />
                          YES: Can Approve
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-white/5 text-neutral-400 border border-white/10 font-semibold flex items-center gap-1">
                          <Eye className="w-3 h-3 shrink-0" />
                          NO: Show Only
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="pt-3.5 mt-3.5 border-t border-white/5 flex items-center justify-between gap-2">
                  {/* Left: Quick Actions (Copy Link, Preview, Delete) */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(list, e)}
                      className={`h-7 px-2.5 rounded-lg text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                        isCopied
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5 hover:border-white/10'
                      }`}
                      title="Copy interactive client presentation link"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3 text-neutral-400" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </button>

                    <a
                      href={`/view/roster/${list.share_token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-7 w-7 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5 flex items-center justify-center transition-colors cursor-pointer"
                      title="Preview client view in new tab"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>

                    <button
                      type="button"
                      onClick={() => setRosterToDelete(list)}
                      className="h-7 w-7 rounded-lg bg-white/5 hover:bg-red-500/15 text-neutral-400 hover:text-red-400 border border-white/5 flex items-center justify-center transition-colors cursor-pointer"
                      title="Delete sample roster"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>

                  {/* Right: Primary Studio CTA */}
                  <Link
                    href={`/brand-admin/sample-lists/${list.id}`}
                    className="h-7.5 px-3 rounded-lg bg-[#febd1c] hover:bg-amber-300 text-neutral-950 font-bold text-xs flex items-center gap-1 shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer shrink-0"
                  >
                    <span>Open Studio</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </motion.div>
            )
          })}
        </div>
      ) : (
        /* ─── 4B. COMPACT STANDARDIZED TABLE VIEW ─── */
        <div className="rounded-2xl bg-[#121620] border border-white/10 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead className="bg-[#0c1017] text-neutral-400 font-bold uppercase tracking-wider border-b border-white/10 text-[10px] select-none">
                <tr>
                  <th className="py-2 px-3">Roster Title & Target Brand</th>
                  <th className="py-2 px-2.5">Category / Niche</th>
                  <th className="py-2 px-2.5 text-center">Creators</th>
                  <th className="py-2 px-2.5 text-center">Brand Power & Approvals</th>
                  <th className="py-2 px-2.5 text-center">Client Views</th>
                  <th className="py-2 px-2.5">Created Date</th>
                  <th className="py-2 px-2.5">Client Link</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {processedLists.map((list) => {
                  const isCopied = copiedId === list.id
                  const categories = parseCategories(list.category_niche)

                  return (
                    <tr key={list.id} className="hover:bg-white/[0.03] transition-colors">
                      {/* Title & Brand */}
                      <td className="py-2 px-3">
                        <div className="min-w-0">
                          <Link
                            href={`/brand-admin/sample-lists/${list.id}`}
                            className="font-bold text-white text-[11px] hover:text-amber-300 truncate max-w-[200px] block transition-colors"
                            title={list.title}
                          >
                            {list.title}
                          </Link>
                          <div className="flex items-center gap-1 text-[10px] text-amber-400 mt-0.5">
                            <Building2 className="w-2.5 h-2.5 shrink-0" />
                            <span className="truncate max-w-[150px]">{list.brand_name}</span>
                          </div>
                        </div>
                      </td>

                      {/* Categories */}
                      <td className="py-2 px-2.5">
                        {categories.length > 0 ? (
                          <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
                            {categories.slice(0, 2).map((c, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded text-[9px] bg-white/5 border border-white/10 text-neutral-300 truncate max-w-[110px]"
                                title={c}
                              >
                                {c}
                              </span>
                            ))}
                            {categories.length > 2 && (
                              <span className="text-[9px] text-neutral-400">+{categories.length - 2}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-neutral-500 text-[10px]">General Pitch</span>
                        )}
                      </td>

                      {/* Creators Count */}
                      <td className="py-2 px-2.5 text-center">
                        <span className="font-bold text-white text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          {list.items_count || 0}
                        </span>
                      </td>

                      {/* Brand Power & Approvals */}
                      <td className="py-2 px-2.5 text-center">
                        <div className="flex flex-col items-center gap-1">
                          {Number(list.shortlisted_creators_count || 0) > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                              <Check className="w-2.5 h-2.5" />
                              {list.shortlisted_creators_count} Approved
                            </span>
                          ) : list.allow_brand_shortlisting ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/25 font-bold text-[10px]">
                              YES • Can Approve
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-neutral-400 border border-white/10 font-semibold text-[10px]">
                              NO • Show Only
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Client Views */}
                      <td className="py-2 px-2.5 text-center font-bold text-emerald-400 text-[11px]">
                        {list.view_count || 0}
                      </td>

                      {/* Created Date */}
                      <td className="py-2 px-2.5 text-neutral-400 text-[10px]">
                        {new Date(list.created_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>

                      {/* Share Link */}
                      <td className="py-2 px-2.5">
                        <button
                          type="button"
                          onClick={(e) => handleCopyLink(list, e)}
                          className={`h-6 px-2 rounded-md text-[10px] font-semibold transition-all flex items-center gap-1 cursor-pointer ${
                            isCopied
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/5'
                          }`}
                        >
                          {isCopied ? <Check className="h-2.5 w-2.5" /> : <Copy className="h-2.5 w-2.5" />}
                          <span>{isCopied ? 'Copied' : 'Copy Link'}</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <a
                            href={`/view/roster/${list.share_token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="h-6 w-6 rounded-md bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white border border-white/5 flex items-center justify-center transition-colors cursor-pointer"
                            title="Preview client view in new tab"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>

                          <Link
                            href={`/brand-admin/sample-lists/${list.id}`}
                            className="h-6 px-2.5 rounded-md bg-[#febd1c] hover:bg-amber-300 text-neutral-950 font-bold text-[10px] flex items-center gap-1 transition-all shadow-xs"
                          >
                            <span>Open</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>

                          <button
                            type="button"
                            onClick={() => setRosterToDelete(list)}
                            className="h-6 w-6 rounded-md bg-white/5 hover:bg-red-500/15 text-neutral-400 hover:text-red-400 border border-white/5 flex items-center justify-center transition-colors cursor-pointer"
                            title="Delete sample roster"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
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

      {/* ─── 5. CREATE NEW ROSTER MODAL ─── */}
      <AnimatePresence>
        {showCreateModal && (
          <div
            onClick={() => {
              if (!creating) setShowCreateModal(false)
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#121620] border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white cursor-default"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <BookmarkPlus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Create Sample Roster</h3>
                    <p className="text-xs text-neutral-400">Curate influencers for brand client pitches</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleCreateList} className="space-y-3.5 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Roster Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Festive Season Beauty Pitch - Mamaearth"
                    className="w-full bg-[#0c1017] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Target Brand Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    placeholder="e.g. Mamaearth, Nykaa, BoAt"
                    className="w-full bg-[#0c1017] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Category / Niche (Optional)
                  </label>
                  <input
                    type="text"
                    value={categoryNiche}
                    onChange={(e) => setCategoryNiche(e.target.value)}
                    placeholder="e.g. Beauty & Skincare, Tech & Gadgets, Fashion"
                    className="w-full bg-[#0c1017] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    Pitch Notes / Scope (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Curated for Q4 Diwali Hamper Campaign with >50k followers"
                    className="w-full bg-[#0c1017] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 resize-none"
                  />
                </div>

                {/* YES / NO Power Toggle */}
                <div className="p-3 rounded-xl bg-[#0c1017] border border-white/10 space-y-2">
                  <div>
                    <p className="text-xs font-bold text-white">Allow Brand to Approve / Shortlist Creators?</p>
                    <p className="text-[10px] text-neutral-400">
                      Choose YES to give the brand selection power, or NO for a Show-Only catalog.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAllowBrandShortlisting(true)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        allowBrandShortlisting
                          ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-sm'
                          : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      YES (Can Approve)
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllowBrandShortlisting(false)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        !allowBrandShortlisting
                          ? 'bg-amber-400 text-neutral-950 border-amber-300 shadow-sm'
                          : 'bg-white/5 text-neutral-400 border-white/10 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3.5 h-3.5" />
                      NO (Show Only)
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#febd1c] hover:bg-amber-300 text-neutral-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Create Roster</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── 6. DELETE CONFIRMATION MODAL ─── */}
      <AnimatePresence>
        {rosterToDelete && (
          <div
            onClick={() => {
              if (!isDeleting) setRosterToDelete(null)
            }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-[#121620] border border-red-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white cursor-default"
            >
              <div className="flex items-center gap-3 text-red-400">
                <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-500/30">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Delete Sample Roster?</h3>
                  <p className="text-xs text-neutral-400">This action cannot be undone.</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#0c1017] border border-white/5 text-xs text-neutral-300">
                <p className="font-bold text-white truncate">{rosterToDelete.title}</p>
                <p className="text-[10px] text-neutral-400 mt-0.5">
                  Brand: {rosterToDelete.brand_name} • {rosterToDelete.items_count || 0} Creators
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setRosterToDelete(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs text-neutral-400 hover:text-white border border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleDeleteRoster}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white flex items-center gap-1.5 shadow-md shadow-red-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <span>Delete Roster</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
