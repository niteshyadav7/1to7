'use client'

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, XCircle, ClipboardList,
  Instagram, Users, MapPin, ChevronDown,
  IndianRupee, Phone, Search, Filter, Megaphone,
  ArrowUpDown, ArrowUp, ArrowDown, Columns3, Download,
  AlignJustify, AlignCenter, AlignStartVertical,
  Calendar, X, SlidersHorizontal,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  FileSpreadsheet, FileJson, UserCheck, UserX,
  Image, ExternalLink, Package, Eye, Clock,
  FileCheck, Link2, Sparkles, Pencil, Save, AlertCircle,
  RotateCcw, CheckSquare, EyeOff, History
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { getFastCache, setFastCache } from '@/lib/utils/cache-utils'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/useRealtime'
import { getInstagramUrl, getInstagramDisplayHandle } from '@/lib/instagram-utils'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { checkLiveDateMaturation } from '@/lib/utils/completion-timeline-utils'

// ─── Types ─────────────────────────────────────────────────
interface UserInfo {
  id: string
  full_name: string
  influencer_id: string
  email: string
  mobile?: string
  instagram_username: string
  followers?: string | number
  state?: string
  city?: string
  gender?: string
  instagram_profile_pic?: string
}

interface CampaignInfo {
  id: string
  brand_name: string
  campaign_code: string
  platform: string
  commercial_type: string
  commercial_amount: number
  payout_structure?: string
  deliverables?: string
  timeline_days?: number
  completion_days?: number
  collab_date?: string
}

export interface CompletionSubmission {
  live_date?: string
  deliverable_link?: string
  supporting_document?: string
  views_count?: string
  notes?: string
  custom_responses?: Record<string, any>
  submitted_at?: string
  attempt?: number
}

export interface CompletionEntry {
  id: string
  status: string
  form_data?: {
    order_details?: Record<string, any>
    completion_submission?: CompletionSubmission
    completion_history?: any[]
    payment_request?: {
      live_date?: string
      supporting_document?: string
      amount?: number
      reason?: string
    }
    rejection_reason?: string
    completion_approved?: boolean
    order_history?: any[]
    _edited_by_admin?: {
      at: string
    }
    [key: string]: any
  }
  partial_payment: number
  final_payment: number
  pending_amount: number
  manager_phone?: string
  completion_submitted_at?: string
  created_at: string
  updated_at: string
  users: UserInfo
  campaigns: CampaignInfo
}

type SortField = 'date' | 'name' | 'campaign' | 'status' | 'views' | 'live_date'
type SortDir = 'asc' | 'desc'
type RowDensity = 'compact' | 'default' | 'comfortable'

const defaultColumns: Record<string, boolean> = {
  influencer: true,
  campaign: true,
  liveDate: true,
  deliverable: true,
  views: true,
  proof: true,
  status: true,
  submitted: true,
  actions: true,
}

// ─── Helpers ───────────────────────────────────────────────
function getCompletionDetails(app: CompletionEntry): CompletionSubmission {
  if (app.form_data?.completion_submission) {
    return app.form_data.completion_submission
  }
  if (app.form_data?.payment_request) {
    return {
      live_date: app.form_data.payment_request.live_date,
      supporting_document: app.form_data.payment_request.supporting_document,
      notes: app.form_data.payment_request.reason,
    }
  }
  return {}
}

function getCompletionStatus(app: CompletionEntry): 'Completed' | 'Pending Review' | 'Revision Needed' {
  if (app.status === 'Completed' || app.form_data?.completion_approved === true) return 'Completed'
  if (app.status === 'Rejected' || app.form_data?.completion_approved === false) return 'Revision Needed'
  return 'Pending Review'
}

