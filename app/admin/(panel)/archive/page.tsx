'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Archive,
  ArchiveRestore,
  Search,
  RefreshCw,
  ExternalLink,
  Calendar,
  User,
  Users,
  Instagram,
  Phone,
  Mail,
  Loader2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { toast } from 'sonner'
import Link from 'next/link'
import { getInstagramDisplayHandle, getInstagramUrl } from '@/lib/instagram-utils'

interface ArchivedApp {
  id: string
  user_id: string
  campaign_id: string
  status: string
  form_data?: any
  is_archived: boolean
  archived_at: string | null
  archived_by: string | null
  archive_reason: string | null
  team_remark?: string | null
  created_at: string
  updated_at: string
  users?: {
    id: string
    full_name: string
    influencer_id: string
    email: string
    mobile: string
    instagram_username: string
    followers?: number
    instagram_profile_pic?: string
    gender?: string
    state?: string
    city?: string
  } | null
  campaigns?: {
    id: string
    brand_name: string
    campaign_code: string
    platform?: string
    budget_amount?: number
    budget_type?: string
  } | null
}

interface ArchivedCreator {
  id: string
  full_name: string
  influencer_id: string
  email: string
  mobile: string
  instagram_username: string
  followers?: number
  instagram_profile_pic?: string
  gender?: string
  state?: string
  city?: string
  is_archived: boolean
  archived_at: string | null
  archived_by: string | null
  archive_reason: string | null
  created_at: string
}

