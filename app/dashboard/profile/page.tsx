'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Save, Loader2, Lock, Instagram, MapPin, Users, CreditCard,
  Sparkles, Shield, CheckCircle2, AtSign, Building, Hash, Globe,
  BadgeCheck, ExternalLink, Tag, X, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Check,
  RefreshCw
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'
import MobileOTPModal from '@/components/modals/MobileOTPModal'
import BrandLoader from '@/components/ui/BrandLoader'
import InstagramMediaGrid from '@/components/dashboard/InstagramMediaGrid'
import { extractInstagramUsername, getInstagramUrl } from '@/lib/instagram-utils'

interface UserProfile {
  id: string
  influencer_id: string
  full_name: string
  mobile: string
  email: string
  instagram_username: string
  instagram_profile_pic?: string
  gender: string
  category: string
  profile_strength: number
  account_name: string
  account_number: string
  ifsc_code: string
  state: string
  city: string
  followers: number
  created_at: string
  is_email_verified?: boolean
  is_mobile_verified?: boolean
}

const INFLUENCER_CATEGORIES = [
  'Fashion & Style',
  'Beauty & Skincare',
  'Fitness & Health',
  'Food & Cooking',
  'Travel & Adventure',
  'Tech & Gadgets',
  'Gaming',
  'Photography',
  'Art & Design',
  'Music & Dance',
  'Comedy & Entertainment',
  'Education & Learning',
  'Finance & Business',
  'Lifestyle & Vlogging',
  'Parenting & Family',
  'Pets & Animals',
  'Sports',
  'Automotive & Cars',
  'Home & Interior',
  'Motivational & Self-Help',
]

const STEPS = [
  {
    id: 1,
    title: 'Social & Creator Profile',
    shortTitle: '1. Social',
    subtitle: 'Identity & Niche',
    icon: AtSign,
  },
  {
    id: 2,
    title: 'Location Details',
    shortTitle: '2. Location',
    subtitle: 'State & City',
    icon: MapPin,
  },
  {
    id: 3,
    title: 'Bank & Payout Details',
    shortTitle: '3. Payout',
    subtitle: 'Bank Details',
    icon: CreditCard,
  },
  {
    id: 4,
    title: 'Instagram Feed & Stats',
    shortTitle: '4. Instagram Feed',
    subtitle: 'Media & Analytics',
    icon: Instagram,
  },
]

function computeProfileStrength(data: any): number {
  const fields = ['full_name', 'instagram_username', 'gender', 'category', 'state', 'city', 'followers', 'account_name', 'account_number', 'ifsc_code']
  let filled = 0
  for (const f of fields) {
    if (data[f] && String(data[f]).trim() !== '' && String(data[f]) !== '0') filled++
  }
  return Math.round((filled / fields.length) * 100)
}

