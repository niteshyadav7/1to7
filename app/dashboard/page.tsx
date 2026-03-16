'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2, Clock, XCircle, TrendingUp, Loader2, Instagram, Youtube, ShoppingBag } from 'lucide-react'
import Link from 'next/link'

interface Stats {
  total: number
  approved: number
  pending: number
  completed: number
  rejected: number
}

interface Application {
  id: string
  status: string
  created_at: string
  campaigns: {
    brand_name: string
    platform: string
    category: string
    budget_type: string
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

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentApps, setRecentApps] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, appsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/applications'),
      ])
      const statsData = await statsRes.json()
      const appsData = await appsRes.json()

      setStats(statsData.stats || null)
      setRecentApps((appsData.applications || []).slice(0, 5))
    } catch {
      console.error('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Applied', value: stats?.total || 0, icon: Send, gradient: 'from-blue-500 to-indigo-600', bg: 'bg-blue-500/10' },
    { label: 'Approved', value: stats?.approved || 0, icon: CheckCircle2, gradient: 'from-emerald-500 to-green-600', bg: 'bg-emerald-500/10' },
    { label: 'Pending', value: stats?.pending || 0, icon: Clock, gradient: 'from-amber-500 to-orange-600', bg: 'bg-amber-500/10' },
    { label: 'Completed', value: stats?.completed || 0, icon: TrendingUp, gradient: 'from-purple-500 to-pink-600', bg: 'bg-purple-500/10' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard Overview</h1>
        <p className="text-sm text-slate-400 mt-1">Track your campaign applications and performance</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
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
          <Link
            href="/dashboard/campaigns"
            className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
          >
            View All →
          </Link>
        </div>

        {recentApps.length === 0 ? (
          <div className="p-10 text-center">
            <Send className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-sm text-slate-400">No applications yet</p>
            <p className="text-xs text-slate-500 mt-1">Browse campaigns and start applying!</p>
            <Link
              href="/"
              className="inline-block mt-4 text-xs font-medium px-4 py-2 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 transition-colors cursor-pointer"
            >
              Browse Campaigns
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentApps.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-slate-800 text-slate-400">
                    {platformIcons[app.campaigns?.platform] || <Send className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{app.campaigns?.brand_name || 'Campaign'}</p>
                    <p className="text-xs text-slate-500">{new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium border ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
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