export default function ArchivedHubPage() {
  const [activeTab, setActiveTab] = useState<'applications' | 'creators'>('applications')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<ArchivedApp[]>([])
  const [creators, setCreators] = useState<ArchivedCreator[]>([])
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchArchivedData = useCallback(async (showToast = false) => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/applications/archive')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to fetch archived records')
      setApplications(data.applications || [])
      setCreators(data.creators || [])
      if (showToast) {
        toast.success('Archived records refreshed successfully')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to load archived records')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchArchivedData()
  }, [fetchArchivedData])

  // Handle Restore Application
  const handleRestoreApplication = async (appId: string, creatorName?: string) => {
    setRestoringId(appId)
    try {
      const res = await fetch('/api/admin/applications/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: [appId],
          action: 'unarchive',
          dynamic_mode: 'hold',
          reason: 'Restored from Archived Hub'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to restore application')
      toast.success(`${creatorName || 'Application'} restored to active pool`)
      fetchArchivedData()
    } catch (err: any) {
      toast.error(err.message || 'Error restoring application')
    } finally {
      setRestoringId(null)
    }
  }

  // Handle Clean Delete / Reset Application
  const handleDeleteApplication = async (appId: string) => {
    if (!confirm('Are you sure you want to completely delete/reset this application? The creator will be able to apply fresh.')) {
      return
    }
    setDeletingId(appId)
    try {
      const res = await fetch('/api/admin/applications/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: [appId],
          action: 'archive',
          dynamic_mode: 'reset',
          reason: 'Deleted from Archive Hub'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete application')
      toast.success('Application deleted successfully')
      fetchArchivedData()
    } catch (err: any) {
      toast.error(err.message || 'Error deleting application')
    } finally {
      setDeletingId(null)
    }
  }

  // Handle Restore Creator
  const handleRestoreCreator = async (userId: string, creatorName?: string) => {
    setRestoringId(userId)
    try {
      const res = await fetch('/api/admin/influencers/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: [userId],
          action: 'unarchive',
          reason: 'Restored from Archived Hub'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to restore creator')
      toast.success(`${creatorName || 'Creator'} restored to active talent pool`)
      fetchArchivedData()
    } catch (err: any) {
      toast.error(err.message || 'Error restoring creator')
    } finally {
      setRestoringId(null)
    }
  }

  // Filtered Applications
  const filteredApplications = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return applications
    return applications.filter((app) => {
      const name = app.users?.full_name?.toLowerCase() || ''
      const infId = app.users?.influencer_id?.toLowerCase() || ''
      const insta = app.users?.instagram_username?.toLowerCase() || ''
      const phone = app.users?.mobile?.toLowerCase() || ''
      const email = app.users?.email?.toLowerCase() || ''
      const brand = app.campaigns?.brand_name?.toLowerCase() || ''
      const code = app.campaigns?.campaign_code?.toLowerCase() || ''
      const reason = app.archive_reason?.toLowerCase() || ''
      const remark = app.team_remark?.toLowerCase() || ''
      return (
        name.includes(q) ||
        infId.includes(q) ||
        insta.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        brand.includes(q) ||
        code.includes(q) ||
        reason.includes(q) ||
        remark.includes(q)
      )
    })
  }, [applications, searchQuery])

  // Filtered Creators
  const filteredCreators = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return creators
    return creators.filter((c) => {
      const name = c.full_name?.toLowerCase() || ''
      const infId = c.influencer_id?.toLowerCase() || ''
      const insta = c.instagram_username?.toLowerCase() || ''
      const phone = c.mobile?.toLowerCase() || ''
      const email = c.email?.toLowerCase() || ''
      const reason = c.archive_reason?.toLowerCase() || ''
      return (
        name.includes(q) ||
        infId.includes(q) ||
        insta.includes(q) ||
        phone.includes(q) ||
        email.includes(q) ||
        reason.includes(q)
      )
    })
  }, [creators, searchQuery])

  return (
    <div className="space-y-6 pb-16">
      <SetAdminHeader pageTitle="Archived Records & Hold Hub">
        <div className="flex items-center gap-2">
          <span className="text-xl font-extrabold text-white">Archived Hub</span>
        </div>
      </SetAdminHeader>

      {/* Top Banner / Summary */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-950/40 via-slate-900/60 to-slate-900/80 p-5 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 shrink-0">
              <Archive className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Archived & Hold Management Hub
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-semibold">
                  {applications.length + creators.length} Total Shelved
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-1">
                Centrally audit, inspect, restore, or wipe shelved campaign applications and archived creator profiles.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchArchivedData(true)}
              disabled={loading}
              className="h-9 gap-1.5 border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-800"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
            <Link href="/admin/applications?status=Archived">
              <Button
                size="sm"
                className="h-9 gap-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold shadow-md shadow-amber-900/30"
              >
                <span>Open in Applications Grid</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5 pt-4 border-t border-white/5">
          <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-amber-400" />
              <span>Archived Applications</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">{applications.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5">
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-amber-400" />
              <span>Archived Creators</span>
            </div>
            <div className="text-xl font-bold text-white mt-1">{creators.length}</div>
          </div>
          <div className="col-span-2 sm:col-span-1 p-3 rounded-xl bg-slate-950/50 border border-white/5">
            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>Instant Restoration</span>
            </div>
            <div className="text-xs text-slate-300 mt-1">1-Click restore back to previous status</div>
          </div>
        </div>
      </div>

      {/* Controls Bar: Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/50 p-2 rounded-2xl border border-white/5">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-950/60 p-1 rounded-xl border border-white/5">
          <button
            type="button"
            onClick={() => setActiveTab('applications')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'applications'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Archived Applications</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-amber-300 font-bold">
              {applications.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('creators')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'creators'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-amber-400" />
            <span>Archived Creators</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-amber-300 font-bold">
              {creators.length}
            </span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={
              activeTab === 'applications'
                ? 'Search creator name, campaign, instagram, reason...'
                : 'Search creator name, ID, phone, reason...'
            }
            className="pl-9 pr-8 h-9 text-xs bg-slate-950/60 border-white/10 text-white placeholder-slate-500 focus:border-amber-500/50 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-slate-900/30 rounded-2xl border border-white/5">
          <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
          <p className="text-xs text-slate-400 font-medium">Loading archived records...</p>
        </div>
      ) : activeTab === 'applications' ? (
        /* ─── APPLICATIONS TAB ─── */
        filteredApplications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-3 bg-slate-900/30 rounded-2xl border border-white/5">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Archive className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white">No Archived Applications Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchQuery.trim()
                ? `No applications matched "${searchQuery}". Clear your search query to see all.`
                : 'Zero applications currently shelved. When you archive an application from the Applications table, it will appear here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 px-1 font-medium">
              Showing {filteredApplications.length} of {applications.length} archived applications
            </div>
            <div className="grid grid-cols-1 gap-3">
              {filteredApplications.map((app) => {
                const user = app.users
                const campaign = app.campaigns
                const instaHandle = user?.instagram_username
                  ? getInstagramDisplayHandle(user.instagram_username)
                  : null
                const instaUrl = instaHandle ? getInstagramUrl(instaHandle) : null

                return (
                  <motion.div
                    key={app.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700/60 hover:border-amber-500/40 transition-all shadow-md space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Creator Info */}
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0 overflow-hidden">
                          {user?.instagram_profile_pic ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={user.instagram_profile_pic}
                              alt={user.full_name || 'Creator'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            user?.full_name?.charAt(0)?.toUpperCase() || 'C'
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">
                              {user?.full_name || 'Unnamed Creator'}
                            </span>
                            {user?.influencer_id && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                                {user.influencer_id}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-300 border border-slate-500/30 font-semibold">
                              Status: {app.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            {instaHandle && (
                              <a
                                href={instaUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-pink-400 hover:text-pink-300 transition-colors"
                              >
                                <Instagram className="h-3 w-3" />
                                <span>@{instaHandle}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {user?.mobile && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Phone className="h-3 w-3" />
                                <span>{user.mobile}</span>
                              </span>
                            )}
                            {user?.city && (
                              <span className="text-slate-500">
                                {user.city}, {user.state}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreApplication(app.id, user?.full_name)}
                          disabled={restoringId === app.id || deletingId === app.id}
                          className="h-8 gap-1.5 text-xs font-semibold border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 cursor-pointer"
                        >
                          {restoringId === app.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          )}
                          <span>Unarchive / Restore</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteApplication(app.id)}
                          disabled={restoringId === app.id || deletingId === app.id}
                          className="h-8 gap-1.5 text-xs font-semibold border-rose-500/40 text-rose-300 hover:bg-rose-500/15 cursor-pointer"
                          title="Reset / delete record so creator can apply fresh"
                        >
                          {deletingId === app.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                          <span>Reset</span>
                        </Button>
                      </div>
                    </div>

                    {/* Campaign & Archive Metadata Footer */}
                    <div className="pt-2.5 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <span className="font-semibold text-white">Campaign:</span>
                        <span className="px-2 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-medium">
                          {campaign?.brand_name || 'Unknown Brand'}
                        </span>
                        {campaign?.campaign_code && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({campaign.campaign_code})
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-slate-400 flex-wrap">
                        {app.archive_reason && (
                          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/25 px-2.5 py-0.5 rounded-lg text-amber-300 text-[11px]">
                            <span className="font-semibold">Reason:</span>
                            <span>{app.archive_reason}</span>
                          </div>
                        )}
                        {app.archived_at && (
                          <div className="flex items-center gap-1 text-[11px] text-slate-500">
                            <Clock className="h-3 w-3" />
                            <span>
                              {new Date(app.archived_at).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                            {app.archived_by && <span>by {app.archived_by}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      ) : (
        /* ─── CREATORS TAB ─── */
        filteredCreators.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-3 bg-slate-900/30 rounded-2xl border border-white/5">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Users className="h-8 w-8" />
            </div>
            <h3 className="text-base font-bold text-white">No Archived Creators Found</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              {searchQuery.trim()
                ? `No creators matched "${searchQuery}". Clear your search query to see all.`
                : 'Zero creator accounts are currently archived.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 px-1 font-medium">
              Showing {filteredCreators.length} of {creators.length} archived creators
            </div>
            <div className="grid grid-cols-1 gap-3">
              {filteredCreators.map((creator) => {
                const instaHandle = creator.instagram_username
                  ? getInstagramDisplayHandle(creator.instagram_username)
                  : null
                const instaUrl = instaHandle ? getInstagramUrl(instaHandle) : null

                return (
                  <motion.div
                    key={creator.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-4 rounded-2xl bg-slate-900/70 border border-slate-700/60 hover:border-amber-500/40 transition-all shadow-md space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold text-sm shrink-0 overflow-hidden">
                          {creator.instagram_profile_pic ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={creator.instagram_profile_pic}
                              alt={creator.full_name || 'Creator'}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            creator.full_name?.charAt(0)?.toUpperCase() || 'C'
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-white">
                              {creator.full_name || 'Unnamed Creator'}
                            </span>
                            {creator.influencer_id && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                                {creator.influencer_id}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-semibold">
                              Archived Account
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                            {instaHandle && (
                              <a
                                href={instaUrl || '#'}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-pink-400 hover:text-pink-300 transition-colors"
                              >
                                <Instagram className="h-3 w-3" />
                                <span>@{instaHandle}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            )}
                            {creator.mobile && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Phone className="h-3 w-3" />
                                <span>{creator.mobile}</span>
                              </span>
                            )}
                            {creator.email && (
                              <span className="flex items-center gap-1 text-slate-400">
                                <Mail className="h-3 w-3" />
                                <span>{creator.email}</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestoreCreator(creator.id, creator.full_name)}
                          disabled={restoringId === creator.id}
                          className="h-8 gap-1.5 text-xs font-semibold border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/15 cursor-pointer"
                        >
                          {restoringId === creator.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ArchiveRestore className="h-3.5 w-3.5" />
                          )}
                          <span>Unarchive Creator</span>
                        </Button>
                      </div>
                    </div>

                    {creator.archive_reason && (
                      <div className="pt-2 border-t border-white/5 flex items-center gap-2 text-xs text-slate-400">
                        <span className="text-amber-300 font-medium">Archive Reason:</span>
                        <span>{creator.archive_reason}</span>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </div>
          </div>
        )
      )}
    </div>
  )
}
