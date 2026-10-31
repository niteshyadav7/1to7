'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, XCircle, MapPin,
  Instagram, Users, Phone, Search, Filter,
  Megaphone, Download, Clock, Package,
  ExternalLink, Sparkles, AlertCircle, FileSpreadsheet,
  Check, X, RefreshCw, Truck, ShieldCheck,
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Upload, CheckCheck, Tag, MessageSquare, AlertTriangle,
  PackageCheck, UserX, PauseCircle, Edit2, Trash2
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/useRealtime'
import { getInstagramUrl, getInstagramDisplayHandle } from '@/lib/instagram-utils'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import Papa from 'papaparse'
import AddressImportModal from './AddressImportModal'

export interface AddressEntry {
  id: string
  status: string
  address_status: string | null
  address_verified_at: string | null
  address_verified_by: string | null
  team_remark?: string | null
  team_remark_by?: string | null
  team_remark_updated_at?: string | null
  form_data: Record<string, any>
  created_at: string
  updated_at: string
  campaigns: {
    id: string
    campaign_code: string
    brand_name: string
    category?: string
    platform?: string
    deliverables?: string
    address_required?: boolean
    order_form?: boolean
    order_form_fields?: Array<{ name: string; type: string; required?: boolean; options?: string[] }>
  }
  users: {
    id: string
    full_name: string
    influencer_id: string
    email: string
    mobile: string
    instagram_username: string
    followers: number
    city: string
    state: string
    pincode: string
    profile_photo?: string
    instagram_profile_pic?: string
    shipping_addresses?: any[]
  }
}

export const PREDEFINED_REMARKS = [
  { label: 'Sent to Brand', value: 'Sent to Brand', color: 'emerald', description: 'Address shared with brand' },
  { label: 'Pending Brand Share', value: 'Pending Brand Share', color: 'amber', description: 'Verified, awaiting share' },
  { label: 'Courier Dispatched', value: 'Courier Dispatched', color: 'purple', description: 'Dispatched by brand' },
  { label: 'Delivered to Creator', value: 'Delivered to Creator', color: 'blue', description: 'Delivered to creator' },
  { label: 'Address Incomplete / Invalid', value: 'Address Incomplete / Invalid', color: 'rose', description: 'Needs address correction' },
  { label: 'Creator Unresponsive', value: 'Creator Unresponsive', color: 'slate', description: 'Creator not responding' },
  { label: 'Hold by Brand', value: 'Hold by Brand', color: 'orange', description: 'On hold by brand' },
] as const

const pageSizes = [10, 25, 50, 100]

function AddressSkeletonRow() {
  return (
    <tr className="border-b border-white/5 animate-pulse">
      {/* Checkbox */}
      <td className="py-3.5 px-3 align-top w-10">
        <div className="h-4 w-4 rounded bg-slate-800 shimmer" />
      </td>

      {/* Creator Profile */}
      <td className="py-3.5 px-4 align-top">
        <div className="flex items-start gap-2.5">
          <div className="h-8 w-8 rounded-full bg-slate-800 shrink-0 shimmer" />
          <div className="space-y-1.5 pt-0.5">
            <div className="h-3.5 w-28 rounded bg-slate-800 shimmer" />
            <div className="h-2.5 w-16 rounded bg-slate-800/60 shimmer" />
            <div className="h-2.5 w-24 rounded bg-slate-800/40 shimmer" />
          </div>
        </div>
      </td>

      {/* Campaign */}
      <td className="py-3.5 px-4 align-top">
        <div className="space-y-1.5">
          <div className="h-3.5 w-24 rounded bg-slate-800 shimmer" />
          <div className="h-4 w-20 rounded bg-slate-800/80 border border-white/5 shimmer" />
          <div className="h-2.5 w-16 rounded bg-slate-800/40 shimmer" />
        </div>
      </td>

      {/* Delivery Address */}
      <td className="py-3.5 px-4 align-top">
        <div className="space-y-1.5 max-w-[320px]">
          <div className="h-3.5 w-36 rounded bg-slate-800 shimmer" />
          <div className="h-3 w-56 rounded bg-slate-800/70 shimmer" />
          <div className="h-3 w-40 rounded bg-slate-800/50 shimmer" />
          <div className="flex gap-1.5 pt-1">
            <div className="h-4 w-20 rounded bg-slate-800/60 shimmer" />
            <div className="h-4 w-24 rounded bg-slate-800/60 shimmer" />
          </div>
        </div>
      </td>

      {/* Contact Phone */}
      <td className="py-3.5 px-4 align-top">
        <div className="space-y-1.5">
          <div className="h-3.5 w-28 rounded bg-slate-800 shimmer" />
          <div className="h-2.5 w-20 rounded bg-slate-800/50 shimmer" />
        </div>
      </td>

      {/* Status */}
      <td className="py-3.5 px-4 align-top">
        <div className="h-6 w-24 rounded-full bg-slate-800/80 border border-white/5 shimmer" />
      </td>

      {/* Brand Dispatch & Remarks */}
      <td className="py-3.5 px-4 align-top">
        <div className="space-y-1.5">
          <div className="h-5 w-28 rounded-full bg-slate-800/80 shimmer" />
          <div className="h-2.5 w-16 rounded bg-slate-800/40 shimmer" />
        </div>
      </td>

      {/* Verification Action */}
      <td className="py-3.5 px-4 align-top text-right">
        <div className="flex items-center justify-end gap-1.5">
          <div className="h-8 w-16 rounded-lg bg-slate-800 shimmer" />
          <div className="h-8 w-16 rounded-lg bg-slate-800/60 shimmer" />
        </div>
      </td>
    </tr>
  )
}

