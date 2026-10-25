'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  Video,
  Download,
  Calendar,
  Sparkles,
  ArrowUpRight,
  FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'

export default function BrandAnalyticsPage() {
  const [dateRange, setDateRange] = useState('Last 30 Days')

  const metrics = [
    { title: 'Total Influencers Activated', value: '70', growth: '+28%', icon: Users },
    { title: 'Total Estimated Reach', value: '2.4M', growth: '+42%', icon: Eye },
    { title: 'Live Reels Published', value: '59', growth: '+15%', icon: Video },
    { title: 'Estimated Media Value (EMV)', value: '₹14.8L', growth: '+35%', icon: TrendingUp },
  ]

  const handleExport = () => {
    toast.success('Campaign Analytics report generated!')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            Campaign ROI & Analytics
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Real-time performance metrics, content engagement, and influencer ROI breakdown.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="py-2 px-3.5 rounded-xl bg-white border border-slate-200 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download Brand Report</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {metrics.map((m) => {
          const Icon = m.icon
          return (
            <div
              key={m.title}
              className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500">{m.title}</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-[#febd1c] flex items-center justify-center">
                  <Icon className="w-4 h-4 text-black" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#1a1c1c]">
                {m.value}
              </div>
              <span className="text-xs text-emerald-600 font-semibold mt-1 inline-flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span>{m.growth} this month</span>
              </span>
            </div>
          )
        })}
      </div>

      {/* Breakdown by City & Content Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <h3 className="font-bold text-base text-[#1a1c1c] mb-4">Top Influencer Demographics (Cities)</h3>
          <div className="space-y-3">
            {[
              { city: 'Mumbai', pct: '38%', count: '27 Creators' },
              { city: 'Delhi NCR', pct: '29%', count: '21 Creators' },
              { city: 'Bangalore', pct: '18%', count: '13 Creators' },
              { city: 'Chandigarh / Punjab', pct: '15%', count: '9 Creators' },
            ].map((c) => (
              <div key={c.city} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{c.city}</span>
                  <span className="text-slate-500">{c.count} ({c.pct})</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#febd1c] rounded-full"
                    style={{ width: c.pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/90 shadow-sm">
          <h3 className="font-bold text-base text-[#1a1c1c] mb-4">Content Formats Breakdown</h3>
          <div className="space-y-3">
            {[
              { type: 'Instagram 9:16 Reels', pct: '74%', count: '44 Live Reels' },
              { type: 'Product Carousel Posts', pct: '16%', count: '10 Posts' },
              { type: 'Instagram Stories (with Link Sticker)', pct: '10%', count: '6 Stories' },
            ].map((fmt) => (
              <div key={fmt.type} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{fmt.type}</span>
                  <span className="text-slate-500">{fmt.count}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#2d3132] rounded-full"
                    style={{ width: fmt.pct }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
