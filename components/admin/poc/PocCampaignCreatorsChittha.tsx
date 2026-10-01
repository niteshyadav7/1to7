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
} from 'lucide-react'
import Link from 'next/link'
import { CampaignCreatorDetail, CampaignCreatorsResponse } from '@/app/api/admin/poc-dashboard/campaign-creators/route'

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
      if (selectedStatus === 'approved') {
        list = list.filter(c => c.status === 'Approved' || c.status === 'Payment Approved')
      } else if (selectedStatus === 'applied') {
        list = list.filter(c => c.status === 'Applied' || c.status === 'Under Process')
      } else if (selectedStatus === 'completed') {
        list = list.filter(c => c.status === 'Completed')
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Payment Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            {status}
          </span>
        )
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        )
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            {status}
          </span>
        )
    }
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

          <button
            type="button"
            onClick={() => setSelectedStatus('approved')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'approved'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-emerald-400/90 hover:text-emerald-300 hover:bg-slate-800 border border-emerald-500/20'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Approved</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">
              {data?.statusCounts.approved || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('applied')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'applied'
                ? 'bg-amber-600 text-white shadow-md'
                : 'bg-slate-900 text-amber-300/90 hover:text-amber-200 hover:bg-slate-800 border border-amber-500/20'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span>Under Review / Applied</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-200 text-[10px]">
              {data?.statusCounts.applied || 0}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedStatus('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              selectedStatus === 'completed'
                ? 'bg-purple-600 text-white shadow-md'
                : 'bg-slate-900 text-purple-300/90 hover:text-purple-200 hover:bg-slate-800 border border-purple-500/20'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Completed</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-200 text-[10px]">
              {data?.statusCounts.completed || 0}
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
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3 min-w-[200px]">Creator Details</th>
                <th className="py-2.5 px-3 min-w-[140px]">Instagram &amp; Followers</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 min-w-[260px]">Accountability &amp; Review Chittha</th>
                <th className="py-2.5 px-3 text-right">Payout</th>
                <th className="py-2.5 px-3 text-center">Applied On</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filteredCreators.map((creator, index) => {
                const isApproved =
                  creator.status === 'Approved' || creator.status === 'Payment Approved'
                const isRejected = creator.status === 'Rejected'

                return (
                  <tr
                    key={creator.applicationId}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
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
                      {getStatusBadge(creator.status)}
                    </td>

                    {/* Accountability & Review Chittha (Rejection reason / remarks / pitch) */}
                    <td className="py-3 px-3">
                      {isRejected ? (
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
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── 4. FOOTER SUMMARY BAR ─── */}
      <div className="p-3 bg-slate-950 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400 px-4">
        <span>
          Showing <strong className="text-white font-mono">{filteredCreators.length}</strong> of{' '}
          <strong className="text-white font-mono">{data?.statusCounts.all || 0}</strong> applicants
        </span>
        <span className="text-[11px] text-slate-500">
          Click any Instagram handle to verify creator profile live
        </span>
      </div>
    </div>
  )
}
