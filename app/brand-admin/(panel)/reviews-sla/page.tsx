'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  MessageCircle,
  Eye,
  Building2,
  Calendar,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'

interface SlaBatch {
  id: string
  brandName: string
  campaignName: string
  shortlistedCount: number
  submittedAt: string
  hoursElapsed: number
  status: 'on_track' | 'warning' | 'breached'
  brandContactName: string
  brandPhone: string
  brandEmail: string
  assignedKam: string
  brandId?: string
}

export default function ReviewSlaWatchtowerPage() {
  const [batches, setBatches] = useState<SlaBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'breached' | 'warning' | 'on_track'>('all')

  const fetchBatches = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/brand-admin/reviews-sla')
      const data = await res.json()
      if (res.ok && Array.isArray(data.batches)) {
        setBatches(data.batches)
      } else {
        setBatches([])
      }
    } catch {
      setBatches([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBatches()
  }, [])

  const handleSendWhatsAppNudge = (batch: SlaBatch) => {
    const text = encodeURIComponent(
      `Hi ${batch.brandContactName}! Your Account Team at TheHype.\n\nQuick heads-up: We submitted ${batch.shortlistedCount} shortlisted creators for ${batch.campaignName} ${batch.hoursElapsed} hours ago.\n\nPlease review and approve them so our logistics team can dispatch sample kits today: https://brand.thehype.in/brand/login\n\nThank you!`
    )
    window.open(`https://wa.me/${batch.brandPhone.replace('+', '')}?text=${text}`, '_blank')
    toast.success(`WhatsApp nudge prepared for ${batch.brandContactName}`)
  }

  const handleBulkWhatsAppNudge = (selected: SlaBatch[]) => {
    selected.forEach((b) => {
      window.open(
        `https://wa.me/${b.brandPhone.replace('+', '')}?text=${encodeURIComponent(
          `Hi ${b.brandContactName}, reminder from TheHype Team for ${b.campaignName} (${b.hoursElapsed}h elapsed)!`
        )}`,
        '_blank'
      )
    })
    toast.success(`Triggered bulk WhatsApp nudges for ${selected.length} client brand contacts!`)
  }

  const filteredBatches = batches.filter((b) => {
    if (statusFilter === 'breached') return b.status === 'breached'
    if (statusFilter === 'warning') return b.status === 'warning'
    if (statusFilter === 'on_track') return b.status === 'on_track'
    return true
  })

  const breachedBatches = batches.filter((b) => b.status === 'breached')
  const warningBatches = batches.filter((b) => b.status === 'warning')
  const onTrackBatches = batches.filter((b) => b.status === 'on_track')

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold mb-2">
          <Clock className="w-3 h-3" />
          SLA Accountability Engine
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
          Review SLA Watchtower
        </h1>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Monitor brand review bottlenecks in real-time. Follow up before courier dispatch windows close.
        </p>
      </div>

      {/* Summary KPI Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-[#121620] border border-red-500/30 flex items-center gap-3.5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400">SLA Breached (&gt;48h)</div>
            <div className="text-xl font-bold text-red-400">
              {breachedBatches.length} {breachedBatches.length === 1 ? 'Campaign' : 'Campaigns'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121620] border border-amber-500/30 flex items-center gap-3.5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400">Warning (&gt;24h)</div>
            <div className="text-xl font-bold text-amber-400">
              {warningBatches.length} {warningBatches.length === 1 ? 'Campaign' : 'Campaigns'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121620] border border-emerald-500/30 flex items-center gap-3.5 shadow-lg">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400">On Track (&lt;24h)</div>
            <div className="text-xl font-bold text-emerald-400">
              {onTrackBatches.length} {onTrackBatches.length === 1 ? 'Campaign' : 'Campaigns'}
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Data Table for SLA Batches */}
      <DynamicDataTable<SlaBatch>
        title="Live Brand Review Batches"
        subtitle="Sort by hours elapsed to identify critical bottlenecks or trigger WhatsApp escalations"
        loading={loading}
        emptyMessage="No pending review batches or SLA bottlenecks in database. All client brand reviews are caught up!"
        data={filteredBatches}
        exportFilename="sla_watchtower_report.csv"
        searchPlaceholder="Search brand, campaign, contact, or KAM..."
        filterTabs={{
          key: 'status',
          options: [
            { label: 'All Batches', value: 'all', count: batches.length },
            { label: 'Breached (>48h)', value: 'breached', count: batches.filter((b) => b.status === 'breached').length },
            { label: 'Warning (>24h)', value: 'warning', count: batches.filter((b) => b.status === 'warning').length },
            { label: 'On Track', value: 'on_track', count: batches.filter((b) => b.status === 'on_track').length },
          ],
          activeValue: statusFilter,
          onChange: (val) => setStatusFilter(val as any),
        }}
        bulkActions={[
          {
            label: 'Bulk WhatsApp Escalation',
            icon: MessageCircle,
            variant: 'emerald',
            onClick: handleBulkWhatsAppNudge,
          },
        ]}
        columns={[
          {
            key: 'brandName',
            header: 'Brand & Campaign',
            sortable: true,
            render: (batch) => (
              <div className="min-w-0">
                <div className="font-bold text-white text-[11px] flex items-center gap-1.5 truncate max-w-[160px]" title={batch.brandName}>
                  <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">{batch.brandName}</span>
                </div>
                <div className="text-neutral-400 text-[10px] mt-0.5 truncate max-w-[150px]" title={batch.campaignName}>
                  {batch.campaignName}
                </div>
              </div>
            ),
          },
          {
            key: 'shortlistedCount',
            header: 'Awaiting Decision',
            sortable: true,
            align: 'center',
            render: (batch) => (
              <span className="font-bold text-amber-400 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 whitespace-nowrap">
                {batch.shortlistedCount} Creators
              </span>
            ),
          },
          {
            key: 'hoursElapsed',
            header: 'Elapsed Time',
            sortable: true,
            align: 'center',
            render: (batch) => {
              const isBreached = batch.status === 'breached'
              const isWarning = batch.status === 'warning'
              return (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border whitespace-nowrap ${
                    isBreached
                      ? 'bg-red-500/20 text-red-300 border-red-500/30'
                      : isWarning
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  <Clock className="w-2.5 h-2.5 shrink-0" />
                  <span>{batch.hoursElapsed}h</span>
                </div>
              )
            },
          },
          {
            key: 'brandContactName',
            header: 'Brand Contact',
            sortable: true,
            render: (batch) => (
              <div className="min-w-0">
                <div className="text-white text-[11px] font-semibold truncate max-w-[130px]">{batch.brandContactName}</div>
                <div className="text-[10px] text-neutral-500 font-mono truncate">{batch.brandPhone}</div>
              </div>
            ),
          },
          {
            key: 'assignedKam',
            header: 'Assigned KAM',
            sortable: true,
            render: (batch) => (
              <span className="text-[10px] text-neutral-300 px-1.5 py-0.2 rounded bg-white/5 border border-white/5 truncate block max-w-[110px]">
                {batch.assignedKam}
              </span>
            ),
          },
          {
            key: 'actions',
            header: 'Actions',
            align: 'right',
            sortable: false,
            render: (batch) => {
              const targetUrl = batch.brandId
                ? `/api/brand-admin/virtual-brand/impersonate?brandId=${encodeURIComponent(batch.brandId)}`
                : '/brand-admin/brands'

              return (
                <div className="flex items-center justify-end gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleSendWhatsAppNudge(batch)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] h-6 px-2 rounded-md shadow-sm"
                  >
                    <MessageCircle className="w-2.5 h-2.5 mr-1" />
                    Nudge
                  </Button>
                  <Link href={targetUrl}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] h-6 px-2 rounded-md"
                    >
                      <Eye className="w-2.5 h-2.5 mr-1" />
                      Proxy
                    </Button>
                  </Link>
                </div>
              )
            },
          },
        ]}
      />
    </div>
  )
}