export default function AdminAddressConfirmationPage() {
  const [entries, setEntries] = useState<AddressEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'All' | 'BrandDispatch' | 'Approved' | 'Pending' | 'NotSubmitted' | 'Rejected'>('All')
  const [campaignStatusFilter, setCampaignStatusFilter] = useState<string>('all')
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('all')
  const [remarkFilter, setRemarkFilter] = useState<string>('all')
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Multi-Selection State for Bulk Actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchUpdating, setBatchUpdating] = useState(false)

  // Rejection reason modal
  const [rejectModalEntry, setRejectModalEntry] = useState<AddressEntry | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Single Remark Modal
  const [remarkModalEntry, setRemarkModalEntry] = useState<AddressEntry | null>(null)
  const [selectedRemarkVal, setSelectedRemarkVal] = useState<string>('')
  const [customRemarkNote, setCustomRemarkNote] = useState<string>('')

  // Batch Remark Modal
  const [isBatchRemarkModalOpen, setIsBatchRemarkModalOpen] = useState(false)
  const [batchRemarkVal, setBatchRemarkVal] = useState<string>('Sent to Brand')
  const [batchCustomNote, setBatchCustomNote] = useState<string>('')

  // Smart Address Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const fetchAddresses = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const res = await fetch('/api/admin/address-confirmation?limit=5000')
      const data = await res.json()
      if (res.ok && data.addresses) {
        setEntries(data.addresses)
      } else if (!isSilent) {
        toast.error(data.error || 'Failed to fetch addresses')
      }
    } catch {
      if (!isSilent) toast.error('Failed to load address confirmation entries')
    } finally {
      if (!isSilent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  useRealtime({ table: 'applications', onChange: () => fetchAddresses(true) })

  // Extract unique campaigns for filter
  const campaignOptions = useMemo(() => {
    const map = new Map<string, string>()
    entries.forEach(e => {
      if (e.campaigns?.id) {
        map.set(e.campaigns.id, `${e.campaigns.brand_name} (${e.campaigns.campaign_code})`)
      }
    })
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }))
  }, [entries])

  // Check if an address object actually contains non-empty location details
  const hasValidShippingAddress = (addr: any): boolean => {
    if (!addr || typeof addr !== 'object') return false
    return Boolean(
      (addr.address_line1 && String(addr.address_line1).trim()) ||
      (addr.city && String(addr.city).trim()) ||
      (addr.pincode && String(addr.pincode).trim())
    )
  }

  // Resolve status helper with strict non-empty object guards
  const getVerificationStatus = (entry: AddressEntry): 'Pending' | 'Approved' | 'Rejected' | 'Not Submitted' => {
    if (entry.address_status === 'Approved' || entry.form_data?.address_verified === true) {
      return 'Approved'
    }
    if (entry.address_status === 'Rejected' || entry.form_data?.address_status === 'Rejected') {
      return 'Rejected'
    }
    const addr = entry.form_data?.shipping_address
    const hasAddr = hasValidShippingAddress(addr)
    const isConfirmed = entry.form_data?.address_confirmed === true
    if (entry.address_status === 'Pending' || isConfirmed || hasAddr) {
      return 'Pending'
    }
    return 'Not Submitted'
  }

  // Resolve remark badge styling & icon
  const getRemarkBadge = (remark: string | null | undefined) => {
    if (!remark) return null
    switch (remark) {
      case 'Sent to Brand':
        return {
          bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
          icon: CheckCheck,
          label: 'Sent to Brand'
        }
      case 'Pending Brand Share':
        return {
          bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
          icon: Clock,
          label: 'Pending Brand Share'
        }
      case 'Courier Dispatched':
        return {
          bg: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          icon: Truck,
          label: 'Courier Dispatched'
        }
      case 'Delivered to Creator':
        return {
          bg: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
          icon: PackageCheck,
          label: 'Delivered to Creator'
        }
      case 'Address Incomplete / Invalid':
        return {
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
          icon: AlertTriangle,
          label: 'Address Incomplete'
        }
      case 'Creator Unresponsive':
        return {
          bg: 'bg-slate-700/50 text-slate-300 border-slate-600/40',
          icon: UserX,
          label: 'Creator Unresponsive'
        }
      case 'Hold by Brand':
        return {
          bg: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
          icon: PauseCircle,
          label: 'Hold by Brand'
        }
      default:
        return {
          bg: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',
          icon: Tag,
          label: remark
        }
    }
  }

  // 1. Campaign-scoped entries: for top KPI cards & campaign selection status
  const campaignScopedEntries = useMemo(() => {
    if (selectedCampaignId === 'all') return entries
    return entries.filter(e => e.campaigns?.id === selectedCampaignId)
  }, [entries, selectedCampaignId])

  // 2. Tab-scoped entries: filtered by campaign AND campaign selection status
  const tabScopedEntries = useMemo(() => {
    return campaignScopedEntries.filter(e => {
      if (campaignStatusFilter !== 'all' && e.status !== campaignStatusFilter) return false
      return true
    })
  }, [campaignScopedEntries, campaignStatusFilter])

  // 3. Top KPI cards summary: accurately reflects the selected campaign
  const kpiMetrics = useMemo(() => {
    let brandDispatch = 0
    let pending = 0
    let approved = 0
    let rejected = 0
    let notSubmitted = 0
    let sentToBrand = 0

    campaignScopedEntries.forEach(e => {
      const st = getVerificationStatus(e)
      const rm = e.team_remark || e.form_data?.team_remark
      if (rm === 'Sent to Brand') sentToBrand++
      if (e.status === 'Approved' && st === 'Approved') brandDispatch++
      if (st === 'Pending') pending++
      else if (st === 'Approved') approved++
      else if (st === 'Rejected') rejected++
      else notSubmitted++
    })

    return { total: campaignScopedEntries.length, brandDispatch, pending, approved, rejected, notSubmitted, sentToBrand }
  }, [campaignScopedEntries])

  // 4. Sub-tab badge counts: accurately reflects the active campaign & campaign status
  const tabCounts = useMemo(() => {
    let brandDispatch = 0
    let pending = 0
    let approved = 0
    let rejected = 0
    let notSubmitted = 0
    let sentToBrand = 0

    tabScopedEntries.forEach(e => {
      const st = getVerificationStatus(e)
      const rm = e.team_remark || e.form_data?.team_remark
      if (rm === 'Sent to Brand') sentToBrand++
      if (e.status === 'Approved' && st === 'Approved') brandDispatch++
      if (st === 'Pending') pending++
      else if (st === 'Approved') approved++
      else if (st === 'Rejected') rejected++
      else notSubmitted++
    })

    return { total: tabScopedEntries.length, brandDispatch, pending, approved, rejected, notSubmitted, sentToBrand }
  }, [tabScopedEntries])

  // 5. Final filtered entries: tabScopedEntries narrowed by active status tab, remark filter, and search query
  const filteredEntries = useMemo(() => {
    return tabScopedEntries.filter(entry => {
      // Status filter
      const vStatus = getVerificationStatus(entry)
      if (statusFilter === 'BrandDispatch') {
        // Both Campaign Approved AND Address Verified
        if (entry.status !== 'Approved' || vStatus !== 'Approved') return false
      } else if (statusFilter === 'Pending') {
        if (vStatus !== 'Pending') return false
      } else if (statusFilter === 'Approved') {
        if (vStatus !== 'Approved') return false
      } else if (statusFilter === 'NotSubmitted') {
        if (vStatus !== 'Not Submitted') return false
      } else if (statusFilter === 'Rejected') {
        if (vStatus !== 'Rejected') return false
      }

      // Remark / Brand Status filter
      const entryRemark = entry.team_remark || entry.form_data?.team_remark || ''
      if (remarkFilter !== 'all') {
        if (remarkFilter === 'NONE') {
          if (entryRemark.trim() !== '') return false
        } else if (remarkFilter === 'Sent to Brand') {
          if (entryRemark !== 'Sent to Brand') return false
        } else {
          if (entryRemark !== remarkFilter) return false
        }
      }

      // Search query across name, handle, influencer ID, email, phone, campaign, remark, and address details
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = entry.users?.full_name?.toLowerCase().includes(q)
        const matchHandle = entry.users?.instagram_username?.toLowerCase().includes(q)
        const matchInfluencerId = entry.users?.influencer_id?.toLowerCase().includes(q)
        const matchEmail = entry.users?.email?.toLowerCase().includes(q)
        const matchPhone = String(entry.users?.mobile || '').includes(q)
        const matchCode = entry.campaigns?.campaign_code?.toLowerCase().includes(q)
        const matchBrand = entry.campaigns?.brand_name?.toLowerCase().includes(q)
        const matchRemark = (entry.team_remark || entry.form_data?.team_remark || '').toLowerCase().includes(q)
        const matchRemarkBy = (entry.team_remark_by || entry.form_data?.team_remark_by || '').toLowerCase().includes(q)
        const addr = entry.form_data?.shipping_address
        const matchRecipient = String(addr?.recipient_name || addr?.name || '').toLowerCase().includes(q)
        const matchStreet = String(addr?.address_line1 || '').toLowerCase().includes(q) || String(addr?.address_line2 || '').toLowerCase().includes(q) || String(addr?.landmark || '').toLowerCase().includes(q)
        const matchCity = addr?.city?.toLowerCase()?.includes(q) || entry.users?.city?.toLowerCase()?.includes(q)
        const matchState = addr?.state?.toLowerCase()?.includes(q) || entry.users?.state?.toLowerCase()?.includes(q)
        const matchPin = String(addr?.pincode || entry.users?.pincode || '').includes(q)
        const matchAltPhone = String(addr?.alt_mobile || '').includes(q)

        if (!matchName && !matchHandle && !matchInfluencerId && !matchEmail && !matchPhone && !matchCode && !matchBrand && !matchRecipient && !matchStreet && !matchCity && !matchState && !matchPin && !matchAltPhone && !matchRemark && !matchRemarkBy) {
          return false
        }
      }

      return true
    })
  }, [tabScopedEntries, statusFilter, remarkFilter, searchQuery])

  const hasActiveFilters = Boolean(
    searchQuery.trim() !== '' ||
    selectedCampaignId !== 'all' ||
    campaignStatusFilter !== 'all' ||
    remarkFilter !== 'all' ||
    statusFilter !== 'All'
  )

  const handleResetFilters = () => {
    setSearchQuery('')
    setSelectedCampaignId('all')
    setCampaignStatusFilter('all')
    setRemarkFilter('all')
    setStatusFilter('All')
    setSelectedIds(new Set())
  }

  // Pagination calculations
  const totalFiltered = filteredEntries.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))

  // Reset page to 1 when filters or page size change
  useEffect(() => {
    setPage(1)
  }, [selectedCampaignId, campaignStatusFilter, statusFilter, remarkFilter, searchQuery, pageSize])

  // Clamp current page within bounds if data shrinks
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const paginatedEntries = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredEntries.slice(start, start + pageSize)
  }, [filteredEntries, page, pageSize])

  const startIndex = totalFiltered === 0 ? 0 : (page - 1) * pageSize + 1
  const endIndex = Math.min(page * pageSize, totalFiltered)

  // Multi-Selection helpers
  const isAllPageSelected = paginatedEntries.length > 0 && paginatedEntries.every(e => selectedIds.has(e.id))
  
  const toggleSelectPage = () => {
    const next = new Set(selectedIds)
    if (isAllPageSelected) {
      paginatedEntries.forEach(e => next.delete(e.id))
    } else {
      paginatedEntries.forEach(e => next.add(e.id))
    }
    setSelectedIds(next)
  }

  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectAllFiltered = () => {
    const next = new Set(filteredEntries.map(e => e.id))
    setSelectedIds(next)
    toast.success(`Selected all ${filteredEntries.length} filtered creator records`)
  }

  // Single Remark Save Handler
  const handleSaveRemark = async (applicationId: string, remarkText: string | null) => {
    setActionInProgressId(applicationId)
    try {
      const res = await fetch('/api/admin/address-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: applicationId,
          action: 'update_remark',
          remark: remarkText || '',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update remark')

      toast.success(remarkText ? `Remark saved: "${remarkText}"` : 'Remark cleared')
      // Update local state immediately
      setEntries(prev => prev.map(e => {
        if (e.id === applicationId) {
          return {
            ...e,
            team_remark: remarkText,
            team_remark_by: 'You',
            team_remark_updated_at: new Date().toISOString(),
          }
        }
        return e
      }))
      setRemarkModalEntry(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update remark')
    } finally {
      setActionInProgressId(null)
    }
  }

  // Quick 1-click Toggle / Set "Sent to Brand"
  const handleQuickSetSentToBrand = async (entry: AddressEntry) => {
    const isAlreadySent = (entry.team_remark || entry.form_data?.team_remark) === 'Sent to Brand'
    const newRemark = isAlreadySent ? null : 'Sent to Brand'
    await handleSaveRemark(entry.id, newRemark)
  }

  // Batch Remark Save Handler
  const handleBatchSetRemark = async (remarkText: string | null) => {
    if (selectedIds.size === 0) {
      toast.error('No profiles selected')
      return
    }
    setBatchUpdating(true)
    const ids = Array.from(selectedIds)
    try {
      const res = await fetch('/api/admin/address-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: ids,
          action: 'batch_update_remark',
          remark: remarkText || '',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update batch remarks')

      toast.success(`Updated ${ids.length} profile(s) with: "${remarkText || 'Cleared'}"!`)
      // Update local state immediately
      setEntries(prev => prev.map(e => {
        if (selectedIds.has(e.id)) {
          return {
            ...e,
            team_remark: remarkText,
            team_remark_by: 'You',
            team_remark_updated_at: new Date().toISOString(),
          }
        }
        return e
      }))
      setSelectedIds(new Set())
      setIsBatchRemarkModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update batch remarks')
    } finally {
      setBatchUpdating(false)
    }
  }

  // Approve Address Action
  const handleApprove = async (entry: AddressEntry) => {
    setActionInProgressId(entry.id)
    try {
      const res = await fetch('/api/admin/address-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: entry.id,
          action: 'approve',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to approve address')

      toast.success(`Address verified & approved for ${entry.users?.full_name || 'Creator'}!`)
      fetchAddresses()
    } catch (err: any) {
      toast.error(err.message || 'Failed to approve address')
    } finally {
      setActionInProgressId(null)
    }
  }

  // Reject / Request Update Action
  const handleRejectSubmit = async () => {
    if (!rejectModalEntry) return
    setActionInProgressId(rejectModalEntry.id)
    try {
      const res = await fetch('/api/admin/address-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_id: rejectModalEntry.id,
          action: 'reject',
          reason: rejectionReason.trim() || 'Address incomplete or incorrect. Please update delivery address.',
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reject address')

      toast.success('Address update requested from creator')
      setRejectModalEntry(null)
      setRejectionReason('')
      fetchAddresses()
    } catch (err: any) {
      toast.error(err.message || 'Failed to reject address')
    } finally {
      setActionInProgressId(null)
    }
  }

  // Sprint 4: Export to CSV (Courier standard: Delhivery / Shiprocket / BlueDart format + Dynamic Custom Fields + Remarks)
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) {
      toast.error('No address records available to export')
      return
    }

    // Collect all dynamic custom order / courier fields across filtered entries
    const dynamicKeysSet = new Set<string>()
    filteredEntries.forEach(entry => {
      const orderDetails = entry.form_data?.order_details
      if (orderDetails && typeof orderDetails === 'object') {
        Object.keys(orderDetails).forEach(k => {
          if (k && !k.startsWith('_')) dynamicKeysSet.add(k)
        })
      }
      const campFields = entry.campaigns?.order_form_fields
      if (Array.isArray(campFields)) {
        campFields.forEach((f: any) => {
          if (f?.name) dynamicKeysSet.add(f.name)
        })
      }
    })
    const dynamicKeys = Array.from(dynamicKeysSet)

    const exportRows = filteredEntries.map((entry, index) => {
      const addr = entry.form_data?.shipping_address || {}
      const fallbackUser = entry.users || {}
      const recipient = addr.recipient_name || addr.name || fallbackUser.full_name || 'Creator'
      const phone = addr.mobile || fallbackUser.mobile || ''
      const altPhone = addr.alt_mobile || ''
      const line1 = addr.address_line1 || ''
      const line2 = addr.address_line2 || ''
      const landmark = addr.landmark ? `Near ${addr.landmark}` : ''
      const city = addr.city || fallbackUser.city || ''
      const state = addr.state || fallbackUser.state || ''
      const pincode = addr.pincode || fallbackUser.pincode || ''
      const remarks = addr.delivery_remarks || addr.delivery_notes || ''

      const fullStreet = [line1, line2, landmark].filter(Boolean).join(', ')
      const remarkVal = entry.team_remark || entry.form_data?.team_remark || ''
      const isSentToBrand = remarkVal === 'Sent to Brand'

      const baseRow: Record<string, any> = {
        'Sr. No': index + 1,
        'Application ID': entry.id,
        'Brand Name': entry.campaigns?.brand_name || '',
        'Campaign Code': entry.campaigns?.campaign_code || '',
        'Barter Deliverables': entry.campaigns?.deliverables || '',
        'Campaign Selection Status': entry.status || 'Applied',
        'Creator Name': fallbackUser.full_name || '',
        'Influencer ID': fallbackUser.influencer_id || '',
        'Instagram Handle': fallbackUser.instagram_username ? `@${fallbackUser.instagram_username}` : '',
        'Followers': fallbackUser.followers || 0,
        'Recipient Name': recipient,
        'Contact Mobile': phone,
        'Alternate Phone': altPhone,
        'Delivery Address': fullStreet,
        'City': city,
        'State': state,
        'Pincode': pincode,
        'Delivery Remarks': remarks,
        'Address Verification Status': getVerificationStatus(entry),
        'Verified Date': entry.address_verified_at ? new Date(entry.address_verified_at).toLocaleDateString('en-IN') : 'N/A',
        'Ready for Brand Dispatch': (entry.status === 'Approved' && getVerificationStatus(entry) === 'Approved') ? 'YES' : 'NO',
        'Brand Shared Status': isSentToBrand ? 'Sent to Brand' : (remarkVal ? remarkVal : 'Pending Share'),
        'Dispatch Remark': remarkVal || 'N/A',
        'Remark Updated By': entry.team_remark_by || entry.form_data?.team_remark_by || 'N/A',
        'Remark Updated Date': entry.team_remark_updated_at ? new Date(entry.team_remark_updated_at).toLocaleDateString('en-IN') : 'N/A'
      }

      // Append dynamic custom order / courier specifications as separate columns
      const orderDetails = entry.form_data?.order_details || {}
      dynamicKeys.forEach(key => {
        const val = orderDetails[key]
        baseRow[key] = val !== undefined && val !== null ? String(val) : 'N/A'
      })

      return baseRow
    })

    const csv = Papa.unparse(exportRows)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().slice(0, 10)
    const isBrandApprovedOnly = statusFilter === 'BrandDispatch' || (statusFilter === 'Approved' && campaignStatusFilter === 'Approved')
    const activeCamp = entries.find(e => e.campaigns?.id === selectedCampaignId)?.campaigns
    const campPrefix = activeCamp ? `${activeCamp.brand_name.replace(/\s+/g, '_')}` : 'All_Brands'
    const fileName = isBrandApprovedOnly
      ? `Brand_Dispatch_FINAL_APPROVED_${campPrefix}_${timestamp}.csv`
      : `Courier_Dispatch_Addresses_${campPrefix}_${timestamp}.csv`

    link.href = url
    link.setAttribute('download', fileName)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(`Exported ${exportRows.length} ${isBrandApprovedOnly ? 'Final Brand Approved' : 'courier dispatch'} records!`)
  }

  return (
    <div className="space-y-6 pb-20">
      <SetAdminHeader>
        <div className="flex items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Address Confirmation Desk</h1>
            <p className="text-xs text-slate-400">
              Verify creator shipping addresses and generate courier dispatch sheets for brands
            </p>
          </div>
        </div>
      </SetAdminHeader>

      {/* KPI Cards Strip: 5 Responsive Cards with Scoped Campaign Logistics Health */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Tracked */}
        <div 
          onClick={() => setStatusFilter('All')}
          className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-lg cursor-pointer hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Tracked</span>
            <Package className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : kpiMetrics.total}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {selectedCampaignId !== 'all' ? 'Campaign applications' : 'Barter applications'}
          </p>
        </div>

        {/* Ready for Brand Dispatch (Both Campaign Approved AND Address Verified) */}
        <div 
          onClick={() => setStatusFilter('BrandDispatch')}
          className={`rounded-2xl border p-4 backdrop-blur-lg cursor-pointer transition-all group ${
            statusFilter === 'BrandDispatch'
              ? 'border-emerald-400/60 bg-emerald-500/20 shadow-lg shadow-emerald-500/20'
              : 'border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-300 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider flex items-center gap-1 text-emerald-300">
              <Truck className="h-3.5 w-3.5 text-emerald-400" />
              Final Brand Dispatch
            </span>
            <Sparkles className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <p className="text-2xl font-black text-emerald-300">
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : kpiMetrics.brandDispatch}
          </p>
          <p className="text-[11px] text-emerald-300/80 mt-1 font-semibold">Campaign + Address Approved</p>
        </div>

        {/* Address Verified */}
        <div 
          onClick={() => setStatusFilter('Approved')}
          className={`rounded-2xl border p-4 backdrop-blur-lg cursor-pointer transition-colors ${
            statusFilter === 'Approved'
              ? 'border-teal-400/60 bg-teal-500/20'
              : 'border-teal-500/20 bg-teal-500/5 hover:bg-teal-500/10'
          }`}
        >
          <div className="flex items-center justify-between text-teal-300 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Address Verified</span>
            <CheckCircle2 className="h-4 w-4 text-teal-400" />
          </div>
          <p className="text-2xl font-bold text-teal-300">
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : kpiMetrics.approved}
          </p>
          <p className="text-[11px] text-teal-300/70 mt-1">Valid shipping addresses</p>
        </div>

        {/* Pending Review */}
        <div 
          onClick={() => setStatusFilter('Pending')}
          className={`rounded-2xl border p-4 backdrop-blur-lg cursor-pointer transition-colors ${
            statusFilter === 'Pending'
              ? 'border-amber-400/60 bg-amber-500/20'
              : 'border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10'
          }`}
        >
          <div className="flex items-center justify-between text-amber-300 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-300">
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : kpiMetrics.pending}
          </p>
          <p className="text-[11px] text-amber-300/70 mt-1">Needs verification</p>
        </div>

        {/* Missing / Not Submitted */}
        <div 
          onClick={() => setStatusFilter('NotSubmitted')}
          className={`rounded-2xl border p-4 backdrop-blur-lg cursor-pointer transition-colors ${
            statusFilter === 'NotSubmitted'
              ? 'border-slate-500 bg-slate-800/60'
              : 'border-slate-700/50 bg-slate-900/40 hover:bg-slate-800/40'
          }`}
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Not Submitted</span>
            <AlertCircle className="h-4 w-4 text-slate-400" />
          </div>
          <p className="text-2xl font-bold text-slate-300">
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : kpiMetrics.notSubmitted}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Missing creator address</p>
        </div>
      </div>

      {/* Control Bar: Search, Campaign Filter, Status Filter & Export Button */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-lg space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input with Clear Button */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by creator name, @handle, ID (HY18691), phone, street, city, pin..."
              className="pl-10 pr-9 h-10 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 text-xs rounded-xl focus-visible:ring-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 rounded-md transition-colors"
                title="Clear search query"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Campaign Select */}
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-950/60 border border-white/10 text-xs font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Campaigns ({campaignOptions.length})</option>
              {campaignOptions.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>

            {/* Campaign Selection Status Dropdown Filter */}
            <select
              value={campaignStatusFilter}
              onChange={(e) => setCampaignStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-950/60 border border-white/10 text-xs font-medium text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Campaign: All Statuses</option>
              <option value="Approved">Campaign: Approved Only</option>
              <option value="Applied">Campaign: Applied Only</option>
              <option value="Under Process">Campaign: Under Process</option>
              <option value="Rejected">Campaign: Rejected Only</option>
            </select>

            {/* Dispatch Remark / Brand Status Dropdown Filter */}
            <select
              value={remarkFilter}
              onChange={(e) => setRemarkFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-slate-950/60 border border-white/10 text-xs font-semibold text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">Remarks: All</option>
              <option value="Sent to Brand">🚀 Sent to Brand ({tabCounts.sentToBrand})</option>
              <option value="Pending Brand Share">⏳ Pending Brand Share</option>
              <option value="Courier Dispatched">📦 Courier Dispatched</option>
              <option value="Delivered to Creator">✅ Delivered to Creator</option>
              <option value="Address Incomplete / Invalid">⚠️ Address Incomplete</option>
              <option value="Creator Unresponsive">📵 Creator Unresponsive</option>
              <option value="Hold by Brand">⏸️ Hold by Brand</option>
              <option value="NONE">⚪ No Remark Added</option>
            </select>

            {/* Reset Filters Shortcut */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-10 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-xl flex items-center gap-1.5 transition-colors"
                title="Reset all search and filter dropdowns"
              >
                <X className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset Filters</span>
              </Button>
            )}

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAddresses(false)}
              disabled={loading}
              className="h-10 px-3 bg-slate-950/60 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl text-xs cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {/* Smart CSV / Excel Offline Importer */}
            <Button
              onClick={() => setIsImportModalOpen(true)}
              variant="outline"
              className="h-10 px-3.5 bg-slate-950/60 border-emerald-500/30 text-emerald-300 hover:text-emerald-200 hover:bg-emerald-500/10 rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Upload className="h-4 w-4 text-emerald-400" />
              <span>Import Addresses</span>
            </Button>

            {/* Courier Dispatch Exporter */}
            <Button
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              className={`h-10 px-4 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer ml-auto lg:ml-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                statusFilter === 'BrandDispatch'
                  ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/25 ring-2 ring-emerald-400/40'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
              }`}
            >
              {statusFilter === 'BrandDispatch' ? (
                <>
                  <Truck className="h-4 w-4" />
                  Export Brand Dispatch Sheet ({filteredEntries.length})
                </>
              ) : (
                <>
                  <FileSpreadsheet className="h-4 w-4" />
                  Export Courier Sheet ({filteredEntries.length})
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Status Filter Tabs - Scrollbar Suppressed for Desktop */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5 overflow-x-auto scrollbar-none [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {[
            { id: 'All', label: 'All Submissions', count: tabCounts.total },
            { id: 'BrandDispatch', label: 'Final Brand Dispatch', count: tabCounts.brandDispatch, isPrimary: true, icon: Truck },
            { id: 'Approved', label: 'Address Verified', count: tabCounts.approved },
            { id: 'Pending', label: 'Pending Review', count: tabCounts.pending },
            { id: 'NotSubmitted', label: 'Not Submitted', count: tabCounts.notSubmitted },
            { id: 'Rejected', label: 'Changes Requested', count: tabCounts.rejected },
          ].map(tab => {
            const isActive = statusFilter === tab.id
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                  isActive
                    ? tab.isPrimary
                      ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 shadow-sm shadow-emerald-500/20'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-slate-950/40 text-slate-400 hover:text-slate-200 border border-white/5'
                }`}
              >
                {TabIcon && <TabIcon className="h-3.5 w-3.5 text-emerald-400" />}
                {tab.label}
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-white/10 text-slate-400'}`}>
                  {loading ? <span className="inline-block w-4 h-2 rounded bg-white/20 shimmer align-middle" /> : tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Address Table */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 overflow-hidden backdrop-blur-lg">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-white/5 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10"></th>
                  <th className="py-3 px-4">Creator Profile</th>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4 min-w-[280px]">Delivery Address</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 min-w-[190px]">Brand Dispatch & Remarks</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <AddressSkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-center px-4">
            <MapPin className="h-10 w-10 text-slate-600" />
            <p className="text-sm font-bold text-slate-300">No address records found</p>
            <p className="text-xs text-slate-500 max-w-md">
              {searchQuery
                ? `No address records match "${searchQuery}" under the current filters.`
                : 'No creator address records match the selected campaign and status filters.'}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="mt-2 h-8 px-3 text-xs bg-slate-800/80 border-white/10 text-slate-200 hover:text-white hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
                Reset All Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            {paginatedEntries.some(e => selectedIds.has(e.id)) && selectedIds.size < filteredEntries.length && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between">
                <span>
                  <span className="font-bold">{selectedIds.size}</span> profile(s) selected on this page.
                </span>
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="font-bold underline hover:text-emerald-200 cursor-pointer"
                >
                  Select all {filteredEntries.length} records matching current filters
                </button>
              </div>
            )}
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-white/5 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 w-10">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={toggleSelectPage}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 cursor-pointer accent-emerald-500"
                      title={isAllPageSelected ? 'Deselect all on this page' : 'Select all on this page'}
                    />
                  </th>
                  <th className="py-3 px-4">Creator Profile</th>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4 min-w-[280px]">Delivery Address</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 min-w-[190px]">Brand Dispatch & Remarks</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedEntries.map((entry) => {
                  const vStatus = getVerificationStatus(entry)
                  const addr = entry.form_data?.shipping_address || {}
                  const hasSubmittedAddress = Boolean(entry.form_data?.address_confirmed || hasValidShippingAddress(addr))
                  const isProcessing = actionInProgressId === entry.id

                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Checkbox */}
                      <td className="py-3.5 px-3 align-top w-10">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleSelectRow(entry.id)}
                          className="h-4 w-4 rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-slate-950 cursor-pointer accent-emerald-500 mt-1"
                        />
                      </td>

                      {/* Creator Profile */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="flex items-start gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                            {entry.users?.profile_photo || entry.users?.instagram_profile_pic ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={entry.users?.profile_photo || entry.users?.instagram_profile_pic}
                                alt={entry.users?.full_name || 'Creator'}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (entry.users?.full_name || 'C').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs">{entry.users?.full_name || 'Unnamed'}</p>
                            <p className="text-[11px] text-slate-400 font-mono">{entry.users?.influencer_id || 'ID N/A'}</p>
                            {entry.users?.instagram_username && (
                              <a
                                href={getInstagramUrl(entry.users.instagram_username)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-semibold text-[#f50057] hover:underline flex items-center gap-1 mt-0.5"
                              >
                                <Instagram className="h-3 w-3" />
                                {getInstagramDisplayHandle(entry.users.instagram_username)}
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Campaign */}
                      <td className="py-3.5 px-4 align-top">
                        <span className="font-bold text-white block text-xs">{entry.campaigns?.brand_name || 'Brand'}</span>
                        <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 inline-block mt-0.5">
                          {entry.campaigns?.campaign_code}
                        </span>
                        {entry.campaigns?.deliverables && (
                          <p className="text-[11px] text-slate-400 mt-1 line-clamp-1" title={entry.campaigns.deliverables}>
                            {entry.campaigns.deliverables}
                          </p>
                        )}
                      </td>

                      {/* Delivery Address */}
                      <td className="py-3.5 px-4 align-top">
                        {hasSubmittedAddress ? (
                          <div className="space-y-1">
                            <p className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              {addr.recipient_name || addr.name || entry.users?.full_name}
                              {addr.title && (
                                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-white/10">
                                  {addr.title}
                                </span>
                              )}
                            </p>
                            <p className="text-xs text-slate-300 leading-snug">
                              {addr.address_line1} {addr.address_line2 ? `, ${addr.address_line2}` : ''}
                            </p>
                            {addr.landmark && (
                              <p className="text-[11px] text-slate-400">Landmark: {addr.landmark}</p>
                            )}
                            <p className="text-xs font-bold text-emerald-300">
                              {addr.city}, {addr.state} — <span className="font-mono">{addr.pincode}</span>
                            </p>
                            {addr.delivery_remarks && (
                              <p className="text-[11px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 mt-1">
                                Note: {addr.delivery_remarks}
                              </p>
                            )}
                            {/* Dynamic Custom Courier / Product Details */}
                            {entry.form_data?.order_details && Object.keys(entry.form_data.order_details).length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2 pt-1.5 border-t border-white/5">
                                {Object.entries(entry.form_data.order_details).map(([k, v]) => (
                                  <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                                    <span className="font-semibold text-slate-300">{k}:</span> {String(v)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-500 italic text-xs flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 text-slate-500" />
                            Address not submitted yet
                          </div>
                        )}
                      </td>

                      {/* Contact Phone */}
                      <td className="py-3.5 px-4 align-top font-mono text-xs">
                        <p className="text-slate-200 font-bold flex items-center gap-1.5">
                          <Phone className="h-3 w-3 text-emerald-400" />
                          {addr.mobile || entry.users?.mobile || 'N/A'}
                        </p>
                        {addr.alt_mobile && (
                          <p className="text-[11px] text-slate-400 mt-0.5">Alt: {addr.alt_mobile}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="space-y-1.5">
                          {/* Campaign Application Status */}
                          <div>
                            {entry.status === 'Approved' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                <Sparkles className="h-2.5 w-2.5 text-indigo-400" />
                                Campaign: Approved
                              </span>
                            ) : entry.status === 'Applied' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/25">
                                Campaign: Applied
                              </span>
                            ) : entry.status === 'Rejected' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/25">
                                Campaign: Rejected
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-white/10">
                                Campaign: {entry.status || 'Applied'}
                              </span>
                            )}
                          </div>

                          {/* Address Verification Status */}
                          <div>
                            {vStatus === 'Approved' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                                Address: Verified
                              </span>
                            ) : vStatus === 'Rejected' ? (
                              <div>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  <XCircle className="h-3 w-3 text-rose-400" />
                                  Address: Update Req.
                                </span>
                                {entry.form_data?.address_rejection_reason && (
                                  <p className="text-[10px] text-rose-300/80 mt-1 max-w-[150px] line-clamp-2">
                                    {entry.form_data.address_rejection_reason}
                                  </p>
                                )}
                              </div>
                            ) : vStatus === 'Pending' ? (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse">
                                <Clock className="h-3 w-3 text-amber-400" />
                                Address: Pending Review
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-white/10">
                                Address: Not Submitted
                              </span>
                            )}
                          </div>

                          {/* Ready for Brand Dispatch Indicator */}
                          {entry.status === 'Approved' && vStatus === 'Approved' && (
                            <div>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                                <Truck className="h-2.5 w-2.5 text-emerald-400" />
                                Ready for Brand Dispatch
                              </span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Brand Dispatch & Remarks */}
                      <td className="py-3.5 px-4 align-top">
                        {(() => {
                          const currentRemark = entry.team_remark || entry.form_data?.team_remark || null
                          const isSentToBrand = currentRemark === 'Sent to Brand'
                          const badge = getRemarkBadge(currentRemark)
                          const BadgeIcon = badge?.icon || Tag

                          return (
                            <div className="space-y-1.5 max-w-[200px]">
                              {currentRemark ? (
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge?.bg}`}
                                      title={`Remark: ${currentRemark}`}
                                    >
                                      <BadgeIcon className="h-3 w-3 shrink-0" />
                                      <span className="truncate max-w-[130px]">{badge?.label || currentRemark}</span>
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 mt-1">
                                    {entry.team_remark_by && (
                                      <span className="text-[10px] text-slate-400 truncate max-w-[110px]" title={`By ${entry.team_remark_by}`}>
                                        By {entry.team_remark_by}
                                        {entry.team_remark_updated_at ? ` • ${new Date(entry.team_remark_updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                                      </span>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRemarkModalEntry(entry)
                                        setSelectedRemarkVal(currentRemark)
                                        setCustomRemarkNote(PREDEFINED_REMARKS.some(p => p.value === currentRemark) ? '' : currentRemark)
                                      }}
                                      className="text-[10px] font-semibold text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors cursor-pointer"
                                      title="Edit or change remark"
                                    >
                                      <Edit2 className="h-2.5 w-2.5" /> Edit
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleQuickSetSentToBrand(entry)}
                                    disabled={actionInProgressId === entry.id}
                                    className="h-6 px-2 py-0.5 text-[10px] font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                    title="Quick 1-click mark: Address sent to brand"
                                  >
                                    <CheckCheck className="h-2.5 w-2.5" />
                                    Mark Sent
                                  </Button>
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRemarkModalEntry(entry)
                                        setSelectedRemarkVal('')
                                        setCustomRemarkNote('')
                                      }}
                                      className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Tag className="h-2.5 w-2.5 text-indigo-400" /> + Add Remark
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* If remark is NOT 'Sent to Brand' but already has another remark, show 1-click 'Mark Sent' shortcut */}
                              {currentRemark && !isSentToBrand && (
                                <button
                                  type="button"
                                  onClick={() => handleQuickSetSentToBrand(entry)}
                                  className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer font-semibold pt-0.5"
                                >
                                  <CheckCheck className="h-2.5 w-2.5" /> Mark as Sent
                                </button>
                              )}
                            </div>
                          )
                        })()}
                      </td>

                      {/* Verification Action */}
                      <td className="py-3.5 px-4 align-top text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {vStatus !== 'Approved' && (
                            <Button
                              size="sm"
                              disabled={isProcessing || !hasSubmittedAddress}
                              onClick={() => handleApprove(entry)}
                              className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1 cursor-pointer disabled:opacity-40"
                              title={hasSubmittedAddress ? 'Approve address' : 'Address not submitted yet'}
                            >
                              {isProcessing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Check className="h-3.5 w-3.5" />
                              )}
                              Verify
                            </Button>
                          )}

                          {vStatus !== 'Rejected' && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isProcessing || !hasSubmittedAddress}
                              onClick={() => {
                                setRejectModalEntry(entry)
                                setRejectionReason('')
                              }}
                              className="h-8 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 font-bold text-xs rounded-lg cursor-pointer disabled:opacity-40"
                              title="Request creator to update address"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
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

        {/* Pagination Toolbar */}
        {!loading && filteredEntries.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3.5 border-t border-white/5 bg-slate-950/40 text-xs text-slate-400">
            <div className="flex items-center gap-3">
              <span>
                Showing <span className="font-bold text-white">{totalFiltered === 0 ? '0' : `${startIndex}–${endIndex}`}</span> of{' '}
                <span className="font-bold text-white">{totalFiltered}</span>
              </span>
              <div className="h-3 w-px bg-white/10" />
              <div className="flex items-center gap-1.5">
                <span>Rows:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-slate-800 border border-white/10 text-white text-xs rounded-lg px-2 py-1 cursor-pointer focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {pageSizes.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1 mx-2">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 5) {
                    pageNum = i + 1
                  } else if (page <= 3) {
                    pageNum = i + 1
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i
                  } else {
                    pageNum = page - 2 + i
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        page === pageNum
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-500 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Reject / Request Update Modal */}
      {rejectModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <XCircle className="h-4 w-4 text-rose-400" />
                Request Address Update
              </h3>
              <button
                onClick={() => setRejectModalEntry(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div>
              <p className="text-xs text-slate-300">
                Creator: <span className="font-bold text-white">{rejectModalEntry.users?.full_name}</span>
              </p>
              <p className="text-xs text-slate-400">
                Campaign: <span className="font-semibold text-emerald-400">{rejectModalEntry.campaigns?.brand_name}</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Reason for Rejection / Instructions to Creator:
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Incomplete house number or incorrect pincode. Please update."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRejectModalEntry(null)}
                className="bg-transparent border-white/10 text-slate-300 hover:bg-slate-800 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRejectSubmit}
                disabled={actionInProgressId === rejectModalEntry.id}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs"
              >
                {actionInProgressId === rejectModalEntry.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  'Send Update Request'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Single Remark & Brand Dispatch Modal */}
      {remarkModalEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-400" />
                Dispatch Remark & Brand Status
              </h3>
              <button
                onClick={() => setRemarkModalEntry(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1">
              <p className="text-xs text-slate-300">
                Creator: <span className="font-bold text-white">{remarkModalEntry.users?.full_name}</span>{' '}
                <span className="text-[11px] text-slate-400 font-mono">({remarkModalEntry.users?.influencer_id})</span>
              </p>
              <p className="text-xs text-slate-400">
                Campaign: <span className="font-semibold text-emerald-400">{remarkModalEntry.campaigns?.brand_name}</span>{' '}
                <span className="text-[10px] font-mono text-slate-400">({remarkModalEntry.campaigns?.campaign_code})</span>
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Select Predefined Remark:</span>
                <span className="text-[10px] text-slate-500 font-normal">Click a chip below</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_REMARKS.map((p) => {
                  const isSelected = selectedRemarkVal === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setSelectedRemarkVal(p.value)
                        setCustomRemarkNote('')
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-white/10'
                      }`}
                    >
                      {p.value === 'Sent to Brand' && <CheckCheck className="h-3 w-3" />}
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Custom Remark / Courier Note (Optional):
              </label>
              <textarea
                rows={2}
                value={customRemarkNote}
                onChange={(e) => {
                  setCustomRemarkNote(e.target.value)
                  if (e.target.value.trim()) setSelectedRemarkVal('')
                }}
                placeholder="Type custom note, AWB number, or instructions..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              {remarkModalEntry.team_remark ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSaveRemark(remarkModalEntry.id, null)}
                  disabled={actionInProgressId === remarkModalEntry.id}
                  className="h-8 px-2.5 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove Remark
                </Button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRemarkModalEntry(null)}
                  className="bg-transparent border-white/10 text-slate-300 hover:bg-slate-800 text-xs rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const finalVal = customRemarkNote.trim() || selectedRemarkVal || ''
                    handleSaveRemark(remarkModalEntry.id, finalVal || null)
                  }}
                  disabled={actionInProgressId === remarkModalEntry.id || (!selectedRemarkVal && !customRemarkNote.trim())}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
                >
                  {actionInProgressId === remarkModalEntry.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    'Save Remark'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Remark Modal */}
      {isBatchRemarkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="h-4 w-4 text-emerald-400" />
                Set Remark for {selectedIds.size} Creator(s)
              </h3>
              <button
                onClick={() => setIsBatchRemarkModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Apply a standardized remark to all <span className="font-bold text-emerald-400">{selectedIds.size}</span> selected creator records:
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Predefined Remarks:</label>
              <div className="flex flex-wrap gap-1.5">
                {PREDEFINED_REMARKS.map((p) => {
                  const isSelected = batchRemarkVal === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => {
                        setBatchRemarkVal(p.value)
                        setBatchCustomNote('')
                      }}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400'
                          : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-white/10'
                      }`}
                    >
                      {p.value === 'Sent to Brand' && <CheckCheck className="h-3 w-3" />}
                      {p.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Or Custom Note (Optional):
              </label>
              <textarea
                rows={2}
                value={batchCustomNote}
                onChange={(e) => {
                  setBatchCustomNote(e.target.value)
                  if (e.target.value.trim()) setBatchRemarkVal('')
                }}
                placeholder="Type custom note for selected profiles..."
                className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBatchRemarkModalOpen(false)}
                className="bg-transparent border-white/10 text-slate-300 hover:bg-slate-800 text-xs rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={batchUpdating || (!batchRemarkVal && !batchCustomNote.trim())}
                onClick={() => {
                  const finalVal = batchCustomNote.trim() || batchRemarkVal || ''
                  handleBatchSetRemark(finalVal)
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
              >
                {batchUpdating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  `Update ${selectedIds.size} Records`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-emerald-500/40 shadow-2xl shadow-black/80 rounded-2xl px-5 py-3 flex items-center gap-3 backdrop-blur-md"
          >
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {selectedIds.size} profile{selectedIds.size > 1 ? 's' : ''} selected
            </span>
            <div className="h-4 w-px bg-white/20" />
            <Button
              size="sm"
              disabled={batchUpdating}
              onClick={() => handleBatchSetRemark('Sent to Brand')}
              className="h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {batchUpdating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Mark as "Sent to Brand"
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={batchUpdating}
              onClick={() => {
                setBatchRemarkVal('Sent to Brand')
                setBatchCustomNote('')
                setIsBatchRemarkModalOpen(true)
              }}
              className="h-8 px-3 bg-slate-800 hover:bg-slate-700 border-white/10 text-slate-200 hover:text-white font-medium text-xs rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <Tag className="h-3.5 w-3.5 text-indigo-400" />
              Set Other Remark...
            </Button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-slate-400 hover:text-white px-2 py-1 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Intelligent Address Import Modal */}
      <AddressImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={() => {
          fetchAddresses()
        }}
        initialCampaignId={selectedCampaignId !== 'all' ? selectedCampaignId : undefined}
      />
    </div>
  )
}
