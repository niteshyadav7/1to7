'use client'

import React, { useState, useEffect, useCallback, useMemo, useDeferredValue, useRef } from 'react'
import Link from 'next/link'
import {
  Users,
  ArrowRight,
  Clock,
  CheckCircle2,
  Search,
  Sparkles,
  Loader2,
  FolderKanban,
  RefreshCw,
} from 'lucide-react'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'
import { EllipsisTooltip } from '@/components/brand/EllipsisTooltip'
import { toast } from 'sonner'
import { brandCache } from '@/lib/brand-cache'
import { useBrandSearch } from '@/components/brand/BrandSearchContext'

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
  const [campaigns, setCampaigns] = useState<CampaignItem[]>(() => brandCache.get<CampaignItem[]>('brand_campaigns') || [])
  const [loading, setLoading] = useState(() => (brandCache.get<CampaignItem[]>('brand_campaigns') || []).length === 0)
  const [statusTab, setStatusTab] = useState<'all' | 'awaiting' | 'approved'>('all')
  const [refreshing, setRefreshing] = useState(false)
  const { searchQuery, setSearchQuery, setPlaceholder } = useBrandSearch()

  useEffect(() => {
    setPlaceholder('Search campaign title, code, category, platform...')
  }, [setPlaceholder])

  const deferredSearch = useDeferredValue(searchQuery)

  const isFetchingRef = useRef(false)
  const lastFetchTimeRef = useRef<number>(0)

  const fetchCampaigns = useCallback(async (silent = false) => {
    if (isFetchingRef.current) return
    const now = Date.now()
    if (silent && now - lastFetchTimeRef.current < 20000) return

    isFetchingRef.current = true
    lastFetchTimeRef.current = now

    try {
      if (!silent) setLoading(true)
      else setRefreshing(true)
      const res = await fetch('/api/brand/campaigns', { cache: 'no-store' })
      const data = await res.json()
      if (res.ok && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns)
        brandCache.set('brand_campaigns', data.campaigns)
      } else {
        setCampaigns([])
      }
    } catch {
      if (!silent) toast.error('Network error loading brand campaigns')
    } finally {
      isFetchingRef.current = false
      if (!silent) setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const initialList = brandCache.get<CampaignItem[]>('brand_campaigns') || []
    fetchCampaigns(initialList.length > 0)

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

  const filteredCampaigns = useMemo(() => {
    let list = campaigns
    if (statusTab === 'awaiting') {
      list = list.filter((c) => (Number(c.pending_review) || 0) > 0)
    } else if (statusTab === 'approved') {
      list = list.filter((c) => (Number(c.approved) || 0) > 0)
    }
    if (!deferredSearch.trim()) return list
    const q = deferredSearch.toLowerCase()
    return list.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.campaign_code?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.platform?.toLowerCase().includes(q)
    )
  }, [campaigns, statusTab, deferredSearch])

  return (
    <div
      className="space-y-3 pb-20 font-sans text-slate-900"
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* Active Search Filter Banner */}
      {searchQuery && (
        <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-50/80 border border-emerald-200/80 rounded-lg text-xs text-emerald-950">
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Searching for &ldquo;<strong>{searchQuery}</strong>&rdquo; • {filteredCampaigns.length} campaign{filteredCampaigns.length === 1 ? '' : 's'} found
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

      {/* ─── GENTELELLA ZERO-GRID CAMPAIGNS DATA TABLE ─── */}
      <DynamicDataTable<CampaignItem>
        theme="light"
        keyField="id"
        tableLayout="fixed"
        loading={loading}
        hideSearch={true}
        emptyMessage={
          statusTab !== 'all'
            ? `No campaigns found with ${statusTab} applications.`
            : 'No active campaigns found. When creator applications are pitched for your campaigns, they will appear here.'
        }
        data={filteredCampaigns}
        exportFilename="thehype_brand_campaigns.csv"
        controlsLeft={
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            {/* Status Filter Tabs / Pills */}
            <div className="inline-flex items-center p-0.5 rounded-none bg-slate-100 border border-slate-200/80 gap-1 overflow-x-auto scrollbar-none">
              {[
                { key: 'all', label: 'All', count: totals.campaigns },
                { key: 'awaiting', label: 'Awaiting', count: totals.pending },
                { key: 'approved', label: 'Approved', count: totals.approved },
              ].map((tab) => {
                const isActive = statusTab === tab.key
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusTab(tab.key as any)}
                    className={`px-2.5 py-1 rounded-none text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isActive
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? tab.key === 'awaiting'
                            ? 'bg-amber-500 text-white'
                            : tab.key === 'approved'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-[#10b981] text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => fetchCampaigns(true)}
              disabled={refreshing}
              title="Refresh live campaigns"
              className="p-1.5 rounded-none bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        }
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
                  <span className="font-bold text-[#D83B1C] text-[10px] px-2 py-0.5 rounded-md bg-[#FFF2EF] border border-[#10b981]/30 inline-flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5 text-[#10b981]" />
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
                  className="h-6 px-2.5 rounded-md bg-[#10b981] hover:bg-[#047857] text-white font-bold text-[10px] shadow-sm shadow-[#10b981]/20 transition inline-flex items-center gap-1 cursor-pointer"
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
