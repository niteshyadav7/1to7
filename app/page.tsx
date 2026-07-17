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
import BrandLoader from '@/components/ui/BrandLoader'

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
  followers?: string
  looking_for?: string
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
    setDetailOpen(false)
    setSelectedCampaign(campaign)
    setApplyOpen(true)
  }

  const handleApplicationSuccess = () => {
    setApplyOpen(false)
    setSelectedCampaign(null)
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary-container/30">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-background py-16 md:py-24 border-b border-border-subtle">
        {/* Soft elegant background highlight */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(254,189,28,0.12),transparent)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_35%_45%_at_25%_10%,rgba(94,94,94,0.03),transparent)]" />

        <div className="relative z-10 mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-container/10 px-4 py-1.5 text-xs font-bold text-primary border border-primary-container/20 mb-6">
                <Sparkles className="h-4 w-4 text-primary" />
                India&apos;s #1 Influencer Platform
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-charcoal-surface leading-none"
            >
              Collaborate with <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary-container">
                Top Brands
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.16 }}
              className="mt-6 text-base sm:text-lg text-secondary max-w-xl mx-auto leading-relaxed"
            >
              Browse live campaigns from top Indian brands. Apply in seconds, get approved, and start earning.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.24 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              {!user ? (
                <Link href="/login">
                  <Button size="lg" className="h-12 px-8 rounded-md font-bold text-sm shadow-sm active:scale-[0.98] group cursor-pointer">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard">
                  <Button size="lg" className="h-12 px-8 rounded-md font-bold text-sm shadow-sm active:scale-[0.98] group cursor-pointer">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
              )}
            </motion.div>
          </div>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.32 }}
            className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl mx-auto"
          >
            {[
              { icon: Rocket, label: 'Live Campaigns', value: campaigns.length || '12+' },
              { icon: TrendingUp, label: 'Avg. Payout', value: '₹5K+' },
              { icon: Shield, label: 'Trusted Brands', value: '50+' },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center bg-white border border-border-subtle rounded-lg p-5 hover:shadow-[0px_4px_15px_rgba(0,0,0,0.03)] transition-all">
                <stat.icon className="h-6 w-6 text-primary mb-3" />
                <p className="text-2xl font-bold text-charcoal-surface">{stat.value}</p>
                <p className="text-xs text-secondary font-medium mt-1 uppercase tracking-wider">{stat.label}</p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Campaigns Section */}
      <section className="py-16 bg-background">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center space-y-4">
            <h2 className="text-3xl font-extrabold text-charcoal-surface tracking-tight">
              Live Campaigns
            </h2>
            <p className="text-sm text-secondary max-w-md mx-auto">
              Browse and apply to brand collaborations happening right now
            </p>

            {/* Search Bar */}
            <div className="max-w-lg mx-auto relative pt-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Search by brand, category, or platform..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-11 pr-10 rounded-md bg-white border border-border-subtle text-foreground text-sm placeholder:text-secondary focus:outline-none focus:border-primary-container focus:ring-2 focus:ring-primary-container/25 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-secondary hover:text-charcoal-surface hover:bg-gray-muted transition-all cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              {searchQuery && (
                <p className="text-xs text-secondary mt-2 text-center font-medium">
                  {filteredCampaigns.length} {filteredCampaigns.length === 1 ? 'campaign' : 'campaigns'} found
                </p>
              )}
            </div>
          </div>

          {loading ? (
            <BrandLoader className="py-16" />
          ) : filteredCampaigns.length === 0 ? (
            <div className="text-center py-24 bg-white rounded-lg border border-border-subtle max-w-lg mx-auto">
              <Search className="h-12 w-12 text-secondary mx-auto mb-4" />
              <h3 className="text-lg font-bold text-charcoal-surface">
                {searchQuery ? 'No campaigns match your search' : 'No live campaigns right now'}
              </h3>
              <p className="text-sm text-secondary mt-2">
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
      <footer className="border-t border-border-subtle py-12 bg-white">
        <div className="mx-auto max-w-7xl px-6 text-center space-y-4">
          <div className="flex items-center justify-center gap-2">
            <span className="h-7 w-7 rounded-lg bg-primary-container text-black flex items-center justify-center font-extrabold text-xs">17</span>
            <span className="text-sm font-bold text-charcoal-surface uppercase tracking-wide">1to7 Media</span>
          </div>
          <p className="text-xs text-secondary">
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
