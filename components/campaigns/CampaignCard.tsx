'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Instagram, Youtube, ShoppingBag, Users, ArrowRight, MapPin, Sparkles, CheckCircle2, ShieldCheck, Tag, Share2, Check, Copy, XCircle, Lock, Clock, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/AuthProvider'
import { checkFollowerEligibility, formatFollowerCount } from '@/lib/utils/follower-utils'
import { checkCampaignLocationEligibility } from '@/lib/utils/location-utils'

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
  location_type?: string
  target_states?: string[]
  target_cities?: string[]
  enforce_location?: boolean
  followers?: string
  min_followers?: number
  enforce_followers?: boolean
  looking_for?: string
  additional_info?: string
  collab_date?: string
  form_link?: string
  applied?: boolean
  application_status?: string
  application_id?: string
  applied_at?: string
}

const platformConfig: Record<string, { icon: React.ReactNode; bg: string; badge: string }> = {
  'Instagram': { 
    icon: <Instagram className="h-3.5 w-3.5 text-pink-400" />, 
    bg: 'from-fuchsia-600 via-pink-600 to-rose-600',
    badge: 'bg-gradient-to-r from-pink-500 to-rose-500 text-white'
  },
  'YouTube': { 
    icon: <Youtube className="h-3.5 w-3.5 text-red-400" />, 
    bg: 'from-red-600 via-rose-600 to-orange-600',
    badge: 'bg-red-600 text-white'
  },
  'Amazon': { 
    icon: <ShoppingBag className="h-3.5 w-3.5 text-amber-400" />, 
    bg: 'from-amber-500 via-orange-600 to-amber-700',
    badge: 'bg-amber-500 text-slate-950'
  },
}

const categoryGradients: Record<string, string> = {
  'Tech & Gadgets': 'from-indigo-600 via-purple-600 to-blue-700',
  'Lifestyle': 'from-rose-500 via-pink-600 to-orange-500',
  'Travel': 'from-cyan-600 via-teal-600 to-emerald-600',
  'Health & Fitness': 'from-emerald-600 via-teal-600 to-cyan-700',
  'Beauty & Fashion': 'from-purple-600 via-pink-600 to-rose-500',
  'Entertainment': 'from-amber-500 via-orange-600 to-red-600',
  'Food & Beverage': 'from-orange-500 via-amber-500 to-yellow-600',
}

const defaultGradient = 'from-slate-900 via-indigo-950 to-slate-900'

