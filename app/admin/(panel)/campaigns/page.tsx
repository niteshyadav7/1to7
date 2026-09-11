'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Megaphone, Plus, Eye, EyeOff, Pencil, Users,
  Instagram, Youtube, ShoppingBag, Globe, Search, Trash2,
  Copy, CopyPlus, Check, Upload, GripVertical, ArrowUp, ArrowDown,
  ArrowUpDown, ArrowUpToLine, Sparkles, RefreshCw, Layers,
  ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Clock,
  Info, UserCheck, AlertTriangle, FileText, CheckCheck, X,
  Download, FileSpreadsheet, ChevronDown, Loader2, History,
  FlaskConical, Rocket
} from 'lucide-react'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'
import { BulkCampaignUploadModal } from '@/components/admin/BulkCampaignUploadModal'
import { CampaignRecentDiffBanner, CampaignEditHistoryModal } from '@/components/admin/CampaignDiffViewer'
import { CampaignEditLogEntry } from '@/lib/utils/campaign-audit-diff'

interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
  category: string
  platform: string
  budget_type: string
  budget_amount?: number
  status: string
  is_live: boolean
  created_at: string
  application_count: number
  display_order?: number
  approval_status?: 'Approved' | 'Pending Approval' | 'Rejected'
  created_by_admin_id?: string
  created_by_admin_name?: string
  created_by_admin_email?: string
  last_edited_by_admin_id?: string
  last_edited_by_admin_name?: string
  last_edited_by_admin_email?: string
  last_edited_at?: string
  approved_by_admin_id?: string
  approved_by_admin_name?: string
  approved_by_admin_email?: string
  approved_at?: string
  rejection_reason?: string
  requirements?: string
  deliverables?: string
  followers?: string
  min_followers?: number
  location?: string
  location_type?: string
  edit_history?: CampaignEditLogEntry[]
  is_test_mode?: boolean
  test_user_ids?: string[]
  test_creators?: any[]
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

const filters = ['All', 'Pending Approvals', 'Pilot Campaigns', 'Active', 'Draft', 'Review', 'Closed', 'Completed']

