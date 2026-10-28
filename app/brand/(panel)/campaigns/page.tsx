'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import {
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Loader2,
  FolderKanban,
} from 'lucide-react'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'
import { EllipsisTooltip } from '@/components/brand/EllipsisTooltip'
import { toast } from 'sonner'

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
  dispatched?: number
  live_reels?: number
  status: 'Active' | 'Review' | 'Closed'
}

export default function BrandCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')

  const fetchCampaigns = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true)
      const res = await fetch('/api/brand/campaigns', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns)
      } else {
        setCampaigns([])
      }
    } catch {
      if (!silent) toast.error('Network error loading brand campaigns')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns(false)

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchCampaigns(true)
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [fetchCampaigns])

  const filteredCampaigns = useMemo(() => {
    if (!search.trim()) return campaigns
    const q = search.toLowerCase()
    return campaigns.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.campaign_code?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.platform?.toLowerCase().includes(q)
    )
  }, [campaigns, search])

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => ({
        campaigns: acc.campaigns + 1,
        pending: acc.pending + (Number(c.pending_review) || 0),
        approved: acc.approved + (Number(c.approved) || 0),
      }),
      { campaigns: 0, pending: 0, approved: 0 }
    )
  }, [campaigns])

  return (
    <div className="space-y-4 pb-20 font-sans text-slate-900">
      {/* ─── 1. COMPACT MOBILE-FIRST HERO + CONTROLS CARD ─── */}
      <div className="rounded-3xl bg-white border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 bg-gradient-to-br from-[#0F172A] via-[#1E1B4B] to-[#2E1035] text-white relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#F95738]/25 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#F95738] to-[#FF7659] text-white text-[9px] font-extrabold uppercase tracking-wider">
                <Sparkles className="h-2.5 w-2.5" />
                <span>Campaign Applications & Shortlists</span>
              </div>
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-tight">
                Creator Review Studio
              </h1>
              <p className="text-xs text-slate-300 leading-snug max-w-xl">
                Review creator applications pitched to your active campaigns and approve talent in 1 tap for sample dispatch.
              </p>
            </div>

            {/* 3-Column Summary KPI Pills */}
            <div className="grid grid-cols-3 gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-2xl bg-white/10 border border-white/10 text-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-slate-300 block">
                  Campaigns
                </span>
                <span className="text-sm sm:text-base font-black text-white">
                  {totals.campaigns}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-2xl bg-[#F95738]/25 border border-[#F95738]/40 text-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#FF9E8A] block">
                  Awaiting
                </span>
                <span className="text-sm sm:text-base font-black text-white">
                  {totals.pending}
                </span>
              </div>
              <div className="px-3 py-1.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 text-center">
                <span className="text-[9px] uppercase font-bold tracking-wider text-emerald-300 block">
                  Approved
                </span>
                <span className="text-sm sm:text-base font-black text-emerald-300">
                  {totals.approved}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & View Switcher Strip */}
        <div className="p-3 sm:p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search campaign title, code, category, platform..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#F95738] focus:bg-white transition-colors"
            />
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2">
            <span className="text-[11px] font-bold text-slate-500 sm:hidden">
              {filteredCampaigns.length} campaign{filteredCampaigns.length === 1 ? '' : 's'}
            </span>
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-[#F95738] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-[#F95738] shadow-xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>Table</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. CAMPAIGNS CONTENT (MOBILE-FIRST CARDS OR TABLE) ─── */}
      {loading ? (
        <div className="py-16 text-center space-y-2.5 bg-white rounded-3xl border border-slate-200 shadow-xs">
          <Loader2 className="h-7 w-7 animate-spin text-[#F95738] mx-auto" />
          <p className="text-xs text-slate-500 font-semibold">Loading active campaigns...</p>
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div className="py-16 text-center space-y-3 rounded-3xl bg-white border border-dashed border-slate-300 p-8">
          <div className="w-12 h-12 rounded-2xl bg-[#FFF2EF] border border-[#F95738]/25 flex items-center justify-center mx-auto text-[#F95738]">
            <FolderKanban className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No Active Campaigns Yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              When TheHype dispatches creator applications for your campaigns, they will appear here for 1-tap approval.
            </p>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredCampaigns.map((camp) => {
            const hasPending = camp.pending_review > 0
            return (
              <Link
                key={camp.id}
                href={`/brand/campaigns/${camp.id}/creators`}
                className="group rounded-3xl bg-white border border-slate-200/90 hover:border-[#F95738] hover:shadow-lg transition-all duration-200 flex flex-col justify-between overflow-hidden shadow-xs"
              >
                <div
                  className={`h-1.5 w-full bg-gradient-to-r ${
                    hasPending
                      ? 'from-[#F95738] via-orange-500 to-amber-500'
                      : 'from-emerald-500 via-teal-500 to-indigo-500'
                  }`}
                />

                <div className="p-4 sm:p-5 space-y-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                      {camp.campaign_code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/70">
                        {camp.budget_type || 'Barter'}
                      </span>
                      <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
                        {camp.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h2 className="font-extrabold text-sm sm:text-base text-slate-900 group-hover:text-[#F95738] transition-colors line-clamp-2">
                      {camp.title}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 flex items-center gap-1.5">
                      <span>{camp.category || 'General'}</span>
                      <span>•</span>
                      <span>{camp.platform || 'Instagram'}</span>
                    </p>
                  </div>

                  {/* 3-Column Metrics Strip */}
                  <div className="grid grid-cols-3 divide-x divide-slate-200/80 rounded-2xl bg-slate-50/90 border border-slate-200/80 py-2.5 px-1 text-center">
                    <div className="px-1.5">
                      <span className="text-[9px] uppercase font-extrabold tracking-wider text-slate-500 block">
                        Pitched
                      </span>
                      <span className="font-black text-slate-900 text-xs sm:text-sm mt-0.5 block">
                        {(Number(camp.pending_review) || 0) + (Number(camp.approved) || 0) || camp.total_applied || 0}
                      </span>
                    </div>

                    <div className="px-1.5">
                      <span className="text-[9px] uppercase font-extrabold tracking-wider text-[#D83B1C] block">
                        Awaiting
                      </span>
                      <span
                        className={`font-black text-xs sm:text-sm mt-0.5 block ${
                          hasPending ? 'text-[#F95738]' : 'text-slate-400'
                        }`}
                      >
                        {camp.pending_review || 0}
                      </span>
                    </div>

                    <div className="px-1.5">
                      <span className="text-[9px] uppercase font-extrabold tracking-wider text-emerald-600 block">
                        Approved
                      </span>
                      <span className="font-black text-emerald-600 text-xs sm:text-sm mt-0.5 block">
                        {camp.approved || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 sm:px-5 pb-4 pt-1">
                  <div
                    className={`w-full py-2.5 px-4 rounded-2xl font-extrabold text-xs flex items-center justify-between transition-all ${
                      hasPending
                        ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-sm shadow-[#F95738]/20'
                        : 'bg-slate-900 group-hover:bg-[#F95738] text-white'
                    }`}
                  >
                    <span>
                      {hasPending
                        ? `Review ${camp.pending_review} Pending Creator${camp.pending_review === 1 ? '' : 's'}`
                        : 'View Shortlisted Creators'}
                    </span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <DynamicDataTable<CampaignItem>
          theme="light"
          keyField="id"
          tableLayout="fixed"
          loading={loading}
          emptyMessage="No campaigns found for this brand workspace."
          title="Active Campaigns Directory"
          subtitle="Select a campaign to inspect shortlisted creators and take 1-click decisions"
          data={filteredCampaigns}
          exportFilename="thehype_brand_campaigns.csv"
          searchPlaceholder="Search campaign title, code, category..."
          searchFields={['title', 'campaign_code', 'category', 'platform']}
          columns={[
            {
              key: 'title',
              header: 'Campaign & Category',
              sortable: true,
              width: '36%',
              render: (camp) => (
                <div className="py-0.5 max-w-full min-w-0">
                  <div className="mb-0.5">
                    <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                      {camp.campaign_code}
                    </span>
                  </div>
                  <EllipsisTooltip text={camp.title} subtext={`${camp.category} • ${camp.platform}`}>
                    <div className="font-bold text-slate-900 text-[11px] leading-tight truncate cursor-default max-w-[240px]">
                      {camp.title}
                    </div>
                  </EllipsisTooltip>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5 truncate">
                    <span>{camp.category}</span>
                    <span>•</span>
                    <span>{camp.platform}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'budget_type',
              header: 'Budget Model',
              width: '16%',
              render: (camp) => (
                <span className="text-[10px] text-slate-600 font-semibold px-2 py-0.5 rounded bg-slate-100 border border-slate-200 inline-block truncate max-w-full">
                  {camp.budget_type || 'Barter'}
                </span>
              ),
            },
            {
              key: 'pending_review',
              header: 'Pending Review',
              sortable: true,
              align: 'center',
              width: '18%',
              render: (camp) =>
                camp.pending_review > 0 ? (
                  <span className="font-bold text-[#D83B1C] text-[10px] px-2 py-0.5 rounded-md bg-[#FFF2EF] border border-[#F95738]/30 inline-flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-[#F95738]" />
                    {camp.pending_review} Awaiting
                  </span>
                ) : (
                  <span className="text-slate-400 text-[10px] font-medium">All Reviewed</span>
                ),
            },
            {
              key: 'approved',
              header: 'Approved',
              sortable: true,
              align: 'center',
              width: '14%',
              render: (camp) => (
                <span className="font-bold text-emerald-700 text-[11px] px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 inline-flex items-center gap-1">
                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                  {camp.approved}
                </span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              align: 'center',
              sortable: true,
              width: '8%',
              render: (camp) => (
                <span className="text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 whitespace-nowrap">
                  {camp.status}
                </span>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              align: 'right',
              sortable: false,
              width: '8%',
              render: (camp) => (
                <Link
                  href={`/brand/campaigns/${camp.id}/creators`}
                  className="h-6 px-2.5 rounded-md bg-[#F95738] hover:bg-[#E04728] text-white font-bold text-[10px] shadow-sm shadow-[#F95738]/20 transition inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>Review</span>
                  <ArrowRight className="w-2.5 h-2.5" />
                </Link>
              ),
            },
          ]}
        />
      )}
    </div>
  )
}
