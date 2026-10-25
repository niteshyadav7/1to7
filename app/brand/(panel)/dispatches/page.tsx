'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Truck,
  Package,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  Instagram,
  ArrowRight
} from 'lucide-react'

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
  const [search, setSearch] = useState('')

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

  const filtered = dispatches.filter(
    (d) =>
      d.creator_name.toLowerCase().includes(search.toLowerCase()) ||
      d.handle.toLowerCase().includes(search.toLowerCase()) ||
      d.awb_number.toLowerCase().includes(search.toLowerCase()) ||
      d.city.toLowerCase().includes(search.toLowerCase())
  )

  const statusColors: Record<string, string> = {
    'Delivered': 'bg-emerald-50 text-emerald-700 border-emerald-200',
    'Out for Delivery': 'bg-blue-50 text-blue-700 border-blue-200',
    'In Transit': 'bg-amber-50 text-amber-700 border-amber-200',
    'Packed': 'bg-slate-100 text-slate-700 border-slate-200',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            Sample Courier Dispatches
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time delivery tracking of product samples sent to approved creators.
          </p>
        </div>

        {/* Search */}
        <div className="w-full sm:w-64 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search creator, AWB, city..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#febd1c]"
          />
        </div>
      </div>

      {/* Dispatches List (Mobile First Cards) */}
      <div className="space-y-3">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-sm hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[#1a1c1c]">{item.creator_name}</h3>
                <span className="text-xs text-pink-600 font-semibold">@{item.handle}</span>
                <span className="text-xs text-slate-400">• {item.city}</span>
              </div>
              <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                <Package className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>{item.sample_choice}</span>
              </p>
              <p className="text-[11px] text-slate-400">
                Campaign: {item.campaign}
              </p>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 self-stretch md:self-auto border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
              <div className="text-left md:text-right">
                <span
                  className={`inline-block text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                    statusColors[item.status]
                  }`}
                >
                  {item.status}
                </span>
                <div className="text-[11px] text-slate-500 mt-1 font-mono">
                  {item.courier_partner}: <strong>{item.awb_number}</strong>
                </div>
              </div>

              <a
                href={`https://www.delhivery.com/track/package/${item.awb_number}`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <span>Live Courier Status</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