function formatFollowers(count?: string | number): string {
  if (!count) return '—'
  const num = typeof count === 'string' ? parseInt(count, 10) : count
  if (isNaN(num)) return String(count)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

function formatViews(views?: string | number): string {
  if (!views) return '—'
  const num = typeof views === 'string' ? parseInt(views.replace(/[^0-9]/g, ''), 10) : views
  if (isNaN(num)) return String(views)
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return String(num)
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function CompletionSkeletonRow({ densityPadding, visibleCols }: { densityPadding: string; visibleCols: Record<string, boolean> }) {
  return (
    <tr className="border-b border-white/[0.03] animate-pulse">
      <td className={densityPadding}>
        <div className="w-4 h-4 rounded bg-slate-800" />
      </td>
      {visibleCols.influencer && (
        <td className={densityPadding}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-slate-800 shrink-0" />
            <div className="space-y-1.5">
              <div className="w-28 h-3.5 rounded bg-slate-800" />
              <div className="w-20 h-2.5 rounded bg-slate-800/60" />
            </div>
          </div>
        </td>
      )}
      {visibleCols.campaign && (
        <td className={densityPadding}>
          <div className="space-y-1.5">
            <div className="w-24 h-3.5 rounded bg-slate-800" />
            <div className="w-16 h-2.5 rounded bg-slate-800/60" />
          </div>
        </td>
      )}
      {visibleCols.liveDate && (
        <td className={densityPadding}>
          <div className="w-20 h-4 rounded bg-slate-800" />
        </td>
      )}
      {visibleCols.link && (
        <td className={densityPadding}>
          <div className="w-28 h-6 rounded-lg bg-slate-800" />
        </td>
      )}
      {visibleCols.views && (
        <td className={densityPadding}>
          <div className="w-16 h-4 rounded bg-slate-800" />
        </td>
      )}
      {visibleCols.proof && (
        <td className={`${densityPadding} text-center`}>
          <div className="w-12 h-8 rounded-lg bg-slate-800 mx-auto" />
        </td>
      )}
      {visibleCols.status && (
        <td className={densityPadding}>
          <div className="w-24 h-6 rounded-full bg-slate-800" />
        </td>
      )}
      {visibleCols.submitted && (
        <td className={densityPadding}>
          <div className="w-16 h-3 rounded bg-slate-800" />
        </td>
      )}
      {visibleCols.actions && (
        <td className={`${densityPadding} text-right`}>
          <div className="flex items-center justify-end gap-1.5">
            <div className="w-7 h-7 rounded-lg bg-slate-800" />
            <div className="w-7 h-7 rounded-lg bg-slate-800" />
          </div>
        </td>
      )}
    </tr>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function CompletionDetailsPage() {
  const [completions, setCompletions] = useState<CompletionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Filters & State
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'completed' | 'revision'>('all')
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Layout & Visibility
  const [visibleCols, setVisibleCols] = useState(defaultColumns)
  const [density, setDensity] = useState<RowDensity>('default')
  const [showFilters, setShowFilters] = useState(false)
  const [showColMenu, setShowColMenu] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)

  // Pagination
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(25)

  // Lightbox Preview
  const [previewImage, setPreviewImage] = useState<{ src: string; alt: string } | null>(null)

  // Verification & Review Modals
  const [approveModalApp, setApproveModalApp] = useState<CompletionEntry | null>(null)
  const [revisionModalApp, setRevisionModalApp] = useState<CompletionEntry | null>(null)
  const [revisionReason, setRevisionReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  // Edit Submission Modal
  const [editSubmissionModalApp, setEditSubmissionModalApp] = useState<CompletionEntry | null>(null)
  const [editLiveDate, setEditLiveDate] = useState('')
  const [editDeliverableLink, setEditDeliverableLink] = useState('')
  const [editViewsCount, setEditViewsCount] = useState('')
  const [editProofUrl, setEditProofUrl] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editFormResponses, setEditFormResponses] = useState<Record<string, any>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  // ─── Fetch Completions ──────────────────────────────────
  const fetchCompletions = useCallback(async (isBackground = false) => {
    if (!isBackground && completions.length === 0) {
      setLoading(true)
    }
    try {
      const res = await fetch('/api/admin/completion-details')
      if (!res.ok) throw new Error('Failed to fetch completion details')
      const data = await res.json()
      const list = data.completions || []
      setCompletions(list)
      setFastCache('admin_completion_details_cache', list)
    } catch (err: any) {
      if (!isBackground) toast.error(err.message || 'Failed to load completion details')
    } finally {
      setLoading(false)
    }
  }, [completions.length])

  useEffect(() => {
    const cached = getFastCache<CompletionEntry[]>('admin_completion_details_cache')
    if (cached && Array.isArray(cached) && cached.length > 0) {
      setCompletions(cached)
      setLoading(false)
      fetchCompletions(true)
    } else {
      fetchCompletions(false)
    }
  }, [fetchCompletions])

  // Realtime updates
  useRealtime({
    table: 'applications',
    onChange: () => fetchCompletions(true),
  })

  // ─── Unique Filter Options ─────────────────────────────
  const uniqueBrands = useMemo(() => {
    return Array.from(new Set(completions.map(c => c.campaigns?.brand_name).filter(Boolean)))
  }, [completions])

  const uniquePlatforms = useMemo(() => {
    return Array.from(new Set(completions.map(c => c.campaigns?.platform).filter(Boolean)))
  }, [completions])

  // ─── Filtering & Sorting ───────────────────────────────
  const filteredCompletions = useMemo(() => {
    return completions.filter(app => {
      const compStatus = getCompletionStatus(app)
      if (activeTab === 'pending' && compStatus !== 'Pending Review') return false
      if (activeTab === 'completed' && compStatus !== 'Completed') return false
      if (activeTab === 'revision' && compStatus !== 'Revision Needed') return false

      if (selectedBrand !== 'all' && app.campaigns?.brand_name !== selectedBrand) return false
      if (selectedPlatform !== 'all' && app.campaigns?.platform?.toLowerCase() !== selectedPlatform.toLowerCase()) return false

      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const qDigits = search.replace(/\D/g, '')
        const comp = getCompletionDetails(app)
        const matchName = app.users?.full_name?.toLowerCase().includes(q)
        const matchId = app.users?.influencer_id?.toLowerCase().includes(q)
        const matchInsta = app.users?.instagram_username?.toLowerCase().includes(q)
        const phones = [
          app.users?.mobile,
          app.manager_phone,
          app.form_data?.phone,
          app.form_data?.mobile,
          app.form_data?.whatsapp_number,
        ].filter(Boolean).map(String)
        const matchPhone = phones.some(p => p.toLowerCase().includes(q)) ||
          (qDigits.length >= 3 && phones.some(p => p.replace(/\D/g, '').includes(qDigits)))
        const matchBrand = app.campaigns?.brand_name?.toLowerCase().includes(q)
        const matchCode = app.campaigns?.campaign_code?.toLowerCase().includes(q)
        const matchLink = comp.deliverable_link?.toLowerCase().includes(q)
        const matchNotes = comp.notes?.toLowerCase().includes(q)
        if (!matchName && !matchId && !matchInsta && !matchPhone && !matchBrand && !matchCode && !matchLink && !matchNotes) {
          return false
        }
      }

      return true
    }).sort((a, b) => {
      let aVal: any = 0
      let bVal: any = 0

      if (sortField === 'date') {
        aVal = new Date(a.completion_submitted_at || a.updated_at || a.created_at).getTime()
        bVal = new Date(b.completion_submitted_at || b.updated_at || b.created_at).getTime()
      } else if (sortField === 'name') {
        aVal = (a.users?.full_name || '').toLowerCase()
        bVal = (b.users?.full_name || '').toLowerCase()
      } else if (sortField === 'campaign') {
        aVal = (a.campaigns?.brand_name || '').toLowerCase()
        bVal = (b.campaigns?.brand_name || '').toLowerCase()
      } else if (sortField === 'status') {
        aVal = getCompletionStatus(a)
        bVal = getCompletionStatus(b)
      } else if (sortField === 'views') {
        const vA = parseInt(String(getCompletionDetails(a).views_count || '0').replace(/[^0-9]/g, ''), 10) || 0
        const vB = parseInt(String(getCompletionDetails(b).views_count || '0').replace(/[^0-9]/g, ''), 10) || 0
        aVal = vA
        bVal = vB
      } else if (sortField === 'live_date') {
        aVal = new Date(getCompletionDetails(a).live_date || 0).getTime()
        bVal = new Date(getCompletionDetails(b).live_date || 0).getTime()
      }

      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [completions, activeTab, selectedBrand, selectedPlatform, search, sortField, sortDir])

  // Counts
  const counts = useMemo(() => {
    let pending = 0
    let completed = 0
    let revision = 0
    completions.forEach(app => {
      const st = getCompletionStatus(app)
      if (st === 'Pending Review') pending++
      else if (st === 'Completed') completed++
      else if (st === 'Revision Needed') revision++
    })
    return { all: completions.length, pending, completed, revision }
  }, [completions])

  // Pagination
  const totalPages = Math.ceil(filteredCompletions.length / rowsPerPage) || 1
  const paginatedCompletions = useMemo(() => {
    const start = (page - 1) * rowsPerPage
    return filteredCompletions.slice(start, start + rowsPerPage)
  }, [filteredCompletions, page, rowsPerPage])

  // ─── Handlers ──────────────────────────────────────────
  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedCompletions.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedCompletions.map(c => c.id)))
    }
  }

  // ─── Edit Submission Modal Open & Save ──────────────────
  const openEditModal = (app: CompletionEntry) => {
    const comp = getCompletionDetails(app)
    const internalKeys = ['order_details', 'completion_submission', 'completion_history', 'rejection_reason', 'completion_approved', 'order_history', 'payment_requests', 'payment_request_amount', 'payment_request_reason', 'supporting_document', 'live_date', 'payment_reason', 'payment_amount']
    const customResponses: Record<string, any> = {}
    if (app.form_data) {
      Object.entries(app.form_data).forEach(([k, v]) => {
        if (!internalKeys.includes(k) && !k.startsWith('_')) {
          customResponses[k] = v
        }
      })
    }

    setEditSubmissionModalApp(app)
    setEditLiveDate(comp.live_date || '')
    setEditDeliverableLink(comp.deliverable_link || '')
    setEditViewsCount(String(comp.views_count || ''))
    setEditProofUrl(comp.supporting_document || '')
    setEditNotes(comp.notes || '')
    setEditFormResponses(customResponses)
  }

  const handleSaveEdits = async () => {
    if (!editSubmissionModalApp) return
    setSavingEdit(true)
    try {
      const currentFormData = editSubmissionModalApp.form_data || {}
      const existingComp = currentFormData.completion_submission || {}

      const updatedCompletionSubmission: CompletionSubmission = {
        ...existingComp,
        live_date: editLiveDate.trim(),
        deliverable_link: editDeliverableLink.trim(),
        views_count: editViewsCount.trim(),
        supporting_document: editProofUrl.trim(),
        notes: editNotes.trim(),
      }

      const updatedFormData = {
        ...currentFormData,
        ...editFormResponses,
        completion_submission: updatedCompletionSubmission,
        _edited_by_admin: {
          at: new Date().toISOString(),
        }
      }

      const res = await fetch(`/api/admin/applications/${editSubmissionModalApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_data: updatedFormData,
          send_email: false,
        }),
      })

      if (!res.ok) throw new Error('Failed to update completion submission')

      setCompletions(prev => prev.map(c => c.id === editSubmissionModalApp.id ? { ...c, form_data: updatedFormData } : c))
      toast.success('Completion deliverables updated successfully')
      setEditSubmissionModalApp(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update completion details')
    } finally {
      setSavingEdit(false)
    }
  }

  // ─── Approve Completion Handler ─────────────────────────
  const handleApproveCompletion = async () => {
    if (!approveModalApp) return
    setActionLoading(true)
    try {
      const currentFormData = approveModalApp.form_data || {}
      const updatedFormData = {
        ...currentFormData,
        completion_approved: true,
        rejection_reason: undefined,
      }

      const res = await fetch(`/api/admin/applications/${approveModalApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Completed',
          form_data: updatedFormData,
        }),
      })

      if (!res.ok) throw new Error('Failed to approve completion')

      setCompletions(prev => prev.map(c => c.id === approveModalApp.id ? { ...c, status: 'Completed', form_data: updatedFormData } : c))
      toast.success('Deliverables verified & campaign marked Completed!')
      setApproveModalApp(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve completion')
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Request Revision Handler ───────────────────────────
  const handleRequestRevision = async () => {
    if (!revisionModalApp || !revisionReason.trim()) {
      toast.error('Please enter revision feedback for the creator')
      return
    }
    setActionLoading(true)
    try {
      const currentFormData = revisionModalApp.form_data || {}
      const updatedFormData = {
        ...currentFormData,
        completion_approved: false,
        rejection_reason: revisionReason.trim(),
      }

      const res = await fetch(`/api/admin/applications/${revisionModalApp.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'Rejected',
          form_data: updatedFormData,
        }),
      })

      if (!res.ok) throw new Error('Failed to request revision')

      setCompletions(prev => prev.map(c => c.id === revisionModalApp.id ? { ...c, status: 'Rejected', form_data: updatedFormData } : c))
      toast.success('Revision request sent to creator!')
      setRevisionModalApp(null)
      setRevisionReason('')
    } catch (err: any) {
      toast.error(err.message || 'Failed to request revision')
    } finally {
      setActionLoading(false)
    }
  }

  // ─── Export Handlers ────────────────────────────────────
  const handleExport = (type: 'csv' | 'json') => {
    const dataToExport = filteredCompletions.map(c => {
      const comp = getCompletionDetails(c)
      return {
        'Influencer Name': c.users?.full_name || '',
        'Influencer ID': c.users?.influencer_id || '',
        'Instagram': c.users?.instagram_username || '',
        'Followers': c.users?.followers || '',
        'Mobile': c.users?.mobile || '',
        'Brand': c.campaigns?.brand_name || '',
        'Campaign Code': c.campaigns?.campaign_code || '',
        'Live Date': comp.live_date || '',
        'Deliverable Link': comp.deliverable_link || '',
        'Views / Reach': comp.views_count || '',
        'Screenshot URL': comp.supporting_document || '',
        'Notes': comp.notes || '',
        'Completion Status': getCompletionStatus(c),
        'Application Status': c.status,
        'Submitted At': c.completion_submitted_at || c.updated_at,
      }
    })

    if (type === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `completion_details_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
    } else {
      if (dataToExport.length === 0) {
        toast.error('No data to export')
        return
      }
      const headers = Object.keys(dataToExport[0])
      const csvRows = [
        headers.join(','),
        ...dataToExport.map(row => headers.map(h => `"${String((row as any)[h] || '').replace(/"/g, '""')}"`).join(','))
      ]
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `completion_details_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    }
    setShowExportMenu(false)
    toast.success(`Exported ${dataToExport.length} records`)
  }

  const densityPadding = {
    compact: 'py-2 px-3.5',
    default: 'py-3.5 px-4',
    comfortable: 'py-5 px-4',
  }[density]

  const isInitialLoading = loading && completions.length === 0

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-16">
      {/* ─── Top Control Header with SetAdminHeader ────────────────── */}
      <SetAdminHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Completion Details</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isInitialLoading ? 'Loading deliverables...' : `${filteredCompletions.length} deliverable submission${filteredCompletions.length !== 1 ? 's' : ''} across all campaigns`}
              </p>
            </div>
          </div>

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Column Toggle */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowColMenu(!showColMenu)}
                className="bg-slate-800/80 border-white/10 text-slate-300 hover:text-white text-xs h-9 cursor-pointer"
              >
                <Columns3 className="h-3.5 w-3.5 mr-1.5" />
                Columns
              </Button>
              {showColMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 p-2 space-y-1">
                  {Object.entries(visibleCols).map(([col, isVisible]) => (
                    <label key={col} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-300 hover:bg-white/5 cursor-pointer capitalize">
                      <input
                        type="checkbox"
                        checked={isVisible}
                        onChange={(e) => setVisibleCols(prev => ({ ...prev, [col]: e.target.checked }))}
                        className="rounded border-white/20 accent-indigo-500"
                      />
                      {col.replace(/([A-Z])/g, ' $1')}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Density Toggle */}
            <div className="flex items-center bg-slate-800/80 p-0.5 rounded-lg border border-white/10">
              <button
                onClick={() => setDensity('compact')}
                className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${density === 'compact' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Compact rows"
              >
                <AlignJustify className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDensity('default')}
                className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${density === 'default' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Default rows"
              >
                <AlignCenter className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setDensity('comfortable')}
                className={`p-1.5 rounded-md text-xs cursor-pointer transition-colors ${density === 'comfortable' ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Comfortable rows"
              >
                <AlignStartVertical className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Export Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="bg-slate-800/80 border-white/10 text-slate-300 hover:text-white text-xs h-9 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
              {showExportMenu && (
                <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                    Export as CSV
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-300 hover:bg-white/5 hover:text-white cursor-pointer"
                  >
                    <FileJson className="h-3.5 w-3.5 text-amber-400" />
                    Export as JSON
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SetAdminHeader>

      {/* ─── Status Tabs ────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {[
          { key: 'all', label: 'All Submissions', count: counts.all, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
          { key: 'pending', label: 'Pending Review', count: counts.pending, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
          { key: 'completed', label: 'Approved & Completed', count: counts.completed, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { key: 'revision', label: 'Revision Needed', count: counts.revision, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key as any); setPage(1) }}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 border-white shadow-md'
                : 'bg-slate-900/60 border-white/5 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${tab.color}`}>
              {isInitialLoading ? <span className="inline-block w-3 h-2 rounded bg-white/20 animate-pulse" /> : tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ─── Search & Advanced Filters Bar ──────────────────── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, phone, ID, campaign, deliverable..."
            className="pl-10 h-11 bg-slate-900/60 border-white/10 text-white placeholder:text-slate-500 text-xs rounded-xl focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className={`h-11 px-4 text-xs font-bold rounded-xl border transition-colors cursor-pointer ${
            showFilters || selectedBrand !== 'all' || selectedPlatform !== 'all'
              ? 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300'
              : 'bg-slate-900/60 border-white/10 text-slate-400 hover:text-white'
          }`}
        >
          <Filter className="h-4 w-4 mr-2" />
          Filters
          {(selectedBrand !== 'all' || selectedPlatform !== 'all') && (
            <span className="ml-2 px-1.5 py-0.2 rounded-full bg-indigo-500 text-white text-[10px]">
              {(selectedBrand !== 'all' ? 1 : 0) + (selectedPlatform !== 'all' ? 1 : 0)}
            </span>
          )}
        </Button>
      </div>

      {/* Filter Drawers / Options */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden bg-slate-900/80 border border-white/10 rounded-2xl p-4 shadow-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs"
          >
            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">Brand</label>
              <select
                value={selectedBrand}
                onChange={(e) => { setSelectedBrand(e.target.value); setPage(1) }}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-xl p-2.5 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="all">All Brands ({uniqueBrands.length})</option>
                {uniqueBrands.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block mb-1.5">Platform</label>
              <select
                value={selectedPlatform}
                onChange={(e) => { setSelectedPlatform(e.target.value); setPage(1) }}
                className="w-full bg-slate-800 border border-white/10 text-white rounded-xl p-2.5 focus:ring-indigo-500 focus:outline-none cursor-pointer"
              >
                <option value="all">All Platforms ({uniquePlatforms.length})</option>
                {uniquePlatforms.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedBrand('all')
                  setSelectedPlatform('all')
                  setSearch('')
                  setPage(1)
                }}
                className="text-slate-400 hover:text-white text-xs h-10 w-full cursor-pointer"
              >
                Reset All Filters
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Completions Table ───────────────────────────────── */}
      <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="border-b border-white/10 bg-slate-950/70 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.size > 0 && selectedIds.size === paginatedCompletions.length}
                    onChange={toggleSelectAll}
                    className="rounded border-white/20 accent-indigo-500 cursor-pointer"
                  />
                </th>
                {visibleCols.influencer && (
                  <th
                    onClick={() => { setSortField('name'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Influencer
                      {sortField === 'name' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />)}
                    </div>
                  </th>
                )}
                {visibleCols.campaign && (
                  <th
                    onClick={() => { setSortField('campaign'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Campaign
                      {sortField === 'campaign' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />)}
                    </div>
                  </th>
                )}
                {visibleCols.liveDate && (
                  <th
                    onClick={() => { setSortField('live_date'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Content Live Date
                      {sortField === 'live_date' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />)}
                    </div>
                  </th>
                )}
                {visibleCols.deliverable && (
                  <th className="py-3.5 px-4">Live Deliverable</th>
                )}
                {visibleCols.views && (
                  <th
                    onClick={() => { setSortField('views'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Views / Reach
                      {sortField === 'views' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />)}
                    </div>
                  </th>
                )}
                {visibleCols.proof && (
                  <th className="py-3.5 px-4 text-center">Analytics Proof</th>
                )}
                {visibleCols.status && (
                  <th
                    onClick={() => { setSortField('status'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Review Status
                      {sortField === 'status' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />)}
                    </div>
                  </th>
                )}
                {visibleCols.submitted && (
                  <th
                    onClick={() => { setSortField('date'); setSortDir(sortDir === 'asc' ? 'desc' : 'asc') }}
                    className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Submitted
                      {sortField === 'date' && (sortDir === 'asc' ? <ArrowUp className="h-3 w-3 text-indigo-400" /> : <ArrowDown className="h-3 w-3 text-indigo-400" />)}
                    </div>
                  </th>
                )}
                {visibleCols.actions && (
                  <th className="py-3.5 px-4 text-right">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
              {isInitialLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <CompletionSkeletonRow key={i} densityPadding={densityPadding} visibleCols={visibleCols} />
                ))
              ) : paginatedCompletions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-16 text-center text-slate-500">
                    <FileCheck className="h-10 w-10 mx-auto mb-3 opacity-30 text-slate-400" />
                    <p className="text-sm font-semibold text-slate-400">No completion deliverables found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Deliverables submitted by creators will appear here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedCompletions.map((app) => {
                  const comp = getCompletionDetails(app)
                  const compStatus = getCompletionStatus(app)
                  const isExpanded = expandedRows.has(app.id)
                  const maturationInfo = comp.live_date ? checkLiveDateMaturation(comp.live_date, 7) : null

                  return (
                    <React.Fragment key={app.id}>
                      <tr
                        onClick={() => toggleRow(app.id)}
                        className={`transition-colors cursor-pointer ${
                          isExpanded
                            ? 'bg-indigo-950/30 hover:bg-indigo-950/40'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className={densityPadding} onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(app.id)}
                            onChange={() => toggleSelect(app.id)}
                            className="rounded border-white/20 accent-indigo-500 cursor-pointer"
                          />
                        </td>

                        {/* Influencer Column */}
                        {visibleCols.influencer && (
                          <td className={densityPadding}>
                            <div className="flex items-center gap-3">
                              {app.users?.instagram_profile_pic ? (
                                <img
                                  src={app.users.instagram_profile_pic}
                                  alt={app.users.full_name}
                                  className="w-9 h-9 rounded-full object-cover border border-white/10 shrink-0"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs border border-white/10 shrink-0">
                                  {app.users?.full_name?.charAt(0) || 'U'}
                                </div>
                              )}
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <p className="font-bold text-white truncate">{app.users?.full_name || 'Creator'}</p>
                                  <span className="font-mono text-[10px] text-slate-400 font-semibold px-1.5 py-0.2 rounded bg-slate-800 border border-white/5">
                                    {app.users?.influencer_id || 'ID'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                                  {app.users?.instagram_username && (
                                    <a
                                      href={getInstagramUrl(app.users.instagram_username)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-pink-400 hover:text-pink-300 hover:underline flex items-center gap-0.5 truncate"
                                    >
                                      <Instagram className="h-3 w-3 shrink-0" />
                                      {getInstagramDisplayHandle(app.users.instagram_username)}
                                    </a>
                                  )}
                                  {app.users?.followers && (
                                    <span className="text-[10px] text-slate-400">
                                      • {formatFollowers(app.users.followers)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        )}

                        {/* Campaign Column */}
                        {visibleCols.campaign && (
                          <td className={densityPadding}>
                            <p className="font-bold text-white">{app.campaigns?.brand_name}</p>
                            <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[10px] text-slate-400">{app.campaigns?.campaign_code}</span>
                              {app.campaigns?.platform && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-slate-800 text-indigo-300 border border-white/5">
                                  {app.campaigns.platform}
                                </span>
                              )}
                              {app.form_data?.completion_history && app.form_data.completion_history.length > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-0.5" title={`${app.form_data.completion_history.length} previous refills archived`}>
                                  <History className="h-2.5 w-2.5" />
                                  Attempt #{app.form_data.completion_history.length + 1}
                                </span>
                              )}
                            </div>
                          </td>
                        )}

                        {/* Live Date Column */}
                        {visibleCols.liveDate && (
                          <td className={densityPadding}>
                            {comp.live_date ? (
                              <div>
                                <p className="font-bold text-slate-200 flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-indigo-400" />
                                  {new Date(comp.live_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </p>
                                {maturationInfo && (
                                  <span className={`text-[10px] font-semibold block mt-0.5 ${maturationInfo.canSubmit ? 'text-emerald-400' : 'text-amber-400'}`}>
                                    {maturationInfo.canSubmit ? '✓ Maturation Complete' : `⏳ ${maturationInfo.daysRemaining}d remaining`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Not specified</span>
                            )}
                          </td>
                        )}

                        {/* Deliverable Link Column */}
                        {visibleCols.deliverable && (
                          <td className={densityPadding}>
                            {comp.deliverable_link ? (
                              <a
                                href={comp.deliverable_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 transition-colors font-medium text-xs max-w-[200px] truncate"
                              >
                                <ExternalLink className="h-3 w-3 shrink-0" />
                                <span className="truncate">Open Live Content</span>
                              </a>
                            ) : (
                              <span className="text-slate-500 italic">No link attached</span>
                            )}
                          </td>
                        )}

                        {/* Views / Reach Column */}
                        {visibleCols.views && (
                          <td className={densityPadding}>
                            {comp.views_count ? (
                              <span className="font-extrabold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-white/5">
                                👁️ {formatViews(comp.views_count)}
                              </span>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        )}

                        {/* Analytics Proof Screenshot Thumbnail */}
                        {visibleCols.proof && (
                          <td className={`${densityPadding} text-center`}>
                            {comp.supporting_document ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setPreviewImage({ src: comp.supporting_document!, alt: `${app.users?.full_name} Analytics Proof` })
                                }}
                                className="relative group inline-block rounded-lg overflow-hidden border border-white/10 hover:border-indigo-400 transition-all cursor-pointer shadow-sm"
                              >
                                <img
                                  src={comp.supporting_document}
                                  alt="Proof"
                                  className="h-10 w-14 object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                />
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-3.5 w-3.5 text-white" />
                                </div>
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-500">None</span>
                            )}
                          </td>
                        )}

                        {/* Review Status Column */}
                        {visibleCols.status && (
                          <td className={densityPadding}>
                            {compStatus === 'Completed' ? (
                              <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30 flex items-center gap-1 w-fit">
                                <CheckCircle2 className="h-3 w-3" />
                                Verified & Completed
                              </span>
                            ) : compStatus === 'Revision Needed' ? (
                              <span className="px-2.5 py-1 rounded-full bg-rose-500/15 text-rose-300 text-[10px] font-extrabold border border-rose-500/30 flex items-center gap-1 w-fit">
                                <XCircle className="h-3 w-3" />
                                Revision Requested
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-[10px] font-extrabold border border-amber-500/30 flex items-center gap-1 w-fit animate-pulse">
                                <Clock className="h-3 w-3" />
                                Pending Review
                              </span>
                            )}
                          </td>
                        )}

                        {/* Submitted Time */}
                        {visibleCols.submitted && (
                          <td className={densityPadding}>
                            <span className="text-slate-400 font-medium">
                              {timeAgo(app.completion_submitted_at || app.updated_at)}
                            </span>
                          </td>
                        )}

                        {/* Quick Actions Dropdown / Trigger */}
                        {visibleCols.actions && (
                          <td className={`${densityPadding} text-right`} onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => openEditModal(app)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer border border-white/5"
                                title="Edit submission deliverables"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>

                              {/* Expand Arrow */}
                              <button
                                type="button"
                                onClick={() => toggleRow(app.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-400' : ''}`} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>

                      {/* ─── Expanded Row ────────────────────── */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={10} className="p-0 bg-slate-950/40 border-b border-indigo-500/20">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="p-5"
                            >
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                                {/* LEFT COLUMN: Creator Profile, Campaign Info & Application Answers (7 cols) */}
                                <div className="lg:col-span-7 space-y-4 flex flex-col justify-between">
                                  {/* Top Row: Profile & Campaign Metadata */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                                    {/* Creator Profile */}
                                    <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 space-y-2">
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Influencer Details</p>
                                      <div className="flex items-center gap-3">
                                        {app.users?.instagram_profile_pic ? (
                                          <img src={app.users.instagram_profile_pic} alt="" className="w-10 h-10 rounded-xl object-cover border border-white/10" />
                                        ) : (
                                          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                                            {app.users?.full_name?.charAt(0) || 'U'}
                                          </div>
                                        )}
                                        <div>
                                          <p className="font-bold text-white text-sm">{app.users?.full_name}</p>
                                          <p className="text-xs text-slate-400 font-mono">{app.users?.influencer_id}</p>
                                        </div>
                                      </div>
                                      <div className="pt-2 border-t border-white/5 space-y-1 text-xs text-slate-300">
                                        <p className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-slate-500" /> {app.users?.mobile || 'No phone'}</p>
                                        <p className="flex items-center gap-1.5"><MapPin className="h-3 w-3 text-slate-500" /> {[app.users?.city, app.users?.state].filter(Boolean).join(', ') || 'India'}</p>
                                      </div>
                                    </div>

                                    {/* Campaign Info */}
                                    <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 space-y-2">
                                      <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Campaign Deliverables</p>
                                      <div className="space-y-1">
                                        <p className="font-bold text-white text-sm">{app.campaigns?.brand_name}</p>
                                        <p className="text-xs text-indigo-400 font-mono">{app.campaigns?.campaign_code}</p>
                                      </div>
                                      <div className="pt-2 border-t border-white/5 space-y-1 text-xs text-slate-300">
                                        <p><span className="text-slate-500">Deliverable:</span> <span className="font-semibold text-slate-200">{app.campaigns?.deliverables || 'Standard Social Post'}</span></p>
                                        <p><span className="text-slate-500">Timeline:</span> <span className="font-semibold text-slate-200">{app.campaigns?.collab_date || `${app.campaigns?.completion_days || 7} days post-approval`}</span></p>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Application Form Responses */}
                                  {app.form_data && (() => {
                                    const internalKeys = ['order_details', 'completion_submission', 'completion_history', 'rejection_reason', 'completion_approved', 'order_history', 'payment_requests', 'payment_request_amount', 'payment_request_reason', 'supporting_document', 'live_date', 'payment_reason', 'payment_amount']
                                    const customEntries = Object.entries(app.form_data).filter(([k]) => !internalKeys.includes(k) && !k.startsWith('_'))
                                    if (customEntries.length === 0) return null

                                    return (
                                      <div className="bg-purple-500/[0.04] border border-purple-500/15 rounded-2xl p-4 flex-1 flex flex-col justify-between">
                                        <div>
                                          <div className="flex items-center justify-between mb-2.5">
                                            <p className="text-[11px] text-purple-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                                              <ClipboardList className="h-3.5 w-3.5" />
                                              Application Answers ({customEntries.length})
                                            </p>
                                            <button
                                              type="button"
                                              onClick={() => openEditModal(app)}
                                              className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-300 hover:text-purple-200 bg-purple-500/15 px-2 py-0.5 rounded-lg border border-purple-500/25 transition-all cursor-pointer"
                                            >
                                              <Pencil className="h-3 w-3" />
                                              Edit Answers
                                            </button>
                                          </div>
                                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {customEntries.map(([key, val]) => (
                                              <div key={key} className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                                                <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold truncate mb-1">
                                                  {key.replace(/[_-]/g, ' ')}
                                                </p>
                                                <p className="text-xs font-semibold text-white break-words">
                                                  {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || '—')}
                                                </p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        {/* Financial deal summary */}
                                        {(app.pending_amount > 0 || app.partial_payment > 0 || app.final_payment > 0) && (
                                          <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3 mt-3 flex items-center justify-between text-xs">
                                            <div>
                                              <span className="text-[9px] text-slate-500 uppercase block font-semibold">Total Deal</span>
                                              <span className="font-bold text-white font-mono">₹{app.pending_amount.toLocaleString()}</span>
                                            </div>
                                            <div>
                                              <span className="text-[9px] text-slate-500 uppercase block font-semibold">Partial Paid</span>
                                              <span className="font-bold text-emerald-400 font-mono">₹{app.partial_payment.toLocaleString()}</span>
                                            </div>
                                            <div>
                                              <span className="text-[9px] text-slate-500 uppercase block font-semibold">Final Paid</span>
                                              <span className="font-bold text-purple-400 font-mono">₹{app.final_payment.toLocaleString()}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    )
                                  })()}
                                </div>

                                {/* RIGHT COLUMN: Deliverables Verification & Actions (5 cols) */}
                                <div className="lg:col-span-5 flex flex-col justify-between bg-gradient-to-b from-emerald-950/20 via-slate-900/80 to-slate-900/90 border border-emerald-500/20 rounded-2xl p-4 shadow-xl space-y-4">
                                  <div className="space-y-3.5">
                                    {/* Header with Edit Button */}
                                    <div className="flex items-center justify-between border-b border-emerald-500/15 pb-2.5">
                                      <div className="flex items-center gap-2">
                                        <FileCheck className="h-4 w-4 text-emerald-400" />
                                        <span className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                                          Completion Deliverables
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => openEditModal(app)}
                                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-300 hover:text-emerald-200 bg-emerald-500/15 px-2 py-0.5 rounded-lg border border-emerald-500/25 transition-all cursor-pointer shadow-sm"
                                          title="Edit deliverable link, views, notes"
                                        >
                                          <Pencil className="h-3 w-3" />
                                          Edit
                                        </button>
                                      </div>
                                      {compStatus === 'Completed' ? (
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">Verified</span>
                                      ) : compStatus === 'Revision Needed' ? (
                                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">Needs Revision</span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30 animate-pulse">Action Required</span>
                                      )}
                                    </div>

                                    {/* Deliverable Fields */}
                                    <div className="grid grid-cols-2 gap-2.5">
                                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Content Live Date</p>
                                        <p className="text-xs font-bold text-white mt-0.5">
                                          {comp.live_date ? new Date(comp.live_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                                        </p>
                                      </div>
                                      <div className="bg-slate-900/80 p-2.5 rounded-xl border border-white/5">
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Views / Reach Achieved</p>
                                        <p className="text-xs font-bold text-emerald-400 mt-0.5">
                                          {comp.views_count ? formatViews(comp.views_count) : '—'}
                                        </p>
                                      </div>
                                    </div>

                                    {/* Live Content Link */}
                                    {comp.deliverable_link && (
                                      <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1.5">
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
                                          <Link2 className="h-3 w-3 text-indigo-400" />
                                          Live Content Link
                                        </p>
                                        <a
                                          href={comp.deliverable_link}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs font-bold text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 break-all"
                                        >
                                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                          {comp.deliverable_link}
                                        </a>
                                      </div>
                                    )}

                                    {/* Creator Remarks / Notes */}
                                    {comp.notes && (
                                      <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-1">
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Creator Remarks</p>
                                        <p className="text-xs text-slate-300 italic whitespace-pre-line leading-relaxed">{comp.notes}</p>
                                      </div>
                                    )}

                                    {/* Screenshot Preview Container */}
                                    {comp.supporting_document && (
                                      <div className="space-y-1.5">
                                        <p className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Analytics Screenshot Proof</p>
                                        <div className="relative rounded-xl overflow-hidden border border-white/10 bg-black/60 h-40 group flex items-center justify-center">
                                          <img
                                            src={comp.supporting_document}
                                            alt="Proof Screenshot"
                                            className="w-full h-full object-contain"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => setPreviewImage({ src: comp.supporting_document!, alt: 'Analytics Proof' })}
                                            className="absolute bottom-2 right-2 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-black/75 text-white text-[10px] font-bold hover:bg-black transition-colors cursor-pointer border border-white/15 shadow-md"
                                          >
                                            <Eye className="h-3 w-3" />
                                            View Full Screen
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Verification Actions & Status */}
                                  <div className="pt-3 border-t border-white/10">
                                    {compStatus === 'Completed' ? (
                                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">
                                        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                                          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                                          <span>Deliverables Verified & Approved</span>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() => {
                                            setRevisionModalApp(app)
                                            setRevisionReason('')
                                          }}
                                          className="bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border-white/10 hover:border-rose-500/20 text-[11px] h-8 cursor-pointer font-semibold"
                                        >
                                          Reopen & Request Revision
                                        </Button>
                                      </div>
                                    ) : compStatus === 'Revision Needed' ? (
                                      <div className="space-y-2.5 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl">
                                        <div className="flex items-center gap-2 text-rose-400 text-xs font-bold">
                                          <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                                          <span>Revision Requested from Creator</span>
                                        </div>
                                        {app.form_data?.rejection_reason && (
                                          <p className="text-[11px] text-rose-300 font-medium bg-rose-950/40 p-2 rounded-lg border border-rose-500/20">
                                            Feedback: {app.form_data?.rejection_reason}
                                          </p>
                                        )}
                                        <div className="flex gap-2 pt-1">
                                          <Button
                                            type="button"
                                            onClick={() => setApproveModalApp(app)}
                                            className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs h-9 cursor-pointer shadow-lg shadow-emerald-500/20"
                                          >
                                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                            Approve & Complete Now
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex gap-2">
                                        <Button
                                          type="button"
                                          variant="outline"
                                          onClick={() => {
                                            setRevisionModalApp(app)
                                            setRevisionReason('')
                                          }}
                                          className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/20 font-bold text-xs h-9 cursor-pointer"
                                        >
                                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                          Request Revision
                                        </Button>

                                        <Button
                                          type="button"
                                          onClick={() => setApproveModalApp(app)}
                                          className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs h-9 cursor-pointer shadow-lg shadow-emerald-500/20"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                          Verify & Complete
                                        </Button>
                                      </div>
                                    )}
                                  </div>

                                  {/* ─── Previous Submissions / Refills History (Old vs New) ─── */}
                                  {app.form_data?.completion_history && app.form_data.completion_history.length > 0 && (
                                    <div className="pt-3 border-t border-white/10 space-y-2.5">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-300">
                                          <History className="h-3.5 w-3.5 text-indigo-400" />
                                          <span>Previous Submissions History ({app.form_data.completion_history.length})</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                          Old Submissions Archived
                                        </span>
                                      </div>

                                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
                                        {[...app.form_data.completion_history].reverse().map((hist: any, hIdx: number) => {
                                          const attemptNum = (app.form_data?.completion_history?.length || 0) - hIdx
                                          return (
                                            <div key={hIdx} className="bg-slate-900/90 p-3 rounded-xl border border-white/5 space-y-2 text-xs hover:border-indigo-500/30 transition-all">
                                              <div className="flex items-center justify-between">
                                                <span className="font-extrabold text-amber-400 text-[11px] bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                                  Attempt #{attemptNum} (Archived)
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                  {hist.submitted_at || hist.archived_at ? new Date(hist.submitted_at || hist.archived_at).toLocaleString('en-IN') : 'Previous attempt'}
                                                </span>
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                                <div className="bg-slate-950/60 p-2 rounded-lg border border-white/5">
                                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Live Date</p>
                                                  <p className="font-bold text-slate-200 mt-0.5">{hist.live_date || '—'}</p>
                                                </div>
                                                <div className="bg-slate-950/60 p-2 rounded-lg border border-white/5">
                                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Views / Reach</p>
                                                  <p className="font-bold text-emerald-400 mt-0.5">{hist.views_count ? formatViews(hist.views_count) : '—'}</p>
                                                </div>
                                              </div>

                                              {hist.deliverable_link && (
                                                <div className="bg-slate-950/60 p-2 rounded-lg border border-white/5">
                                                  <p className="text-[9px] text-slate-500 uppercase font-semibold">Content Link</p>
                                                  <a
                                                    href={hist.deliverable_link}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[11px] text-indigo-400 hover:underline flex items-center gap-1 font-mono truncate mt-0.5"
                                                  >
                                                    <ExternalLink className="h-3 w-3 shrink-0" />
                                                    <span className="truncate">{hist.deliverable_link}</span>
                                                  </a>
                                                </div>
                                              )}

                                              {hist.supporting_document && (
                                                <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-lg border border-white/5">
                                                  <div className="flex items-center gap-2">
                                                    <img src={hist.supporting_document} alt="Old Proof" className="h-8 w-12 object-cover rounded border border-white/10" />
                                                    <span className="text-[11px] text-slate-300">Proof Screenshot</span>
                                                  </div>
                                                  <button
                                                    type="button"
                                                    onClick={() => setPreviewImage({ src: hist.supporting_document, alt: `Attempt #${attemptNum} Proof` })}
                                                    className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded cursor-pointer"
                                                  >
                                                    View Image
                                                  </button>
                                                </div>
                                              )}

                                              {hist.notes && (
                                                <p className="text-[10px] text-slate-400 italic bg-slate-950/40 p-1.5 rounded-lg border border-white/5">
                                                  Remarks: {hist.notes}
                                                </p>
                                              )}

                                              {hist.rejection_reason && (
                                                <p className="text-[10px] text-rose-300 font-medium bg-rose-950/40 border border-rose-500/20 p-2 rounded-lg">
                                                  Admin Feedback: {hist.rejection_reason}
                                                </p>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ────────────────────────────── */}
        <div className="p-4 border-t border-white/10 bg-slate-950/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Rows per page:</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1) }}
              className="bg-slate-800 border border-white/10 text-white rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
            >
              {[10, 25, 50, 100].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <span className="text-slate-500 ml-2">
              Showing {(page - 1) * rowsPerPage + 1}–{Math.min(page * rowsPerPage, filteredCompletions.length)} of {filteredCompletions.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-3 font-semibold text-white">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-white/10 disabled:opacity-30 hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
            >
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── MODALS ─────────────────────────────────────────── */}

      {/* 1. Edit Creator Submission Deliverables Modal */}
      <AnimatePresence>
        {editSubmissionModalApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => !savingEdit && setEditSubmissionModalApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]"
            >
              {/* Header */}
              <div className="p-5 border-b border-white/10 bg-slate-950/60 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-emerald-400" />
                    Edit Completion Deliverables
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editSubmissionModalApp.users?.full_name} •{' '}
                    <span className="font-mono text-slate-300">{editSubmissionModalApp.users?.influencer_id}</span> •{' '}
                    <span className="text-emerald-300">{editSubmissionModalApp.campaigns?.brand_name}</span>
                  </p>
                </div>
                <button
                  onClick={() => !savingEdit && setEditSubmissionModalApp(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                {/* Completion Deliverables Section */}
                <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 space-y-3.5">
                  <p className="text-[11px] text-emerald-400 uppercase tracking-wider font-bold flex items-center gap-1.5 border-b border-emerald-500/10 pb-2">
                    <FileCheck className="h-3.5 w-3.5" />
                    Deliverable Details
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                        Content Live Date
                      </label>
                      <Input
                        type="date"
                        value={editLiveDate}
                        onChange={(e) => setEditLiveDate(e.target.value)}
                        onClick={(e) => e.currentTarget.showPicker?.()}
                        className="bg-slate-800 border-white/10 text-white text-xs focus:ring-emerald-500 [color-scheme:dark] cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-90 hover:[&::-webkit-calendar-picker-indicator]:opacity-100"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                        Views / Reach Achieved
                      </label>
                      <Input
                        type="text"
                        value={editViewsCount}
                        onChange={(e) => setEditViewsCount(e.target.value)}
                        placeholder="e.g. 250000"
                        className="bg-slate-800 border-white/10 text-white text-xs focus:ring-emerald-500 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                      Live Deliverable Link (Reel / Post / Video URL)
                    </label>
                    <Input
                      type="url"
                      value={editDeliverableLink}
                      onChange={(e) => setEditDeliverableLink(e.target.value)}
                      placeholder="https://www.instagram.com/reels/..."
                      className="bg-slate-800 border-white/10 text-white text-xs focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                      Analytics Proof Screenshot Image URL
                    </label>
                    <Input
                      type="url"
                      value={editProofUrl}
                      onChange={(e) => setEditProofUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-slate-800 border-white/10 text-white text-xs focus:ring-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block">
                      Additional Remarks / Notes
                    </label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      rows={2}
                      placeholder="Any specific comments or notes..."
                      className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
                    />
                  </div>
                </div>

                {/* Application Form Responses (if any) */}
                {Object.keys(editFormResponses).length > 0 && (
                  <div className="bg-purple-500/5 border border-purple-500/15 rounded-xl p-4 space-y-3">
                    <p className="text-[11px] text-purple-400 uppercase tracking-wider font-bold flex items-center gap-1.5 border-b border-purple-500/10 pb-2">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Application Form Responses
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {Object.entries(editFormResponses).map(([key, val]) => (
                        <div key={key}>
                          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-1 block truncate">
                            {key.replace(/[_-]/g, ' ')}
                          </label>
                          <Input
                            type="text"
                            value={String(val ?? '')}
                            onChange={(e) => {
                              const v = e.target.value
                              setEditFormResponses(prev => ({ ...prev, [key]: v }))
                            }}
                            className="bg-slate-800 border-white/10 text-white text-xs focus:ring-purple-500"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-white/10 bg-slate-950/60 flex items-center justify-end gap-2.5">
                <Button
                  variant="outline"
                  onClick={() => setEditSubmissionModalApp(null)}
                  disabled={savingEdit}
                  className="bg-transparent border-white/10 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdits}
                  disabled={savingEdit}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs border-none shadow-lg shadow-emerald-500/20"
                >
                  {savingEdit ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Save className="h-3.5 w-3.5 mr-1.5" />}
                  Save Changes
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Verify & Approve Completion Modal */}
      <AnimatePresence>
        {approveModalApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => !actionLoading && setApproveModalApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Approve Deliverables</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {approveModalApp.users?.full_name} • {approveModalApp.campaigns?.brand_name}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Confirm that you have reviewed the live content deliverable and analytics proof. This will mark the application status as <strong className="text-emerald-400">Completed</strong>.
              </p>

              <div className="flex gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setApproveModalApp(null)}
                  disabled={actionLoading}
                  className="flex-1 bg-transparent border-white/10 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleApproveCompletion}
                  disabled={actionLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Confirm & Complete
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Request Revision / Reject Modal */}
      <AnimatePresence>
        {revisionModalApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm cursor-pointer"
              onClick={() => !actionLoading && setRevisionModalApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <XCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Request Revision / Reject</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {revisionModalApp.users?.full_name} • {revisionModalApp.campaigns?.brand_name}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">
                  Revision Reason / Feedback for Creator *
                </label>
                <textarea
                  value={revisionReason}
                  onChange={(e) => setRevisionReason(e.target.value)}
                  placeholder="Explain why the deliverable needs revision (e.g. invalid link, analytics screenshot blurry, missing brand tag)..."
                  rows={4}
                  className="w-full bg-slate-800 border border-white/10 text-white text-xs rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setRevisionModalApp(null)}
                  disabled={actionLoading}
                  className="flex-1 bg-transparent border-white/10 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRequestRevision}
                  disabled={actionLoading}
                  className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
                >
                  {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  Send Revision Request
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Fullscreen Lightbox Image Preview */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-md cursor-pointer"
              onClick={() => setPreviewImage(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] bg-slate-900 border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-3 bg-slate-950/80 border-b border-white/10 flex items-center justify-between">
                <p className="text-xs font-bold text-white truncate">{previewImage.alt}</p>
                <div className="flex items-center gap-2">
                  <a
                    href={previewImage.src}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Open original in new tab"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="p-2 bg-black/80 overflow-auto flex items-center justify-center flex-1">
                <img
                  src={previewImage.src}
                  alt={previewImage.alt}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg"
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Scrollbar CSS */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          height: 6px;
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }
      `}</style>
    </div>
  )
}
