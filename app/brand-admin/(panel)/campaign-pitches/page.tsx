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
  ArrowUpDown
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { GlobalLoader } from '@/components/ui/global-loader'
import { useRealtime } from '@/hooks/useRealtime'
import {
  CampaignPitchItem,
  CAMPAIGN_PITCH_COLUMNS,
  FORBIDDEN_CLIENT_KEYS,
  ColumnShieldOption
} from '@/types/campaign-pitch'

export default function CampaignPitchesCurationPage() {
  const [applications, setApplications] = useState<CampaignPitchItem[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [campaigns, setCampaigns] = useState<Array<{ id: string; campaign_code: string; title: string; brand_name: string }>>([])
  const [batches, setBatches] = useState<string[]>([])
  const [counts, setCounts] = useState({
    all: 0,
    queued_for_brand_admin: 0,
    pending_brand_review: 0,
    brand_approved: 0,
    brand_rejected: 0,
    internal_rejected: 0,
  })
  const [loading, setLoading] = useState(true)

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
  const [dispatchKamNotes, setDispatchKamNotes] = useState('')
  const [isDispatching, setIsDispatching] = useState(false)

  const [showInternalDropModal, setShowInternalDropModal] = useState(false)
  const [internalDropReason, setInternalDropReason] = useState('Aesthetic mismatch with brand style')
  const [internalDropNotes, setInternalDropNotes] = useState('')
  const [isDropping, setIsDropping] = useState(false)

  // Details Drawer
  const [inspectItem, setInspectItem] = useState<CampaignPitchItem | null>(null)

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

  // Action: Single or Bulk Dispatch to Brand Client Portal
  const handleDispatchToBrand = async () => {
    if (selectedIds.length === 0) {
      toast.error('Please select at least one application to send to Brand')
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
          visibleColumns,
          kamNotes: dispatchKamNotes.trim() || undefined,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Dispatched ${selectedIds.length} profiles to Brand Portal!`)
        setShowDispatchModal(false)
        setDispatchKamNotes('')
        setSelectedIds([])
        fetchData()
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

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
                Campaign Curation & Pitch Desk
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Sync
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-gray-500">
                Review applicant creators forwarded from Influencer Ops, configure client column privacy, internally drop unsuitable profiles, and dispatch batches to client Brand Portals in real time.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="text-xs text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="text-xs text-gray-700 border-gray-200 hover:bg-gray-50 flex items-center gap-1.5 h-9"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div
          onClick={() => setSelectedStatus('all')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'all'
              ? 'bg-purple-50/70 border-purple-300 shadow-sm'
              : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-[11px] font-medium text-gray-500">Total Pitched</div>
          <div className="text-xl font-bold text-gray-900 mt-1">{counts.all}</div>
          <div className="text-[10px] text-gray-400 mt-1">Across all campaigns</div>
        </div>

        <div
          onClick={() => setSelectedStatus('queued_for_brand_admin')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'queued_for_brand_admin'
              ? 'bg-blue-50/70 border-blue-300 shadow-sm'
              : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-[11px] font-medium text-blue-700 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
            Queued for KAM
          </div>
          <div className="text-xl font-bold text-blue-900 mt-1">{counts.queued_for_brand_admin}</div>
          <div className="text-[10px] text-blue-600 mt-1">From Influencer Ops</div>
        </div>

        <div
          onClick={() => setSelectedStatus('pending_brand_review')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'pending_brand_review'
              ? 'bg-amber-50/70 border-amber-300 shadow-sm'
              : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-[11px] font-medium text-amber-700">With Brand Client</div>
          <div className="text-xl font-bold text-amber-900 mt-1">{counts.pending_brand_review}</div>
          <div className="text-[10px] text-amber-600 mt-1">Awaiting client review</div>
        </div>

        <div
          onClick={() => setSelectedStatus('brand_approved')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'brand_approved'
              ? 'bg-emerald-50/70 border-emerald-300 shadow-sm'
              : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-[11px] font-medium text-emerald-700">Brand Shortlisted</div>
          <div className="text-xl font-bold text-emerald-900 mt-1">{counts.brand_approved}</div>
          <div className="text-[10px] text-emerald-600 mt-1">Approved by client</div>
        </div>

        <div
          onClick={() => setSelectedStatus('brand_rejected')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'brand_rejected'
              ? 'bg-rose-50/70 border-rose-300 shadow-sm'
              : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-[11px] font-medium text-rose-700">Brand Rejected</div>
          <div className="text-xl font-bold text-rose-900 mt-1">{counts.brand_rejected}</div>
          <div className="text-[10px] text-rose-600 mt-1">Client rejected</div>
        </div>

        <div
          onClick={() => setSelectedStatus('internal_rejected')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'internal_rejected'
              ? 'bg-gray-100 border-gray-400 shadow-sm'
              : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="text-[11px] font-medium text-gray-700">Internal Dropped</div>
          <div className="text-xl font-bold text-gray-800 mt-1">{counts.internal_rejected}</div>
          <div className="text-[10px] text-gray-500 mt-1">Dropped before brand</div>
        </div>
      </div>

      {/* 3. Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Brand Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Client Brand
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedBrand}
                onChange={(e) => {
                  setSelectedBrand(e.target.value)
                  setSelectedCampaign('all')
                }}
                className="w-full pl-9 pr-8 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-gray-800"
              >
                <option value="all">All Brands ({brands.length})</option>
                {brands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Campaign Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Campaign
            </label>
            <div className="relative">
              <Target className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-gray-800 truncate"
              >
                <option value="all">All Campaigns ({filteredCampaignsList.length})</option>
                {filteredCampaignsList.map(c => (
                  <option key={c.id} value={c.id}>{c.campaign_code} - {c.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Batch Filter */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Pitch Batch
            </label>
            <div className="relative">
              <Layers className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs font-medium border border-gray-200 rounded-lg bg-gray-50/50 hover:bg-white focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all text-gray-800 truncate"
              >
                <option value="all">All Batches ({batches.length})</option>
                {batches.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
              Search Creator / Handle
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, handle, city..."
                className="pl-9 text-xs h-9 bg-gray-50/50 border-gray-200 focus:bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-gray-100 pt-3">
          {[
            { id: 'all', label: 'All Statuses', count: counts.all },
            { id: 'queued_for_brand_admin', label: 'Queued for KAM', count: counts.queued_for_brand_admin, color: 'text-blue-700 bg-blue-50' },
            { id: 'pending_brand_review', label: 'Sent to Brand', count: counts.pending_brand_review, color: 'text-amber-700 bg-amber-50' },
            { id: 'brand_approved', label: 'Brand Shortlisted', count: counts.brand_approved, color: 'text-emerald-700 bg-emerald-50' },
            { id: 'brand_rejected', label: 'Brand Rejected', count: counts.brand_rejected, color: 'text-rose-700 bg-rose-50' },
            { id: 'internal_rejected', label: 'Internal Dropped', count: counts.internal_rejected, color: 'text-gray-700 bg-gray-100' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedStatus === tab.id
                  ? 'bg-gray-900 text-white shadow-sm'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                selectedStatus === tab.id ? 'bg-white/20 text-white' : tab.color || 'bg-gray-100 text-gray-600'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Floating / Sticky Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="sticky top-4 z-30 bg-gray-900 text-white p-3.5 rounded-2xl shadow-xl flex flex-wrap items-center justify-between gap-3 border border-gray-800"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 rounded-full bg-indigo-500 items-center justify-center text-xs font-bold">
                {selectedIds.length}
              </span>
              <span className="text-xs font-medium text-gray-200">
                creator profile{selectedIds.length > 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowColumnShieldModal(true)}
                className="bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700 text-xs h-8 flex items-center gap-1.5"
              >
                <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
                Configure Shared Columns ({visibleColumns.length})
              </Button>

              <Button
                size="sm"
                onClick={() => setShowDispatchModal(true)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-8 font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-900/50"
              >
                <Send className="h-3.5 w-3.5" />
                🚀 Send to Brand Portal
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInternalDropModal(true)}
                className="bg-gray-800 hover:bg-red-950/40 text-red-300 border-red-900/40 text-xs h-8 flex items-center gap-1.5"
              >
                <XCircle className="h-3.5 w-3.5" />
                Drop / Don't Send
              </Button>

              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-gray-400 hover:text-white px-2 py-1"
              >
                Clear
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 5. Curation Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-gray-500">
            <RefreshCw className="h-7 w-7 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm font-medium">Loading campaign curation applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="py-20 text-center px-4">
            <div className="h-12 w-12 rounded-full bg-gray-50 flex items-center justify-center mx-auto text-gray-400 mb-3 border border-gray-100">
              <Layers className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No applications match your filter</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              Select different brand, campaign, or status filters above, or forward applications from the Influencer Admin portal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600 border-collapse">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length > 0 && selectedIds.length === applications.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-4">Creator</th>
                  <th className="py-3 px-4">Brand & Campaign</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Audience & Location</th>
                  <th className="py-3 px-4">Variant / Sample</th>
                  <th className="py-3 px-4">Status & Client Decision</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {applications.map((item) => {
                  const isSelected = selectedIds.includes(item.application_id)
                  const isApproved = item.brand_review_status === 'brand_approved'
                  const isRejected = item.brand_review_status === 'brand_rejected'
                  const isInternalDropped = item.brand_review_status === 'internal_rejected'
                  const isQueued = item.brand_review_status === 'queued_for_brand_admin'
                  const isPending = item.brand_review_status === 'pending_brand_review'

                  return (
                    <tr
                      key={item.application_id}
                      className={`hover:bg-gray-50/70 transition-colors ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(item.application_id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                        />
                      </td>

                      {/* Creator Info */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 border border-indigo-200 flex items-center justify-center text-xs font-bold text-indigo-700 overflow-hidden flex-shrink-0">
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
                          <div>
                            <div className="font-semibold text-gray-900 hover:text-indigo-600 cursor-pointer flex items-center gap-1.5"
                              onClick={() => setInspectItem(item)}
                            >
                              <span>{item.creator_name}</span>
                              <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 py-0.2 rounded">
                                {item.influencer_id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <a
                                href={`https://instagram.com/${item.instagram_username}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-gray-500 hover:text-pink-600 flex items-center gap-1 text-[11px]"
                              >
                                <Instagram className="h-3 w-3 text-pink-500" />
                                <span>@{item.instagram_username}</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Brand & Campaign */}
                      <td className="py-3.5 px-4">
                        <div className="font-medium text-gray-800">{item.brand_name}</div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Target className="h-3 w-3 text-indigo-500" />
                          <span>{item.campaign_code}</span>
                        </div>
                      </td>

                      {/* Batch */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/60 max-w-[140px] truncate">
                          <Layers className="h-3 w-3 text-purple-500 flex-shrink-0" />
                          <span className="truncate">{item.brand_pitch_batch_name || 'Batch'}</span>
                        </span>
                        {item.brand_pitch_notes && (
                          <div className="text-[10px] text-gray-400 mt-1 truncate max-w-[140px]" title={item.brand_pitch_notes}>
                            Note: {item.brand_pitch_notes}
                          </div>
                        )}
                      </td>

                      {/* Audience & Location */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900">
                          {item.followers.toLocaleString('en-IN')} <span className="text-[10px] font-normal text-gray-500">followers</span>
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span>{[item.city, item.state].filter(Boolean).join(', ') || 'India'}</span>
                        </div>
                      </td>

                      {/* Variant / Sample */}
                      <td className="py-3.5 px-4">
                        <div className="text-gray-800 truncate max-w-[130px]" title={item.selected_variant || 'Standard'}>
                          {item.selected_variant || 'Standard'}
                        </div>
                        {item.sample_reel_link && (
                          <a
                            href={item.sample_reel_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[10px] text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                            Sample Reel
                          </a>
                        )}
                      </td>

                      {/* Status & Decision */}
                      <td className="py-3.5 px-4">
                        {isApproved ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                              Brand Shortlisted
                            </span>
                            {item.brand_reviewed_by && (
                              <div className="text-[10px] text-emerald-600 mt-0.5">
                                By {item.brand_reviewed_by}
                              </div>
                            )}
                          </div>
                        ) : isRejected ? (
                          <div>
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              <XCircle className="h-3.5 w-3.5 text-rose-600" />
                              Brand Rejected
                            </span>
                            {item.brand_rejection_reason && (
                              <div className="text-[10px] text-rose-500 mt-0.5 truncate max-w-[130px]" title={item.brand_rejection_reason}>
                                {item.brand_rejection_reason}
                              </div>
                            )}
                          </div>
                        ) : isInternalDropped ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-300">
                            <X className="h-3.5 w-3.5 text-gray-500" />
                            Internal Dropped
                          </span>
                        ) : isQueued ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                            <Clock className="h-3.5 w-3.5 text-blue-500 animate-pulse" />
                            Queued for KAM
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <Send className="h-3.5 w-3.5 text-amber-500" />
                            Sent to Brand
                          </span>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setInspectItem(item)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                            title="Inspect details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {isQueued && (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedIds([item.application_id])
                                  setShowDispatchModal(true)
                                }}
                                className="px-2 py-1 rounded-md text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 flex items-center gap-1"
                              >
                                <Send className="h-3 w-3" />
                                Send
                              </button>

                              <button
                                onClick={() => {
                                  setSelectedIds([item.application_id])
                                  setShowInternalDropModal(true)
                                }}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Drop creator"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. Column Visibility Shield Modal */}
      <AnimatePresence>
        {showColumnShieldModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Brand Column Visibility Shield</h3>
                    <p className="text-xs text-gray-500">Toggle which fields the client brand can view</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowColumnShieldModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Strict Security Alert */}
              <div className="mt-4 p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-start gap-2.5 text-xs text-indigo-900">
                <Lock className="h-4 w-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Zero-PII & Margin Guarantee:</span> Internal agency costs, creator phone numbers, emails, and home addresses are permanently excluded from brand client view.
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
                        isChecked ? 'bg-indigo-50/40 border-indigo-200' : 'bg-gray-50/50 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-semibold text-gray-900">{col.label}</div>
                        <div className="text-[10px] text-gray-500 capitalize">{col.category} field</div>
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
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                      />
                    </label>
                  )
                })}
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setShowColumnShieldModal(false)}
                  className="text-xs h-9"
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    toast.success('Column configuration applied to dispatch!')
                    setShowColumnShieldModal(false)
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 font-semibold"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Send to Brand Client Portal</h3>
                  <p className="text-xs text-gray-500">Dispatch {selectedIds.length} creator profile{selectedIds.length > 1 ? 's' : ''}</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  These creators will be immediately published to the client brand's portal review studio under status <strong className="text-amber-700">Sent to Brand</strong>.
                </p>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Curation Note for Brand (Optional)
                  </label>
                  <textarea
                    value={dispatchKamNotes}
                    onChange={(e) => setDispatchKamNotes(e.target.value)}
                    placeholder="e.g. Curated for Tier 1 beauty aesthetic, all confirmed available for next week delivery."
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 h-20"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setShowDispatchModal(false)}
                  disabled={isDispatching}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDispatchToBrand}
                  disabled={isDispatching}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 font-semibold flex items-center gap-1.5"
                >
                  {isDispatching ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {isDispatching ? 'Dispatching...' : 'Confirm & Publish'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 8. Internal Drop Modal */}
      <AnimatePresence>
        {showInternalDropModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100"
            >
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className="h-10 w-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <XCircle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Internal Curation Drop</h3>
                  <p className="text-xs text-gray-500">Drop {selectedIds.length} profile{selectedIds.length > 1 ? 's' : ''} before brand review</p>
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <p className="text-xs text-gray-600 leading-relaxed">
                  These creators will be marked as <strong className="text-gray-800">Internal Dropped</strong> and will <strong>never be shown</strong> to the client brand.
                </p>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Select Reason
                  </label>
                  <select
                    value={internalDropReason}
                    onChange={(e) => setInternalDropReason(e.target.value)}
                    className="w-full text-xs p-2.5 border border-gray-200 rounded-xl bg-white"
                  >
                    <option value="Aesthetic mismatch with brand style">Aesthetic mismatch with brand style</option>
                    <option value="Low engagement or suspicious follower activity">Low engagement or suspicious follower activity</option>
                    <option value="Creator commercial quote exceeds campaign budget">Creator commercial quote exceeds campaign budget</option>
                    <option value="Outside target geographic radius or city">Outside target geographic radius or city</option>
                    <option value="Recent competitor brand collaboration conflict">Recent competitor brand collaboration conflict</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Internal Ops Notes (Optional)
                  </label>
                  <textarea
                    value={internalDropNotes}
                    onChange={(e) => setInternalDropNotes(e.target.value)}
                    placeholder="Provide additional context for team members..."
                    className="w-full text-xs p-3 border border-gray-200 rounded-xl h-20"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-gray-100">
                <Button
                  variant="outline"
                  onClick={() => setShowInternalDropModal(false)}
                  disabled={isDropping}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInternalDrop}
                  disabled={isDropping}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs h-9 font-semibold flex items-center gap-1.5"
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
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-y-auto p-6"
            >
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                  <div className="text-sm font-bold text-gray-900">Creator Pitch Details</div>
                  <button
                    onClick={() => setInspectItem(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 text-center">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 border-2 border-indigo-200 mx-auto flex items-center justify-center text-xl font-bold text-indigo-700 overflow-hidden mb-3">
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
                  <h3 className="text-base font-bold text-gray-900">{inspectItem.creator_name}</h3>
                  <a
                    href={`https://instagram.com/${inspectItem.instagram_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-pink-600 hover:underline flex items-center justify-center gap-1 mt-0.5"
                  >
                    <Instagram className="h-3.5 w-3.5" />
                    @{inspectItem.instagram_username}
                  </a>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="p-3 bg-gray-50 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Brand</span>
                      <span className="font-semibold text-gray-900">{inspectItem.brand_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Campaign</span>
                      <span className="font-semibold text-gray-900">{inspectItem.campaign_code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pitch Batch</span>
                      <span className="font-semibold text-purple-700">{inspectItem.brand_pitch_batch_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Followers</span>
                      <span className="font-semibold text-gray-900">{inspectItem.followers.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Location</span>
                      <span className="font-semibold text-gray-900">{[inspectItem.city, inspectItem.state].filter(Boolean).join(', ') || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Variant</span>
                      <span className="font-semibold text-gray-900">{inspectItem.selected_variant || 'Standard'}</span>
                    </div>
                    {inspectItem.internal_payout_cost && (
                      <div className="flex justify-between pt-1 border-t border-gray-200/60">
                        <span className="text-gray-500">Internal Agency Cost</span>
                        <span className="font-bold text-emerald-700">₹{inspectItem.internal_payout_cost.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                  </div>

                  {/* Brand Decision Section */}
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-1.5 text-xs">
                    <div className="font-semibold text-indigo-900">Brand Review Status</div>
                    <div className="capitalize font-medium text-gray-800">
                      {inspectItem.brand_review_status.replace(/_/g, ' ')}
                    </div>
                    {inspectItem.brand_reviewed_by && (
                      <div className="text-[11px] text-gray-500">
                        Reviewed by: <strong>{inspectItem.brand_reviewed_by}</strong> on {new Date(inspectItem.brand_reviewed_at || '').toLocaleDateString('en-IN')}
                      </div>
                    )}
                    {inspectItem.brand_rejection_reason && (
                      <div className="text-[11px] text-rose-600 mt-1">
                        Rejection reason: {inspectItem.brand_rejection_reason}
                      </div>
                    )}
                    {inspectItem.brand_feedback_notes && (
                      <div className="text-[11px] text-gray-600 mt-1">
                        Brand feedback: "{inspectItem.brand_feedback_notes}"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100">
                <Button
                  onClick={() => setInspectItem(null)}
                  className="w-full text-xs h-9 bg-gray-900 text-white"
                >
                  Close Drawer
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
