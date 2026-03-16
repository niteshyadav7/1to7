'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Instagram, Youtube, ShoppingBag, Users, FileText, Link2, CheckCircle2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

const platformIcons: Record<string, React.ReactNode> = {
  'Instagram': <Instagram className="h-5 w-5" />,
  'YouTube': <Youtube className="h-5 w-5" />,
  'Amazon': <ShoppingBag className="h-5 w-5" />,
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

export default function CampaignDetailModal({
  campaign,
  isOpen,
  onClose,
  onApply,
  isLoggedIn,
}: {
  campaign: Campaign | null
  isOpen: boolean
  onClose: () => void
  onApply: (campaign: Campaign) => void
  isLoggedIn: boolean
}) {
  if (!campaign) return null

  const emoji = brandEmojis[campaign.brand_name] || '✨'

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 rounded-full p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="p-6 pb-4 border-b border-white/10">
                <div className="flex items-start gap-4">
                  <span className="text-4xl">{emoji}</span>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-white">{campaign.brand_name}</h2>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-medium text-purple-300 border border-purple-500/20">
                        {campaign.category}
                      </span>
                      <span className="flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-medium text-slate-300 border border-white/10">
                        {platformIcons[campaign.platform]}
                        {campaign.platform}
                      </span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium border ${
                        campaign.budget_type === 'Paid'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                      }`}>
                        {campaign.budget_type === 'Paid' ? '💰 Paid' : '🤝 Barter'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5">
                {/* Deliverables */}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <FileText className="h-4 w-4 text-purple-400" />
                    Deliverables
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed pl-6">
                    {campaign.deliverables}
                  </p>
                </div>

                {/* Requirements */}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Requirements
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed pl-6">
                    {campaign.requirements}
                  </p>
                </div>

                {/* Gender */}
                <div className="space-y-2">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                    <Users className="h-4 w-4 text-blue-400" />
                    Gender Preference
                  </h3>
                  <p className="text-sm text-slate-400 pl-6">
                    {campaign.gender_required === 'Any' ? 'Open to all genders' : `${campaign.gender_required} creators only`}
                  </p>
                </div>

                {/* Product Links */}
                {campaign.product_links && campaign.product_links.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                      <Link2 className="h-4 w-4 text-pink-400" />
                      Product Links
                    </h3>
                    <div className="pl-6 space-y-1">
                      {campaign.product_links.map((link, i) => (
                        <a
                          key={i}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-purple-400 hover:text-purple-300 hover:underline transition-colors truncate cursor-pointer"
                        >
                          {link}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer CTA */}
              <div className="p-6 pt-4 border-t border-white/10">
                <Button
                  onClick={() => onApply(campaign)}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-base shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] group cursor-pointer"
                >
                  {isLoggedIn ? 'Apply Now' : 'Login to Apply'}
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
