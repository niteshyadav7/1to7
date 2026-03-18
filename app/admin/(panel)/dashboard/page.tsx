'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone, Users, Send, Clock, CheckCircle2,
  Loader2, Instagram, Youtube, ShoppingBag, Zap,
  XCircle, UserCheck
} from 'lucide-react'
import Link from 'next/link'
import { GlobalLoader } from '@/components/ui/global-loader'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { toast } from 'sonner'

interface Stats {
  totalCampaigns: number
  liveCampaigns: number
  totalApplications: number
  pendingApplications: number
  approvedApplications: number
  rejectedApplications: number
  totalInfluencers: number
}

interface RecentApplication {
  id: string
  status: string
  created_at: string
  users: {
    full_name: string
    influencer_id: string
    instagram_username: string
  }
  campaigns: {
    brand_name: string
    platform: string
    campaign_code: string
  }
}

const platformIcons: Record<string, React.ReactNode> = {
  'Instagram': <Instagram className="h-4 w-4" />,
  'YouTube': <Youtube className="h-4 w-4" />,
  'Amazon': <ShoppingBag className="h-4 w-4" />,
}

const statusColors: Record<string, string> = {
  'Applied': 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  'Approved': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Rejected': 'bg-red-500/15 text-red-300 border-red-500/20',
  'Completed': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Payment Initiated': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentPendingApps, setRecentPendingApps] = useState<RecentApplication[]>([])
  const [recentApprovedApps, setRecentApprovedApps] = useState<RecentApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard/stats')
      const data = await res.json()
      setStats(data.stats || null)
      setRecentPendingApps(data.recentPendingApplications || [])
      setRecentApprovedApps(data.recentApprovedApplications || [])
    } catch {
      console.error('Failed to fetch admin stats')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (appId: string, newStatus: string) => {
    setUpdatingId(appId)
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')

      toast.success(`Application ${newStatus.toLowerCase()}`)
      // Refetch stats to keep dashboard updated
      fetchData()
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <GlobalLoader text="Loading Dashboard Data..." />
  }

  const applicationChartData = [
    { name: 'Approved', value: stats?.approvedApplications || 0, color: '#10b981' },
    { name: 'Pending', value: stats?.pendingApplications || 0, color: '#f59e0b' },
    { name: 'Rejected', value: stats?.rejectedApplications || 0, color: '#ef4444' },
  ].filter(item => item.value > 0)

  const statCards = [
    { label: 'Total Campaigns', value: stats?.totalCampaigns || 0, icon: Megaphone, gradient: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-500/10' },
    { label: 'Live Campaigns', value: stats?.liveCampaigns || 0, icon: Zap, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10' },
    { label: 'Total Applications', value: stats?.totalApplications || 0, icon: Send, gradient: 'from-purple-500 to-pink-600', bg: 'bg-purple-500/10' },
    { label: 'Pending Review', value: stats?.pendingApplications || 0, icon: Clock, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10' },
    { label: 'Rejected', value: stats?.rejectedApplications || 0, icon: XCircle, gradient: 'from-red-500 to-rose-600', bg: 'bg-red-500/10' },
    { label: 'Total Influencers', value: stats?.totalInfluencers || 0, icon: Users, gradient: 'from-indigo-400 to-purple-500', bg: 'bg-purple-500/10' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Overview of campaigns, applications, and influencers</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="group relative rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg p-5 overflow-hidden hover:bg-slate-800/80 hover:border-white/10 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/5 cursor-default hover:-translate-y-1"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 rounded-full ${card.bg} blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:scale-110 transition-transform duration-500`} />
            <div className="relative">
              <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br ${card.gradient} p-2.5 shadow-lg mb-3`}>
                <card.icon className="h-5 w-5 text-white" />
              </div>
              <p className="text-3xl font-bold text-white">{card.value}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">{card.label}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Split Applications View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Pending Applications */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-400" />
              Pending Applications
            </h2>
            <Link href="/admin/campaigns" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View Campaigns</Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {recentPendingApps.length === 0 ? (
              <div className="p-10 text-center">
                <Send className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No pending applications</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentPendingApps.map((app, i) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-800/80 text-slate-400 border border-white/5 group-hover:border-white/10 transition-colors">
                        {platformIcons[app.campaigns?.platform] || <Send className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                          {app.users?.full_name || 'Unknown'}{' '}
                          <span className="text-slate-500 px-1">→</span>{' '}
                          {app.campaigns?.brand_name || 'Campaign'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {app.users?.influencer_id || 'No ID'} • {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border whitespace-nowrap ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                        {app.status}
                      </span>
                      {/* Quick Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          disabled={updatingId === app.id}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateStatus(app.id, 'Approved') }}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
                          title="Approve"
                        >
                          {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        </button>
                        <button
                          disabled={updatingId === app.id}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); updateStatus(app.id, 'Rejected') }}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50 flex items-center justify-center cursor-pointer"
                          title="Reject"
                        >
                          {updatingId === app.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Approved Applications */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-emerald-400" />
              Approved Influencers
            </h2>
            <Link href="/admin/campaigns" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View Campaigns</Link>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[400px]">
            {recentApprovedApps.length === 0 ? (
              <div className="p-10 text-center">
                <CheckCircle2 className="h-10 w-10 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-400">No approved applications</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {recentApprovedApps.map((app, i) => (
                  <motion.div
                    key={app.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.03] transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-slate-800/80 text-slate-400 border border-white/5 group-hover:border-white/10 transition-colors">
                        {platformIcons[app.campaigns?.platform] || <Send className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate group-hover:text-white transition-colors">
                          {app.users?.full_name || 'Unknown'}{' '}
                          <span className="text-slate-500 px-1">→</span>{' '}
                          {app.campaigns?.brand_name || 'Campaign'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {app.users?.influencer_id || 'No ID'} • {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium border whitespace-nowrap ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                      {app.status}
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
