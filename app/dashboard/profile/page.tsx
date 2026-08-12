'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User, Save, Loader2, Lock, Instagram, MapPin, Users, CreditCard,
  Sparkles, Shield, CheckCircle2, AtSign, Building, Hash, Globe,
  BadgeCheck, ExternalLink, Tag, X, ChevronRight, ArrowLeft
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
      console.log('[ProfilePage] fetchProfile() called')
      const res = await fetch('/api/dashboard/profile')
      console.log('[ProfilePage] /api/dashboard/profile response status:', res.status)
      const data = await res.json()
      console.log('[ProfilePage] /api/dashboard/profile response body:', JSON.stringify(data, null, 2))
      if (data.user) {
        console.log('[ProfilePage] User data received:', {
          id: data.user.id,
          full_name: data.user.full_name,
          instagram_username: data.user.instagram_username,
          instagram_profile_pic: data.user.instagram_profile_pic,
          followers: data.user.followers,
          email: data.user.email,
        })
        setProfile(data.user)
        const savedCategory = data.user.category || ''
        const isCustom = savedCategory && !INFLUENCER_CATEGORIES.includes(savedCategory)
        setShowCustomCategory(isCustom)
        setFormData(prev => ({
          ...prev,
          full_name: data.user.full_name || prev.full_name || '',
          instagram_username: data.user.instagram_username || prev.instagram_username || '',
          instagram_profile_pic: data.user.instagram_profile_pic || prev.instagram_profile_pic || '',
          gender: data.user.gender || prev.gender || '',
          category: savedCategory,
          state: data.user.state || '',
          city: data.user.city || '',
          followers: data.user.followers || 0,
          account_name: data.user.account_name || '',
          account_number: data.user.account_number || '',
          ifsc_code: data.user.ifsc_code || '',
        }))
      } else {
        console.warn('[ProfilePage] No user data in response! data:', data)
      }
    } catch (err) {
      console.error('[ProfilePage] fetchProfile error:', err)
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
    <div className="w-full flex-1 flex flex-col space-y-3.5">
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

        {/* Center: Compact Strength Progress Bar */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/60 px-3.5 py-1.5 rounded-lg shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Profile Strength:</span>
            <span className="text-emerald-600 font-extrabold">{strength}%</span>
          </div>
          <div className="w-28 h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${strengthColor} transition-all duration-500`}
              style={{ width: `${strength}%` }}
            />
          </div>
        </div>

        {/* Right: Quick Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-5 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all cursor-pointer shrink-0"
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

      {/* ─── Main 2-Column All-in-One Layout ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 flex-1 items-start">
        {/* Left Column (Identity & Socials - 7/12 width) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-border-subtle shadow-2xs overflow-hidden flex flex-col h-full">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-slate-50/80 shrink-0">
            <AtSign className="h-4 w-4 text-[#f50057]" />
            <h3 className="text-xs font-extrabold text-charcoal-surface uppercase tracking-wider">1. Social & Creator Profile</h3>
          </div>
          
          <div className="p-4 sm:p-5 space-y-3.5 flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Full Name */}
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
                  <Input
                    value={formData.full_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                    className="pl-9 bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              {/* Instagram Username & Connect OAuth */}
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Instagram Username</span>
                  <a
                    href="/api/auth/instagram/login"
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-pink-600 hover:text-pink-700 hover:underline transition-colors"
                  >
                    <Instagram className="h-3 w-3" />
                    {formData.instagram_username ? 'Re-sync Instagram' : 'Connect Instagram'}
                  </a>
                </Label>
                <div className="relative group">
                  <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-pink-500" />
                  <Input
                    value={formData.instagram_username}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, instagram_username: e.target.value })}
                    placeholder="@username"
                    className="pl-9 pr-9 bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                  {formData.instagram_username && (
                    <a
                      href={`https://www.instagram.com/${formData.instagram_username.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-pink-500 transition-colors p-0.5 cursor-pointer"
                      title="View Instagram Profile"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Gender */}
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">Gender</Label>
                <Select value={formData.gender || ""} onValueChange={(v) => setFormData({ ...formData, gender: v || '' })}>
                  <SelectTrigger className="bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus:ring-primary-container rounded-md focus:bg-white transition-all">
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
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span>Email Address</span>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED
                  </span>
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
                  <Input value={profile?.email || authUser?.email || ''} readOnly className="pl-9 bg-slate-100 border border-slate-200 text-secondary h-9 text-xs rounded-md select-none" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Mobile */}
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">Mobile <Lock className="h-3 w-3 text-secondary" /></span>
                  {profile?.is_mobile_verified === true ? (
                    <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.2 text-[9px] font-bold text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED
                    </span>
                  ) : (
                    <button
                      onClick={() => setShowOTPModal(true)}
                      className="inline-flex items-center gap-0.5 rounded-full bg-primary-container/20 px-2 py-0.2 text-[9px] font-bold text-primary border border-primary-container/30 hover:bg-primary-container/30 transition-colors cursor-pointer"
                    >
                      <Shield className="h-2.5 w-2.5" /> VERIFY NOW
                    </button>
                  )}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-secondary font-semibold">+91</span>
                  <Input value={profile?.mobile || authUser?.mobile || ''} readOnly className="pl-10 bg-slate-100 border border-slate-200 text-secondary h-9 text-xs rounded-md select-none" />
                </div>
              </div>

              {/* Followers */}
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">Followers Count</Label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
                  <Input
                    type="number"
                    value={formData.followers === 0 ? '' : formData.followers}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, followers: parseInt(e.target.value) || 0 })}
                    placeholder="Enter Followers count"
                    className="pl-9 bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Category / Niche */}
            <div className="space-y-1 pt-1">
              <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">Influencer Category / Niche</Label>
              {showCustomCategory ? (
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-primary" />
                  <Input
                    value={formData.category}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Enter custom category"
                    className="pl-9 pr-9 bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomCategory(false)
                      setFormData({ ...formData, category: '' })
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-red-500 transition-colors cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
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
                  <SelectTrigger className="bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus:ring-primary-container rounded-md focus:bg-white transition-all">
                    <div className="flex items-center gap-2">
                      <Tag className="h-3.5 w-3.5 text-primary" />
                      <SelectValue placeholder="Select your niche" />
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
        </div>

        {/* Right Column (Location & Payouts - 5/12 width) */}
        <div className="lg:col-span-5 space-y-3.5 flex flex-col h-full">
          {/* Card 1: Location Details */}
          <div className="bg-white rounded-xl border border-border-subtle shadow-2xs overflow-hidden flex flex-col shrink-0">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-slate-50/80">
              <MapPin className="h-4 w-4 text-amber-500" />
              <h3 className="text-xs font-extrabold text-charcoal-surface uppercase tracking-wider">2. Location Details</h3>
            </div>
            <div className="p-4 sm:p-5 space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* State */}
                <div className="space-y-1">
                  <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">State</Label>
                  <Select
                    value={formData.state}
                    onValueChange={(v) => setFormData({ ...formData, state: v || '', city: '' })}
                  >
                    <SelectTrigger className="bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus:ring-primary-container rounded-md focus:bg-white transition-all">
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
                <div className="space-y-1">
                  <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">City</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(v) => setFormData({ ...formData, city: v || '' })}
                    disabled={!formData.state}
                  >
                    <SelectTrigger className="bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus:ring-primary-container rounded-md disabled:opacity-50 focus:bg-white transition-all">
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
            </div>
          </div>

          {/* Card 2: Bank & Payout Details */}
          <div className="bg-white rounded-xl border border-border-subtle shadow-2xs overflow-hidden flex flex-col flex-1">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border-subtle bg-slate-50/80 shrink-0">
              <CreditCard className="h-4 w-4 text-emerald-500" />
              <h3 className="text-xs font-extrabold text-charcoal-surface uppercase tracking-wider">3. Bank & Payout Details</h3>
            </div>
            <div className="p-4 sm:p-5 space-y-3.5 flex-1">
              {/* Account Name */}
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">Account Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
                  <Input
                    value={formData.account_name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_name: e.target.value })}
                    placeholder="Enter Account Holder Name"
                    className="pl-9 bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Account Number */}
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">Account Number</Label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
                  <Input
                    value={formData.account_number}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_number: e.target.value })}
                    placeholder="Enter Bank Account Number"
                    className="pl-9 bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* IFSC Code */}
              <div className="space-y-1">
                <Label className="text-secondary text-[11px] font-semibold uppercase tracking-wider">IFSC Code</Label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary" />
                  <Input
                    value={formData.ifsc_code}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ifsc_code: e.target.value })}
                    placeholder="e.g. SBIN0001234"
                    className="pl-9 bg-slate-50/40 border border-slate-200 text-slate-900 h-9 text-xs focus-visible:ring-primary-container rounded-md placeholder:text-slate-400 focus:bg-white transition-all uppercase"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Instagram Media Grid & Engagement Analytics Widget ─── */}
      <InstagramMediaGrid />

      {/* ─── Bottom Action Bar ─── */}
      <div className="bg-white rounded-xl border border-border-subtle p-3 shadow-2xs flex items-center justify-between shrink-0">
        <p className="text-xs text-secondary font-medium hidden sm:block">
          ✨ Keep your profile updated for better brand collaboration matching and quick payouts.
        </p>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="h-9 px-6 bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50 ml-auto"
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
