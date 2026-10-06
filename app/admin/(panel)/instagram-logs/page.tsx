'use client'

import React, { useState, useEffect } from 'react'
import {
  Instagram,
  Search,
  Filter,
  Download,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lock,
  CheckCircle2,
  XCircle,
  Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { toast } from 'sonner'

export default function InstagramLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [eventType, setEventType] = useState('')
  const [actorType, setActorType] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [exporting, setExporting] = useState(false)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (eventType) params.set('event_type', eventType)
      if (actorType) params.set('actor_type', actorType)
      params.set('page', String(page))
      params.set('limit', '25')

      const res = await fetch(`/api/admin/instagram-logs?${params.toString()}`)
      const data = await res.json()

      if (res.ok) {
        setLogs(data.logs || [])
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalCount(data.pagination?.total || 0)
      } else {
        toast.error(data.error || 'Failed to fetch logs')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error fetching audit logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, eventType, actorType])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const handleExportCsv = async () => {
    try {
      setExporting(true)
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (eventType) params.set('event_type', eventType)
      if (actorType) params.set('actor_type', actorType)
      params.set('export', 'true')

      window.open(`/api/admin/instagram-logs?${params.toString()}`, '_blank')
    } catch (err: any) {
      toast.error('Failed to export CSV')
    } finally {
      setExporting(false)
    }
  }

  const getEventBadge = (event: string) => {
    switch (event) {
      case 'ADMIN_APPLICATION_PROFILE_CHANGED':
        return {
          icon: <ShieldCheck className="h-3 w-3 text-pink-400" />,
          label: 'Admin Override',
          bg: 'bg-pink-500/10 border-pink-500/30 text-pink-300'
        }
      case 'APPLICATION_PROFILE_LOCKED':
        return {
          icon: <Lock className="h-3 w-3 text-purple-400" />,
          label: 'Locked at Apply',
          bg: 'bg-purple-500/10 border-purple-500/30 text-purple-300'
        }
      case 'COMPLETION_PROFILE_CONFIRMED':
        return {
          icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
          label: 'Completion Confirmed',
          bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
        }
      case 'COMPLETION_BLOCKED_MISMATCH':
        return {
          icon: <AlertTriangle className="h-3 w-3 text-rose-400" />,
          label: 'Blocked: Mismatch',
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }
      case 'PROFILE_UNLINK_BLOCKED':
        return {
          icon: <XCircle className="h-3 w-3 text-amber-400" />,
          label: 'Unlink Blocked',
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300'
        }
      case 'PROFILE_LINKED':
        return {
          icon: <Instagram className="h-3 w-3 text-indigo-400" />,
          label: 'Profile Linked',
          bg: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
        }
      case 'PROFILE_UNLINKED':
        return {
          icon: <Instagram className="h-3 w-3 text-slate-400" />,
          label: 'Profile Unlinked',
          bg: 'bg-slate-800 border-slate-700 text-slate-300'
        }
      case 'PROFILE_PRIMARY_CHANGED':
        return {
          icon: <RefreshCw className="h-3 w-3 text-cyan-400" />,
          label: 'Primary Changed',
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
        }
      case 'BACKFILL_LOCKED':
      case 'BACKFILL_RELINKED':
        return {
          icon: <Sparkles className="h-3 w-3 text-blue-400" />,
          label: 'System Sync',
          bg: 'bg-blue-500/10 border-blue-500/30 text-blue-300'
        }
      default:
        return {
          icon: <Clock className="h-3 w-3 text-slate-400" />,
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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <SetAdminHeader>
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <Instagram className="h-5 w-5 text-pink-400" />
            Instagram Audit Logs
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Complete log of Instagram profile attachments, locks, admin overrides, and deliverable matches.
          </p>
        </div>
      </SetAdminHeader>

      {/* Top Controls: Search, Filters, CSV Export */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800 backdrop-blur-md">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search handle, creator name, admin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-slate-950 border-slate-800 text-white text-xs focus-visible:ring-pink-500/30"
            />
          </div>
          <Button type="submit" size="sm" className="h-9 px-3 bg-pink-600 hover:bg-pink-500 text-white text-xs">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          {/* Event Filter */}
          <select
            value={eventType}
            onChange={(e) => {
              setEventType(e.target.value)
              setPage(1)
            }}
            className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-300 focus:outline-none focus:border-pink-500 cursor-pointer"
          >
            <option value="">All Events</option>
            <option value="ADMIN_APPLICATION_PROFILE_CHANGED">Admin Overrides</option>
            <option value="APPLICATION_PROFILE_LOCKED">Application Locks</option>
            <option value="COMPLETION_PROFILE_CONFIRMED">Completion Confirmed</option>
            <option value="COMPLETION_BLOCKED_MISMATCH">Blocked Mismatches</option>
            <option value="PROFILE_UNLINK_BLOCKED">Unlink Blocked</option>
            <option value="PROFILE_LINKED">Profile Linked</option>
            <option value="PROFILE_UNLINKED">Profile Unlinked</option>
            <option value="PROFILE_PRIMARY_CHANGED">Primary Changed</option>
            <option value="BACKFILL_LOCKED">System Backfill</option>
          </select>

          {/* Actor Filter */}
          <select
            value={actorType}
            onChange={(e) => {
              setActorType(e.target.value)
              setPage(1)
            }}
            className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-300 focus:outline-none focus:border-pink-500 cursor-pointer"
          >
            <option value="">All Actors</option>
            <option value="admin">Admin</option>
            <option value="creator">Creator</option>
            <option value="system">System / Script</option>
          </select>

          {/* CSV Export */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={exporting}
            className="h-9 px-3.5 border-slate-800 bg-slate-950 text-slate-300 hover:bg-slate-800 hover:text-white text-xs gap-1.5 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fetchLogs()}
            className="h-9 px-2.5 text-slate-400 hover:text-white"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Profile Handle</th>
                <th className="py-3 px-4">Actor</th>
                <th className="py-3 px-4">Reason / Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-pink-500" />
                    <span>Loading Instagram logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No Instagram audit logs found matching your filters.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const badge = getEventBadge(log.event_type)
                  return (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      {/* Timestamp */}
                      <td className="py-3 px-4 text-slate-400 font-mono whitespace-nowrap text-[11px]">
                        {formatDateTime(log.created_at)}
                      </td>

                      {/* Event */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border font-semibold text-[10px] uppercase tracking-wider ${badge.bg}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </td>

                      {/* Profile Handle */}
                      <td className="py-3 px-4 font-mono font-medium whitespace-nowrap">
                        {log.old_username && log.new_username && log.old_username !== log.new_username ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-rose-400 line-through">@{log.old_username}</span>
                            <ArrowRight className="h-3 w-3 text-slate-500" />
                            <span className="text-emerald-400 font-bold">@{log.new_username}</span>
                          </div>
                        ) : (
                          <span className="text-pink-400 font-bold">
                            @{log.new_username || log.old_username || '—'}
                          </span>
                        )}
                      </td>

                      {/* Actor */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                              log.actor_type === 'admin'
                                ? 'bg-pink-500/20 text-pink-300 border border-pink-500/30'
                                : log.actor_type === 'creator'
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {log.actor_type}
                          </span>
                          <span className="font-semibold text-slate-200">
                            {log.actor_name || log.actor_id || 'System'}
                          </span>
                        </div>
                      </td>

                      {/* Reason / Notes */}
                      <td className="py-3 px-4 text-slate-400 max-w-xs truncate" title={log.reason || ''}>
                        {log.reason ? (
                          <span className="italic text-slate-300">"{log.reason}"</span>
                        ) : log.metadata?.deliverable_link ? (
                          <span className="font-mono text-[10px] text-indigo-400 truncate block">
                            Link: {log.metadata.deliverable_link}
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>
            Total: <strong>{totalCount}</strong> logs recorded
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2.5 border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span>
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 px-2.5 border-slate-800 bg-slate-950 text-slate-300 hover:text-white"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
