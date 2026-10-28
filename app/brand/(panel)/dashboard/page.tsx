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
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'
import { EllipsisTooltip } from '@/components/brand/EllipsisTooltip'

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
    pendingReview: 0,
    approvedCreators: 0,
    dispatchedSamples: 0,
    liveDeliverables: 0,
    totalCampaigns: 0,
  })

  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/brand/dashboard')
      .then((res) => res.json())
      .then((data) => {
        if (data.stats) setStats(data.stats)
        if (Array.isArray(data.campaigns)) setCampaigns(data.campaigns)
      })
      .catch((err) => console.error('Error loading dashboard data:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 font-sans">
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

      {/* ─── ACTIVE CAMPAIGNS PIPELINES TABLE ─── */}
      <DynamicDataTable<CampaignSummary>
        theme="light"
        keyField="id"
        tableLayout="fixed"
        loading={loading}
        emptyMessage="No campaigns active for this brand workspace yet. Pitch rosters and approved campaigns will appear here."
        title="Active Campaign Pipelines"
        subtitle="Review shortlisted creator profiles and dispatch status across active brand campaigns"
        data={campaigns}
        exportFilename="brand_dashboard_campaigns.csv"
        searchPlaceholder="Search campaign title, code, platform..."
        columns={[
          {
            key: 'title',
            header: 'Campaign & Category',
            sortable: true,
            width: '40%',
            render: (camp) => (
              <div className="py-0.5 max-w-full min-w-0">
                <div className="mb-0.5">
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                    {camp.campaign_code}
                  </span>
                </div>
                <EllipsisTooltip text={camp.title} subtext={`${camp.platform} • ${camp.budget_type}`}>
                  <div className="font-bold text-[#1a1c1c] text-[11px] leading-tight truncate cursor-default max-w-[240px]">
                    {camp.title}
                  </div>
                </EllipsisTooltip>
                <div className="text-slate-500 text-[10px] mt-0.5 truncate">
                  {camp.platform} • {camp.budget_type}
                </div>
              </div>
            ),
          },
          {
            key: 'pending_count',
            header: 'Pending Review',
            sortable: true,
            align: 'center',
            width: '18%',
            render: (camp) => (
              camp.pending_count > 0 ? (
                <span className="font-bold text-amber-800 text-[10px] px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 inline-flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                  {camp.pending_count} Awaiting
                </span>
              ) : (
                <span className="text-slate-400 text-[10px] font-medium">All Reviewed</span>
              )
            ),
          },
          {
            key: 'approved_count',
            header: 'Approved',
            sortable: true,
            align: 'center',
            width: '12%',
            render: (camp) => (
              <span className="font-bold text-emerald-700 text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200">
                {camp.approved_count}
              </span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            align: 'center',
            sortable: true,
            width: '12%',
            render: (camp) => (
              <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                {camp.status}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Review Studio',
            align: 'right',
            sortable: false,
            width: '18%',
            render: (camp) => (
              <Link
                href={`/brand/campaigns/${camp.id}/creators`}
                className="h-6 px-2 rounded-md bg-[#febd1c] hover:bg-[#e5a812] text-black font-bold text-[10px] shadow-xs transition inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <span>Review</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </Link>
            ),
          },
        ]}
      />
    </div>
  )
}
