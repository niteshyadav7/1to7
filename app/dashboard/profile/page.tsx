'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User, Save, Loader2, Lock, Instagram, MapPin, Users, CreditCard,
  Sparkles, Shield, CheckCircle2, AtSign, Building, Hash, Globe,
  BadgeCheck, ExternalLink, Tag, X
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

interface UserProfile {
  id: string
  influencer_id: string
  full_name: string
  mobile: string
  email: string
  instagram_username: string
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
  const [showOTPModal, setShowOTPModal] = useState(false)
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    full_name: (authUser?.full_name as string) || '',
    instagram_username: (authUser?.instagram_username as string) || '',
    gender: (authUser?.gender as string) || '',
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
        setFormData(prev => ({
          ...prev,
          full_name: data.user.full_name || prev.full_name,
          instagram_username: data.user.instagram_username || prev.instagram_username,
          gender: data.user.gender || prev.gender,
          category: savedCategory,
          state: data.user.state || '',
          city: data.user.city || '',
          followers: data.user.followers || 0,
          account_name: data.user.account_name || '',
          account_number: data.user.account_number || '',
          ifsc_code: data.user.ifsc_code || '',
        }))
      }
    } catch {
      toast.error('Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      await refreshUserProfile()
      toast.success('Profile updated successfully!')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update profile'
      toast.error(message)
    } finally {
      setSaving(false)
    }
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
  const strengthLabel = strength >= 80 ? 'Excellent' : strength >= 50 ? 'Good — keep going!' : 'Needs attention'

  return (
    <div className="space-y-5 w-full pb-8">
      {/* Page Header */}
      <div>
        <p className="text-sm text-secondary mt-1">Manage your creator profile and payout details</p>
      </div>

      {/* ─── Hero Profile Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-md overflow-hidden border border-border-subtle shadow-sm"
      >
        {/* Gradient Banner using Vibrant Influence primary and tertiary */}
        <div className="h-28 bg-gradient-to-r from-primary-container to-tertiary" />

        {/* Avatar + Info */}
        <div className="bg-white rounded-b-md px-6 pb-6 pt-0 -mt-px">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-md bg-primary-container text-3xl font-bold text-black shadow-lg border-4 border-white">
                {formData.full_name?.charAt(0)?.toUpperCase() || profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-white">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left pb-1">
              <h2 className="text-xl font-bold text-charcoal-surface">{profile?.full_name || 'Creator'}</h2>
              <div className="flex items-center gap-2 mt-1.5 justify-center sm:justify-start flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-800 border border-slate-200">
                  <BadgeCheck className="h-3 w-3 text-secondary" />
                  {profile?.influencer_id}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <Shield className="h-3 w-3 text-emerald-600" />
                  Verified
                </span>
              </div>
            </div>
            <div className="text-center sm:text-right pb-1">
              <p className="text-xs text-secondary">Member since</p>
              <p className="text-sm font-semibold text-charcoal-surface">
                {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' }) : '—'}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Profile Strength ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="rounded-md border border-border-subtle bg-white p-5 shadow-sm"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold text-charcoal-surface">Profile Strength</span>
          </div>
          <span className="text-sm font-bold text-charcoal-surface">{strength}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strength}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${strengthColor}`}
          />
        </div>
        <p className="text-xs text-secondary mt-2">
          {strengthLabel} — Complete your profile for better campaign matching.
        </p>
      </motion.div>

      {/* ─── Step Progress Indicator ─── */}
      <div className="rounded-md border border-border-subtle bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          {/* Step 1 */}
          <button
            type="button"
            onClick={() => setCurrentStep(1)}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-md font-bold text-xs transition-all ${currentStep === 1
                ? 'bg-[#f50057] text-white shadow-sm'
                : currentStep > 1
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-450 border border-slate-200'
              }`}>
              {currentStep > 1 ? <CheckCircle2 className="h-4 w-4" /> : '1'}
            </div>
            <span className={`text-xs font-bold transition-all ${currentStep === 1 ? 'text-[#f50057]' : 'text-secondary group-hover:text-charcoal-surface'}`}>Socials</span>
          </button>

          {/* Line 1 -> 2 */}
          <div className={`flex-1 h-0.5 mx-4 rounded-full transition-all ${currentStep > 1 ? 'bg-emerald-500' : 'bg-slate-100'}`} />

          {/* Step 2 */}
          <button
            type="button"
            onClick={() => setCurrentStep(2)}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-md font-bold text-xs transition-all ${currentStep === 2
                ? 'bg-[#f50057] text-white shadow-sm'
                : currentStep > 2
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-450 border border-slate-200'
              }`}>
              {currentStep > 2 ? <CheckCircle2 className="h-4 w-4" /> : '2'}
            </div>
            <span className={`text-xs font-bold transition-all ${currentStep === 2 ? 'text-[#f50057]' : 'text-secondary group-hover:text-charcoal-surface'}`}>Location</span>
          </button>

          {/* Line 2 -> 3 */}
          <div className={`flex-1 h-0.5 mx-4 rounded-full transition-all ${currentStep > 2 ? 'bg-emerald-500' : 'bg-slate-100'}`} />

          {/* Step 3 */}
          <button
            type="button"
            onClick={() => setCurrentStep(3)}
            className="flex items-center gap-2 group cursor-pointer focus:outline-none"
          >
            <div className={`flex h-8 w-8 items-center justify-center rounded-md font-bold text-xs transition-all ${currentStep === 3
                ? 'bg-[#f50057] text-white shadow-sm'
                : 'bg-slate-100 text-slate-450 border border-slate-200'
              }`}>
              3
            </div>
            <span className={`text-xs font-bold transition-all ${currentStep === 3 ? 'text-[#f50057]' : 'text-secondary group-hover:text-charcoal-surface'}`}>Bank Details</span>
          </button>
        </div>
      </div>

      {/* ─── Step 1: Social & Demographics ─── */}
      {currentStep === 1 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-md border border-border-subtle bg-white overflow-hidden shadow-sm"
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border-subtle bg-slate-50">
            <AtSign className="h-4 w-4 text-[#f50057]" />
            <h3 className="text-sm font-bold text-charcoal-surface">Social & Demographics</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                  <Input
                    value={formData.full_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                    className="pl-10 bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                    placeholder="Your full name"
                  />
                </div>
              </div>
              {/* Instagram */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">Instagram Username</Label>
                <div className="relative group">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500" />
                  <Input
                    value={formData.instagram_username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, instagram_username: e.target.value })}
                    placeholder="@username"
                    className="pl-10 pr-10 bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                  {formData.instagram_username && (
                    <a
                      href={`https://www.instagram.com/${formData.instagram_username.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-pink-500 transition-colors p-1 cursor-pointer"
                      title="View Instagram Profile"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            </div>
            {/* Instagram link hint */}
            <p className="text-xs text-secondary flex items-center gap-1.5 -mt-2">
              <Globe className="h-3 w-3 text-secondary" />
              Link: https://www.instagram.com/{formData.instagram_username || 'username'}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Gender */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">Gender</Label>
                <Select value={formData.gender || ""} onValueChange={(v) => setFormData({ ...formData, gender: v || '' })}>
                  <SelectTrigger className="bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus:ring-primary-container rounded-md focus:bg-white transition-all">
                    <SelectValue placeholder="Select Gender" />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[300px]">
                    <SelectItem value="Male" className="focus:bg-primary-container/20 focus:text-black cursor-pointer py-2.5">Male</SelectItem>
                    <SelectItem value="Female" className="focus:bg-primary-container/20 focus:text-black cursor-pointer py-2.5">Female</SelectItem>
                    <SelectItem value="Other" className="focus:bg-primary-container/20 focus:text-black cursor-pointer py-2.5">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {/* Email (read-only) */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                  Email
                  <span className="inline-flex items-center gap-0.5 ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED
                  </span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                  <Input value={profile?.email || authUser?.email || ''} readOnly className="pl-10 bg-slate-100 border border-slate-200 text-secondary h-11 text-sm rounded-md select-none" />
                </div>
              </div>
            </div>

            {/* Category / Niche */}
            <div className="space-y-1.5">
              <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">Influencer Category / Niche</Label>
              {showCustomCategory ? (
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input
                    value={formData.category}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter your custom category"
                    className="pl-10 pr-10 bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomCategory(false)
                      setFormData({ ...formData, category: '' })
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-red-500 transition-colors cursor-pointer"
                    title="Back to dropdown"
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
                  <SelectTrigger className="bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus:ring-primary-container rounded-md focus:bg-white transition-all">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4 text-primary" />
                      <SelectValue placeholder="Select your niche" />
                    </div>
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[300px]">
                    {INFLUENCER_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="focus:bg-primary-container/20 focus:text-black cursor-pointer py-2.5">
                        {cat}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="focus:bg-primary-container/20 focus:text-black cursor-pointer py-2.5 border-t border-slate-100 mt-1">
                      ✏️ Other — Enter custom category
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
              <p className="text-xs text-secondary">Choose the niche that best describes your content, or add your own.</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Step 2: Location & Personal ─── */}
      {currentStep === 2 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-md border border-border-subtle bg-white overflow-hidden shadow-sm"
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border-subtle bg-slate-50">
            <MapPin className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-bold text-charcoal-surface">Location & Personal</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Mobile (read-only) */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider flex items-center gap-1">
                  Mobile
                  <Lock className="h-3 w-3 ml-0.5 text-secondary" />
                  {profile?.is_mobile_verified === true ? (
                    <span className="inline-flex items-center gap-0.5 ml-auto rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowOTPModal(true)}
                      className="inline-flex items-center gap-1 ml-auto rounded-full bg-primary-container/20 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary-container/30 hover:bg-primary-container/30 transition-colors cursor-pointer"
                    >
                      <Shield className="h-2.5 w-2.5" /> VERIFY NOW
                    </button>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-secondary font-semibold">+91</span>
                  <Input value={profile?.mobile || authUser?.mobile || ''} readOnly className="pl-11 bg-slate-100 border border-slate-200 text-secondary h-11 text-sm rounded-md select-none" />
                </div>
              </div>
              {/* Followers */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">Followers</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                  <Input
                    type="number"
                    value={formData.followers === 0 ? '' : formData.followers}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, followers: parseInt(e.target.value) || 0 })}
                    placeholder="Enter Followers"
                    className="pl-10 bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* State */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">State</Label>
                <Select
                  value={formData.state}
                  onValueChange={(v) => setFormData({ ...formData, state: v || '', city: '' })}
                >
                  <SelectTrigger className="bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus:ring-primary-container rounded-md focus:bg-white transition-all">
                    <SelectValue placeholder="Select State" />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[300px]">
                    {STATES.map((state) => (
                      <SelectItem key={state} value={state} className="focus:bg-primary-container/20 focus:text-black cursor-pointer py-2 text-xs">
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* City */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">City</Label>
                <Select
                  value={formData.city}
                  onValueChange={(v) => setFormData({ ...formData, city: v || '' })}
                  disabled={!formData.state}
                >
                  <SelectTrigger className="bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus:ring-primary-container rounded-md disabled:opacity-50 focus:bg-white transition-all">
                    <SelectValue placeholder={formData.state ? "Select City" : "Select state first"} />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-white border border-slate-200 text-slate-900 shadow-xl max-h-[300px]">
                    {formData.state && INDIA_DATA[formData.state]?.map((city) => (
                      <SelectItem key={city} value={city} className="focus:bg-primary-container/20 focus:text-black cursor-pointer py-2 text-xs">
                        {city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Step 3: Banking Details ─── */}
      {currentStep === 3 && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-md border border-border-subtle bg-white overflow-hidden shadow-sm"
        >
          <div className="flex items-center gap-2 px-6 py-4 border-b border-border-subtle bg-slate-50">
            <CreditCard className="h-4 w-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-charcoal-surface">Banking Details</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Account Name */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">Account Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                  <Input
                    value={formData.account_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_name: e.target.value })}
                    placeholder="Enter Account Name"
                    className="pl-10 bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
              {/* Account Number */}
              <div className="space-y-1.5">
                <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">Account Number</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                  <Input
                    value={formData.account_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Enter Account Number"
                    className="pl-10 bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>
            {/* IFSC */}
            <div className="mt-5 max-w-md space-y-1.5">
              <Label className="text-secondary text-xs font-semibold uppercase tracking-wider">IFSC Code</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary" />
                <Input
                  value={formData.ifsc_code}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ifsc_code: e.target.value })}
                  placeholder="e.g. SBIN0001234"
                  className="pl-10 bg-slate-50/40 border border-slate-200 text-slate-900 h-11 text-sm focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all uppercase"
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Wizard Footer Navigation Buttons ─── */}
      <div className="flex items-center justify-between gap-4 mt-5">
        {currentStep > 1 ? (
          <Button
            type="button"
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-6 h-11 border border-slate-200 bg-white text-secondary hover:bg-slate-50 hover:text-charcoal-surface font-bold text-xs rounded-md shadow-sm transition-all cursor-pointer"
          >
            Back
          </Button>
        ) : (
          <div /> // Spacer
        )}

        {currentStep < 3 ? (
          <Button
            type="button"
            onClick={() => setCurrentStep(prev => prev + 1)}
            className="px-6 h-11 bg-[#f50057] hover:bg-[#d8004c] text-white font-bold text-xs rounded-md shadow-md transition-all cursor-pointer"
          >
            Next Step
          </Button>
        ) : (
          <Button
            onClick={handleSave}
            disabled={saving}
            className="px-6 h-11 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs uppercase tracking-wider rounded-md shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Profile Changes
              </>
            )}
          </Button>
        )}
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
