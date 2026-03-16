'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Sparkles, ArrowRight, Rocket, TrendingUp, Shield, Loader2 } from 'lucide-react'
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
}

export default function Home() {
  const { user } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

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
        {/* Background Effects */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-purple-900/20 via-slate-950 to-slate-950" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(124,58,237,0.2),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(236,72,153,0.15),transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-24 pb-20 lg:pt-32 lg:pb-28">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-4 py-1.5 text-sm font-medium text-purple-300 border border-purple-500/20 mb-6">
                <Sparkles className="h-4 w-4" />
                India&apos;s #1 Influencer Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight mt-4"
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
              className="mt-6 text-lg text-slate-400 max-w-xl mx-auto leading-relaxed"
            >
              Browse live campaigns from top Indian brands. Apply in seconds, get approved, and start earning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {!user ? (
                <>
                  <Link href="/signup">
                    <Button className="h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-base shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] group cursor-pointer">
                      Join as Creator
                      <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button className="h-12 px-8 rounded-xl bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/30 font-medium text-base transition-all cursor-pointer">
                      Sign In
                    </Button>
                  </Link>
                </>
              ) : (
                <Link href="/dashboard">
                  <Button className="h-12 px-8 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-base shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] group cursor-pointer">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
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
            className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto"
          >
            {[
              { icon: Rocket, label: 'Live Campaigns', value: campaigns.length || '8+' },
              { icon: TrendingUp, label: 'Avg. Payout', value: '₹5K+' },
              { icon: Shield, label: 'Trusted Brands', value: '50+' },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <stat.icon className="h-5 w-5 text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section className="relative py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
              Live Campaigns
            </h2>
            <p className="mt-2 text-slate-400 text-sm">
              Browse and apply to brand collaborations happening right now
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-20">
              <Sparkles className="h-12 w-12 text-slate-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-400">No live campaigns right now</h3>
              <p className="text-sm text-slate-500 mt-2">Check back soon — new brand campaigns drop every week!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {campaigns.map((campaign, index) => (
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
