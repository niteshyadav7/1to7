'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Users, Megaphone, FileText, IndianRupee,
  TrendingUp, Clock, CheckCircle2, XCircle, DollarSign,
  ArrowUpRight, ArrowDownRight, Activity, Loader2
} from 'lucide-react'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'

// ─── Types ─────────────────────────────────────────────────
interface AnalyticsData {
  stats: {
    totalInfluencers: number
    activeCampaigns: number
    totalApplications: number
    totalPaid: number
    totalPending: number
    totalRevenue: number
  }
  statusCounts: Record<string, number>
  topCampaigns: { name: string; count: number }[]
  recentActivity: { id: string; status: string; brand: string; updated_at: string; created_at: string }[]
  monthlyTrend: { month: string; count: number }[]
}

const statusColors: Record<string, { bg: string; text: string; bar: string }> = {
  'Applied': { bg: 'bg-blue-500/15', text: 'text-blue-400', bar: 'bg-blue-500' },
  'Approved': { bg: 'bg-emerald-500/15', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  'Rejected': { bg: 'bg-red-500/15', text: 'text-red-400', bar: 'bg-red-500' },
  'Completed': { bg: 'bg-purple-500/15', text: 'text-purple-400', bar: 'bg-purple-500' },
  'Payment Initiated': { bg: 'bg-amber-500/15', text: 'text-amber-400', bar: 'bg-amber-500' },
}

// ─── Helpers ───────────────────────────────────────────────
function timeAgo(dateStr: string) {
  const now = new Date(); const date = new Date(dateStr)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays}d ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`
  return `₹${amount.toLocaleString()}`
}

// ─── StatCard ──────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, gradient, shadow, delay }: {
  label: string; value: string; icon: React.ElementType; gradient: string; shadow: string; delay: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`rounded-2xl border border-white/[0.06] bg-slate-900/40 backdrop-blur-sm p-5 shadow-lg ${shadow} hover:shadow-xl transition-shadow`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold">
          <ArrowUpRight className="h-3 w-3" />
          Active
        </div>
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold">{label}</p>
    </motion.div>
  )
}

// ─── BarChart (Pure CSS) ───────────────────────────────────
function BarChart({ data, maxVal }: { data: { label: string; value: number; color: string }[]; maxVal: number }) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <motion.div key={item.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-400 truncate max-w-[60%]">{item.label}</span>
            <span className="text-xs font-bold text-white">{item.value}</span>
          </div>
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${maxVal > 0 ? (item.value / maxVal) * 100 : 0}%` }}
              transition={{ delay: i * 0.05 + 0.2, duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full ${item.color}`}
            />
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ─── DonutChart (Pure CSS) ─────────────────────────────────
function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <p className="text-sm text-slate-500 text-center">No data</p>

  const { segments } = data.reduce((acc, d) => {
    const pct = (d.value / total) * 100
    const start = acc.cumulative
    acc.segments.push({ ...d, pct, start })
    acc.cumulative += pct
    return acc
  }, { segments: [] as any[], cumulative: 0 })

  // Build conic gradient
  const gradientParts = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ')

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative w-36 h-36">
        <div
          className="w-full h-full rounded-full"
          style={{ background: `conic-gradient(${gradientParts})` }}
        />
        <div className="absolute inset-3 rounded-full bg-slate-900 flex items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{total}</p>
            <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold">Total</p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 justify-center">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-sm`} style={{ backgroundColor: s.color }} />
            <span className="text-[11px] text-slate-400">{s.label}</span>
            <span className="text-[11px] font-bold text-white">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Monthly Trend Chart (CSS Bars) ────────────────────────
function TrendChart({ data }: { data: { month: string; count: number }[] }) {
  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((d, i) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1.5">
          <span className="text-[10px] text-slate-400 font-bold">{d.count}</span>
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: `${(d.count / max) * 100}%` }}
            transition={{ delay: i * 0.08 + 0.3, duration: 0.5, ease: 'easeOut' }}
            className="w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-lg min-h-[4px]"
          />
          <span className="text-[9px] text-slate-500 font-bold">{d.month}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<AnalyticsData | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/admin/analytics')
      const json = await res.json()
      setData(json)
    } catch {
      toast.error('Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  if (loading || !data) return <GlobalLoader text="Loading Analytics..." />

  const { stats, statusCounts, topCampaigns, recentActivity, monthlyTrend } = data

  // Status chart data
  const statusChartData = Object.entries(statusCounts).map(([label, value]) => ({
    label,
    value,
    color: statusColors[label]?.bar || '#64748b',
  }))

  // Top campaigns chart data
  const topCampaignMax = topCampaigns.length > 0 ? topCampaigns[0].count : 1
  const topCampaignData = topCampaigns.map((c, i) => ({
    label: c.name,
    value: c.count,
    color: ['bg-indigo-500', 'bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500'][i] || 'bg-slate-500',
  }))

  // Revenue breakdown for donut
  const revenueDonut = [
    { label: 'Paid', value: stats.totalPaid, color: '#10b981' },
    { label: 'Pending', value: stats.totalPending, color: '#f59e0b' },
  ]

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 shadow-lg shadow-violet-500/20">
            <BarChart3 className="h-4.5 w-4.5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Analytics</h1>
        </div>
        <p className="text-sm text-slate-500 mt-1 ml-[3px]">Platform overview and performance metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Influencers" value={stats.totalInfluencers.toLocaleString()} icon={Users}
          gradient="from-blue-600 to-blue-500" shadow="shadow-blue-500/5" delay={0} />
        <StatCard label="Active Campaigns" value={stats.activeCampaigns.toLocaleString()} icon={Megaphone}
          gradient="from-purple-600 to-purple-500" shadow="shadow-purple-500/5" delay={0.05} />
        <StatCard label="Total Applications" value={stats.totalApplications.toLocaleString()} icon={FileText}
          gradient="from-cyan-600 to-cyan-500" shadow="shadow-cyan-500/5" delay={0.1} />
        <StatCard label="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={IndianRupee}
          gradient="from-emerald-600 to-emerald-500" shadow="shadow-emerald-500/5" delay={0.15} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Application Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 rounded-2xl border border-white/[0.06] bg-slate-900/40 p-5"
        >
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Application Trend</h3>
            </div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Last 6 Months</span>
          </div>
          <TrendChart data={monthlyTrend} />
        </motion.div>

        {/* Revenue Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <IndianRupee className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Revenue Split</h3>
          </div>
          <DonutChart data={revenueDonut} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Total Paid</p>
              <p className="text-base font-bold text-emerald-400">{formatCurrency(stats.totalPaid)}</p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
              <p className="text-[9px] text-slate-500 uppercase tracking-wider font-bold mb-0.5">Pending</p>
              <p className="text-base font-bold text-amber-400">{formatCurrency(stats.totalPending)}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <Activity className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-white">Status Distribution</h3>
          </div>
          <div className="space-y-3">
            {statusChartData.map((s, i) => {
              const total = statusChartData.reduce((sum, d) => sum + d.value, 0)
              const pct = total > 0 ? ((s.value / total) * 100).toFixed(0) : 0
              return (
                <motion.div key={s.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.35 }}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: s.color }} />
                      <span className="text-xs text-slate-400">{s.label}</span>
                    </div>
                    <span className="text-xs font-bold text-white">{s.value} <span className="text-slate-500 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.05 + 0.45, duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Top Campaigns */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <Megaphone className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Top Campaigns</h3>
          </div>
          {topCampaigns.length > 0 ? (
            <div className="space-y-3">
              {topCampaigns.map((c, i) => (
                <motion.div key={c.name} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 + 0.4 }}
                  className="flex items-center gap-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[11px] font-bold text-white shrink-0 ${
                    ['bg-indigo-500', 'bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500'][i] || 'bg-slate-500'
                  }`}>
                    #{i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{c.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(c.count / topCampaignMax) * 100}%` }}
                          transition={{ delay: i * 0.05 + 0.5, duration: 0.5 }}
                          className={`h-full rounded-full ${['bg-indigo-500', 'bg-purple-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500'][i] || 'bg-slate-500'}`}
                        />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400 shrink-0">{c.count}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No campaign data yet</p>
          )}
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl border border-white/[0.06] bg-slate-900/40 p-5"
        >
          <div className="flex items-center gap-2 mb-5">
            <Clock className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Recent Activity</h3>
          </div>
          {recentActivity.length > 0 ? (
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 custom-scrollbar">
              {recentActivity.map((a, i) => {
                const sc = statusColors[a.status] || { bg: 'bg-slate-500/15', text: 'text-slate-400', bar: '#64748b' }
                const statusIcon = a.status === 'Approved' ? CheckCircle2
                  : a.status === 'Rejected' ? XCircle
                  : a.status === 'Payment Initiated' ? DollarSign
                  : a.status === 'Completed' ? CheckCircle2
                  : FileText
                const StatusIcon = statusIcon
                return (
                  <motion.div key={a.id + i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 + 0.45 }}
                    className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-white/[0.02] transition-colors">
                    <div className={`mt-0.5 flex h-6 w-6 items-center justify-center rounded-lg shrink-0 ${sc.bg}`}>
                      <StatusIcon className={`h-3 w-3 ${sc.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-300 truncate">
                        <span className="font-semibold text-white">{a.brand}</span>
                        {' '}<span className={`${sc.text} font-medium`}>{a.status}</span>
                      </p>
                      <p className="text-[10px] text-slate-600">{timeAgo(a.updated_at)}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">No recent activity</p>
          )}
        </motion.div>
      </div>
    </div>
  )
}
