'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone, Users, Send, Clock, CheckCircle2, TrendingUp,
  Loader2, Instagram, Youtube, ShoppingBag, Zap
} from 'lucide-react'
import Link from 'next/link'

interface Stats {
  totalCampaigns: number
  liveCampaigns: number
  totalApplications: number
  pendingApplications: number
  approvedApplications: number
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
  const [recentApps, setRecentApps] = useState<RecentApplication[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/dashboard/stats')
      const data = await res.json()
      setStats(data.stats || null)
      setRecentApps(data.recentApplications || [])
    } catch {
      console.error('Failed to fetch admin stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Campaigns', value: stats?.totalCampaigns || 0, icon: Megaphone, gradient: 'from-indigo-500 to-blue-600', bg: 'bg-indigo-500/10' },
    { label: 'Live Campaigns', value: stats?.liveCampaigns || 0, icon: Zap, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10' },
    { label: 'Total Applications', value: stats?.totalApplications || 0, icon: Send, gradient: 'from-purple-500 to-pink-600', bg: 'bg-purple-500/10' },
    { label: 'Pending Review', value: stats?.pendingApplications || 0, icon: Clock, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10' },
    { label: 'Approved', value: stats?.approvedApplications || 0, icon: CheckCircle2, gradient: 'from-teal-500 to-cyan-600', bg: 'bg-teal-500/10' },
    { label: 'Total Influencers', value: stats?.totalInfluencers || 0, icon: Users, gradient: 'from-rose-500 to-red-600', bg: 'bg-rose-500/10' },
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
            className="relative rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg p-5 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-20 h-20 rounded-full ${card.bg} blur-2xl -translate-y-1/2 translate-x-1/2`} />
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

      {/* Recent Applications */}
      <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
          <h2 className="text-lg font-semibold text-white">Recent Applications</h2>
        </div>

        {recentApps.length === 0 ? (
          <div className="p-10 text-center">
            <Send className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No applications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentApps.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-800 text-slate-400">
                    {platformIcons[app.campaigns?.platform] || <Send className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {app.users?.full_name || 'Unknown'}{' '}
                      <span className="text-slate-500">→</span>{' '}
                      {app.campaigns?.brand_name || 'Campaign'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {app.users?.influencer_id} • {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium border whitespace-nowrap ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                  {app.status}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
