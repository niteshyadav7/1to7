'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  TrendingUp,
  Users,
  Megaphone,
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  BarChart2,
  PieChart as PieIcon,
  MapPin,
  Flame,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import { toast } from 'sonner'
import Link from 'next/link'
import { getFastCache, setFastCache } from '@/lib/utils/cache-utils'

// ─── Interfaces ──────────────────────────────────────────────────

interface AdminStatsResponse {
  kpis: {
    totalApps: number
    allTimeApps: number
    appliedCount: number
    underProcessCount: number
    approvedCount: number
    completedCount: number
    rejectedCount: number
    paidCount: number
    completionRate: number
    ghostedCount: number
    ghostedRate: number
    totalPayoutDisbursed: number
    allTimePayoutDisbursed: number
    totalPendingLiability: number
    activeCampaigns: number
    totalCampaigns: number
    periodCreators: number
    allTimeCreators: number
  }
  timeSeries: Array<{
    period: string
    label: string
    totalApps: number
    approvedApps: number
    completedApps: number
    rejectedApps: number
    payoutVolume: number
    newCreators: number
  }>
  funnel: Array<{
    stage: string
    count: number
    color: string
    percentage: number
  }>
  tiers: Array<{
    tier: string
    label: string
    range: string
    count: number
    percentage: number
    color: string
  }>
  gender: Array<{
    name: string
    count: number
    percentage: number
    color: string
  }>
  budgetTypes: Array<{
    type: string
    count: number
    percentage: number
  }>
  topCampaigns: Array<{
    id: string
    campaign_code: string
    brand_name: string
    budget_type: string
    status: string
    total_applications: number
    approved_count: number
    completed_count: number
    completion_rate: number
    total_payout: number
  }>
  topStates: Array<{
    state: string
    count: number
    percentage: number
  }>
  campaignsList: Array<{
    id: string
    code: string
    brand: string
  }>
  meta: {
    range: string
    granularity: string
    campaignId: string | null
    generatedAt: string
  }
}

type TimeRange = 'today' | 'yesterday' | '7d' | '30d' | '90d' | 'this_month' | 'all'
type Granularity = 'day' | 'week' | 'month'
type ChartMetric = 'applications' | 'creators' | 'payouts'

const RANGE_LABELS: Record<TimeRange, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 Days',
  '30d': 'Last 30 Days',
  '90d': 'Last 90 Days',
  this_month: 'This Month',
  all: 'All Time',
}

const BUDGET_COLORS: Record<string, string> = {
  Barter: '#38bdf8',
  'Paid Variable': '#10b981',
  'Paid Fixed': '#a855f7',
  Hybrid: '#f59e0b',
  Unspecified: '#64748b',
}

