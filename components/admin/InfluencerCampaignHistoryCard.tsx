'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { 
  History, Sparkles, CheckCircle2, Clock, 
  ExternalLink, Layers, AlertCircle, TrendingUp, IndianRupee,
  Instagram, Youtube, Eye, ShieldCheck
} from 'lucide-react'

export interface InfluencerCampaignItem {
  application_id: string
  campaign_id: string
  brand_name: string
  campaign_code: string
  platform: string
  status: string
  budget_type?: string
  budget_amount?: number
  collab_date?: string
  completed_at?: string
  completion_deadline?: string
  is_overdue?: boolean
  is_delay_exempted?: boolean
  delay_exemption_reason?: string | null
  created_at: string
}

export interface InfluencerCampaignHistory {
  total_collaborations: number
  active_campaigns_count: number
  completed_campaigns_count: number
  is_first_collab: boolean
  active_campaigns: InfluencerCampaignItem[]
  past_campaigns: InfluencerCampaignItem[]
}

const statusBadgeColors: Record<string, { bg: string; text: string; border: string }> = {
  'Approved': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'Payment Initiated': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  'Under Process': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  'Under Review': { bg: 'bg-amber-500/15', text: 'text-amber-300', border: 'border-amber-500/30' },
  'Applied': { bg: 'bg-blue-500/15', text: 'text-blue-300', border: 'border-blue-500/30' },
  'Completed': { bg: 'bg-purple-500/15', text: 'text-purple-300', border: 'border-purple-500/30' },
  'Paid': { bg: 'bg-emerald-500/15', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  'Live': { bg: 'bg-rose-500/15', text: 'text-rose-300', border: 'border-rose-500/30' },
  'Rejected': { bg: 'bg-red-500/15', text: 'text-red-300', border: 'border-red-500/30' },
}

export function InfluencerCampaignHistoryCard({
  history,
  influencerName,
  compact = false,
}: {
  history?: InfluencerCampaignHistory | null
  influencerName?: string
  compact?: boolean
}) {
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active')

  if (!history) return null

  const activeCount = history.active_campaigns_count || 0
  const pastCount = history.completed_campaigns_count || 0
  const totalCount = history.total_collaborations || 0

  return (
    <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
      {/* Header with KPI chips */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <History className="h-4 w-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              Campaign Track Record & Workload
              {history.is_first_collab && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  ✨ 1st Collaboration
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-400">
              Shortlisting intelligence: Active campaigns ongoing vs past completed collabs
            </p>
          </div>
        </div>

        {/* Counter Pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] px-2.5 py-1 rounded-lg font-bold border flex items-center gap-1.5 ${
            activeCount > 0 
              ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
              : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          }`}>
            <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
            {activeCount} Active Ongoing
          </span>

          <span className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {pastCount} Completed
          </span>

          <span className="text-[11px] px-2.5 py-1 rounded-lg font-bold bg-slate-800 text-slate-300 border border-slate-700">
            Total {totalCount} Collabs
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'active'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>🔄 Active Campaigns</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
            activeTab === 'active' ? 'bg-indigo-800 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {activeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('past')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'past'
              ? 'bg-indigo-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <span>📜 Past / Completed History</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
            activeTab === 'past' ? 'bg-indigo-800 text-white' : 'bg-slate-800 text-slate-400'
          }`}>
            {pastCount}
          </span>
        </button>
      </div>

      {/* Active Tab Content */}
      {activeTab === 'active' && (
        <div className="space-y-2.5">
          {history.active_campaigns.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                <CheckCircle2 className="h-4 w-4" />
              </div>
              <div className="text-xs">
                <p className="font-bold text-emerald-300">Free Capacity / Available for Immediate Collab</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  This creator does not have other active campaigns in progress right now. They can fully focus on this project.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {history.active_campaigns.map((item) => {
                const badge = statusBadgeColors[item.status] || { bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' }
                return (
                  <div
                    key={item.application_id}
                    className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2 hover:border-indigo-500/40 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{item.brand_name}</span>
                          <span className="text-[10px] text-slate-500 font-mono">({item.campaign_code})</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {item.platform === 'YouTube' ? '📹 YouTube' : '📸 Instagram'}
                          {item.budget_amount ? ` • ₹${item.budget_amount.toLocaleString('en-IN')}` : item.budget_type ? ` • ${item.budget_type}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {item.status}
                        </span>
                        {item.is_delay_exempted ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1" title={item.delay_exemption_reason || 'Delay waived'}>
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Exempted
                          </span>
                        ) : item.is_overdue ? (
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            Overdue
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                      <span>Applied: {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      <Link
                        href={`/admin/applications/${item.campaign_id}`}
                        target="_blank"
                        onClick={(e) => e.stopPropagation()}
                        className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <span>View Campaign</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Past Completed Tab Content */}
      {activeTab === 'past' && (
        <div className="space-y-2.5">
          {history.past_campaigns.length === 0 ? (
            <div className="p-3.5 rounded-xl bg-slate-900 border border-white/10 text-center py-6">
              <p className="text-xs text-slate-400 font-semibold">No past completed campaigns on record.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Completed and closed collaborations will show here once finished.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {history.past_campaigns.map((item) => (
                <div
                  key={item.application_id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-white/10 space-y-2 hover:border-purple-500/40 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">{item.brand_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({item.campaign_code})</span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        {item.platform === 'YouTube' ? '📹 YouTube' : '📸 Instagram'}
                        {item.budget_amount ? ` • ₹${item.budget_amount.toLocaleString('en-IN')}` : item.budget_type ? ` • ${item.budget_type}` : ''}
                      </p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      {item.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-white/5">
                    <span>Done: {new Date(item.completed_at || item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <Link
                      href={`/admin/applications/${item.campaign_id}`}
                      target="_blank"
                      onClick={(e) => e.stopPropagation()}
                      className="text-purple-400 hover:text-purple-300 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <span>Collab Details</span>
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
