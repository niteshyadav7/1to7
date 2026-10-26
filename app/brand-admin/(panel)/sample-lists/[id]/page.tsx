'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BookmarkPlus,
  ArrowLeft,
  Users,
  Building2,
  Share2,
  Copy,
  Check,
  Plus,
  FileSpreadsheet,
  Download,
  Trash2,
  ExternalLink,
  Instagram,
  Eye,
  Sliders,
  Shield,
  Search,
  Lock,
  Edit2,
  Video,
  MapPin,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { AVAILABLE_ROSTER_COLUMNS, type SampleList, type SampleListItem, type SampleRosterColumnKey } from '@/types/sample-roster'

export default function SampleListStudioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [list, setList] = useState<SampleList | null>(null)
  const [items, setItems] = useState<SampleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [copiedLink, setCopiedLink] = useState(false)

  // Modals
  const [showAddFromDbModal, setShowAddFromDbModal] = useState(false)
  const [showImportSheetModal, setShowImportSheetModal] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)

  // DB Search state
  const [dbSearch, setDbSearch] = useState('')
  const [dbResults, setDbResults] = useState<any[]>([])
  const [dbLoading, setDbLoading] = useState(false)
  const [selectedDbCreators, setSelectedDbCreators] = useState<any[]>([])
  const [addingFromDb, setAddingFromDb] = useState(false)

  // Sheet Import state
  const [sheetText, setSheetText] = useState('')
  const [importing, setImporting] = useState(false)

  // Share & Columns state
  const [selectedColumns, setSelectedColumns] = useState<SampleRosterColumnKey[]>([
    'creator_name',
    'instagram_username',
    'followers',
    'avg_reels_views',
    'engagement_rate',
    'city',
    'sample_reel_url',
  ])
  const [savingSettings, setSavingSettings] = useState(false)

  useEffect(() => {
    fetchRosterDetails()
  }, [id])

  const fetchRosterDetails = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/sample-lists/${id}`)
      const data = await res.json()
      if (res.ok) {
        setList(data.list)
        setItems(data.items || [])
        if (data.list?.visible_columns && Array.isArray(data.list.visible_columns)) {
          setSelectedColumns(data.list.visible_columns)
        }
      } else {
        toast.error(data.error || 'Failed to load roster')
      }
    } catch {
      toast.error('Failed to load roster details')
    } finally {
      setLoading(false)
    }
  }

  // Search DB creators
  const handleDbSearch = async () => {
    if (!dbSearch.trim()) return
    setDbLoading(true)
    try {
      const res = await fetch(`/api/admin/influencers/search?q=${encodeURIComponent(dbSearch.trim())}`)
      const data = await res.json()
      if (res.ok) {
        setDbResults(data.influencers || data.creators || [])
      }
    } catch {
      // Fallback
    } finally {
      setDbLoading(false)
    }
  }

  // Add selected DB creators to roster
  const handleAddSelectedFromDb = async () => {
    if (selectedDbCreators.length === 0) return
    setAddingFromDb(true)
    try {
      const formattedItems = selectedDbCreators.map((c) => ({
        user_id: c.id,
        creator_name: c.full_name,
        instagram_username: c.instagram_username || c.full_name,
        followers: c.followers || 0,
        city: c.city || c.state || null,
        niche: c.category || null,
        sample_reel_url: c.instagram_profiles?.[0]?.sample_reel || null,
      }))

      const res = await fetch(`/api/admin/sample-lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: formattedItems }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add creators')

      toast.success(data.message || `Added ${selectedDbCreators.length} creators!`)
      setShowAddFromDbModal(false)
      setSelectedDbCreators([])
      setDbResults([])
      setDbSearch('')
      fetchRosterDetails()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add creators')
    } finally {
      setAddingFromDb(false)
    }
  }

  // Parse and import from Google Sheet / CSV paste
  const handleImportSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetText.trim()) return toast.error('Please paste data from your sheet')

    setImporting(true)
    try {
      const lines = sheetText.trim().split('\n')
      if (lines.length === 0) throw new Error('No data found to import')

      // Detect header row if present
      const firstLine = lines[0].toLowerCase()
      const hasHeader =
        firstLine.includes('name') ||
        firstLine.includes('instagram') ||
        firstLine.includes('handle') ||
        firstLine.includes('follower')

      const dataLines = hasHeader ? lines.slice(1) : lines
      const parsedItems: any[] = []

      for (const line of dataLines) {
        // Support tab-delimited or comma-delimited
        const delimiter = line.includes('\t') ? '\t' : ','
        const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''))

        if (parts.length >= 2) {
          const creatorName = parts[0]
          const handle = parts[1]
          const followers = parts[2] || '0'
          const views = parts[3] || '0'
          const engRate = parts[4] || '0'
          const city = parts[5] || null
          const reelUrl = parts[6] || null
          const commercial = parts[7] || null

          if (handle) {
            parsedItems.push({
              creator_name: creatorName,
              instagram_username: handle,
              followers,
              avg_reels_views: views,
              engagement_rate: engRate,
              city,
              sample_reel_url: reelUrl,
              brand_commercial: commercial,
            })
          }
        }
      }

      if (parsedItems.length === 0) {
        throw new Error('Could not parse any creator rows. Ensure columns: Name, Instagram, Followers, Views...')
      }

      const res = await fetch(`/api/admin/sample-lists/${id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedItems }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to import sheet')

      toast.success(data.message || `Successfully imported ${data.inserted_count} creators!`)
      setShowImportSheetModal(false)
      setSheetText('')
      fetchRosterDetails()
    } catch (err: any) {
      toast.error(err.message || 'Failed to import sheet')
    } finally {
      setImporting(false)
    }
  }

  // Remove creator from roster
  const handleDeleteItem = async (itemId: string, creatorName: string) => {
    if (!confirm(`Remove ${creatorName} from this sample roster?`)) return
    try {
      const res = await fetch(`/api/admin/sample-lists/${id}/items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setItems((prev) => prev.filter((i) => i.id !== itemId))
      toast.success(`Removed ${creatorName}`)
    } catch {
      toast.error('Failed to remove item')
    }
  }

  // Save Column Visibility & Share Settings
  const handleSaveShareSettings = async () => {
    setSavingSettings(true)
    try {
      const res = await fetch(`/api/admin/sample-lists/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visible_columns: selectedColumns,
          allow_brand_shortlisting: list?.allow_brand_shortlisting,
          is_public_share_enabled: list?.is_public_share_enabled,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save settings')

      setList(data.list)
      toast.success('Column permissions and share settings updated!')
      setShowShareModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  // Copy Public Presentation Link
  const handleCopyLink = () => {
    if (!list) return
    const url = `${window.location.origin}/view/roster/${list.share_token}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success('Copied client presentation link to clipboard!')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Export Sanitized Presentation CSV
  const handleExportCSV = () => {
    if (items.length === 0) return toast.error('No creators in this roster to export')

    const headers: string[] = []
    const keys: SampleRosterColumnKey[] = []

    AVAILABLE_ROSTER_COLUMNS.forEach((col) => {
      if (selectedColumns.includes(col.key)) {
        headers.push(col.label)
        keys.push(col.key)
      }
    })

    const rows = items.map((item) => {
      return keys.map((k) => {
        if (k === 'creator_name') return `"${item.creator_name}"`
        if (k === 'instagram_username') return `"@${item.instagram_username}"`
        if (k === 'followers') return item.followers
        if (k === 'avg_reels_views') return item.avg_reels_views
        if (k === 'engagement_rate') return `${item.engagement_rate}%`
        if (k === 'city') return `"${item.city || 'Pan India'}"`
        if (k === 'niche') return `"${item.niche || 'General'}"`
        if (k === 'sample_reel_url') return `"${item.sample_reel_url || ''}"`
        if (k === 'brand_commercial') return item.brand_commercial || ''
        return ''
      }).join(',')
    })

    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${list?.title || 'sample_roster'}_presentation.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success('Clean client presentation CSV downloaded!')
  }

  const filteredItems = items.filter(
    (i) =>
      i.creator_name.toLowerCase().includes(search.toLowerCase()) ||
      i.instagram_username.toLowerCase().includes(search.toLowerCase()) ||
      (i.city && i.city.toLowerCase().includes(search.toLowerCase())) ||
      (i.niche && i.niche.toLowerCase().includes(search.toLowerCase()))
  )

  if (loading) {
    return (
      <div className="py-24 text-center flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
        <p className="text-xs text-slate-400">Loading roster studio...</p>
      </div>
    )
  }

  if (!list) {
    return (
      <div className="py-20 text-center space-y-3">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-white">Sample Roster Not Found</h3>
        <Link href="/brand-admin/sample-lists" className="text-xs text-purple-400 hover:underline">
          ← Back to all rosters
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Top Breadcrumb & Title */}
      <div className="space-y-3">
        <Link
          href="/brand-admin/sample-lists"
          className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to All Sample Rosters</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white">{list.title}</h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                {list.category_niche || 'General Pitch'}
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-slate-500" />
              <span>Target Client: <strong className="text-slate-200">{list.brand_name}</strong></span>
              <span>•</span>
              <Users className="h-3.5 w-3.5 text-slate-500" />
              <span>{items.length} Creators in Roster</span>
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAddFromDbModal(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Users className="h-3.5 w-3.5" />
              <span>+ Add 1to7 Creators</span>
            </button>

            <button
              onClick={() => setShowImportSheetModal(true)}
              className="px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Import Sheet / CSV</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-purple-500/25 transition-all cursor-pointer"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Columns & Share</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-xs font-bold transition-all cursor-pointer"
              title="Download client presentation CSV"
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Share Notification Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-slate-900 border border-purple-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 shrink-0">
            <Share2 className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-white">Client Presentation Link Ready</p>
            <p className="text-[11px] text-slate-400">
              Sharing with <strong>{selectedColumns.length} visible columns</strong>. Creator PII & agency margins are strictly protected.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleCopyLink}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              copiedLink
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-white/10 hover:bg-white/15 text-white'
            }`}
          >
            {copiedLink ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
          </button>

          <a
            href={`/view/roster/${list.share_token}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Preview Client View in new tab"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="h-4 w-4 text-slate-500 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${items.length} creators by name, handle, city, or niche...`}
          className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
        />
      </div>

      {/* Creators Table */}
      <div className="rounded-2xl bg-slate-900 border border-white/10 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/60 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-4">Creator & Instagram</th>
                <th className="py-3 px-3 text-center">Followers</th>
                <th className="py-3 px-3 text-center">Avg Reels Views</th>
                <th className="py-3 px-3 text-center">Eng. Rate</th>
                <th className="py-3 px-3">Location & Niche</th>
                <th className="py-3 px-3">Sample Reel</th>
                <th className="py-3 px-3 text-right">Commercial (₹)</th>
                <th className="py-3 px-3 text-right">
                  <span className="inline-flex items-center gap-1 text-amber-400" title="Internal Cost (Hidden from client)">
                    <Lock className="h-3 w-3" /> Cost (₹)
                  </span>
                </th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No creators in this sample roster matching your search.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Name & Handle */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center border border-purple-500/30 text-xs shrink-0">
                          {item.creator_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white truncate">{item.creator_name}</p>
                          <a
                            href={`https://instagram.com/${item.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-pink-400 hover:text-pink-300 font-medium inline-flex items-center gap-1 truncate"
                          >
                            <Instagram className="h-3 w-3 shrink-0" />
                            <span>@{item.instagram_username}</span>
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Followers */}
                    <td className="py-3 px-3 text-center font-bold text-slate-200">
                      {item.followers > 0 ? item.followers.toLocaleString() : '—'}
                    </td>

                    {/* Avg Views */}
                    <td className="py-3 px-3 text-center font-semibold text-slate-300">
                      {item.avg_reels_views > 0 ? item.avg_reels_views.toLocaleString() : '—'}
                    </td>

                    {/* Engagement */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        {item.engagement_rate > 0 ? `${item.engagement_rate}%` : '—'}
                      </span>
                    </td>

                    {/* Location & Niche */}
                    <td className="py-3 px-3 text-slate-300">
                      <p className="truncate">{item.city || 'Pan India'}</p>
                      {item.niche && (
                        <span className="text-[10px] text-pink-400/90 font-medium">{item.niche}</span>
                      )}
                    </td>

                    {/* Sample Reel */}
                    <td className="py-3 px-3">
                      {item.sample_reel_url ? (
                        <a
                          href={item.sample_reel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-purple-300 hover:text-purple-200 inline-flex items-center gap-1 text-[11px] font-semibold transition-colors"
                        >
                          <Video className="h-3 w-3" />
                          <span>Watch Reel</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No sample</span>
                      )}
                    </td>

                    {/* Brand Commercial */}
                    <td className="py-3 px-3 text-right font-bold text-slate-200">
                      {item.brand_commercial ? `₹${item.brand_commercial.toLocaleString()}` : '—'}
                    </td>

                    {/* Internal Cost (Secret) */}
                    <td className="py-3 px-3 text-right font-mono text-amber-300/90 text-xs">
                      {item.internal_cost ? `₹${item.internal_cost.toLocaleString()}` : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.creator_name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove from roster"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Add Creators from 1to7 DB */}
      <AnimatePresence>
        {showAddFromDbModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-400" />
                  <h3 className="text-base font-bold text-white">Add Creators from 1to7 Platform DB</h3>
                </div>
                <button
                  onClick={() => setShowAddFromDbModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={dbSearch}
                    onChange={(e) => setDbSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDbSearch()}
                    placeholder="Search by creator name, Instagram handle, or category..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleDbSearch}
                  disabled={dbLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
                >
                  {dbLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* DB Results */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {dbResults.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">
                    Enter a keyword and click Search to find verified 1to7 creators.
                  </p>
                ) : (
                  dbResults.map((creator) => {
                    const isSelected = selectedDbCreators.some((c) => c.id === creator.id)
                    return (
                      <div
                        key={creator.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedDbCreators((prev) => prev.filter((c) => c.id !== creator.id))
                          } else {
                            setSelectedDbCreators((prev) => [...prev, creator])
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950/40 border-purple-500 text-white'
                            : 'bg-slate-950/60 border-white/5 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-white/20 bg-slate-900 text-purple-600"
                          />
                          <div className="min-w-0">
                            <p className="text-xs font-bold truncate">{creator.full_name}</p>
                            <p className="text-[11px] text-pink-400 truncate">
                              @{creator.instagram_username || 'n/a'} • {(creator.followers || 0).toLocaleString()} followers
                              {creator.city && ` • ${creator.city}`}
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <span className="text-xs text-slate-400">
                  Selected <strong className="text-white">{selectedDbCreators.length}</strong> creators
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowAddFromDbModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={selectedDbCreators.length === 0 || addingFromDb}
                    onClick={handleAddSelectedFromDb}
                    className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-50"
                  >
                    {addingFromDb ? 'Adding...' : `Add ${selectedDbCreators.length} to Roster`}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 2: Import from Google Sheet / CSV */}
      <AnimatePresence>
        {showImportSheetModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-white">Import from Google Sheet or CSV</h3>
                </div>
                <button
                  onClick={() => setShowImportSheetModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Copy and paste creator rows directly from your Google Sheet or Excel. Expected tab-delimited columns:
                </p>
                <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-300 border border-emerald-500/20">
                  Name | Instagram Handle | Followers | Avg Views | Engagement% | City | Sample Reel URL
                </div>
              </div>

              <form onSubmit={handleImportSheet} className="space-y-3">
                <textarea
                  rows={8}
                  required
                  value={sheetText}
                  onChange={(e) => setSheetText(e.target.value)}
                  placeholder="Paste rows here from Google Sheets...
Sheetal Jadhav	@sheetaljadhavpatil	45000	25000	4.5%	Mumbai	https://instagram.com/reel/xyz
Ishita Kaushik	@ishh.2307	120000	80000	5.2%	Delhi	https://instagram.com/reel/abc"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                />

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowImportSheetModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={importing}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                        Parse & Import Creators
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Column Visibility Shield & Share Configurator */}
      <AnimatePresence>
        {showShareModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xl bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-400" />
                  <div>
                    <h3 className="text-base font-bold text-white">Column Visibility Shield</h3>
                    <p className="text-xs text-slate-400">Select what data is revealed on the client presentation link</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Column Selection Checkboxes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
                  <span className="font-bold uppercase tracking-wider text-[11px]">Toggle Client Visible Columns</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedColumns([
                          'creator_name',
                          'instagram_username',
                          'followers',
                          'avg_reels_views',
                          'engagement_rate',
                          'city',
                          'sample_reel_url',
                        ])
                      }
                      className="text-purple-400 hover:underline"
                    >
                      Creative Pitch
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedColumns([
                          'creator_name',
                          'instagram_username',
                          'followers',
                          'avg_reels_views',
                          'engagement_rate',
                          'city',
                          'sample_reel_url',
                          'brand_commercial',
                        ])
                      }
                      className="text-purple-400 hover:underline"
                    >
                      Proposal (+Pricing)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                  {AVAILABLE_ROSTER_COLUMNS.map((col) => {
                    const isChecked = selectedColumns.includes(col.key)
                    return (
                      <label
                        key={col.key}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-purple-950/40 border-purple-500/40 text-white'
                            : 'bg-slate-950/50 border-white/5 text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold leading-tight">{col.label}</p>
                          <p className="text-[10px] text-slate-400 truncate">{col.description}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedColumns((prev) => [...prev, col.key])
                            } else {
                              setSelectedColumns((prev) => prev.filter((k) => k !== col.key))
                            }
                          }}
                          className="h-4 w-4 rounded border-white/20 bg-slate-950 text-purple-600 shrink-0"
                        />
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Security Shield Guarantee */}
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-[11px] text-purple-200 flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-purple-400" />
                <span>
                  <strong>Strict Margin Protection:</strong> Creator phone numbers, email addresses, and internal agency costs are permanently stripped and can never be leaked to the client.
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-white flex items-center gap-1.5"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copy Presentation Link</span>
                </button>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowShareModal(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingSettings}
                    onClick={handleSaveShareSettings}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white"
                  >
                    {savingSettings ? 'Saving...' : 'Save Column Shield'}
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
