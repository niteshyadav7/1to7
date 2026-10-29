'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Truck,
  Building2,
  Target,
  Send,
  CheckCircle2,
  Clock,
  Instagram,
  MapPin,
  RefreshCw,
  Eye,
  FileSpreadsheet,
  Check,
  X,
  Copy,
  Phone,
  Package,
  ChevronDown,
  RotateCcw,
  CheckCheck,
  AlertCircle,
  Sparkles,
  Edit3,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRealtime } from '@/hooks/useRealtime'
import { DynamicDataTable, ColumnDef } from '@/components/brand/DynamicDataTable'

interface BrandDispatchItem {
  application_id: string
  user_id: string
  campaign_id: string
  campaign_code: string
  campaign_title: string
  brand_name: string
  creator_name: string
  influencer_id: string
  instagram_username: string
  followers: number
  profile_photo: string | null
  selected_variant: string
  order_details: Record<string, string>
  address_verification_status: 'Verified' | 'Pending' | 'Rejected' | 'Not Submitted'
  address_verified_at: string | null
  address_verified_by: string | null
  shipping: {
    recipient_name: string
    phone: string
    alt_phone: string
    line1: string
    line2: string
    landmark: string
    full_street: string
    city: string
    state: string
    pincode: string
    remarks: string
    courier_copy_text: string
  }
  dispatch: {
    is_released: boolean
    released_at: string | null
    released_by: string | null
    target_brand: string
    batch_label: string | null
    dispatch_status: 'ready_for_dispatch' | 'address_pending' | 'sent_to_brand' | 'shipped'
    courier_name: string | null
    awb_number: string | null
    shipped_at: string | null
    shipped_by: string | null
    dispatch_notes: string | null
    visible_fields: string[]
  }
  updated_at: string
}

const DISPATCH_FIELD_OPTIONS = [
  { key: 'recipient_name', label: 'Recipient Full Name', category: 'Courier' },
  { key: 'phone', label: 'Primary Contact Phone', category: 'Courier' },
  { key: 'alt_phone', label: 'Alternate Phone Number', category: 'Courier' },
  { key: 'full_address', label: 'Full Street Address & Landmark', category: 'Courier' },
  { key: 'city_state_pin', label: 'City, State & 6-Digit Pincode', category: 'Courier' },
  { key: 'selected_variant', label: 'Product Variant / Deliverable SKU', category: 'Product' },
  { key: 'custom_order_fields', label: 'Dynamic Campaign Custom Form Fields', category: 'Product' },
  { key: 'instagram_username', label: 'Creator Instagram Handle (@)', category: 'Creator' },
]

