'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Truck,
  Package,
  MapPin,
  Phone,
  CheckCircle2,
  Clock,
  Search,
  Copy,
  Download,
  RefreshCw,
  Instagram,
  Sparkles,
  LayoutGrid,
  List,
  X,
  Check,
  ExternalLink,
  AlertCircle,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { brandCache } from '@/lib/brandCache'

interface DispatchShipment {
  application_id: string
  campaign_id: string
  campaign_title: string
  campaign_code: string
  creator_id: string
  creator_name: string
  creator_code: string
  instagram_handle: string
  followers: number
  profile_city: string
  profile_state: string
  product_variant: string
  custom_fields: Record<string, string>
  recipient_name: string
  full_address: string
  landmark: string
  city: string
  state: string
  pincode: string
  primary_phone: string
  alternate_phone: string
  address_type: string
  batch_label: string
  released_at: string | null
  dispatch_status: string
  courier_name: string
  awb_number: string
  shipped_at: string | null
  shipped_by: string
  dispatch_notes: string
  visible_fields: string[]
}

export default function BrandProductDispatchPage() {
  const cachedShipments = brandCache.get<DispatchShipment[]>('brand_dispatch_shipments') || []
  const cachedBrandName = brandCache.get<any>('brand_auth_me')?.brand_name || ''

  const [shipments, setShipments] = useState<DispatchShipment[]>(cachedShipments)
  const [brandName, setBrandName] = useState<string>(cachedBrandName)
  const [dynamicFieldKeys, setDynamicFieldKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(cachedShipments.length === 0)
  const [refreshing, setRefreshing] = useState(false)

  // Filters & View State
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('table')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Mark Shipped Modal State
  const [shipModalOpen, setShipModalOpen] = useState(false)
  const [shipTargetIds, setShipTargetIds] = useState<string[]>([])
  const [courierName, setCourierName] = useState('')
  const [awbNumber, setAwbNumber] = useState('')
  const [dispatchNotes, setDispatchNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchDispatchData = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent && shipments.length === 0) setLoading(true)
      else setRefreshing(true)

      const res = await fetch('/api/brand/dispatch', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load dispatch manifest')
      const data = await res.json()

      const list: DispatchShipment[] = data.shipments || []
      setShipments(list)
      if (data.brandName) setBrandName(data.brandName)
      if (Array.isArray(data.dynamicFieldKeys)) setDynamicFieldKeys(data.dynamicFieldKeys)
      brandCache.set('brand_dispatch_shipments', list)
    } catch (err: any) {
      toast.error(err.message || 'Could not load product dispatch sheet')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [shipments.length])

  useEffect(() => {
    fetchDispatchData(cachedShipments.length > 0)
  }, [])

  // Distinct campaigns list
  const campaigns = useMemo(() => {
    const map = new Map<string, { id: string; title: string; code: string; count: number }>()
    for (const s of shipments) {
      const existing = map.get(s.campaign_id)
      if (existing) {
        existing.count += 1
      } else {
        map.set(s.campaign_id, {
          id: s.campaign_id,
          title: s.campaign_title || 'Campaign',
          code: s.campaign_code || '',
          count: 1,
        })
      }
    }
    return Array.from(map.values())
  }, [shipments])

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((s) => {
      if (selectedCampaign !== 'ALL' && s.campaign_id !== selectedCampaign) return false
      const isShipped = s.dispatch_status === 'shipped' || s.dispatch_status === 'delivered'
      if (statusFilter === 'pending' && isShipped) return false
      if (statusFilter === 'shipped' && !isShipped) return false

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const hay = `${s.creator_name} ${s.instagram_handle} ${s.recipient_name} ${s.full_address} ${s.city} ${s.state} ${s.pincode} ${s.primary_phone} ${s.product_variant} ${s.campaign_title} ${s.awb_number} ${Object.values(s.custom_fields || {}).join(' ')}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [shipments, selectedCampaign, statusFilter, searchQuery])

  // KPI summary
  const kpis = useMemo(() => {
    const base = selectedCampaign === 'ALL' ? shipments : shipments.filter((s) => s.campaign_id === selectedCampaign)
    const shipped = base.filter((s) => s.dispatch_status === 'shipped' || s.dispatch_status === 'delivered').length
    return {
      total: base.length,
      pending: base.length - shipped,
      shipped,
    }
  }, [shipments, selectedCampaign])

  const copyCourierBlock = (s: DispatchShipment) => {
    const customStr = Object.entries(s.custom_fields || {})
      .map(([k, v]) => `${k}: ${v}`)
      .join(' | ')
    const lines = [
      `Recipient: ${s.recipient_name || s.creator_name}`,
      s.instagram_handle ? `Creator: @${s.instagram_handle.replace(/^@/, '')}` : '',
      `Address: ${s.full_address}${s.landmark ? ` (Landmark: ${s.landmark})` : ''}`,
      `City/State/PIN: ${[s.city, s.state].filter(Boolean).join(', ')}${s.pincode ? ` - ${s.pincode}` : ''}`,
      `Phone: ${s.primary_phone}${s.alternate_phone ? ` / Alt: ${s.alternate_phone}` : ''}`,
      `Product / SKU: ${s.product_variant || 'Standard'}${customStr ? ` (${customStr})` : ''}`,
    ].filter(Boolean)

    navigator.clipboard.writeText(lines.join('\n'))
    toast.success(`Copied shipping label for ${s.recipient_name || s.creator_name}`)
  }

  const openMarkShippedModal = (ids: string[], existing?: DispatchShipment) => {
    setShipTargetIds(ids)
    setCourierName(existing?.courier_name || '')
    setAwbNumber(existing?.awb_number || '')
    setDispatchNotes(existing?.dispatch_notes || '')
    setShipModalOpen(true)
  }

  const handleConfirmShipped = async () => {
    if (shipTargetIds.length === 0) return
    try {
      setSubmitting(true)
      const res = await fetch('/api/brand/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_shipped',
          application_ids: shipTargetIds,
          courier_name: courierName.trim(),
          awb_number: awbNumber.trim(),
          notes: dispatchNotes.trim(),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update dispatch status')

      toast.success(
        `Marked ${shipTargetIds.length} creator shipment${shipTargetIds.length > 1 ? 's' : ''} as Shipped!`
      )
      setShipModalOpen(false)
      setSelectedIds([])
      await fetchDispatchData(true)
    } catch (err: any) {
      toast.error(err.message || 'Could not update shipment status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUndoShipped = async (applicationId: string) => {
    try {
      const res = await fetch('/api/brand/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_pending',
          application_ids: [applicationId],
        }),
      })
      if (!res.ok) throw new Error('Failed to revert status')
      toast.success('Reverted to Pending Dispatch')
      await fetchDispatchData(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to revert status')
    }
  }

  const exportCourierCSV = () => {
    if (filteredShipments.length === 0) {
      toast.error('No dispatch records to export')
      return
    }
    const headers = [
      'Creator Name',
      'Instagram Handle',
      'Campaign',
      'Product / Deliverable SKU',
      ...dynamicFieldKeys,
      'Recipient Full Name',
      'Street Address',
      'Landmark',
      'City',
      'State',
      'Pincode',
      'Primary Phone',
      'Alternate Phone',
      'Dispatch Status',
      'Courier Partner',
      'AWB / Tracking No',
      'Shipped At',
    ]

    const escapeCSV = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`

    const csvRows = [
      headers.map(escapeCSV).join(','),
      ...filteredShipments.map((s) =>
        [
          s.creator_name,
          s.instagram_handle ? `@${s.instagram_handle.replace(/^@/, '')}` : '',
          s.campaign_title,
          s.product_variant || 'Standard',
          ...dynamicFieldKeys.map((k) => s.custom_fields?.[k] || ''),
          s.recipient_name || s.creator_name,
          s.full_address,
          s.landmark,
          s.city,
          s.state,
          s.pincode,
          s.primary_phone,
          s.alternate_phone,
          s.dispatch_status === 'shipped' ? 'Shipped' : 'Pending Dispatch',
          s.courier_name,
          s.awb_number,
          s.shipped_at ? new Date(s.shipped_at).toLocaleDateString('en-IN') : '',
        ]
          .map(escapeCSV)
          .join(',')
      ),
    ]

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(brandName || 'Brand').replace(/\s+/g, '_')}_Courier_Dispatch_Sheet_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded Courier CSV (${filteredShipments.length} creators)`)
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredShipments.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(filteredShipments.map((s) => s.application_id))
    }
  }

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  return (
    <div className="space-y-4 pb-24">
      {/* ─── COMPACT HERO HEADER & REAL-TIME DISPATCH SUMMARY ─── */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[11px] font-black uppercase tracking-wider">
              <Truck className="w-3.5 h-3.5" />
              <span>Live Courier & Product Dispatch Manifest</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              {brandName ? `${brandName} — Product Dispatch Sheet` : 'Approved Creator Dispatch Sheet'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Verified shipping addresses, contact numbers, and product variants for your final approved creators. Download for your warehouse or update courier AWB status live.
            </p>
          </div>

          {/* Right KPI Pills + CSV Export */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[90px]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Approved</p>
              <p className="text-lg font-black text-white">{kpis.total}</p>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/30 text-center min-w-[95px]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300">Pending Ship</p>
              <p className="text-lg font-black text-amber-200">{kpis.pending}</p>
            </div>
            <div className="px-3.5 py-2 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-center min-w-[95px]">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300">Shipped</p>
              <p className="text-lg font-black text-emerald-200">{kpis.shipped}</p>
            </div>

            <button
              onClick={exportCourierCSV}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Courier CSV ({filteredShipments.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── FILTER & VIEW TOOLBAR ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-3 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Left: Status Pills + Campaign Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[#0F172A] text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({kpis.total})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === 'pending'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Dispatch ({kpis.pending})
            </button>
            <button
              onClick={() => setStatusFilter('shipped')}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                statusFilter === 'shipped'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ✓ Shipped ({kpis.shipped})
            </button>
          </div>

          {campaigns.length > 1 && (
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-[#F95738]"
            >
              <option value="ALL">All Campaigns ({shipments.length})</option>
              {campaigns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} ({c.count})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Right: Search + View Mode + Refresh */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, city, pincode, phone, SKU..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738]"
            />
          </div>

          <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200">
            <button
              onClick={() => setViewMode('table')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sheet</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer ${
                viewMode === 'cards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
          </div>

          <button
            onClick={() => fetchDispatchData(true)}
            disabled={refreshing}
            title="Refresh live manifest"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ─── EMPTY STATE ─── */}
      {!loading && filteredShipments.length === 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="text-base font-black text-slate-900">No Dispatch Manifest Records Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once creators are Final Approved and their shipping addresses are verified by your Account Manager, their live courier manifest will appear here automatically.
          </p>
        </div>
      )}

      {/* ─── DESKTOP SPREADSHEET TABLE VIEW ─── */}
      {filteredShipments.length > 0 && viewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] font-extrabold uppercase tracking-wider">
                  <th className="py-3 px-3 w-9 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredShipments.length && filteredShipments.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-600 cursor-pointer"
                    />
                  </th>
                  <th className="py-3 px-3 min-w-[165px]">Creator & Campaign</th>
                  <th className="py-3 px-3 min-w-[150px]">Product / Variant / Details</th>
                  <th className="py-3 px-3 min-w-[260px]">Verified Delivery Address</th>
                  <th className="py-3 px-3 min-w-[140px]">City, State & PIN</th>
                  <th className="py-3 px-3 min-w-[125px]">Contact Phone</th>
                  <th className="py-3 px-3 min-w-[145px]">Dispatch & AWB</th>
                  <th className="py-3 px-3 text-right min-w-[155px]">Warehouse Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {filteredShipments.map((s) => {
                  const isShipped = s.dispatch_status === 'shipped' || s.dispatch_status === 'delivered'
                  const isSelected = selectedIds.includes(s.application_id)
                  const customEntries = Object.entries(s.custom_fields || {}).filter(([, v]) => Boolean(v))

                  return (
                    <tr
                      key={s.application_id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-orange-50/70'
                          : isShipped
                            ? 'bg-emerald-50/30 hover:bg-emerald-50/50'
                            : 'hover:bg-slate-50/90'
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center align-top pt-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(s.application_id)}
                          className="rounded border-slate-300 cursor-pointer"
                        />
                      </td>

                      {/* Creator & Campaign */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-extrabold text-slate-900 text-xs leading-snug truncate max-w-[180px]" title={s.creator_name}>
                          {s.creator_name}
                        </div>
                        {s.instagram_handle && (
                          <a
                            href={`https://instagram.com/${s.instagram_handle.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:underline"
                          >
                            @{s.instagram_handle.replace(/^@/, '')}
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        <div className="mt-1 flex items-center gap-1 flex-wrap">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-bold text-[10px] truncate max-w-[150px]" title={s.campaign_title}>
                            {s.campaign_title}
                          </span>
                        </div>
                      </td>

                      {/* Product / Variant / Custom Form Fields */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-[11px]">
                          <Package className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="truncate max-w-[150px]" title={s.product_variant || 'Standard'}>
                            {s.product_variant || 'Standard'}
                          </span>
                        </div>
                        {customEntries.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {customEntries.map(([k, v]) => (
                              <span
                                key={k}
                                className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold"
                                title={`${k}: ${v}`}
                              >
                                <span className="text-amber-600">{k}:</span> {v}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Verified Delivery Address */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-slate-900 text-xs">
                            {s.recipient_name || s.creator_name}
                          </span>
                          {s.address_type && (
                            <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[9px] font-bold uppercase">
                              {s.address_type}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-700 leading-snug mt-0.5 break-words max-w-[290px]">
                          {s.full_address || '—'}
                        </p>
                        {s.landmark && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            <span className="font-semibold">Landmark:</span> {s.landmark}
                          </p>
                        )}
                      </td>

                      {/* City, State & PIN */}
                      <td className="py-2.5 px-3 align-top">
                        <div className="font-bold text-slate-800 text-[11px]">
                          {[s.city, s.state].filter(Boolean).join(', ') || '—'}
                        </div>
                        {s.pincode && (
                          <span className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[11px]">
                            PIN: {s.pincode}
                          </span>
                        )}
                      </td>

                      {/* Contact Phone */}
                      <td className="py-2.5 px-3 align-top">
                        {s.primary_phone ? (
                          <div className="space-y-0.5">
                            <div className="inline-flex items-center gap-1 font-extrabold text-slate-900 text-xs">
                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span>{s.primary_phone}</span>
                            </div>
                            {s.alternate_phone && (
                              <div className="text-[10px] text-slate-500 font-semibold">
                                Alt: {s.alternate_phone}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Dispatch Status & AWB */}
                      <td className="py-2.5 px-3 align-top">
                        {isShipped ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-900 font-black text-[10px]">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Shipped</span>
                            </span>
                            {(s.courier_name || s.awb_number) && (
                              <div className="text-[10px] font-bold text-slate-700 leading-tight">
                                {s.courier_name && <span className="text-slate-900">{s.courier_name}</span>}
                                {s.awb_number && (
                                  <span className="block font-mono text-indigo-700">AWB: {s.awb_number}</span>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 font-extrabold text-[10px]">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Pending Dispatch</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => copyCourierBlock(s)}
                            title="Copy Full Courier Label"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          {isShipped ? (
                            <>
                              <button
                                onClick={() => openMarkShippedModal([s.application_id], s)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 cursor-pointer"
                              >
                                Edit AWB
                              </button>
                              <button
                                onClick={() => handleUndoShipped(s.application_id)}
                                title="Revert to Pending"
                                className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => openMarkShippedModal([s.application_id], s)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                            >
                              <Check className="w-3 h-3" />
                              <span>Mark Shipped</span>
                            </button>
                          )}
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

      {/* ─── MOBILE / CARD GRID VIEW ─── */}
      {filteredShipments.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredShipments.map((s) => {
            const isShipped = s.dispatch_status === 'shipped' || s.dispatch_status === 'delivered'
            const customEntries = Object.entries(s.custom_fields || {}).filter(([, v]) => Boolean(v))

            return (
              <div
                key={s.application_id}
                className={`rounded-2xl bg-white border p-4 shadow-xs flex flex-col justify-between gap-3 ${
                  isShipped ? 'border-emerald-300 bg-emerald-50/20' : 'border-slate-200'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Row */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-black text-slate-900 text-sm">{s.creator_name}</h3>
                      {s.instagram_handle && (
                        <a
                          href={`https://instagram.com/${s.instagram_handle.replace(/^@/, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-bold text-pink-600 hover:underline"
                        >
                          @{s.instagram_handle.replace(/^@/, '')}
                        </a>
                      )}
                    </div>
                    {isShipped ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 font-black text-[10px] border border-emerald-300">
                        ✓ Shipped
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-extrabold text-[10px] border border-amber-300">
                        Pending Dispatch
                      </span>
                    )}
                  </div>

                  {/* Product & Custom Fields */}
                  <div className="flex flex-wrap gap-1.5">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-[11px]">
                      SKU: {s.product_variant || 'Standard'}
                    </span>
                    {customEntries.map(([k, v]) => (
                      <span
                        key={k}
                        className="px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900 font-bold text-[10px]"
                      >
                        {k}: {v}
                      </span>
                    ))}
                  </div>

                  {/* Shipping Box */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs">
                    <div className="font-extrabold text-slate-900 flex items-center justify-between">
                      <span>{s.recipient_name || s.creator_name}</span>
                      {s.pincode && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 font-black text-[10px]">
                          PIN: {s.pincode}
                        </span>
                      )}
                    </div>
                    <p className="text-slate-700 text-[11px] leading-relaxed">{s.full_address}</p>
                    {s.landmark && <p className="text-[10px] text-slate-500">Landmark: {s.landmark}</p>}
                    <p className="text-[11px] font-bold text-slate-800">
                      {[s.city, s.state].filter(Boolean).join(', ')}
                    </p>
                    {s.primary_phone && (
                      <p className="text-[11px] font-extrabold text-emerald-700 pt-1">
                        📞 {s.primary_phone} {s.alternate_phone ? `/ ${s.alternate_phone}` : ''}
                      </p>
                    )}
                  </div>

                  {(s.courier_name || s.awb_number) && (
                    <div className="px-3 py-1.5 rounded-xl bg-indigo-50/70 border border-indigo-200 text-[11px] font-bold text-indigo-950">
                      Courier: {s.courier_name || 'Dispatched'} {s.awb_number ? `• AWB: ${s.awb_number}` : ''}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => copyCourierBlock(s)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Address</span>
                  </button>
                  <button
                    onClick={() => openMarkShippedModal([s.application_id], s)}
                    className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                      isShipped
                        ? 'bg-slate-900 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>{isShipped ? 'Update AWB' : '✓ Mark Shipped'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── FLOATING BULK ACTION BAR ─── */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 bg-[#0F172A] text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/15 flex items-center gap-4">
          <span className="text-xs font-extrabold">
            <strong className="text-emerald-400">{selectedIds.length}</strong> Creator{selectedIds.length > 1 ? 's' : ''} Selected
          </span>
          <button
            onClick={() => openMarkShippedModal(selectedIds)}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Mark Selected Shipped ({selectedIds.length})</span>
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-xs text-slate-400 hover:text-white font-bold cursor-pointer"
          >
            Clear
          </button>
        </div>
      )}

      {/* ─── MARK SHIPPED / AWB MODAL ─── */}
      {shipModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    Confirm Product Dispatch ({shipTargetIds.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Syncs live with your 1to7 Account Manager & Creator Ops
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShipModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  Courier Partner (Optional)
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g., Delhivery, BlueDart, Shiprocket, DTDC"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  AWB / Tracking Number (Optional)
                </label>
                <input
                  type="text"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  placeholder="Enter tracking number or leave blank"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-mono font-semibold text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-600 mb-1">
                  Warehouse Dispatch Note (Optional)
                </label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g., Dispatched from Mumbai warehouse"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShipModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShipped}
                disabled={submitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Updating...' : 'Confirm Shipped'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
