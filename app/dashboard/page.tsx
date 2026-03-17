'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2, Clock, XCircle, TrendingUp, Loader2, Sparkles, Instagram, Youtube, ShoppingBag, Search } from 'lucide-react'
import Link from 'next/link'
import CampaignCard from '@/components/campaigns/CampaignCard'
import CampaignDetailModal from '@/components/campaigns/CampaignDetailModal'
import ApplicationFormModal from '@/components/campaigns/ApplicationFormModal'
import { Input } from '@/components/ui/input'

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
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Modal states
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [statsRes, campaignsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/campaigns'), // Fetch live campaigns
      ])
      const statsData = await statsRes.json()
      const campaignsData = await campaignsRes.json()

      setStats(statsData.stats || null)
      setCampaigns(campaignsData.campaigns || [])
    } catch {
      console.error('Failed to fetch dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (campaign: any) => {
    setSelectedCampaign(campaign)
    setDetailOpen(true)
  }

  const handleApply = (campaign: any) => {
    setDetailOpen(false)
    setSelectedCampaign(campaign)
    setApplyOpen(true)
  }

  const handleApplicationSuccess = () => {
    // Optionally refresh stats if an application was successfully submitted
    fetchData()
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

      {/* Live Campaigns Grid */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-white tracking-wide whitespace-nowrap">Live Campaigns</h2>
          
          <div className="relative w-full md:max-w-xl mx-auto md:mx-4 flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search campaigns by brand, code, or platform..."
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              className="pl-9 bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 rounded-xl h-10 w-full"
            />
          </div>

          <Link
            href="/dashboard/campaigns"
            className="text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
          >
            Manage Applications →
          </Link>
        </div>

        {(() => {
          const filteredCampaigns = campaigns.filter(c =>
            c.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.campaign_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.platform?.toLowerCase().includes(searchQuery.toLowerCase())
          )

          if (campaigns.length === 0) {
            return (
              <div className="text-center py-20 rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg">
                <Sparkles className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-400">No live campaigns right now</h3>
                <p className="text-sm text-slate-500 mt-2">Check back soon — new brand campaigns drop every week!</p>
              </div>
            )
          }

          if (filteredCampaigns.length === 0) {
             return (
              <div className="text-center py-20 rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg">
                <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-400">No campaigns found</h3>
                <p className="text-sm text-slate-500 mt-2">Try adjusting your search query.</p>
              </div>
            )
          }

          return (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredCampaigns.map((campaign, index) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  index={index}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )
        })()}
      </div>

      {/* Modals */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onApply={handleApply}
        isLoggedIn={true}
      />

      <ApplicationFormModal
        campaign={selectedCampaign}
        isOpen={applyOpen}
        onClose={() => setApplyOpen(false)}
        onSuccess={handleApplicationSuccess}
      />
    </div>
  )
}
