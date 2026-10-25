'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
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
  Sparkles
} from 'lucide-react'
import { toast } from 'sonner'

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
          Content & Live Deliverables
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          Review published Instagram Reels. Approving content automatically verifies deliverables and unlocks payout milestones.
        </p>
      </div>

      {/* Deliverables List (Mobile First Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        {items.map((item) => {
          const isPending = item.status === 'pending_brand_review'
          const isApproved = item.status === 'approved'

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between space-y-4 transition ${
                isApproved
                  ? 'border-emerald-200 bg-emerald-50/15'
                  : 'border-slate-200/90 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-base text-[#1a1c1c]">{item.creator_name}</h3>
                    <div className="flex items-center gap-2 text-xs text-pink-600 font-semibold mt-0.5">
                      <Instagram className="w-3.5 h-3.5" />
                      <span>@{item.handle} ({item.followers})</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${
                      isApproved
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : item.status === 'revision_requested'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {isApproved ? 'Approved' : item.status === 'revision_requested' ? 'Revision Needed' : 'Needs Review'}
                  </span>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  <p>Campaign: <strong>{item.campaign}</strong></p>
                  <p className="mt-0.5">Submitted: {item.submitted_at} • Est. Reach: {item.views_estimate}</p>
                </div>

                {/* Reel Link Button */}
                <div className="mt-4">
                  <a
                    href={item.reel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2"
                  >
                    <Video className="w-4 h-4 text-pink-600" />
                    <span>Watch Live Instagram Reel</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                {isPending ? (
                  <>
                    <button
                      onClick={() => handleApproveContent(item.id, item.creator_name)}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Approve Content</span>
                    </button>
                    <button
                      onClick={() => handleRequestRevision(item.id, item.creator_name)}
                      className="py-2 px-3 rounded-xl bg-white hover:bg-amber-50 border border-slate-200 text-amber-800 text-xs font-semibold transition flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Request Change</span>
                    </button>
                  </>
                ) : isApproved ? (
                  <div className="w-full py-2 px-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Content Verified & Payment Released</span>
                  </div>
                ) : (
                  <div className="w-full py-2 px-3 rounded-xl bg-amber-50 text-amber-800 text-xs font-semibold flex items-center justify-between">
                    <span>Revision instructions dispatched to creator</span>
                    <button
                      onClick={() => handleApproveContent(item.id, item.creator_name)}
                      className="text-xs underline text-amber-900 cursor-pointer"
                    >
                      Approve Anyway
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
