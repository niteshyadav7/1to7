'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { 
  Users, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Layers,
  Sparkles,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/brand/campaigns')
      const data = await res.json()
      if (res.ok && Array.isArray(data.campaigns)) {
        setCampaigns(data.campaigns)
      } else {
        setCampaigns([])
      }
    } catch {
      toast.error('Network error loading brand campaigns')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Creator Review Studio
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Review curated creator profiles, audience metrics, and commercial quotes pitched for your brand campaigns.
        </p>
      </div>

      {/* Production Grade Dynamic Data Table */}
      <DynamicDataTable<CampaignItem>
        theme="light"
        keyField="id"
        tableLayout="fixed"
        loading={loading}
        emptyMessage="No campaigns found for this brand workspace. Pitch rosters and approved campaigns will appear here."
        title="Active Campaigns Directory"
        subtitle="Select a campaign to inspect shortlisted creators and take 1-click decisions"
        data={campaigns}
        exportFilename="brand_campaigns.csv"
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
                <div className="text-slate-400 text-[10px] mt-0.5 truncate">
                  {camp.category} • {camp.platform}
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
            render: (camp) => (
              camp.pending_review > 0 ? (
                <span className="font-bold text-amber-800 text-[10px] px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 inline-flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 text-amber-600" />
                  {camp.pending_review} Awaiting
                </span>
              ) : (
                <span className="text-slate-400 text-[10px] font-medium">All Reviewed</span>
              )
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
                className="h-6 px-2.5 rounded-md bg-[#febd1c] hover:bg-[#e5a812] text-black font-bold text-[10px] shadow-xs transition inline-flex items-center gap-1 cursor-pointer"
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