function getBrandInitial(brandName: string): string {
  if (!brandName) return 'B'
  return brandName.trim().charAt(0).toUpperCase()
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
  const { user } = useAuth()
  const [copied, setCopied] = useState(false)
  const gradient = categoryGradients[campaign.category] || defaultGradient
  const platform = platformConfig[campaign.platform] || { 
    icon: <Sparkles className="h-3.5 w-3.5 text-amber-300" />, 
    bg: 'from-slate-800 to-slate-900',
    badge: 'bg-slate-800 text-white'
  }
  const brandInitial = getBrandInitial(campaign.brand_name)
  const eligibility = checkFollowerEligibility(user?.followers, campaign)
  const locationEligibility = checkCampaignLocationEligibility(campaign, user)

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (typeof window === 'undefined') return
    const shareUrl = `${window.location.origin}/campaigns/${campaign.id}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success(`Copied campaign link for ${campaign.brand_name}!`)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      whileHover={{ y: -6, transition: { duration: 0.25, ease: 'easeOut' } }}
      className="group relative cursor-pointer flex flex-col h-full w-full max-w-[320px] rounded-3xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(15,23,42,0.12)] hover:border-amber-400/80 transition-all duration-300 mx-auto sm:mx-0 overflow-hidden"
      onClick={() => onViewDetails(campaign)}
    >
      {/* Top Banner Header with Mesh Gradient */}
      <div className={`relative h-24 w-full bg-gradient-to-br ${gradient} p-4 flex items-start justify-between overflow-hidden shrink-0`}>
        {/* Background Decorative Mesh & Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_70%)] pointer-events-none" />
        <div className="absolute -right-8 -bottom-8 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />
        <div className="absolute -left-6 -top-6 w-20 h-20 rounded-full bg-black/20 blur-lg pointer-events-none" />

        {/* Platform Pill */}
        <div className="relative z-10 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 bg-slate-950/50 backdrop-blur-md text-white rounded-full px-3 py-1 text-[11px] font-semibold border border-white/20 shadow-md">
            {platform.icon}
            <span>{campaign.platform}</span>
          </span>
        </div>

        {/* Budget Badge & Share Copy Link Icon */}
        <div className="relative z-10 flex items-center gap-1.5">
          <button
            onClick={handleCopyLink}
            title="Copy campaign link"
            className="p-1.5 rounded-full bg-slate-950/50 hover:bg-slate-900 backdrop-blur-md text-white border border-white/20 shadow-md transition-all cursor-pointer hover:scale-110"
          >
            {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-white" />}
          </button>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider shadow-md ${
            campaign.budget_type === 'Paid' 
              ? 'bg-amber-400 text-slate-950 shadow-amber-400/30' 
              : 'bg-emerald-500 text-white shadow-emerald-500/30'
          }`}>
            <Tag className="h-2.5 w-2.5" />
            {campaign.budget_type === 'Paid' ? 'PAID COLLAB' : 'BARTER'}
          </span>
        </div>
      </div>

      {/* Brand Icon Overlay Avatar */}
      <div className="relative px-5 pt-0 pb-2 bg-white flex items-end justify-between -mt-6 z-20">
        <div className="flex items-center gap-2.5">
          <div className="h-12 w-12 rounded-2xl bg-slate-900 border-2 border-white shadow-lg flex items-center justify-center font-black text-lg text-amber-400 group-hover:scale-105 transition-transform duration-300 shrink-0">
            {brandInitial}
          </div>
          <div className="pt-6">
            <div className="flex items-center gap-1">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wide line-clamp-1">
                {campaign.brand_name}
              </span>
              <ShieldCheck className="h-3.5 w-3.5 text-blue-500 shrink-0" />
            </div>
            <span className="text-[10px] font-medium text-slate-400 block -mt-0.5">
              Verified Campaign
            </span>
          </div>
        </div>

        {/* Live Pulse Tag */}
        {campaign.is_live && (
          <div className="mb-1">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50/90 px-2.5 py-1 rounded-full border border-emerald-200/80 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Main Content Body */}
      <div className="p-5 pt-2 flex flex-col flex-grow justify-between gap-4 bg-white">
        <div className="space-y-2">
          {/* Category Heading */}
          <h3 className="text-lg font-extrabold text-slate-900 line-clamp-1 group-hover:text-amber-600 transition-colors leading-tight">
            {campaign.category}
          </h3>

          {/* Deliverables snippet with custom pill styling */}
          <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/80">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Deliverables Required
            </span>
            <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-relaxed">
              {campaign.deliverables || 'Reels, Stories & Post Collaboration'}
            </p>
          </div>
        </div>

        <div className="space-y-3 pt-1">
          {/* Attributes Info Row */}
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 pt-1">
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold truncate">{campaign.location || 'PAN India'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-100">
              <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold truncate">
                {campaign.followers && campaign.followers !== 'Any'
                  ? `${campaign.followers} Req`
                  : campaign.gender_required === 'Any'
                  ? 'All Genders'
                  : campaign.gender_required}
              </span>
            </div>
          </div>

          {/* Action CTA Button */}
          {campaign.applied ? (
            campaign.application_status === 'Approved' ? (
              <button className="w-full relative flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs py-3 rounded-2xl shadow-sm hover:shadow-emerald-500/25 transition-all duration-300 cursor-pointer active:scale-[0.98]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Approved 🎉 View Campaign</span>
              </button>
            ) : (campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review') ? (
              <button className="w-full relative flex items-center justify-center gap-2 bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-all duration-300 cursor-pointer active:scale-[0.98]">
                <Clock className="h-4 w-4 text-amber-600" />
                <span>Under Process ⏳ View Details</span>
              </button>
            ) : campaign.application_status === 'Rejected' ? (
              <button className="w-full relative flex items-center justify-center gap-2 bg-rose-50 text-rose-800 border border-rose-300 hover:bg-rose-100 font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-all duration-300 cursor-pointer active:scale-[0.98]">
                <RotateCcw className="h-3.5 w-3.5 text-rose-600" />
                <span>Rejected — Click to Re-Apply</span>
              </button>
            ) : (
              <button className="w-full relative flex items-center justify-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-300/80 hover:bg-emerald-100 hover:border-emerald-400 font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-all duration-300 cursor-pointer active:scale-[0.98]">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Already Applied ✓ View Details</span>
              </button>
            )
          ) : !eligibility.eligible ? (
            <button className="w-full relative group/btn flex items-center justify-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 border border-amber-300 font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-all duration-300 cursor-pointer active:scale-[0.98]">
              <Lock className="h-3.5 w-3.5 text-amber-700" />
              <span>Min {formatFollowerCount(eligibility.requiredFollowers)} Followers Required</span>
            </button>
          ) : !locationEligibility.isEligible ? (
            <button className="w-full relative group/btn flex items-center justify-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-900 border border-rose-300 font-extrabold text-xs py-3 rounded-2xl shadow-sm transition-all duration-300 cursor-pointer active:scale-[0.98]">
              <MapPin className="h-3.5 w-3.5 text-rose-600" />
              <span className="truncate">{locationEligibility.requiredLocationText} Address Required</span>
            </button>
          ) : (
            <button className="w-full relative group/btn flex items-center justify-center gap-2 bg-slate-900 group-hover:bg-gradient-to-r group-hover:from-amber-400 group-hover:to-amber-500 text-white group-hover:text-slate-950 font-extrabold text-xs py-3 rounded-2xl shadow-sm group-hover:shadow-lg group-hover:shadow-amber-400/25 transition-all duration-300 cursor-pointer active:scale-[0.98]">
              <span>View Details & Apply</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  )
}

