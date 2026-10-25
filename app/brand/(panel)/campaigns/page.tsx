'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Users, 
  Search, 
  Filter, 
  Sparkles, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Video, 
  ChevronRight,
  ExternalLink,
  Layers
} from 'lucide-react'

interface CampaignItem {
  id: string
  campaign_code: string
  title: string
  platform: string
  budget_type: string
  category: string
  total_applied: number
  pending_review: number
  approved: number
  dispatched: number
  live_reels: number
  status: 'Active' | 'Review' | 'Closed'
}

export default function BrandCampaignsPage() {
  const [search, setSearch] = useState('')

  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      id: 'camp-1',
      campaign_code: 'ME-GLOW-2026',
      title: 'Vitamin C Glow Serum Launch',
      platform: 'Instagram Reels',
      budget_type: 'Barter + Commercial',
      category: 'Skincare / Beauty',
      total_applied: 48,
      pending_review: 12,
      approved: 28,
      dispatched: 22,
      live_reels: 16,
      status: 'Active',
    },
    {
      id: 'camp-2',
      campaign_code: 'ME-ONION-REV',
      title: 'Onion Hair Oil Festive Campaign',
      platform: 'Instagram Reels',
      budget_type: 'Barter',
      category: 'Haircare',
      total_applied: 34,
      pending_review: 6,
      approved: 20,
      dispatched: 18,
      live_reels: 10,
      status: 'Active',
    },
    {
      id: 'camp-3',
      campaign_code: 'ME-SUN-SPF50',
      title: 'Ultra Light Sunscreen Matte SPF 50',
      platform: 'Instagram Reels & Stories',
      budget_type: 'Commercial Paid',
      category: 'Sun Care',
      total_applied: 62,
      pending_review: 0,
      approved: 40,
      dispatched: 38,
      live_reels: 35,
      status: 'Active',
    },
  ])

  const filteredCampaigns = campaigns.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.campaign_code.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
            Brand Campaigns
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Select a campaign to enter the Creator Review Studio and take 1-click decisions.
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#febd1c] transition"
          />
        </div>
      </div>

      {/* Campaigns Grid (Mobile First Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredCampaigns.map((camp) => (
          <motion.div
            key={camp.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:border-slate-300 transition flex flex-col justify-between overflow-hidden"
          >
            {/* Top Bar */}
            <div className="p-5 border-b border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {camp.campaign_code}
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                  {camp.status}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#1a1c1c] leading-snug">
                  {camp.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {camp.category} • {camp.platform}
                </p>
              </div>
            </div>

            {/* Campaign Metrics Strip */}
            <div className="p-5 bg-slate-50/50 grid grid-cols-3 gap-2 text-center border-b border-slate-100">
              <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Pending</span>
                <span className="text-base font-bold text-amber-600">{camp.pending_review}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Approved</span>
                <span className="text-base font-bold text-emerald-600">{camp.approved}</span>
              </div>
              <div className="bg-white p-2 rounded-xl border border-slate-200/60">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Live Reels</span>
                <span className="text-base font-bold text-purple-600">{camp.live_reels}</span>
              </div>
            </div>

            {/* Action Footer */}
            <div className="p-4 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {camp.budget_type}
              </span>

              <Link
                href={`/brand/campaigns/${camp.id}/creators`}
                className="py-2 px-4 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>Creator Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
