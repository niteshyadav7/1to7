'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles,
  Search,
  Filter,
  Building2,
  Target,
  Layers,
  Send,
  XCircle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ShieldCheck,
  Instagram,
  MapPin,
  ExternalLink,
  RefreshCw,
  SlidersHorizontal,
  ChevronRight,
  User,
  AlertCircle,
  Eye,
  FileSpreadsheet,
  Check,
  X,
  Lock,
  ArrowUpDown,
  Truck,
  Copy,
  Phone,
  Package,
  ChevronDown,
  RotateCcw,
  CheckCheck,
  Share2,
  MessageCircle,
  Link2,
  AlertTriangle,
  UserCheck,
  IndianRupee,
  Coins,
  Edit3,
  Plus,
  DollarSign,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlobalLoader } from '@/components/ui/global-loader'
import { useRealtime } from '@/hooks/useRealtime'
import { DynamicDataTable, ColumnDef } from '@/components/brand/DynamicDataTable'
import {
  CampaignPitchItem,
  CAMPAIGN_PITCH_COLUMNS,
  FORBIDDEN_CLIENT_KEYS,
  ColumnShieldOption
} from '@/types/campaign-pitch'

function formatFollowerCount(num: number | null | undefined): string {
  if (!num) return '0'
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (num >= 1_000) return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return num.toLocaleString('en-IN')
}

function formatAdminSender(sender: string | null | undefined): string {
  if (!sender) return 'Influencer Ops'
  if (sender.includes('@')) {
    return sender.split('@')[0]
  }
  return sender
}

function formatRelativeOrDate(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    const now = new Date()
    const diffHours = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60))
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  } catch {
    return ''
  }
}

