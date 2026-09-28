'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Award, Zap, Target, Flame, ArrowUpRight, CheckCircle2, ChevronRight, User } from 'lucide-react'
import { PocPodiumSkeleton } from './PocSkeletons'

interface PodiumMember {
  id: string
  name: string
  email: string
  roleDisplayName: string
  avatarUrl: string | null
  campaignCount: number
  totalApplications: number
  approvedCount: number
  completedCount: number
  completionRate: number
  totalPaid: number
  wowGrowth: number
  bestDay: string
}

interface PeakDayInfo {
  date: string
  label: string
  approvals: number
  payouts: number
}

interface PocLeaderboardProps {
  topApprover: PodiumMember | null
  bestCompletion: PodiumMember | null
  topVolume: PodiumMember | null
  peakDay: PeakDayInfo | null
  onSelectPoc?: (pocId: string) => void
  loading?: boolean
}

export function PocLeaderboard({
  topApprover,
  bestCompletion,
  topVolume,
  peakDay,
  onSelectPoc,
  loading = false,
}: PocLeaderboardProps) {
  if (loading) {
    return <PocPodiumSkeleton />
  }

  return (
    <div className="space-y-4">
      {/* 1. Peak Performance Day Banner */}
      {peakDay && peakDay.approvals > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-slate-900/60 p-4 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-inner">
              <Flame className="h-5 w-5 text-amber-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Peak Velocity Day
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-500/30 font-semibold">
                  Team Record
                </span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">
                {peakDay.label}: <span className="text-amber-300 font-bold">{peakDay.approvals} creators approved</span>
                {peakDay.payouts > 0 && (
                  <span className="text-slate-400 font-normal">
                    {' '}• ₹{(peakDay.payouts / 1000).toFixed(1)}k payouts cleared
                  </span>
                )}
              </p>
            </div>
          </div>
          <span className="text-xs text-amber-400/80 font-medium self-end sm:self-center">
            Highest throughput of this period
          </span>
        </motion.div>
      )}

      {/* 2. Top Performers Podium Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 🥇 Top Approver */}
        {topApprover && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onClick={() => onSelectPoc?.(topApprover.id)}
            className="rounded-2xl border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 p-5 shadow-xl hover:border-amber-400/50 hover:shadow-amber-500/10 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
            
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🥇</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                    Top Approver
                  </span>
                  <p className="text-xs text-slate-400">Highest Creator Approvals</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                {topApprover.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-amber-200 transition-colors">
                  {topApprover.name}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">{topApprover.roleDisplayName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] text-xs">
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Approved</p>
                <p className="text-lg font-extrabold text-white">{topApprover.approvedCount}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Best Day</p>
                <p className="text-xs font-semibold text-amber-300 truncate mt-1">
                  {topApprover.bestDay}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* 🎯 Best Completion Rate */}
        {bestCompletion && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            onClick={() => onSelectPoc?.(bestCompletion.id)}
            className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 p-5 shadow-xl hover:border-emerald-400/50 hover:shadow-emerald-500/10 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">🎯</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider">
                    Execution Master
                  </span>
                  <p className="text-xs text-slate-400">Best Completion Rate</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                {bestCompletion.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-emerald-200 transition-colors">
                  {bestCompletion.name}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">{bestCompletion.roleDisplayName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] text-xs">
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Completion Rate</p>
                <p className="text-lg font-extrabold text-emerald-300">
                  {bestCompletion.completionRate}%
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Finished</p>
                <p className="text-xs font-semibold text-slate-200 mt-1">
                  {bestCompletion.completedCount} / {bestCompletion.approvedCount} apps
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ⚡ Volume Leader */}
        {topVolume && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            onClick={() => onSelectPoc?.(topVolume.id)}
            className="rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 p-5 shadow-xl hover:border-indigo-400/50 hover:shadow-indigo-500/10 transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />

            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                    Volume Leader
                  </span>
                  <p className="text-xs text-slate-400">Total Applications Handled</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-300 group-hover:translate-x-0.5 transition-all" />
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-sm flex items-center justify-center shadow-md">
                {topVolume.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate group-hover:text-indigo-200 transition-colors">
                  {topVolume.name}
                </h4>
                <p className="text-[11px] text-slate-400 truncate">{topVolume.roleDisplayName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-white/[0.06] text-xs">
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Total Apps</p>
                <p className="text-lg font-extrabold text-white">{topVolume.totalApplications}</p>
              </div>
              <div>
                <p className="text-slate-500 text-[10px] uppercase">Active Campaigns</p>
                <p className="text-xs font-semibold text-indigo-300 mt-1">
                  {topVolume.campaignCount} Campaigns
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
