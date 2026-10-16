'use client'

import React from 'react'
import { AlertTriangle, History } from 'lucide-react'

interface GhostBadgeProps {
  isGhosted?: boolean
  pastGhostCount?: number
  reason?: string | null
  onClick?: () => void
  size?: 'sm' | 'md'
}

export function GhostBadge({
  isGhosted,
  pastGhostCount = 0,
  reason,
  onClick,
  size = 'md',
}: GhostBadgeProps) {
  if (isGhosted) {
    return (
      <span
        onClick={onClick}
        title={reason ? `Ghosted: ${reason}` : 'Creator is currently marked as ghosted'}
        className={`inline-flex items-center gap-1.5 font-bold rounded-lg border transition-all ${
          onClick ? 'cursor-pointer hover:brightness-110 active:scale-95' : ''
        } ${
          size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : 'px-2.5 py-1 text-xs'
        } bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-xs shadow-rose-950/30 animate-pulse`}
      >
        <span className="text-xs">👻</span>
        <span>Ghosted</span>
        {reason && (
          <span className="max-w-[120px] truncate text-[10px] text-rose-400/80 font-normal hidden sm:inline">
            • {reason}
          </span>
        )}
      </span>
    )
  }

  if (pastGhostCount > 0) {
    return (
      <span
        onClick={onClick}
        title={`This creator was previously marked ghosted ${pastGhostCount} time${pastGhostCount > 1 ? 's' : ''} in past campaigns`}
        className={`inline-flex items-center gap-1 font-semibold rounded-lg border transition-all ${
          onClick ? 'cursor-pointer hover:bg-amber-500/20 active:scale-95' : ''
        } ${
          size === 'sm'
            ? 'px-1.5 py-0.5 text-[9px]'
            : 'px-2 py-0.5 text-[10px]'
        } bg-amber-500/10 text-amber-300/90 border-amber-500/30`}
      >
        <History className="h-3 w-3 text-amber-400" />
        <span>👻 ×{pastGhostCount} Past</span>
      </span>
    )
  }

  return null
}
