'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Clock,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  MessageCircle,
  Eye,
  ExternalLink,
  ChevronRight,
  Building2,
  Calendar,
  Send,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

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
}

const MOCK_SLA_BATCHES: SlaBatch[] = [
  {
    id: 'batch-1',
    brandName: 'Plum Goodness',
    campaignName: 'Vitamin C Serum Launch (Diwali Edition)',
    shortlistedCount: 6,
    submittedAt: '23 Oct 2026, 09:30 PM',
    hoursElapsed: 52,
    status: 'breached',
    brandContactName: 'Rahul Sen',
    brandPhone: '+919876543210',
    brandEmail: 'rahul@plumgoodness.com',
    assignedKam: 'Nitesh Yadav (Senior Ops)',
  },
  {
    id: 'batch-2',
    brandName: 'Mamaearth',
    campaignName: 'Rosemary Anti-Hair Fall UGC Drive',
    shortlistedCount: 18,
    submittedAt: '24 Oct 2026, 06:15 PM',
    hoursElapsed: 31,
    status: 'warning',
    brandContactName: 'Ananya Sharma',
    brandPhone: '+919876543211',
    brandEmail: 'ananya@mamaearth.in',
    assignedKam: 'Pooja Verma (KAM)',
  },
  {
    id: 'batch-3',
    brandName: 'Sugar Cosmetics',
    campaignName: 'Matte Attack Lipstick Reels',
    shortlistedCount: 12,
    submittedAt: '25 Oct 2026, 04:00 PM',
    hoursElapsed: 9,
    status: 'on_track',
    brandContactName: 'Kavita Roy',
    brandPhone: '+919876543212',
    brandEmail: 'kavita@sugarcosmetics.com',
    assignedKam: 'Pooja Verma (KAM)',
  },
]

export default function ReviewSlaWatchtowerPage() {
  const [batches] = useState<SlaBatch[]>(MOCK_SLA_BATCHES)

  const handleSendWhatsAppNudge = (batch: SlaBatch) => {
    const text = encodeURIComponent(
      `Hi ${batch.brandContactName}! Pooja here from 1to7 Media.\n\nQuick heads-up: We submitted ${batch.shortlistedCount} shortlisted creators for ${batch.campaignName} ${batch.hoursElapsed} hours ago.\n\nPlease review and approve them so our logistics team can dispatch sample kits today: https://1to7.media/brand/login\n\nThank you!`
    )
    window.open(`https://wa.me/${batch.brandPhone.replace('+', '')}?text=${text}`, '_blank')
    toast.success(`WhatsApp nudge prepared for ${batch.brandContactName}`)
  }

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
        <div className="p-4 rounded-2xl bg-[#121620] border border-red-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400">SLA Breached (&gt;48h)</div>
            <div className="text-xl font-bold text-red-400">1 Campaign (Plum)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121620] border border-amber-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400">Warning (&gt;24h)</div>
            <div className="text-xl font-bold text-amber-400">1 Campaign (Mamaearth)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#121620] border border-emerald-500/30 flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-neutral-400">On Track (&lt;24h)</div>
            <div className="text-xl font-bold text-emerald-400">1 Campaign (Sugar)</div>
          </div>
        </div>
      </div>

      {/* Batch Cards */}
      <div className="space-y-4">
        {batches.map((batch) => {
          const isBreached = batch.status === 'breached'
          const isWarning = batch.status === 'warning'

          return (
            <motion.div
              key={batch.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-5 rounded-2xl bg-[#121620] border transition-all shadow-xl ${
                isBreached
                  ? 'border-red-500/40 bg-red-950/10'
                  : isWarning
                  ? 'border-amber-500/30 bg-amber-950/10'
                  : 'border-white/10'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left Info */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm sm:text-base text-white">
                      {batch.brandName}
                    </span>
                    <span className="text-neutral-500">•</span>
                    <span className="text-xs text-neutral-300 font-medium">{batch.campaignName}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1 text-white font-medium">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      {batch.shortlistedCount} Creators Awaiting Decision
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                      Sent: {batch.submittedAt}
                    </span>
                    <span>•</span>
                    <span>KAM: {batch.assignedKam}</span>
                  </div>
                </div>

                {/* Right Status & Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Elapsed Hours Badge */}
                  <div
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 ${
                      isBreached
                        ? 'bg-red-500/20 text-red-300 border-red-500/30'
                        : isWarning
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>{batch.hoursElapsed}h Elapsed</span>
                  </div>

                  {/* WhatsApp Nudge */}
                  <Button
                    size="sm"
                    onClick={() => handleSendWhatsAppNudge(batch)}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-9 shadow"
                  >
                    <MessageCircle className="w-3.5 h-3.5 mr-1.5" />
                    WhatsApp Nudge
                  </Button>

                  {/* Virtual Brand Mode Proxy Button */}
                  <Link href={`/brand-admin/virtual-brand/${batch.brandName.toLowerCase().includes('plum') ? 'b-plum' : batch.brandName.toLowerCase().includes('sugar') ? 'b-sugar' : 'b-mamaearth'}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-xs h-9"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1.5" />
                      Proxy Review
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