export default function BrandDispatchDeskPage() {
  const [items, setItems] = useState<BrandDispatchItem[]>([])
  const [brands, setBrands] = useState<string[]>([])
  const [registeredBrands, setRegisteredBrands] = useState<
    Array<{ id: string; name: string; slug: string; isActive: boolean; assignedKam: string }>
  >([])
  const [campaigns, setCampaigns] = useState<
    Array<{ id: string; campaign_code: string; title: string; brand_name: string }>
  >([])
  const [dynamicFieldKeys, setDynamicFieldKeys] = useState<string[]>([])
  const [counts, setCounts] = useState({
    all: 0,
    ready_for_dispatch: 0,
    address_pending: 0,
    sent_to_brand: 0,
    shipped: 0,
  })
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedBrand, setSelectedBrand] = useState<string>('all')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  // Publish to Brand Portal Modal
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [publishTargetBrand, setPublishTargetBrand] = useState('')
  const [publishBatchLabel, setPublishBatchLabel] = useState('')
  const [publishNotes, setPublishNotes] = useState('')
  const [visibleFields, setVisibleFields] = useState<string[]>(
    DISPATCH_FIELD_OPTIONS.map((f) => f.key)
  )
  const [isPublishing, setIsPublishing] = useState(false)

  // In-Place Address Edit / Verify Modal
  const [editAddressItem, setEditAddressItem] = useState<BrandDispatchItem | null>(null)
  const [addrRecipient, setAddrRecipient] = useState('')
  const [addrPhone, setAddrPhone] = useState('')
  const [addrAltPhone, setAddrAltPhone] = useState('')
  const [addrStreet, setAddrStreet] = useState('')
  const [addrCity, setAddrCity] = useState('')
  const [addrState, setAddrState] = useState('')
  const [addrPincode, setAddrPincode] = useState('')
  const [addrVariant, setAddrVariant] = useState('')
  const [isSavingAddress, setIsSavingAddress] = useState(false)

  // Mark Shipped / AWB Modal
  const [shipModalIds, setShipModalIds] = useState<string[]>([])
  const [courierName, setCourierName] = useState('')
  const [awbNumber, setAwbNumber] = useState('')
  const [shipNotes, setShipNotes] = useState('')
  const [isMarkingShipped, setIsMarkingShipped] = useState(false)

  const activeRegisteredBrands = useMemo(
    () => registeredBrands.filter((b) => b.isActive !== false),
    [registeredBrands]
  )

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const qs = new URLSearchParams()
      if (selectedBrand !== 'all') qs.set('brand', selectedBrand)
      if (selectedCampaign !== 'all') qs.set('campaign', selectedCampaign)
      if (selectedStatus !== 'all') qs.set('status', selectedStatus)

      const res = await fetch(`/api/brand-admin/brand-dispatch?${qs.toString()}`, {
        cache: 'no-store',
      })
      const data = await res.json()
      if (res.ok) {
        setItems(data.items || [])
        setBrands(data.brands || [])
        setRegisteredBrands(data.registeredBrands || [])
        setCampaigns(data.campaigns || [])
        setDynamicFieldKeys(data.dynamicFieldKeys || [])
        if (data.counts) setCounts(data.counts)
      } else {
        toast.error(data.error || 'Failed to load Brand Dispatch queue')
      }
    } catch {
      toast.error('Network error loading Brand Dispatch queue')
    } finally {
      setLoading(false)
    }
  }, [selectedBrand, selectedCampaign, selectedStatus])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useRealtime({
    table: 'applications',
    onChange: () => {
      fetchData()
    },
  })

  const filteredCampaignsList = useMemo(() => {
    if (selectedBrand === 'all') return campaigns
    return campaigns.filter((c) => c.brand_name.toLowerCase() === selectedBrand.toLowerCase())
  }, [campaigns, selectedBrand])

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.includes(i.application_id)),
    [items, selectedIds]
  )

  // Open Publish to Brand Modal
  const handleOpenPublishModal = (appIds?: string | string[]) => {
    const ids = Array.isArray(appIds) ? appIds : appIds ? [appIds] : selectedIds
    if (ids.length === 0) {
      toast.error('Please select at least one approved creator to publish to Brand Dispatch')
      return
    }
    setSelectedIds(ids)
    const targetList = items.filter((i) => ids.includes(i.application_id))
    const firstBrand = targetList[0]?.brand_name?.toLowerCase().trim()
    const match = activeRegisteredBrands.find(
      (b) => b.name.toLowerCase().trim() === firstBrand || b.slug.toLowerCase().trim() === firstBrand
    )
    setPublishTargetBrand(match ? match.name : activeRegisteredBrands[0]?.name || '')
    setPublishBatchLabel(
      `Dispatch - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
    )
    setShowPublishModal(true)
  }

  const handlePublishToBrand = async () => {
    if (selectedIds.length === 0) return
    const targetToUse = publishTargetBrand || activeRegisteredBrands[0]?.name
    if (!targetToUse) {
      toast.error('Please select an active Client Brand Workspace')
      return
    }

    try {
      setIsPublishing(true)
      const res = await fetch('/api/brand-admin/brand-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'release_to_brand',
          applicationIds: selectedIds,
          targetBrand: targetToUse,
          batchLabel: publishBatchLabel.trim() || undefined,
          visibleFields,
          dispatchNotes: publishNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Published dispatch sheet to Brand Portal!')
        setShowPublishModal(false)
        setPublishNotes('')
        setSelectedIds([])
        fetchData()
      } else {
        toast.error(data.error || 'Failed to publish dispatch manifest')
      }
    } catch {
      toast.error('Network error publishing dispatch manifest')
    } finally {
      setIsPublishing(false)
    }
  }

  // Open Address Edit / Verify Modal
  const handleOpenEditAddress = (item: BrandDispatchItem) => {
    setEditAddressItem(item)
    setAddrRecipient(item.shipping.recipient_name || item.creator_name)
    setAddrPhone(item.shipping.phone || '')
    setAddrAltPhone(item.shipping.alt_phone || '')
    setAddrStreet(item.shipping.full_street || item.shipping.line1 || '')
    setAddrCity(item.shipping.city || '')
    setAddrState(item.shipping.state || '')
    setAddrPincode(item.shipping.pincode || '')
    setAddrVariant(item.selected_variant || 'Standard Sample')
  }

  const handleSaveAndVerifyAddress = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editAddressItem) return
    try {
      setIsSavingAddress(true)
      const res = await fetch('/api/brand-admin/brand-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_address',
          applicationIds: [editAddressItem.application_id],
          shippingUpdate: {
            recipient_name: addrRecipient.trim(),
            phone: addrPhone.trim(),
            alt_phone: addrAltPhone.trim(),
            line1: addrStreet.trim(),
            city: addrCity.trim(),
            state: addrState.trim(),
            pincode: addrPincode.trim(),
            selected_variant: addrVariant.trim(),
          },
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Address verified & ready for Brand Dispatch!')
        setEditAddressItem(null)
        fetchData()
      } else {
        toast.error(data.error || 'Failed to verify address')
      }
    } catch {
      toast.error('Network error verifying address')
    } finally {
      setIsSavingAddress(false)
    }
  }

  const handleQuickVerifyIds = async (ids: string[]) => {
    if (ids.length === 0) return
    try {
      const res = await fetch('/api/brand-admin/brand-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'verify_address',
          applicationIds: ids,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || `Verified ${ids.length} address(es)!`)
        setSelectedIds([])
        fetchData()
      } else {
        toast.error(data.error || 'Failed to verify addresses')
      }
    } catch {
      toast.error('Network error verifying addresses')
    }
  }

  const handleConfirmMarkShipped = async (e: React.FormEvent) => {
    e.preventDefault()
    if (shipModalIds.length === 0) return
    try {
      setIsMarkingShipped(true)
      const res = await fetch('/api/brand-admin/brand-dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_shipped',
          applicationIds: shipModalIds,
          courierName: courierName.trim() || undefined,
          awbNumber: awbNumber.trim() || undefined,
          dispatchNotes: shipNotes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Marked as shipped!')
        setShipModalIds([])
        setCourierName('')
        setAwbNumber('')
        setShipNotes('')
        setSelectedIds([])
        fetchData()
      } else {
        toast.error(data.error || 'Failed to mark shipped')
      }
    } catch {
      toast.error('Network error updating shipment')
    } finally {
      setIsMarkingShipped(false)
    }
  }

  // Export Courier CSV (Delhivery / Shiprocket / BlueDart standard + Dynamic Custom Fields)
  const handleExportCourierCSV = () => {
    if (items.length === 0) {
      toast.error('No dispatch records to export')
      return
    }

    const baseHeaders = [
      'Sr. No',
      'Brand Name',
      'Campaign Code',
      'Dispatch Batch',
      'Creator Name',
      'Influencer ID',
      'Instagram Handle',
      'Recipient Name',
      'Primary Phone',
      'Alternate Phone',
      'Full Street Address',
      'City',
      'State',
      'Pincode',
      'Product Variant / SKU',
      ...dynamicFieldKeys.map((k) => `Custom: ${k}`),
      'Address Status',
      'Dispatch Status',
      'Courier Partner',
      'AWB / Tracking No',
    ]

    const rows = items.map((item, idx) => {
      const baseCols = [
        idx + 1,
        `"${(item.brand_name || '').replace(/"/g, '""')}"`,
        `"${(item.campaign_code || '').replace(/"/g, '""')}"`,
        `"${(item.dispatch.batch_label || 'Main').replace(/"/g, '""')}"`,
        `"${(item.creator_name || '').replace(/"/g, '""')}"`,
        `"${(item.influencer_id || '').replace(/"/g, '""')}"`,
        `"@@${(item.instagram_username || '').replace(/^@/, '')}"`.replace('@@', '@'),
        `"${(item.shipping.recipient_name || '').replace(/"/g, '""')}"`,
        `"${(item.shipping.phone || '').replace(/"/g, '""')}"`,
        `"${(item.shipping.alt_phone || '').replace(/"/g, '""')}"`,
        `"${(item.shipping.full_street || '').replace(/"/g, '""')}"`,
        `"${(item.shipping.city || '').replace(/"/g, '""')}"`,
        `"${(item.shipping.state || '').replace(/"/g, '""')}"`,
        `"${(item.shipping.pincode || '').replace(/"/g, '""')}"`,
        `"${(item.selected_variant || '').replace(/"/g, '""')}"`,
        ...dynamicFieldKeys.map((k) => `"${(item.order_details?.[k] || '').replace(/"/g, '""')}"`),
        `"${item.address_verification_status}"`,
        `"${item.dispatch.dispatch_status}"`,
        `"${(item.dispatch.courier_name || '').replace(/"/g, '""')}"`,
        `"${(item.dispatch.awb_number || '').replace(/"/g, '""')}"`,
      ]
      return baseCols.join(',')
    })

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' + [baseHeaders.join(','), ...rows].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `Brand_Courier_Dispatch_${selectedBrand !== 'all' ? selectedBrand + '_' : ''}${new Date().toISOString().split('T')[0]}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success(`Exported ${items.length} courier dispatch records!`)
  }

  const columns: ColumnDef<BrandDispatchItem>[] = useMemo(
    () => [
      {
        key: 'creator_name',
        header: 'Creator',
        sortable: true,
        wrap: false,
        width: '15%',
        minWidth: '120px',
        accessor: (row) => row.creator_name,
        render: (item) => (
          <div className="flex items-center gap-1.5 min-w-0 w-full">
            <div className="h-6 w-6 rounded-md bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center text-[9px] font-bold text-emerald-300 shrink-0">
              {item.creator_name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="font-bold text-white text-[10px] flex items-center gap-1 min-w-0"
                title={item.creator_name}
              >
                <span className="truncate block flex-1">{item.creator_name}</span>
                <span className="text-[8px] font-mono text-neutral-400 bg-white/5 border border-white/10 px-1 py-0.2 rounded shrink-0">
                  {item.influencer_id}
                </span>
              </div>
              <a
                href={`https://instagram.com/${item.instagram_username}`}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-neutral-400 hover:text-pink-400 flex items-center gap-0.5 text-[9px] mt-0.5 min-w-0"
                title={`@${item.instagram_username}`}
              >
                <Instagram className="h-2 w-2 text-pink-400 shrink-0" />
                <span className="truncate block flex-1">@{item.instagram_username}</span>
              </a>
            </div>
          </div>
        ),
      },
      {
        key: 'brand_name',
        header: 'Brand & Campaign',
        sortable: true,
        wrap: false,
        width: '15%',
        minWidth: '125px',
        accessor: (row) => `${row.brand_name} ${row.campaign_code}`,
        render: (item) => (
          <div className="min-w-0 w-full space-y-0.5">
            <div className="font-bold text-white text-[10px] truncate block" title={item.brand_name}>
              {item.brand_name}
            </div>
            <div
              className="text-[9px] text-amber-300 font-semibold flex items-center gap-0.5 min-w-0"
              title={`${item.campaign_title} (${item.campaign_code})`}
            >
              <Target className="h-2 w-2 text-amber-400 shrink-0" />
              <span className="truncate block flex-1">{item.campaign_code}</span>
            </div>
            {item.dispatch.batch_label && (
              <span className="inline-block text-[8px] px-1 py-0.2 rounded bg-white/5 text-neutral-300 border border-white/10 truncate max-w-full">
                {item.dispatch.batch_label}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'selected_variant',
        header: 'Deliverable / SKU & Fields',
        sortable: true,
        wrap: false,
        width: '16%',
        minWidth: '130px',
        accessor: (row) => row.selected_variant,
        render: (item) => {
          const customEntries = Object.entries(item.order_details || {})
          return (
            <div className="min-w-0 w-full space-y-0.5">
              <span
                className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[9px] font-bold truncate max-w-full block"
                title={item.selected_variant}
              >
                <Package className="h-2 w-2 text-amber-400 shrink-0 inline mr-0.5" />
                <span className="truncate">{item.selected_variant}</span>
              </span>
              {customEntries.length > 0 && (
                <div
                  className="text-[8px] text-neutral-300 truncate block"
                  title={customEntries.map(([k, v]) => `${k}: ${v}`).join(' | ')}
                >
                  {customEntries.map(([k, v]) => `${k}: ${v}`).join(' • ')}
                </div>
              )}
            </div>
          )
        },
      },
      {
        key: 'shipping_address',
        header: 'Verified Shipping Address',
        sortable: true,
        wrap: false,
        width: '23%',
        minWidth: '180px',
        accessor: (row) => `${row.shipping.city} ${row.shipping.pincode}`,
        render: (item) => {
          const isVerified = item.address_verification_status === 'Verified'
          return (
            <div className="min-w-0 w-full space-y-0.5">
              <div className="flex items-center gap-1 min-w-0">
                <span
                  className={`inline-flex items-center gap-0.5 text-[7.5px] font-extrabold uppercase px-1 py-0.2 rounded-full border shrink-0 ${
                    isVerified
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {isVerified ? '✓ Verified' : item.address_verification_status}
                </span>
                <span
                  className="text-[9.5px] font-bold text-white truncate block flex-1"
                  title={item.shipping.recipient_name}
                >
                  {item.shipping.recipient_name}
                </span>
              </div>
              <div
                className="text-[8.5px] text-neutral-300 truncate block"
                title={item.shipping.full_street || 'No street address'}
              >
                {item.shipping.full_street || 'Address not entered'}
              </div>
              <div className="text-[8.5px] font-mono text-emerald-400 font-semibold flex items-center gap-1 min-w-0">
                <MapPin className="h-2 w-2 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {[item.shipping.city, item.shipping.state].filter(Boolean).join(', ')} —{' '}
                  {item.shipping.pincode || 'No PIN'}
                </span>
              </div>
            </div>
          )
        },
      },
      {
        key: 'phone',
        header: 'Contact Phone',
        sortable: false,
        wrap: false,
        width: '10%',
        minWidth: '88px',
        accessor: (row) => row.shipping.phone,
        render: (item) => (
          <div className="min-w-0 w-full space-y-0.5">
            <div className="text-[9.5px] font-mono font-bold text-emerald-300 flex items-center gap-0.5">
              <Phone className="h-2 w-2 text-emerald-400 shrink-0" />
              <span className="truncate">{item.shipping.phone || 'N/A'}</span>
            </div>
            {item.shipping.alt_phone && (
              <div className="text-[8px] font-mono text-neutral-400 truncate">
                Alt: {item.shipping.alt_phone}
              </div>
            )}
          </div>
        ),
      },
      {
        key: 'dispatch_status',
        header: 'Dispatch Status',
        sortable: true,
        wrap: false,
        width: '11%',
        minWidth: '100px',
        accessor: (row) => row.dispatch.dispatch_status,
        render: (item) => {
          const st = item.dispatch.dispatch_status
          if (st === 'shipped') {
            return (
              <div className="min-w-0 w-full space-y-0.5 pr-1">
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 truncate max-w-full block">
                  <Truck className="h-2.5 w-2.5 text-emerald-400 shrink-0 inline mr-0.5" />
                  <span>Shipped</span>
                </span>
                {(item.dispatch.awb_number || item.dispatch.courier_name) && (
                  <div
                    className="text-[7.5px] font-mono text-emerald-400 truncate block"
                    title={`${item.dispatch.courier_name || 'Courier'}: ${item.dispatch.awb_number || ''}`}
                  >
                    {item.dispatch.courier_name ? `${item.dispatch.courier_name}: ` : ''}
                    {item.dispatch.awb_number || 'Dispatched'}
                  </div>
                )}
              </div>
            )
          }

          if (st === 'sent_to_brand') {
            return (
              <div className="min-w-0 w-full space-y-0.5 pr-1">
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 truncate max-w-full block">
                  <Send className="h-2 w-2 text-purple-400 shrink-0 inline mr-0.5" />
                  <span>With Brand</span>
                </span>
                <div className="text-[7.5px] text-purple-300/80 truncate block">
                  Live on Dispatch Tab
                </div>
              </div>
            )
          }

          if (st === 'ready_for_dispatch') {
            return (
              <div className="min-w-0 w-full space-y-0.5 pr-1">
                <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/35 truncate max-w-full block">
                  <CheckCircle2 className="h-2.5 w-2.5 text-cyan-400 shrink-0 inline mr-0.5" />
                  <span>Ready to Send</span>
                </span>
                <div className="text-[7.5px] text-cyan-300/80 truncate block">
                  Approved + Verified
                </div>
              </div>
            )
          }

          return (
            <div className="min-w-0 w-full space-y-0.5 pr-1">
              <span className="inline-flex items-center gap-0.5 text-[8.5px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 truncate max-w-full block">
                <Clock className="h-2.5 w-2.5 text-amber-400 shrink-0 inline mr-0.5" />
                <span>Addr Pending</span>
              </span>
              <div className="text-[7.5px] text-amber-300/80 truncate block">
                Verify before dispatch
              </div>
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
        wrap: false,
        width: '10%',
        minWidth: '100px',
        render: (item) => {
          const isVerified = item.address_verification_status === 'Verified'
          const isReleased = item.dispatch.is_released
          const isShipped = item.dispatch.dispatch_status === 'shipped'

          return (
            <div
              className="flex items-center justify-end gap-1 shrink-0 whitespace-nowrap"
              onClick={(e) => e.stopPropagation()}
            >
              {!isVerified ? (
                <button
                  type="button"
                  onClick={() => handleOpenEditAddress(item)}
                  className="h-5.5 px-1.5 rounded text-[8.5px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center gap-0.5 cursor-pointer shadow-xs shrink-0"
                  title="Verify or edit creator shipping address"
                >
                  <Check className="h-2.5 w-2.5 stroke-[2.5]" />
                  <span>Verify</span>
                </button>
              ) : !isReleased ? (
                <button
                  type="button"
                  onClick={() => handleOpenPublishModal(item.application_id)}
                  className="h-5.5 px-1.5 rounded text-[8.5px] font-bold bg-[#febd1c] hover:bg-amber-300 text-slate-950 flex items-center gap-0.5 cursor-pointer shadow-xs shrink-0"
                  title="Publish to Brand Portal Dispatch Tab"
                >
                  <Send className="h-2 w-2" />
                  <span>Send</span>
                </button>
              ) : !isShipped ? (
                <button
                  type="button"
                  onClick={() => {
                    setShipModalIds([item.application_id])
                    setCourierName(item.dispatch.courier_name || '')
                    setAwbNumber(item.dispatch.awb_number || '')
                    setShipNotes(item.dispatch.dispatch_notes || '')
                  }}
                  className="h-5.5 px-1.5 rounded text-[8.5px] font-bold bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/35 flex items-center gap-0.5 cursor-pointer transition shrink-0"
                  title="Mark Sample Shipped / Add AWB"
                >
                  <Truck className="h-2.5 w-2.5" />
                  <span>Ship</span>
                </button>
              ) : null}

              <button
                type="button"
                onClick={() => handleOpenEditAddress(item)}
                className="h-5.5 w-5 rounded bg-white/5 hover:bg-white/15 text-neutral-300 hover:text-white border border-white/10 flex items-center justify-center cursor-pointer shrink-0"
                title="Edit / Inspect Address & SKU"
              >
                <Edit3 className="h-2.5 w-2.5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(item.shipping.courier_copy_text)
                  toast.success(`Copied courier manifest for ${item.creator_name}`)
                }}
                className="h-5.5 w-5 rounded bg-white/5 hover:bg-emerald-500/20 text-neutral-300 hover:text-emerald-300 border border-white/10 flex items-center justify-center cursor-pointer shrink-0"
                title="Copy Courier Address Manifest"
              >
                <Copy className="h-2.5 w-2.5" />
              </button>
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold mb-2">
            <Truck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Dynamic Brand Dispatch & Courier Manifest Hub</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Brand Dispatch & Courier Manifests
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1 max-w-3xl leading-relaxed">
            Zero manual Google Sheets. Review all Final Approved creators, verify shipping addresses & custom campaign SKU fields, and publish live courier manifests directly to the Brand Client Portal.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => {
              const readyIds = items
                .filter((i) => i.address_verification_status === 'Verified' && !i.dispatch.is_released)
                .map((i) => i.application_id)
              handleOpenPublishModal(
                selectedIds.length > 0 ? selectedIds : readyIds.length > 0 ? readyIds : items.map((i) => i.application_id)
              )
            }}
            className="bg-[#febd1c] hover:bg-amber-300 text-slate-950 font-black text-xs h-9 flex items-center gap-1.5 cursor-pointer rounded-xl shadow-md"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Publish Dispatch Sheet to Brand</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 flex items-center gap-1.5 bg-slate-900/80 cursor-pointer rounded-xl"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-amber-400' : 'text-neutral-400'}`} />
            <span>Refresh</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCourierCSV}
            className="border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-400 text-xs h-9 flex items-center gap-1.5 bg-slate-900/80 cursor-pointer rounded-xl"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export Courier CSV ({items.length})</span>
          </Button>
        </div>
      </div>

      {/* 2. KPI Command Deck */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          {
            id: 'all',
            label: 'Total Final Approved',
            count: counts.all,
            subtext: 'Approved in Campaign Curation',
            icon: CheckCheck,
            accentText: 'text-amber-400',
            activeClass: 'bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-900 border-amber-500/60 ring-1 ring-amber-400/50',
            iconBg: 'bg-amber-500/10 text-amber-400',
          },
          {
            id: 'ready_for_dispatch',
            label: 'Ready for Brand Dispatch',
            count: counts.ready_for_dispatch,
            subtext: 'Approved + Address Verified',
            icon: ShieldCheck,
            accentText: 'text-cyan-400',
            activeClass: 'bg-gradient-to-b from-cyan-500/15 via-slate-900/90 to-slate-900 border-cyan-500/60 ring-1 ring-cyan-400/50',
            iconBg: 'bg-cyan-500/10 text-cyan-400',
          },
          {
            id: 'address_pending',
            label: 'Address Pending / Missing',
            count: counts.address_pending,
            subtext: 'Needs address verification',
            icon: Clock,
            accentText: 'text-amber-300',
            activeClass: 'bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-900 border-amber-500/60 ring-1 ring-amber-400/50',
            iconBg: 'bg-amber-500/10 text-amber-300',
          },
          {
            id: 'sent_to_brand',
            label: 'Live on Brand Portal',
            count: counts.sent_to_brand,
            subtext: 'In Brand Product Dispatch tab',
            icon: Send,
            accentText: 'text-purple-400',
            activeClass: 'bg-gradient-to-b from-purple-500/15 via-slate-900/90 to-slate-900 border-purple-500/60 ring-1 ring-purple-400/50',
            iconBg: 'bg-purple-500/10 text-purple-400',
          },
          {
            id: 'shipped',
            label: 'Product Shipped / AWB',
            count: counts.shipped,
            subtext: 'Dispatched by brand / courier',
            icon: Truck,
            accentText: 'text-emerald-400',
            activeClass: 'bg-gradient-to-b from-emerald-500/15 via-slate-900/90 to-slate-900 border-emerald-500/60 ring-1 ring-emerald-400/50',
            iconBg: 'bg-emerald-500/10 text-emerald-400',
          },
        ].map((kpi) => {
          const Icon = kpi.icon
          const isActive = selectedStatus === kpi.id
          return (
            <div
              key={kpi.id}
              onClick={() => setSelectedStatus(kpi.id)}
              className={`cursor-pointer p-3.5 rounded-2xl border transition-all duration-200 select-none ${
                isActive
                  ? kpi.activeClass
                  : 'bg-slate-900/70 border-white/[0.08] hover:border-white/20 hover:bg-slate-900/90'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider truncate ${
                    isActive ? 'text-white font-extrabold' : kpi.accentText
                  }`}
                >
                  {kpi.label}
                </span>
                <div className={`h-6 w-6 rounded-lg ${kpi.iconBg} flex items-center justify-center shrink-0`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div className="text-2xl font-black text-white mt-1.5">{kpi.count}</div>
              <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{kpi.subtext}</div>
            </div>
          )
        })}
      </div>

      {/* 3. Brand & Campaign Scope Selectors */}
      <div className="bg-slate-900/80 backdrop-blur-xl p-3.5 sm:p-4 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1">
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
                  className="w-full pl-9 pr-9 py-2 text-xs font-semibold border border-white/10 rounded-xl bg-slate-950 text-white focus:outline-none focus:border-amber-400 cursor-pointer appearance-none"
                >
                  <option value="all">All Brands ({brands.length})</option>
                  {registeredBrands.length > 0 && (
                    <optgroup label="⭐ Registered Client Workspaces">
                      {registeredBrands.map((b) => (
                        <option key={`reg-${b.id}`} value={b.name}>
                          ⭐ {b.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="🏷️ Campaign Brands">
                    {brands.map((b) => (
                      <option key={`camp-${b}`} value={b}>
                        🏷️ {b}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                Campaign
              </label>
              <div className="relative">
                <Target className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
                <select
                  value={selectedCampaign}
                  onChange={(e) => setSelectedCampaign(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 text-xs font-semibold border border-white/10 rounded-xl bg-slate-950 text-white focus:outline-none focus:border-amber-400 cursor-pointer appearance-none"
                >
                  <option value="all">All Campaigns ({filteredCampaignsList.length})</option>
                  {filteredCampaignsList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.brand_name} — {c.title} ({c.campaign_code})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-end">
            {selectedBrand !== 'all' && (
              <a
                href={`/api/brand-admin/virtual-brand/impersonate?brandId=${encodeURIComponent(
                  registeredBrands.find((b) => b.name.toLowerCase() === selectedBrand.toLowerCase())?.id ||
                    selectedBrand
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer shrink-0"
              >
                <Eye className="w-3.5 h-3.5 shrink-0" />
                <span>Open {selectedBrand} Portal</span>
              </a>
            )}

            {(selectedBrand !== 'all' || selectedCampaign !== 'all' || selectedStatus !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand('all')
                  setSelectedCampaign('all')
                  setSelectedStatus('all')
                }}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 h-9 cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. Dynamic Dispatch Data Table */}
      <DynamicDataTable
        data={items}
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
            { label: 'All Approved', value: 'all', count: counts.all },
            { label: 'Ready for Dispatch', value: 'ready_for_dispatch', count: counts.ready_for_dispatch },
            { label: 'Address Pending', value: 'address_pending', count: counts.address_pending },
            { label: 'Live on Brand Portal', value: 'sent_to_brand', count: counts.sent_to_brand },
            { label: 'Shipped / AWB', value: 'shipped', count: counts.shipped },
          ],
        }}
        searchPlaceholder="Search creator, @handle, city, pincode, phone, variant, AWB..."
        searchFields={[
          'creator_name',
          'instagram_username',
          'influencer_id',
          'brand_name',
          'campaign_code',
          'selected_variant',
        ]}
        bulkActions={[
          {
            label: 'Publish Dispatch Sheet to Brand Portal',
            icon: Send,
            variant: 'default',
            onClick: (rows) => {
              handleOpenPublishModal(rows.map((r) => r.application_id))
            },
          },
          {
            label: '✓ Verify Addresses',
            icon: Check,
            variant: 'outline',
            onClick: (rows) => {
              handleQuickVerifyIds(rows.map((r) => r.application_id))
            },
          },
          {
            label: 'Mark Shipped / Add AWB',
            icon: Truck,
            variant: 'outline',
            onClick: (rows) => {
              setShipModalIds(rows.map((r) => r.application_id))
              setCourierName('')
              setAwbNumber('')
              setShipNotes('')
            },
          },
        ]}
        exportFilename="brand_courier_dispatch_sheet.csv"
        defaultPageSize={15}
        pageSizeOptions={[15, 25, 50, 100]}
        emptyMessage="No final approved creators in this dispatch view yet. Final approve creators in Campaign Curation first."
        onRowClick={(row) => handleOpenEditAddress(row)}
      />

      {/* 5. Publish Dispatch Manifest to Brand Portal Modal */}
      <AnimatePresence>
        {showPublishModal && (
          <div
            onClick={() => {
              if (!isPublishing) setShowPublishModal(false)
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/10 text-white cursor-default max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Publish Courier Manifest to Brand Portal
                    </h3>
                    <p className="text-xs text-neutral-400">
                      Release {selectedIds.length} approved creator shipment{selectedIds.length > 1 ? 's' : ''} to Brand&apos;s Product Dispatch tab
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPublishModal(false)}
                  className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-300 block mb-1.5">
                      Target Brand Workspace *
                    </label>
                    <select
                      value={publishTargetBrand}
                      onChange={(e) => setPublishTargetBrand(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white font-semibold focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Select Brand Workspace --</option>
                      {activeRegisteredBrands.map((b) => (
                        <option key={b.id} value={b.name}>
                          ⭐ {b.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-neutral-300 block mb-1.5">
                      Dispatch Batch Label
                    </label>
                    <Input
                      value={publishBatchLabel}
                      onChange={(e) => setPublishBatchLabel(e.target.value)}
                      placeholder="e.g. Batch 1 - Courier Sheet"
                      className="bg-slate-950 border-white/10 text-white text-xs h-9.5 rounded-xl"
                    />
                  </div>
                </div>

                {/* Courier Columns & Custom Form Fields Selector */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-neutral-300">
                      Columns Shared with Brand Warehouse ({visibleFields.length})
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">
                      Replaces Manual Google Sheet
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                    {DISPATCH_FIELD_OPTIONS.map((field) => {
                      const isChecked = visibleFields.includes(field.key)
                      return (
                        <label
                          key={field.key}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                              : 'bg-slate-950 border-white/10 text-neutral-400'
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-[11px] font-bold truncate">{field.label}</div>
                            <div className="text-[9px] text-neutral-400">{field.category}</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setVisibleFields((prev) => [...prev, field.key])
                              } else {
                                setVisibleFields((prev) => prev.filter((k) => k !== field.key))
                              }
                            }}
                            className="h-4 w-4 rounded accent-emerald-500 shrink-0"
                          />
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="font-bold text-neutral-300 block mb-1.5">
                    Logistics / Warehouse Note for Brand (Optional)
                  </label>
                  <textarea
                    value={publishNotes}
                    onChange={(e) => setPublishNotes(e.target.value)}
                    placeholder="e.g. All addresses verified via phone. Please share AWB tracking once dispatched."
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs h-16 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  onClick={() => setShowPublishModal(false)}
                  disabled={isPublishing}
                  className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePublishToBrand}
                  disabled={isPublishing || !publishTargetBrand}
                  className="bg-[#febd1c] hover:bg-amber-300 text-slate-950 font-black text-xs h-9 flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                  <span>
                    {isPublishing ? 'Publishing...' : `Publish to ${publishTargetBrand || 'Brand'} Portal`}
                  </span>
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 6. In-Place Edit & Verify Shipping Address Modal */}
      <AnimatePresence>
        {editAddressItem && (
          <div
            onClick={() => {
              if (!isSavingAddress) setEditAddressItem(null)
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-white/10 text-white cursor-default max-h-[90vh] overflow-y-auto"
            >
              <form onSubmit={handleSaveAndVerifyAddress}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Verify / Edit Creator Courier Manifest
                    </h3>
                    <p className="text-xs text-neutral-400">
                      {editAddressItem.creator_name} (@{editAddressItem.instagram_username}) •{' '}
                      {editAddressItem.brand_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditAddressItem(null)}
                    className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-neutral-300 block mb-1">
                        Recipient Full Name *
                      </label>
                      <Input
                        required
                        value={addrRecipient}
                        onChange={(e) => setAddrRecipient(e.target.value)}
                        className="bg-slate-950 border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-neutral-300 block mb-1">
                        Product Variant / Deliverable SKU
                      </label>
                      <Input
                        value={addrVariant}
                        onChange={(e) => setAddrVariant(e.target.value)}
                        className="bg-slate-950 border-white/10 text-white text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-neutral-300 block mb-1">
                        Primary Contact Phone *
                      </label>
                      <Input
                        required
                        value={addrPhone}
                        onChange={(e) => setAddrPhone(e.target.value)}
                        className="bg-slate-950 border-white/10 text-white text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-neutral-300 block mb-1">
                        Alternate Phone (Optional)
                      </label>
                      <Input
                        value={addrAltPhone}
                        onChange={(e) => setAddrAltPhone(e.target.value)}
                        className="bg-slate-950 border-white/10 text-white text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-neutral-300 block mb-1">
                      Full Delivery Street Address & Landmark *
                    </label>
                    <textarea
                      required
                      value={addrStreet}
                      onChange={(e) => setAddrStreet(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs h-16"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div>
                      <label className="font-bold text-neutral-300 block mb-1">City *</label>
                      <Input
                        required
                        value={addrCity}
                        onChange={(e) => setAddrCity(e.target.value)}
                        className="bg-slate-950 border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-neutral-300 block mb-1">State *</label>
                      <Input
                        required
                        value={addrState}
                        onChange={(e) => setAddrState(e.target.value)}
                        className="bg-slate-950 border-white/10 text-white text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-neutral-300 block mb-1">Pincode *</label>
                      <Input
                        required
                        value={addrPincode}
                        onChange={(e) => setAddrPincode(e.target.value)}
                        className="bg-slate-950 border-white/10 text-white text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setEditAddressItem(null)}
                    className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSavingAddress}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-9 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>
                      {isSavingAddress ? 'Saving...' : 'Save & Mark Address Verified'}
                    </span>
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 7. Mark Shipped / Add Courier AWB Modal */}
      <AnimatePresence>
        {shipModalIds.length > 0 && (
          <div
            onClick={() => {
              if (!isMarkingShipped) setShipModalIds([])
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
              <form onSubmit={handleConfirmMarkShipped}>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Truck className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Mark Sample Shipped ({shipModalIds.length})
                      </h3>
                      <p className="text-xs text-neutral-400">
                        Record courier dispatch & AWB tracking
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShipModalIds([])}
                    className="text-neutral-400 hover:text-white p-1 cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-xs">
                  <div>
                    <label className="font-bold text-neutral-300 block mb-1">
                      Courier Partner (Optional)
                    </label>
                    <Input
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="e.g. Delhivery, BlueDart, Shiprocket, DTDC"
                      className="bg-slate-950 border-white/10 text-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-300 block mb-1">
                      AWB / Tracking Number (Optional)
                    </label>
                    <Input
                      value={awbNumber}
                      onChange={(e) => setAwbNumber(e.target.value)}
                      placeholder="e.g. AWB192837465"
                      className="bg-slate-950 border-white/10 text-white text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-neutral-300 block mb-1">
                      Dispatch Notes (Optional)
                    </label>
                    <textarea
                      value={shipNotes}
                      onChange={(e) => setShipNotes(e.target.value)}
                      placeholder="e.g. Dispatched from Mumbai warehouse"
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/10 text-white text-xs h-16"
                    />
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShipModalIds([])}
                    className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-9 cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isMarkingShipped}
                    className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-9 flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>{isMarkingShipped ? 'Updating...' : 'Confirm Shipped'}</span>
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
