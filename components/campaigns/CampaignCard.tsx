'use client'

import { motion } from 'framer-motion'
import { Instagram, Youtube, ShoppingBag, Users, ArrowRight, Sparkles, MapPin } from 'lucide-react'

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
}

const platformConfig: Record<string, { icon: React.ReactNode; color: string }> = {
  'Instagram': { icon: <Instagram className="h-3.5 w-3.5 text-pink-400" />, color: 'text-pink-400' },
  'YouTube': { icon: <Youtube className="h-3.5 w-3.5 text-red-500" />, color: 'text-red-500' },
  'Amazon': { icon: <ShoppingBag className="h-3.5 w-3.5 text-amber-500" />, color: 'text-amber-500' },
}

const categoryImages: Record<string, string> = {
  'Tech & Gadgets': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80',
  'Lifestyle': 'https://images.unsplash.com/photo-1511556532299-8f662fc26c06?auto=format&fit=crop&w=600&q=80',
  'Travel': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80',
  'Health & Fitness': 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=600&q=80',
  'Beauty & Fashion': 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=600&q=80',
  'Entertainment': 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=600&q=80',
  'Food & Beverage': 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80',
}

const defaultImage = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80'

export default function CampaignCard({ 
  campaign, 
  index, 
  onViewDetails 
}: { 
  campaign: Campaign
  index: number 
  onViewDetails: (campaign: Campaign) => void 
}) {
  const coverImage = categoryImages[campaign.category] || defaultImage
  const platform = platformConfig[campaign.platform] || { icon: null, color: 'text-slate-500' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="group cursor-pointer flex flex-col h-full rounded-lg border border-border-subtle bg-white overflow-hidden hover:shadow-[0px_4px_20px_rgba(0,0,0,0.05)] transition-all duration-300"
      onClick={() => onViewDetails(campaign)}
    >
      {/* Top Image Cover */}
      <div className="relative h-44 w-full overflow-hidden bg-gray-muted shrink-0 border-b border-border-subtle">
        <img 
          src={coverImage} 
          alt={campaign.brand_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
        />
        {/* Overlay Platform Badge */}
        <div className="absolute top-3 left-3">
          <span className="flex items-center gap-1.5 bg-charcoal-surface/90 text-white rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide">
            {platform.icon}
            {campaign.platform}
          </span>
        </div>
        {/* Overlay Budget Badge */}
        <div className="absolute top-3 right-3">
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide border ${
            campaign.budget_type === 'Paid' 
              ? 'bg-primary-container text-black border-transparent' 
              : 'bg-white text-charcoal-surface border-border-subtle'
          }`}>
            {campaign.budget_type === 'Paid' ? 'Paid' : 'Barter'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex flex-col flex-grow justify-between gap-4 bg-white">
        <div className="space-y-2">
          {/* Brand & Live status */}
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-bold text-secondary uppercase tracking-wider">
              {campaign.brand_name}
            </span>
            {campaign.is_live && (
              <span className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-wider bg-primary-container/10 px-2 py-0.5 rounded">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                Live
              </span>
            )}
          </div>

          {/* Heading - headline-md */}
          <h3 className="headline-md text-charcoal-surface line-clamp-1 leading-snug">
            {campaign.category}
          </h3>

          {/* Deliverables description */}
          <p className="text-[13px] text-secondary line-clamp-2 leading-relaxed h-10">
            {campaign.deliverables}
          </p>
        </div>

        <div className="space-y-3">
          {/* Divider */}
          <div className="h-px bg-border-subtle" />

          {/* Followers / Requirements Row */}
          <div className="flex items-center justify-between text-[11px] text-secondary">
            {campaign.location ? (
              <span className="flex items-center gap-1 truncate max-w-[120px]">
                <MapPin className="h-3 w-3" />
                {campaign.location}
              </span>
            ) : (
              <span className="font-mono">{campaign.campaign_code}</span>
            )}
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              <span>{campaign.gender_required === 'Any' ? 'All Genders' : campaign.gender_required}</span>
            </div>
          </div>

          {/* View Details Button */}
          <button className="w-full flex items-center justify-center gap-1.5 bg-primary-container hover:bg-primary-container/90 text-black font-bold uppercase py-2.5 rounded-md text-[13px] transition-colors cursor-pointer">
            View Details & Apply
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
