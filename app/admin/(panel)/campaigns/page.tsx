'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Megaphone, Plus, Eye, EyeOff, Pencil, Users,
  Instagram, Youtube, ShoppingBag, Globe, Search, Trash2,
  Copy, Check, Upload, GripVertical, ArrowUp, ArrowDown,
  ArrowUpDown, ArrowUpToLine, Sparkles, RefreshCw, Layers
} from 'lucide-react'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'
import { BulkCampaignUploadModal } from '@/components/admin/BulkCampaignUploadModal'

interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
  category: string
  platform: string
  budget_type: string
  status: string
  is_live: boolean
  created_at: string
  application_count: number
  display_order?: number
}

const platformIcons: Record<string, React.ReactNode> = {
  'Instagram': <Instagram className="h-4 w-4 text-pink-400" />,
  'YouTube': <Youtube className="h-4 w-4 text-red-400" />,
  'Amazon': <ShoppingBag className="h-4 w-4 text-amber-400" />,
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-slate-500/15 text-slate-300 border-slate-500/20',
  'Active': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Review': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Closed': 'bg-red-500/15 text-red-300 border-red-500/20',
  'Completed': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
}

const filters = ['All', 'Active', 'Draft', 'Review', 'Closed', 'Completed']

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)

  // Reorder & Sequence Management States
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [draggedCampaignId, setDraggedCampaignId] = useState<string | null>(null)
  const [dragOverCampaignId, setDragOverCampaignId] = useState<string | null>(null)
  const [rankModalCampaign, setRankModalCampaign] = useState<Campaign | null>(null)
  const [targetRankInput, setTargetRankInput] = useState<string>('')

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const copyCampaignLink = (c: Campaign) => {
    if (typeof window === 'undefined') return
    const shareUrl = `${window.location.origin}/campaigns/${c.id}`
    navigator.clipboard.writeText(shareUrl)
    setCopiedId(c.id)
    toast.success(`Copied campaign link for ${c.brand_name}!`)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/campaigns')
      const data = await res.json()
      const list = data.campaigns || []
      // Normalize display_order
      const sorted = list.map((c: Campaign, idx: number) => ({
        ...c,
        display_order: typeof c.display_order === 'number' && c.display_order > 0 ? c.display_order : idx + 1
      }))
      setCampaigns(sorted)
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  // Persist updated campaign sequence to server
  const saveCampaignSequence = async (updatedList: Campaign[], notify = true) => {
    setIsSavingOrder(true)
    try {
      const payload = updatedList.map((c, index) => ({
        id: c.id,
        display_order: index + 1,
      }))

      const res = await fetch('/api/admin/campaigns/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: payload }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save order')
      }

      if (notify) {
        toast.success('Campaign sequence saved successfully!')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save sequence')
      // Refresh to restore accurate order
      fetchCampaigns()
    } finally {
      setIsSavingOrder(false)
    }
  }

  // Quick Action: Move campaign to Rank #1 (Top)
  const handleMoveToTop = async (campaignId: string) => {
    const currentIndex = campaigns.findIndex(c => c.id === campaignId)
    if (currentIndex <= 0) return

    const selected = campaigns[currentIndex]
    const newList = [
      selected,
      ...campaigns.filter(c => c.id !== campaignId)
    ].map((c, idx) => ({ ...c, display_order: idx + 1 }))

    setCampaigns(newList)
    await saveCampaignSequence(newList, false)
    toast.success(`Moved "${selected.brand_name}" to Top (#1)`)
  }

  // Quick Action: Step Up (-1) or Down (+1)
  const handleStepMove = async (campaignId: string, direction: -1 | 1) => {
    const currentIndex = campaigns.findIndex(c => c.id === campaignId)
    if (currentIndex === -1) return

    const targetIndex = currentIndex + direction
    if (targetIndex < 0 || targetIndex >= campaigns.length) return

    const newList = [...campaigns]
    const temp = newList[currentIndex]
    newList[currentIndex] = newList[targetIndex]
    newList[targetIndex] = temp

    const reindexed = newList.map((c, idx) => ({ ...c, display_order: idx + 1 }))
    setCampaigns(reindexed)
    await saveCampaignSequence(reindexed, false)
  }

  // Direct Number Rank Assignment
  const handleDirectRankSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!rankModalCampaign) return

    const targetRank = parseInt(targetRankInput, 10)
    if (isNaN(targetRank) || targetRank < 1 || targetRank > campaigns.length) {
      toast.error(`Please enter a valid rank between 1 and ${campaigns.length}`)
      return
    }

    const currentIndex = campaigns.findIndex(c => c.id === rankModalCampaign.id)
    if (currentIndex === -1) return

    const targetIndex = targetRank - 1
    if (currentIndex === targetIndex) {
      setRankModalCampaign(null)
      return
    }

    const newList = [...campaigns]
    const [movedItem] = newList.splice(currentIndex, 1)
    newList.splice(targetIndex, 0, movedItem)

    const reindexed = newList.map((c, idx) => ({ ...c, display_order: idx + 1 }))
    setCampaigns(reindexed)
    setRankModalCampaign(null)

    await saveCampaignSequence(reindexed, false)
    toast.success(`Positioned "${movedItem.brand_name}" at #${targetRank}`)
  }

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedCampaignId(id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', id)
  }

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCampaignId !== id) {
      setDragOverCampaignId(id)
    }
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    setDragOverCampaignId(null)

    const sourceId = draggedCampaignId || e.dataTransfer.getData('text/plain')
    setDraggedCampaignId(null)

    if (!sourceId || sourceId === targetId) return

    const sourceIndex = campaigns.findIndex(c => c.id === sourceId)
    const targetIndex = campaigns.findIndex(c => c.id === targetId)

    if (sourceIndex === -1 || targetIndex === -1) return

    const newList = [...campaigns]
    const [movedItem] = newList.splice(sourceIndex, 1)
    newList.splice(targetIndex, 0, movedItem)

    const reindexed = newList.map((c, idx) => ({ ...c, display_order: idx + 1 }))
    setCampaigns(reindexed)

    await saveCampaignSequence(reindexed, false)
    toast.success(`Reordered "${movedItem.brand_name}" to #${targetIndex + 1}`)
  }

  const handleDragEnd = () => {
    setDraggedCampaignId(null)
    setDragOverCampaignId(null)
  }

  const deleteCampaign = async (campaign: Campaign) => {
    if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${campaign.brand_name}" (${campaign.campaign_code}) from the database? This action cannot be undone.`)) {
      return
    }

    setDeletingId(campaign.id)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to delete')

      const updated = campaigns.filter(c => c.id !== campaign.id).map((c, idx) => ({ ...c, display_order: idx + 1 }))
      setCampaigns(updated)
      toast.success(`Campaign "${campaign.brand_name}" permanently deleted`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete campaign')
    } finally {
      setDeletingId(null)
    }
  }

  const toggleLive = async (campaign: Campaign) => {
    setTogglingId(campaign.id)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_live: !campaign.is_live }),
      })
      if (!res.ok) throw new Error('Failed to update')

      setCampaigns(prev =>
        prev.map(c => c.id === campaign.id ? { ...c, is_live: !c.is_live } : c)
      )
      toast.success(campaign.is_live ? 'Campaign taken offline' : 'Campaign is now live!')
    } catch {
      toast.error('Failed to toggle')
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = campaigns.filter(c => {
    const matchesFilter = activeFilter === 'All' || c.status === activeFilter
    const matchesSearch = 
      c.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.campaign_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return <GlobalLoader text="Loading Campaigns..." />
  }

  return (
    <div className="space-y-6">
      {/* Header Injection */}
      <SetAdminHeader>
        <div className="flex items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Campaigns</h1>
            <p className="text-xs text-slate-400">Manage brand campaigns & priority arrangement</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Reorder / Sequence Mode Toggle */}
            <Button
              onClick={() => {
                if (!isReorderMode && activeFilter !== 'All') {
                  setActiveFilter('All')
                  toast.info('Switched filter to "All" for sequence arrangement')
                }
                setIsReorderMode(!isReorderMode)
              }}
              variant={isReorderMode ? 'default' : 'outline'}
              className={`h-9 px-3.5 rounded-xl font-semibold text-xs transition-all cursor-pointer ${
                isReorderMode
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg shadow-amber-500/20 font-bold'
                  : 'border-white/10 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white'
              }`}
            >
              <ArrowUpDown className={`mr-1.5 h-3.5 w-3.5 ${isReorderMode ? 'text-slate-950' : 'text-amber-400'}`} />
              {isReorderMode ? 'Exit Arrange Mode' : 'Arrange Sequence'}
            </Button>

            <Button
              onClick={() => setShowBulkModal(true)}
              variant="outline"
              className="h-9 px-3.5 rounded-xl border-white/10 bg-slate-800/80 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-xs transition-all cursor-pointer"
            >
              <Upload className="mr-1.5 h-3.5 w-3.5 text-indigo-400" />
              Bulk Upload
            </Button>
            <Link href="/admin/campaigns/create">
              <Button className="h-9 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 cursor-pointer">
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Campaign
              </Button>
            </Link>
          </div>
        </div>
      </SetAdminHeader>

      {/* Arrange Mode Banner */}
      {isReorderMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 p-4 shadow-lg backdrop-blur-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-inner">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                Sequence & Priority Arrangement Active
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Live Sync
                </span>
              </h4>
              <p className="text-xs text-slate-300 mt-0.5">
                Drag cards via the grip handles, click <span className="font-semibold text-amber-300"># rank badges</span> to jump slots, or use <span className="font-semibold text-indigo-300">🔝 Top</span> to pin top campaigns for creators.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fetchCampaigns()}
              className="h-8 px-3 rounded-lg border-white/10 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
            >
              <RefreshCw className="h-3 w-3 mr-1.5 text-slate-400" />
              Reset Order
            </Button>
            <Button
              size="sm"
              onClick={() => setIsReorderMode(false)}
              className="h-8 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
            >
              Done Arranging
            </Button>
          </div>
        </motion.div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                activeFilter === f
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
              }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  ({campaigns.filter(c => c.status === f).length})
                </span>
              )}
              {f === 'All' && (
                <span className="ml-1.5 text-[10px] opacity-60">({campaigns.length})</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-9 bg-slate-900/50 border-white/5 text-white h-10 text-sm focus-visible:ring-indigo-500 rounded-xl w-full transition-all hover:bg-slate-900/80"
          />
        </div>
      </div>

      {/* Campaign Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No campaigns found</h3>
          <p className="text-sm text-slate-500 mt-2">
            {activeFilter !== 'All' ? 'Try a different filter' : 'Create your first campaign'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((campaign, i) => {
              const globalIndex = campaigns.findIndex(c => c.id === campaign.id)
              const rankNumber = globalIndex !== -1 ? globalIndex + 1 : (campaign.display_order || i + 1)
              const isBeingDragged = draggedCampaignId === campaign.id
              const isDragTarget = dragOverCampaignId === campaign.id && draggedCampaignId !== campaign.id

              return (
                <motion.div
                  layout
                  key={campaign.id}
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: isBeingDragged ? 0.4 : 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e as any, campaign.id)}
                  onDragOver={(e) => handleDragOver(e as any, campaign.id)}
                  onDragLeave={handleDragLeave as any}
                  onDrop={(e) => handleDrop(e as any, campaign.id)}
                  onDragEnd={handleDragEnd}
                  className={`group relative rounded-2xl border transition-all p-5 shadow-lg backdrop-blur-lg flex flex-col justify-between select-none ${
                    isDragTarget
                      ? 'border-amber-400 bg-amber-500/10 scale-[1.02] shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40'
                      : isBeingDragged
                      ? 'border-indigo-500/50 bg-indigo-900/30'
                      : 'border-white/5 bg-slate-900/60 hover:bg-slate-800/80 hover:border-white/10 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    {/* Top Row: Rank Badge, Drag Grip, Platform Icon, Brand & Quick Position Buttons */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Drag Handle */}
                        <div
                          title="Drag to reorder sequence"
                          className="flex items-center justify-center h-11 w-6 rounded-lg text-slate-500 group-hover:text-amber-400 hover:bg-white/5 cursor-grab active:cursor-grabbing transition-colors shrink-0"
                        >
                          <GripVertical className="h-5 w-5" />
                        </div>

                        {/* Rank Badge / Direct Rank Trigger */}
                        <button
                          type="button"
                          onClick={() => {
                            setRankModalCampaign(campaign)
                            setTargetRankInput(rankNumber.toString())
                          }}
                          title="Click to change sequence rank number"
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer shadow-sm active:scale-95 border ${
                            rankNumber === 1
                              ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/40 hover:border-amber-400'
                              : rankNumber <= 3
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:border-indigo-400'
                              : 'bg-slate-800 text-slate-300 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <span className="opacity-70 text-[10px]">#</span>
                          <span>{rankNumber}</span>
                          {rankNumber === 1 && <span className="text-[10px] ml-0.5">👑</span>}
                        </button>

                        <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-slate-800 border border-white/5 text-slate-400 shrink-0 group-hover:bg-slate-700/50 group-hover:border-white/10 transition-colors">
                          {platformIcons[campaign.platform] || <Globe className="h-5 w-5" />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h3 className="text-sm font-semibold text-white truncate">{campaign.brand_name}</h3>
                          </div>
                          <p className="text-xs text-slate-500">{campaign.campaign_code} • {campaign.platform}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {/* Quick Move Up/Down/Top Buttons */}
                        <div className="flex items-center bg-slate-950/40 border border-white/5 rounded-xl p-0.5">
                          {globalIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMoveToTop(campaign.id)}
                              title="Move to Top (#1 Priority)"
                              className="h-7 px-1.5 rounded-lg text-[10px] font-semibold text-slate-400 hover:text-amber-300 hover:bg-amber-500/15 transition-all flex items-center gap-0.5 cursor-pointer"
                            >
                              <ArrowUpToLine className="h-3.5 w-3.5 text-amber-400" />
                              <span className="hidden sm:inline">Top</span>
                            </button>
                          )}
                          {globalIndex > 0 && (
                            <button
                              type="button"
                              onClick={() => handleStepMove(campaign.id, -1)}
                              title="Move Up 1 Slot"
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {globalIndex < campaigns.length - 1 && (
                            <button
                              type="button"
                              onClick={() => handleStepMove(campaign.id, 1)}
                              title="Move Down 1 Slot"
                              className="h-7 w-7 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center cursor-pointer"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Copy Link Badge */}
                        <button
                          onClick={() => copyCampaignLink(campaign)}
                          title="Copy campaign link"
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/25 hover:border-indigo-500/50 transition-all cursor-pointer shadow-sm active:scale-95"
                        >
                          {copiedId === campaign.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-indigo-400" />}
                          <span className="hidden sm:inline">{copiedId === campaign.id ? 'Copied' : 'Link'}</span>
                        </button>

                        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium border ${statusColors[campaign.status] || statusColors['Draft']}`}>
                          {campaign.status}
                        </span>
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-slate-400 ml-8">
                      {campaign.category && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/5">{campaign.category}</span>
                      )}
                      {campaign.budget_type && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/5">{campaign.budget_type}</span>
                      )}
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/5 font-medium text-slate-300">
                        <Users className="h-3 w-3 text-indigo-400" />
                        {campaign.application_count} applied
                      </span>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 mt-auto">
                    {/* Live Toggle */}
                    <button
                      onClick={() => toggleLive(campaign)}
                      disabled={togglingId === campaign.id}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                        campaign.is_live
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/25'
                          : 'bg-slate-800/80 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {campaign.is_live ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                      {campaign.is_live ? 'Live' : 'Offline'}
                    </button>

                    {/* Edit */}
                    <Link href={`/admin/campaigns/${campaign.id}`}>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                    </Link>

                    {/* Delete */}
                    <button
                      onClick={() => deleteCampaign(campaign)}
                      disabled={deletingId === campaign.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>

                    {/* View Applications */}
                    <Link href={`/admin/applications/${campaign.id}`} className="ml-auto">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer">
                        <Users className="h-3.5 w-3.5" />
                        View Applications
                      </button>
                    </Link>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Bulk Upload Modal */}
      <BulkCampaignUploadModal
        isOpen={showBulkModal}
        onClose={() => setShowBulkModal(false)}
        onSuccess={fetchCampaigns}
      />

      {/* Direct Sequence / Rank Number Changer Modal */}
      {rankModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <ArrowUpDown className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Set Campaign Position</h3>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">
                  {rankModalCampaign.brand_name} ({rankModalCampaign.campaign_code})
                </p>
              </div>
            </div>

            <form onSubmit={handleDirectRankSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Target Rank (1 to {campaigns.length})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-400">#</span>
                  <Input
                    type="number"
                    min="1"
                    max={campaigns.length}
                    value={targetRankInput}
                    onChange={(e) => setTargetRankInput(e.target.value)}
                    autoFocus
                    className="pl-8 bg-slate-800 border-white/10 text-white font-bold text-lg h-11 focus-visible:ring-amber-400 rounded-xl"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Entering #1 will pin this campaign to the top of creator dashboards.
                </p>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setTargetRankInput('1')}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all"
                >
                  🔝 #1 Top
                </button>
                {campaigns.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setTargetRankInput('2')}
                    className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 transition-all"
                  >
                    #2 Slot
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setTargetRankInput(campaigns.length.toString())}
                  className="flex-1 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 transition-all"
                >
                  ⏬ #{campaigns.length} Bottom
                </button>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRankModalCampaign(null)}
                  className="h-9 px-4 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSavingOrder}
                  className="h-9 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  {isSavingOrder ? 'Saving...' : 'Apply Position'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
