'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Instagram,
  ArrowRight,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'
import { EllipsisTooltip } from '@/components/brand/EllipsisTooltip'

interface DispatchItem {
  id: string
  creator_name: string
  handle: string
  city: string
  campaign: string
  sample_choice: string
  courier_partner: string
  awb_number: string
  status: 'Delivered' | 'In Transit' | 'Out for Delivery' | 'Packed'
  dispatched_at: string
}

export default function BrandDispatchesTrackerPage() {
  const [dispatches, setDispatches] = useState<DispatchItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'Delivered' | 'In Transit' | 'Out for Delivery' | 'Packed'>('all')

  const fetchDispatches = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/brand/dispatches')
      const data = await res.json()
      if (res.ok && Array.isArray(data.dispatches)) {
        setDispatches(data.dispatches)
      } else {
        setDispatches([])
      }
    } catch {
      toast.error('Network error loading dispatches')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDispatches()
  }, [fetchDispatches])

  const filtered = dispatches.filter((d) => {
    if (statusFilter !== 'all' && d.status !== statusFilter) return false
    return true
  })

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Sample Courier Dispatches
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Real-time delivery tracking of product samples sent to approved creators.
        </p>
      </div>

      {/* Production Grade Dynamic Data Table */}
      <DynamicDataTable<DispatchItem>
        theme="light"
        keyField="id"
        tableLayout="fixed"
        loading={loading}
        emptyMessage="No sample dispatches logged for this brand yet. Dispatched sample kits will track here in real time."
        title="Live Sample Logistics Dispatches"
        subtitle="Monitor delivery tracking numbers and transit status across courier networks"
        data={filtered}
        exportFilename="brand_dispatches_logistics.csv"
        searchPlaceholder="Search creator, AWB number, city, or campaign..."
        searchFields={['creator_name', 'handle', 'awb_number', 'city', 'campaign']}
        filterTabs={{
          key: 'status',
          options: [
            { label: 'All Dispatches', value: 'all', count: dispatches.length },
            { label: 'Delivered', value: 'Delivered', count: dispatches.filter((d) => d.status === 'Delivered').length },
            { label: 'Out for Delivery', value: 'Out for Delivery', count: dispatches.filter((d) => d.status === 'Out for Delivery').length },
            { label: 'In Transit', value: 'In Transit', count: dispatches.filter((d) => d.status === 'In Transit').length },
            { label: 'Packed', value: 'Packed', count: dispatches.filter((d) => d.status === 'Packed').length },
          ],
          activeValue: statusFilter,
          onChange: (val) => setStatusFilter(val as any),
        }}
        columns={[
          {
            key: 'creator_name',
            header: 'Creator & Location',
            sortable: true,
            width: '24%',
            render: (d) => (
              <div className="flex items-center gap-2 min-w-0 max-w-full">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-slate-900 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {d.creator_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <EllipsisTooltip text={d.creator_name} subtext={`@${d.handle} • ${d.city}`}>
                    <div className="font-bold text-slate-900 text-[11px] truncate cursor-default max-w-[140px]">
                      {d.creator_name}
                    </div>
                  </EllipsisTooltip>
                  <div className="text-[10px] text-pink-600 font-medium truncate">
                    @{d.handle} • {d.city}
                  </div>
                </div>
              </div>
            ),
          },
          {
            key: 'campaign',
            header: 'Campaign',
            sortable: true,
            width: '20%',
            render: (d) => (
              <EllipsisTooltip text={d.campaign} subtext="Brand Campaign">
                <div className="truncate text-slate-800 text-[10px] font-medium max-w-full cursor-default">
                  {d.campaign}
                </div>
              </EllipsisTooltip>
            ),
          },
          {
            key: 'sample_choice',
            header: 'Product Sample Choice',
            width: '23%',
            render: (d) => (
              <EllipsisTooltip text={d.sample_choice} subtext="Selected Sample Kit">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-900 text-[10px] max-w-full min-w-0 overflow-hidden cursor-default">
                  <Package className="w-3 h-3 text-amber-600 shrink-0" />
                  <span className="truncate block min-w-0">{d.sample_choice}</span>
                </div>
              </EllipsisTooltip>
            ),
          },
          {
            key: 'awb_number',
            header: 'Courier & Tracking AWB',
            sortable: true,
            width: '15%',
            render: (d) => (
              <div className="min-w-0 max-w-full">
                <EllipsisTooltip text={d.awb_number} subtext={d.courier_partner}>
                  <span className="font-mono text-[10px] font-bold text-slate-900 block truncate cursor-default">
                    {d.awb_number}
                  </span>
                </EllipsisTooltip>
                <span className="text-[9px] text-slate-500 truncate block">
                  {d.courier_partner}
                </span>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Delivery Status',
            align: 'center',
            sortable: true,
            width: '10%',
            render: (d) => {
              const colorClass =
                d.status === 'Delivered'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : d.status === 'Out for Delivery'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : d.status === 'In Transit'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200'

              return (
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full border whitespace-nowrap ${colorClass}`}>
                  {d.status}
                </span>
              )
            },
          },
          {
            key: 'actions',
            header: 'Track',
            align: 'right',
            sortable: false,
            width: '8%',
            render: (d) => (
              <a
                href={`https://www.delhivery.com/track/package/${d.awb_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="h-6 px-2 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-semibold transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Track</span>
                <ExternalLink className="w-2.5 h-2.5 text-slate-500" />
              </a>
            ),
          },
        ]}
      />
    </div>
  )
}
