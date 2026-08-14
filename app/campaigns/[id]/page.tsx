'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Copy, Check, Instagram, Youtube, ShoppingBag,
  Sparkles, Users, MapPin, Calendar, CheckCircle2, ShieldCheck,
  ExternalLink, FileText, Gift, AlertCircle, Loader2, ArrowRight,
  Globe
} from 'lucide-react'
import { Navbar } from '@/components/Navbar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/AuthProvider'
import ApplicationFormModal from '@/components/campaigns/ApplicationFormModal'

interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
  category: string
  platform: string
  budget_type: string
  budget_amount?: number
  deliverables: string
  product_links?: string[]
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

const platformConfig: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  'Instagram': {
    icon: <Instagram className="h-3.5 w-3.5 text-pink-600" />,
    bg: 'bg-pink-50 border-pink-200 text-pink-700',
    text: 'text-pink-600'
  },
  'YouTube': {
    icon: <Youtube className="h-3.5 w-3.5 text-red-600" />,
    bg: 'bg-red-50 border-red-200 text-red-700',
    text: 'text-red-600'
  },
  'Amazon': {
    icon: <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />,
    bg: 'bg-amber-50 border-amber-200 text-amber-800',
    text: 'text-amber-600'
  },
}

export default function StandaloneCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const campaignId = resolvedParams.id
  const { user } = useAuth()

  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [applyOpen, setApplyOpen] = useState(false)

  useEffect(() => {
    fetchCampaign()
  }, [campaignId])

  const fetchCampaign = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/campaigns/${campaignId}`)
      const data = await res.json()

      if (!res.ok || !data.campaign) {
        throw new Error(data.error || 'Campaign not found')
      }

      setCampaign(data.campaign)
    } catch (err: any) {
      setError(err.message || 'Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    if (typeof window === 'undefined') return
    const shareUrl = `${window.location.origin}/campaigns/${campaign?.id}`
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    toast.success('Campaign link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleApplyClick = () => {
    if (!user) {
      toast.info('Please verify your mobile number to log in & complete your application.')
    }
    setApplyOpen(true)
  }

  const platformInfo = campaign ? platformConfig[campaign.platform] || {
    icon: <Globe className="h-3.5 w-3.5 text-indigo-600" />,
    bg: 'bg-slate-100 border-slate-200 text-slate-700',
    text: 'text-indigo-600'
  } : null

  return (
    <div className="min-h-screen bg-[#f9f9f9] text-[#1a1c1c] font-sans selection:bg-[#febd1c]/30 flex flex-col justify-between overflow-x-hidden w-full max-w-full">
      <div>
        <Navbar />

        <main className="max-w-6xl w-full mx-auto px-3 sm:px-6 py-3 md:py-4 space-y-3.5 min-w-0 flex-1">
          {/* Back Navigation Bar */}
          <div className="flex items-center justify-between flex-wrap gap-2 min-w-0">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 sm:px-3 py-1.5 rounded-xl shadow-sm transition-all hover:bg-slate-50 shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span>Back<span className="hidden sm:inline"> to All Campaigns</span></span>
            </Link>

            {campaign && (
              <span className="text-[10px] sm:text-[11px] font-mono text-slate-500 bg-white border border-slate-200 px-2.5 sm:px-3 py-1 rounded-xl shadow-sm shrink-0">
                CODE: <strong className="text-slate-900 font-bold">{campaign.campaign_code}</strong>
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500 gap-3 bg-white rounded-2xl border border-slate-200/80 shadow-sm">
              <Loader2 className="h-8 w-8 animate-spin text-[#febd1c]" />
              <p className="text-xs font-medium text-slate-600">Loading campaign details...</p>
            </div>
          ) : error || !campaign ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm"
            >
              <div className="h-14 w-14 bg-red-50 border border-red-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="h-7 w-7 text-red-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Campaign Not Available</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                {error || 'This campaign may have been closed or removed by the brand manager.'}
              </p>
              <Link href="/">
                <Button className="bg-[#febd1c] hover:bg-amber-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-sm">
                  Explore Active Campaigns
                </Button>
              </Link>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3.5 min-w-0"
            >
              {/* Header Hero Card */}
              <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 sm:p-5 shadow-sm min-w-0 w-full overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0">
                  {/* Left Info Column */}
                  <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0 flex-1">
                    <div className="h-11 w-11 sm:h-14 sm:w-14 rounded-xl bg-[#febd1c] text-slate-950 font-black text-xl sm:text-2xl flex items-center justify-center shadow-sm shrink-0 border border-amber-300 mt-0.5 sm:mt-0">
                      {campaign.brand_name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
                        <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 tracking-tight break-words max-w-full min-w-0">
                          {campaign.brand_name}
                        </h1>
                        <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Verified
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-xs min-w-0">
                        {/* Platform Badge */}
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[10px] sm:text-[11px] font-bold ${platformInfo?.bg}`}>
                          {platformInfo?.icon}
                          <span>{campaign.platform}</span>
                        </span>

                        {/* Category */}
                        {campaign.category && (
                          <span className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-[10px] sm:text-[11px] font-semibold">
                            {campaign.category}
                          </span>
                        )}

                        {/* Budget Badge */}
                        {campaign.budget_type && (
                          <span className={`px-2.5 py-0.5 rounded-lg border font-extrabold uppercase tracking-wider text-[9px] sm:text-[10px] ${
                            campaign.budget_type === 'Paid'
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}>
                            {campaign.budget_type} {campaign.budget_amount ? `(₹${campaign.budget_amount})` : ''}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions Bar */}
                  <div className="flex items-center gap-2 pt-2 sm:pt-0 w-full sm:w-auto shrink-0">
                    <Button
                      onClick={handleCopyLink}
                      variant="outline"
                      className="flex-1 sm:flex-none h-9 sm:h-10 px-3 sm:px-4 rounded-xl border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs gap-1.5 transition-all cursor-pointer justify-center"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-600" />
                          <span>Copy Link</span>
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleApplyClick}
                      className="flex-1 sm:flex-none h-9 sm:h-10 px-4 sm:px-6 rounded-xl bg-[#febd1c] hover:bg-amber-400 text-slate-950 font-black text-xs shadow-sm hover:shadow-md transition-all cursor-pointer group/apply justify-center"
                    >
                      <span>Apply Now</span>
                      <ArrowRight className="h-3.5 w-3.5 ml-1 transition-transform group-hover/apply:translate-x-1" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Main Grid: Details (Left) + Target Criteria (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5 items-start min-w-0 w-full">
                {/* Main Information (2 cols) */}
                <div className="lg:col-span-2 space-y-3.5 min-w-0">
                  {/* Deliverables Card */}
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 sm:p-4 space-y-2.5 shadow-sm min-w-0">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <h2 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                        <Gift className="h-3.5 w-3.5 text-amber-500" />
                        Deliverables & Tasks
                      </h2>
                      <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Required
                      </span>
                    </div>

                    <div className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-100 min-w-0">
                      <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold whitespace-pre-line break-words">
                        {campaign.deliverables || 'No specific deliverables provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Additional Guidelines / Requirements (shown only if unique and distinct) */}
                  {campaign.requirements && campaign.requirements.trim() !== campaign.deliverables.trim() && (
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 sm:p-4 space-y-2.5 shadow-sm min-w-0">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h2 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                          <FileText className="h-3.5 w-3.5 text-indigo-500" />
                          Guidelines & Instructions
                        </h2>
                      </div>
                      <div className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-100 min-w-0">
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">
                          {campaign.requirements}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Additional Campaign Notes */}
                  {campaign.additional_info && (
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 sm:p-4 space-y-2.5 shadow-sm min-w-0">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h2 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="h-3.5 w-3.5 text-purple-500" />
                          Campaign Notes
                        </h2>
                      </div>
                      <div className="bg-slate-50/80 rounded-xl p-3 sm:p-3.5 border border-slate-100 min-w-0">
                        <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">
                          {campaign.additional_info}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Product / Brand Links */}
                  {campaign.product_links && campaign.product_links.length > 0 && (
                    <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 sm:p-4 space-y-2.5 shadow-sm min-w-0">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                        <h2 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest flex items-center gap-1.5">
                          <ExternalLink className="h-3.5 w-3.5 text-blue-500" />
                          Product / Brand Links
                        </h2>
                      </div>

                      <div className="space-y-2 min-w-0">
                        {campaign.product_links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.startsWith('http') ? link : `https://${link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-blue-600 hover:text-blue-800 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-semibold transition-all min-w-0 max-w-full overflow-hidden"
                          >
                            <span className="truncate min-w-0 pr-2 font-mono text-[11px] sm:text-xs">{link}</span>
                            <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-400 group-hover/link:text-blue-600 transition-colors" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Target Criteria Sidebar (1 col) */}
                <div className="space-y-3.5 min-w-0">
                  <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 sm:p-4 space-y-3.5 shadow-sm min-w-0">
                    <h3 className="text-[11px] font-extrabold text-slate-900 uppercase tracking-widest pb-2 border-b border-slate-100 flex items-center justify-between">
                      <span>Target Criteria</span>
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    </h3>

                    {/* Criteria Cards Grid */}
                    <div className="space-y-2 min-w-0">
                      {/* Followers */}
                      {campaign.followers && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                              <Users className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs text-slate-600 font-medium truncate">Followers Req</span>
                          </div>
                          <span className="text-xs font-extrabold text-slate-900 shrink-0">{campaign.followers}</span>
                        </div>
                      )}

                      {/* Gender */}
                      {campaign.gender_required && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-lg bg-pink-50 text-pink-600 shrink-0">
                              <Sparkles className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs text-slate-600 font-medium truncate">Gender</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 shrink-0">
                            {campaign.gender_required === 'Any' ? 'Open to All' : campaign.gender_required}
                          </span>
                        </div>
                      )}

                      {/* Location */}
                      {campaign.location && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
                              <MapPin className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs text-slate-600 font-medium truncate">Target Location</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 truncate max-w-[120px] sm:max-w-none text-right shrink-0" title={campaign.location}>
                            {campaign.location}
                          </span>
                        </div>
                      )}

                      {/* Collab Date */}
                      {campaign.collab_date && (
                        <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 min-w-0 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 shrink-0">
                              <Calendar className="h-3.5 w-3.5" />
                            </div>
                            <span className="text-xs text-slate-600 font-medium truncate">Collab Date</span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 shrink-0">{campaign.collab_date}</span>
                        </div>
                      )}
                    </div>

                    {/* Apply Button */}
                    <div className="pt-1">
                      <Button
                        onClick={handleApplyClick}
                        className="w-full h-10 rounded-xl bg-[#febd1c] hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-sm cursor-pointer transition-all active:scale-[0.98]"
                      >
                        Apply For Campaign
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Application Form Modal */}
          {campaign && (
            <ApplicationFormModal
              campaign={campaign}
              isOpen={applyOpen}
              onClose={() => setApplyOpen(false)}
              onSuccess={() => {
                setApplyOpen(false)
                toast.success('Application submitted successfully!')
              }}
            />
          )}
        </main>
      </div>
    </div>
  )
}