export default function ProfilePage() {
  const { user: authUser, refreshUserProfile } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved' | 'error'>('idle')
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState(0)

  const isInitialLoaded = useRef(false)
  const lastSavedPayload = useRef<string>('')
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    instagram_username: '',
    instagram_profile_pic: '',
    gender: '',
    category: '',
    state: '',
    city: '',
    followers: 0,
    account_name: '',
    account_number: '',
    ifsc_code: '',
  })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/dashboard/profile')
      const data = await res.json()
      if (data.user) {
        setProfile(data.user)
        const savedCategory = data.user.category || ''
        const isCustom = savedCategory && !INFLUENCER_CATEGORIES.includes(savedCategory)
        setShowCustomCategory(isCustom)
        
        const initialForm = {
          full_name: data.user.full_name || '',
          instagram_username: data.user.instagram_username || '',
          instagram_profile_pic: data.user.instagram_profile_pic || '',
          gender: data.user.gender || '',
          category: savedCategory,
          state: data.user.state || '',
          city: data.user.city || '',
          followers: data.user.followers || 0,
          account_name: data.user.account_name || '',
          account_number: data.user.account_number || '',
          ifsc_code: data.user.ifsc_code || '',
        }
        setFormData(initialForm)
        
        const payload = {
          ...initialForm,
          instagram_username: extractInstagramUsername(initialForm.instagram_username)
        }
        lastSavedPayload.current = JSON.stringify(payload)
        isInitialLoaded.current = true
        setSaveStatus('saved')
      }
    } catch (err) {
      console.error('[ProfilePage] fetchProfile error:', err)
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  // Core save handler supporting both auto-save and manual triggers
  const performSave = async (dataToSave = formData, isAutoSave = false) => {
    const payload = {
      ...dataToSave,
      instagram_username: extractInstagramUsername(dataToSave.instagram_username)
    }
    const payloadStr = JSON.stringify(payload)

    // Skip network request if data hasn't changed from last saved state
    if (payloadStr === lastSavedPayload.current) {
      setSaveStatus('saved')
      return
    }

    setSaving(true)
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')
      
      lastSavedPayload.current = payloadStr
      setSaveStatus('saved')
      await refreshUserProfile()
      
      if (!isAutoSave) {
        toast.success('Profile updated successfully!')
      }
    } catch (err: unknown) {
      setSaveStatus('error')
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      if (!isAutoSave) {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleManualSave = () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    performSave(formData, false)
  }

  // Auto-Save Effect: 1500ms debounce when formData changes
  useEffect(() => {
    if (!isInitialLoaded.current) return

    const currentPayload = {
      ...formData,
      instagram_username: extractInstagramUsername(formData.instagram_username)
    }
    const currentStr = JSON.stringify(currentPayload)

    if (currentStr !== lastSavedPayload.current) {
      setSaveStatus('unsaved')
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
      autoSaveTimerRef.current = setTimeout(() => {
        performSave(formData, true)
      }, 1500)
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
      }
    }
  }, [formData])

  // Safeguard: warn if user closes tab while saving or with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveStatus === 'unsaved' || saveStatus === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [saveStatus])

  const goToStep = (stepNumber: number) => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
    }
    if (isInitialLoaded.current) {
      performSave(formData, true)
    }
    setDirection(stepNumber > currentStep ? 1 : -1)
    setCurrentStep(stepNumber)
  }

  const handleNextStep = () => {
    if (currentStep < STEPS.length) {
      goToStep(currentStep + 1)
    }
  }

  const handlePrevStep = () => {
    if (currentStep > 1) {
      goToStep(currentStep - 1)
    }
  }

  // Step Completion Logic
  const isStep1Complete = Boolean(
    formData.full_name.trim() &&
    formData.instagram_username.trim() &&
    formData.gender &&
    formData.category &&
    formData.followers > 0
  )

  const isStep2Complete = Boolean(formData.state && formData.city)

  const isStep3Complete = Boolean(
    formData.account_name.trim() &&
    formData.account_number.trim() &&
    formData.ifsc_code.trim()
  )

  const isStepComplete = (stepId: number) => {
    if (stepId === 1) return isStep1Complete
    if (stepId === 2) return isStep2Complete
    if (stepId === 3) return isStep3Complete
    if (stepId === 4) return Boolean(formData.instagram_username)
    return false
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  const strength = computeProfileStrength(formData)
  const strengthColor = strength >= 80 ? 'from-emerald-500 to-emerald-400' : strength >= 50 ? 'from-amber-500 to-amber-400' : 'from-red-500 to-rose-400'

  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 30 : -30,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 30 : -30,
      opacity: 0,
    }),
  }

  return (
    <div className="w-full flex-1 flex flex-col space-y-4">
      {/* ─── Top Compact Profile & Strength Header Bar ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 px-4 py-3 shadow-2xs flex flex-wrap items-center justify-between gap-3 shrink-0">
        {/* Left: User Avatar & Badges */}
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-base font-extrabold text-white shadow-sm border border-slate-200 overflow-hidden">
              {formData.instagram_profile_pic || profile?.instagram_profile_pic ? (
                <img
                  src={formData.instagram_profile_pic || profile?.instagram_profile_pic}
                  alt={formData.full_name || profile?.full_name || 'Creator Avatar'}
                  className="h-full w-full object-cover"
                />
              ) : (
                formData.full_name?.charAt(0)?.toUpperCase() || profile?.full_name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 border border-white">
              <CheckCircle2 className="h-2.5 w-2.5 text-white" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-charcoal-surface truncate">{profile?.full_name || 'Creator Profile'}</h2>
              <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-2 py-0.2 text-[10px] font-bold text-emerald-700 border border-emerald-200 shrink-0">
                <Shield className="h-2.5 w-2.5 text-emerald-600" />
                Verified
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-secondary mt-0.5">
              <span className="font-semibold text-slate-700">{profile?.influencer_id || 'ID Loading...'}</span>
              {profile?.created_at && (
                <>
                  <span>•</span>
                  <span>Member since {new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Group: Auto-Save Status, Profile Strength & Save Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live Auto-Save Status Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all shrink-0">
            {saveStatus === 'saving' ? (
              <span className="flex items-center gap-1.5 text-pink-600">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-[#f50057]" />
                <span>Auto-saving...</span>
              </span>
            ) : saveStatus === 'unsaved' ? (
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Unsaved changes...</span>
              </span>
            ) : saveStatus === 'error' ? (
              <span className="flex items-center gap-1.5 text-rose-700">
                <X className="h-3.5 w-3.5 text-rose-600" />
                <span>Save failed</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>All changes saved</span>
              </span>
            )}
          </div>

          {/* Profile Strength Bar */}
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-3.5 py-1.5 rounded-lg shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>Profile Strength:</span>
              <span className="text-emerald-600 font-extrabold">{strength}%</span>
            </div>
            <div className="w-24 sm:w-28 h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${strengthColor} transition-all duration-500`}
                style={{ width: `${strength}%` }}
              />
            </div>
          </div>

          {/* Quick Manual Save Button */}
          <Button
            onClick={handleManualSave}
            disabled={saving}
            className="h-9 px-4 sm:px-5 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Save className="mr-1.5 h-3.5 w-3.5" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ─── Modern Multi-Step Visual Stepper Header ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-3 sm:p-4 shadow-2xs">
        <div className="relative flex items-center justify-between gap-2 max-w-4xl mx-auto">
          {/* Connector Track Line behind nodes */}
          <div className="absolute left-6 right-6 top-5 -translate-y-1/2 h-0.5 bg-slate-200 z-0 hidden sm:block" />
          <div
            className="absolute left-6 top-5 -translate-y-1/2 h-0.5 bg-[#f50057] transition-all duration-500 z-0 hidden sm:block"
            style={{
              width: `calc(${((currentStep - 1) / (STEPS.length - 1)) * 100}% - 3rem)`,
            }}
          />

          {STEPS.map((step) => {
            const Icon = step.icon
            const isActive = currentStep === step.id
            const isDone = isStepComplete(step.id)

            return (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className="relative z-10 flex-1 flex flex-col items-center group cursor-pointer focus:outline-none"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-xs transition-all duration-300 ${
                    isActive
                      ? 'bg-[#f50057] text-white ring-4 ring-pink-100 shadow-md scale-105'
                      : isDone
                      ? 'bg-emerald-500 text-white shadow-xs hover:bg-emerald-600'
                      : 'bg-slate-100 text-slate-500 border border-slate-200 group-hover:bg-slate-200 group-hover:text-slate-700'
                  }`}
                >
                  {isDone && !isActive ? (
                    <Check className="h-5 w-5 text-white stroke-[3]" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>

                <div className="mt-2 text-center">
                  <p
                    className={`text-xs font-bold transition-colors ${
                      isActive
                        ? 'text-[#f50057]'
                        : isDone
                        ? 'text-slate-800 font-semibold'
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  >
                    {step.title}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium hidden md:block">{step.subtitle}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── Multi-Step Form Container ─── */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-2xs overflow-hidden flex flex-col min-h-[460px]">
        {/* Step Title Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f50057]/10 text-[#f50057] font-extrabold text-xs">
              {currentStep}
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                {STEPS[currentStep - 1].title}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {STEPS[currentStep - 1].subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-400">
              Step {currentStep} of {STEPS.length}
            </span>
            {isStepComplete(currentStep) ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="h-3 w-3 text-emerald-600" /> Complete
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                In Progress
              </span>
            )}
          </div>
        </div>

        {/* Step Body Content with Slide Animations */}
        <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between overflow-x-hidden">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentStep}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="w-full"
            >
              {/* STEP 1: Social & Creator Profile */}
              {currentStep === 1 && (
                <div className="space-y-4 max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.full_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all"
                          placeholder="Enter your full name"
                        />
                      </div>
                    </div>

                    {/* Instagram Username */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                        <span>Instagram Username</span>
                        <a
                          href="/api/auth/instagram/login"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 hover:text-pink-700 hover:underline transition-colors"
                        >
                          <Instagram className="h-3 w-3" />
                          {formData.instagram_username ? 'Re-sync Instagram' : 'Connect Instagram'}
                        </a>
                      </Label>
                      <div className="relative">
                        <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />
                        <Input
                          value={formData.instagram_username}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, instagram_username: e.target.value })}
                          onBlur={(e: React.FocusEvent<HTMLInputElement>) => setFormData({ ...formData, instagram_username: extractInstagramUsername(e.target.value) })}
                          placeholder="@username or profile link"
                          className="pl-9 pr-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all"
                        />
                        {formData.instagram_username && (
                          <a
                            href={getInstagramUrl(formData.instagram_username)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-pink-500 transition-colors p-0.5 cursor-pointer"
                            title="View Instagram Profile"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Gender */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Gender</Label>
                      <Select value={formData.gender || ""} onValueChange={(v) => setFormData({ ...formData, gender: v || '' })}>
                        <SelectTrigger className="bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus:ring-[#f50057] rounded-lg focus:bg-white transition-all">
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[200px]">
                          <SelectItem value="Male" className="text-xs py-2">Male</SelectItem>
                          <SelectItem value="Female" className="text-xs py-2">Female</SelectItem>
                          <SelectItem value="Other" className="text-xs py-2">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Email (Read-only) */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                        <span>Email Address</span>
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED
                        </span>
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input value={profile?.email || authUser?.email || ''} readOnly className="pl-9 bg-slate-100 border border-slate-200 text-slate-600 h-10 text-xs rounded-lg select-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Mobile */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">Mobile <Lock className="h-3 w-3 text-slate-400" /></span>
                        {profile?.is_mobile_verified === true ? (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED
                          </span>
                        ) : (
                          <button
                            onClick={() => setShowOTPModal(true)}
                            className="inline-flex items-center gap-0.5 rounded-full bg-pink-50 px-2 py-0.2 text-[9px] font-bold text-[#f50057] border border-pink-200 hover:bg-pink-100 transition-colors cursor-pointer"
                          >
                            <Shield className="h-2.5 w-2.5" /> VERIFY NOW
                          </button>
                        )}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-semibold">+91</span>
                        <Input value={profile?.mobile || authUser?.mobile || ''} readOnly className="pl-10 bg-slate-100 border border-slate-200 text-slate-600 h-10 text-xs rounded-lg select-none" />
                      </div>
                    </div>

                    {/* Followers Count */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Followers Count</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          type="number"
                          value={formData.followers === 0 ? '' : formData.followers}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, followers: parseInt(e.target.value) || 0 })}
                          placeholder="Enter Followers count"
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Category / Niche */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Influencer Category / Niche</Label>
                    {showCustomCategory ? (
                      <div className="relative">
                        <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#f50057]" />
                        <Input
                          value={formData.category}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, category: e.target.value })}
                          placeholder="Enter custom category"
                          className="pl-9 pr-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomCategory(false)
                            setFormData({ ...formData, category: '' })
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <Select
                        value={formData.category || ""}
                        onValueChange={(v) => {
                          if (v === '__custom__') {
                            setShowCustomCategory(true)
                            setFormData({ ...formData, category: '' })
                          } else {
                            setFormData({ ...formData, category: v || '' })
                          }
                        }}
                      >
                        <SelectTrigger className="bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus:ring-[#f50057] rounded-lg focus:bg-white transition-all">
                          <div className="flex items-center gap-2">
                            <Tag className="h-4 w-4 text-[#f50057]" />
                            <SelectValue placeholder="Select your primary niche" />
                          </div>
                        </SelectTrigger>
                        <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[220px]">
                          {INFLUENCER_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs py-2">
                              {cat}
                            </SelectItem>
                          ))}
                          <SelectItem value="__custom__" className="text-xs py-2 border-t border-slate-100 mt-1 font-semibold">
                            ✏️ Other — Enter custom category
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              )}

              {/* STEP 2: Location Details */}
              {currentStep === 2 && (
                <div className="space-y-5 max-w-2xl mx-auto">
                  <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider">Location Target Matching</h4>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        Brands match campaigns based on your state and city location. Providing accurate details increases relevant campaign opportunities!
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* State */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">State</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(v) => setFormData({ ...formData, state: v || '', city: '' })}
                      >
                        <SelectTrigger className="bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus:ring-[#f50057] rounded-lg focus:bg-white transition-all">
                          <SelectValue placeholder="Select State" />
                        </SelectTrigger>
                        <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[220px]">
                          {STATES.map((state) => (
                            <SelectItem key={state} value={state} className="text-xs py-2">
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* City */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">City</Label>
                      <Select
                        value={formData.city}
                        onValueChange={(v) => setFormData({ ...formData, city: v || '' })}
                        disabled={!formData.state}
                      >
                        <SelectTrigger className="bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus:ring-[#f50057] rounded-lg disabled:opacity-50 focus:bg-white transition-all">
                          <SelectValue placeholder={formData.state ? "Select City" : "Select state first"} />
                        </SelectTrigger>
                        <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[220px]">
                          {formData.state && INDIA_DATA[formData.state]?.map((city) => (
                            <SelectItem key={city} value={city} className="text-xs py-2">
                              {city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {formData.state && formData.city && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-semibold">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Selected Location: <strong className="text-emerald-950">{formData.city}, {formData.state}</strong>
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">Ready</span>
                    </div>
                  )}
                </div>
              )}

              {/* STEP 3: Bank & Payout Details */}
              {currentStep === 3 && (
                <div className="space-y-5 max-w-2xl mx-auto">
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-xl p-4 flex items-start gap-3">
                    <Shield className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-extrabold text-emerald-950 uppercase tracking-wider">Encrypted Payout Account</h4>
                      <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                        Your banking information is securely stored for direct payments upon completing brand campaigns.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Account Name */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Account Holder Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.account_name}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_name: e.target.value })}
                          placeholder="Name as per bank records"
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* Account Number */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">Account Number</Label>
                      <div className="relative">
                        <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.account_number}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_number: e.target.value })}
                          placeholder="Enter your bank account number"
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all"
                        />
                      </div>
                    </div>

                    {/* IFSC Code */}
                    <div className="space-y-1.5">
                      <Label className="text-slate-700 text-xs font-bold uppercase tracking-wider">IFSC Code</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          value={formData.ifsc_code}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ifsc_code: e.target.value })}
                          placeholder="e.g. SBIN0001234"
                          className="pl-9 bg-slate-50/50 border border-slate-200 text-slate-900 h-10 text-xs focus-visible:ring-[#f50057] rounded-lg placeholder:text-slate-400 focus:bg-white transition-all uppercase"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4: Instagram Feed & Analytics */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <InstagramMediaGrid />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Step Control Actions */}
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3 shrink-0">
          <div>
            {currentStep > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handlePrevStep}
                className="h-9 px-4 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Previous Step
              </Button>
            ) : (
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">
                Complete Step 1 to proceed with location & payout details.
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <span className="text-[11px] text-[#f50057] font-bold flex items-center gap-1 mr-2 animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" /> Auto-saving...
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1 mr-2 hidden sm:flex">
                <Check className="h-3 w-3" /> Auto-saved
              </span>
            )}

            <Button
              type="button"
              onClick={handleManualSave}
              disabled={saving}
              variant="outline"
              className="h-9 px-4 text-xs font-bold text-slate-700 border-slate-200 hover:bg-slate-100 rounded-lg transition-all cursor-pointer hidden sm:flex"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
              Save Draft
            </Button>

            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNextStep}
                className="h-9 px-5 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer"
              >
                Next Step
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleManualSave}
                disabled={saving}
                className="h-9 px-6 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save & Finish Profile
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile OTP Verification Modal */}
      <MobileOTPModal
        isOpen={showOTPModal}
        onClose={() => setShowOTPModal(false)}
        onVerified={async () => {
          await fetchProfile()
          await refreshUserProfile()
        }}
        mobile={profile?.mobile || authUser?.mobile || ''}
      />
    </div>
  )
}