export default function AdminCampaignsPage() {
  const { admin, isSuperAdmin } = useAdminPermissions()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [showBulkModal, setShowBulkModal] = useState(false)

  // Launch from Pilot Modal States
  const [launchModalCampaign, setLaunchModalCampaign] = useState<Campaign | null>(null)
  const [clearTestData, setClearTestData] = useState<boolean>(true)
  const [isLaunching, setIsLaunching] = useState<boolean>(false)

  // Approval & Governance States
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectModalCampaign, setRejectModalCampaign] = useState<Campaign | null>(null)
  const [rejectionReasonInput, setRejectionReasonInput] = useState('')
  const [reviewModalCampaign, setReviewModalCampaign] = useState<Campaign | null>(null)
  const [historyModalCampaign, setHistoryModalCampaign] = useState<Campaign | null>(null)

  // Reorder & Sequence Management States
  const [isReorderMode, setIsReorderMode] = useState(false)
  const [isSavingOrder, setIsSavingOrder] = useState(false)
  const [draggedCampaignId, setDraggedCampaignId] = useState<string | null>(null)
  const [dragOverCampaignId, setDragOverCampaignId] = useState<string | null>(null)
  const [rankModalCampaign, setRankModalCampaign] = useState<Campaign | null>(null)
  const [targetRankInput, setTargetRankInput] = useState<string>('')

  // Export States & Handlers
  const [isExporting, setIsExporting] = useState(false)
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false)
  const [exportingCampaignId, setExportingCampaignId] = useState<string | null>(null)
  const exportMenuRef = useRef<HTMLDivElement>(null)

  // Close export dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleExportCampaigns = async (scope: 'all' | 'filtered') => {
    setIsExporting(true)
    const toastId = toast.loading('Generating campaigns export CSV...')
    try {
      let url = '/api/admin/campaigns/export?type=campaigns'
      if (scope === 'filtered') {
        if (activeFilter !== 'All') url += `&status=${encodeURIComponent(activeFilter)}`
        if (searchQuery) url += `&search=${encodeURIComponent(searchQuery)}`
      }

      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to export campaigns')
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `campaigns_specs_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success('Campaigns specifications exported successfully!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Export failed', { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportAllApplications = async () => {
    setIsExporting(true)
    const toastId = toast.loading('Generating all applications export CSV...')
    try {
      const url = '/api/admin/campaigns/export?type=applications'
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to export applications')
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `all_campaign_applicants_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success('All campaign applications exported successfully!', { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Export failed', { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSingleCampaignApplications = async (campaign: Campaign) => {
    setExportingCampaignId(campaign.id)
    const toastId = toast.loading(`Exporting applications for ${campaign.brand_name}...`)
    try {
      const url = `/api/admin/campaigns/export?type=applications&campaign_id=${campaign.id}`
      const res = await fetch(url)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to export applications')
      }

      const blob = await res.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = downloadUrl
      a.download = `campaign_${campaign.campaign_code}_applicants_${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(downloadUrl)

      toast.success(`Exported applications for ${campaign.brand_name}!`, { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Export failed', { id: toastId })
    } finally {
      setExportingCampaignId(null)
    }
  }

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

  const handleCopyCampaignDetails = (c: Campaign) => {
    try {
      const configStr = JSON.stringify(c, null, 2)
      navigator.clipboard.writeText(configStr)
      localStorage.setItem('admin_copied_campaign_config', configStr)
      toast.success(`Copied all specifications of "${c.brand_name}" to clipboard & template storage!`)
    } catch {
      toast.error('Failed to copy campaign specifications')
    }
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

  // Handle Campaign Approval
  const handleApproveCampaign = async (campaign: Campaign) => {
    // Check strict maker-checker rule: Only author of latest state cannot self-approve
    const latestAuthorId = campaign.last_edited_by_admin_id || campaign.created_by_admin_id
    if (!isSuperAdmin && admin?.id && latestAuthorId === admin.id) {
      toast.error(
        campaign.last_edited_by_admin_id
          ? 'Dual control policy: You made the latest modifications to this campaign and cannot self-approve. Another admin must review and approve it.'
          : 'Dual control policy: You created this campaign and cannot self-approve. Another admin must review and approve it.'
      )
      return
    }

    setApprovingId(campaign.id)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve campaign')

      toast.success(data.message || `Campaign "${campaign.brand_name}" approved and published live!`)
      if (reviewModalCampaign?.id === campaign.id) {
        setReviewModalCampaign(null)
      }
      fetchCampaigns()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve campaign')
    } finally {
      setApprovingId(null)
    }
  }

  // Handle Campaign Rejection
  const handleRejectCampaign = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!rejectModalCampaign) return

    setApprovingId(rejectModalCampaign.id)
    try {
      const res = await fetch(`/api/admin/campaigns/${rejectModalCampaign.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          rejection_reason: rejectionReasonInput.trim() || 'Rejected during admin review'
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject campaign')

      toast.success(data.message || `Campaign "${rejectModalCampaign.brand_name}" marked as Rejected.`)
      setRejectModalCampaign(null)
      setRejectionReasonInput('')
      if (reviewModalCampaign?.id === rejectModalCampaign.id) {
        setReviewModalCampaign(null)
      }
      fetchCampaigns()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject campaign')
    } finally {
      setApprovingId(null)
    }
  }

  // Launch campaign from pilot testing to public live
  const handleLaunchToPublic = async () => {
    if (!launchModalCampaign) return
    setIsLaunching(true)
    try {
      const res = await fetch(`/api/admin/campaigns/${launchModalCampaign.id}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clear_test_data: clearTestData }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to launch campaign')

      toast.success(data.message || `Campaign "${launchModalCampaign.brand_name}" is now live for all creators!`)
      setLaunchModalCampaign(null)
      fetchCampaigns()
    } catch (err: any) {
      toast.error(err.message || 'Failed to launch campaign')
    } finally {
      setIsLaunching(false)
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

  const pendingCount = campaigns.filter(c => c.approval_status === 'Pending Approval').length
  const pilotCount = campaigns.filter(c => Boolean(c.is_test_mode)).length

  const filtered = campaigns.filter(c => {
    let matchesFilter = true
    if (activeFilter === 'Pending Approvals') {
      matchesFilter = c.approval_status === 'Pending Approval'
    } else if (activeFilter === 'Pilot Campaigns') {
      matchesFilter = Boolean(c.is_test_mode)
    } else if (activeFilter !== 'All') {
      matchesFilter = c.status === activeFilter
    }
    const matchesSearch = 
      c.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.campaign_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.created_by_admin_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.created_by_admin_email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.approved_by_admin_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.approved_by_admin_email || '').toLowerCase().includes(searchQuery.toLowerCase())
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
            <p className="text-xs text-slate-400">Manage brand campaigns, dual-admin approvals & priority arrangement</p>
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

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <Button
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                disabled={isExporting}
                variant="outline"
                className="h-9 px-3.5 rounded-xl border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 hover:text-white font-semibold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                {isExporting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>Export</span>
                <ChevronDown className={`h-3.5 w-3.5 text-emerald-400/80 transition-transform ${exportDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>

              <AnimatePresence>
                {exportDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-72 z-50 rounded-2xl bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-1.5 shadow-2xl shadow-black/50"
                  >
                    <button
                      onClick={() => {
                        setExportDropdownOpen(false)
                        handleExportCampaigns('all')
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left hover:bg-white/5 transition-all text-xs cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:bg-indigo-500/20">
                        <FileSpreadsheet className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">All Campaigns (Setup Specs)</p>
                        <p className="text-[11px] text-slate-400">Export complete campaigns for Bulk Upload re-import</p>
                      </div>
                    </button>

                    <button
                      onClick={() => {
                        setExportDropdownOpen(false)
                        handleExportAllApplications()
                      }}
                      className="w-full flex items-start gap-3 p-2.5 rounded-xl text-left hover:bg-white/5 transition-all text-xs cursor-pointer group"
                    >
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:bg-emerald-500/20">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">All Campaign Applications</p>
                        <p className="text-[11px] text-slate-400">Export creator applications formatted for Import Sync</p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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

      {/* Pending Approvals Notice Banner if viewing Pending tab */}
      {activeFilter === 'Pending Approvals' && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <p className="font-bold text-amber-300 text-sm">Dual-Admin Approval Queue</p>
            <p className="mt-0.5">
              Campaigns listed here require sign-off before they can go live to creators. To prevent conflicts of interest, an admin who created a campaign cannot self-approve it (unless Super Admin).
            </p>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => {
            const isPendingTab = f === 'Pending Approvals'
            const isPilotTab = f === 'Pilot Campaigns'
            return (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border flex items-center gap-1.5 ${
                  activeFilter === f
                    ? isPendingTab || isPilotTab
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10 font-bold'
                      : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                    : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
                }`}
              >
                {isPendingTab && <Clock className="h-3 w-3 text-amber-400" />}
                {isPilotTab && <FlaskConical className="h-3 w-3 text-amber-400" />}
                <span>{f}</span>
                {isPendingTab ? (
                  pendingCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950 animate-pulse">
                      {pendingCount}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-60">(0)</span>
                  )
                ) : isPilotTab ? (
                  pilotCount > 0 ? (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-slate-950">
                      {pilotCount}
                    </span>
                  ) : (
                    <span className="text-[10px] opacity-60">(0)</span>
                  )
                ) : f !== 'All' ? (
                  <span className="text-[10px] opacity-60">
                    ({campaigns.filter(c => c.status === f).length})
                  </span>
                ) : (
                  <span className="text-[10px] opacity-60">({campaigns.length})</span>
                )}
              </button>
            )
          })}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns or admin emails..."
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
                      : campaign.approval_status === 'Pending Approval'
                      ? 'border-amber-500/30 bg-slate-900/80 hover:bg-slate-800/90 shadow-amber-500/5'
                      : 'border-white/5 bg-slate-900/60 hover:bg-slate-800/80 hover:border-white/10 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5'
                  }`}
                >
                  <div>
                    {/* Top Row: Rank Badge, Drag Grip, Platform Icon, Brand & Quick Position Buttons */}
                    <div className="flex items-start justify-between gap-3 mb-3">
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

                        {/* Pilot Mode Badge */}
                        {campaign.is_test_mode && (
                          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold border bg-amber-500/20 text-amber-300 border-amber-500/40 flex items-center gap-1 shadow-sm">
                            <FlaskConical className="h-3 w-3 text-amber-400" />
                            Pilot ({campaign.test_creators?.length || campaign.test_user_ids?.length || 0} Testers)
                          </span>
                        )}

                        {/* Approval or Status Badge */}
                        {campaign.approval_status === 'Pending Approval' ? (
                          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold border bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse flex items-center gap-1">
                            <Clock className="h-3 w-3" /> Pending 2nd Approval
                          </span>
                        ) : campaign.approval_status === 'Rejected' ? (
                          <span className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold border bg-rose-500/20 text-rose-300 border-rose-500/40 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> Rejected
                          </span>
                        ) : (
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium border ${statusColors[campaign.status] || statusColors['Draft']}`}>
                            {campaign.status}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-slate-400 ml-8">
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

                    {/* Admin Audit Box: Creator & Approver Information */}
                    <div className="ml-8 mb-3 p-2.5 rounded-xl bg-slate-950/70 border border-white/5 text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between gap-2 text-slate-400">
                        <span className="flex items-center gap-1.5 truncate">
                          <UserCheck className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                          <span className="text-slate-500">Created by:</span>
                          <span className="text-slate-200 font-semibold truncate">{campaign.created_by_admin_name || 'Admin'}</span>
                        </span>
                        {campaign.created_by_admin_email && (
                          <span className="font-mono text-[10px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 shrink-0">
                            {campaign.created_by_admin_email}
                          </span>
                        )}
                      </div>

                      {campaign.last_edited_by_admin_name && campaign.last_edited_by_admin_name !== campaign.created_by_admin_name && (
                        <div className="flex items-center justify-between gap-2 text-slate-400 pt-1.5 border-t border-white/5 flex-wrap">
                          <span className="flex items-center gap-1.5 truncate">
                            <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                            <span className="text-slate-500">Last edited by:</span>
                            <span className="text-amber-300 font-semibold truncate">{campaign.last_edited_by_admin_name}</span>
                          </span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {campaign.edit_history && campaign.edit_history.length > 0 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setHistoryModalCampaign(campaign)
                                }}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 transition-all cursor-pointer shadow-xs hover:scale-105"
                                title="Click to view detailed field modifications"
                              >
                                <History className="h-3 w-3" />
                                <span>What Changed? ({campaign.edit_history[0]?.changes_count || campaign.edit_history[0]?.changes?.length || campaign.edit_history.length})</span>
                              </button>
                            )}
                            {campaign.last_edited_at && (
                              <span className="text-[10px] text-slate-500">
                                {new Date(campaign.last_edited_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {campaign.approval_status === 'Approved' && (
                        <div className="flex items-center justify-between gap-2 text-slate-400 pt-1.5 border-t border-white/5">
                          <span className="flex items-center gap-1.5 truncate">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                            <span className="text-slate-500">Approved by:</span>
                            <span className="text-emerald-300 font-semibold truncate">{campaign.approved_by_admin_name || 'Super Admin'}</span>
                          </span>
                          {campaign.approved_by_admin_email && (
                            <span className="font-mono text-[10px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 shrink-0">
                              {campaign.approved_by_admin_email}
                            </span>
                          )}
                        </div>
                      )}

                      {campaign.approval_status === 'Rejected' && campaign.rejection_reason && (
                        <div className="text-rose-300 text-[10px] pt-1.5 border-t border-white/5 flex items-start gap-1">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-400 shrink-0 mt-0.5" />
                          <span><strong>Rejection Reason:</strong> {campaign.rejection_reason}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5 mt-auto">
                    {/* Approval Actions for Pending Campaigns */}
                    {campaign.approval_status === 'Pending Approval' ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          onClick={() => setReviewModalCampaign(campaign)}
                          variant="outline"
                          className="h-8 px-2.5 rounded-lg border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 font-semibold text-xs transition-all cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 mr-1" />
                          Review
                        </Button>

                        {(() => {
                          const latestAuthorId = campaign.last_edited_by_admin_id || campaign.created_by_admin_id
                          const isLatestAuthor = !isSuperAdmin && admin?.id && latestAuthorId === admin.id

                          if (isLatestAuthor) {
                            return (
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1.5 rounded-lg">
                                {campaign.last_edited_by_admin_id
                                  ? 'Awaiting 2nd Admin (You edited)'
                                  : 'Awaiting 2nd Admin (Self-created)'}
                              </span>
                            )
                          }

                          return (
                            <>
                              <Button
                                size="sm"
                                disabled={approvingId === campaign.id}
                                onClick={() => handleApproveCampaign(campaign)}
                                className="h-8 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                              >
                                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                                {approvingId === campaign.id ? 'Approving...' : 'Approve & Go Live'}
                              </Button>
                              <Button
                                size="sm"
                                disabled={approvingId === campaign.id}
                                onClick={() => {
                                  setRejectModalCampaign(campaign)
                                  setRejectionReasonInput('')
                                }}
                                variant="outline"
                                className="h-8 px-2.5 rounded-lg border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs transition-all cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5 mr-1" />
                                Reject
                              </Button>
                            </>
                          )
                        })()}
                      </div>
                    ) : (
                      <>
                        {/* Live Toggle or Pilot Launch Action */}
                        {campaign.is_test_mode ? (
                          <Button
                            size="sm"
                            onClick={() => {
                              setLaunchModalCampaign(campaign)
                              setClearTestData(true)
                            }}
                            className="h-8 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                          >
                            <Rocket className="h-3.5 w-3.5" />
                            Launch to Public
                          </Button>
                        ) : (
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
                        )}
                      </>
                    )}

                    {/* Duplicate / Clone to New Campaign */}
                    <Link href={`/admin/campaigns/create?clone_from=${campaign.id}`}>
                      <button
                        type="button"
                        title="Clone all specifications into a new campaign"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all cursor-pointer shadow-sm active:scale-95"
                      >
                        <CopyPlus className="h-3.5 w-3.5 text-amber-400" />
                        Duplicate
                      </button>
                    </Link>

                    {/* Copy Full Specs */}
                    <button
                      type="button"
                      onClick={() => handleCopyCampaignDetails(campaign)}
                      title="Copy full campaign specifications to clipboard / template"
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5 text-slate-400" />
                      Copy Specs
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

                    {/* Export Campaign Applicants */}
                    <button
                      type="button"
                      onClick={() => handleExportSingleCampaignApplications(campaign)}
                      disabled={exportingCampaignId === campaign.id}
                      title={`Export all applicants of ${campaign.brand_name} as upload-ready CSV`}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all cursor-pointer shadow-sm disabled:opacity-50 ml-auto"
                    >
                      {exportingCampaignId === campaign.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                      ) : (
                        <Download className="h-3.5 w-3.5 text-emerald-400" />
                      )}
                      <span>Export CSV</span>
                    </button>

                    {/* View Applications */}
                    <Link href={`/admin/applications/${campaign.id}`}>
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

      {/* Launch to Public Confirmation Modal */}
      {launchModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
                  <Rocket className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    Launch to Public Creators
                  </h3>
                  <p className="text-xs text-slate-400">
                    Make {launchModalCampaign.brand_name} ({launchModalCampaign.campaign_code}) visible to all creators
                  </p>
                </div>
              </div>

              <button
                onClick={() => setLaunchModalCampaign(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Campaign Pilot Stats Box */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Current Mode:</span>
                <span className="font-bold text-amber-300 flex items-center gap-1">
                  <FlaskConical className="h-3.5 w-3.5" /> Pre-Launch Pilot
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Designated Pilot Testers:</span>
                <span className="font-semibold text-white">
                  {launchModalCampaign.test_creators?.length || launchModalCampaign.test_user_ids?.length || 0} creators
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Test Applications Submitted:</span>
                <span className="font-semibold text-white">
                  {launchModalCampaign.application_count} applications
                </span>
              </div>
            </div>

            {/* Reset Test Data Checkbox Option */}
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors">
              <input
                type="checkbox"
                checked={clearTestData}
                onChange={(e) => setClearTestData(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-amber-500/40 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
              />
              <div className="space-y-0.5 text-xs">
                <span className="font-bold text-amber-200">
                  Clear test applications before public launch (Recommended)
                </span>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Deletes all test submissions submitted during the pilot test so application counts, orders, and review analytics start completely clean for real creators.
                </p>
              </div>
            </label>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => setLaunchModalCampaign(null)}
                className="h-9 px-4 rounded-xl border-white/10 bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleLaunchToPublic}
                disabled={isLaunching}
                className="h-9 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5"
              >
                {isLaunching ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Launching...
                  </>
                ) : (
                  <>
                    <Rocket className="h-3.5 w-3.5" />
                    Confirm & Launch Live
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Campaign Details Review Modal (Before Approval) */}
      {reviewModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar scrollbar-none">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {reviewModalCampaign.brand_name}
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {reviewModalCampaign.campaign_code}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Platform: {reviewModalCampaign.platform} • Category: {reviewModalCampaign.category || 'General'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setReviewModalCampaign(null)}
                className="h-8 w-8 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Recent Modifications Before-After Diff Box */}
            {reviewModalCampaign.edit_history && reviewModalCampaign.edit_history.length > 0 && (
              <CampaignRecentDiffBanner
                entry={reviewModalCampaign.edit_history[0]}
                onViewAllHistory={() => setHistoryModalCampaign(reviewModalCampaign)}
              />
            )}

            {/* Campaign Specifications */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Budget & Payout</span>
                <p className="text-slate-200 font-bold text-sm">
                  {reviewModalCampaign.budget_type} {reviewModalCampaign.budget_amount ? `(₹${reviewModalCampaign.budget_amount})` : ''}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wider text-[10px]">Follower Requirement</span>
                <p className="text-slate-200 font-bold text-sm">
                  {reviewModalCampaign.min_followers ? `${reviewModalCampaign.min_followers.toLocaleString()}+ followers` : 'Any follower count'}
                </p>
              </div>
            </div>

            {/* Creator & Last Editor Information & Audit */}
            <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs space-y-2">
              <span className="text-indigo-400 font-bold uppercase tracking-wider text-[10px]">Admin Audit & Governance Details</span>
              <div className="flex items-center justify-between text-slate-300">
                <span>Created by: <strong>{reviewModalCampaign.created_by_admin_name || 'Admin'}</strong></span>
                <span className="font-mono text-[11px] text-indigo-300">{reviewModalCampaign.created_by_admin_email || 'N/A'}</span>
              </div>

              {reviewModalCampaign.last_edited_by_admin_name && reviewModalCampaign.last_edited_by_admin_name !== reviewModalCampaign.created_by_admin_name && (
                <div className="flex items-center justify-between text-slate-300 pt-1 border-t border-white/5">
                  <span>Last edited by: <strong className="text-amber-300">{reviewModalCampaign.last_edited_by_admin_name}</strong></span>
                  <span className="font-mono text-[11px] text-amber-300">{reviewModalCampaign.last_edited_by_admin_email || ''}</span>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Created on: {new Date(reviewModalCampaign.created_at).toLocaleString()}
                {reviewModalCampaign.last_edited_at && ` • Last modified: ${new Date(reviewModalCampaign.last_edited_at).toLocaleString()}`}
              </p>
            </div>

            {/* Deliverables & Requirements */}
            {reviewModalCampaign.deliverables && (
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold">Deliverables:</span>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {reviewModalCampaign.deliverables}
                </div>
              </div>
            )}

            {reviewModalCampaign.requirements && (
              <div className="space-y-1">
                <span className="text-slate-400 text-xs font-semibold">Requirements:</span>
                <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {reviewModalCampaign.requirements}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setReviewModalCampaign(null)}
                className="h-9 px-4 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                Close
              </Button>

              {(() => {
                const latestAuthorId = reviewModalCampaign.last_edited_by_admin_id || reviewModalCampaign.created_by_admin_id
                const isLatestAuthor = !isSuperAdmin && admin?.id && latestAuthorId === admin.id

                if (isLatestAuthor) {
                  return (
                    <span className="text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-xl">
                      {reviewModalCampaign.last_edited_by_admin_id
                        ? 'Dual Control: You modified these details. Another admin must review & approve.'
                        : 'Dual Control: You created this campaign. Another admin must review & approve.'}
                    </span>
                  )
                }

                return (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setRejectModalCampaign(reviewModalCampaign)
                        setRejectionReasonInput('')
                      }}
                      className="h-9 px-4 rounded-xl border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold cursor-pointer"
                    >
                      <X className="h-4 w-4 mr-1.5" />
                      Reject Campaign
                    </Button>
                    <Button
                      type="button"
                      disabled={approvingId === reviewModalCampaign.id}
                      onClick={() => handleApproveCampaign(reviewModalCampaign)}
                      className="h-9 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 cursor-pointer"
                    >
                      <CheckCheck className="h-4 w-4 mr-1.5" />
                      {approvingId === reviewModalCampaign.id ? 'Approving...' : 'Approve & Publish Live'}
                    </Button>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Reject Campaign Modal */}
      {rejectModalCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-rose-500/30 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/15 text-rose-300 border border-rose-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Reject Campaign</h3>
                <p className="text-xs text-slate-400 truncate max-w-[260px]">
                  {rejectModalCampaign.brand_name} ({rejectModalCampaign.campaign_code})
                </p>
              </div>
            </div>

            <form onSubmit={handleRejectCampaign} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Reason for Rejection / Feedback for Admin
                </label>
                <textarea
                  required
                  rows={3}
                  value={rejectionReasonInput}
                  onChange={(e) => setRejectionReasonInput(e.target.value)}
                  placeholder="e.g. Please update the follower criteria, check deliverable dates, or revise the budget amount."
                  className="w-full rounded-xl bg-slate-800 border border-white/10 p-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setRejectModalCampaign(null)}
                  className="h-9 px-4 rounded-xl text-slate-400 hover:text-white text-xs cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={approvingId === rejectModalCampaign.id}
                  className="h-9 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/20 cursor-pointer"
                >
                  {approvingId === rejectModalCampaign.id ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {/* Full Edit History Timeline Modal */}
      <CampaignEditHistoryModal
        isOpen={!!historyModalCampaign}
        onClose={() => setHistoryModalCampaign(null)}
        campaignName={historyModalCampaign?.brand_name}
        editHistory={historyModalCampaign?.edit_history}
      />
    </div>
  )
}
