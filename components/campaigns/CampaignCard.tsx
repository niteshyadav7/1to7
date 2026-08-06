'use client'

import { motion } from 'framer-motion'
import { Instagram, Youtube, ShoppingBag, Users, ArrowRight, MapPin, Sparkles } from 'lucide-react'

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
  'Instagram': { icon: <Instagram className="h-3.5 w-3.5 text-pink-300" />, color: 'text-pink-400' },
  'YouTube': { icon: <Youtube className="h-3.5 w-3.5 text-red-300" />, color: 'text-red-500' },
  'Amazon': { icon: <ShoppingBag className="h-3.5 w-3.5 text-amber-300" />, color: 'text-amber-500' },
}

const gradientPalettes = [
  'bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700',
  'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700',
  'bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600',
  'bg-gradient-to-br from-pink-600 via-rose-600 to-purple-700',
  'bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700',
  'bg-gradient-to-br from-fuchsia-600 via-pink-600 to-rose-600',
  'bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950',
]

const categoryGradients: Record<string, string> = {
  'Tech & Gadgets': 'bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-700',
  'Lifestyle': 'bg-gradient-to-br from-rose-500 via-pink-600 to-orange-500',
  'Travel': 'bg-gradient-to-br from-cyan-600 via-teal-600 to-emerald-600',
  'Health & Fitness': 'bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700',
  'Beauty & Fashion': 'bg-gradient-to-br from-purple-600 via-pink-600 to-rose-500',
  'Entertainment': 'bg-gradient-to-br from-amber-500 via-orange-600 to-red-600',
  'Food & Beverage': 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-600',
}

function getGradient(category: string, brandName: string): string {
  if (categoryGradients[category]) return categoryGradients[category]
  let hash = 0
  const str = (brandName || category || 'default').toLowerCase()
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  const index = Math.abs(hash) % gradientPalettes.length
  return gradientPalettes[index]
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
  const gradient = getGradient(campaign.category, campaign.brand_name)
  const platform = platformConfig[campaign.platform] || { icon: <Sparkles className="h-3.5 w-3.5 text-white" />, color: 'text-slate-500' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      whileHover={{ y: -3 }}
      className="group cursor-pointer flex flex-col h-full w-full max-w-[310px] rounded-2xl border border-slate-200/80 bg-white overflow-hidden hover:border-amber-400/60 hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] transition-all duration-300 mx-auto sm:mx-0"
      onClick={() => onViewDetails(campaign)}
    >
      {/* Top Dynamic Color Combination Header */}
      <div className={`relative h-20 w-full overflow-hidden shrink-0 ${gradient} flex items-center justify-between p-3.5 transition-all duration-500 group-hover:scale-[1.02]`}>
        {/* Subtle Decorative Ambient Overlays */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_60%)] pointer-events-none" />
        <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/10 blur-xl pointer-events-none" />
        <div className="absolute -left-6 -top-6 w-20 h-20 rounded-full bg-black/10 blur-lg pointer-events-none" />

        {/* Platform Chip */}
        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 bg-slate-950/40 backdrop-blur-md text-white rounded-full px-3 py-1 text-[11px] font-semibold border border-white/15 shadow-sm">
            {platform.icon}
            {campaign.platform}
          </span>
        </div>

        {/* Budget Type Badge */}
        <div className="relative z-10">
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shadow-sm ${
            campaign.budget_type === 'Paid' 
              ? 'bg-amber-400 text-slate-950' 
              : 'bg-white/95 text-slate-900 border border-slate-200/60'
          }`}>
            {campaign.budget_type === 'Paid' ? 'Paid' : 'Barter'}
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-grow justify-between gap-3 bg-white">
        <div className="space-y-1.5">
          {/* Brand & Live status */}
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
              {campaign.brand_name}
            </span>
            {campaign.is_live && (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                Live
              </span>
            )}
          </div>

          {/* Heading */}
          <h3 className="text-base font-extrabold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors">
            {campaign.category}
          </h3>

          {/* Deliverables description */}
          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed h-8">
            {campaign.deliverables}
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {/* Metadata Row */}
          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
            {campaign.location ? (
              <span className="flex items-center gap-1 truncate max-w-[130px] font-medium">
                <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                {campaign.location}
              </span>
            ) : (
              <span className="font-mono text-slate-400 text-[10px]">{campaign.campaign_code}</span>
            )}
            <div className="flex items-center gap-1 font-medium">
              <Users className="h-3 w-3 text-slate-400 shrink-0" />
              <span>{campaign.gender_required === 'Any' ? 'All Genders' : campaign.gender_required}</span>
            </div>
          </div>

          {/* View Details Button */}
          <button className="w-full flex items-center justify-center gap-1.5 bg-slate-900 group-hover:bg-amber-400 text-white group-hover:text-slate-950 font-bold text-xs py-2.5 rounded-xl transition-all duration-200 cursor-pointer shadow-sm active:scale-[0.98]">
            <span>View Details & Apply</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
