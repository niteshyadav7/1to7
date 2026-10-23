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
  Upload
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useRealtime } from '@/hooks/useRealtime'
import { getInstagramUrl, getInstagramDisplayHandle } from '@/lib/instagram-utils'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import Papa from 'papaparse'
import AddressImportModal from './AddressImportModal'

interface AddressEntry {
  id: string
  status: string
  address_status: string | null
  address_verified_at: string | null
  address_verified_by: string | null
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

const pageSizes = [10, 25, 50, 100]

function AddressSkeletonRow() {
  return (
    <tr className="border-b border-white/5 animate-pulse">
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
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)

  // Rejection reason modal
  const [rejectModalEntry, setRejectModalEntry] = useState<AddressEntry | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // Smart Address Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  const fetchAddresses = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/address-confirmation?limit=5000')
      const data = await res.json()
      if (res.ok && data.addresses) {
        setEntries(data.addresses)
      } else {
        toast.error(data.error || 'Failed to fetch addresses')
      }
    } catch {
      toast.error('Failed to load address confirmation entries')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAddresses()
  }, [fetchAddresses])

  useRealtime({ table: 'applications', onChange: fetchAddresses })

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

  // Resolve status helper
  const getVerificationStatus = (entry: AddressEntry): 'Pending' | 'Approved' | 'Rejected' | 'Not Submitted' => {
    if (entry.address_status === 'Approved' || entry.form_data?.address_verified === true) {
      return 'Approved'
    }
    if (entry.address_status === 'Rejected' || entry.form_data?.address_status === 'Rejected') {
      return 'Rejected'
    }
    if (entry.address_status === 'Pending' || entry.form_data?.address_confirmed === true || entry.form_data?.shipping_address) {
      return 'Pending'
    }
    return 'Not Submitted'
  }

  // Filtered entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      // Campaign filter
      if (selectedCampaignId !== 'all' && entry.campaigns?.id !== selectedCampaignId) {
        return false
      }

      // Campaign application status filter (Approved, Applied, Rejected, etc.)
      if (campaignStatusFilter !== 'all' && entry.status !== campaignStatusFilter) {
        return false
      }

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

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = entry.users?.full_name?.toLowerCase().includes(q)
        const matchHandle = entry.users?.instagram_username?.toLowerCase().includes(q)
        const matchPhone = entry.users?.mobile?.includes(q)
        const matchCode = entry.campaigns?.campaign_code?.toLowerCase().includes(q)
        const matchBrand = entry.campaigns?.brand_name?.toLowerCase().includes(q)
        const addr = entry.form_data?.shipping_address
        const matchCity = addr?.city?.toLowerCase()?.includes(q) || entry.users?.city?.toLowerCase()?.includes(q)
        const matchState = addr?.state?.toLowerCase()?.includes(q) || entry.users?.state?.toLowerCase()?.includes(q)
        const matchPin = addr?.pincode?.includes(q) || entry.users?.pincode?.includes(q)

        if (!matchName && !matchHandle && !matchPhone && !matchCode && !matchBrand && !matchCity && !matchState && !matchPin) {
          return false
        }
      }

      return true
    })
  }, [entries, selectedCampaignId, campaignStatusFilter, statusFilter, searchQuery])

  // Summary Metrics
  const metrics = useMemo(() => {
    let brandDispatch = 0
    let pending = 0
    let approved = 0
    let rejected = 0
    let notSubmitted = 0

    entries.forEach(e => {
      const st = getVerificationStatus(e)
      if (e.status === 'Approved' && st === 'Approved') brandDispatch++
      if (st === 'Pending') pending++
      else if (st === 'Approved') approved++
      else if (st === 'Rejected') rejected++
      else notSubmitted++
    })

    return { total: entries.length, brandDispatch, pending, approved, rejected, notSubmitted }
  }, [entries])

  // Pagination calculations
  const totalFiltered = filteredEntries.length
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize))

  // Reset page to 1 when filters or page size change
  useEffect(() => {
    setPage(1)
  }, [selectedCampaignId, campaignStatusFilter, statusFilter, searchQuery, pageSize])

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

  // Sprint 4: Export to CSV (Courier standard: Delhivery / Shiprocket / BlueDart format + Dynamic Custom Fields)
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
        'Ready for Brand Dispatch': (entry.status === 'Approved' && getVerificationStatus(entry) === 'Approved') ? 'YES' : 'NO'
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

      {/* KPI Cards Strip: 5 Responsive Cards with Final Brand Dispatch Priority */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total Tracked */}
        <div 
          onClick={() => { setStatusFilter('All'); setCampaignStatusFilter('all') }}
          className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-lg cursor-pointer hover:bg-slate-800/40 transition-colors"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Tracked</span>
            <Package className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white">
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : metrics.total}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Barter applications</p>
        </div>

        {/* Ready for Brand Dispatch (Both Campaign Approved AND Address Verified) */}
        <div 
          onClick={() => { setStatusFilter('BrandDispatch'); setCampaignStatusFilter('all') }}
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
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : metrics.brandDispatch}
          </p>
          <p className="text-[11px] text-emerald-300/80 mt-1 font-semibold">Campaign + Address Approved</p>
        </div>

        {/* Address Verified */}
        <div 
          onClick={() => { setStatusFilter('Approved'); setCampaignStatusFilter('all') }}
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
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : metrics.approved}
          </p>
          <p className="text-[11px] text-teal-300/70 mt-1">Valid shipping addresses</p>
        </div>

        {/* Pending Review */}
        <div 
          onClick={() => { setStatusFilter('Pending'); setCampaignStatusFilter('all') }}
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
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : metrics.pending}
          </p>
          <p className="text-[11px] text-amber-300/70 mt-1">Needs verification</p>
        </div>

        {/* Missing / Not Submitted */}
        <div 
          onClick={() => { setStatusFilter('NotSubmitted'); setCampaignStatusFilter('all') }}
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
            {loading ? <span className="inline-block h-7 w-14 rounded-lg bg-slate-800 shimmer align-middle" /> : metrics.notSubmitted}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">Missing creator address</p>
        </div>
      </div>

      {/* Control Bar: Search, Campaign Filter, Status Filter & Export Button */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-4 backdrop-blur-lg space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by creator name, Instagram handle, phone, city, or campaign code..."
              className="pl-10 h-10 bg-slate-950/60 border-white/10 !text-white placeholder:text-slate-500 text-xs rounded-xl focus-visible:ring-emerald-500"
            />
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

            {/* Refresh */}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAddresses}
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

            {/* Sprint 4: Courier Dispatch Exporter */}
            <Button
              onClick={handleExportCSV}
              className={`h-10 px-4 font-bold text-xs rounded-xl shadow-lg flex items-center gap-2 cursor-pointer ml-auto lg:ml-0 ${
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

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5 overflow-x-auto">
          {[
            { id: 'All', label: 'All Submissions', count: entries.length },
            { id: 'BrandDispatch', label: 'Final Brand Dispatch', count: metrics.brandDispatch, isPrimary: true, icon: Truck },
            { id: 'Approved', label: 'Address Verified', count: metrics.approved },
            { id: 'Pending', label: 'Pending Review', count: metrics.pending },
            { id: 'NotSubmitted', label: 'Not Submitted', count: metrics.notSubmitted },
            { id: 'Rejected', label: 'Changes Requested', count: metrics.rejected },
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
                  <th className="py-3 px-4">Creator Profile</th>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4 min-w-[280px]">Delivery Address</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Approval & Address Status</th>
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
            <p className="text-xs text-slate-500 max-w-sm">
              {searchQuery ? 'Try adjusting your search query or campaign filter.' : 'Shortlisted creators who confirm delivery addresses will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 border-b border-white/5 text-[11px] font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Creator Profile</th>
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4 min-w-[280px]">Delivery Address</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Verification Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedEntries.map((entry) => {
                  const vStatus = getVerificationStatus(entry)
                  const addr = entry.form_data?.shipping_address || {}
                  const hasSubmittedAddress = Boolean(entry.form_data?.address_confirmed || addr.address_line1)
                  const isProcessing = actionInProgressId === entry.id

                  return (
                    <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
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
