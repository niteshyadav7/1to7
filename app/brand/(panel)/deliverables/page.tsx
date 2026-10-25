'use client'

import React, { useState } from 'react'
import {
  Video,
  CheckCircle2,
  Clock,
  ExternalLink,
  RotateCcw,
  Check,
  Instagram,
  Eye,
  AlertCircle,
  Sparkles,
} from 'lucide-react'
import { toast } from 'sonner'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'

interface DeliverableItem {
  id: string
  creator_name: string
  handle: string
  followers: string
  campaign: string
  reel_url: string
  submitted_at: string
  status: 'pending_brand_review' | 'approved' | 'revision_requested'
  views_estimate: string
}

export default function BrandDeliverablesPage() {
  const [items, setItems] = useState<DeliverableItem[]>([
    {
      id: 'deliv-1',
      creator_name: 'Pooja Verma',
      handle: 'pooja.lifestyle',
      followers: '125K',
      campaign: 'Vitamin C Glow Serum Launch',
      reel_url: 'https://www.instagram.com/reel/C8qL2kXp9/',
      submitted_at: '2 hours ago',
      status: 'pending_brand_review',
      views_estimate: '45.2K Views',
    },
    {
      id: 'deliv-2',
      creator_name: 'Simran Kaur',
      handle: 'simran.beautyvlogs',
      followers: '210K',
      campaign: 'Vitamin C Glow Serum Launch',
      reel_url: 'https://www.instagram.com/reel/C9aP9xL12/',
      submitted_at: '1 day ago',
      status: 'approved',
      views_estimate: '112.5K Views',
    },
  ])

  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_brand_review' | 'approved' | 'revision_requested'>('all')

  const handleApproveContent = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    )
    toast.success(`Content approved for ${name}! Payment queue unlocked automatically.`)
  }

  const handleRequestRevision = (id: string, name: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: 'revision_requested' } : item
      )
    )
    toast.info(`Revision requested from ${name}. Creator notified via 1to7 app.`)
  }

  const handleBulkApprove = (selected: DeliverableItem[]) => {
    const ids = new Set(selected.map((s) => s.id))
    setItems((prev) =>
      prev.map((item) => (ids.has(item.id) ? { ...item, status: 'approved' } : item))
    )
    toast.success(`Bulk approved ${selected.length} deliverables! Payouts unlocked.`)
  }

  const filteredItems = items.filter((item) => {
    if (statusFilter === 'pending_brand_review') return item.status === 'pending_brand_review'
    if (statusFilter === 'approved') return item.status === 'approved'
    if (statusFilter === 'revision_requested') return item.status === 'revision_requested'
    return true
  })

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          Content & Live Deliverables
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
          Review published Instagram Reels. Approving content automatically verifies deliverables and unlocks payout milestones.
        </p>
      </div>

      {/* Production Grade Dynamic Data Table */}
      <DynamicDataTable<DeliverableItem>
        theme="light"
        keyField="id"
        title="Live Reel Submissions"
        subtitle="Inspect published video links and release creator compensations"
        data={filteredItems}
        exportFilename="brand_deliverables.csv"
        searchPlaceholder="Search creator, handle, or campaign..."
        searchFields={['creator_name', 'handle', 'campaign']}
        filterTabs={{
          key: 'status',
          options: [
            { label: 'Pending Review', value: 'pending_brand_review', count: items.filter((i) => i.status === 'pending_brand_review').length },
            { label: 'Approved', value: 'approved', count: items.filter((i) => i.status === 'approved').length },
            { label: 'Revision Needed', value: 'revision_requested', count: items.filter((i) => i.status === 'revision_requested').length },
            { label: 'All Submissions', value: 'all', count: items.length },
          ],
          activeValue: statusFilter,
          onChange: (val) => setStatusFilter(val as any),
        }}
        bulkActions={[
          {
            label: 'Bulk Approve Deliverables',
            icon: Check,
            variant: 'default',
            onClick: handleBulkApprove,
          },
        ]}
        columns={[
          {
            key: 'creator_name',
            header: 'Creator & Profile',
            sortable: true,
            render: (item) => (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-slate-900 font-bold flex items-center justify-center shrink-0 text-xs">
                  {item.creator_name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">{item.creator_name}</div>
                  <a
                    href={`https://instagram.com/${item.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-pink-600 hover:text-pink-700 font-medium inline-flex items-center gap-1"
                  >
                    <Instagram className="w-3 h-3" /> @{item.handle} ({item.followers})
                  </a>
                </div>
              </div>
            ),
          },
          {
            key: 'campaign',
            header: 'Campaign',
            sortable: true,
            render: (item) => (
              <span className="text-slate-800 text-xs font-medium">{item.campaign}</span>
            ),
          },
          {
            key: 'reel_url',
            header: 'Instagram Reel',
            render: (item) => (
              <a
                href={item.reel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 text-xs font-semibold transition"
              >
                <Video className="w-3.5 h-3.5" />
                <span>Watch Reel</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            ),
          },
          {
            key: 'views_estimate',
            header: 'Performance Reach',
            sortable: true,
            render: (item) => (
              <div>
                <span className="font-bold text-slate-900 text-xs">{item.views_estimate}</span>
                <div className="text-[10px] text-slate-400">{item.submitted_at}</div>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Verification Status',
            align: 'center',
            sortable: true,
            render: (item) => (
              <span
                className={`text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                  item.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : item.status === 'revision_requested'
                    ? 'bg-amber-50 text-amber-800 border-amber-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
              >
                {item.status === 'approved' ? 'Approved' : item.status === 'revision_requested' ? 'Revision Needed' : 'Needs Review'}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Decision',
            align: 'right',
            sortable: false,
            render: (item) => (
              <div className="flex items-center justify-end gap-1.5">
                {item.status === 'pending_brand_review' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApproveContent(item.id, item.creator_name)}
                      className="px-3 py-1.5 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestRevision(item.id, item.creator_name)}
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : item.status === 'approved' ? (
                  <span className="text-emerald-700 font-semibold text-xs inline-flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApproveContent(item.id, item.creator_name)}
                    className="text-xs text-[#febd1c] hover:underline font-semibold cursor-pointer"
                  >
                    Approve Anyway
                  </button>
                )}
              </div>
            ),
          },
        ]}
      />
    </div>
  )
}
