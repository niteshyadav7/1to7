'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  IndianRupee,
  Instagram,
  User,
  Phone,
  MapPin,
  Sparkles,
  RefreshCw,
  FileText,
  Filter,
  ShieldAlert,
  ShieldCheck,
  History,
  CheckSquare,
  Square,
} from 'lucide-react'
import Link from 'next/link'
import { CampaignCreatorDetail, CampaignCreatorsResponse } from '@/app/api/admin/poc-dashboard/campaign-creators/route'
import { GhostActionModal, GhostActionType, TargetCreatorItem } from '@/components/admin/ghost/GhostActionModal'
import { GhostHistoryModal } from '@/components/admin/ghost/GhostHistoryModal'
import { GhostBadge } from '@/components/admin/ghost/GhostBadge'

interface PocCampaignCreatorsChitthaProps {
  campaignId: string
  brandName?: string
  campaignCode?: string
  assignedPocNames?: string[]
  onClose?: () => void
}

export function PocCampaignCreatorsChittha({
  campaignId,
  brandName,
  campaignCode,
  assignedPocNames = [],
  onClose,
}: PocCampaignCreatorsChitthaProps) {
  const [data, setData] = useState<CampaignCreatorsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  // Multi-selection for bulk ghosting
  const [selectedAppIds, setSelectedAppIds] = useState<Set<string>>(new Set())

  // Ghost Action Modal state
  const [ghostModal, setGhostModal] = useState<{
    isOpen: boolean
    actionType: GhostActionType
    targetCreator?: TargetCreatorItem | null
    bulkCreators?: TargetCreatorItem[]
  }>({
    isOpen: false,
    actionType: 'ghost',
  })

  // History Modal state
  const [historyModal, setHistoryModal] = useState<{
    isOpen: boolean
    applicationId?: string
    creatorName?: string
    brandName?: string
  }>({
    isOpen: false,
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/admin/poc-dashboard/campaign-creators?campaignId=${campaignId}`)
      if (res.ok) {
        const json: CampaignCreatorsResponse = await res.json()
        setData(json)
      }
    } catch (err) {
      console.error('Failed to load creators chittha:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (campaignId) {
      fetchData()
    }
  }, [campaignId])

  // Filter creators based on status tab and search input
  const filteredCreators = useMemo(() => {
    if (!data?.creators) return []
    let list = [...data.creators]

    // 1. Status Filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'ghosted') {
        list = list.filter(c => c.isGhosted)
      } else if (selectedStatus === 'approved') {
        // All Approved creators
        list = list.filter(c => !['Applied', 'Rejected', 'Under Process', 'Under Review'].includes(c.status))
      } else if (selectedStatus === 'pending') {
        // Pending Deliverables: Approved creators who have NOT completed yet and NOT ghosted
        list = list.filter(c => 
          !['Applied', 'Rejected', 'Under Process', 'Under Review'].includes(c.status) &&
          c.status !== 'Completed' &&
          !c.completionSubmittedAt &&
          !c.isGhosted
        )
      } else if (selectedStatus === 'completed') {
        list = list.filter(c => c.status === 'Completed' || Boolean(c.completionSubmittedAt))
      } else if (selectedStatus === 'applied') {
        list = list.filter(c => ['Applied', 'Under Process', 'Under Review'].includes(c.status))
      } else if (selectedStatus === 'rejected') {
        list = list.filter(c => c.status === 'Rejected')
      }
    }

    // 2. Search
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      list = list.filter(c => {
        const nameMatch = c.creatorName.toLowerCase().includes(q)
        const handleMatch = c.instagramUsername?.toLowerCase().includes(q)
        const cityMatch = c.city?.toLowerCase().includes(q)
        const remarkMatch = c.teamRemark?.toLowerCase().includes(q)
        return nameMatch || handleMatch || cityMatch || remarkMatch
      })
    }

    return list
  }, [data, selectedStatus, search])

  const formatFollowers = (count: number) => {
    if (!count) return '0'
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`
    return count.toString()
  }

  const getStatusBadge = (status: string, completionSubmittedAt?: string | null) => {
    if (status === 'Completed' || Boolean(completionSubmittedAt)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
          <Sparkles className="w-3 h-3 text-purple-400" />
          Completed
        </span>
      )
    }

    if (status === 'Approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          <Clock className="w-3 h-3 text-emerald-400" />
          Approved (Pending Post)
        </span>
      )
    }

    if (status === 'Payment Approved') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">
          <CheckCircle2 className="w-3 h-3" />
          Payment Approved
        </span>
      )
    }

    if (status === 'Payment Initiated') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <IndianRupee className="w-3 h-3" />
          Payment Initiated
        </span>
      )
    }

    if (status === 'Rejected') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          <XCircle className="w-3 h-3" />
          Rejected
        </span>
      )
    }

    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
        <Clock className="w-3 h-3" />
        {status}
      </span>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/90 shadow-2xl overflow-hidden backdrop-blur-2xl">
      {/* ─── 1. TOP HEADER & ACCOUNTABILITY CONTEXT ─── */}
      <div className="p-4 sm:p-5 border-b border-white/[0.08] bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px] font-mono font-bold">
              {campaignCode || data?.campaign.campaignCode || 'CAMPAIGN'}
            </span>
            <h3 className="text-base font-bold text-white tracking-wide">
              {brandName || data?.campaign.brandName} &mdash; Creators Chittha &amp; Deep Analysis
            </h3>
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400 flex-wrap">
            {assignedPocNames.length > 0 && (
              <span className="flex items-center gap-1 text-slate-300">
                <span className="text-slate-500">Handled by:</span>{' '}
                <strong className="text-blue-400">{assignedPocNames.join(', ')}</strong>
              </span>
            )}
            <span className="text-slate-600">•</span>
            <span className="text-slate-300">
              Total Applicants:{' '}
              <strong className="text-white font-mono">{data?.statusCounts.all || 0}</strong>
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5"
            title="Refresh Creator Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          <Link
            href={`/admin/applications/${campaignId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition-colors shadow-sm cursor-pointer"
          >
            <span>Open in Applications Manager</span>
            <ExternalLink className="w-3 h-3" />
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer border border-white/5 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── 2. STATUS TABS & SEARCH CONTROLS ─── */}
      <div className="p-4 border-b border-white/[0.06] bg-slate-900/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Tab Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'all'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
            }`}
          >
            <span>All Applicants</span>
            <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px]">
              {data?.statusCounts.all || 0}
            </span>
          </button>

          {/* Approved (Total) */}
          <button
            type="button"
            onClick={() => setSelectedStatus('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-emerald-400/90 hover:text-emerald-300 hover:bg-slate-800 border border-emerald-500/20'
            }`}
            title="All creators approved into this campaign (matches top table)"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Approved</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
              {data?.statusCounts.approved || 0}
            </span>
          </button>

          {/* Pending Deliverables */}
          <button
            type="button"
            onClick={() => setSelectedStatus('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'pending'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-900 text-amber-300/90 hover:text-amber-200 hover:bg-slate-800 border border-amber-500/20'
            }`}
            title="Approved creators who have not yet submitted their deliverables"
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Pending Deliverables</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-200 text-[10px]">
              {data?.statusCounts.pending || 0}
            </span>
          </button>

          {/* Completed */}
          <button
            type="button"
            onClick={() => setSelectedStatus('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'completed'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-purple-300/90 hover:text-purple-200 hover:bg-slate-800 border border-purple-500/20'
            }`}
            title="Creators who have completed their deliverables"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Completed</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-200 text-[10px]">
              {data?.statusCounts.completed || 0}
            </span>
          </button>

          {/* Under Review / Applied */}
          <button
            type="button"
            onClick={() => setSelectedStatus('applied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'applied'
                ? 'bg-sky-600 text-white shadow-md'
                : 'bg-slate-900 text-sky-300/90 hover:text-sky-200 hover:bg-slate-800 border border-sky-500/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-sky-400" />
            <span>Under Review / Applied</span>
            <span className="px-1.5 py-0.2 rounded-full bg-sky-500/20 text-sky-200 text-[10px]">
              {data?.statusCounts.applied || 0}
            </span>
          </button>

          {/* Ghosted Tab */}
          <button
            type="button"
            onClick={() => setSelectedStatus('ghosted')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'ghosted'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-900 text-rose-300/90 hover:text-rose-200 hover:bg-slate-800 border border-rose-500/20'
            }`}
            title="Creators marked as ghosted due to unresponsiveness or overdue deliverables"
          >
            <span>👻 Ghosted</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-200 text-[10px]">
              {data?.statusCounts.ghosted || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('rejected')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'rejected'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-900 text-rose-400/90 hover:text-rose-300 hover:bg-slate-800 border border-rose-500/20'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            <span>Rejected</span>
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px]">
              {data?.statusCounts.rejected || 0}
            </span>
          </button>
        </div>

        {/* Live Search Creator */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search creator name, @handle, city..."
            className="w-full pl-8.5 pr-3 py-1.5 h-9 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ─── 3. CREATORS LIST / TABLE ─── */}
      <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 text-blue-400 animate-spin mx-auto" />
            <p className="text-xs">Loading live creators chittha for {brandName || 'campaign'}...</p>
          </div>
        ) : filteredCreators.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-1">
            <p className="text-sm font-semibold">No creators found</p>
            <p className="text-xs">Try selecting a different status filter or clearing your search.</p>
          </div>
        ) : (
          <table className="w-full text-left text-xs table-auto divide-y divide-white/[0.04]">
            <thead>
              <tr className="bg-slate-950/70 text-slate-400 text-[10px] uppercase font-semibold tracking-wider sticky top-0 z-10 backdrop-blur-md">
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredCreators.length > 0 &&
                      filteredCreators.every(c => selectedAppIds.has(c.applicationId))
                    }
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedAppIds(new Set(filteredCreators.map(c => c.applicationId)))
                      } else {
                        setSelectedAppIds(new Set())
                      }
                    }}
                    className="rounded bg-slate-900 border-white/20 text-rose-500 focus:ring-0 cursor-pointer"
                    title="Select all on this view"
                  />
                </th>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3 min-w-[200px]">Creator Details</th>
                <th className="py-2.5 px-3 min-w-[140px]">Instagram &amp; Followers</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 min-w-[240px]">Accountability &amp; Review Chittha</th>
                <th className="py-2.5 px-3 text-right">Payout</th>
                <th className="py-2.5 px-3 text-center">Applied On</th>
                <th className="py-2.5 px-3 text-center min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredCreators.map((creator, index) => {
                const isApproved =
                  creator.status === 'Approved' || creator.status === 'Payment Approved'
                const isRejected = creator.status === 'Rejected'
                const isSelected = selectedAppIds.has(creator.applicationId)

                return (
                  <tr
                    key={creator.applicationId}
                    className={`transition-colors group ${
                      isSelected
                        ? 'bg-rose-950/20'
                        : creator.isGhosted
                        ? 'bg-rose-950/10 hover:bg-rose-950/20'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={e => {
                          const next = new Set(selectedAppIds)
                          if (e.target.checked) next.add(creator.applicationId)
                          else next.delete(creator.applicationId)
                          setSelectedAppIds(next)
                        }}
                        className="rounded bg-slate-900 border-white/20 text-rose-500 focus:ring-0 cursor-pointer"
                      />
                    </td>

                    {/* Index */}
                    <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                      {index + 1}
                    </td>

                    {/* Creator Details (Name, Avatar, City, Mobile) */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600/30 to-purple-600/30 border border-white/10 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {creator.creatorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-xs truncate group-hover:text-blue-300 transition-colors">
                            {creator.creatorName}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            {creator.city && (
                              <span className="flex items-center gap-0.5 text-slate-400">
                                <MapPin className="w-2.5 h-2.5 text-slate-500" />
                                {creator.city}
                              </span>
                            )}
                            {creator.mobile && (
                              <span className="flex items-center gap-0.5 font-mono text-slate-500">
                                <Phone className="w-2.5 h-2.5" />
                                {creator.mobile.replace(/(\d{3})\d{4}(\d{3})/, '$1****$2')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Instagram Handle & Followers */}
                    <td className="py-3 px-3">
                      {creator.instagramUsername ? (
                        <div className="space-y-1">
                          <a
                            href={`https://instagram.com/${creator.instagramUsername.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-pink-400 hover:text-pink-300 transition-colors group/link"
                          >
                            <Instagram className="w-3 h-3 text-pink-400 group-hover/link:scale-110 transition-transform" />
                            <span>@{creator.instagramUsername.replace('@', '')}</span>
                            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                          </a>
                          <div>
                            <span className="text-[10px] font-mono font-bold text-slate-300 px-1.5 py-0.2 rounded bg-slate-800 border border-white/5">
                              {formatFollowers(creator.followers)} followers
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No Instagram handle</span>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {creator.isGhosted ? (
                        <div className="flex flex-col items-center gap-1">
                          <GhostBadge
                            isGhosted={true}
                            onClick={() =>
                              setHistoryModal({
                                isOpen: true,
                                applicationId: creator.applicationId,
                                creatorName: creator.creatorName,
                                brandName: brandName || data?.campaign.brandName,
                              })
                            }
                          />
                          {creator.ghostedAt && (
                            <span className="text-[9px] text-rose-400 font-mono">
                              {new Date(creator.ghostedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          {getStatusBadge(creator.status, creator.completionSubmittedAt)}
                          {creator.isOverdue && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5">
                              <AlertCircle className="w-2.5 h-2.5 text-amber-400" />
                              Overdue {creator.daysOverdue}d
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Accountability & Review Chittha (Rejection reason / remarks / pitch) */}
                    <td className="py-3 px-3">
                      {creator.isGhosted ? (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-300 uppercase tracking-wide">
                            <ShieldAlert className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>Ghosted Violation Logged</span>
                          </div>
                          <p className="text-[11px] text-rose-200/90 leading-tight">
                            Account paused from new campaigns. Proof screenshots and justification recorded.
                          </p>
                        </div>
                      ) : isRejected ? (
                        <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/25 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-300 uppercase tracking-wide">
                            <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>Reject Kyu Kiya (POC Remark):</span>
                          </div>
                          <p className="text-[11px] text-rose-200/90 italic">
                            {creator.teamRemark || 'No explicit remark logged by POC.'}
                          </p>
                          {creator.teamRemarkBy && (
                            <p className="text-[9px] text-rose-400 font-mono">
                              By: {creator.teamRemarkBy}
                            </p>
                          )}
                        </div>
                      ) : isApproved ? (
                        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                          <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-300 uppercase tracking-wide">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>Approved by Operations POC</span>
                          </div>
                          {creator.pitch && (
                            <p className="text-[11px] text-slate-300 line-clamp-1 italic">
                              &ldquo;{creator.pitch}&rdquo;
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {creator.pitch ? (
                            <div className="p-1.5 rounded-lg bg-slate-900 border border-white/5">
                              <span className="text-[9px] text-slate-400 uppercase font-bold block">
                                Pitch / Notes:
                              </span>
                              <p className="text-[11px] text-slate-300 line-clamp-2">
                                {creator.pitch}
                              </p>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-500">
                              Awaiting review by POC
                            </span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Payout */}
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {creator.paymentAmount && creator.paymentAmount > 0 ? (
                        <span>₹{creator.paymentAmount.toLocaleString()}</span>
                      ) : creator.finalPayment > 0 ? (
                        <span>₹{creator.finalPayment.toLocaleString()}</span>
                      ) : (
                        <span className="text-slate-500 font-normal">₹0</span>
                      )}
                    </td>

                    {/* Applied On */}
                    <td className="py-3 px-3 text-center whitespace-nowrap text-slate-400 font-mono text-[10px]">
                      {creator.appliedAt
                        ? new Date(creator.appliedAt).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : '—'}
                    </td>

                    {/* Actions Column */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {creator.isGhosted ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setGhostModal({
                                isOpen: true,
                                actionType: 'unghost',
                                targetCreator: {
                                  applicationId: creator.applicationId,
                                  creatorName: creator.creatorName,
                                  instagramUsername: creator.instagramUsername,
                                  brandName: brandName || data?.campaign.brandName,
                                  campaignCode: campaignCode || data?.campaign.campaignCode,
                                },
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            title="Un-ghost creator with proof and unblock their account"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Un-ghost</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setHistoryModal({
                                isOpen: true,
                                applicationId: creator.applicationId,
                                creatorName: creator.creatorName,
                                brandName: brandName || data?.campaign.brandName,
                              })
                            }
                            className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-[10px] transition-colors cursor-pointer"
                            title="View Ghost Audit Trail & Proof Screenshots"
                          >
                            <History className="w-3 h-3" />
                          </button>
                        </div>
                      ) : isApproved && !creator.completionSubmittedAt && creator.status !== 'Completed' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              setGhostModal({
                                isOpen: true,
                                actionType: 'ghost',
                                targetCreator: {
                                  applicationId: creator.applicationId,
                                  creatorName: creator.creatorName,
                                  instagramUsername: creator.instagramUsername,
                                  brandName: brandName || data?.campaign.brandName,
                                  campaignCode: campaignCode || data?.campaign.campaignCode,
                                },
                              })
                            }
                            className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                            title="Mark creator as ghosted with screenshot proof and comments"
                          >
                            <span>👻</span>
                            <span>Mark Ghosted</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-600">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── 4. FLOATING BULK ACTIONS BAR (When Creators Selected) ─── */}
      {selectedAppIds.size > 0 && (
        <div className="p-3 bg-rose-950/90 border-t border-rose-500/40 flex items-center justify-between px-5 text-xs animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-white">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span>
              <strong className="font-mono text-rose-300">{selectedAppIds.size}</strong> creator(s) selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedAppIds(new Set())}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => {
                const selectedCreators = filteredCreators
                  .filter(c => selectedAppIds.has(c.applicationId))
                  .map(c => ({
                    applicationId: c.applicationId,
                    creatorName: c.creatorName,
                    instagramUsername: c.instagramUsername,
                    brandName: brandName || data?.campaign.brandName,
                    campaignCode: campaignCode || data?.campaign.campaignCode,
                  }))
                setGhostModal({
                  isOpen: true,
                  actionType: 'bulk-ghost',
                  bulkCreators: selectedCreators,
                })
              }}
              className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-950/50 cursor-pointer"
            >
              <span>👻 Mark Selected as Ghosted ({selectedAppIds.size})</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── 5. FOOTER SUMMARY BAR ─── */}
      <div className="p-3 bg-slate-950 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 px-4">
        <span>
          Showing <strong className="text-white font-mono">{filteredCreators.length}</strong> of{' '}
          <strong className="text-white font-mono">{data?.statusCounts.all || 0}</strong> applicants
        </span>
        <span className="text-[11px] text-slate-500">
          Click any Instagram handle or Ghost badge to view live proofs &amp; audit history
        </span>
      </div>

      {/* Ghost Action Modal (Single or Bulk Ghost / Unghost) */}
      <GhostActionModal
        isOpen={ghostModal.isOpen}
        actionType={ghostModal.actionType}
        targetCreator={ghostModal.targetCreator}
        bulkCreators={ghostModal.bulkCreators}
        onClose={() =>
          setGhostModal(prev => ({ ...prev, isOpen: false }))
        }
        onSuccess={() => {
          setSelectedAppIds(new Set())
          fetchData()
        }}
      />

      {/* Ghost Audit History Modal */}
      <GhostHistoryModal
        isOpen={historyModal.isOpen}
        applicationId={historyModal.applicationId}
        creatorName={historyModal.creatorName}
        brandName={historyModal.brandName}
        onClose={() =>
          setHistoryModal(prev => ({ ...prev, isOpen: false }))
        }
      />
    </div>
  )
}
