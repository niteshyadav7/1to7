'use client'

import { motion } from 'framer-motion'
import { Instagram, Youtube, ShoppingBag, Users, ArrowRight, Sparkles, MapPin, ChevronRight } from 'lucide-react'

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
  'Instagram': { icon: <Instagram className="h-3.5 w-3.5" />, color: 'text-pink-400' },
  'YouTube': { icon: <Youtube className="h-3.5 w-3.5" />, color: 'text-red-400' },
  'Amazon': { icon: <ShoppingBag className="h-3.5 w-3.5" />, color: 'text-amber-400' },
}

// Each card gets a unique accent color — subtle but distinctive
const accentColors = [
  { border: 'border-t-indigo-500', dot: 'bg-indigo-500', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20', avatar: 'from-indigo-500 to-indigo-600', glow: 'hover:shadow-indigo-500/5' },
  { border: 'border-t-violet-500', dot: 'bg-violet-500', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20', avatar: 'from-violet-500 to-violet-600', glow: 'hover:shadow-violet-500/5' },
  { border: 'border-t-cyan-500', dot: 'bg-cyan-500', badge: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20', avatar: 'from-cyan-500 to-cyan-600', glow: 'hover:shadow-cyan-500/5' },
  { border: 'border-t-rose-500', dot: 'bg-rose-500', badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20', avatar: 'from-rose-500 to-rose-600', glow: 'hover:shadow-rose-500/5' },
  { border: 'border-t-emerald-500', dot: 'bg-emerald-500', badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', avatar: 'from-emerald-500 to-emerald-600', glow: 'hover:shadow-emerald-500/5' },
  { border: 'border-t-amber-500', dot: 'bg-amber-500', badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20', avatar: 'from-amber-500 to-amber-600', glow: 'hover:shadow-amber-500/5' },
]

export default function CampaignCard({ 
  campaign, 
  index, 
  onViewDetails 
}: { 
  campaign: Campaign
  index: number 
  onViewDetails: (campaign: Campaign) => void 
}) {
  const accent = accentColors[index % accentColors.length]
  const platform = platformConfig[campaign.platform] || { icon: null, color: 'text-slate-400' }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -5, transition: { duration: 0.2 } }}
      className="group cursor-pointer"
      onClick={() => onViewDetails(campaign)}
    >
      <div className={`relative h-full rounded-2xl border border-white/[0.06] ${accent.border} border-t-2 bg-[#111827]/90 backdrop-blur-xl overflow-hidden shadow-lg hover:shadow-2xl ${accent.glow} hover:border-white/[0.1] transition-all duration-300`}>
        
        {/* Subtle gradient wash from top */}
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

        <div className="relative p-5 space-y-4">

          {/* ── Top Row: Avatar + Brand + LIVE ── */}
          <div className="flex items-start gap-3.5">
            {/* Avatar */}
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${accent.avatar} text-white text-base font-bold shadow-lg shrink-0`}>
              {campaign.brand_name?.charAt(0)?.toUpperCase() || '?'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold text-white truncate">{campaign.brand_name}</h3>
                {campaign.is_live && (
                  <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
                    </span>
                    Live
                  </span>
                )}
              </div>
              {campaign.location ? (
                <p className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{campaign.location}</span>
                </p>
              ) : (
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">{campaign.campaign_code}</p>
              )}
            </div>
          </div>

          {/* ── Divider ── */}
          <div className="h-px bg-white/[0.04]" />

          {/* ── Tags ── */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold border ${accent.badge}`}>
              {platform.icon}
              {campaign.platform}
            </span>
            <span className="rounded-lg bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-400 border border-white/[0.05]">
              {campaign.category}
            </span>
            <span className={`rounded-lg px-2.5 py-1 text-[11px] font-bold border ${
              campaign.budget_type === 'Paid' 
                ? 'bg-emerald-500/8 text-emerald-400 border-emerald-500/15' 
                : 'bg-amber-500/8 text-amber-400 border-amber-500/15'
            }`}>
              {campaign.budget_type === 'Paid' ? '₹ Paid' : '↔ Barter'}
            </span>
          </div>

          {/* ── Deliverables ── */}
          <p className="text-[13px] text-slate-400 line-clamp-2 leading-[1.65]">
            {campaign.deliverables}
          </p>

          {/* ── Meta ── */}
          <div className="flex items-center gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-1.5">
              <Users className="h-3 w-3 text-slate-600" />
              <span>{campaign.gender_required === 'Any' ? 'All genders' : campaign.gender_required}</span>
            </div>
            {campaign.followers && (
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-slate-600" />
                <span>{campaign.followers}</span>
              </div>
            )}
          </div>

          {/* ── CTA ── */}
          <button className={`w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${accent.avatar} hover:opacity-90 px-4 py-3 text-[13px] font-bold text-white shadow-md transition-all duration-200 cursor-pointer group/btn`}>
            View Details & Apply
            <ChevronRight className="h-4 w-4 opacity-70 group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}
