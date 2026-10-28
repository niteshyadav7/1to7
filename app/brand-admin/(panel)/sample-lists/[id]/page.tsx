'use client'

import React, { useState, useEffect, use, useRef, useMemo } from 'react'
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
  Upload,
  FileDown,
  CheckCircle2,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { AVAILABLE_ROSTER_COLUMNS, type SampleList, type SampleListItem, type SampleRosterColumnKey } from '@/types/sample-roster'
import {
  SAMPLE_ROSTER_TEMPLATE_HEADERS,
  SAMPLE_ROSTER_TEMPLATE_ROWS,
} from '@/app/api/admin/sample-lists/template/route'

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

  // Sheet Import & Template state
  const [sheetText, setSheetText] = useState('')
  const [importing, setImporting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [copiedTemplate, setCopiedTemplate] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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

  // Publish to Brand Portal state
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [availableBrands, setAvailableBrands] = useState<any[]>([])
  const [selectedBrandId, setSelectedBrandId] = useState<string>('')
  const [selectedBrandName, setSelectedBrandName] = useState<string>('')
  const [pitchNote, setPitchNote] = useState<string>('')
  const [publishing, setPublishing] = useState(false)
  const [allowBrandShortlisting, setAllowBrandShortlisting] = useState(true)

  useEffect(() => {
    fetchRosterDetails()
    fetchAvailableBrands()
  }, [id])

  useEffect(() => {
    if (showAddFromDbModal && dbResults.length === 0) {
      handleDbSearch('')
    }
  }, [showAddFromDbModal])

  const fetchAvailableBrands = async () => {
    try {
      const res = await fetch('/api/brand-admin/brands-list')
      const data = await res.json()
      if (res.ok && data.brands) {
        setAvailableBrands(data.brands)
      }
    } catch {
      // Non-fatal
    }
  }

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
        if (data.list?.brand_id) setSelectedBrandId(data.list.brand_id)
        if (data.list?.brand_name) setSelectedBrandName(data.list.brand_name)
        if (data.list?.pitch_note_to_brand) setPitchNote(data.list.pitch_note_to_brand)
      } else {
        toast.error(data.error || 'Failed to load roster')
      }
    } catch {
      toast.error('Failed to load roster details')
    } finally {
      setLoading(false)
    }
  }

  // Handle Publish / Send to Brand Portal
  const handlePublishToBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBrandName.trim()) {
      return toast.error('Please select or specify the target client brand')
    }

    setPublishing(true)
    try {
      const res = await fetch(`/api/brand-admin/sample-lists/${id}/publish-to-brand`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_id: selectedBrandId || undefined,
          brand_name: selectedBrandName.trim(),
          pitch_note_to_brand: pitchNote.trim() || undefined,
          visible_columns: selectedColumns,
          allow_brand_shortlisting: allowBrandShortlisting,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send to brand portal')

      toast.success(data.message || `Sample roster sent to ${selectedBrandName}'s Brand Portal!`)
      setList(data.roster)
      setShowPublishModal(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send to brand portal')
    } finally {
      setPublishing(false)
    }
  }

  // Search DB creators
  const handleDbSearch = async (queryOverride?: string) => {
    const q = (typeof queryOverride === 'string' ? queryOverride : dbSearch).trim()
    setDbLoading(true)
    try {
      const url = q
        ? `/api/admin/influencers/search?q=${encodeURIComponent(q)}`
        : `/api/admin/influencers/search`
      const res = await fetch(url)
      const data = await res.json()
      if (res.ok) {
        setDbResults(data.influencers || data.creators || [])
      } else {
        toast.error(data.error || 'Failed to search creators')
      }
    } catch {
      toast.error('Network error searching creators')
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
        creator_name: c.full_name || c.name || 'Creator',
        instagram_username: c.instagram_username || c.full_name || c.name,
        followers: c.followers || 0,
        city: c.city || c.state || null,
        niche: c.category || c.niche || null,
        sample_reel_url: c.sample_reel_url || c.instagram_profiles?.[0]?.sample_reel || null,
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

  // Download Sample Template CSV
  const handleDownloadTemplate = () => {
    const headerLine = SAMPLE_ROSTER_TEMPLATE_HEADERS.join(',')
    const dataLines = SAMPLE_ROSTER_TEMPLATE_ROWS.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    )
    const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'sample_creator_roster_template.csv'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Downloaded sample CSV template! Open in Excel or Google Sheets.')
  }

  // Copy Template headers & sample rows to clipboard (TSV format for direct Excel/Sheet paste)
  const handleCopyTemplateData = () => {
    const tsvHeader = SAMPLE_ROSTER_TEMPLATE_HEADERS.join('\t')
    const tsvRows = SAMPLE_ROSTER_TEMPLATE_ROWS.map((r) => r.join('\t')).join('\n')
    const tsvContent = `${tsvHeader}\n${tsvRows}`
    navigator.clipboard.writeText(tsvContent)
    setCopiedTemplate(true)
    toast.success('Copied template columns & sample rows to clipboard!')
    setTimeout(() => setCopiedTemplate(false), 2500)
  }

  // Read uploaded file (CSV/TSV/TXT)
  const processFile = (file: File) => {
    if (!file.name.match(/\.(csv|tsv|txt)$/i)) {
      return toast.error('Please upload a .csv, .tsv, or .txt file')
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (text) {
        setSheetText(text)
        toast.success(`Loaded "${file.name}" into importer!`)
      }
    }
    reader.onerror = () => {
      toast.error('Failed to read file')
    }
    reader.readAsText(file)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
      e.target.value = ''
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Parse CSV line taking quotes and delimiters into account
  const parseCSVLine = (line: string): string[] => {
    const isTab = line.includes('\t')
    if (isTab) {
      return line.split('\t').map((c) => c.trim().replace(/^["']|["']$/g, ''))
    }
    const result: string[] = []
    let current = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^["']|["']$/g, ''))
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim().replace(/^["']|["']$/g, ''))
    return result
  }

  // Live count of detected creator rows
  const detectedRowCount = useMemo(() => {
    if (!sheetText.trim()) return 0
    const lines = sheetText.trim().split('\n').filter((l) => l.trim().length > 0)
    if (lines.length === 0) return 0
    const firstLine = lines[0].toLowerCase()
    const hasHeader =
      firstLine.includes('name') ||
      firstLine.includes('instagram') ||
      firstLine.includes('handle') ||
      firstLine.includes('follower') ||
      firstLine.includes('username')
    const count = hasHeader ? lines.length - 1 : lines.length
    return Math.max(0, count)
  }, [sheetText])

  // Parse and import from Google Sheet / CSV paste or upload
  const handleImportSheet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sheetText.trim()) return toast.error('Please paste or upload data from your sheet')

    setImporting(true)
    try {
      const lines = sheetText.trim().split('\n').filter((l) => l.trim().length > 0)
      if (lines.length === 0) throw new Error('No data found to import')

      // Detect header row if present
      const firstLine = lines[0].toLowerCase()
      const hasHeader =
        firstLine.includes('name') ||
        firstLine.includes('instagram') ||
        firstLine.includes('handle') ||
        firstLine.includes('follower') ||
        firstLine.includes('username')

      const dataLines = hasHeader ? lines.slice(1) : lines
      const parsedItems: any[] = []

      for (const line of dataLines) {
        const parts = parseCSVLine(line)

        if (parts.length >= 2) {
          const creatorName = parts[0]
          const handle = parts[1]
          const followers = parts[2] || '0'
          const views = parts[3] || '0'
          const engRate = parts[4] || '0'
          const city = parts[5] || null

          let niche: string | null = null
          let reelUrl: string | null = null
          let commercial: any = null

          if (parts.length >= 7) {
            if (parts[6]?.startsWith('http') || parts[6]?.includes('instagram.com')) {
              reelUrl = parts[6]
              commercial = parts[7] || null
            } else {
              niche = parts[6]
              reelUrl = parts[7]?.startsWith('http') || parts[7]?.includes('instagram.com') ? parts[7] : null
              commercial = parts[8] || (parts[7] && !parts[7].startsWith('http') ? parts[7] : null)
            }
          } else if (parts.length === 6) {
            if (parts[5]?.startsWith('http')) {
              reelUrl = parts[5]
            }
          }

          if (handle) {
            parsedItems.push({
              creator_name: creatorName,
              instagram_username: handle,
              followers,
              avg_reels_views: views,
              engagement_rate: engRate,
              city,
              niche,
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
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download CSV template to prepare your creator list in Excel or Google Sheets"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              <span>Download Template</span>
            </button>

            <button
              onClick={() => setShowPublishModal(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
              title="Publish and send this sample roster directly to the brand's portal table"
            >
              <Send className="h-3.5 w-3.5" />
              <span>{list.is_published_to_brand ? 'Update on Brand Portal' : 'Send to Brand Portal'}</span>
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

      {/* Brand Portal Publication Banner */}
      {list.is_published_to_brand && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-yellow-950/30 to-slate-900 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-400/20 text-amber-300 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <p className="font-bold text-white flex items-center gap-1.5">
                <span>Active on Brand Client Portal</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
                  Target: {list.brand_name}
                </span>
              </p>
              <p className="text-[11px] text-slate-400">
                Brand client can inspect the creators table and submit shortlists directly inside their portal.
                {list.published_at && (
                  <span className="text-amber-300/80 ml-1">
                    (Sent {new Date(list.published_at).toLocaleDateString()})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="/brand/sample-rosters"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-xl bg-amber-400/15 hover:bg-amber-400/25 text-amber-300 font-bold text-xs flex items-center gap-1.5 border border-amber-400/30 transition-all cursor-pointer"
            >
              <span>View in Brand Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      )}

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
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/60 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-2 px-3">Creator & Instagram</th>
                <th className="py-2 px-2 text-center">Followers</th>
                <th className="py-2 px-2 text-center">Avg Reels Views</th>
                <th className="py-2 px-2 text-center">Eng. Rate</th>
                <th className="py-2 px-2">Location & Niche</th>
                <th className="py-2 px-2">Sample Reel</th>
                <th className="py-2 px-2 text-right">Commercial (₹)</th>
                <th className="py-2 px-2 text-right">
                  <span className="inline-flex items-center gap-1 text-amber-400" title="Internal Cost (Hidden from client)">
                    <Lock className="h-2.5 w-2.5" /> Cost (₹)
                  </span>
                </th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 text-xs">
                    No creators in this sample roster matching your search.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Name & Handle */}
                    <td className="py-1.5 px-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center border border-purple-500/30 text-[10px] shrink-0">
                          {item.creator_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-white text-[11px] truncate max-w-[140px]" title={item.creator_name}>{item.creator_name}</p>
                          <a
                            href={`https://instagram.com/${item.instagram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-pink-400 hover:text-pink-300 font-medium inline-flex items-center gap-0.5 truncate max-w-[120px]"
                            title={`@${item.instagram_username}`}
                          >
                            <Instagram className="h-2.5 w-2.5 shrink-0" />
                            <span>@{item.instagram_username}</span>
                          </a>
                        </div>
                      </div>
                    </td>

                    {/* Followers */}
                    <td className="py-1.5 px-2 text-center font-bold text-slate-200 text-[11px]">
                      {item.followers > 0 ? item.followers.toLocaleString() : '—'}
                    </td>

                    {/* Avg Views */}
                    <td className="py-1.5 px-2 text-center font-semibold text-slate-300 text-[11px]">
                      {item.avg_reels_views > 0 ? item.avg_reels_views.toLocaleString() : '—'}
                    </td>

                    {/* Engagement */}
                    <td className="py-1.5 px-2 text-center">
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                        {item.engagement_rate > 0 ? `${item.engagement_rate}%` : '—'}
                      </span>
                    </td>

                    {/* Location & Niche */}
                    <td className="py-1.5 px-2 text-slate-300">
                      <p className="truncate text-[10px] max-w-[100px]">{item.city || 'Pan India'}</p>
                      {item.niche && (
                        <span className="text-[9px] text-pink-400/90 font-medium truncate block max-w-[100px]">{item.niche}</span>
                      )}
                    </td>

                    {/* Sample Reel */}
                    <td className="py-1.5 px-2">
                      {item.sample_reel_url ? (
                        <a
                          href={item.sample_reel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-6 px-1.5 rounded-md bg-white/5 hover:bg-white/10 text-purple-300 hover:text-purple-200 inline-flex items-center gap-1 text-[10px] font-semibold transition-colors"
                        >
                          <Video className="h-2.5 w-2.5" />
                          <span>Watch</span>
                        </a>
                      ) : (
                        <span className="text-slate-500 italic text-[10px]">No sample</span>
                      )}
                    </td>

                    {/* Brand Commercial */}
                    <td className="py-1.5 px-2 text-right font-bold text-slate-200 text-[11px]">
                      {item.brand_commercial ? `₹${item.brand_commercial.toLocaleString()}` : '—'}
                    </td>

                    {/* Internal Cost (Secret) */}
                    <td className="py-1.5 px-2 text-right font-mono text-amber-300/90 text-[11px]">
                      {item.internal_cost ? `₹${item.internal_cost.toLocaleString()}` : '—'}
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id, item.creator_name)}
                        className="h-6 w-6 rounded-md inline-flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove from roster"
                      >
                        <Trash2 className="h-3 w-3" />
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
          <div
            onClick={() => {
              if (!addingFromDb) setShowAddFromDbModal(false)
            }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white cursor-default"
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
                    onKeyDown={(e) => e.key === 'Enter' && handleDbSearch(dbSearch)}
                    placeholder="Search by creator name, Instagram handle, category, or city..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400 placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => handleDbSearch(dbSearch)}
                  disabled={dbLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50"
                >
                  {dbLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Search'}
                </button>
              </div>

              {/* DB Results */}
              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {dbLoading ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-slate-400">
                    <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                    <span className="text-xs">Loading verified creators from 1to7 DB...</span>
                  </div>
                ) : dbResults.length === 0 ? (
                  <div className="py-10 text-center space-y-1.5 text-slate-500">
                    <p className="text-xs font-semibold text-slate-400">
                      {dbSearch.trim() ? `No creators found matching "${dbSearch.trim()}"` : 'No verified creators found'}
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Try searching with another name, handle, category (e.g. Fashion, Food), or city.
                    </p>
                  </div>
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
                            ? 'bg-purple-950/40 border-purple-500 text-white shadow-sm shadow-purple-500/20'
                            : 'bg-slate-950/60 border-white/5 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="rounded border-white/20 bg-slate-900 text-purple-600 focus:ring-0 focus:ring-offset-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white truncate">{creator.full_name || creator.name}</p>
                              {creator.category && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/20 truncate max-w-[140px]">
                                  {creator.category}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-pink-400 truncate mt-0.5">
                              @{creator.instagram_username || 'n/a'} • {(creator.followers || 0).toLocaleString()} followers
                              {(creator.city || creator.state) && ` • ${creator.city || creator.state}`}
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
          <div
            onClick={() => {
              if (!importing) setShowImportSheetModal(false)
            }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white max-h-[92vh] overflow-y-auto cursor-default"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Import Creators from Sheet or CSV</h3>
                    <p className="text-xs text-slate-400">Add multiple creators to this roster using a spreadsheet</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowImportSheetModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Template Download & Copy Card */}
              <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-xs">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Need the Roster CSV Template?</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Download our ready-to-use CSV template pre-filled with sample rows, or copy sample columns to paste into Excel or Google Sheets.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Download Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyTemplateData}
                    className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Copy tab-delimited columns & example rows"
                  >
                    {copiedTemplate ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copiedTemplate ? 'Copied!' : 'Copy Sample'}</span>
                  </button>
                </div>
              </div>

              {/* Drag & Drop File Upload Area */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-3.5 rounded-xl border-2 border-dashed transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isDragging
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-white/10 hover:border-emerald-500/40 bg-slate-950/50 hover:bg-slate-950/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Upload className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">Click to upload .CSV file or drag & drop here</p>
                    <p className="text-[11px] text-slate-400">Upload your completed template or Google Sheets export (.csv, .tsv, .txt)</p>
                  </div>
                </div>
                <span className="text-[11px] px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 font-medium shrink-0 hover:bg-white/10">
                  Browse File
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Expected Column Format Guide */}
              <div className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-400 text-[11px]">
                  <span>Expected Columns (in order):</span>
                  <span className="text-emerald-400 font-medium">Supports comma or tab-delimited</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 font-mono text-[11px] text-emerald-300 border border-emerald-500/20 overflow-x-auto whitespace-nowrap">
                  Creator Name | Instagram Handle | Followers | Avg Views | Eng % | City | Niche | Sample Reel URL | Commercial (₹)
                </div>
              </div>

              {/* Text Area for Pasting */}
              <form onSubmit={handleImportSheet} className="space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <label className="text-slate-300 font-medium">Or paste rows directly from spreadsheet:</label>
                    <div className="flex items-center gap-2">
                      {detectedRowCount > 0 && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{detectedRowCount} creators detected</span>
                        </span>
                      )}
                      {sheetText.trim() && (
                        <button
                          type="button"
                          onClick={() => setSheetText('')}
                          className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <textarea
                    rows={7}
                    required
                    value={sheetText}
                    onChange={(e) => setSheetText(e.target.value)}
                    placeholder={`Paste rows here from Excel or Google Sheets...
Pooja Hegde\t@pooja_hegde\t500K\t120K\t3.8%\tMumbai\tFashion & Lifestyle\thttps://www.instagram.com/reel/C3x9abc123\t25000
Rohan Sharma\t@rohan_fitness\t85K\t45K\t4.5%\tDelhi\tFitness & Health\thttps://www.instagram.com/reel/D2k8def456\t12000`}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-white/10">
                  <a
                    href="/api/admin/sample-lists/template"
                    download="sample_creator_roster_template.csv"
                    className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 transition-colors"
                  >
                    <FileDown className="h-3.5 w-3.5" />
                    <span>Direct template link</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowImportSheetModal(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={importing || !sheetText.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 disabled:opacity-50 transition-all cursor-pointer shadow-md shadow-emerald-600/25"
                    >
                      {importing ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Importing...</span>
                        </>
                      ) : (
                        <>
                          <FileSpreadsheet className="h-3.5 w-3.5" />
                          <span>Parse & Import {detectedRowCount > 0 ? `(${detectedRowCount} Creators)` : 'Creators'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal 3: Column Visibility Shield & Share Configurator */}
      <AnimatePresence>
        {showShareModal && (
          <div
            onClick={() => {
              if (!savingSettings) setShowShareModal(false)
            }}
            className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-xl bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white cursor-default"
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

      {/* Modal 4: Send / Publish to Brand Portal */}
      <AnimatePresence>
        {showPublishModal && (
          <div
            onClick={() => {
              if (!publishing) setShowPublishModal(false)
            }}
            className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-slate-900 border border-amber-400/40 rounded-3xl p-6 shadow-2xl space-y-4 text-white cursor-default"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30">
                    <Send className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">Send to Brand Client Portal</h3>
                    <p className="text-xs text-slate-400">
                      Dispatches this sample roster into the brand's authenticated portal table
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPublishModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handlePublishToBrand} className="space-y-4 text-xs">
                {/* Brand Selector */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-amber-400" />
                    <span>Target Client Brand</span>
                  </label>

                  {availableBrands.length > 0 && (
                    <select
                      value={selectedBrandId}
                      onChange={(e) => {
                        const bId = e.target.value
                        setSelectedBrandId(bId)
                        const match = availableBrands.find((b) => b.id === bId)
                        if (match) setSelectedBrandName(match.name)
                      }}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Choose Existing Client Brand --</option>
                      {availableBrands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.industry || 'Client Brand'})
                        </option>
                      ))}
                    </select>
                  )}

                  <input
                    type="text"
                    value={selectedBrandName}
                    onChange={(e) => setSelectedBrandName(e.target.value)}
                    placeholder="Or enter brand name (e.g. Mamaearth, boAt Lifestyle)..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 mt-1"
                    required
                  />
                  <p className="text-[11px] text-slate-500">
                    The roster will appear directly under the brand's "Sample Pitch Decks" tab.
                  </p>
                </div>

                {/* Pitch Note to Brand POC */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>KAM Pitch Note to Brand</span>
                  </label>
                  <textarea
                    rows={3}
                    value={pitchNote}
                    onChange={(e) => setPitchNote(e.target.value)}
                    placeholder="e.g. Hi Team, curated these top creators for your upcoming launch. High reel engagement and verified Pan-India delivery."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {/* Brand Interaction Mode Toggle: Shortlist Mode vs Catalog View Mode */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer">
                      <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                      <span>Allow Client Brand to Shortlist Creators</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setAllowBrandShortlisting(!allowBrandShortlisting)}
                      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        allowBrandShortlisting ? 'bg-amber-400' : 'bg-slate-700'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-200 ease-in-out ${
                          allowBrandShortlisting ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-snug">
                    {allowBrandShortlisting
                      ? '⭐ Interactive Mode: Brand POC can select checkboxes and submit their curated shortlist back to TheHype.'
                      : '👁️ Catalog Mode: Brand POC can only view and explore creator profiles. Selection & shortlisting buttons will be hidden.'}
                  </p>
                </div>

                {/* Column Shield Confirmation Card */}
                <div className="p-3 rounded-2xl bg-slate-950/80 border border-purple-500/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-purple-300 flex items-center gap-1">
                      <Shield className="h-3.5 w-3.5" />
                      <span>Security & Margin Protection</span>
                    </span>
                    <span className="text-emerald-400 text-[11px]">Active</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sharing with <strong className="text-white">{selectedColumns.length} revealed columns</strong>.
                    Internal cost (₹) and admin notes are permanently stripped from the brand view.
                  </p>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowPublishModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={publishing || !selectedBrandName.trim()}
                    className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 flex items-center gap-2 shadow-lg shadow-amber-400/25 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {publishing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Sending to Brand...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Publish & Send to Brand Portal</span>
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
