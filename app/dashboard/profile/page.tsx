'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User, Save, Loader2, Lock, Instagram, MapPin, Users, CreditCard,
  Sparkles, Shield, CheckCircle2, AtSign, Building, Hash, Globe,
  BadgeCheck, ExternalLink
} from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { STATES, INDIA_DATA } from '@/lib/constants/india-data'

interface UserProfile {
  id: string
  influencer_id: string
  full_name: string
  mobile: string
  email: string
  instagram_username: string
  gender: string
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

function computeProfileStrength(data: any): number {
  const fields = ['full_name', 'instagram_username', 'gender', 'state', 'city', 'followers', 'account_name', 'account_number', 'ifsc_code']
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
  const [formData, setFormData] = useState({
    full_name: (authUser?.full_name as string) || '',
    instagram_username: (authUser?.instagram_username as string) || '',
    gender: (authUser?.gender as string) || '',
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
        setFormData(prev => ({
          ...prev,
          full_name: data.user.full_name || prev.full_name,
          instagram_username: data.user.instagram_username || prev.instagram_username,
          gender: data.user.gender || prev.gender,
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
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
      </div>
    )
  }

  const strength = computeProfileStrength(formData)
  const strengthColor = strength >= 80 ? 'from-emerald-500 to-green-400' : strength >= 50 ? 'from-amber-500 to-orange-400' : 'from-red-500 to-rose-400'
  const strengthLabel = strength >= 80 ? 'Excellent' : strength >= 50 ? 'Good — keep going!' : 'Needs attention'

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Profile</h1>
        <p className="text-sm text-slate-400 mt-1">Manage your creator profile and payout details</p>
      </div>

      {/* ─── Hero Profile Card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-2xl overflow-hidden"
      >
        {/* Gradient Banner */}
        <div className="h-28 bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500" />

        {/* Avatar + Info */}
        <div className="bg-slate-900/90 backdrop-blur-xl border border-white/5 rounded-b-2xl px-6 pb-6 pt-0 -mt-px">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-10">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 text-3xl font-bold text-white shadow-2xl shadow-purple-500/30 border-4 border-slate-900">
                {formData.full_name?.charAt(0)?.toUpperCase() || profile?.full_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 border-2 border-slate-900">
                <CheckCircle2 className="h-3.5 w-3.5 text-white" />
              </div>
            </div>
            <div className="flex-1 text-center sm:text-left pb-1">
              <h2 className="text-xl font-bold text-white">{profile?.full_name || 'Creator'}</h2>
              <div className="flex items-center gap-2 mt-1.5 justify-center sm:justify-start flex-wrap">
                <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2.5 py-0.5 text-xs font-medium text-purple-300 border border-purple-500/20">
                  <BadgeCheck className="h-3 w-3" />
                  {profile?.influencer_id}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-500/20">
                  <Shield className="h-3 w-3" />
                  Verified
                </span>
              </div>
            </div>
            <div className="text-center sm:text-right pb-1">
              <p className="text-xs text-slate-500">Member since</p>
              <p className="text-sm font-medium text-slate-300">
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
        className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <span className="text-sm font-semibold text-white">Profile Strength</span>
          </div>
          <span className="text-sm font-bold text-white">{strength}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strength}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full bg-gradient-to-r ${strengthColor}`}
          />
        </div>
        <p className="text-xs text-slate-400 mt-2">
          {strengthLabel} — Complete your profile for better campaign matching.
        </p>
      </motion.div>

      {/* ─── Section: Social & Demographics ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden"
      >
        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-cyan-500/5 to-transparent">
          <AtSign className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Social & Demographics</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={formData.full_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, full_name: e.target.value })}
                  className="pl-10 bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-purple-500 rounded-xl"
                  placeholder="Your full name"
                />
              </div>
            </div>
            {/* Instagram */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Instagram Username</Label>
              <div className="relative group">
                <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-400" />
                <Input
                  value={formData.instagram_username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, instagram_username: e.target.value })}
                  placeholder="@username"
                  className="pl-10 pr-10 bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-purple-500 rounded-xl"
                />
                {formData.instagram_username && (
                  <a
                    href={`https://www.instagram.com/${formData.instagram_username.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-pink-400 transition-colors p-1 cursor-pointer"
                    title="View Instagram Profile"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
          {/* Instagram link hint */}
          <p className="text-xs text-slate-500 flex items-center gap-1.5 -mt-2">
            <Globe className="h-3 w-3" />
            Link: https://www.instagram.com/{formData.instagram_username || 'username'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Gender */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Gender</Label>
              <Select value={formData.gender || ""} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-purple-500 rounded-xl">
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                  <SelectItem value="Male" className="focus:bg-purple-500/30 focus:text-white cursor-pointer py-2.5">Male</SelectItem>
                  <SelectItem value="Female" className="focus:bg-purple-500/30 focus:text-white cursor-pointer py-2.5">Female</SelectItem>
                  <SelectItem value="Other" className="focus:bg-purple-500/30 focus:text-white cursor-pointer py-2.5">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                Email
                {profile?.is_email_verified !== false ? (
                  <span className="inline-flex items-center gap-0.5 ml-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">
                    <CheckCircle2 className="h-2.5 w-2.5" /> VERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 ml-1 rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-500/20">
                    UNVERIFIED
                  </span>
                )}
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input value={profile?.email || authUser?.email || ''} readOnly className="pl-10 bg-slate-950/50 border-white/10 text-white h-11 text-sm rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Section: Banking Details ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden"
      >
        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-500/5 to-transparent">
          <CreditCard className="h-4 w-4 text-emerald-400" />
          <h3 className="text-sm font-semibold text-white">Banking Details</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Account Name */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Account Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={formData.account_name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_name: e.target.value })}
                  placeholder="Enter Account Name"
                  className="pl-10 bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-purple-500 rounded-xl"
                />
              </div>
            </div>
            {/* Account Number */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Account Number</Label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={formData.account_number}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, account_number: e.target.value })}
                  placeholder="Enter Account Number"
                  className="pl-10 bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-purple-500 rounded-xl"
                />
              </div>
            </div>
          </div>
          {/* IFSC */}
          <div className="mt-5 max-w-md space-y-1.5">
            <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">IFSC Code</Label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                value={formData.ifsc_code}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, ifsc_code: e.target.value })}
                placeholder="e.g. SBIN0001234"
                className="pl-10 bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-purple-500 rounded-xl uppercase"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Section: Location & Personal ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden"
      >
        <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent">
          <MapPin className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Location & Personal</h3>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Mobile (read-only) */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                Mobile
                <Lock className="h-3 w-3 ml-0.5 text-slate-600" />
                {profile?.is_mobile_verified !== false ? (
                  <span className="inline-flex items-center gap-0.5 ml-auto rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300 border border-emerald-500/20">
                    VERIFIED
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-0.5 ml-auto rounded-full bg-slate-500/15 px-1.5 py-0.5 text-[10px] font-bold text-slate-400 border border-slate-500/20">
                    UNVERIFIED
                  </span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-300 font-medium">+91</span>
                <Input value={profile?.mobile || authUser?.mobile || ''} readOnly className="pl-11 bg-slate-950/50 border-white/10 text-white h-11 text-sm rounded-xl" />
              </div>
            </div>
            {/* Followers */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Followers</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="number"
                  value={formData.followers === 0 ? '' : formData.followers}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, followers: parseInt(e.target.value) || 0 })}
                  placeholder="Enter Followers"
                  className="pl-10 bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-purple-500 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* State */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">State</Label>
              <Select
                value={formData.state}
                onValueChange={(v) => setFormData({ ...formData, state: v, city: '' })}
              >
                <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-purple-500 rounded-xl">
                  <SelectValue placeholder="Select State" />
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50 max-h-[300px]">
                  {STATES.map((state) => (
                    <SelectItem key={state} value={state} className="focus:bg-purple-500/30 focus:text-white cursor-pointer py-2 text-xs">
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* City */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">City</Label>
              <Select
                value={formData.city}
                onValueChange={(v) => setFormData({ ...formData, city: v })}
                disabled={!formData.state}
              >
                <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-purple-500 rounded-xl disabled:opacity-50">
                  <SelectValue placeholder={formData.state ? "Select City" : "Select state first"} />
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50 max-h-[300px]">
                  {formData.state && INDIA_DATA[formData.state]?.map((city) => (
                    <SelectItem key={city} value={city} className="focus:bg-purple-500/30 focus:text-white cursor-pointer py-2 text-xs">
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ─── Save Button ─── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-pink-500 hover:from-purple-500 hover:via-fuchsia-400 hover:to-pink-400 text-white font-semibold text-sm shadow-xl shadow-purple-500/20 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Profile Changes
            </>
          )}
        </Button>
      </motion.div>
    </div>
  )
}
