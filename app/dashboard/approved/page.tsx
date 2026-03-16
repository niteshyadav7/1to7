'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Instagram, Youtube, ShoppingBag, Loader2, DollarSign, Send } from 'lucide-react'
import Link from 'next/link'

interface Application {
  id: string
  status: string
  partial_payment: number
  final_payment: number
  pending_amount: number
  created_at: string
  campaigns: {
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

export default function ApprovedCampaignsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchApproved()
  }, [])

  const fetchApproved = async () => {
    try {
      const res = await fetch('/api/dashboard/applications?status=Approved')
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      console.error('Failed to fetch approved campaigns')
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Approved Campaigns</h1>
        <p className="text-sm text-slate-400 mt-1">Campaigns you've been selected for — time to create!</p>
      </div>

      {applications.length === 0 ? (
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-400">No approved campaigns yet</p>
          <p className="text-xs text-slate-500 mt-1">Keep applying — brands are reviewing your profile!</p>
          <Link
            href="/"
            className="inline-block mt-4 text-xs font-medium px-4 py-2 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 transition-colors cursor-pointer"
          >
            Browse Campaigns
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {applications.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-emerald-500/10 bg-slate-900/60 backdrop-blur-lg p-5 hover:border-emerald-500/20 transition-all"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400">
                  {platformIcons[app.campaigns?.platform] || <Send className="h-5 w-5" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">{app.campaigns?.brand_name}</h3>
                  <p className="text-xs text-slate-500">{app.campaigns?.category}</p>
                </div>
                <span className="ml-auto rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 border border-emerald-500/20">
                  ✅ Approved
                </span>
              </div>

              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{app.campaigns?.deliverables}</p>

              {/* Payment Info */}
              <div className="grid grid-cols-3 gap-3 pt-3 border-t border-white/5">
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Partial</p>
                  <p className="text-sm font-semibold text-white">₹{app.partial_payment || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Final</p>
                  <p className="text-sm font-semibold text-white">₹{app.final_payment || 0}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mb-0.5">Pending</p>
                  <p className="text-sm font-semibold text-amber-400">₹{app.pending_amount || 0}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
