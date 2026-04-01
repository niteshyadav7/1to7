'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Instagram, Youtube, ShoppingBag, Users, FileText, 
  Link2, CheckCircle2, ArrowRight, AlertCircle, MapPin, 
  CreditCard, Layout, Sparkles, Check, ArrowLeft, Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import MobileOTPModal from '@/components/modals/MobileOTPModal'

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

const FIELD_LABELS: Record<string, string> = {
  full_name: 'Full Name',
  instagram_username: 'Instagram Username',
  gender: 'Gender',
  state: 'State',
  city: 'City',
  followers: 'Followers Count',
  account_name: 'Bank Account Name',
  account_number: 'Account Number',
  ifsc_code: 'IFSC Code',
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
  const [agreementChecked, setAgreementChecked] = useState(false)
  const [showProfileInline, setShowProfileInline] = useState(false)
  const [savingProfile, setSavingProfile] = useState(false)
  const [inlineData, setInlineData] = useState<Record<string, any>>({})
  const [showCustomForm, setShowCustomForm] = useState(false)
  const [customFormData, setCustomFormData] = useState<Record<string, any>>({})
  const [submitting, setSubmitting] = useState(false)
  const [showOTPModal, setShowOTPModal] = useState(false)
  
  const { user, isProfileComplete, getMissingFields, refreshUserProfile } = useAuth()
  const router = useRouter()

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAgreementChecked(false)
      setShowProfileInline(false)
      setShowCustomForm(false)
      setCustomFormData({})
      setSubmitting(false)
      // Force refresh user data to ensure we have the latest completeness status
      refreshUserProfile()
    }
  }, [isOpen])

  // Prepare inline form data + custom form data when showing inline flow
  useEffect(() => {
    if (showProfileInline && user) {
      const missing = getMissingFields()
      const initial: Record<string, any> = {}
      missing.forEach(field => {
        initial[field] = (user as any)[field] || (field === 'followers' ? 0 : '')
      })
      setInlineData(initial)

      // Also init custom fields
      if (hasCustomFields) {
        const cfInitial: Record<string, any> = {}
        campaign!.form_fields!.forEach(f => {
          cfInitial[f.name] = ''
        })
        setCustomFormData(cfInitial)
      }
    }
  }, [showProfileInline, user])

  if (!campaign) return null

  const emoji = brandEmojis[campaign.brand_name] || '✨'

  const hasCustomFields = campaign.form_fields && campaign.form_fields.length > 0

  const handleApplyClick = () => {
    if (!isLoggedIn) {
      router.push('/login')
      return
    }

    if (campaign.form_link) {
      window.open(campaign.form_link, '_blank')
      return
    }

    if (!user?.is_mobile_verified) {
      setShowOTPModal(true)
      return
    }

    // Show combined form if profile incomplete OR campaign has custom questions
    if (!isProfileComplete() || hasCustomFields) {
      setShowProfileInline(true)
      return
    }

    onApply(campaign)
  }

  const isCustomFormValid = () => {
    if (!campaign.form_fields) return true
    return campaign.form_fields
      .filter(f => f.required)
      .every(f => {
        const val = customFormData[f.name]
        return val !== undefined && val !== '' && val !== null
      })
  }

  const handleCustomFormSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          formData: customFormData,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to apply')
      toast.success(data.message || 'Application submitted!')
      setShowCustomForm(false)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveInline = async () => {
    if (!user?.is_mobile_verified) {
      setShowOTPModal(true)
      return
    }

    setSavingProfile(true)
    try {
      // Step 1: Save profile if there are missing fields
      const missing = getMissingFields()
      if (missing.length > 0) {
        const res = await fetch('/api/dashboard/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...user, ...inlineData }),
        })
        if (!res.ok) throw new Error('Failed to update profile')
        await refreshUserProfile()
      }

      // Step 2: Submit application with custom form data
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          formData: hasCustomFields ? customFormData : {},
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to apply')

      toast.success(data.message || 'Application submitted successfully!')
      setShowProfileInline(false)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSavingProfile(false)
    }
  }

  const DetailCard = ({ label, value, icon: Icon, color }: { label: string, value: string | React.ReactNode, icon?: any, color?: string }) => (
    <div className="bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-1.5 transition-all hover:bg-white/[0.07] hover:border-white/10">
      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
        {Icon && <Icon className={`h-3 w-3 ${color || 'text-slate-500'}`} />}
        {label}
      </span>
      <span className="text-sm font-semibold text-slate-200">{value}</span>
    </div>
  )

  const missingFields = getMissingFields()

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
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col pointer-events-auto">
              
              {/* Inline Profile Completion View */}
              <AnimatePresence>
                {showProfileInline && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="absolute inset-0 z-20 bg-slate-900 flex flex-col pointer-events-auto"
                  >
                    <div className="p-8 pb-4 border-b border-white/5">
                       <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <AlertCircle className="h-5 w-5 text-amber-500" />
                          Complete Missing Details
                       </h3>
                       <p className="text-slate-400 text-sm mt-1">Please fill these fields to proceed with your application.</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-5">
                      {missingFields.filter(f => f !== 'city').map((field) => (
                        <div key={field}>
                           {field === 'gender' ? (
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                                  {FIELD_LABELS[field] || field}
                               </label>
                               <Select 
                                 value={inlineData[field] || ""} 
                                 onValueChange={(val) => setInlineData(p => ({ ...p, [field]: val }))}
                               >
                                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-purple-500">
                                     <SelectValue placeholder="Select Gender" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-white/10 text-white">
                                     <SelectItem value="Male" className="cursor-pointer">Male</SelectItem>
                                     <SelectItem value="Female" className="cursor-pointer">Female</SelectItem>
                                     <SelectItem value="Other" className="cursor-pointer">Other</SelectItem>
                                  </SelectContent>
                               </Select>
                             </div>
                            ) : field === 'state' ? (
                              <div className="grid grid-cols-2 gap-4">
                                {/* State */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                                     State
                                  </label>
                                  <Select 
                                    value={inlineData.state || ""} 
                                    onValueChange={(val) => setInlineData(p => ({ ...p, state: val, city: '' }))}
                                  >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-purple-500">
                                       <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                       {STATES.map(s => (
                                         <SelectItem key={s} value={s} className="cursor-pointer">{s}</SelectItem>
                                       ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {/* City */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                                     City
                                  </label>
                                  <Select 
                                    disabled={!inlineData.state && !user?.state}
                                    value={inlineData.city || ""} 
                                    onValueChange={(val) => setInlineData(p => ({ ...p, city: val }))}
                                  >
                                    <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-purple-500">
                                       <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                       {(inlineData.state || user?.state) && INDIA_DATA[inlineData.state || user?.state!]?.map(c => (
                                         <SelectItem key={c} value={c} className="cursor-pointer">{c}</SelectItem>
                                       ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                           ) : (
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                                  {FIELD_LABELS[field] || field}
                               </label>
                               <div className="relative">
                                  {field.includes('account') || field.includes('ifsc') ? (
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                  ) : field.includes('instagram') ? (
                                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                  ) : field === 'followers' ? (
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                  ) : (
                                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                                  )}
                                  <Input 
                                    value={inlineData[field] === 0 ? '' : inlineData[field] || ''}
                                    type={field === 'followers' ? 'number' : 'text'}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInlineData(p => ({ ...p, [field]: field === 'followers' ? Number(e.target.value) : e.target.value }))}
                                    placeholder={`Enter ${FIELD_LABELS[field] || field}...`}
                                    className="bg-white/5 border-white/10 text-white h-12 pl-11 rounded-xl focus-visible:ring-purple-500"
                                  />
                               </div>
                             </div>
                           )}
                        </div>
                      ))}

                      {/* Custom Campaign Questions */}
                      {hasCustomFields && (
                        <>
                          <div className="border-t border-white/10 pt-5 mt-2">
                            <p className="text-[11px] font-bold text-purple-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5" />
                              Campaign Questions
                            </p>
                          </div>
                          {campaign.form_fields!.map((field, idx) => (
                            <div key={`cf-${idx}`} className="space-y-2">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                                {field.name}
                                {field.required && <span className="text-red-400">*</span>}
                              </label>
                              {field.type === 'dropdown' ? (
                                <Select
                                  value={customFormData[field.name] || ""}
                                  onValueChange={(val) => setCustomFormData(p => ({ ...p, [field.name]: val }))}
                                >
                                  <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-purple-500">
                                    <SelectValue placeholder={`Select ${field.name}`} />
                                  </SelectTrigger>
                                  <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                    {field.options?.map(opt => (
                                      <SelectItem key={opt} value={opt} className="cursor-pointer">{opt}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : field.type === 'textarea' ? (
                                <textarea
                                  value={customFormData[field.name] || ''}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomFormData(p => ({ ...p, [field.name]: e.target.value }))}
                                  placeholder={`Enter ${field.name}...`}
                                  rows={3}
                                  className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-slate-600"
                                />
                              ) : (
                                <Input
                                  value={customFormData[field.name] || ''}
                                  type={field.type === 'number' ? 'number' : 'text'}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFormData(p => ({ ...p, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                                  placeholder={`Enter ${field.name}...`}
                                  className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-purple-500"
                                />
                              )}
                            </div>
                          ))}
                        </>
                      )}
                    </div>

                    <div className="p-8 pt-4 border-t border-white/5 flex gap-4">
                       <Button 
                         variant="ghost" 
                         onClick={() => setShowProfileInline(false)}
                         className="flex-1 h-12 rounded-xl text-slate-400 hover:text-white"
                       >
                         Back
                       </Button>
                       <Button 
                         onClick={handleSaveInline}
                         disabled={savingProfile || Object.values(inlineData).some(v => !v && v !== 0) || (hasCustomFields && !isCustomFormValid())}
                         className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                       >
                         {savingProfile ? 'Submitting...' : 'Save & Apply'}
                       </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Form Fields View */}
              <AnimatePresence>
                {showCustomForm && campaign.form_fields && (
                  <motion.div 
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute inset-0 z-20 bg-slate-900 flex flex-col pointer-events-auto"
                  >
                    <div className="p-8 pb-4 border-b border-white/5">
                       <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <FileText className="h-5 w-5 text-purple-400" />
                          Application Form
                       </h3>
                       <p className="text-slate-400 text-sm mt-1">Fill in the details below to apply for <span className="text-white font-medium">{campaign.brand_name}</span></p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-8 space-y-5">
                      {campaign.form_fields.map((field, idx) => (
                        <div key={idx} className="space-y-2">
                           <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                              {field.name}
                              {field.required && <span className="text-red-400">*</span>}
                           </label>
                           
                           {field.type === 'dropdown' ? (
                             <Select 
                               value={customFormData[field.name] || ""} 
                               onValueChange={(val) => setCustomFormData(p => ({ ...p, [field.name]: val }))}
                             >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-purple-500">
                                   <SelectValue placeholder={`Select ${field.name}`} />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                                   {field.options?.map(opt => (
                                     <SelectItem key={opt} value={opt} className="cursor-pointer focus:bg-purple-500/20 focus:text-white">{opt}</SelectItem>
                                   ))}
                                </SelectContent>
                             </Select>
                           ) : field.type === 'textarea' ? (
                             <textarea
                               value={customFormData[field.name] || ''}
                               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCustomFormData(p => ({ ...p, [field.name]: e.target.value }))}
                               placeholder={`Enter ${field.name}...`}
                               rows={3}
                               className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-slate-600"
                             />
                           ) : (
                             <Input 
                               value={customFormData[field.name] || ''}
                               type={field.type === 'number' ? 'number' : 'text'}
                               onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFormData(p => ({ ...p, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                               placeholder={`Enter ${field.name}...`}
                               className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-purple-500"
                             />
                           )}
                        </div>
                      ))}
                    </div>

                    <div className="p-8 pt-4 border-t border-white/5 flex gap-4">
                       <Button 
                         variant="ghost" 
                         onClick={() => setShowCustomForm(false)}
                         className="flex-1 h-12 rounded-xl text-slate-400 hover:text-white cursor-pointer"
                       >
                         <ArrowLeft className="mr-2 h-4 w-4" />
                         Back
                       </Button>
                       <Button 
                         onClick={handleCustomFormSubmit}
                         disabled={submitting || !isCustomFormValid()}
                         className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                       >
                         {submitting ? (
                           <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                         ) : (
                           <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit Application</>
                         )}
                       </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 z-10 rounded-full p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="p-8 pb-4">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                       <h2 className="text-2xl font-bold text-white tracking-tight">{campaign.brand_name}</h2>
                       <span className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">ID: {campaign.campaign_code}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs font-semibold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/10">
                        {campaign.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Body - Grid Layout */}
              <div className="flex-1 overflow-y-auto p-8 pt-4 space-y-6">
                
                {/* Top Quick Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <DetailCard label="Status" value={campaign.status} icon={CheckCircle2} color="text-emerald-500" />
                  <DetailCard label="Platform" value={campaign.platform} icon={Layout} color="text-blue-500" />
                </div>

                {/* Looking For / Deliverables */}
                <DetailCard 
                  label="Looking For" 
                  value={campaign.deliverables} 
                  icon={Sparkles} 
                  color="text-amber-400" 
                />

                {/* Gender & Requirements */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailCard 
                    label="Gender" 
                    value={campaign.gender_required === 'Any' ? 'Open to All' : campaign.gender_required} 
                    icon={Users} 
                    color="text-pink-400" 
                  />
                  <DetailCard 
                    label="Location" 
                    value={campaign.location || "PAN India"} 
                    icon={MapPin} 
                    color="text-red-400" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailCard 
                    label="Followers Req." 
                    value={campaign.followers || "No restriction"} 
                    icon={Sparkles} 
                    color="text-amber-400" 
                  />
                  <DetailCard 
                    label="Collab Date" 
                    value={campaign.collab_date || "Flexible"} 
                    icon={CheckCircle2} 
                    color="text-indigo-400" 
                  />
                </div>

                {campaign.requirements && (
                   <DetailCard 
                     label="Requirements" 
                     value={campaign.requirements} 
                     icon={FileText} 
                     color="text-indigo-400" 
                   />
                )}
                
                {campaign.additional_info && (
                   <DetailCard 
                     label="Additional Info" 
                     value={campaign.additional_info} 
                     icon={AlertCircle} 
                     color="text-slate-400" 
                   />
                )}

                {/* Links & Budget */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <DetailCard 
                    label="Product / Website Link" 
                    value={
                      campaign.product_links && campaign.product_links.length > 0 ? (
                        <div className="flex flex-col gap-1 mt-1">
                          {campaign.product_links.map((link, i) => (
                            <a 
                              key={i} 
                              href={link} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-purple-400 hover:underline flex items-center gap-1.5"
                            >
                              <Link2 className="h-3 w-3" />
                              View Product
                            </a>
                          ))}
                        </div>
                      ) : 'N/A'
                    } 
                    icon={Link2} 
                    color="text-purple-400" 
                  />
                  <DetailCard 
                    label="Budget" 
                    value={campaign.budget_type === 'Paid' ? '💰 Paid Collaboration' : '🤝 Barter Collaboration'} 
                    icon={CreditCard} 
                    color="text-emerald-400" 
                  />
                </div>

                {/* Terms Checkbox */}
                <div className="pt-4">
                    <button 
                      className="w-full flex items-start gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5 cursor-pointer group hover:bg-white/[0.05] transition-colors text-left"
                      onClick={() => setAgreementChecked(!agreementChecked)}
                    >
                      <div className={`mt-0.5 h-5 w-5 min-w-[20px] rounded-md border flex items-center justify-center transition-all ${agreementChecked ? 'bg-purple-600 border-purple-600' : 'bg-slate-950 border-white/20'}`}>
                        {agreementChecked && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-300">
                          I have read all the requirements carefully. 
                          <span className="text-red-400 ml-1">Backout not allowed.</span>
                        </p>
                      </div>
                    </button>
                </div>
              </div>

              {/* Footer */}
              <div className="p-8 pt-0">
                <Button
                  onClick={handleApplyClick}
                  disabled={!agreementChecked}
                  className="w-full h-14 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-lg shadow-xl shadow-purple-500/20 transition-all active:scale-[0.98] group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {!isLoggedIn 
                    ? 'Login to Apply' 
                    : campaign.form_link 
                      ? 'Apply via External Form' 
                      : 'Apply Now'
                  }
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
