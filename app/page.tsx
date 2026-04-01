'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Rocket, TrendingUp, Shield, Loader2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import CampaignCard from '@/components/campaigns/CampaignCard'
import CampaignDetailModal from '@/components/campaigns/CampaignDetailModal'
import ApplicationFormModal from '@/components/campaigns/ApplicationFormModal'

interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
  category: string
  platform: string
  budget_type: string
  deliverables: string
  product_links: string[]
  requirements: string
  gender_required: string
  is_live: boolean
  status: string
  created_at: string
  location?: string
  looking_for?: string
  followers?: string
  additional_info?: string
  collab_date?: string
  form_link?: string
  form_fields?: { name: string; type: string; required: boolean; options: string[] }[]
}

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const filteredCampaigns = campaigns.filter((c) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return (
      c.brand_name?.toLowerCase().includes(q) ||
      c.category?.toLowerCase().includes(q) ||
      c.platform?.toLowerCase().includes(q) ||
      c.campaign_code?.toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch {
      console.error('Failed to fetch campaigns')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetails = (campaign: Campaign) => {
    setSelectedCampaign(campaign)
    setDetailOpen(true)
  }

  const handleApply = (campaign: Campaign) => {
    if (!user) {
      router.push('/login')
      return
    }
    setDetailOpen(false)
    setSelectedCampaign(campaign)
    setApplyOpen(true)
  }

  const handleApplicationSuccess = () => {
    setApplyOpen(false)
    setSelectedCampaign(null)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-purple-500/30 font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background — rich layered mesh */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0a0118] via-[#080016] to-slate-950" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,58,237,0.25),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_40%_60%_at_25%_20%,rgba(168,85,247,0.15),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_35%_50%_at_75%_30%,rgba(236,72,153,0.12),transparent)]" />
        {/* Animated glow orbs */}
        <div className="pointer-events-none absolute -top-20 left-1/4 h-72 w-72 rounded-full bg-purple-600/20 blur-[100px] animate-pulse" />
        <div className="pointer-events-none absolute top-10 right-1/4 h-56 w-56 rounded-full bg-pink-500/15 blur-[80px] animate-pulse [animation-delay:1s]" />
        <div className="pointer-events-none absolute -bottom-10 left-1/2 -translate-x-1/2 h-40 w-[60%] rounded-full bg-violet-600/10 blur-[80px]" />
        {/* Subtle grid texture */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />
        {/* Bottom fade into campaigns */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-950 to-transparent" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-6 pb-2 lg:pt-8 lg:pb-4">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-300 border border-purple-500/20 mb-4">
                <Sparkles className="h-4 w-4" />
                India&apos;s #1 Influencer Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight leading-tight mt-1"
            >
              Collaborate with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400">
                Top Brands
              </span>
              <br />
              Grow Your Influence
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-2 text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed"
            >
              Browse live campaigns from top Indian brands. Apply in seconds, get approved, and start earning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-3 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              {!user ? (
                <>
                  <Link href="/signup">
                    <Button className="h-11 px-7 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] group cursor-pointer">
                      Join as Creator
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button className="h-11 px-7 rounded-xl bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 font-medium text-sm transition-all cursor-pointer">
                      Sign In
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/dashboard">
                  <Button className="h-11 px-7 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-sm shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] group cursor-pointer">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              )}
            </motion.div>
          </div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-4 grid grid-cols-3 gap-4 max-w-sm mx-auto"
          >
            {[
              { icon: Rocket, label: 'Live Campaigns', value: campaigns.length || '8+' },
              { icon: TrendingUp, label: 'Avg. Payout', value: '₹5K+' },
              { icon: Shield, label: 'Trusted Brands', value: '50+' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-4 w-4 text-purple-400 mx-auto mb-1.5" />
                <p className="text-xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section className="relative py-4 lg:py-6">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-4">
            <div className="text-center mb-4">
              <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Live Campaigns
              </h2>
              <p className="mt-2 text-slate-400 text-sm">
                Browse and apply to brand collaborations happening right now
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-lg mx-auto relative">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Search by brand, category, or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-11 pl-11 pr-10 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:bg-white/[0.07] focus:ring-1 focus:ring-purple-500/25 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-500 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} found
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
            </div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-20">
              <Search className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-400">
                {searchQuery ? 'No campaigns match your search' : 'No live campaigns right now'}
              </h3>
              <p className="text-sm text-slate-500 mt-2">
                {searchQuery ? 'Try a different keyword or clear the search' : 'Check back soon — new brand campaigns drop every week!'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCampaigns.map((campaign, index) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  index={index}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-500">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-white">1to7 Media</span>
          </div>
          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} 1to7 Media. All rights reserved.
          </p>
        </div>
      </footer>

      {/* Modals */}
      <CampaignDetailModal
        campaign={selectedCampaign}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        onApply={handleApply}
        isLoggedIn={!!user}
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
