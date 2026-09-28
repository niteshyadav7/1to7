'use client'

import React, { useState } from 'react'
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
  Legend,
} from 'recharts'
import { TrendingUp, BarChart2, Layers, Sparkles } from 'lucide-react'

interface TrendItem {
  bucket: string
  label: string
  totalApps: number
  totalApprovals: number
  totalCompletions: number
  totalPayouts: number
  [key: string]: any
}

interface PocTrendChartProps {
  data: TrendItem[]
  granularity: 'day' | 'week'
  onGranularityChange: (g: 'day' | 'week') => void
  memberNames?: string[]
}

const POC_COLORS = [
  '#3b82f6', // blue
  '#10b981', // emerald
  '#8b5cf6', // purple
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f97316', // orange
  '#14b8a6', // teal
]

export function PocTrendChart({
  data = [],
  granularity,
  onGranularityChange,
  memberNames = [],
}: PocTrendChartProps) {
  const [viewMode, setViewMode] = useState<'area' | 'bar' | 'by_poc'>('area')

  if (!data || data.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-8 text-center text-slate-500">
        <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60" />
        <p className="text-sm">No activity recorded for the selected time range.</p>
        <p className="text-xs text-slate-600 mt-1">Try switching to &quot;This Month&quot; or &quot;All Time&quot;.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl space-y-4">
      {/* Header with Granularity & Chart Mode Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/[0.06] pb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400" />
            Performance & Velocity Trends
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 font-semibold uppercase tracking-wider">
              {granularity === 'day' ? 'Days-Wise' : 'Weeks-Wise'}
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Compare application review velocity, creator approvals, and deliverable completions over time.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Day / Week Toggle */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => onGranularityChange('day')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                granularity === 'day'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Days-Wise
            </button>
            <button
              type="button"
              onClick={() => onGranularityChange('week')}
              className={`px-3 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                granularity === 'week'
                  ? 'bg-blue-600 text-white shadow-sm font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Weeks-Wise
            </button>
          </div>

          {/* Chart Display Mode */}
          <div className="flex items-center bg-slate-950/80 p-0.5 rounded-xl border border-white/[0.08] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('area')}
              title="Smooth Area Chart"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'area'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('bar')}
              title="Stacked Bar Chart"
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                viewMode === 'bar'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Volume</span>
            </button>
            {memberNames.length > 0 && (
              <button
                type="button"
                onClick={() => setViewMode('by_poc')}
                title="Individual POC Comparison"
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  viewMode === 'by_poc'
                    ? 'bg-slate-800 text-white font-semibold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden sm:inline">By POC</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradApprovals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradCompletions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradApps" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Area
                type="monotone"
                dataKey="totalApprovals"
                name="Creators Approved"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#gradApprovals)"
              />
              <Area
                type="monotone"
                dataKey="totalCompletions"
                name="Completions Done"
                stroke="#10b981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#gradCompletions)"
              />
              <Area
                type="monotone"
                dataKey="totalApps"
                name="Applications Received"
                stroke="#8b5cf6"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#gradApps)"
              />
            </AreaChart>
          ) : viewMode === 'bar' ? (
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              <Bar dataKey="totalApprovals" name="Approved" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalCompletions" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="totalApps" name="Applied" fill="#6366f1" radius={[4, 4, 0, 0]} opacity={0.6} />
            </BarChart>
          ) : (
            /* By POC breakdown */
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />
              {memberNames.slice(0, 6).map((name, i) => (
                <Area
                  key={name}
                  type="monotone"
                  dataKey={name}
                  name={name}
                  stroke={POC_COLORS[i % POC_COLORS.length]}
                  strokeWidth={2}
                  fill="transparent"
                />
              ))}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-white/10 bg-slate-950/95 p-3 shadow-2xl backdrop-blur-xl text-xs space-y-1.5 min-w-[170px]">
        <p className="font-bold text-white border-b border-white/10 pb-1 flex items-center justify-between">
          <span>{label}</span>
          <Sparkles className="w-3 h-3 text-blue-400" />
        </p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-slate-300">
            <span className="flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="truncate">{entry.name}:</span>
            </span>
            <span className="font-bold text-white font-mono">{entry.value}</span>
          </div>
        ))}
      </div>
    )
  }
  return null
}
