'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Megaphone, Plus, Eye, EyeOff, Pencil, Users,
  Instagram, Youtube, ShoppingBag, Globe, Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'

interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
  category: string
  platform: string
  budget_type: string
  status: string
  is_live: boolean
  created_at: string
  application_count: number
}

const platformIcons: Record<string, React.ReactNode> = {
  'Instagram': <Instagram className="h-4 w-4 text-pink-400" />,
  'YouTube': <Youtube className="h-4 w-4 text-red-400" />,
  'Amazon': <ShoppingBag className="h-4 w-4 text-amber-400" />,
}

const statusColors: Record<string, string> = {
  'Draft': 'bg-slate-500/15 text-slate-300 border-slate-500/20',
  'Active': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Review': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Closed': 'bg-red-500/15 text-red-300 border-red-500/20',
}

const filters = ['All', 'Active', 'Draft', 'Review', 'Closed']

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const toggleLive = async (campaign: Campaign) => {
    setTogglingId(campaign.id)
    try {
      const res = await fetch(`/api/admin/campaigns/${campaign.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_live: !campaign.is_live }),
      })
      if (!res.ok) throw new Error('Failed to update')

      setCampaigns(prev =>
        prev.map(c => c.id === campaign.id ? { ...c, is_live: !c.is_live } : c)
      )
      toast.success(campaign.is_live ? 'Campaign taken offline' : 'Campaign is now live!')
    } catch {
      toast.error('Failed to toggle')
    } finally {
      setTogglingId(null)
    }
  }

  const filtered = campaigns.filter(c => {
    const matchesFilter = activeFilter === 'All' || c.status === activeFilter
    const matchesSearch = 
      c.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      c.campaign_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.platform.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  if (loading) {
    return <GlobalLoader text="Loading Campaigns..." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Campaigns</h1>
          <p className="text-sm text-slate-400 mt-1">Manage all brand campaigns</p>
        </div>
        <Link href="/admin/campaigns/create">
          <Button className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white font-semibold text-sm shadow-lg shadow-indigo-500/20 cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            New Campaign
          </Button>
        </Link>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                activeFilter === f
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
              }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  ({campaigns.filter(c => c.status === f).length})
                </span>
              )}
              {f === 'All' && (
                <span className="ml-1.5 text-[10px] opacity-60">({campaigns.length})</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-9 bg-slate-900/50 border-white/5 text-white h-10 text-sm focus-visible:ring-indigo-500 rounded-xl w-full transition-all hover:bg-slate-900/80"
          />
        </div>
      </div>

      {/* Campaign Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No campaigns found</h3>
          <p className="text-sm text-slate-500 mt-2">
            {activeFilter !== 'All' ? 'Try a different filter' : 'Create your first campaign'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((campaign, i) => (
              <motion.div
                layout
                key={campaign.id}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="group rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg p-5 hover:bg-slate-800/80 hover:border-white/10 transition-all shadow-lg hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-0.5"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center justify-center h-11 w-11 rounded-xl bg-slate-800 border border-white/5 text-slate-400 shrink-0 group-hover:bg-slate-700/50 group-hover:border-white/10 transition-colors">
                      {platformIcons[campaign.platform] || <Globe className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-white truncate">{campaign.brand_name}</h3>
                      <p className="text-xs text-slate-500">{campaign.campaign_code} • {campaign.platform}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium border ${statusColors[campaign.status] || statusColors['Draft']}`}>
                    {campaign.status}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-4 text-xs text-slate-400">
                  {campaign.category && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/5">{campaign.category}</span>
                  )}
                  {campaign.budget_type && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/5">{campaign.budget_type}</span>
                  )}
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 border border-white/5 font-medium text-slate-300">
                    <Users className="h-3 w-3 text-indigo-400" />
                    {campaign.application_count} applied
                  </span>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-auto">
                  {/* Live Toggle */}
                  <button
                    onClick={() => toggleLive(campaign)}
                    disabled={togglingId === campaign.id}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                      campaign.is_live
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20 hover:bg-emerald-500/25'
                        : 'bg-slate-800/80 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {campaign.is_live ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {campaign.is_live ? 'Live' : 'Offline'}
                  </button>

                  {/* Edit */}
                  <Link href={`/admin/campaigns/${campaign.id}`}>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-400 border border-white/5 hover:bg-white/10 hover:text-white transition-all cursor-pointer">
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </Link>

                  {/* View Applications */}
                  <Link href={`/admin/applications/${campaign.id}`} className="ml-auto">
                    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/10 transition-all cursor-pointer">
                      <Users className="h-3.5 w-3.5" />
                      View Applications
                    </button>
                  </Link>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
