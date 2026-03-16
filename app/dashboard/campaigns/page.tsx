'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, Instagram, Youtube, ShoppingBag, Loader2, Filter } from 'lucide-react'

interface Application {
  id: string
  status: string
  form_data: any
  created_at: string
  updated_at: string
  campaigns: {
    id: string
    brand_name: string
    platform: string
    category: string
    budget_type: string
    deliverables: string
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

const statuses = ['All', 'Applied', 'Approved', 'Rejected', 'Completed', 'Payment Initiated']

export default function AppliedCampaignsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const res = await fetch('/api/dashboard/applications')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      console.error('Failed to fetch applications')
    } finally {
      setLoading(false)
    }
  }

  const filteredApps = activeFilter === 'All'
    ? applications
    : applications.filter((app) => app.status === activeFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Applied Campaigns</h1>
        <p className="text-sm text-slate-400 mt-1">All campaigns you&apos;ve applied to</p>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="h-4 w-4 text-slate-500 mr-1" />
        {statuses.map((status) => (
          <button
            key={status}
            onClick={() => setActiveFilter(status)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium border transition-all cursor-pointer ${
              activeFilter === status
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-slate-300'
            }`}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Applications List */}
      {filteredApps.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
          <Send className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">
            {activeFilter === 'All' ? 'No applications yet' : `No ${activeFilter.toLowerCase()} applications`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredApps.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg p-5 hover:bg-slate-900/80 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-slate-800 text-slate-400 shrink-0">
                    {platformIcons[app.campaigns?.platform] || <Send className="h-5 w-5" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-white">{app.campaigns?.brand_name || 'Campaign'}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.campaigns?.category} · {app.campaigns?.budget_type}
                    </p>
                    <p className="text-xs text-slate-400 mt-2 line-clamp-1">
                      {app.campaigns?.deliverables}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium border ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                    {app.status}
                  </span>
                  <span className="text-xs text-slate-500">
                    {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
