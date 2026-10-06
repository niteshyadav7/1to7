'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  History,
  ChevronDown,
  ChevronUp,
  Instagram,
  ShieldCheck,
  CheckCircle2,
  Lock,
  RefreshCw,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CreatorInstagramLog {
  id: string
  event_type: string
  old_username?: string | null
  new_username?: string | null
  actor_type: string
  actor_name?: string | null
  reason?: string | null
  created_at: string
}

export default function InstagramActivitySection() {
  const [isOpen, setIsOpen] = useState(false)
  const [logs, setLogs] = useState<CreatorInstagramLog[]>([])
  const [loading, setLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard/instagram-logs')
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs || [])
      }
    } catch {
      // ignore network errors silently
    } finally {
      setLoading(false)
      setHasFetched(true)
    }
  }, [])

  useEffect(() => {
    if (isOpen && !hasFetched) {
      fetchLogs()
    }
  }, [isOpen, hasFetched, fetchLogs])

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

  const getEventDetails = (log: CreatorInstagramLog) => {
    switch (log.event_type) {
      case 'ADMIN_APPLICATION_PROFILE_CHANGED':
        return {
          icon: <ShieldCheck className="h-4 w-4 text-purple-600" />,
          title: 'Profile Updated by 1to7 Team',
          badge: 'Admin Update',
          badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
          desc: log.old_username && log.new_username
            ? `Changed locked profile from @${log.old_username} to @${log.new_username}`
            : `Updated profile to @${log.new_username || ''}`
        }
      case 'APPLICATION_PROFILE_LOCKED':
        return {
          icon: <Lock className="h-4 w-4 text-pink-600" />,
          title: 'Profile Locked for Campaign',
          badge: 'Campaign Apply',
          badgeColor: 'bg-pink-100 text-pink-800 border-pink-200',
          desc: `Locked @${log.new_username || log.old_username || 'handle'} for campaign verification`
        }
      case 'COMPLETION_PROFILE_CONFIRMED':
        return {
          icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
          title: 'Deliverable Verified',
          badge: 'Completed',
          badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          desc: `Deliverable link successfully verified with @${log.new_username || log.old_username || 'handle'}`
        }
      case 'PROFILE_LINKED':
        return {
          icon: <Instagram className="h-4 w-4 text-indigo-600" />,
          title: 'Instagram Profile Linked',
          badge: 'Linked',
          badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          desc: `Added @${log.new_username || 'profile'} to your connected accounts`
        }
      case 'PROFILE_UNLINKED':
        return {
          icon: <Instagram className="h-4 w-4 text-slate-500" />,
          title: 'Instagram Profile Unlinked',
          badge: 'Unlinked',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
          desc: `Removed @${log.old_username || 'profile'} from your connected accounts`
        }
      case 'PROFILE_PRIMARY_CHANGED':
        return {
          icon: <Sparkles className="h-4 w-4 text-amber-600" />,
          title: 'Primary Profile Changed',
          badge: 'Primary',
          badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
          desc: `Set @${log.new_username || 'profile'} as your default primary profile`
        }
      default:
        return {
          icon: <Clock className="h-4 w-4 text-slate-500" />,
          title: log.event_type.replace(/_/g, ' '),
          badge: 'Activity',
          badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
          desc: log.reason || ''
        }
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden transition-all">
      {/* Accordion Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-100/70 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-pink-600">
            <History className="h-4 w-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-800">Instagram Profile Activity & History</span>
            <p className="text-[11px] text-slate-500">
              Audit trail of profiles linked, campaigns applied, and admin updates
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Accordion Body */}
      {isOpen && (
        <div className="border-t border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Recent Activity ({logs.length})
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchLogs}
              disabled={loading}
              className="h-7 px-2 text-[11px] font-bold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>

          {loading && !hasFetched ? (
            <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin text-pink-500" />
              Loading activity history...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No Instagram profile changes or campaign locks recorded yet.
            </div>
          ) : (
            <div className="relative pl-5 space-y-3 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {logs.map((log) => {
                const details = getEventDetails(log)
                return (
                  <div key={log.id} className="relative group">
                    {/* Node Dot */}
                    <div className="absolute -left-5 top-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white border-2 border-slate-300 group-hover:border-pink-500 transition-colors">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400 group-hover:bg-pink-500" />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs space-y-1 hover:border-slate-300 transition-colors">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wider ${details.badgeColor}`}
                          >
                            {details.icon}
                            {details.badge}
                          </span>
                          <span className="font-bold text-slate-800 text-xs">
                            {details.title}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDateTime(log.created_at)}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-1">
                        {details.desc}
                      </p>

                      {log.reason && (
                        <div className="mt-1 text-[11px] text-slate-500 bg-white/80 p-2 rounded-lg border border-slate-200/80">
                          <span className="font-semibold text-slate-700">Note: </span>
                          <span>{log.reason}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1 text-[10px] text-slate-400">
                        <span>By {log.actor_name || (log.actor_type === 'admin' ? '1to7 Team' : 'You')}</span>
                        {log.actor_type === 'admin' && (
                          <span className="inline-flex items-center gap-0.5 text-indigo-600 font-semibold">
                            <ShieldCheck className="h-3 w-3" /> Verified Admin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