export default function AdminStatsPage() {
  const [range, setRange] = useState<TimeRange>('30d')
  const [granularity, setGranularity] = useState<Granularity>('day')
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all')
  const [chartMetric, setChartMetric] = useState<ChartMetric>('applications')

  const [data, setData] = useState<AdminStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // ─── Fetch Stats Function ──────────────────────────────────────
  const fetchStats = useCallback(
    async (isBackground = false) => {
      const cacheKey = `admin_stats_${range}_${granularity}_${selectedCampaign}`
      if (!isBackground) setLoading(true)
      else setRefreshing(true)

      try {
        const queryParams = new URLSearchParams({
          range,
          granularity,
          campaign_id: selectedCampaign,
        })

        const res = await fetch(`/api/admin/stats?${queryParams.toString()}`)
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.error || 'Failed to fetch platform statistics')
        }

        const json: AdminStatsResponse = await res.json()
        setData(json)
        setFastCache(cacheKey, json)
      } catch (err: any) {
        console.error('Error loading stats:', err)
        if (!isBackground) {
          toast.error(err.message || 'Error loading platform stats')
        }
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [range, granularity, selectedCampaign]
  )

  // Load from fastCache then revalidate
  useEffect(() => {
    const cacheKey = `admin_stats_${range}_${granularity}_${selectedCampaign}`
    const cached = getFastCache<AdminStatsResponse>(cacheKey)

    if (cached) {
      setData(cached)
      setLoading(false)
      fetchStats(true)
    } else {
      fetchStats(false)
    }
  }, [fetchStats, range, granularity, selectedCampaign])

  // ─── Export Summary to CSV ────────────────────────────────────
  const exportCsv = () => {
    if (!data) return
    try {
      const rows = [
        ['Platform Stats Summary Report', `Generated: ${new Date().toLocaleString()}`],
        ['Time Range', RANGE_LABELS[range]],
        ['Granularity', granularity],
        ['Campaign Filter', selectedCampaign === 'all' ? 'All Campaigns' : selectedCampaign],
        [],
        ['Metric', 'Value'],
        ['Total Applications in Period', data.kpis.totalApps],
        ['All-Time Applications', data.kpis.allTimeApps],
        ['Applied (Pending Review)', data.kpis.appliedCount],
        ['Under Process', data.kpis.underProcessCount],
        ['Approved Applications', data.kpis.approvedCount],
        ['Completed Deliverables', data.kpis.completedCount],
        ['Rejected Applications', data.kpis.rejectedCount],
        ['Payment Processed Applications', data.kpis.paidCount],
        ['Completion Rate (%)', `${data.kpis.completionRate}%`],
        ['Total Payouts Disbursed (Period)', `INR ${data.kpis.totalPayoutDisbursed}`],
        ['All-Time Payouts Disbursed', `INR ${data.kpis.allTimePayoutDisbursed}`],
        ['Pending Payment Liability', `INR ${data.kpis.totalPendingLiability}`],
        ['Total Creators Onboarded (All-Time)', data.kpis.allTimeCreators],
        ['Creators Onboarded in Period', data.kpis.periodCreators],
        ['Active Campaigns', data.kpis.activeCampaigns],
        ['Total Campaigns', data.kpis.totalCampaigns],
        [],
        ['Time Series Trend'],
        ['Period', 'Applications', 'Approved', 'Completed', 'Rejected', 'Payouts (INR)', 'New Creators'],
        ...data.timeSeries.map((t) => [
          t.period,
          t.totalApps,
          t.approvedApps,
          t.completedApps,
          t.rejectedApps,
          t.payoutVolume,
          t.newCreators,
        ]),
      ]

      const csvContent =
        'data:text/csv;charset=utf-8,' +
        rows.map((e) => e.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')

      const encodedUri = encodeURI(csvContent)
      const link = document.createElement('a')
      link.setAttribute('href', encodedUri)
      link.setAttribute('download', `1to7_platform_stats_${range}_${granularity}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Stats summary exported successfully!')
    } catch (e) {
      toast.error('Failed to export CSV')
    }
  }

  // ─── Format Currency Helper ───────────────────────────────────
  const formatInr = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="space-y-6 pb-16">
      {/* ─── Top Header & Global Range Controls ─── */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                Platform Stats Hub
                <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Production
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Comprehensive platform performance metrics, conversion pipeline, and day/week velocity trends.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Campaign Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="appearance-none pl-3.5 pr-8 py-2 text-xs font-semibold rounded-xl bg-slate-900 border border-white/10 text-slate-200 hover:border-white/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-sm"
            >
              <option value="all">All Campaigns ({data?.campaignsList?.length || 23})</option>
              {data?.campaignsList?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.brand} ({c.code || 'Code'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Granularity Switcher: Day vs Week vs Month */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-white/10 shadow-sm">
            <button
              type="button"
              onClick={() => setGranularity('day')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                granularity === 'day'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Day-wise
            </button>
            <button
              type="button"
              onClick={() => setGranularity('week')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                granularity === 'week'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Week-wise
            </button>
            <button
              type="button"
              onClick={() => setGranularity('month')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                granularity === 'month'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Month-wise
            </button>
          </div>

          {/* Export CSV */}
          <button
            type="button"
            onClick={exportCsv}
            disabled={loading || !data}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Export Stats as CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {/* Refresh */}
          <button
            type="button"
            onClick={() => fetchStats(false)}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer shadow-sm disabled:opacity-50"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* ─── Time Range Pills Bar ─── */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {(['today', 'yesterday', '7d', '30d', '90d', 'this_month', 'all'] as TimeRange[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setRange(t)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              range === t
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 border-indigo-500/50 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-slate-900/60 border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            {RANGE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ─── 1. Hero KPI Cards Grid ─── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Applications */}
        <div className="relative p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-blue-500 to-cyan-400 opacity-60" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Applications</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {loading ? <div className="h-7 w-20 bg-slate-800 animate-pulse rounded" /> : data?.kpis.totalApps.toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>All-Time:</span>
            <span className="font-bold text-slate-300">{data?.kpis.allTimeApps.toLocaleString()}</span>
          </div>
        </div>

        {/* Creator Base */}
        <div className="relative p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-purple-500 to-pink-500 opacity-60" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Creators</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {loading ? <div className="h-7 w-20 bg-slate-800 animate-pulse rounded" /> : data?.kpis.allTimeCreators.toLocaleString()}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>New In Range:</span>
            <span className="font-bold text-purple-400">+{data?.kpis.periodCreators.toLocaleString()}</span>
          </div>
        </div>

        {/* Active Campaigns */}
        <div className="relative p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-amber-500 to-orange-500 opacity-60" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Campaigns</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Megaphone className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {loading ? <div className="h-7 w-20 bg-slate-800 animate-pulse rounded" /> : data?.kpis.activeCampaigns}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Total Launched:</span>
            <span className="font-bold text-slate-300">{data?.kpis.totalCampaigns}</span>
          </div>
        </div>

        {/* Payouts Disbursed */}
        <div className="relative p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400 opacity-60" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Payouts Paid</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400">
            {loading ? <div className="h-7 w-20 bg-slate-800 animate-pulse rounded" /> : formatInr(data?.kpis.totalPayoutDisbursed || 0)}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Pending:</span>
            <span className="font-bold text-amber-400">{formatInr(data?.kpis.totalPendingLiability || 0)}</span>
          </div>
        </div>

        {/* Completion Rate */}
        <div className="relative p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-indigo-500 to-blue-500 opacity-60" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Completion Rate</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white flex items-baseline gap-1">
            {loading ? <div className="h-7 w-20 bg-slate-800 animate-pulse rounded" /> : (
              <>
                <span>{data?.kpis.completionRate}%</span>
                <span className="text-xs text-slate-400 font-normal">({data?.kpis.completedCount})</span>
              </>
            )}
          </div>
          <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(data?.kpis.completionRate || 0, 100)}%` }}
            />
          </div>
        </div>

        {/* Ghosting Attrition Rate */}
        <div className="relative p-4 rounded-2xl bg-slate-900/60 border border-white/[0.08] backdrop-blur-xl shadow-lg hover:border-white/20 transition-all group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-rose-500 to-red-500 opacity-60" />
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold tracking-wider uppercase">Ghosting Rate</span>
            <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white">
            {loading ? <div className="h-7 w-20 bg-slate-800 animate-pulse rounded" /> : `${data?.kpis.ghostedRate}%`}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
            <span>Ghosted Users:</span>
            <span className="font-bold text-slate-300">{data?.kpis.ghostedCount}</span>
          </div>
        </div>
      </div>

      {/* ─── 2. Interactive Time-Series Velocity Chart ─── */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              Velocity Trends Timeline ({granularity === 'day' ? 'Day-wise' : granularity === 'week' ? 'Week-wise' : 'Month-wise'})
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historical activity distribution and spikes across the selected timeframe ({RANGE_LABELS[range]}).
            </p>
          </div>

          {/* Metric View Tabs */}
          <div className="inline-flex items-center p-1 rounded-xl bg-slate-950 border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => setChartMetric('applications')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartMetric === 'applications'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Applications
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('creators')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartMetric === 'creators'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Creator Growth
            </button>
            <button
              type="button"
              onClick={() => setChartMetric('payouts')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                chartMetric === 'payouts'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Disbursed (₹)
            </button>
          </div>
        </div>

        {/* Recharts Area Container */}
        <div className="h-72 w-full pt-2">
          {loading || !mounted ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Aggregating time-series data points...</span>
              </div>
            </div>
          ) : !data?.timeSeries?.length ? (
            <div className="h-full w-full flex items-center justify-center text-xs text-slate-500">
              No historical activity records found in this range.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === 'applications' ? (
                <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="totalAppsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="completedAppsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip metric="applications" />} />
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    formatter={(value) => <span className="text-slate-300 font-medium">{value}</span>}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalApps"
                    name="Total Applications"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#totalAppsGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="completedApps"
                    name="Completed Deliverables"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#completedAppsGrad)"
                  />
                </AreaChart>
              ) : chartMetric === 'creators' ? (
                <BarChart data={data.timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip metric="creators" />} />
                  <Bar dataKey="newCreators" name="New Creators Onboarded" fill="#a855f7" radius={[4, 4, 0, 0]} />
                </BarChart>
              ) : (
                <AreaChart data={data.timeSeries} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="payoutGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} vertical={false} />
                  <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(val) => `₹${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                  />
                  <Tooltip content={<CustomTooltip metric="payouts" />} />
                  <Area
                    type="monotone"
                    dataKey="payoutVolume"
                    name="Payout Volume (INR)"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#payoutGrad)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ─── 3. Funnel Pipeline & Campaign Budget Architecture ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Application Conversion Pipeline */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl">
          <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              Application Conversion Pipeline
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">
              {data?.kpis.totalApps || 0} Total in range
            </span>
          </div>

          <div className="space-y-3">
            {data?.funnel?.map((item) => (
              <div key={item.stage} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.stage}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{item.count.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-400">({item.percentage}%)</span>
                  </div>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(item.percentage, 100)}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Campaign Budget Models Breakdown */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-amber-400" />
                Campaign Budget Architecture
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">
                {data?.kpis.totalCampaigns || 0} Total Campaigns
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {data?.budgetTypes?.map((b, idx) => (
                <div
                  key={`${b.type}-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-950/80 border border-white/[0.06] hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: BUDGET_COLORS[b.type] || '#64748b' }}
                    />
                    <span className="text-xs font-semibold text-slate-300">{b.type}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-black text-white">{b.count}</span>
                    <span className="text-xs font-bold text-slate-400">{b.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <span>Active Live Campaigns:</span>
            <span className="font-bold text-emerald-400">{data?.kpis.activeCampaigns} Active</span>
          </div>
        </div>
      </div>

      {/* ─── 4. Creator Intelligence & Demographics ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Follower Tiers */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl">
          <div className="border-b border-white/[0.08] pb-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              Follower Tier Distribution
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">32,600+ Verified Creators</p>
          </div>

          <div className="space-y-3">
            {data?.tiers?.map((t) => (
              <div key={t.tier} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="font-semibold text-slate-200">{t.label}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({t.range})</span>
                  </div>
                  <span className="font-bold text-white">{t.count.toLocaleString()}</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(t.percentage, 100)}%`,
                      backgroundColor: t.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Gender Breakdown */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="border-b border-white/[0.08] pb-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-pink-400" />
                Gender Demographics
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Influencer Audience Split</p>
            </div>

            <div className="space-y-3.5 pt-2">
              {data?.gender?.map((g, idx) => (
                <div
                  key={`${g.name}-${idx}`}
                  className="p-3 rounded-xl bg-slate-950/70 border border-white/[0.06] flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: g.color }}
                    />
                    <span className="text-xs font-semibold text-slate-200">{g.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-white">{g.percentage}%</span>
                    <span className="block text-[10px] text-slate-500">{g.count.toLocaleString()} creators</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] text-[11px] text-slate-400 text-center">
            Dominated by female fashion, beauty, and lifestyle creators (~71%).
          </div>
        </div>

        {/* Top Geographic States */}
        <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl p-5 shadow-xl">
          <div className="border-b border-white/[0.08] pb-3 mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Top Creator States
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Geographic Density Concentration</p>
          </div>

          <div className="space-y-2.5">
            {data?.topStates
              ?.filter((s) => s.state !== 'Not Specified')
              ?.slice(0, 5)
              ?.map((s, idx) => (
                <div key={`${s.state}-${idx}`} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-200 capitalize">
                      {s.state.toLowerCase()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white">{s.count.toLocaleString()}</span>
                    <span className="text-[11px] text-slate-500">({s.percentage}%)</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* ─── 5. Top Performing Campaigns Matrix ─── */}
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 backdrop-blur-xl shadow-xl overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400" />
              Top Performing Campaigns Matrix
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by applicant volume, deliverable completion rate, and financial payout throughput.
            </p>
          </div>
          <Link
            href="/admin/campaigns"
            className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>Manage All</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/[0.06] bg-slate-950/40 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Brand / Campaign</th>
                <th className="py-3 px-4">Budget Model</th>
                <th className="py-3 px-4 text-right">Applicants</th>
                <th className="py-3 px-4 text-right">Approved</th>
                <th className="py-3 px-4 text-right">Completed</th>
                <th className="py-3 px-4 text-right">Completion Rate</th>
                <th className="py-3 px-4 text-right">Disbursed (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Loading campaigns performance matrix...
                  </td>
                </tr>
              ) : !data?.topCampaigns?.length ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No campaign performance records found.
                  </td>
                </tr>
              ) : (
                data.topCampaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white">{c.brand_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{c.campaign_code || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{
                          backgroundColor: `${BUDGET_COLORS[c.budget_type] || '#64748b'}20`,
                          color: BUDGET_COLORS[c.budget_type] || '#cbd5e1',
                          border: `1px solid ${BUDGET_COLORS[c.budget_type] || '#64748b'}40`,
                        }}
                      >
                        {c.budget_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-white">
                      {c.total_applications.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-purple-400">
                      {c.approved_count}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-400">
                      {c.completed_count}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="font-bold text-slate-200">{c.completion_rate}%</div>
                      <div className="w-16 ml-auto bg-slate-800 h-1 rounded-full overflow-hidden mt-1">
                        <div
                          className="bg-emerald-500 h-full rounded-full"
                          style={{ width: `${Math.min(c.completion_rate, 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-emerald-400">
                      {formatInr(c.total_payout)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ─── Custom Tooltip for Recharts ────────────────────────────────
function CustomTooltip({ active, payload, label, metric }: any) {
  if (active && payload && payload.length) {
    const item = payload[0]?.payload
    return (
      <div className="p-3 rounded-xl bg-slate-950/95 border border-white/10 shadow-2xl backdrop-blur-md text-xs space-y-1.5 z-50">
        <div className="font-bold text-white border-b border-white/10 pb-1 flex items-center justify-between gap-4">
          <span>{item.period}</span>
          <span className="text-[10px] text-indigo-400 font-normal">{item.label}</span>
        </div>
        {metric === 'applications' && (
          <>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Total Applications:</span>
              <span className="font-black text-blue-400">{item.totalApps}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Completed Deliverables:</span>
              <span className="font-black text-emerald-400">{item.completedApps}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Approved:</span>
              <span className="font-bold text-purple-400">{item.approvedApps}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-slate-300">
              <span>Rejected:</span>
              <span className="font-bold text-rose-400">{item.rejectedApps}</span>
            </div>
          </>
        )}
        {metric === 'creators' && (
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span>New Creators Onboarded:</span>
            <span className="font-black text-purple-400">+{item.newCreators}</span>
          </div>
        )}
        {metric === 'payouts' && (
          <div className="flex items-center justify-between gap-4 text-slate-300">
            <span>Disbursed Volume:</span>
            <span className="font-black text-emerald-400">
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 0,
              }).format(item.payoutVolume)}
            </span>
          </div>
        )}
      </div>
    )
  }
  return null
}
