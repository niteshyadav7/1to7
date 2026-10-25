'use client'

import React, { useState } from 'react'
import {
  Truck,
  Package,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Instagram,
  ArrowRight,
} from 'lucide-react'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'

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
  const [dispatches] = useState<DispatchItem[]>([
    {
      id: 'disp-1',
      creator_name: 'Pooja Verma',
      handle: 'pooja.lifestyle',
      city: 'Mumbai',
      campaign: 'Vitamin C Glow Serum Launch',
      sample_choice: 'Vitamin C Serum (30ml) • Shade Glowing Dew',
      courier_partner: 'Delhivery',
      awb_number: 'DEL918237192',
      status: 'Delivered',
      dispatched_at: '2026-03-22',
    },
    {
      id: 'disp-2',
      creator_name: 'Rohan Malhotra',
      handle: 'rohan_fitness',
      city: 'Delhi',
      campaign: 'Vitamin C Glow Serum Launch',
      sample_choice: 'Vitamin C Face Wash (100ml)',
      courier_partner: 'Shiprocket / BlueDart',
      awb_number: 'BLU827361920',
      status: 'Out for Delivery',
      dispatched_at: '2026-03-23',
    },
    {
      id: 'disp-3',
      creator_name: 'Simran Kaur',
      handle: 'simran.beautyvlogs',
      city: 'Chandigarh',
      campaign: 'Vitamin C Glow Serum Launch',
      sample_choice: 'Vitamin C Glow Combo Kit',
      courier_partner: 'Delhivery',
      awb_number: 'DEL882910291',
      status: 'In Transit',
      dispatched_at: '2026-03-24',
    },
  ])

  const [statusFilter, setStatusFilter] = useState<'all' | 'Delivered' | 'In Transit' | 'Out for Delivery' | 'Packed'>('all')

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
            render: (d) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-900 font-bold flex items-center justify-center shrink-0 text-xs">
                  {d.creator_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">{d.creator_name}</div>
                  <div className="text-[11px] text-pink-600 font-medium">@{d.handle} • {d.city}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'campaign',
            header: 'Campaign',
            sortable: true,
            render: (d) => (
              <span className="text-slate-800 text-xs font-medium">{d.campaign}</span>
            ),
          },
          {
            key: 'sample_choice',
            header: 'Product Sample Choice',
            render: (d) => (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs max-w-xs truncate">
                <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">{d.sample_choice}</span>
              </div>
            ),
          },
          {
            key: 'awb_number',
            header: 'Courier & Tracking AWB',
            sortable: true,
            render: (d) => (
              <div>
                <span className="font-mono text-xs font-bold text-slate-900 block">{d.awb_number}</span>
                <span className="text-[11px] text-slate-500">{d.courier_partner}</span>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Delivery Status',
            align: 'center',
            sortable: true,
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
                <span className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${colorClass}`}>
                  {d.status}
                </span>
              )
            },
          },
          {
            key: 'actions',
            header: 'Courier Tracking',
            align: 'right',
            sortable: false,
            render: (d) => (
              <a
                href={`https://www.delhivery.com/track/package/${d.awb_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-1.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Track Courier</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            ),
          },
        ]}
      />
    </div>
  )
}
