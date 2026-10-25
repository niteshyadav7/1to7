'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  Users, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Video, 
  Layers,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'

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
  const [campaigns] = useState<CampaignItem[]>([
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

  return (
    <div className="space-y-6 font-sans">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Brand Campaigns
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Select a campaign to enter the Creator Review Studio and take 1-click decisions.
        </p>
      </div>

      {/* Production Grade Dynamic Data Table */}
      <DynamicDataTable<CampaignItem>
        theme="light"
        keyField="id"
        tableLayout="fixed"
        title="Active Campaigns Directory"
        subtitle="Sort by pending reviews to prioritize campaign approvals"
        data={campaigns}
        exportFilename="brand_campaigns.csv"
        searchPlaceholder="Search campaign title, code, category..."
        searchFields={['title', 'campaign_code', 'category', 'platform']}
        columns={[
          {
            key: 'title',
            header: 'Campaign & Category',
            sortable: true,
            width: '28%',
            render: (camp) => (
              <div className="py-0.5 max-w-full min-w-0">
                <div className="mb-1">
                  <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 inline-block">
                    {camp.campaign_code}
                  </span>
                </div>
                <div className="font-bold text-slate-900 text-xs sm:text-sm leading-tight truncate" title={camp.title}>
                  {camp.title}
                </div>
                <div className="text-slate-400 text-[11px] mt-0.5 truncate" title={`${camp.category} • ${camp.platform}`}>
                  {camp.category} • {camp.platform}
                </div>
              </div>
            ),
          },
          {
            key: 'pending_review',
            header: 'Pending Review',
            sortable: true,
            align: 'center',
            width: '13%',
            render: (camp) => (
              camp.pending_review > 0 ? (
                <span className="font-bold text-amber-800 text-xs px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3 text-amber-600" />
                  {camp.pending_review} Awaiting
                </span>
              ) : (
                <span className="text-slate-400 text-xs font-medium">All Reviewed</span>
              )
            ),
          },
          {
            key: 'approved',
            header: 'Approved',
            sortable: true,
            align: 'center',
            width: '10%',
            render: (camp) => (
              <span className="font-bold text-emerald-700 text-xs px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                {camp.approved}
              </span>
            ),
          },
          {
            key: 'dispatched',
            header: 'Dispatched',
            sortable: true,
            align: 'center',
            width: '11%',
            render: (camp) => (
              <span className="font-bold text-blue-700 text-xs px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200 inline-flex items-center gap-1">
                <Truck className="w-3 h-3 text-blue-500" />
                {camp.dispatched}
              </span>
            ),
          },
          {
            key: 'live_reels',
            header: 'Live Reels',
            sortable: true,
            align: 'center',
            width: '11%',
            render: (camp) => (
              <span className="font-bold text-purple-700 text-xs px-2.5 py-1 rounded-lg bg-purple-50 border border-purple-200 inline-flex items-center gap-1">
                <Video className="w-3 h-3 text-purple-500" />
                {camp.live_reels}
              </span>
            ),
          },
          {
            key: 'budget_type',
            header: 'Budget Model',
            width: '11%',
            render: (camp) => (
              <span className="text-xs text-slate-600 font-medium truncate block">{camp.budget_type}</span>
            ),
          },
          {
            key: 'status',
            header: 'Status',
            align: 'center',
            sortable: true,
            width: '8%',
            render: (camp) => (
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 whitespace-nowrap">
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
                className="py-1.5 px-3 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
              >
                <span>Creator Studio</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            ),
          },
        ]}
      />
    </div>
  )
}
