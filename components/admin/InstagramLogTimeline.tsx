'use client'

import React from 'react'
import {
  Instagram,
  ShieldCheck,
  User,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
  Lock,
  RefreshCw,
  XCircle
} from 'lucide-react'

export interface InstagramLog {
  id: string
  event_type: string
  old_username?: string | null
  new_username?: string | null
  actor_type: string
  actor_name?: string | null
  reason?: string | null
  metadata?: any
  created_at: string
}

interface InstagramLogTimelineProps {
  logs: InstagramLog[]
  emptyMessage?: string
}

export default function InstagramLogTimeline({
  logs,
  emptyMessage = 'No Instagram activity recorded yet.'
}: InstagramLogTimelineProps) {
  if (!logs || logs.length === 0) {
    return (
      <div className="py-10 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
        <Clock className="h-6 w-6 text-slate-600" />
        <span>{emptyMessage}</span>
      </div>
    )
  }

  const getEventBadge = (event: string) => {
    switch (event) {
      case 'ADMIN_APPLICATION_PROFILE_CHANGED':
        return {
          icon: <ShieldCheck className="h-3.5 w-3.5 text-pink-400" />,
          label: 'Admin Override',
          bg: 'bg-pink-500/10 border-pink-500/30 text-pink-300'
        }
      case 'APPLICATION_PROFILE_LOCKED':
        return {
          icon: <Lock className="h-3.5 w-3.5 text-purple-400" />,
          label: 'Locked at Apply',
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300'
        }
      case 'COMPLETION_PROFILE_CONFIRMED':
        return {
          icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
          label: 'Completion Confirmed',
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }
      case 'COMPLETION_BLOCKED_MISMATCH':
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />,
          label: 'Blocked: Mismatch',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }
      case 'PROFILE_UNLINK_BLOCKED':
        return {
          icon: <XCircle className="h-3.5 w-3.5 text-amber-400" />,
          label: 'Unlink Blocked',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }
      case 'PROFILE_LINKED':
        return {
          icon: <Instagram className="h-3.5 w-3.5 text-indigo-400" />,
          label: 'Profile Linked',
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
        }
      case 'PROFILE_UNLINKED':
        return {
          icon: <Instagram className="h-3.5 w-3.5 text-slate-400" />,
          label: 'Profile Unlinked',
          bg: 'bg-slate-800 border-slate-700 text-slate-300'
        }
      case 'PROFILE_PRIMARY_CHANGED':
        return {
          icon: <RefreshCw className="h-3.5 w-3.5 text-cyan-400" />,
          label: 'Primary Changed',
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
        }
      case 'BACKFILL_LOCKED':
      case 'BACKFILL_RELINKED':
        return {
          icon: <Sparkles className="h-3.5 w-3.5 text-blue-400" />,
          label: 'System Sync',
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }
      default:
        return {
          icon: <Clock className="h-3.5 w-3.5 text-slate-400" />,
          label: event.replace(/_/g, ' '),
          bg: 'bg-slate-800 border-slate-700 text-slate-300'
        }
    }
  }

  const formatDateTime = (iso: string) => {
    try {
      const d = new Date(iso)
      return d.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
      {logs.map((log) => {
        const badge = getEventBadge(log.event_type)
        return (
          <div key={log.id} className="relative group">
            {/* Timeline node */}
            <div className="absolute -left-6 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border-2 border-slate-700 group-hover:border-pink-500 transition-colors">
              <div className="h-1.5 w-1.5 rounded-full bg-slate-400 group-hover:bg-pink-400" />
            </div>

            {/* Content card */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-3 space-y-1.5 text-xs transition-all hover:border-slate-700">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-semibold text-[10px] uppercase tracking-wider ${badge.bg}`}
                  >
                    {badge.icon}
                    {badge.label}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    by <strong className="text-slate-200">{log.actor_name || log.actor_type}</strong>
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {formatDateTime(log.created_at)}
                </span>
              </div>

              {/* Handle Transition or Handle Name */}
              {(log.old_username || log.new_username) && (
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-300 pt-0.5">
                  {log.old_username && log.new_username && log.old_username !== log.new_username ? (
                    <>
                      <span className="text-rose-400 line-through">@{log.old_username}</span>
                      <ArrowRight className="h-3 w-3 text-slate-500" />
                      <span className="text-emerald-400 font-bold">@{log.new_username}</span>
                    </>
                  ) : (
                    <span className="text-pink-400 font-bold">@{log.new_username || log.old_username}</span>
                  )}
                </div>
              )}

              {/* Reason */}
              {log.reason && (
                <p className="text-slate-300 text-[11px] italic bg-slate-900/60 px-2 py-1 rounded-md border border-slate-800/50">
                  "{log.reason}"
                </p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
