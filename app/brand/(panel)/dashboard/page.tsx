'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Users,
  CheckCircle2,
  Clock,
  Truck,
  Video,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Filter,
  Eye,
  Megaphone
} from 'lucide-react'

interface DashboardStats {
  pendingReview: number
  approvedCreators: number
  dispatchedSamples: number
  liveDeliverables: number
  totalCampaigns: number
}

interface CampaignSummary {
  id: string
  campaign_code: string
  title: string
  platform: string
  budget_type: string
  pending_count: number
  approved_count: number
  status: string
}

export default function BrandDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    pendingReview: 18,
    approvedCreators: 42,
    dispatchedSamples: 35,
    liveDeliverables: 24,
    totalCampaigns: 3,
  })

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([
    {
      id: 'camp-1',
      campaign_code: 'ME-GLOW-2026',
      title: 'Vitamin C Glow Serum Launch',
      platform: 'Instagram',
      budget_type: 'Barter + Paid',
      pending_count: 12,
      approved_count: 28,
      status: 'Active',
    },
    {
      id: 'camp-2',
      campaign_code: 'ME-ONION-REV',
      title: 'Onion Hair Oil Festive Campaign',
      platform: 'Instagram',
      budget_type: 'Barter',
      pending_count: 6,
      approved_count: 14,
      status: 'Active',
    },
  ])

  return (
    <div className="space-y-6">
      {/* ─── URGENT REVIEW ACTION BANNER ─── */}
      {stats.pendingReview > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm"
        >
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#febd1c] text-black font-bold shrink-0 mt-0.5">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#1a1c1c]">
                {stats.pendingReview} Shortlisted Creators Awaiting Your Decision
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                1to7 operations team has screened and shortlisted top creator profiles for your review.
              </p>
            </div>
          </div>

          <Link
            href="/brand/campaigns"
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#2d3132] hover:bg-black text-white text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2 shrink-0 shadow-sm cursor-pointer"
          >
            <span>Review Shortlist Now</span>
            <ArrowRight className="w-4 h-4 text-[#febd1c]" />
          </Link>
        </motion.div>
      )}

      {/* ─── 4 INLINE METRIC CARDS (Matching Creator Spec Tiles) ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Pending Review Tile */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-amber-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Needs Decision
            </span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1a1c1c]">
            {stats.pendingReview}
          </div>
          <p className="text-xs text-amber-600 mt-1 font-medium">
            Pending brand approval
          </p>
        </div>

        {/* Approved Creators Tile */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-emerald-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Approved
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1a1c1c]">
            {stats.approvedCreators}
          </div>
          <p className="text-xs text-emerald-600 mt-1 font-medium">
            Greenlit creators
          </p>
        </div>

        {/* Sample Dispatches Tile */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-blue-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Dispatched
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1a1c1c]">
            {stats.dispatchedSamples}
          </div>
          <p className="text-xs text-blue-600 mt-1 font-medium">
            Couriers in transit / delivered
          </p>
        </div>

        {/* Live Content Tile */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-sm hover:border-purple-300 transition">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Live Content
            </span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-[#1a1c1c]">
            {stats.liveDeliverables}
          </div>
          <p className="text-xs text-purple-600 mt-1 font-medium">
            Reels published & verified
          </p>
        </div>
      </div>

      {/* ─── ACTIVE CAMPAIGNS OVERVIEW SECTION ─── */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#1a1c1c]">
              Active Campaign Pipelines
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Select a campaign to review shortlisted creator profiles
            </p>
          </div>

          <Link
            href="/brand/campaigns"
            className="text-xs sm:text-sm font-semibold text-slate-600 hover:text-black flex items-center gap-1 transition"
          >
            <span>View All</span>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Campaigns List (Mobile Friendly Cards) */}
        <div className="divide-y divide-slate-100">
          {campaigns.map((camp) => (
            <div
              key={camp.id}
              className="p-4 sm:p-6 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {camp.campaign_code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                    {camp.status}
                  </span>
                  <span className="text-xs text-slate-400">• {camp.platform}</span>
                </div>
                <h4 className="text-base font-semibold text-[#1a1c1c]">
                  {camp.title}
                </h4>
                <p className="text-xs text-slate-500">
                  Model: {camp.budget_type}
                </p>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {camp.pending_count > 0 && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
                    {camp.pending_count} Pending Review
                  </div>
                )}

                <Link
                  href={`/brand/campaigns/${camp.id}/creators`}
                  className="px-4 py-2 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs sm:text-sm shadow-sm transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Review Creators</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
