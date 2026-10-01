'use client'

import React from 'react'

/**
 * Premium shimmer effect utility class
 */
const shimmerClass =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.07] before:to-transparent'

/**
 * 1. Podium / Top Highlights Skeleton
 */
export function PocPodiumSkeleton() {
  return (
    <div className="space-y-4">
      {/* Peak Day Banner Skeleton */}
      <div
        className={`h-16 w-full rounded-2xl border border-white/[0.06] bg-slate-900/50 p-4 flex items-center justify-between gap-4 backdrop-blur-xl ${shimmerClass}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-800/80 shrink-0" />
          <div className="space-y-1.5">
            <div className="h-3 w-32 rounded-md bg-slate-800/90" />
            <div className="h-2.5 w-48 rounded-md bg-slate-800/60" />
          </div>
        </div>
        <div className="h-7 w-28 rounded-xl bg-slate-800/70" />
      </div>

      {/* 3 Podium Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`rounded-2xl border border-white/[0.06] bg-slate-900/50 p-5 shadow-lg space-y-4 backdrop-blur-xl ${shimmerClass}`}
          >
            {/* Header / Award category */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-5 w-5 rounded-md bg-slate-800/90" />
                <div className="space-y-1">
                  <div className="h-3 w-24 rounded bg-slate-800/90" />
                  <div className="h-2 w-32 rounded bg-slate-800/50" />
                </div>
              </div>
              <div className="h-4 w-4 rounded bg-slate-800/60" />
            </div>

            {/* POC Profile / Avatar info */}
            <div className="flex items-center gap-3 pt-1">
              <div className="h-12 w-12 rounded-2xl bg-slate-800/90 shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-28 rounded bg-slate-800/90" />
                <div className="h-2.5 w-36 rounded bg-slate-800/60" />
              </div>
            </div>

            {/* KPI metric bar */}
            <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-2.5 w-16 rounded bg-slate-800/60" />
                <div className="h-5 w-12 rounded bg-slate-800/90" />
              </div>
              <div className="space-y-1 text-right">
                <div className="h-2.5 w-14 rounded bg-slate-800/60 ml-auto" />
                <div className="h-4 w-20 rounded-md bg-slate-800/80" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * 2. Velocity Trends Chart Skeleton
 */
export function PocChartSkeleton() {
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 sm:p-6 shadow-xl space-y-6 backdrop-blur-xl ${shimmerClass}`}
    >
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-slate-800/90" />
            <div className="h-4 w-48 rounded bg-slate-800/90" />
            <div className="h-4 w-16 rounded-full bg-slate-800/70" />
          </div>
          <div className="h-3 w-64 rounded bg-slate-800/50" />
        </div>

        {/* View Mode & Granularity Switches */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-32 rounded-xl bg-slate-800/70" />
          <div className="h-8 w-28 rounded-xl bg-slate-800/70" />
        </div>
      </div>

      {/* Simulated Wave Chart Area */}
      <div className="h-64 sm:h-72 w-full rounded-xl bg-slate-950/40 border border-white/[0.03] p-4 flex flex-col justify-between">
        {/* Horizontal grid guide lines */}
        <div className="space-y-10 w-full">
          {[1, 2, 3, 4].map(line => (
            <div key={line} className="w-full h-px bg-white/[0.04]" />
          ))}
        </div>

        {/* Bottom axis items */}
        <div className="flex items-center justify-between pt-2 border-t border-white/[0.06] text-slate-800">
          {[1, 2, 3, 4, 5, 6, 7].map(x => (
            <div key={x} className="h-2.5 w-10 rounded bg-slate-800/60" />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 3. Comparative Ledger Table Rows Skeleton
 */
export function PocTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, idx) => (
        <tr key={idx} className={`border-b border-white/[0.03] ${shimmerClass}`}>
          {/* Chevron */}
          <td className="py-3 px-3 w-8">
            <div className="h-4 w-4 rounded bg-slate-800/60" />
          </td>

          {/* Rank */}
          <td className="py-3 px-4">
            <div className="h-5 w-6 rounded bg-slate-800/80" />
          </td>

          {/* Name & Role Avatar */}
          <td className="py-3 px-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-slate-800/90 shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="h-3 w-28 rounded bg-slate-800/90" />
                <div className="h-2 w-36 rounded bg-slate-800/50" />
              </div>
            </div>
          </td>

          {/* Campaigns */}
          <td className="py-3 px-4 text-center">
            <div className="h-5 w-8 rounded-lg bg-slate-800/80 mx-auto" />
          </td>

          {/* Total Apps */}
          <td className="py-3 px-4 text-right">
            <div className="h-4 w-10 rounded bg-slate-800/80 ml-auto" />
          </td>

          {/* Approved */}
          <td className="py-3 px-4 text-right">
            <div className="h-4 w-10 rounded bg-slate-800/80 ml-auto" />
          </td>

          {/* Completed */}
          <td className="py-3 px-4 text-right">
            <div className="h-4 w-10 rounded bg-slate-800/80 ml-auto" />
          </td>

          {/* Completion Rate */}
          <td className="py-3 px-4 text-center">
            <div className="w-24 mx-auto space-y-1.5">
              <div className="h-3 w-10 rounded bg-slate-800/80 mx-auto" />
              <div className="h-1.5 w-full rounded-full bg-slate-800/60" />
            </div>
          </td>

          {/* Total Paid */}
          <td className="py-3 px-4 text-right">
            <div className="h-4 w-14 rounded bg-slate-800/80 ml-auto" />
          </td>

          {/* WoW Growth */}
          <td className="py-3 px-4 text-center">
            <div className="h-4 w-12 rounded bg-slate-800/70 mx-auto" />
          </td>

          {/* Best Day */}
          <td className="py-3 px-4 text-center">
            <div className="h-5 w-16 rounded-md bg-slate-800/70 mx-auto" />
          </td>

          {/* Action Drilldown */}
          <td className="py-3 px-4 text-center">
            <div className="h-6 w-16 rounded-lg bg-slate-800/80 mx-auto" />
          </td>
        </tr>
      ))}
    </>
  )
}

/**
 * 4. Individual Operations Desk Skeleton
 */
export function PocIndividualSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header Profile Switcher Skeleton */}
      <div
        className={`rounded-2xl border border-white/[0.08] bg-slate-900/60 p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-xl ${shimmerClass}`}
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-slate-800/80 shrink-0" />
          <div className="w-11 h-11 rounded-xl bg-slate-800/90 shrink-0" />
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="h-4 w-32 rounded bg-slate-800/90" />
              <div className="h-4 w-16 rounded-full bg-slate-800/60" />
            </div>
            <div className="h-3 w-44 rounded bg-slate-800/50" />
          </div>
        </div>
        <div className="h-8 w-44 rounded-xl bg-slate-800/80" />
      </div>

      {/* 6 Metric Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map(card => (
          <div
            key={card}
            className={`rounded-2xl border border-white/[0.06] bg-slate-900/40 p-4 shadow-lg space-y-2 ${shimmerClass}`}
          >
            <div className="h-2.5 w-20 rounded bg-slate-800/60" />
            <div className="h-7 w-14 rounded bg-slate-800/90" />
          </div>
        ))}
      </div>

      {/* Assigned Campaigns Table Skeleton */}
      <div
        className={`rounded-2xl border border-white/[0.08] bg-slate-900/60 shadow-xl overflow-hidden backdrop-blur-xl ${shimmerClass}`}
      >
        <div className="p-5 border-b border-white/[0.08] flex items-center justify-between">
          <div className="space-y-1">
            <div className="h-4 w-44 rounded bg-slate-800/90" />
            <div className="h-3 w-64 rounded bg-slate-800/50" />
          </div>
        </div>
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map(row => (
            <div
              key={row}
              className="h-12 w-full rounded-xl bg-slate-950/40 border border-white/[0.03] flex items-center justify-between px-4"
            >
              <div className="flex items-center gap-3">
                <div className="h-7 w-7 rounded-lg bg-slate-800/80" />
                <div className="h-3.5 w-32 rounded bg-slate-800/80" />
              </div>
              <div className="flex items-center gap-6">
                <div className="h-3.5 w-12 rounded bg-slate-800/70" />
                <div className="h-3.5 w-16 rounded bg-slate-800/70" />
                <div className="h-6 w-20 rounded-lg bg-slate-800/80" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
