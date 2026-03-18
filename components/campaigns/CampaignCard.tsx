'use client'

import { motion } from 'framer-motion'
import { Instagram, Youtube, ShoppingBag, Sparkles, Users, ArrowRight } from 'lucide-react'

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

const platformIcons: Record<string, React.ReactNode> = {
  'Instagram': <Instagram className="h-4 w-4" />,
  'YouTube': <Youtube className="h-4 w-4" />,
  'Amazon': <ShoppingBag className="h-4 w-4" />,
}

const platformColors: Record<string, string> = {
  'Instagram': 'from-pink-500 to-purple-500',
  'YouTube': 'from-red-500 to-rose-500',
  'Amazon': 'from-amber-500 to-orange-500',
}

const brandGradients: Record<string, string> = {
  'Nike': 'from-slate-800 to-slate-900',
  'Spotify India': 'from-emerald-600 to-green-700',
  'Mamaearth': 'from-green-500 to-lime-600',
  'boAt Lifestyle': 'from-red-600 to-rose-700',
  'Zomato': 'from-red-500 to-red-700',
  'Nykaa': 'from-pink-500 to-rose-600',
  'Flipkart': 'from-blue-500 to-indigo-600',
  'Sugar Cosmetics': 'from-pink-400 to-fuchsia-500',
}

const brandEmojis: Record<string, string> = {
  'Nike': '👟',
  'Spotify India': '🎵',
  'Mamaearth': '🌿',
  'boAt Lifestyle': '🎧',
  'Zomato': '🍕',
  'Nykaa': '💄',
  'Flipkart': '🛒',
  'Sugar Cosmetics': '💋',
}

export default function CampaignCard({ 
  campaign, 
  index, 
  onViewDetails 
}: { 
  campaign: Campaign
  index: number 
  onViewDetails: (campaign: Campaign) => void 
}) {
  const gradient = brandGradients[campaign.brand_name] || 'from-purple-600 to-pink-500'
  const emoji = brandEmojis[campaign.brand_name] || '✨'
  const platformGradient = platformColors[campaign.platform] || 'from-purple-500 to-pink-500'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group cursor-pointer"
      onClick={() => onViewDetails(campaign)}
    >
      <div className="relative h-full rounded-2xl border border-white/10 bg-slate-900/60 backdrop-blur-lg overflow-hidden shadow-xl hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-300">
        {/* Brand Header */}
        <div className={`relative h-28 bg-gradient-to-br ${gradient} p-5 flex items-end justify-between`}>
          <div className="absolute inset-0 bg-black/10" />
          <div className="relative z-10">
            <span className="text-3xl">{emoji}</span>
            <h3 className="text-lg font-bold text-white mt-1 leading-tight">{campaign.brand_name}</h3>
          </div>
          <div className={`relative z-10 flex items-center gap-1.5 rounded-full bg-gradient-to-r ${platformGradient} px-3 py-1 text-xs font-semibold text-white shadow-lg`}>
            {platformIcons[campaign.platform]}
            {campaign.platform}
          </div>
        </div>

        {/* Content */}
        <div className="p-5 space-y-3">
          {/* Category & Budget */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-300 border border-purple-500/20">
              {campaign.category}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-medium border ${
              campaign.budget_type === 'Paid' 
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20' 
                : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
            }`}>
              {campaign.budget_type === 'Paid' ? '💰 Paid' : '🤝 Barter'}
            </span>
          </div>

          {/* Deliverables */}
          <p className="text-sm text-slate-300 line-clamp-2 leading-relaxed">
            {campaign.deliverables}
          </p>

          {/* Gender & Location & Followers */}
          <div className="flex flex-col gap-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-indigo-400" />
              <span>{campaign.gender_required === 'Any' ? 'Open to all genders' : `${campaign.gender_required} creators`}</span>
            </div>
            
            {campaign.location && (
              <div className="flex items-center gap-2">
                <span className="h-3.5 w-3.5 flex items-center justify-center text-rose-400 text-[10px]">📍</span>
                <span className="truncate">{campaign.location}</span>
              </div>
            )}
            
            {campaign.followers && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                <span className="truncate">{campaign.followers} followers</span>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="pt-2">
            <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-white/5 hover:bg-purple-500/20 border border-white/10 hover:border-purple-500/30 px-4 py-2.5 text-sm font-semibold text-slate-300 hover:text-purple-300 transition-all duration-200 cursor-pointer group/btn">
              View Details
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
