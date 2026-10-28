'use client'

import React, { useState, useEffect, useCallback } from 'react'
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
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'
import { EllipsisTooltip } from '@/components/brand/EllipsisTooltip'

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
  const [items, setItems] = useState<DeliverableItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending_brand_review' | 'approved' | 'revision_requested'>('all')

  const fetchDeliverables = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/brand/deliverables')
      const data = await res.json()
      if (res.ok && Array.isArray(data.deliverables)) {
        setItems(data.deliverables)
      } else {
        setItems([])
      }
    } catch {
      toast.error('Network error loading deliverables')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDeliverables()
  }, [fetchDeliverables])

  const handleApproveContent = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/brand/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'approved' }),
      })
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
        )
        toast.success(`Content approved for ${name}! Payment queue unlocked automatically.`)
      } else {
        toast.error('Failed to approve content')
      }
    } catch {
      toast.error('Error approving content')
    }
  }

  const handleRequestRevision = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/brand/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'revision_requested' }),
      })
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) =>
            item.id === id ? { ...item, status: 'revision_requested' } : item
          )
        )
        toast.info(`Revision requested from ${name}. Creator notified via 1to7 app.`)
      } else {
        toast.error('Failed to request revision')
      }
    } catch {
      toast.error('Error requesting revision')
    }
  }

  const handleBulkApprove = async (selected: DeliverableItem[]) => {
    try {
      const ids = selected.map((s) => s.id)
      const res = await fetch('/api/brand/deliverables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status: 'approved' }),
      })
      if (res.ok) {
        const idSet = new Set(ids)
        setItems((prev) =>
          prev.map((item) => (idSet.has(item.id) ? { ...item, status: 'approved' } : item))
        )
        toast.success(`Bulk approved ${selected.length} deliverables! Payouts unlocked.`)
      } else {
        toast.error('Failed to bulk approve deliverables')
      }
    } catch {
      toast.error('Error bulk approving deliverables')
    }
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
        tableLayout="fixed"
        loading={loading}
        emptyMessage="No live deliverables submitted yet. Once creators publish and submit their reels, they will appear here for review."
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
            width: '26%',
            render: (item) => (
              <div className="flex items-center gap-2 min-w-0 max-w-full">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-slate-900 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {item.creator_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1 overflow-hidden">
                  <EllipsisTooltip text={item.creator_name} subtext={`@${item.handle} (${item.followers})`}>
                    <div className="font-bold text-slate-900 text-[11px] truncate cursor-default max-w-[140px]">
                      {item.creator_name}
                    </div>
                  </EllipsisTooltip>
                  <a
                    href={`https://instagram.com/${item.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-pink-600 hover:text-pink-700 font-medium inline-flex items-center gap-0.5 truncate max-w-[120px]"
                  >
                    <Instagram className="w-2.5 h-2.5 shrink-0" />
                    <span className="truncate">@{item.handle} ({item.followers})</span>
                  </a>
                </div>
              </div>
            ),
          },
          {
            key: 'campaign',
            header: 'Campaign',
            sortable: true,
            width: '20%',
            render: (item) => (
              <EllipsisTooltip text={item.campaign} subtext="Brand Campaign">
                <div className="truncate text-slate-800 text-[10px] font-medium max-w-full cursor-default">
                  {item.campaign}
                </div>
              </EllipsisTooltip>
            ),
          },
          {
            key: 'reel_url',
            header: 'Instagram Reel',
            width: '15%',
            render: (item) => (
              <a
                href={item.reel_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-50 border border-pink-200 text-pink-700 hover:bg-pink-100 text-[10px] font-semibold transition max-w-full"
              >
                <Video className="w-3 h-3 shrink-0" />
                <span className="truncate">Watch</span>
                <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
              </a>
            ),
          },
          {
            key: 'views_estimate',
            header: 'Performance Reach',
            sortable: true,
            width: '13%',
            render: (item) => (
              <div className="truncate">
                <span className="font-bold text-slate-900 text-[11px]">{item.views_estimate}</span>
                <div className="text-[9px] text-slate-400">{item.submitted_at}</div>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Verification Status',
            align: 'center',
            sortable: true,
            width: '12%',
            render: (item) => (
              <span
                className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full border whitespace-nowrap ${
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
            width: '14%',
            render: (item) => (
              <div className="flex items-center justify-end gap-1">
                {item.status === 'pending_brand_review' ? (
                  <>
                    <button
                      type="button"
                      onClick={() => handleApproveContent(item.id, item.creator_name)}
                      className="h-6 px-2 rounded-md bg-[#febd1c] hover:bg-[#e5a812] text-black font-bold text-[10px] shadow-xs transition flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>Approve</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestRevision(item.id, item.creator_name)}
                      className="h-6 w-6 rounded-md border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer"
                      title="Request Revision"
                    >
                      <RotateCcw className="w-3 h-3" />
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
