'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, Instagram, Youtube, ShoppingBag, Users, FileText, 
  Link2, CheckCircle2, ArrowRight, AlertCircle, MapPin, Plus, Store, ExternalLink,
  CreditCard, Layout, Sparkles, Check, ArrowLeft, Loader2, ClipboardList, MessageSquare, UploadCloud, Image as ImageIcon,
  CheckCircle,
  TrendingUp,
  User,
  Lock,
  Clock,
  RotateCcw,
  XCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/providers/AuthProvider'
import { getInstagramDisplayHandle } from '@/lib/instagram-utils'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import Link from 'next/link'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import MobileOTPModal from '@/components/modals/MobileOTPModal'
import { checkFollowerEligibility, formatFollowerCount } from '@/lib/utils/follower-utils'
import { checkCampaignLocationEligibility, formatCampaignLocationText, StoreLocation } from '@/lib/utils/location-utils'
import { checkCreatorCompletionEligibility, CreatorCompletionEligibility } from '@/lib/utils/completion-timeline-utils'
import QuickAddAddressModal from '@/components/modals/QuickAddAddressModal'
import { getPrefillValueForField } from '@/lib/utils/profile-sync-utils'

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
  store_locations?: StoreLocation[]
  enforce_location?: boolean
  looking_for?: string
  followers?: string
  min_followers?: number
  enforce_followers?: boolean
  additional_info?: string
  collab_date?: string
  form_link?: string
  form_fields?: { name: string; type: string; required: boolean; options: string[] }[]
  order_form?: boolean
  order_form_fields?: { name: string; type: string; required: boolean; options: string[] }[]
  show_order_form?: boolean
  applied?: boolean
  application_status?: string
  application_id?: string
  applied_at?: string
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
  const [commentText, setCommentText] = useState('')
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({})
  const [isSuccess, setIsSuccess] = useState(false)
  const [hasAttemptedInlineSubmit, setHasAttemptedInlineSubmit] = useState(false)
  const [hasAttemptedCustomSubmit, setHasAttemptedCustomSubmit] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [quickAddressModalOpen, setQuickAddressModalOpen] = useState(false)
  const { user, isProfileComplete, getMissingFields, refreshUserProfile } = useAuth()
  const router = useRouter()

  // Multi-Instagram Profile Support
  const userProfiles = (user?.instagram_profiles && user.instagram_profiles.length > 0)
    ? user.instagram_profiles
    : (user?.instagram_username ? [{
        id: 'primary',
        username: user.instagram_username,
        normalized_username: user.instagram_username.toLowerCase(),
        followers: user.followers || 0,
        is_primary: true
      }] : [])

  const [selectedProfileId, setSelectedProfileId] = useState<string>('')
  const [selectedStoreOutlet, setSelectedStoreOutlet] = useState<StoreLocation | null>(null)
  const [completionEligibility, setCompletionEligibility] = useState<CreatorCompletionEligibility>({
    isEligible: true,
    overdueCount: 0,
    blockingCount: 0,
    blockedApplications: [],
    overdueApplications: [],
    message: '',
  })

  useEffect(() => {
    if (isLoggedIn && isOpen) {
      fetch('/api/dashboard/applications')
        .then(res => res.json())
        .then(data => {
          if (data.applications) {
            const res = checkCreatorCompletionEligibility(data.applications)
            setCompletionEligibility(res)
          }
        })
        .catch(() => {})
    }
  }, [isLoggedIn, isOpen])

  useEffect(() => {
    if (userProfiles.length > 0 && !selectedProfileId) {
      const primary = userProfiles.find(p => p.is_primary) || userProfiles[0]
      setSelectedProfileId(primary.id || primary.username)
    }
  }, [userProfiles, selectedProfileId])

  const activeSelectedProfile = userProfiles.find(p => (p.id || p.username) === selectedProfileId) || userProfiles[0]
  const effectiveFollowers = activeSelectedProfile?.followers ?? user?.followers ?? 0
  const locationEligibility = campaign
    ? checkCampaignLocationEligibility(campaign, user)
    : { isEligible: true, isStrict: false, requiredLocationText: '', locationType: 'PAN_INDIA' as const, matchedAddress: undefined, matchingAddresses: [], userAddresses: [], targetStates: [], targetCities: [], storeLocations: [], matchingStores: [], reason: '' }

  useEffect(() => {
    if (campaign?.store_locations && campaign.store_locations.length > 0) {
      const matched = locationEligibility?.matchingStores?.[0] || campaign.store_locations[0]
      setSelectedStoreOutlet(matched)
    } else {
      setSelectedStoreOutlet(null)
    }
  }, [campaign, locationEligibility?.matchingStores])

  const handleCopyLink = () => {
    if (typeof window === 'undefined' || !campaign) return
    const url = `${window.location.origin}/campaigns/${campaign.id}`
    navigator.clipboard.writeText(url)
    setCopiedLink(true)
    toast.success('Campaign link copied to clipboard!')
    setTimeout(() => setCopiedLink(false), 2000)
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string, isInline: boolean) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploadingFields(p => ({ ...p, [fieldName]: true }))

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      if (isInline) {
        setInlineData(p => ({ ...p, [fieldName]: data.url }))
      } else {
        setCustomFormData(p => ({ ...p, [fieldName]: data.url }))
      }
      toast.success('Image uploaded successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image')
    } finally {
      setUploadingFields(p => ({ ...p, [fieldName]: false }))
    }
  }

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setAgreementChecked(false)
      setShowProfileInline(false)
      setShowCustomForm(false)
      setCustomFormData({})
      setCommentText('')
      setSavingProfile(false)
      setIsSuccess(false)
      setHasAttemptedInlineSubmit(false)
      setHasAttemptedCustomSubmit(false)
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

      // Also init custom fields with auto-prefill from user profile
      if (hasCustomFields) {
        const cfInitial: Record<string, any> = {}
        campaign!.form_fields!.forEach(f => {
          cfInitial[f.name] = getPrefillValueForField(f.name, user) || ''
        })
        setCustomFormData(cfInitial)
      }
    }
  }, [showProfileInline, user])

  if (!campaign) return null

  const emoji = brandEmojis[campaign.brand_name] || '✨'

  const hasCustomFields = campaign.form_fields && campaign.form_fields.length > 0
  // Bank details excluded from campaign apply — collected later
  const bankFields = ['account_name', 'account_number', 'ifsc_code']
  const campaignMissingFields = getMissingFields().filter(f => !bankFields.includes(f))
  const missingFields = campaignMissingFields
  const needsInlineForm = true // Always show form for comments

  // Check pending missing fields for Inline Profile Completion View
  const getPendingInlineRequirements = () => {
    const missing: string[] = []
    
    // Check missing profile fields
    missingFields.forEach(field => {
      const val = inlineData[field]
      if (field === 'followers') {
        if (val === undefined || val === null || val === '' || Number(val) <= 0) {
          missing.push(FIELD_LABELS[field] || 'Followers Count')
        }
      } else {
        if (!val || (typeof val === 'string' && val.trim() === '')) {
          missing.push(FIELD_LABELS[field] || field)
        }
      }
    })

    // Check custom campaign fields
    if (hasCustomFields && campaign?.form_fields) {
      campaign.form_fields
        .filter(f => f.required)
        .forEach(f => {
          const val = customFormData[f.name]
          if (!val || (typeof val === 'string' && val.trim() === '')) {
            missing.push(f.name)
          }
        })
    }

    return missing
  }

  // Check pending requirements for Custom Form Fields View
  const getPendingCustomRequirements = () => {
    if (!campaign?.form_fields) return []
    return campaign.form_fields
      .filter(f => f.required && (!customFormData[f.name] || (typeof customFormData[f.name] === 'string' && customFormData[f.name].trim() === '')))
      .map(f => f.name)
  }

  const handleApplyClick = () => {
    if (!isLoggedIn) {
      onApply(campaign)
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

    // Show combined form if profile incomplete OR campaign has custom questions/order form/comments
    if (needsInlineForm) {
      setShowProfileInline(true)
      return
    }

    onApply(campaign)
  }

  const isProfileFormValid = () => {
    return missingFields.every(field => {
      const val = inlineData[field]
      if (field === 'followers') return val !== undefined && val !== null && val !== '' && Number(val) > 0
      return val !== undefined && val !== null && val !== ''
    })
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
    setHasAttemptedCustomSubmit(true)

    const pending = getPendingCustomRequirements()
    if (pending.length > 0) {
      toast.error(`Please complete required fields: ${pending.join(', ')}`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          formData: customFormData,
          selectedStore: selectedStoreOutlet,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to apply')
      
      setIsSuccess(true)
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSaveInline = async () => {
    setHasAttemptedInlineSubmit(true)

    const pending = getPendingInlineRequirements()
    if (pending.length > 0) {
      toast.error(`Please fill in required fields: ${pending.join(', ')}`)
      return
    }

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
          formData: {
            ...(hasCustomFields ? customFormData : {}),
            comments: commentText || '',
          },
          selectedStore: selectedStoreOutlet,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to apply')

      setIsSuccess(true)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setSavingProfile(false)
    }
  }

  const DetailCard = ({ label, value, icon: Icon, color }: { label: string, value: string | React.ReactNode, icon?: any, color?: string }) => (
    <div className="bg-gray-muted border border-border-subtle rounded-lg p-4 flex flex-col gap-1.5 transition-all hover:bg-surface-container">
      <span className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1.5">
        {Icon && <Icon className={`h-3 w-3 ${color || 'text-secondary'}`} />}
        {label}
      </span>
      <span className="text-sm font-bold text-charcoal-surface">{value}</span>
    </div>
  )

  return (
    <>
      <AnimatePresence>
        {isOpen && !isSuccess && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-charcoal-surface/40 backdrop-blur-sm z-[100]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-lg border border-border-subtle bg-white shadow-xl flex flex-col pointer-events-auto text-foreground">
              
              {/* Inline Profile Completion View */}
              <AnimatePresence>
                {showProfileInline && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 1.05 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    className="absolute inset-0 z-20 bg-white flex flex-col pointer-events-auto"
                  >
                    {/* Header with campaign info */}
                    <div className="p-4 sm:p-6 pb-4 border-b border-border-subtle bg-gray-muted">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-charcoal-surface flex items-center gap-2">
                            ✈️ Apply to Campaign
                          </h3>
                          <p className="text-secondary text-sm mt-0.5">{campaign.brand_name}</p>
                        </div>
                        <button 
                          onClick={() => setShowProfileInline(false)}
                          className="p-2 rounded-md hover:bg-gray-muted text-secondary hover:text-charcoal-surface transition-colors cursor-pointer"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>

                      {/* Campaign + Instagram Info Cards */}
                      <div className="mt-4 space-y-3">
                        {/* Campaign Card */}
                        <div className="flex items-center gap-3 rounded-md bg-gray-muted border border-border-subtle p-3">
                          <div className="flex items-center justify-center h-10 w-10 rounded-md bg-primary-container text-black font-extrabold text-sm shrink-0">
                            {campaign.brand_name?.charAt(0) || 'C'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-charcoal-surface truncate">{campaign.brand_name}</p>
                            <p className="text-[11px] text-secondary">Campaign ID: {campaign.campaign_code}</p>
                          </div>
                        </div>

                        {/* Instagram Profile Card */}
                        {user?.instagram_username && (
                          <div className="flex items-center gap-3 rounded-md bg-gray-muted border border-border-subtle p-3">
                            <div className="flex items-center justify-center h-10 w-10 rounded-md bg-secondary text-white shrink-0">
                              <Instagram className="h-5 w-5 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-charcoal-surface truncate">{getInstagramDisplayHandle(user.instagram_username)}</p>
                              <p className="text-[11px] text-secondary">Primary Instagram Profile</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-5">
                      {/* Missing Requirements Alert Box */}
                      {getPendingInlineRequirements().length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3.5 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-900 shadow-sm"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="space-y-1 text-xs">
                                <p className="font-bold text-amber-950">
                                  Action Required: Please complete details to apply
                                </p>
                                <p className="text-amber-800 text-[11px] leading-relaxed">
                                  Fill in the fields below or update your profile:
                                </p>
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {getPendingInlineRequirements().map((req, i) => (
                                    <span 
                                      key={i} 
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-semibold"
                                    >
                                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
                                      {req}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onClose()
                                router.push('/dashboard/profile')
                              }}
                              className="h-8 px-3 text-[11px] font-bold text-amber-900 border-amber-300 hover:bg-amber-100 bg-white shadow-2xs gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
                            >
                              <User className="h-3.5 w-3.5 text-amber-700" />
                              <span>Go to Profile</span>
                              <ArrowRight className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </motion.div>
                      )}

                      {Array.from(new Set(missingFields.map(f => (f === 'city' ? 'state' : f)))).map((field) => (
                        <div key={field}>
                           {field === 'gender' ? (
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 flex items-center justify-between">
                                  <span>{FIELD_LABELS[field] || field}</span>
                                  <span className="text-red-500 font-bold">* (Required)</span>
                                </label>
                               <Select 
                                 value={inlineData[field] || ""} 
                                 onValueChange={(val) => setInlineData(p => ({ ...p, [field]: val }))}
                               >
                                  <SelectTrigger className={`bg-white border text-foreground h-11 rounded-md focus:ring-primary-container ${
                                    hasAttemptedInlineSubmit && !inlineData[field] ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                                  }`}>
                                     <SelectValue placeholder="Select Gender" />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border border-border-subtle text-foreground">
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
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 flex items-center justify-between">
                                     <span>State</span>
                                     <span className="text-red-500 font-bold">*</span>
                                  </label>
                                  <Select 
                                    value={inlineData.state || ""} 
                                    onValueChange={(val) => setInlineData(p => ({ ...p, state: val, city: '' }))}
                                  >
                                    <SelectTrigger className={`bg-white border text-foreground h-11 rounded-md focus:ring-primary-container ${
                                      hasAttemptedInlineSubmit && !inlineData.state ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                                    }`}>
                                       <SelectValue placeholder="Select State" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-border-subtle text-foreground max-h-[300px]">
                                       {STATES.map(s => (
                                         <SelectItem key={s} value={s} className="cursor-pointer">{s}</SelectItem>
                                       ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                                {/* City */}
                                <div className="space-y-2">
                                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 flex items-center justify-between">
                                     <span>City</span>
                                     <span className="text-red-500 font-bold">*</span>
                                  </label>
                                  <Select 
                                    disabled={!inlineData.state && !user?.state}
                                    value={inlineData.city || ""} 
                                    onValueChange={(val) => setInlineData(p => ({ ...p, city: val }))}
                                  >
                                    <SelectTrigger className={`bg-white border text-foreground h-11 rounded-md focus:ring-primary-container ${
                                      hasAttemptedInlineSubmit && !inlineData.city ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                                    }`}>
                                       <SelectValue placeholder="Select City" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border border-border-subtle text-foreground max-h-[300px]">
                                       {(inlineData.state || user?.state) && INDIA_DATA[inlineData.state || user?.state!]?.map(c => (
                                         <SelectItem key={c} value={c} className="cursor-pointer">{c}</SelectItem>
                                       ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                           ) : (
                             <div className="space-y-2">
                               <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 flex items-center justify-between">
                                  <span>{FIELD_LABELS[field] || field}</span>
                                  <span className="text-red-500 font-bold">* (Required)</span>
                               </label>
                               <div className="relative">
                                  {field.includes('account') || field.includes('ifsc') ? (
                                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                                  ) : field.includes('instagram') ? (
                                    <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                                  ) : field === 'followers' ? (
                                    <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                                  ) : (
                                    <Sparkles className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                                  )}
                                  <Input 
                                    value={inlineData[field] === 0 ? '' : inlineData[field] || ''}
                                    type={field === 'followers' ? 'number' : 'text'}
                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInlineData(p => ({ ...p, [field]: field === 'followers' ? Number(e.target.value) : e.target.value }))}
                                    placeholder={`Enter ${FIELD_LABELS[field] || field}...`}
                                    className={`bg-white text-foreground h-11 pl-11 rounded-md focus-visible:ring-primary-container ${
                                      hasAttemptedInlineSubmit && (
                                        field === 'followers' 
                                          ? (!inlineData[field] || Number(inlineData[field]) <= 0)
                                          : (!inlineData[field] || String(inlineData[field]).trim() === '')
                                      ) ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                                    }`}
                                  />
                                  </div>
                                </div>
                               )}
                             </div>
                            ))}


                       {/* Comments - Always shown */}
                           <div className="border-t border-border-subtle pt-5 mt-2">
                             <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                               <MessageSquare className="h-3.5 w-3.5" />
                               Comments / Notes
                             </p>
                           </div>
                           <div className="space-y-2">
                             <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1">
                               Your Comments (Optional)
                             </label>
                             <textarea
                               value={commentText}
                               onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCommentText(e.target.value)}
                               placeholder="Add any comments, notes, or questions for the brand..."
                               rows={4}
                               className="w-full bg-white border border-border-subtle text-foreground text-sm rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-container resize-none placeholder:text-secondary"
                             />
                           </div>


                       {/* Custom Campaign Questions */}
                       {hasCustomFields && (
                         <>
                           <div className="border-t border-border-subtle pt-5 mt-2">
                             <p className="text-[11px] font-bold text-primary uppercase tracking-widest mb-4 flex items-center gap-2">
                               <FileText className="h-3.5 w-3.5" />
                               Campaign Questions
                             </p>
                           </div>
                           {campaign.form_fields!.map((field, idx) => (
                             <div key={`cf-${idx}`} className="space-y-2">
                               <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 flex items-center justify-between">
                                 <span>{field.name}</span>
                                 {field.required && <span className="text-red-500 font-bold">* (Required)</span>}
                               </label>
                               {field.type === 'dropdown' ? (
                                 <Select
                                   value={customFormData[field.name] || ""}
                                   onValueChange={(val) => setCustomFormData(p => ({ ...p, [field.name]: val }))}
                                 >
                                   <SelectTrigger className={`bg-white border text-foreground h-11 rounded-md focus:ring-primary-container ${
                                     hasAttemptedInlineSubmit && field.required && !customFormData[field.name] ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                                   }`}>
                                     <SelectValue placeholder={`Select ${field.name}`} />
                                   </SelectTrigger>
                                   <SelectContent className="bg-white border border-border-subtle text-foreground max-h-[300px]">
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
                                   className={`w-full bg-white border text-foreground text-sm rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-container resize-none placeholder:text-secondary ${
                                     hasAttemptedInlineSubmit && field.required && (!customFormData[field.name] || customFormData[field.name].trim() === '') ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                                   }`}
                                 />
                               ) : field.type === 'image' ? (
                                 <div className="space-y-2">
                                   {customFormData[field.name] ? (
                                     <div className="relative rounded-md border border-border-subtle overflow-hidden bg-gray-muted aspect-video max-h-[200px] flex items-center justify-center">
                                       <img src={customFormData[field.name]} alt={field.name} className="max-w-full max-h-full object-contain" />
                                       <button
                                         type="button"
                                         onClick={() => setCustomFormData(p => ({ ...p, [field.name]: '' }))}
                                         className="absolute top-2 right-2 p-1.5 rounded bg-black/50 text-white hover:bg-red-500/80 transition-colors"
                                       >
                                         <X className="h-4 w-4" />
                                       </button>
                                     </div>
                                   ) : (
                                     <label className={`relative flex flex-col items-center justify-center w-full h-32 rounded-md border-2 border-dashed hover:border-primary-container bg-white hover:bg-gray-muted transition-all cursor-pointer group ${
                                       hasAttemptedInlineSubmit && field.required && !customFormData[field.name] ? 'border-red-400' : 'border-border-subtle'
                                     }`}>
                                       {uploadingFields[field.name] ? (
                                         <div className="flex flex-col items-center gap-2">
                                           <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                           <span className="text-xs text-secondary">Uploading...</span>
                                         </div>
                                       ) : (
                                         <>
                                           <UploadCloud className="h-8 w-8 text-secondary group-hover:text-primary mb-2 transition-colors" />
                                           <span className="text-sm font-medium text-secondary">Tap to select image</span>
                                           <span className="text-[10px] text-secondary mt-1">PNG, JPG formats supported</span>
                                         </>
                                       )}
                                       <input
                                         type="file"
                                         accept="image/png, image/jpeg, image/webp"
                                         className="hidden"
                                         disabled={uploadingFields[field.name]}
                                         onChange={(e) => handleImageUpload(e, field.name, false)}
                                       />
                                     </label>
                                   )}
                                 </div>
                               ) : (
                                 <Input
                                   value={customFormData[field.name] || ''}
                                   type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                                   onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFormData(p => ({ ...p, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                                   placeholder={field.type === 'date' ? '' : `Enter ${field.name}...`}
                                   className={`bg-white border text-foreground h-11 rounded-md focus-visible:ring-primary-container ${
                                     hasAttemptedInlineSubmit && field.required && (!customFormData[field.name] || String(customFormData[field.name]).trim() === '') ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                                   }`}
                                 />
                               )}
                             </div>
                           ))}
                         </>
                       )}
                     </div>

                     <div className="p-4 sm:p-6 pt-3 border-t border-border-subtle flex flex-col gap-2.5 bg-white">
                        {getPendingInlineRequirements().length > 0 && (
                          <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium px-1">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <span>Please complete: <strong className="font-bold text-amber-950">{getPendingInlineRequirements().join(', ')}</strong></span>
                          </div>
                        )}
                        <div className="flex gap-4">
                          <Button 
                            variant="outline" 
                            onClick={() => setShowProfileInline(false)}
                            className="flex-1 h-12 rounded-md text-secondary border-border-subtle cursor-pointer hover:bg-gray-muted font-bold"
                          >
                            Back
                          </Button>
                          <Button 
                            onClick={handleSaveInline}
                            disabled={savingProfile}
                            className={`flex-[2] h-12 rounded-md font-bold uppercase transition-all shadow-sm cursor-pointer ${
                              getPendingInlineRequirements().length > 0
                                ? 'bg-primary-container/80 hover:bg-primary-container text-black'
                                : 'bg-primary-container hover:bg-primary-container/90 text-black'
                            }`}
                          >
                            {savingProfile ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                            ) : getPendingInlineRequirements().length > 0 ? (
                              'Complete & Apply'
                            ) : (
                              'Save & Apply'
                            )}
                          </Button>
                        </div>
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
                    className="absolute inset-0 z-20 bg-white flex flex-col pointer-events-auto"
                  >
                    <div className="p-4 sm:p-8 pb-4 border-b border-border-subtle">
                       <h3 className="text-xl font-bold text-charcoal-surface flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Application Form
                       </h3>
                       <p className="text-secondary text-sm mt-1">Fill in the details below to apply for <span className="text-charcoal-surface font-semibold">{campaign.brand_name}</span></p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-5">
                      {/* Missing custom requirements alert box */}
                      {getPendingCustomRequirements().length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-3.5 rounded-lg bg-amber-50 border border-amber-200/90 text-amber-900 shadow-sm"
                        >
                          <div className="flex items-start gap-2.5">
                            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div className="space-y-1 text-xs">
                              <p className="font-bold text-amber-950">
                                Required Questions Incomplete
                              </p>
                              <p className="text-amber-800 text-[11px] leading-relaxed">
                                Please answer: {getPendingCustomRequirements().join(', ')}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {campaign.form_fields.map((field, idx) => (
                        <div key={idx} className="space-y-2">
                           <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1 flex items-center justify-between">
                              <span>{field.name}</span>
                              {field.required && <span className="text-red-500 font-bold">* (Required)</span>}
                           </label>
                           
                           {field.type === 'dropdown' ? (
                             <Select 
                               value={customFormData[field.name] || ""} 
                               onValueChange={(val) => setCustomFormData(p => ({ ...p, [field.name]: val }))}
                             >
                                <SelectTrigger className={`bg-white border text-foreground h-11 rounded-md focus:ring-primary-container ${
                                  hasAttemptedCustomSubmit && field.required && !customFormData[field.name] ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                                }`}>
                                   <SelectValue placeholder={`Select ${field.name}`} />
                                </SelectTrigger>
                                <SelectContent className="bg-white border border-border-subtle text-foreground max-h-[300px]">
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
                               className={`w-full bg-white border text-foreground text-sm rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-container resize-none placeholder:text-secondary ${
                                 hasAttemptedCustomSubmit && field.required && (!customFormData[field.name] || customFormData[field.name].trim() === '') ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                               }`}
                             />
                           ) : field.type === 'image' ? (
                             <div className="space-y-2">
                               {customFormData[field.name] ? (
                                 <div className="relative rounded-md border border-border-subtle overflow-hidden bg-gray-muted aspect-video max-h-[200px] flex items-center justify-center">
                                   <img src={customFormData[field.name]} alt={field.name} className="max-w-full max-h-full object-contain" />
                                   <button
                                     type="button"
                                     onClick={() => setCustomFormData(p => ({ ...p, [field.name]: '' }))}
                                     className="absolute top-2 right-2 p-1.5 rounded bg-black/50 text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                                   >
                                     <X className="h-4 w-4" />
                                   </button>
                                 </div>
                               ) : (
                                 <label className={`relative flex flex-col items-center justify-center w-full h-32 rounded-md border-2 border-dashed hover:border-primary-container bg-white hover:bg-gray-muted transition-all cursor-pointer group ${
                                   hasAttemptedCustomSubmit && field.required && !customFormData[field.name] ? 'border-red-400' : 'border-border-subtle'
                                 }`}>
                                   {uploadingFields[field.name] ? (
                                     <div className="flex flex-col items-center gap-2">
                                       <Loader2 className="h-6 w-6 text-primary animate-spin" />
                                       <span className="text-xs text-secondary">Uploading...</span>
                                     </div>
                                   ) : (
                                     <>
                                       <UploadCloud className="h-8 w-8 text-secondary group-hover:text-primary mb-2 transition-colors" />
                                       <span className="text-sm font-medium text-secondary">Tap to select image</span>
                                       <span className="text-[10px] text-secondary mt-1">PNG, JPG formats supported</span>
                                     </>
                                   )}
                                   <input
                                     type="file"
                                     accept="image/png, image/jpeg, image/webp"
                                     className="hidden"
                                     disabled={uploadingFields[field.name]}
                                     onChange={(e) => handleImageUpload(e, field.name, false)}
                                   />
                                 </label>
                               )}
                             </div>
                           ) : (
                             <Input 
                               value={customFormData[field.name] || ''}
                               type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                               onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomFormData(p => ({ ...p, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                               placeholder={field.type === 'date' ? '' : `Enter ${field.name}...`}
                               className={`bg-white border text-foreground h-11 rounded-md focus-visible:ring-primary-container ${
                                 hasAttemptedCustomSubmit && field.required && (!customFormData[field.name] || String(customFormData[field.name]).trim() === '') ? 'border-red-400 ring-1 ring-red-400' : 'border-border-subtle'
                               }`}
                             />
                           )}
                        </div>
                      ))}
                    </div>

                    <div className="p-4 sm:p-6 pt-3 border-t border-border-subtle flex flex-col gap-2.5 bg-white">
                       {getPendingCustomRequirements().length > 0 && (
                         <div className="flex items-center gap-1.5 text-[11px] text-amber-800 font-medium px-1">
                           <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                           <span>Please complete: <strong className="font-bold text-amber-950">{getPendingCustomRequirements().join(', ')}</strong></span>
                         </div>
                       )}
                       <div className="flex gap-4">
                         <Button 
                           variant="outline" 
                           onClick={() => setShowCustomForm(false)}
                           className="flex-1 h-12 rounded-md text-secondary border-border-subtle cursor-pointer hover:bg-gray-muted font-bold"
                         >
                           <ArrowLeft className="mr-2 h-4 w-4" />
                           Back
                         </Button>
                         <Button 
                           onClick={handleCustomFormSubmit}
                           disabled={submitting}
                           className={`flex-[2] h-12 rounded-md font-bold uppercase transition-all shadow-sm cursor-pointer ${
                             getPendingCustomRequirements().length > 0
                               ? 'bg-primary-container/80 hover:bg-primary-container text-black'
                               : 'bg-primary-container hover:bg-primary-container/90 text-black'
                           }`}
                         >
                           {submitting ? (
                             <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                           ) : getPendingCustomRequirements().length > 0 ? (
                             'Complete & Submit'
                           ) : (
                             <><CheckCircle2 className="mr-2 h-4 w-4" /> Submit Application</>
                           )}
                         </Button>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Top Right Action Buttons */}
              <div className="absolute top-6 right-6 z-10 flex items-center gap-2">
                <button
                  onClick={handleCopyLink}
                  title="Copy campaign link"
                  className="rounded-full py-1.5 px-3 bg-gray-muted hover:bg-surface-container text-secondary hover:text-charcoal-surface transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold"
                >
                  {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Link2 className="h-4 w-4 text-primary" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="rounded-full p-2 bg-gray-muted hover:bg-surface-container text-secondary hover:text-charcoal-surface transition-all cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Header */}
              <div className="p-4 sm:p-8 pb-4">
                <div className="flex items-center gap-5">
                  <div className="h-14 w-14 rounded-lg bg-gray-muted border border-border-subtle flex items-center justify-center text-3xl shadow-inner">
                    {emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline gap-2">
                       <h2 className="text-2xl font-bold text-charcoal-surface tracking-tight">{campaign.brand_name}</h2>
                       <span className="text-[10px] font-mono text-secondary uppercase tracking-tighter">ID: {campaign.campaign_code}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-bold text-primary bg-primary-container/10 px-2.5 py-1 rounded-full border border-primary-container/20">
                        {campaign.category}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable Body - Grid Layout */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 pt-4 space-y-6">
                
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

                {/* Store Outlets / Physical Branches Card */}
                {campaign.store_locations && campaign.store_locations.length > 0 && (
                  <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/25 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-purple-600 text-white">
                          <Store className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider">
                            Store Visit Outlets ({campaign.store_locations.length} Branches)
                          </h4>
                          <p className="text-[11px] text-purple-800">
                            Influencers need to visit any of these offline stores for collaboration & shoot.
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-purple-200 text-purple-900 uppercase">
                        🏬 Physical Visit
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                      {campaign.store_locations.map((st, i) => (
                        <div key={st.id || i} className="p-3 rounded-lg bg-white border border-border-subtle space-y-1 hover:border-purple-300 transition-colors shadow-xs">
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-xs font-bold text-slate-900">{st.name}</span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-800 font-bold">{st.city}</span>
                          </div>
                          {st.area && (
                            <p className="text-[10px] font-semibold text-purple-700">📍 {st.area}</p>
                          )}
                          <p className="text-[11px] text-slate-600 leading-snug">{st.address}</p>
                          {st.landmark && (
                            <p className="text-[10px] text-slate-500">Landmark: {st.landmark}</p>
                          )}
                          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[10px]">
                            {st.google_maps_url ? (
                              <a
                                href={st.google_maps_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-purple-600 hover:underline flex items-center gap-1 font-bold"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Google Maps
                              </a>
                            ) : <span className="text-slate-400">Offline Store</span>}
                            {st.slots_needed ? (
                              <span className="text-amber-700 font-bold">Quota: {st.slots_needed} Creators</span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {campaign.show_order_form !== false && (
                    <DetailCard 
                      label="Order Form" 
                      value={campaign.order_form ? '📋 Yes — Order Details Required' : '💬 No — Comments Only'} 
                      icon={ClipboardList} 
                      color="text-emerald-400" 
                    />
                  )}
                  <DetailCard 
                    label="Followers Req." 
                    value={campaign.followers || "No restriction"} 
                    icon={Sparkles} 
                    color="text-amber-400" 
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                {(() => {
                  const validProductLinks = (campaign.product_links || [])
                    .map(l => (typeof l === 'string' ? l.trim() : ''))
                    .filter(l => l && l.toLowerCase() !== 'na' && l.toLowerCase() !== 'n/a' && l !== 'null' && l !== 'undefined')

                  return (
                    <div className={`grid grid-cols-1 ${validProductLinks.length > 0 ? 'md:grid-cols-2' : ''} gap-4`}>
                      {validProductLinks.length > 0 && (
                        <DetailCard 
                          label="Product / Website Link" 
                          value={
                            <div className="flex flex-col gap-1 mt-1">
                              {validProductLinks.map((link, i) => (
                                <a 
                                  key={i} 
                                  href={link.startsWith('http') ? link : `https://${link}`} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-purple-400 hover:underline flex items-center gap-1.5 font-medium"
                                >
                                  <Link2 className="h-3 w-3 shrink-0" />
                                  <span className="truncate">View Product / Website</span>
                                </a>
                              ))}
                            </div>
                          } 
                          icon={Link2} 
                          color="text-purple-400" 
                        />
                      )}
                      <DetailCard 
                        label="Budget" 
                        value={campaign.budget_type === 'Paid' ? '💰 Paid Collaboration' : '🤝 Barter Collaboration'} 
                        icon={CreditCard} 
                        color="text-emerald-400"
                      />
                    </div>
                  )
                })()}

                {/* Already Applied / Under Process Status Banner */}
                {campaign.applied && campaign.application_status !== 'Rejected' && (
                  <div className={`p-4 rounded-xl border flex items-start gap-3 ${
                    (campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review')
                      ? 'bg-amber-50 border-amber-200'
                      : campaign.application_status === 'Approved'
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-blue-50 border-blue-200'
                  }`}>
                    <div className={`h-9 w-9 rounded-lg text-white flex items-center justify-center shrink-0 mt-0.5 ${
                      (campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review')
                        ? 'bg-amber-500'
                        : campaign.application_status === 'Approved'
                        ? 'bg-emerald-500'
                        : 'bg-blue-500'
                    }`}>
                      {(campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review') ? (
                        <Clock className="h-5 w-5" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className={`text-xs font-black uppercase tracking-wider ${
                          (campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review')
                            ? 'text-amber-950'
                            : campaign.application_status === 'Approved'
                            ? 'text-emerald-950'
                            : 'text-blue-950'
                        }`}>
                          {(campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review')
                            ? 'Application Under Process'
                            : campaign.application_status === 'Approved'
                            ? 'Application Approved 🎉'
                            : 'You Already Applied to this Campaign'}
                        </h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold border uppercase ${
                          (campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review')
                            ? 'bg-amber-100 text-amber-900 border-amber-300'
                            : campaign.application_status === 'Approved'
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                            : 'bg-blue-100 text-blue-900 border-blue-300'
                        }`}>
                          Status: {campaign.application_status || 'Applied'}
                        </span>
                      </div>
                      <p className={`text-xs mt-1 leading-relaxed ${
                        (campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review')
                          ? 'text-amber-800'
                          : campaign.application_status === 'Approved'
                          ? 'text-emerald-700'
                          : 'text-blue-800'
                      }`}>
                        {(campaign.application_status === 'Under Process' || campaign.application_status === 'Under Review')
                          ? 'Your application is currently being reviewed by our brand and admin team.'
                          : campaign.application_status === 'Approved'
                          ? 'Congratulations! Your profile has been approved for this campaign. Check your dashboard for deliverables.'
                          : 'Your application is currently submitted. You can check updates and campaign progress from your dashboard.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Rejected Application Notice & Re-apply invitation */}
                {campaign.applied && campaign.application_status === 'Rejected' && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <RotateCcw className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                          Previous Application Rejected
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
                          Status: Rejected
                        </span>
                      </div>
                      <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                        Your previous submission was not selected. You can update your responses and re-apply to this campaign below.
                      </p>
                    </div>
                  </div>
                )}

                {/* Multi-Instagram Profile Selector (if user has multiple accounts) */}
                {userProfiles.length > 1 && (!campaign.applied || campaign.application_status === 'Rejected') && (
                  <div className="p-4 rounded-xl bg-pink-50/60 border border-pink-200 space-y-2.5">
                    <Label className="text-xs font-black text-pink-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Instagram className="h-3.5 w-3.5 text-pink-600" />
                      Select Profile to Apply
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {userProfiles.map((p) => {
                        const isSelected = (p.id || p.username) === (activeSelectedProfile?.id || activeSelectedProfile?.username)
                        return (
                          <button
                            type="button"
                            key={p.id || p.username}
                            onClick={() => setSelectedProfileId(p.id || p.username)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-white border-pink-500 shadow-sm ring-2 ring-pink-500/20'
                                : 'bg-white/70 border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-black text-slate-900 truncate">@{p.username}</span>
                                {p.is_primary && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">Primary</span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5 font-bold">
                                {(p.followers || 0).toLocaleString('en-IN')} Followers
                              </p>
                            </div>
                            {isSelected && <CheckCircle2 className="h-4 w-4 text-pink-600 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Location Ineligibility Banner */}
                {(!campaign.applied || campaign.application_status === 'Rejected') && !locationEligibility.isEligible && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                          Location Requirement Not Met
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-rose-100 text-rose-900 border border-rose-300 uppercase">
                          Location Restricted
                        </span>
                      </div>
                      <p className="text-xs text-rose-900 leading-relaxed">
                        {locationEligibility.reason}
                      </p>
                      {isLoggedIn && (
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => setQuickAddressModalOpen(true)}
                          className="h-8 px-3 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm gap-1.5 cursor-pointer mt-1"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Add an Address in {locationEligibility.requiredLocationText}</span>
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Location Matched Eligible Banner */}
                {(!campaign.applied || campaign.application_status === 'Rejected') && locationEligibility.isEligible && locationEligibility.locationType !== 'PAN_INDIA' && locationEligibility.matchedAddress && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-900 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>Location Matched:</strong> Eligible via your address in <strong>{locationEligibility.matchedAddress.city ? `${locationEligibility.matchedAddress.city}, ` : ''}{locationEligibility.matchedAddress.state}</strong>
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      Eligible ✓
                    </span>
                  </div>
                )}

                {/* Followers Ineligibility Banner */}
                {(!campaign.applied || campaign.application_status === 'Rejected') && !checkFollowerEligibility(effectiveFollowers, campaign).eligible && (
                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                    <div className="h-9 w-9 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                          Follower Requirement Not Met
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-amber-100 text-amber-900 border border-amber-300 uppercase">
                          Strict Requirement
                        </span>
                      </div>
                      <p className="text-xs text-amber-900 mt-1 leading-relaxed">
                        {checkFollowerEligibility(effectiveFollowers, campaign).message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Overdue Completion / Deliverable Blocking Banner */}
                {(!campaign.applied || campaign.application_status === 'Rejected') && !completionEligibility.isEligible && (
                  <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 flex items-start gap-3 shadow-xs">
                    <div className="h-9 w-9 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Clock className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                          New Applications Locked — Pending Deliverable
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-extrabold bg-rose-200 text-rose-900 border border-rose-300 uppercase">
                          Overdue Submission
                        </span>
                      </div>
                      <p className="text-xs text-rose-900 leading-relaxed font-medium">
                        {completionEligibility.message}
                      </p>
                      <Link
                        href="/dashboard/approved"
                        className="inline-flex items-center gap-1.5 h-8 px-3 text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg shadow-sm cursor-pointer mt-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Go to Approved Campaigns & Submit Deliverable</span>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Terms Checkbox (Available if not applied OR if rejected and eligible to re-apply) */}
                {(!campaign.applied || campaign.application_status === 'Rejected') && checkFollowerEligibility(effectiveFollowers, campaign).eligible && locationEligibility.isEligible && completionEligibility.isEligible && (
                  <div className="pt-4 space-y-4">
                    {/* Preferred Store Outlet Selector for Store Visit Campaigns */}
                    {campaign.store_locations && campaign.store_locations.length > 0 && (
                      <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <Label className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                            <Store className="h-4 w-4 text-purple-600" />
                            Select Store Branch You Will Visit *
                          </Label>
                          <span className="text-[10px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                            Step 1: Pick Nearest Outlet
                          </span>
                        </div>
                        <p className="text-[11px] text-purple-900 leading-snug">
                          Please select the exact outlet where you will visit for creating content/shoot:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {campaign.store_locations.map((store, sIdx) => {
                            const isSelected = selectedStoreOutlet?.id === store.id || (selectedStoreOutlet?.name === store.name && selectedStoreOutlet?.city === store.city)
                            return (
                              <button
                                key={store.id || sIdx}
                                type="button"
                                onClick={() => setSelectedStoreOutlet(store)}
                                className={`p-3 rounded-xl text-left border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                                  isSelected
                                    ? 'bg-purple-600 text-white border-purple-600 shadow-md ring-2 ring-purple-400/40'
                                    : 'bg-white text-slate-800 border-purple-200/80 hover:border-purple-400 hover:bg-purple-50/50'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>{store.name}</span>
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${isSelected ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800'}`}>{store.city}</span>
                                  </div>
                                  <p className={`text-[11px] mt-0.5 line-clamp-1 ${isSelected ? 'text-purple-100' : 'text-slate-600'}`}>{store.address}</p>
                                  {store.area && (
                                    <p className={`text-[10px] mt-0.5 font-medium ${isSelected ? 'text-purple-200' : 'text-purple-700'}`}>📍 {store.area}</p>
                                  )}
                                </div>
                                <div className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-white bg-white text-purple-600' : 'border-slate-300 bg-white'}`}>
                                  {isSelected && <div className="h-2 w-2 rounded-full bg-purple-600" />}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}
                      <button 
                        className="w-full flex items-start gap-3 p-4 rounded-md bg-gray-muted border border-border-subtle cursor-pointer group hover:bg-surface-container transition-colors text-left"
                        onClick={() => setAgreementChecked(!agreementChecked)}
                      >
                        <div className={`mt-0.5 h-5 w-5 min-w-[20px] rounded-md border flex items-center justify-center transition-all ${agreementChecked ? 'bg-primary-container border-primary-container' : 'bg-white border-border-subtle'}`}>
                          {agreementChecked && <Check className="h-3.5 w-3.5 text-black font-extrabold" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-charcoal-surface">
                            I have read all the requirements carefully. 
                            <span className="text-error ml-1 font-bold">Backout not allowed.</span>
                          </p>
                        </div>
                      </button>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-8 pt-0">
                {campaign.applied && campaign.application_status !== 'Rejected' ? (
                  <Button
                    onClick={() => {
                      onClose()
                      window.location.href = campaign.application_status === 'Approved' ? '/dashboard/approved' : '/dashboard/campaigns'
                    }}
                    className="w-full h-14 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition-all active:scale-[0.98] group cursor-pointer"
                  >
                    <CheckCircle2 className="mr-2 h-5 w-5" />
                    <span>View Application in Dashboard</span>
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                ) : !checkFollowerEligibility(effectiveFollowers, campaign).eligible ? (
                  <Button
                    disabled
                    className="w-full h-14 rounded-md bg-amber-500/20 border border-amber-300 text-amber-950 font-bold text-sm cursor-not-allowed opacity-90"
                  >
                    <Lock className="mr-2 h-4 w-4 text-amber-800" />
                    <span>Min {formatFollowerCount(checkFollowerEligibility(effectiveFollowers, campaign).requiredFollowers)} Followers Required to Apply</span>
                  </Button>
                ) : !locationEligibility.isEligible ? (
                  <Button
                    onClick={() => {
                      if (!isLoggedIn) {
                        onApply(campaign)
                      } else {
                        setQuickAddressModalOpen(true)
                      }
                    }}
                    className="w-full h-14 rounded-md bg-rose-600 hover:bg-rose-700 text-white font-bold text-sm transition-all active:scale-[0.98] group cursor-pointer shadow-sm"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    <span>Add an Address in {locationEligibility.requiredLocationText} to Apply</span>
                  </Button>
                ) : (
                  <Button
                    onClick={handleApplyClick}
                    disabled={!agreementChecked}
                    className="w-full h-14 rounded-md bg-primary-container hover:bg-primary-container/90 text-black font-bold text-lg transition-all active:scale-[0.98] group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {campaign.applied && campaign.application_status === 'Rejected'
                      ? 'Re-Apply to Campaign'
                      : !isLoggedIn 
                      ? 'Quick Apply' 
                      : (needsInlineForm ? 'Complete Application' : 'Instant Apply')
                    }
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* ===== SUCCESS SCREEN ===== */}
      {isOpen && isSuccess && campaign && (
        <motion.div
           initial={{ opacity: 0, scale: 0.95, y: 20 }}
           animate={{ opacity: 1, scale: 1, y: 0 }}
           exit={{ opacity: 0, scale: 0.95, y: 20 }}
           transition={{ type: 'spring', damping: 25, stiffness: 300 }}
           className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-charcoal-surface/40 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg overflow-hidden rounded-lg border border-border-subtle bg-white shadow-xl flex flex-col p-6 text-foreground">
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-2">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                <div className="relative h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="h-8 w-8 text-white" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="text-2xl font-bold text-charcoal-surface tracking-tight">Application Sent! 🎉</h3>
                <p className="text-secondary text-sm max-w-[280px] mx-auto leading-relaxed">
                  Your application for <span className="text-primary font-semibold">{campaign.brand_name}</span> has been securely submitted.
                </p>
              </div>

              <div className="w-full bg-gray-muted border border-border-subtle rounded-md p-4 text-left space-y-3 mt-2">
                <div className="flex gap-3 items-start border-b border-border-subtle pb-3">
                  <div className="h-8 w-8 rounded-full bg-primary-container/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-charcoal-surface mb-1">Increase Your Chances</p>
                    <p className="text-xs text-secondary leading-relaxed">
                      Brands prioritize influencers with complete profiles. Go to your dashboard and fill in all your details to stand out!
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="h-8 w-8 rounded-full bg-primary-container/20 flex-shrink-0 flex items-center justify-center mt-0.5">
                    <CheckCircle className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-charcoal-surface mb-1">What&apos;s Next?</p>
                    <p className="text-xs text-secondary leading-relaxed">
                      You will be notified once the brand reviews your application and makes a decision!
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full space-y-2 pt-2">
                <Button
                  onClick={() => window.location.href = '/dashboard/campaigns'}
                  className="w-full h-11 rounded-md bg-primary-container hover:bg-primary-container/90 text-black font-bold"
                >
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsSuccess(false)
                    onClose()
                  }}
                  className="w-full h-11 rounded-md text-secondary hover:text-charcoal-surface hover:bg-gray-muted"
                >
                  Close & Explore Campaigns
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Mobile OTP Modal */}
      <MobileOTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onVerified={async () => {
          if (refreshUserProfile) {
            await refreshUserProfile()
          }
        }}
        mobile={user?.mobile || ''}
      />

      {/* Quick Add Address Modal for Location Targeting */}
      {campaign && (
        <QuickAddAddressModal
          isOpen={quickAddressModalOpen}
          onClose={() => setQuickAddressModalOpen(false)}
          targetStates={campaign.target_states || []}
          targetCities={campaign.target_cities || []}
          campaignTitle={campaign.brand_name}
          onSuccess={() => {
            setQuickAddressModalOpen(false)
          }}
        />
      )}
    </>
  )
}
