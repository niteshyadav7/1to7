'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Send, CheckCircle2, Clock, TrendingUp, Sparkles, Instagram, Youtube, ShoppingBag, Search } from 'lucide-react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import CampaignCard from '@/components/campaigns/CampaignCard'
import CampaignDetailModal from '@/components/campaigns/CampaignDetailModal'
import { Input } from '@/components/ui/input'
import BrandLoader from '@/components/ui/BrandLoader'
import { toast } from 'sonner'

interface Stats {
  total: number
  approved: number
  pending: number
  completed: number
  rejected: number
}

export default function VirtualProfileOverviewPage() {
  const { userId } = useParams<{ userId: string }>()
  const [stats, setStats] = useState<Stats | null>(null)
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [virtualUser, setVirtualUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const basePath = `/admin/virtual-profile/${userId}`

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    Promise.all([
      fetch(`/api/admin/virtual-profile/${userId}?action=stats`).then(r => r.json()),
      fetch('/api/campaigns').then(r => r.json()),
      fetch(`/api/admin/virtual-profile/${userId}?action=profile`).then(r => r.json()),
    ])
      .then(([statsData, campaignsData, profileData]) => {
        setStats(statsData.stats || null)
        setCampaigns(campaignsData.campaigns || [])
        setVirtualUser(profileData.user || null)
      })
      .catch(() => toast.error('Failed to fetch dashboard data'))
      .finally(() => setLoading(false))
  }, [userId])

  const handleViewDetails = (campaign: any) => {
    setSelectedCampaign(campaign)
    setDetailOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  const statCards = [
    { 
      label: 'Total Applied', 
      value: stats?.total || 0, 
      icon: Send, 
      iconColor: 'text-blue-600', 
      iconBg: 'bg-blue-50', 
      borderColor: 'border-slate-100 hover:border-blue-200' 
    },
    { 
      label: 'Approved', 
      value: stats?.approved || 0, 
      icon: CheckCircle2, 
      iconColor: 'text-emerald-600', 
      iconBg: 'bg-emerald-50', 
      borderColor: 'border-slate-100 hover:border-emerald-200' 
    },
    { 
      label: 'Pending', 
      value: stats?.pending || 0, 
      icon: Clock, 
      iconColor: 'text-amber-600', 
      iconBg: 'bg-amber-50', 
      borderColor: 'border-slate-100 hover:border-amber-200' 
    },
    { 
      label: 'Completed', 
      value: stats?.completed || 0, 
      icon: TrendingUp, 
      iconColor: 'text-purple-600', 
      iconBg: 'bg-purple-50', 
      borderColor: 'border-slate-100 hover:border-purple-200' 
    },
  ]

  const filteredCampaigns = campaigns.filter(c =>
    c.brand_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.campaign_code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.platform?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-3.5">
      {/* Header + Stats Inline Strip - exact creator UI */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
        <div>
          <h1 className="text-sm font-extrabold text-charcoal-surface tracking-tight">Dashboard Overview</h1>
          <p className="text-[11px] text-secondary">Creator&apos;s campaign applications & performance</p>
        </div>

        {/* Compact Stat Cards Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`relative rounded-lg border bg-slate-50/60 px-3 py-1.5 overflow-hidden transition-all duration-200 ${card.borderColor} flex items-center justify-between gap-2.5 min-w-[120px]`}
            >
              <div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{card.label}</p>
                <p className="text-sm font-extrabold text-charcoal-surface leading-tight">{card.value}</p>
              </div>
              <div className={`inline-flex items-center justify-center rounded-md ${card.iconBg} ${card.iconColor} p-1.5 shrink-0`}>
                <card.icon className="h-3.5 w-3.5" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Live Campaigns Grid */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <h2 className="text-sm font-extrabold text-charcoal-surface tracking-tight">Live Campaigns</h2>
            <p className="text-[11px] text-secondary font-medium">Browse active brand collaborations</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="pl-7 bg-white border border-slate-200/80 text-charcoal-surface text-xs placeholder:text-secondary rounded-lg h-8 w-full focus-visible:ring-primary-container"
              />
            </div>
            <Link
              href={`${basePath}/applied`}
              className="inline-flex items-center justify-center text-[11px] font-bold text-[#f50057] hover:text-[#d8004c] border border-slate-200 bg-white px-3 py-1.5 rounded-lg shadow-2xs hover:bg-slate-50 transition-all whitespace-nowrap cursor-pointer"
            >
              Applications →
            </Link>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-20 rounded-md border border-border-subtle bg-white shadow-sm">
            <Sparkles className="h-12 w-12 text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-bold text-charcoal-surface">No live campaigns right now</h3>
            <p className="text-sm text-secondary mt-2">Check back soon — new brand campaigns drop every week!</p>
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="text-center py-20 rounded-md border border-border-subtle bg-white shadow-sm">
            <Search className="h-12 w-12 text-secondary mx-auto mb-4" />
            <h3 className="text-lg font-bold text-charcoal-surface">No campaigns found</h3>
            <p className="text-sm text-secondary mt-2">Try adjusting your search query.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredCampaigns.map((campaign, index) => (
              <CampaignCard
                key={campaign.id}
                campaign={campaign}
                index={index}
                onViewDetails={handleViewDetails}
                user={virtualUser}
              />
            ))}
          </div>
        )}
      </div>

      {/* Campaign Detail Modal */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onApply={() => toast.info('Admin mode: Apply is disabled on behalf of creators')}
        isLoggedIn={true}
        user={virtualUser}
      />
    </div>
  )
}
