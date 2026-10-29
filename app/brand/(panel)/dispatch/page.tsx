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
  List,
  X,
  Check,
  ExternalLink,
  AlertCircle,
  Hash,
} from 'lucide-react'
import { toast } from 'sonner'
import { brandCache } from '@/lib/brand-cache'
import { useBrandSearch } from '@/components/brand/BrandSearchContext'
import { DynamicDataTable, ColumnDef } from '@/components/brand/DynamicDataTable'

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
  const cachedBrandName = brandCache.get<any>('brand_user')?.brand_name || ''

  const [shipments, setShipments] = useState<DispatchShipment[]>(cachedShipments)
  const [brandName, setBrandName] = useState<string>(cachedBrandName)
  const [dynamicFieldKeys, setDynamicFieldKeys] = useState<string[]>([])
  const [loading, setLoading] = useState(cachedShipments.length === 0)
  const [refreshing, setRefreshing] = useState(false)

  // Filters & View State
  const [selectedCampaign, setSelectedCampaign] = useState<string>('ALL')
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'shipped'>('all')
  const { searchQuery, setSearchQuery, setPlaceholder } = useBrandSearch()

  useEffect(() => {
    setPlaceholder('Search name, city, pincode, phone, SKU...')
  }, [setPlaceholder])

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

  const columns: ColumnDef<DispatchShipment>[] = useMemo(() => {
    return [
      {
        key: 'creator_name',
        header: 'Creator & Campaign',
        sortable: true,
        width: '20%',
        minWidth: '160px',
        accessor: (row) => `${row.creator_name} ${row.campaign_title}`,
        render: (s) => (
          <div className="space-y-0.5">
            <div className="font-extrabold text-slate-900 text-xs leading-snug truncate max-w-[180px]" title={s.creator_name}>
              {s.creator_name}
            </div>
            {s.instagram_handle && (
              <a
                href={`https://instagram.com/${s.instagram_handle.replace(/^@/, '')}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:underline"
              >
                @{s.instagram_handle.replace(/^@/, '')}
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            )}
            <div className="mt-0.5 flex items-center gap-1 flex-wrap">
              <span className="px-1.5 py-0.2 rounded-none bg-slate-100 text-slate-700 font-bold text-[10px] truncate max-w-[150px]" title={s.campaign_title}>
                {s.campaign_title}
              </span>
            </div>
          </div>
        ),
      },
      {
        key: 'product_variant',
        header: 'Product / SKU',
        sortable: true,
        width: '16%',
        minWidth: '130px',
        accessor: (row) => row.product_variant || 'Standard',
        render: (s) => {
          const customEntries = Object.entries(s.custom_fields || {}).filter(([, v]) => Boolean(v))
          return (
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-indigo-50 border border-indigo-200 text-indigo-900 font-bold text-[11px]">
                <Package className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="truncate max-w-[150px]" title={s.product_variant || 'Standard'}>
                  {s.product_variant || 'Standard'}
                </span>
              </div>
              {customEntries.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {customEntries.map(([k, v]) => (
                    <span
                      key={k}
                      className="px-1.5 py-0.2 rounded-none bg-amber-50 border border-amber-200 text-amber-900 text-[10px] font-bold"
                      title={`${k}: ${v}`}
                    >
                      <span className="text-amber-600">{k}:</span> {v}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        },
      },
      {
        key: 'full_address',
        header: 'Delivery Address',
        sortable: false,
        width: '26%',
        minWidth: '200px',
        accessor: (row) => `${row.recipient_name} ${row.full_address}`,
        render: (s) => (
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 text-xs">
                {s.recipient_name || s.creator_name}
              </span>
              {s.address_type && (
                <span className="px-1.5 py-0.2 rounded-none bg-slate-100 text-slate-600 text-[9px] font-bold uppercase">
                  {s.address_type}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-700 leading-snug break-words max-w-[290px]">
              {s.full_address || '—'}
            </p>
            {s.landmark && (
              <p className="text-[10px] text-slate-500">
                <span className="font-semibold">Landmark:</span> {s.landmark}
              </p>
            )}
          </div>
        ),
      },
      {
        key: 'city',
        header: 'City, State & PIN',
        sortable: true,
        width: '14%',
        minWidth: '110px',
        accessor: (row) => `${row.city} ${row.state} ${row.pincode}`,
        render: (s) => (
          <div className="space-y-1">
            <div className="font-bold text-slate-800 text-[11px]">
              {[s.city, s.state].filter(Boolean).join(', ') || '—'}
            </div>
            {s.pincode && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-none bg-emerald-50 border border-emerald-200 text-emerald-800 font-black text-[11px]">
                PIN: {s.pincode}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'primary_phone',
        header: 'Contact Phone',
        sortable: true,
        width: '12%',
        minWidth: '105px',
        accessor: (row) => row.primary_phone || '',
        render: (s) =>
          s.primary_phone ? (
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
          ),
      },
      {
        key: 'dispatch_status',
        header: 'Dispatch & AWB',
        sortable: true,
        width: '12%',
        minWidth: '110px',
        accessor: (row) => row.dispatch_status,
        render: (s) => {
          const isShipped = s.dispatch_status === 'shipped' || s.dispatch_status === 'delivered'
          return isShipped ? (
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
          )
        },
      },
      {
        key: 'actions',
        header: 'Warehouse Action',
        align: 'right',
        sortable: false,
        width: '140px',
        minWidth: '130px',
        render: (s) => {
          const isShipped = s.dispatch_status === 'shipped' || s.dispatch_status === 'delivered'
          return (
            <div className="inline-flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={() => copyCourierBlock(s)}
                title="Copy Full Courier Label"
                className="p-1.5 rounded-none bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {isShipped ? (
                <>
                  <button
                    type="button"
                    onClick={() => openMarkShippedModal([s.application_id], s)}
                    className="px-2 py-1 rounded-none bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-200 cursor-pointer"
                  >
                    Edit AWB
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUndoShipped(s.application_id)}
                    title="Revert to Pending"
                    className="p-1.5 rounded-none bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => openMarkShippedModal([s.application_id], s)}
                  className="px-2.5 py-1 rounded-none bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                >
                  <Check className="w-3 h-3" />
                  <span>Mark Shipped</span>
                </button>
              )}
            </div>
          )
        },
      },
    ]
  }, [])

  return (
    <div
      className="space-y-3 pb-24 font-sans text-slate-900"
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Active Search Filter Banner (If search entered in Header) */}
      {searchQuery && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Searching for &ldquo;<strong>{searchQuery}</strong>&rdquo; • {filteredShipments.length} shipment{filteredShipments.length === 1 ? '' : 's'} found
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
          >
            Clear Filter
          </button>
        </div>
      )}

      {/* ─── 2. GENTELELLA ZERO-GRID HIGH-DENSITY DISPATCH TABLE ─── */}
      <DynamicDataTable<DispatchShipment>
        theme="light"
        keyField="application_id"
        tableLayout="fixed"
        minTableWidth="min-w-[900px]"
        hideSearch={true}
        loading={loading}
        data={filteredShipments}
        columns={columns}
        exportFilename={`${(brandName || 'Brand').replace(/\s+/g, '_')}_Courier_Dispatch_Sheet_${new Date().toISOString().slice(0, 10)}.csv`}
        emptyMessage="No dispatch manifest records found. Once creators are Final Approved and their shipping addresses are verified, their live courier manifest will appear here."
        controlsLeft={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Status Filter Tabs */}
            <div className="inline-flex items-center p-0.5 rounded-none bg-slate-100 border border-slate-200/80 gap-1 overflow-x-auto scrollbar-none">
              {[
                { key: 'all', label: 'All', count: kpis.total },
                { key: 'pending', label: 'Pending', count: kpis.pending },
                { key: 'shipped', label: 'Shipped', count: kpis.shipped },
              ].map((tab) => {
                const isActive = statusFilter === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key as any)}
                    className={`px-2.5 py-1 rounded-none text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-[#10b981] text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Campaign Selector if multiple */}
            {campaigns.length > 1 && (
              <select
                value={selectedCampaign}
                onChange={(e) => setSelectedCampaign(e.target.value)}
                className="px-2.5 py-1 rounded-none bg-white border border-slate-200 text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#10b981] cursor-pointer"
              >
                <option value="ALL">All Campaigns ({shipments.length})</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.count})
                  </option>
                ))}
              </select>
            )}

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchDispatchData(true)}
              disabled={refreshing}
              title="Refresh live manifest"
              className="p-1.5 rounded-none bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
        toolbarActions={
          <button
            type="button"
            onClick={exportCourierCSV}
            title="Download formatted Courier CSV Manifest with full address and phone"
            className="h-8 text-xs px-2.5 rounded-none border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Download className="w-3.5 h-3.5 text-[#10b981]" />
            <span className="hidden sm:inline font-semibold">Courier CSV</span>
          </button>
        }
        bulkActions={[
          {
            label: 'Mark Shipped',
            icon: Truck,
            variant: 'default',
            onClick: (selected) => {
              openMarkShippedModal(selected.map((s) => s.application_id))
            },
          },
        ]}
      />

      {/* ─── MARK SHIPPED / AWB MODAL ─── */}
      {shipModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">
                    Confirm Product Dispatch ({shipTargetIds.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Syncs live with your TheHype Account Manager & Creator Ops
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShipModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Courier Partner (Optional)
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g., Delhivery, BlueDart, Shiprocket, DTDC"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  AWB / Tracking Number (Optional)
                </label>
                <input
                  type="text"
                  value={awbNumber}
                  onChange={(e) => setAwbNumber(e.target.value)}
                  placeholder="Enter tracking number or leave blank"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:border-[#10b981]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                  Warehouse Dispatch Note (Optional)
                </label>
                <input
                  type="text"
                  value={dispatchNotes}
                  onChange={(e) => setDispatchNotes(e.target.value)}
                  placeholder="e.g., Dispatched from Mumbai warehouse"
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-[#10b981]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShipModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmShipped}
                disabled={submitting}
                className="px-4 py-1.5 rounded-lg bg-[#10b981] hover:bg-[#059669] text-white font-bold text-xs shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
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