export default function CampaignPitchesCurationPage() {
  const [applications, setApplications] = useState<CampaignPitchItem[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [registeredBrands, setRegisteredBrands] = useState<Array<{ id: string; name: string; slug: string; isActive?: boolean; assignedKam?: string }>>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; campaign_code: string; title: string; brand_name: string }>>([])
  const [batches, setBatches] = useState<string[]>([])
  const [counts, setCounts] = useState({
    all: 0,
    queued_for_brand_admin: 0,
    pending_brand_review: 0,
    brand_approved: 0,
    brand_rejected: 0,
    internal_rejected: 0,
    costing: 0,
    total_commercial_value: 0,
  })
  const [loading, setLoading] = useState(true)

  // Memoized active brand workspaces (excluding paused brands)
  const activeRegisteredBrands = useMemo(
    () => registeredBrands.filter(b => b.isActive !== false),
    [registeredBrands]
  )

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [selectedBatch, setSelectedBatch] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [search, setSearch] = useState<string>('')

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Modals
  const [showColumnShieldModal, setShowColumnShieldModal] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'creator_name',
    'instagram_username',
    'followers',
    'city',
    'state',
    'selected_variant',
    'sample_reel_link'
  ])
  const [showDispatchModal, setShowDispatchModal] = useState(false)
  const [dispatchTargetBrand, setDispatchTargetBrand] = useState('')
  const [dispatchKamNotes, setDispatchKamNotes] = useState('')
  const [isDispatching, setIsDispatching] = useState(false)

  const [showInternalDropModal, setShowInternalDropModal] = useState(false)
  const [internalDropReason, setInternalDropReason] = useState('Aesthetic mismatch with brand style')
  const [internalDropNotes, setInternalDropNotes] = useState('')
  const [isDropping, setIsDropping] = useState(false)

  // Commercial Costing Modal State (Single or Bulk)
  const [showCostingModal, setShowCostingModal] = useState(false)
  const [costingTargetItems, setCostingTargetItems] = useState<CampaignPitchItem[]>([])
  const [costingClientCommercial, setCostingClientCommercial] = useState<string>('')
  const [costingInternalCost, setCostingInternalCost] = useState<string>('')
  const [costingIsCommercial, setCostingIsCommercial] = useState<boolean>(true)
  const [costingNotes, setCostingNotes] = useState<string>('')
  const [isSavingCosting, setIsSavingCosting] = useState(false)

  // Commercials toggle for Brand Portal Dispatch
  const [dispatchIncludeCommercials, setDispatchIncludeCommercials] = useState(false)

  // Details Drawer
  const [inspectItem, setInspectItem] = useState<CampaignPitchItem | null>(null)

  // Verified Delivery Address Modal
  const [viewAddressItem, setViewAddressItem] = useState<CampaignPitchItem | null>(null)

  // 1-Click WhatsApp Review Link Share Modal
  const [showShareModal, setShowShareModal] = useState(false)
  const [shareBrand, setShareBrand] = useState('')
  const [shareBatch, setShareBatch] = useState('')
  const [shareContactName, setShareContactName] = useState('')
  const [shareContactEmail, setShareContactEmail] = useState('')
  const [generatedLinkData, setGeneratedLinkData] = useState<{
    url: string
    token: string
    whatsappMessage: string
    emailSubject: string
    emailBody: string
    expiresIn: string
  } | null>(null)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)

  const handleOpenShareModal = (targetBrand?: string, targetBatch?: string) => {
    const brandToUse = targetBrand || (activeRegisteredBrands[0]?.name || '')
    const batchToUse = targetBatch || (selectedBatch !== 'all' ? selectedBatch : (batches[0] || ''))
    
    setShareBrand(brandToUse)
    setShareBatch(batchToUse)

    // Dynamic POC mapping
    let defaultContact = 'Brand Marketing Lead'
    let defaultEmail = 'marketing@brand.com'
    if (brandToUse.toLowerCase().includes('mama')) {
      defaultContact = 'Ananya Sharma (Brand Head)'
      defaultEmail = 'ananya@mamaearth.in'
    } else if (brandToUse.toLowerCase().includes('plum')) {
      defaultContact = 'Rahul Sen (Marketing Lead)'
      defaultEmail = 'rahul@plumgoodness.com'
    } else if (brandToUse.toLowerCase().includes('sugar')) {
      defaultContact = 'Kavita Roy (Digital Lead)'
      defaultEmail = 'kavita@sugarcosmetics.com'
    }

    setShareContactName(defaultContact)
    setShareContactEmail(defaultEmail)
    setShowShareModal(true)
    fetchShareLink(brandToUse, batchToUse, defaultContact, defaultEmail)
  }

  const fetchShareLink = async (bName: string, bBatch: string, cName: string, cEmail: string) => {
    try {
      setIsGeneratingLink(true)
      const count = applications.filter(a => 
        (bName === 'all' || a.brand_name === bName) && 
        (!bBatch || bBatch === 'all' || a.brand_pitch_batch_name === bBatch)
      ).length

      const res = await fetch('/api/brand-admin/campaign-pitches/generate-review-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          brand_name: bName,
          batch_name: bBatch && bBatch !== 'all' ? bBatch : undefined,
          campaign_title: selectedCampaign !== 'all' ? campaigns.find(c => c.id === selectedCampaign)?.title : undefined,
          contact_name: cName,
          contact_email: cEmail,
          creator_count: count > 0 ? count : undefined,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setGeneratedLinkData({
          url: data.url,
          token: data.token,
          whatsappMessage: data.whatsappMessage,
          emailSubject: data.emailSubject,
          emailBody: data.emailBody,
          expiresIn: data.expiresIn || '14 days',
        })
      } else {
        toast.error(data.error || 'Failed to generate review link')
      }
    } catch {
      toast.error('Network error generating review link')
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const handleCopyReviewUrl = () => {
    if (!generatedLinkData?.url) return
    navigator.clipboard.writeText(generatedLinkData.url)
    toast.success('Copied 1-Click Review Link to clipboard!')
  }

  const handleCopyWhatsAppMessage = () => {
    if (!generatedLinkData?.whatsappMessage) return
    navigator.clipboard.writeText(generatedLinkData.whatsappMessage)
    toast.success('Copied pre-formatted WhatsApp message!')
  }

  const handleOpenWhatsAppShare = () => {
    if (!generatedLinkData?.whatsappMessage) return
    const encoded = encodeURIComponent(generatedLinkData.whatsappMessage)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  const handleCopyEmailTemplate = () => {
    if (!generatedLinkData?.emailBody) return
    navigator.clipboard.writeText(`${generatedLinkData.emailSubject}\n\n${generatedLinkData.emailBody}`)
    toast.success('Copied email pitch template!')
  }

  const handleCopyCourierManifest = (item: CampaignPitchItem) => {
    const text = item.verified_address_details?.courier_copy_text
    if (!text) {
      toast.error('No verified address details available to copy')
      return
    }
    navigator.clipboard.writeText(text)
    toast.success(`Copied courier manifest for ${item.creator_name}!`)
  }

  // Commercial Costing Handlers
  const handleOpenCostingModal = (items: CampaignPitchItem | CampaignPitchItem[]) => {
    const list = Array.isArray(items) ? items : [items]
    if (list.length === 0) {
      toast.error('Please select at least one application to set costing')
      return
    }
    setCostingTargetItems(list)
    if (list.length === 1) {
      setCostingClientCommercial(list[0].client_commercial ? String(list[0].client_commercial) : '')
      setCostingInternalCost(list[0].internal_cost ? String(list[0].internal_cost) : '')
      setCostingIsCommercial(list[0].is_commercial_pitch !== false)
      setCostingNotes('')
    } else {
      setCostingClientCommercial('')
      setCostingInternalCost('')
      setCostingIsCommercial(true)
      setCostingNotes('')
    }
    setShowCostingModal(true)
  }

  const handleSaveCosting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (costingTargetItems.length === 0) return

    const clientNum = costingClientCommercial.trim() ? parseFloat(costingClientCommercial) : null
    const internalNum = costingInternalCost.trim() ? parseFloat(costingInternalCost) : null

    if (costingClientCommercial.trim() && isNaN(Number(costingClientCommercial))) {
      toast.error('Please enter a valid Client Commercial Quote (₹)')
      return
    }
    if (costingInternalCost.trim() && isNaN(Number(costingInternalCost))) {
      toast.error('Please enter a valid Internal Creator Cost (₹)')
      return
    }

    try {
      setIsSavingCosting(true)
      const res = await fetch('/api/brand-admin/campaign-pitches/costing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: costingTargetItems.map(i => i.application_id),
          client_commercial: clientNum,
          internal_cost: internalNum,
          is_commercial_pitch: costingIsCommercial,
          commercial_notes: costingNotes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(
          data.message || `Updated commercial costing for ${costingTargetItems.length} profile${costingTargetItems.length > 1 ? 's' : ''}`
        )
        setShowCostingModal(false)
        fetchData()
      } else {
        toast.error(data.error || 'Failed to update costing')
      }
    } catch {
      toast.error('Network error saving costing quote')
    } finally {
      setIsSavingCosting(false)
    }
  }

  // Load Data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const qs = new URLSearchParams()
      if (selectedBrand !== 'all') qs.set('brand', selectedBrand)
      if (selectedCampaign !== 'all') qs.set('campaign', selectedCampaign)
      if (selectedBatch !== 'all') qs.set('batch', selectedBatch)
      if (selectedStatus !== 'all') qs.set('status', selectedStatus)
      if (search.trim()) qs.set('search', search.trim())

      const res = await fetch(`/api/brand-admin/campaign-pitches?${qs.toString()}`)
      const data = await res.json()
      if (res.ok) {
        setApplications(data.applications || [])
        setBrands(data.brands || [])
        setRegisteredBrands(data.registeredBrands || [])
        setCampaigns(data.campaigns || [])
        setBatches(data.batches || [])
        if (data.counts) setCounts(data.counts)
      } else {
        toast.error(data.error || 'Failed to load campaign pitch queue')
      }
    } catch {
      toast.error('Network error fetching campaign pitch queue')
    } finally {
      setLoading(false)
    }
  }, [selectedBrand, selectedCampaign, selectedBatch, selectedStatus, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Real-time synchronization on applications table
  useRealtime({
    table: 'applications',
    onChange: () => {
      fetchData()
    },
  })

  // Filtered campaigns for brand dropdown cascade
  const filteredCampaignsList = useMemo(() => {
    if (selectedBrand === 'all') return campaigns
    return campaigns.filter(c => c.brand_name.toLowerCase() === selectedBrand.toLowerCase())
  }, [campaigns, selectedBrand])

  // Checkbox toggle helpers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(applications.map(a => a.application_id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectedApplications = useMemo(() => {
    return applications.filter(a => selectedIds.includes(a.application_id))
  }, [applications, selectedIds])

  const autoDetectedBrand = useMemo(() => {
    const first = selectedApplications[0]
    const appBrandName = first?.brand_name?.toLowerCase().trim()
    if (appBrandName) {
      const match = activeRegisteredBrands.find(
        b => b.name.toLowerCase().trim() === appBrandName || b.slug.toLowerCase().trim() === appBrandName
      )
      if (match) return match.name
    }
    return activeRegisteredBrands[0]?.name || ''
  }, [selectedApplications, activeRegisteredBrands])

  // Automatically keep dispatchTargetBrand valid and pre-selected to an active workspace
  useEffect(() => {
    if (activeRegisteredBrands.length > 0) {
      const isCurrentValid = activeRegisteredBrands.some(b => b.name === dispatchTargetBrand)
      if (!dispatchTargetBrand || !isCurrentValid) {
        setDispatchTargetBrand(autoDetectedBrand || activeRegisteredBrands[0].name)
      }
    } else {
      setDispatchTargetBrand('')
    }
  }, [activeRegisteredBrands, autoDetectedBrand, dispatchTargetBrand])

  const handleOpenDispatchModal = (appIds?: string | string[]) => {
    const ids = Array.isArray(appIds) ? appIds : appIds ? [appIds] : selectedIds
    if (ids.length === 0) {
      toast.error('Please select at least one application to send to Brand')
      return
    }
    setSelectedIds(ids)
    const targetApps = applications.filter(a => ids.includes(a.application_id))
    const appBrandName = targetApps[0]?.brand_name?.toLowerCase().trim()
    const match = activeRegisteredBrands.find(
      b => b.name.toLowerCase().trim() === appBrandName || b.slug.toLowerCase().trim() === appBrandName
    )
    const detected = match ? match.name : (activeRegisteredBrands[0]?.name || '')
    setDispatchTargetBrand(detected)
    setShowDispatchModal(true)
  }

  // Action: Single or Bulk Dispatch to Brand Client Portal
  const handleDispatchToBrand = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one application to send to Brand')
      return
    }

    if (activeRegisteredBrands.length === 0) {
      toast.error(
        registeredBrands.length === 0
          ? 'No registered Brand Client Workspaces found in database. Please onboard a brand workspace first.'
          : 'All registered Brand Client Workspaces are currently paused. Please activate a workspace in Client Brands first.'
      )
      return
    }

    const targetToDispatch = dispatchTargetBrand || autoDetectedBrand || activeRegisteredBrands[0]?.name
    if (!targetToDispatch) {
      toast.error('Please choose an active Brand Client Workspace')
      return
    }

    try {
      setIsDispatching(true)
      const res = await fetch('/api/brand-admin/campaign-pitches/send-to-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: selectedIds,
          campaignId: selectedCampaign !== 'all' ? selectedCampaign : undefined,
          targetBrand: targetToDispatch,
          visibleColumns: dispatchIncludeCommercials && !visibleColumns.includes('client_commercial')
            ? [...visibleColumns, 'client_commercial']
            : visibleColumns,
          kamNotes: dispatchKamNotes.trim() || undefined,
          includeCommercials: dispatchIncludeCommercials,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Dispatched ${selectedIds.length} profiles to Brand Portal!`)
        const dispatchedBrand = dispatchTargetBrand || (registeredBrands[0]?.name || 'Brand Client')
        const dispatchedBatch = data.batch_name || selectedBatch
        setShowDispatchModal(false)
        setDispatchKamNotes('')
        setSelectedIds([])
        fetchData()
        // Seamless handoff: Open Share Modal to immediately send to client on WhatsApp
        handleOpenShareModal(dispatchedBrand, dispatchedBatch)
      } else {
        toast.error(data.error || 'Failed to dispatch to brand')
      }
    } catch {
      toast.error('Error dispatching to brand')
    } finally {
      setIsDispatching(false)
    }
  }

  // Action: Internal Drop
  const handleInternalDrop = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one application to drop')
      return
    }

    try {
      setIsDropping(true)
      const res = await fetch('/api/brand-admin/campaign-pitches/internal-drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: selectedIds,
          reason: internalDropReason,
          notes: internalDropNotes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Dropped ${selectedIds.length} profiles from brand pitch`)
        setShowInternalDropModal(false)
        setInternalDropNotes('')
        setSelectedIds([])
        fetchData()
      } else {
        toast.error(data.error || 'Failed to drop applications')
      }
    } catch {
      toast.error('Error dropping applications')
    } finally {
      setIsDropping(false)
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (applications.length === 0) {
      toast.error('No data to export')
      return
    }

    const headers = [
      'Creator Name',
      'Influencer ID',
      'Instagram Handle',
      'Followers',
      'City',
      'State',
      'Brand',
      'Campaign',
      'Batch',
      'Status',
      'Variant',
      'Client Commercial',
      'Review Date',
      'Reviewer',
      'Notes'
    ]

    const rows = applications.map(a => [
      `"${a.creator_name || ''}"`,
      `"${a.influencer_id || ''}"`,
      `"${a.instagram_username || ''}"`,
      a.followers || 0,
      `"${a.city || ''}"`,
      `"${a.state || ''}"`,
      `"${a.brand_name || ''}"`,
      `"${a.campaign_code || ''}"`,
      `"${a.brand_pitch_batch_name || ''}"`,
      `"${a.brand_review_status || ''}"`,
      `"${a.selected_variant || ''}"`,
      a.client_commercial || '',
      `"${a.brand_reviewed_at || ''}"`,
      `"${a.brand_reviewed_by || ''}"`,
      `"${(a.brand_feedback_notes || a.brand_pitch_notes || '').replace(/"/g, '""')}"`
    ])

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Campaign_Curation_Pitches_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Exported CSV successfully')
  }

  // Memoized column definitions for DynamicDataTable
  // Memoized column definitions for DynamicDataTable with decided widths, compact typography and ellipsis truncation
  const columns: ColumnDef<CampaignPitchItem>[] = useMemo(
    () => [
      {
        key: 'creator_name',
        header: 'Creator',
        sortable: true,
        wrap: true,
        width: '16%',
        minWidth: '130px',
        accessor: (row) => row.creator_name,
        render: (item) => (
          <div className="flex items-center gap-1.5 min-w-0">
            <div
              onClick={(e) => {
                e.stopPropagation()
                setInspectItem(item)
              }}
              className="h-6 w-6 rounded-md bg-gradient-to-tr from-amber-500/20 via-purple-500/20 to-blue-500/20 border border-white/10 flex items-center justify-center text-[9px] font-bold text-amber-300 overflow-hidden shrink-0 shadow-inner hover:border-amber-400/40 transition-colors cursor-pointer"
            >
              {item.profile_photo ? (
                <img
                  src={item.profile_photo}
                  alt={item.creator_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                item.creator_name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="font-bold text-white text-[10px] hover:text-amber-300 cursor-pointer flex items-center gap-1 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  setInspectItem(item)
                }}
                title={item.creator_name}
              >
                <span className="truncate max-w-[100px]">{item.creator_name}</span>
                <span className="text-[8px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-1 py-0.2 rounded shrink-0">
                  {item.influencer_id}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <a
                  href={`https://instagram.com/${item.instagram_username}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-neutral-400 hover:text-pink-400 flex items-center gap-0.5 text-[9px] transition-colors truncate max-w-[110px]"
                  title={`@${item.instagram_username}`}
                >
                  <Instagram className="h-2 w-2 text-pink-400 shrink-0" />
                  <span className="truncate">@{item.instagram_username}</span>
                </a>
              </div>
              <div className="mt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setInspectItem(item)
                  }}
                  className="inline-flex items-center gap-0.5 text-[8px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/25 transition-all cursor-pointer shadow-xs"
                  title="View creator application details"
                >
                  <Eye className="h-2 w-2 shrink-0" />
                  <span>View</span>
                </button>
              </div>
            </div>
          </div>
        ),
      },
      {
        key: 'brand_name',
        header: 'Brand & Campaign',
        sortable: true,
        wrap: true,
        width: '15%',
        minWidth: '120px',
        accessor: (row) => `${row.brand_name} ${row.campaign_title || ''}`,
        render: (item) => (
          <div className="min-w-0">
            <div className="font-bold text-white text-[10px] truncate max-w-[125px]" title={item.brand_name}>
              {item.brand_name}
            </div>
            <div
              className="text-[9px] text-amber-300 font-semibold flex items-center gap-0.5 mt-0.5"
              title={item.campaign_title || 'Campaign'}
            >
              <Target className="h-2 w-2 text-amber-400 shrink-0" />
              <span className="truncate max-w-[120px]">{item.campaign_title || 'Campaign'}</span>
            </div>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span
                className="inline-flex items-center gap-0.5 text-[8px] font-medium px-1 py-0.2 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 max-w-[110px]"
                title={item.brand_pitch_batch_name || 'Batch'}
              >
                <Layers className="h-2 w-2 text-amber-400 shrink-0" />
                <span className="truncate">{item.brand_pitch_batch_name || 'Batch'}</span>
              </span>
              {item.campaign_code && item.campaign_code !== item.campaign_title && (
                <span className="text-[8px] font-mono text-neutral-500 truncate max-w-[80px]" title={item.campaign_code}>
                  {item.campaign_code}
                </span>
              )}
            </div>
            {item.brand_pitched_by && (
              <div
                className="text-[8px] text-neutral-400 flex items-center gap-0.5 mt-0.5 truncate max-w-[125px]"
                title={`Forwarded by ${item.brand_pitched_by}${item.brand_pitched_at ? ` on ${new Date(item.brand_pitched_at).toLocaleString('en-IN')}` : ''}`}
              >
                <UserCheck className="h-2 w-2 text-amber-400/80 shrink-0" />
                <span className="truncate">
                  Fwd: <span className="text-neutral-200 font-semibold">{formatAdminSender(item.brand_pitched_by)}</span>
                  {item.brand_pitched_at && (
                    <span className="text-neutral-500 font-normal ml-1">({formatRelativeOrDate(item.brand_pitched_at)})</span>
                  )}
                </span>
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'followers',
        header: 'Audience & Reach',
        sortable: true,
        wrap: true,
        width: '9%',
        minWidth: '80px',
        accessor: (row) => row.followers || 0,
        render: (item) => (
          <div className="min-w-0">
            <div className="font-black text-white text-[10px] tracking-tight flex items-baseline gap-0.5">
              <span>{formatFollowerCount(item.followers)}</span>
              <span className="text-[8px] font-normal text-neutral-400 font-mono">
                ({(item.followers || 0).toLocaleString('en-IN')})
              </span>
            </div>
            <div
              className="text-[9px] text-neutral-400 flex items-center gap-0.5 mt-0.5"
              title={[item.city, item.state].filter(Boolean).join(', ') || 'India'}
            >
              <MapPin className="h-2 w-2 text-neutral-500 shrink-0" />
              <span className="truncate max-w-[90px]">
                {[item.city, item.state].filter(Boolean).join(', ') || 'India'}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'selected_variant',
        header: 'Variant / SKU',
        sortable: true,
        wrap: true,
        width: '8%',
        minWidth: '70px',
        accessor: (row) => row.selected_variant || 'Standard',
        render: (item) => (
          <div className="min-w-0">
            <span
              className="inline-block px-1 py-0.2 rounded bg-slate-950 border border-white/10 text-neutral-200 text-[9px] font-semibold truncate max-w-[80px]"
              title={item.selected_variant || 'Standard'}
            >
              {item.selected_variant || 'Standard'}
            </span>
            {item.sample_reel_link && (
              <a
                href={item.sample_reel_link}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-[8.5px] text-amber-400 hover:text-amber-300 font-bold flex items-center gap-0.5 mt-0.5 hover:underline truncate max-w-[80px]"
                title="Sample Reel"
              >
                <ExternalLink className="h-2 w-2 shrink-0" />
                <span className="truncate">Sample Reel</span>
              </a>
            )}
          </div>
        ),
      },
      {
        key: 'address_verification_status',
        header: 'Delivery Address',
        sortable: true,
        wrap: true,
        width: '12%',
        minWidth: '100px',
        accessor: (row) => row.address_verification_status || 'None',
        render: (item) => (
          <div className="min-w-0">
            {item.address_verification_status === 'Verified' ? (
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-0.5 text-[8px] font-extrabold uppercase tracking-wider px-1 py-0.2 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  <span className="h-1 w-1 rounded-full bg-emerald-400 animate-pulse" />
                  Verified
                </span>
                <div
                  className="text-[9px] text-neutral-200 font-medium truncate max-w-[115px]"
                  title={[item.verified_address_details?.street, item.verified_address_details?.city, item.verified_address_details?.state].filter(Boolean).join(', ')}
                >
                  {item.verified_address_details?.city}, {item.verified_address_details?.state}
                </div>
                <div className="text-[8px] font-mono text-emerald-400 font-semibold">
                  PIN: {item.verified_address_details?.pincode}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setViewAddressItem(item)
                  }}
                  className="inline-flex items-center gap-0.5 text-[8px] font-bold text-neutral-950 hover:text-black bg-[#febd1c] hover:bg-amber-300 px-1 py-0.2 rounded transition-all cursor-pointer shadow-xs mt-0.5"
                >
                  <Eye className="h-2 w-2" />
                  <span>View</span>
                </button>
              </div>
            ) : item.address_verification_status === 'Pending' ? (
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  <Clock className="h-2 w-2 text-amber-400" />
                  Pending
                </span>
                <div className="text-[8px] text-neutral-400">
                  Awaiting Desk
                </div>
              </div>
            ) : item.address_verification_status === 'Rejected' ? (
              <div className="space-y-0.5">
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                  <XCircle className="h-2 w-2 text-rose-400" />
                  Rejected
                </span>
                <div className="text-[8px] text-neutral-400">
                  Update Req.
                </div>
              </div>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[8.5px] font-medium px-1.5 py-0.2 rounded-full bg-slate-950/80 text-neutral-400 border border-white/5">
                <AlertCircle className="h-2 w-2 text-neutral-500" />
                Not Submitted
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'client_commercial',
        header: 'Costing / Commercial',
        sortable: true,
        wrap: true,
        width: '10%',
        minWidth: '85px',
        accessor: (row) => row.client_commercial || 0,
        render: (item) => {
          const hasCommercial = item.client_commercial && item.client_commercial > 0
          const hasInternal = item.internal_cost && item.internal_cost > 0
          const margin = hasCommercial && hasInternal ? (item.client_commercial! - item.internal_cost!) : null
          const marginPercent = margin !== null && item.client_commercial ? Math.round((margin / item.client_commercial) * 100) : null

          return (
            <div className="min-w-0 space-y-0.5" onClick={(e) => e.stopPropagation()}>
              {hasCommercial ? (
                <div>
                  <div className="flex items-center gap-0.5">
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-black tracking-tight text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1 py-0.2 rounded shadow-xs">
                      <IndianRupee className="h-2 w-2 stroke-[2.5]" />
                      <span>{Number(item.client_commercial).toLocaleString('en-IN')}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenCostingModal(item)}
                      className="p-0.5 rounded bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-amber-300 transition cursor-pointer"
                      title="Edit commercial quote"
                    >
                      <Edit3 className="h-2 w-2" />
                    </button>
                  </div>
                  {hasInternal && (
                    <div className="text-[8px] text-neutral-400 flex items-center gap-0.5 font-mono mt-0.5" title={`Internal Payout: ₹${Number(item.internal_cost).toLocaleString('en-IN')} | Margin: ${marginPercent}%`}>
                      <span className="text-neutral-500">Net:</span>
                      <span>₹{Number(item.internal_cost).toLocaleString('en-IN')}</span>
                      {marginPercent !== null && (
                        <span className={`text-[7.5px] font-bold px-0.5 rounded ${marginPercent >= 20 ? 'text-emerald-400 bg-emerald-500/10' : 'text-amber-400 bg-amber-500/10'}`}>
                          {marginPercent}%
                        </span>
                      )}
                    </div>
                  )}
                  {item.is_commercial_pitch && (
                    <span className="inline-flex items-center gap-0.5 text-[7.5px] font-bold text-amber-300/80 bg-amber-500/10 px-1 py-0.2 rounded border border-amber-500/20">
                      Paid
                    </span>
                  )}
                </div>
              ) : (
                <div>
                  <span className="inline-flex items-center gap-0.5 text-[8.5px] font-medium text-neutral-500 bg-white/5 px-1 py-0.2 rounded border border-white/5">
                    Barter (₹0)
                  </span>
                  <div className="mt-0.5">
                    <button
                      type="button"
                      onClick={() => handleOpenCostingModal(item)}
                      className="inline-flex items-center gap-0.5 text-[8px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-1 py-0.2 rounded border border-amber-500/30 transition cursor-pointer"
                      title="Set commercial quote for client pitch"
                    >
                      <Plus className="h-2 w-2" />
                      <span>+ Costing</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )
        },
      },
      {
        key: 'brand_review_status',
        header: 'Status & Decision',
        sortable: true,
        wrap: true,
        width: '14%',
        minWidth: '115px',
        accessor: (row) => row.brand_review_status,
        render: (item) => {
          const isApproved = item.brand_review_status === 'brand_approved'
          const isRejected = item.brand_review_status === 'brand_rejected'
          const isInternalDropped = item.brand_review_status === 'internal_rejected'
          const isQueued = item.brand_review_status === 'queued_for_brand_admin'

          if (isApproved) {
            return (
              <div className="min-w-0 pr-1">
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 truncate max-w-[115px]">
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-400 shrink-0" />
                  <span className="truncate">Shortlisted</span>
                </span>
                {item.brand_reviewed_by && (
                  <div className="text-[8px] text-emerald-400/80 mt-0.5 truncate max-w-[115px]" title={`By ${item.brand_reviewed_by}`}>
                    By {item.brand_reviewed_by}
                  </div>
                )}
              </div>
            )
          }

          if (isRejected) {
            return (
              <div className="min-w-0 pr-1">
                <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 truncate max-w-[115px]">
                  <XCircle className="h-2.5 w-2.5 text-rose-400 shrink-0" />
                  <span className="truncate">Rejected</span>
                </span>
                {item.brand_rejection_reason && (
                  <div
                    className="text-[8px] text-rose-400/80 mt-0.5 truncate max-w-[115px]"
                    title={item.brand_rejection_reason}
                  >
                    {item.brand_rejection_reason}
                  </div>
                )}
              </div>
            )
          }

          if (isInternalDropped) {
            return (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-neutral-800 text-neutral-400 border border-neutral-700 truncate max-w-[115px]">
                <X className="h-2.5 w-2.5 text-neutral-500 shrink-0" />
                <span className="truncate">Dropped</span>
              </span>
            )
          }

          if (isQueued) {
            return (
              <div className="min-w-0 pr-1">
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 shadow-sm shadow-blue-500/10 truncate max-w-[115px]">
                  <Clock className="h-2.5 w-2.5 text-blue-400 animate-pulse shrink-0" />
                  <span className="truncate">Queued for KAM</span>
                </span>
                {item.brand_pitched_by && (
                  <div
                    className="text-[8px] text-blue-300/80 mt-0.5 truncate max-w-[115px]"
                    title={`Forwarded by ${item.brand_pitched_by}${item.brand_pitched_at ? ` on ${new Date(item.brand_pitched_at).toLocaleString('en-IN')}` : ''}`}
                  >
                    Fwd: <span className="font-semibold text-white">{formatAdminSender(item.brand_pitched_by)}</span>
                  </div>
                )}
              </div>
            )
          }

          return (
            <div className="min-w-0 pr-1">
              <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm shadow-purple-500/10 truncate max-w-[115px]">
                <Send className="h-2.5 w-2.5 text-purple-400 shrink-0" />
                <span className="truncate">With Brand</span>
              </span>
              {item.brand_pitched_by && (
                <div
                  className="text-[8px] text-purple-300/80 mt-0.5 truncate max-w-[115px]"
                  title={`Dispatched / Forwarded by ${item.brand_pitched_by}`}
                >
                  By: <span className="font-semibold text-white">{formatAdminSender(item.brand_pitched_by)}</span>
                </div>
              )}
            </div>
          )
        },
      },
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        hideable: false,
        align: 'right',
        width: '13%',
        minWidth: '85px',
        render: (item) => {
          const isQueued = item.brand_review_status === 'queued_for_brand_admin'
          return (
            <div className="flex items-center justify-end gap-1 shrink-0 whitespace-nowrap min-w-[70px]" onClick={(e) => e.stopPropagation()}>
              {!isQueued && (
                <button
                  type="button"
                  onClick={() => setInspectItem(item)}
                  className="h-5.5 px-1.5 rounded bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white border border-white/5 text-[9px] font-medium flex items-center gap-0.5 transition-all cursor-pointer shrink-0"
                  title="Inspect details"
                >
                  <Eye className="h-2 w-2" />
                  <span>View</span>
                </button>
              )}

              {isQueued && (
                <>
                  <button
                    type="button"
                    onClick={() => handleOpenDispatchModal(item.application_id)}
                    className="h-5.5 px-2 rounded text-[9px] font-bold bg-[#febd1c] hover:bg-amber-300 text-neutral-950 flex items-center gap-0.5 cursor-pointer shadow-sm shadow-amber-500/20 transition-all hover:scale-105 active:scale-95 shrink-0"
                    title="Send to Brand Client Portal"
                  >
                    <Send className="h-2 w-2" />
                    <span>Send</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds([item.application_id])
                      setShowInternalDropModal(true)
                    }}
                    className="h-5.5 w-5.5 rounded bg-white/5 hover:bg-rose-500/20 text-neutral-400 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 flex items-center justify-center transition-all cursor-pointer shrink-0"
                    title="Drop creator"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </>
              )}
            </div>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="w-full max-w-[1680px] mx-auto space-y-5 pb-24">
      {/* 1. Header & Desk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold mb-2 shadow-sm shadow-amber-500/10">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Campaign Curation & Pitch Desk</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 ml-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Campaign Curation & Pitch Desk
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
            Review applicant creators forwarded from Influencer Ops, verify barter delivery addresses, configure client column privacy, and dispatch curated rosters to Brand Portals in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => handleOpenShareModal()}
            className="bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs h-9 flex items-center gap-1.5 cursor-pointer rounded-xl shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Share2 className="h-3.5 w-3.5 text-slate-950 stroke-[2.5]" />
            <span>1-Click Client Link</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowColumnShieldModal(true)}
            className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 flex items-center gap-1.5 bg-slate-900/80 cursor-pointer rounded-xl"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            <span>Column Shield ({visibleColumns.length})</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 flex items-center gap-1.5 bg-slate-900/80 cursor-pointer rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 text-xs h-9 flex items-center gap-1.5 bg-slate-900/80 cursor-pointer rounded-xl shadow-sm"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 2. Metric KPI Cards (Interactive Command Deck) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          {
            id: 'all',
            label: 'Total Pitched',
            count: counts.all,
            subtext: 'Across all campaigns',
            icon: User,
            accentText: 'text-amber-400',
            activeClass: 'bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-900 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-1 ring-amber-400/50',
            iconBg: 'bg-amber-500/10 text-amber-400',
            topLine: 'via-amber-400'
          },
          {
            id: 'costing',
            label: 'Costing (Paid)',
            count: counts.costing || 0,
            subtext: counts.total_commercial_value > 0
              ? `₹${Number(counts.total_commercial_value).toLocaleString('en-IN')} quote`
              : 'Commercial quotes',
            icon: IndianRupee,
            accentText: 'text-emerald-400',
            activeClass: 'bg-gradient-to-b from-emerald-500/20 via-slate-900/90 to-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/15 ring-1 ring-emerald-400/50',
            iconBg: 'bg-emerald-500/10 text-emerald-400',
            topLine: 'via-emerald-400',
          },
          {
            id: 'queued_for_brand_admin',
            label: 'Queued for KAM',
            count: counts.queued_for_brand_admin,
            subtext: 'From Influencer Ops',
            icon: Clock,
            accentText: 'text-blue-400',
            activeClass: 'bg-gradient-to-b from-blue-500/15 via-slate-900/90 to-slate-900 border-blue-500/60 shadow-lg shadow-blue-500/10 ring-1 ring-blue-400/50',
            iconBg: 'bg-blue-500/10 text-blue-400',
            topLine: 'via-blue-400',
            pulse: true
          },
          {
            id: 'pending_brand_review',
            label: 'With Brand',
            count: counts.pending_brand_review,
            subtext: 'Awaiting client review',
            icon: Send,
            accentText: 'text-purple-400',
            activeClass: 'bg-gradient-to-b from-purple-500/15 via-slate-900/90 to-slate-900 border-purple-500/60 shadow-lg shadow-purple-500/10 ring-1 ring-purple-400/50',
            iconBg: 'bg-purple-500/10 text-purple-400',
            topLine: 'via-purple-400'
          },
          {
            id: 'brand_approved',
            label: 'Shortlisted',
            count: counts.brand_approved,
            subtext: 'Approved by client',
            icon: CheckCircle2,
            accentText: 'text-emerald-400',
            activeClass: 'bg-gradient-to-b from-emerald-500/15 via-slate-900/90 to-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-400/50',
            iconBg: 'bg-emerald-500/10 text-emerald-400',
            topLine: 'via-emerald-400'
          },
          {
            id: 'brand_rejected',
            label: 'Rejected',
            count: counts.brand_rejected,
            subtext: 'Client rejected',
            icon: XCircle,
            accentText: 'text-rose-400',
            activeClass: 'bg-gradient-to-b from-rose-500/15 via-slate-900/90 to-slate-900 border-rose-500/60 shadow-lg shadow-rose-500/10 ring-1 ring-rose-400/50',
            iconBg: 'bg-rose-500/10 text-rose-400',
            topLine: 'via-rose-400'
          },
          {
            id: 'internal_rejected',
            label: 'Internal Dropped',
            count: counts.internal_rejected,
            subtext: 'Dropped before brand',
            icon: X,
            accentText: 'text-neutral-400',
            activeClass: 'bg-gradient-to-b from-neutral-800/40 via-slate-900/90 to-slate-900 border-neutral-600 shadow-lg ring-1 ring-neutral-500/50',
            iconBg: 'bg-white/5 text-neutral-400',
            topLine: 'via-neutral-500'
          }
        ].map((kpi) => {
          const Icon = kpi.icon
          const isActive = selectedStatus === kpi.id
          return (
            <div
              key={kpi.id}
              onClick={() => setSelectedStatus(kpi.id)}
              className={`cursor-pointer p-3.5 sm:p-4 rounded-2xl border transition-all duration-200 relative overflow-hidden group hover:-translate-y-0.5 select-none ${
                isActive
                  ? kpi.activeClass
                  : 'bg-slate-900/70 backdrop-blur-xl border-white/[0.08] hover:border-white/20 hover:bg-slate-900/90'
              }`}
            >
              <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${kpi.topLine} to-transparent opacity-80`} />
              <div className="flex items-center justify-between">
                <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 truncate ${
                  isActive ? 'text-white font-extrabold' : kpi.accentText
                }`}>
                  {kpi.pulse && <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-ping" />}
                  {kpi.label}
                </span>
                <div className={`h-6 w-6 rounded-lg ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="flex items-baseline justify-between mt-2">
                <div className="text-2xl font-black text-white tracking-tight">{kpi.count}</div>
                {isActive && (
                  <span className="text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/10 text-amber-300 border border-white/10">
                    Active
                  </span>
                )}
              </div>
              <div className="text-[10px] text-neutral-400 mt-1 truncate">{kpi.subtext}</div>
            </div>
          )
        })}
      </div>

      {/* 3. Campaign & Brand Scope Selectors */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1">
            {/* Brand Filter */}
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Client Brand
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value)
                    setSelectedCampaign('all')
                  }}
                  className="w-full pl-9 pr-9 py-2 text-xs font-semibold border border-white/10 rounded-xl bg-slate-950 text-white focus:outline-none focus:border-amber-400 transition-all cursor-pointer appearance-none hover:border-white/20"
                >
                  <option value="all">
                    All Brands ({brands.length + registeredBrands.length})
                  </option>
                  {registeredBrands.length > 0 && (
                    <optgroup label="⭐ Registered Client Workspaces (Brand Admin)">
                      {registeredBrands.map(b => (
                        <option key={`reg-${b.id}`} value={b.name}>
                          ⭐ {b.name} {!b.isActive ? '(Paused)' : ''} (Client Workspace)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="🏷️ Influencer Campaign Brands (Source Tags)">
                    {brands.map(b => (
                      <option key={`camp-${b}`} value={b}>
                        🏷️ {b} (Campaign Tag)
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            {/* Campaign Filter */}
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Campaign
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs font-semibold border border-white/10 rounded-xl bg-slate-950 text-white focus:outline-none focus:border-amber-400 transition-all cursor-pointer appearance-none truncate hover:border-white/20"
                >
                  <option value="all">All Campaigns ({filteredCampaignsList.length})</option>
                  {filteredCampaignsList.map(c => {
                    const hasBrand = Boolean(c.brand_name && c.brand_name !== 'Unassigned')
                    const brandText = selectedBrand === 'all' && hasBrand ? `${c.brand_name} — ` : ''
                    const titleText = c.title && c.title !== c.campaign_code ? `${c.title} ` : ''
                    const codeText = c.campaign_code ? `(${c.campaign_code})` : ''
                    return (
                      <option key={c.id} value={c.id}>
                        {brandText}{titleText}{codeText}
                      </option>
                    )
                  })}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            {/* Batch Filter */}
            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Pitch Batch
              </label>
              <div className="relative">
                <Layers className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs font-semibold border border-white/10 rounded-xl bg-slate-950 text-white focus:outline-none focus:border-amber-400 transition-all cursor-pointer appearance-none truncate hover:border-white/20"
                >
                  <option value="all">All Batches ({batches.length})</option>
                  {batches.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-end">
            {/* 1-Click Launch Live Brand Dashboard for Selected Brand */}
            {selectedBrand !== 'all' && (
              <a
                href={`/api/brand-admin/virtual-brand/impersonate?brandId=${encodeURIComponent(
                  registeredBrands.find(b => b.name.toLowerCase() === selectedBrand.toLowerCase())?.id || selectedBrand
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                title={`Launch Live Brand Dashboard as ${selectedBrand}`}
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 hover:from-pink-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-pink-500/25 transition-all cursor-pointer hover:scale-105 active:scale-95 shrink-0"
              >
                <Eye className="w-3.5 h-3.5 shrink-0 animate-pulse" />
                <span>Launch {selectedBrand} Portal</span>
              </a>
            )}

            {(selectedBrand !== 'all' || selectedCampaign !== 'all' || selectedBatch !== 'all' || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand('all')
                  setSelectedCampaign('all')
                  setSelectedBatch('all')
                  setSelectedStatus('all')
                  setSearch('')
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 hover:underline cursor-pointer px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 shrink-0 h-9"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset Scope
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Luxury Dynamic Curation Data Table */}
      <DynamicDataTable
        data={applications}
        columns={columns}
        keyField="application_id"
        loading={loading}
        tableLayout="fixed"
        minTableWidth="w-full min-w-[960px]"
        defaultCompact={true}
        selectedRowIds={selectedIds}
        onSelectionChange={setSelectedIds}
        filterTabs={{
          key: 'status',
          activeValue: selectedStatus,
          onChange: (val) => setSelectedStatus(val),
          options: [
            { label: 'All', value: 'all', count: counts.all },
            { label: 'Costing / Paid', value: 'costing', count: counts.costing || 0 },
            { label: 'Queued', value: 'queued_for_brand_admin', count: counts.queued_for_brand_admin },
            { label: 'Sent to Brand', value: 'pending_brand_review', count: counts.pending_brand_review },
            { label: 'Shortlisted', value: 'brand_approved', count: counts.brand_approved },
            { label: 'Rejected', value: 'brand_rejected', count: counts.brand_rejected },
            { label: 'Internal Dropped', value: 'internal_rejected', count: counts.internal_rejected },
          ],
        }}
        searchPlaceholder="Search creator, handle, brand, campaign, city..."
        searchFields={[
          'creator_name',
          'instagram_username',
          'influencer_id',
          'brand_name',
          'campaign_title',
          'campaign_code',
          'city',
          'state',
          'brand_pitch_batch_name',
          'brand_pitched_by',
        ]}
        bulkActions={[
          {
            label: 'Send to Brand Portal',
            icon: Send,
            variant: 'default',
            onClick: (rows) => {
              handleOpenDispatchModal(rows.map((r) => r.application_id))
            },
          },
          {
            label: 'Set Commercial Costing (₹)',
            icon: IndianRupee,
            variant: 'outline',
            onClick: (rows) => {
              handleOpenCostingModal(rows)
            },
          },
          {
            label: `Configure Shared Columns (${visibleColumns.length})`,
            icon: ShieldCheck,
            variant: 'outline',
            onClick: (rows) => {
              setSelectedIds(rows.map((r) => r.application_id))
              setShowColumnShieldModal(true)
            },
          },
          {
            label: "Drop / Don't Send",
            icon: XCircle,
            variant: 'danger',
            onClick: (rows) => {
              setSelectedIds(rows.map((r) => r.application_id))
              setShowInternalDropModal(true)
            },
          },
        ]}
        exportFilename="campaign_curation_pitches.csv"
        defaultPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        emptyMessage="No applications match your active filter"
        onRowClick={(row) => setInspectItem(row)}
      />

      {/* 6. Column Visibility Shield Modal */}
      <AnimatePresence>
        {showColumnShieldModal && (
          <div
            onClick={() => setShowColumnShieldModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/10 text-white cursor-default"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Brand Column Visibility Shield</h3>
                    <p className="text-xs text-neutral-400">Toggle which fields the client brand can view</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowColumnShieldModal(false)}
                  className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Strict Security Alert */}
              <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl flex items-start gap-2.5 text-xs text-amber-200">
                <Lock className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">Zero-PII & Margin Guarantee:</span> Internal agency costs, creator phone numbers, emails, and home addresses are permanently excluded from brand client view.
                </div>
              </div>

              {/* Column Options Grid */}
              <div className="mt-4 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {CAMPAIGN_PITCH_COLUMNS.map((col) => {
                  const isChecked = visibleColumns.includes(col.key)
                  return (
                    <label
                      key={col.key}
                      className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                        isChecked ? 'bg-amber-500/10 border-amber-500/40' : 'bg-slate-950/80 border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-white">{col.label}</div>
                        <div className="text-[10px] text-neutral-400 capitalize">{col.category} field</div>
                      </div>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setVisibleColumns(prev => [...prev, col.key])
                          } else {
                            setVisibleColumns(prev => prev.filter(k => k !== col.key))
                          }
                        }}
                        className="rounded border-neutral-700 bg-slate-950 text-amber-500 focus:ring-amber-400 h-4 w-4"
                      />
                    </label>
                  )
                })}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setShowColumnShieldModal(false)}
                  className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 cursor-pointer"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    toast.success('Column configuration applied to dispatch!')
                    setShowColumnShieldModal(false)
                  }}
                  className="bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-xs h-9 cursor-pointer shadow-md"
                >
                  Save & Apply Shield
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Dispatch Confirmation Modal */}
      <AnimatePresence>
        {showDispatchModal && (
          <div
            onClick={() => {
              if (!isDispatching) setShowDispatchModal(false)
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 text-white cursor-default"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Send to Brand Client Portal</h3>
                  <p className="text-xs text-neutral-400">Dispatch {selectedIds.length} creator profile{selectedIds.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                {/* 1. Target Client Brand Selection Dropdown */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-neutral-300 flex items-center gap-1.5">
                      <Building2 className="h-3.5 w-3.5 text-amber-400" />
                      Target Client Brand
                    </label>
                    {autoDetectedBrand && dispatchTargetBrand === autoDetectedBrand && (
                      <span className="text-[10px] text-amber-400 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Sparkles className="h-2.5 w-2.5" />
                        Auto-detected
                      </span>
                    )}
                  </div>
                  {activeRegisteredBrands.length === 0 ? (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-2">
                      <div className="flex items-center gap-2 font-bold text-amber-300 text-xs">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
                        {registeredBrands.length === 0 ? 'No Client Brand Workspaces Found' : 'All Brand Workspaces Are Paused'}
                      </div>
                      <p className="text-[11px] text-neutral-300 leading-relaxed">
                        {registeredBrands.length === 0
                          ? 'Creators can only be dispatched to registered Brand Workspaces created in Brand Admin. No client brand accounts exist in the database right now.'
                          : 'Creators can only be dispatched to Active Brand Workspaces. All registered brand accounts are currently paused. Please activate a brand in Client Brands management.'}
                      </p>
                      <Link href="/brand-admin/brands">
                        <Button
                          size="sm"
                          type="button"
                          className="bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-[11px] h-7 px-3 rounded-lg shadow-sm"
                        >
                          <Building2 className="h-3 w-3 mr-1.5" />
                          {registeredBrands.length === 0 ? 'Onboard Brand Workspace' : 'Manage & Activate Brands'}
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <>
                      <div className="relative">
                        <select
                          value={dispatchTargetBrand || (activeRegisteredBrands[0]?.name ?? '')}
                          onChange={(e) => setDispatchTargetBrand(e.target.value)}
                          className="w-full text-xs p-2.5 pl-3 pr-8 border border-white/10 rounded-xl bg-slate-950 text-white font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          <option value="">-- Choose Active Brand Workspace --</option>
                          {activeRegisteredBrands.map(b => (
                            <option key={b.id} value={b.name}>
                              ⭐ {b.name} (Assigned KAM: {b.assignedKam || 'Ops'})
                            </option>
                          ))}
                        </select>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-1">
                        These profiles will appear live on <strong>{dispatchTargetBrand || 'the brand'}&apos;s</strong> client portal review studio.
                      </p>
                    </>
                  )}
                </div>

                {/* 2. Selected Creators Preview */}
                <div>
                  <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1">
                    Selected Creators ({selectedApplications.length})
                  </div>
                  <div className="max-h-24 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                    {selectedApplications.map(app => (
                      <div key={app.application_id} className="flex items-center justify-between text-xs py-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="font-semibold text-white truncate">{app.creator_name}</span>
                          <span className="text-[10px] text-neutral-500">(@{app.instagram_username})</span>
                        </div>
                        <span className="text-[10px] font-mono text-amber-300/80 shrink-0">
                          {app.followers.toLocaleString()} f
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 3. Column Privacy Shield Badge */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs">
                  <div className="flex items-center gap-2 text-amber-300">
                    <ShieldCheck className="h-4 w-4 text-amber-400 shrink-0" />
                    <span>Privacy Shield Active: {visibleColumns.length} columns shared</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDispatchModal(false)
                      setShowColumnShieldModal(true)
                    }}
                    className="text-[11px] text-amber-400 font-bold hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                {/* 3.5 Logistics / Address Readiness */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-emerald-400 shrink-0" />
                    <div>
                      <div className="font-semibold text-white">
                        {selectedApplications.filter(a => a.address_verification_status === 'Verified').length} of {selectedApplications.length} Addresses Verified
                      </div>
                      <div className="text-[10px] text-neutral-400">
                        Physical samples can only be dispatched to verified addresses
                      </div>
                    </div>
                  </div>
                  {selectedApplications.filter(a => a.address_verification_status === 'Verified').length === selectedApplications.length ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full shrink-0">
                      100% Ready
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full shrink-0">
                      Partial
                    </span>
                  )}
                </div>

                {/* 3.6 Commercial Costing for Brand Portal Toggle */}
                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/30 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="dispatch-commercials-toggle"
                      className="text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Include Commercial Costing in Brand Portal</span>
                    </label>
                    <p className="text-[10px] text-neutral-400 leading-relaxed">
                      Show client commercial quote (₹) to brand reviewers. Creator internal costs remain strictly hidden.
                    </p>
                  </div>
                  <input
                    id="dispatch-commercials-toggle"
                    type="checkbox"
                    checked={dispatchIncludeCommercials}
                    onChange={(e) => setDispatchIncludeCommercials(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-neutral-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                  />
                </div>

                {/* 4. Curation Pitch Note */}
                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Curation Note for Brand (Optional)
                  </label>
                  <textarea
                    value={dispatchKamNotes}
                    onChange={(e) => setDispatchKamNotes(e.target.value)}
                    placeholder={`e.g. Curated for ${dispatchTargetBrand || 'brand'} festive push, verified reach & high reel retention.`}
                    className="w-full text-xs p-3 border border-white/10 rounded-xl bg-slate-950 text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400 h-16"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setShowDispatchModal(false)}
                  disabled={isDispatching}
                  className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDispatchToBrand}
                  disabled={isDispatching || activeRegisteredBrands.length === 0 || !(dispatchTargetBrand || activeRegisteredBrands[0]?.name)}
                  className="bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-xs h-9 flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-950/20"
                >
                  {isDispatching ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {isDispatching ? 'Dispatching...' : `Confirm & Publish to ${dispatchTargetBrand || activeRegisteredBrands[0]?.name || 'Brand'} Portal`}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Internal Drop Modal */}
      <AnimatePresence>
        {showInternalDropModal && (
          <div
            onClick={() => {
              if (!isDropping) setShowInternalDropModal(false)
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 text-white cursor-default"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Internal Curation Drop</h3>
                  <p className="text-xs text-neutral-400">Drop {selectedIds.length} profile{selectedIds.length > 1 ? 's' : ''} before brand review</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-neutral-300 leading-relaxed">
                  These creators will be marked as <strong className="text-neutral-200">Internal Dropped</strong> and will <strong>never be shown</strong> to the client brand.
                </p>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Select Reason
                  </label>
                  <select
                    value={internalDropReason}
                    onChange={(e) => setInternalDropReason(e.target.value)}
                    className="w-full text-xs p-2.5 border border-white/10 rounded-xl bg-slate-950 text-white focus:outline-none focus:border-rose-400 cursor-pointer"
                  >
                    <option value="Aesthetic mismatch with brand style">Aesthetic mismatch with brand style</option>
                    <option value="Low engagement or suspicious follower activity">Low engagement or suspicious follower activity</option>
                    <option value="Creator commercial quote exceeds campaign budget">Creator commercial quote exceeds campaign budget</option>
                    <option value="Outside target geographic radius or city">Outside target geographic radius or city</option>
                    <option value="Recent competitor brand collaboration conflict">Recent competitor brand collaboration conflict</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-neutral-300 block mb-1.5">
                    Internal Ops Notes (Optional)
                  </label>
                  <textarea
                    value={internalDropNotes}
                    onChange={(e) => setInternalDropNotes(e.target.value)}
                    placeholder="Provide additional context for team members..."
                    className="w-full text-xs p-3 border border-white/10 rounded-xl bg-slate-950 text-white placeholder-neutral-500 focus:outline-none focus:border-rose-400 h-20"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setShowInternalDropModal(false)}
                  disabled={isDropping}
                  className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInternalDrop}
                  disabled={isDropping}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs h-9 flex items-center gap-1.5 cursor-pointer shadow-md shadow-rose-900/30"
                >
                  {isDropping ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5" />
                  )}
                  {isDropping ? 'Dropping...' : 'Confirm Drop'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. Creator Detail Drawer */}
      <AnimatePresence>
        {inspectItem && (
          <div
            onClick={() => setInspectItem(null)}
            className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm cursor-pointer"
          >
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border-l border-white/10 w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6 text-white cursor-default"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-white/10">
                  <div className="text-sm font-bold text-white">Creator Pitch Details</div>
                  <button
                    onClick={() => setInspectItem(null)}
                    className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-tr from-amber-500/20 to-purple-500/20 border-2 border-amber-500/40 mx-auto flex items-center justify-center text-xl font-black text-amber-300 overflow-hidden mb-3 shadow-lg">
                    {inspectItem.profile_photo ? (
                      <img
                        src={inspectItem.profile_photo}
                        alt={inspectItem.creator_name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      inspectItem.creator_name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white">{inspectItem.creator_name}</h3>
                  <a
                    href={`https://instagram.com/${inspectItem.instagram_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-pink-400 hover:underline flex items-center justify-center gap-1 mt-0.5"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    @{inspectItem.instagram_username}
                  </a>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="p-3 bg-slate-950/80 border border-white/10 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Brand</span>
                      <span className="font-semibold text-white">{inspectItem.brand_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Campaign</span>
                      <span className="font-semibold text-white">{inspectItem.campaign_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Pitch Batch</span>
                      <span className="font-semibold text-amber-300">{inspectItem.brand_pitch_batch_name || 'N/A'}</span>
                    </div>
                    {inspectItem.brand_pitched_by && (
                      <div className="flex justify-between items-center pt-1 border-t border-white/5">
                        <span className="text-neutral-400 flex items-center gap-1">
                          <UserCheck className="h-3 w-3 text-amber-400" />
                          Forwarded By
                        </span>
                        <span className="font-semibold text-white text-[11px]" title={inspectItem.brand_pitched_by}>
                          {inspectItem.brand_pitched_by}
                        </span>
                      </div>
                    )}
                    {inspectItem.brand_pitched_at && (
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Forwarded At</span>
                        <span className="text-neutral-300 font-mono text-[10px]">
                          {new Date(inspectItem.brand_pitched_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Followers</span>
                      <span className="font-semibold text-white">{inspectItem.followers.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Location</span>
                      <span className="font-semibold text-white">{[inspectItem.city, inspectItem.state].filter(Boolean).join(', ') || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Variant</span>
                      <span className="font-semibold text-white">{inspectItem.selected_variant || 'Standard'}</span>
                    </div>
                    {inspectItem.internal_payout_cost && (
                      <div className="flex justify-between pt-1 border-t border-white/10">
                        <span className="text-neutral-400">Internal Agency Cost</span>
                        <span className="font-bold text-emerald-400">₹{inspectItem.internal_payout_cost.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Commercial Costing Section */}
                  <div className="p-3 bg-slate-950/80 border border-emerald-500/30 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                        <IndianRupee className="h-3.5 w-3.5 text-emerald-400" />
                        Commercial Costing Quote
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenCostingModal(inspectItem)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 transition cursor-pointer"
                      >
                        <Edit3 className="h-2.5 w-2.5" />
                        <span>Edit Quote</span>
                      </button>
                    </div>
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center">
                        <span className="text-neutral-400">Client Quote:</span>
                        {inspectItem.client_commercial ? (
                          <span className="font-bold text-emerald-400 font-mono text-sm">
                            ₹{Number(inspectItem.client_commercial).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-neutral-500 italic">Barter (₹0)</span>
                        )}
                      </div>
                      {inspectItem.internal_cost && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-neutral-400">Confidential Internal Payout:</span>
                          <span className="font-mono text-amber-300 font-semibold">
                            ₹{Number(inspectItem.internal_cost).toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}
                      {inspectItem.client_commercial && inspectItem.internal_cost && (
                        <div className="flex justify-between items-center pt-1 border-t border-white/5 text-[11px]">
                          <span className="text-neutral-400">Agency Gross Margin:</span>
                          <span className="font-bold text-emerald-300 font-mono">
                            ₹{(Number(inspectItem.client_commercial) - Number(inspectItem.internal_cost)).toLocaleString('en-IN')}{' '}
                            ({Math.round(((Number(inspectItem.client_commercial) - Number(inspectItem.internal_cost)) / Number(inspectItem.client_commercial)) * 100)}%)
                          </span>
                        </div>
                      )}
                      {inspectItem.is_commercial_pitch && (
                        <div className="pt-1">
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            ★ Marked as Paid Commercial Pitch
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verified Delivery Address Section */}
                  <div className="p-3 bg-slate-950/80 border border-white/10 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-300 flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5 text-emerald-400" />
                        Delivery Address
                      </span>
                      {inspectItem.address_verification_status === 'Verified' ? (
                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          ✓ Verified
                        </span>
                      ) : inspectItem.address_verification_status === 'Pending' ? (
                        <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                          Pending Verification
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400 bg-white/5 border border-white/5 px-2 py-0.5 rounded-full">
                          Not Submitted
                        </span>
                      )}
                    </div>
                    {inspectItem.verified_address_details ? (
                      <div className="space-y-1.5 pt-1 text-neutral-300">
                        <div className="font-semibold text-white">
                          {inspectItem.verified_address_details.recipient_name} ({inspectItem.verified_address_details.phone})
                        </div>
                        <div className="text-[11px] text-neutral-400 leading-relaxed">
                          {inspectItem.verified_address_details.street}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-300">
                          {inspectItem.verified_address_details.city}, {inspectItem.verified_address_details.state} — PIN: {inspectItem.verified_address_details.pincode}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleCopyCourierManifest(inspectItem)}
                          className="w-full mt-2 h-8 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 font-bold text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Copy className="h-3 w-3" />
                          Copy Courier Manifest
                        </Button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-neutral-500 italic">
                        {inspectItem.address_verification_status === 'Pending'
                          ? 'Address submitted by creator, awaiting verification at Address Confirmation Desk.'
                          : 'No delivery address recorded. Physical dispatch requires creator address.'}
                      </p>
                    )}
                  </div>

                  {/* Brand Decision Section */}
                  <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl space-y-1.5 text-xs">
                    <div className="font-bold text-amber-300">Brand Review Status</div>
                    <div className="capitalize font-semibold text-white">
                      {inspectItem.brand_review_status.replace(/_/g, ' ')}
                    </div>
                    {inspectItem.brand_reviewed_by && (
                      <div className="text-[11px] text-neutral-300">
                        Reviewed by: <strong className="text-white">{inspectItem.brand_reviewed_by}</strong> on {new Date(inspectItem.brand_reviewed_at || '').toLocaleDateString('en-IN')}
                      </div>
                    )}
                    {inspectItem.brand_rejection_reason && (
                      <div className="text-[11px] text-rose-300 mt-1">
                        Rejection reason: {inspectItem.brand_rejection_reason}
                      </div>
                    )}
                    {inspectItem.brand_feedback_notes && (
                      <div className="text-[11px] text-neutral-300 mt-1">
                        Brand feedback: "{inspectItem.brand_feedback_notes}"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10">
                <Button
                  onClick={() => setInspectItem(null)}
                  className="w-full text-xs h-10 bg-white/10 hover:bg-white/20 text-white font-semibold cursor-pointer border border-white/10"
                >
                  Close Drawer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 10. Verified Address & Courier Manifest Modal */}
      <AnimatePresence>
        {viewAddressItem && (
          <div
            onClick={() => setViewAddressItem(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/10 text-white cursor-default"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Verified Courier Delivery Manifest
                    </h3>
                    <p className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Verified at Address Confirmation Desk
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setViewAddressItem(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                {/* Creator Header */}
                <div className="p-3 bg-slate-950/80 border border-white/10 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="font-bold text-white text-sm">{viewAddressItem.creator_name}</div>
                    <div className="text-[11px] text-pink-400 font-medium">@{viewAddressItem.instagram_username}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-neutral-300">{viewAddressItem.brand_name}</div>
                    <div className="text-[10px] font-mono text-amber-400">{viewAddressItem.campaign_code}</div>
                  </div>
                </div>

                {/* Logistics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Phone className="h-3 w-3 text-emerald-400" />
                      Recipient & Contact Phone
                    </span>
                    <div className="font-bold text-white text-xs">
                      {viewAddressItem.verified_address_details?.recipient_name}
                    </div>
                    <div className="font-mono text-emerald-300 text-xs">
                      {viewAddressItem.verified_address_details?.phone}
                      {viewAddressItem.verified_address_details?.alt_phone && (
                        <span className="text-neutral-400 text-[10px] ml-1">
                          (Alt: {viewAddressItem.verified_address_details.alt_phone})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                      <Package className="h-3 w-3 text-amber-400" />
                      Campaign Deliverable / SKU
                    </span>
                    <div className="font-bold text-amber-300 text-xs truncate" title={viewAddressItem.verified_address_details?.deliverable_sku}>
                      {viewAddressItem.verified_address_details?.deliverable_sku}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      Product to pack for dispatch
                    </div>
                  </div>
                </div>

                {/* Street Address & Location */}
                <div className="p-3 bg-slate-950/60 border border-white/5 rounded-xl space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-emerald-400" />
                    Delivery Street Address
                  </span>
                  <p className="text-xs text-neutral-200 leading-relaxed font-medium">
                    {viewAddressItem.verified_address_details?.street}
                  </p>
                  <p className="text-xs font-bold text-emerald-300 flex items-center gap-1 pt-1 border-t border-white/5">
                    <span>{viewAddressItem.verified_address_details?.city}, {viewAddressItem.verified_address_details?.state}</span>
                    <span className="text-neutral-400">—</span>
                    <span className="font-mono bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 text-emerald-400">
                      PIN: {viewAddressItem.verified_address_details?.pincode}
                    </span>
                  </p>
                </div>

                {/* Copyable Manifest Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      Ready-to-Paste Courier String
                    </label>
                    <button
                      onClick={() => handleCopyCourierManifest(viewAddressItem)}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy Text</span>
                    </button>
                  </div>
                  <pre className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20 text-[11px] font-mono text-emerald-300/90 whitespace-pre-wrap leading-relaxed">
                    {viewAddressItem.verified_address_details?.courier_copy_text}
                  </pre>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setViewAddressItem(null)}
                  className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 cursor-pointer"
                >
                  Close
                </Button>
                <Button
                  onClick={() => handleCopyCourierManifest(viewAddressItem)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Courier Manifest
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11. 1-Click WhatsApp Review Link Share Modal */}
      <AnimatePresence>
        {showShareModal && (
          <div
            onClick={() => setShowShareModal(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-white/12 text-white relative overflow-hidden cursor-default"
            >
              {/* Subtle ambient glow */}
              <div className="absolute -top-16 -right-16 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

              {/* Modal Header */}
              <div className="flex items-start justify-between pb-4 border-b border-white/10 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
                    <Share2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                      1-Click Client Pitch Link
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        Zero Password
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                      Bypass login walls. Brand marketing leads open this link and approve creators in 1 tap.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-white/5 cursor-pointer transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="mt-5 space-y-4 relative z-10 text-xs">
                {/* Brand & Batch Selectors */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block mb-1">
                      Client Brand Workspace *
                    </label>
                    {activeRegisteredBrands.length === 0 ? (
                      <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300">
                        {registeredBrands.length === 0
                          ? 'No registered brand workspaces in database. Create one in Client Brands first.'
                          : 'All registered brand workspaces are paused. Please activate one in Client Brands first.'}
                      </div>
                    ) : (
                      <select
                        value={shareBrand}
                        onChange={(e) => {
                          const val = e.target.value
                          setShareBrand(val)
                          const regB = activeRegisteredBrands.find(b => b.name === val)
                          const cName = regB ? `${regB.name} Lead` : 'Brand Marketing Lead'
                          const cEmail = 'marketing@brand.com'
                          setShareContactName(cName)
                          setShareContactEmail(cEmail)
                          fetchShareLink(val, shareBatch, cName, cEmail)
                        }}
                        className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-emerald-400 transition cursor-pointer"
                      >
                        <option value="">-- Choose Active Workspace --</option>
                        {activeRegisteredBrands.map(b => (
                          <option key={b.id} value={b.name}>
                            ⭐ {b.name} ({b.assignedKam || 'Ops'})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block mb-1">
                      Pitch Batch
                    </label>
                    <select
                      value={shareBatch}
                      onChange={(e) => {
                        const val = e.target.value
                        setShareBatch(val)
                        fetchShareLink(shareBrand, val, shareContactName, shareContactEmail)
                      }}
                      className="w-full px-3 py-2 text-xs font-semibold rounded-xl bg-slate-950 border border-white/10 text-white focus:outline-none focus:border-emerald-400 transition cursor-pointer"
                    >
                      <option value="">All Active Shortlists</option>
                      {batches.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Contact Recipient info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block mb-1">
                      Recipient POC Name
                    </label>
                    <Input
                      value={shareContactName}
                      onChange={(e) => setShareContactName(e.target.value)}
                      placeholder="e.g. Ananya Sharma"
                      className="h-8.5 bg-slate-950 border-white/10 text-white text-xs rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-neutral-300 uppercase tracking-wider block mb-1">
                      Work Email
                    </label>
                    <Input
                      value={shareContactEmail}
                      onChange={(e) => setShareContactEmail(e.target.value)}
                      placeholder="ananya@brand.com"
                      className="h-8.5 bg-slate-950 border-white/10 text-white text-xs rounded-xl"
                    />
                  </div>
                </div>

                {/* Generated Link Display Box */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <Link2 className="h-3.5 w-3.5" />
                      Encrypted 1-Click Access URL (14-Day Token)
                    </span>
                    <button
                      onClick={handleCopyReviewUrl}
                      disabled={isGeneratingLink || !generatedLinkData?.url}
                      className="text-[11px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Copy className="h-3 w-3" />
                      <span>Copy URL</span>
                    </button>
                  </div>

                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      value={isGeneratingLink ? 'Generating secure token...' : (generatedLinkData?.url || '')}
                      className="w-full pl-3 pr-20 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs font-mono text-emerald-300 select-all focus:outline-none"
                    />
                    <button
                      onClick={handleCopyReviewUrl}
                      className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[10px] transition cursor-pointer"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <ShieldCheck className="h-3 w-3" />
                      Auto-sets 30-Day Brand Session Cookie
                    </span>
                    <span>Expires in 14 days</span>
                  </div>
                </div>

                {/* Action Buttons: WhatsApp & Email Sharing */}
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Button
                      onClick={handleOpenWhatsAppShare}
                      disabled={!generatedLinkData?.whatsappMessage}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 flex items-center justify-center gap-2 rounded-xl shadow-lg shadow-emerald-950 cursor-pointer"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span>Open in WhatsApp Web / App</span>
                    </Button>

                    <Button
                      onClick={handleCopyWhatsAppMessage}
                      disabled={!generatedLinkData?.whatsappMessage}
                      variant="outline"
                      className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-300 font-bold text-xs h-10 flex items-center justify-center gap-2 rounded-xl cursor-pointer"
                    >
                      <Copy className="h-4 w-4" />
                      <span>Copy WhatsApp Message</span>
                    </Button>
                  </div>

                  <Button
                    onClick={handleCopyEmailTemplate}
                    disabled={!generatedLinkData?.emailBody}
                    variant="outline"
                    className="w-full border-white/10 hover:bg-white/5 text-slate-300 font-semibold text-xs h-9 flex items-center justify-center gap-2 rounded-xl cursor-pointer"
                  >
                    <Copy className="h-3.5 w-3.5 text-amber-400" />
                    <span>Copy Full Email Roster Pitch</span>
                  </Button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-5 flex items-center justify-between pt-4 border-t border-white/10 text-xs">
                <span className="text-[11px] text-slate-400">
                  Target: <strong className="text-white">{shareBrand}</strong> {shareBatch ? `(${shareBatch})` : ''}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowShareModal(false)}
                  className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-8 cursor-pointer rounded-xl"
                >
                  Done
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 9. Commercial Costing Quote Modal (Single & Bulk) */}
      <AnimatePresence>
        {showCostingModal && (
          <div
            onClick={() => {
              if (!isSavingCosting) setShowCostingModal(false)
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/10 text-white cursor-default"
            >
              <form onSubmit={handleSaveCosting}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <IndianRupee className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {costingTargetItems.length > 1
                          ? `Bulk Commercial Costing (${costingTargetItems.length} Creators)`
                          : `Creator Commercial Costing`}
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Set client quote & confidential creator payout
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCostingModal(false)}
                    disabled={isSavingCosting}
                    className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {/* Selected Creators preview */}
                  <div>
                    <div className="text-[10px] uppercase font-bold text-neutral-400 mb-1">
                      Target Creator{costingTargetItems.length > 1 ? 's' : ''} ({costingTargetItems.length})
                    </div>
                    <div className="max-h-24 overflow-y-auto p-2 rounded-xl bg-slate-950 border border-white/5 space-y-1">
                      {costingTargetItems.map((app) => (
                        <div key={app.application_id} className="flex items-center justify-between text-xs py-0.5">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-semibold text-white truncate">{app.creator_name}</span>
                            <span className="text-[10px] text-neutral-500">(@{app.instagram_username})</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[10px] font-mono text-neutral-400">
                              {formatFollowerCount(app.followers)} reach
                            </span>
                            {app.client_commercial ? (
                              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                                Current: ₹{Number(app.client_commercial).toLocaleString('en-IN')}
                              </span>
                            ) : (
                              <span className="text-[9px] text-neutral-500">Barter</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Commercial Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-emerald-400 flex items-center gap-1 mb-1.5">
                        <IndianRupee className="h-3.5 w-3.5" />
                        <span>Client Commercial Quote (₹) *</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="e.g. 15000"
                        value={costingClientCommercial}
                        onChange={(e) => setCostingClientCommercial(e.target.value)}
                        className="bg-slate-950 border-emerald-500/30 focus:border-emerald-400 text-white font-mono font-bold"
                      />
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Amount quoted to the brand client
                      </p>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-amber-300 flex items-center gap-1 mb-1.5">
                        <Lock className="h-3.5 w-3.5 text-amber-400" />
                        <span>Internal Creator Cost (₹)</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="e.g. 10000"
                        value={costingInternalCost}
                        onChange={(e) => setCostingInternalCost(e.target.value)}
                        className="bg-slate-950 border-white/10 focus:border-amber-400 text-white font-mono"
                      />
                      <p className="text-[10px] text-neutral-400 mt-1">
                        Agency payout to creator (strictly confidential)
                      </p>
                    </div>
                  </div>

                  {/* Margin Calculator Badge */}
                  {Boolean(costingClientCommercial && !isNaN(Number(costingClientCommercial))) && (
                    <div className="p-3 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-neutral-400">Agency Gross Margin:</span>{' '}
                        {costingInternalCost && !isNaN(Number(costingInternalCost)) ? (
                          <span className="font-bold text-white">
                            ₹{(Number(costingClientCommercial) - Number(costingInternalCost)).toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-neutral-500 font-mono">Set internal cost to calculate</span>
                        )}
                      </div>
                      {costingInternalCost && !isNaN(Number(costingInternalCost)) && Number(costingClientCommercial) > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          Number(costingClientCommercial) >= Number(costingInternalCost)
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {Math.round(((Number(costingClientCommercial) - Number(costingInternalCost)) / Number(costingClientCommercial)) * 100)}% Margin
                        </span>
                      )}
                    </div>
                  )}

                  {/* Mark as Commercial Pitch Checkbox */}
                  <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-950 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={costingIsCommercial}
                      onChange={(e) => setCostingIsCommercial(e.target.checked)}
                      className="rounded border-neutral-700 bg-slate-900 text-amber-500 focus:ring-amber-400 h-4 w-4"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">Mark as Paid / Commercial Pitch</div>
                      <div className="text-[10px] text-neutral-400">
                        Highlights this creator as a paid collaboration rather than barter
                      </div>
                    </div>
                  </label>

                  {/* Internal Commercial Note */}
                  <div>
                    <label className="text-xs font-semibold text-neutral-300 block mb-1">
                      Internal Commercial Note (Optional)
                    </label>
                    <textarea
                      value={costingNotes}
                      onChange={(e) => setCostingNotes(e.target.value)}
                      placeholder="e.g. Includes 1 Reel + 2 Stories, creator agreed to 3-day revision turnaround"
                      className="w-full text-xs p-2.5 border border-white/10 rounded-xl bg-slate-950 text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-400 h-16"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCostingModal(false)}
                    disabled={isSavingCosting}
                    className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingCosting}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs h-9 flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950"
                  >
                    {isSavingCosting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )}
                    <span>{isSavingCosting ? 'Saving...' : 'Save Commercial Quote'}</span>
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
