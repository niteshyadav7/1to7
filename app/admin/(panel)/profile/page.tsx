'use client'

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  User,
  Phone,
  Mail,
  Shield,
  ShieldCheck,
  Sparkles,
  Save,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  Calendar,
  Clock,
  ArrowRight,
  ExternalLink,
  MessageCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import BrandLoader from '@/components/ui/BrandLoader'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string
  role: string
  roleDisplayName: string
  avatarUrl: string | null
  approvalStatus: string
  lastLogin?: string
  createdAt?: string
  assignedCampaignsCount: number
}

interface AssignedCampaign {
  id: string
  campaign_code: string
  brand_name: string
  platform: string
  status: string
  is_live: boolean
}

export default function AdminProfilePage() {
  const { admin, refreshAdmin } = useAdminPermissions()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignedCampaigns, setAssignedCampaigns] = useState<AssignedCampaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function loadProfile() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/profile')
        const data = await res.json()
        if (res.ok && data.profile) {
          setProfile(data.profile)
          setName(data.profile.name || '')
          setPhone(data.profile.phone || '')
        }
      } catch (err) {
        console.error('Failed to load profile:', err)
        toast.error('Failed to load profile details')
      } finally {
        setLoading(false)
      }
    }

    loadProfile()
  }, [])

  // Fetch campaigns assigned to this admin
  useEffect(() => {
    async function loadAssignedCampaigns() {
      try {
        setLoadingCampaigns(true)
        const res = await fetch('/api/admin/campaigns?limit=10')
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.campaigns) && profile?.id) {
            const filtered = data.campaigns.filter((c: any) =>
              Array.isArray(c.poc_admin_ids) && c.poc_admin_ids.includes(profile.id)
            )
            setAssignedCampaigns(filtered)
          }
        }
      } catch {
        // non-blocking
      } finally {
        setLoadingCampaigns(false)
      }
    }

    if (profile?.id) {
      loadAssignedCampaigns()
    }
  }, [profile?.id])

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!name.trim()) {
      toast.error('Name cannot be blank')
      return
    }

    // Phone validation
    const cleanDigits = phone.replace(/\D/g, '')
    if (phone.trim() && cleanDigits.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: cleanDigits || '',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save profile')
      }

      setProfile(prev => (prev ? { ...prev, name: data.profile.name, phone: data.profile.phone } : null))
      await refreshAdmin()
      toast.success('Profile and Brand Manager mobile number saved successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Error updating profile')
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

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <SetAdminHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 text-indigo-400">
              <User className="h-4.5 w-4.5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white tracking-tight">POC Profile & Contact Details</h1>
              <p className="text-[11px] text-slate-400">Configure your Brand Manager number for campaigns</p>
            </div>
          </div>
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="h-9 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving...' : 'Save Profile'}
          </Button>
        </div>
      </SetAdminHeader>

      {/* Main Profile Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Account Overview Card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-1 rounded-2xl bg-slate-900/60 border border-white/[0.08] p-6 flex flex-col items-center text-center space-y-4 backdrop-blur-xl"
        >
          {/* Large Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white text-2xl font-black shadow-xl shadow-indigo-500/20 ring-4 ring-white/10">
              {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 bg-slate-950 rounded-full">
              <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950" title="Active Account" />
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">{profile?.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{profile?.email}</p>
          </div>

          {/* Role Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
            {profile?.roleDisplayName || profile?.role}
          </div>

          <div className="w-full border-t border-white/[0.06] pt-4 space-y-2.5 text-left text-xs">
            <div className="flex items-center justify-between text-slate-400">
              <span>Account Status</span>
              <span className="text-emerald-400 font-medium capitalize flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                {profile?.approvalStatus || 'Approved'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>Assigned Campaigns</span>
              <span className="text-white font-bold bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                {profile?.assignedCampaignsCount || assignedCampaigns.length}
              </span>
            </div>
            {profile?.lastLogin && (
              <div className="flex items-center justify-between text-slate-400">
                <span>Last Session</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {new Date(profile.lastLogin).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Right Column: Editable Details Form */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-2 space-y-6"
        >
          {/* Card: Contact Details */}
          <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-6 space-y-6 backdrop-blur-xl">
            <div>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Phone className="h-4 w-4 text-emerald-400" />
                Point of Contact (POC) & Brand Manager Phone
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Set your primary phone number so you don&apos;t need to manually enter it when launching campaigns.
              </p>
            </div>

            {/* Explanatory Banner */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-slate-950/60 border border-emerald-500/20 flex items-start gap-3 shadow-inner">
              <Sparkles className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-emerald-300 font-semibold block mb-0.5">
                  How this number works across the portal:
                </strong>
                Whenever you are assigned as Point of Contact (POC) to a campaign, this mobile number will be{' '}
                <span className="text-white font-semibold">automatically linked</span>. Operations staff will never
                need to re-enter your number, and approved creators will see a direct WhatsApp and Call button to connect
                with you.
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              {/* Name Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-slate-400" /> Full Name
                </label>
                <Input
                  value={name}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="bg-slate-950/70 border-white/10 text-white h-11 text-sm rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Email Field (Read-only) */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" /> Email Address
                </label>
                <Input
                  value={profile?.email || ''}
                  disabled
                  className="bg-slate-950/40 border-white/5 text-slate-400 h-11 text-sm rounded-xl cursor-not-allowed font-mono"
                />
              </div>

              {/* Mobile / WhatsApp Number Field */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> Mobile / WhatsApp Number *
                  </span>
                  <span className="text-[11px] text-emerald-400/80 flex items-center gap-1">
                    <MessageCircle className="h-3 w-3" /> WhatsApp Enabled
                  </span>
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-sm font-semibold text-slate-400 pointer-events-none select-none border-r border-white/10 pr-2">
                    🇮🇳 +91
                  </span>
                  <Input
                    type="tel"
                    value={phone}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = e.target.value.replace(/[^\d\s]/g, '')
                      setPhone(val)
                    }}
                    placeholder="98765 43210"
                    maxLength={14}
                    className="pl-20 bg-slate-950/70 border-white/10 text-white h-11 text-sm font-mono tracking-wider rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  Enter 10-digit Indian mobile number. Used by creators for collaboration queries.
                </p>
              </div>

              {/* Save Button */}
              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-10 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-600/20 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Mobile Number'}
                </Button>
              </div>
            </form>
          </div>

          {/* Card: Assigned Campaigns Preview */}
          <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-6 space-y-4 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-indigo-400" />
                  Your Assigned Campaigns
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Campaigns where you are designated as the active Brand Manager
                </p>
              </div>
              <Link
                href="/admin/campaigns"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              >
                View All <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {loadingCampaigns ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading assigned campaigns...</div>
            ) : assignedCampaigns.length === 0 ? (
              <div className="py-8 text-center rounded-xl bg-slate-950/40 border border-white/5 space-y-1">
                <Megaphone className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">No campaigns assigned to you yet</p>
                <p className="text-[11px] text-slate-500">
                  When creating or editing campaigns, select your name under &quot;Point of Contact (POC)&quot;.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {assignedCampaigns.map(camp => (
                  <div
                    key={camp.id}
                    className="p-3 rounded-xl bg-slate-950/40 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{camp.brand_name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                          {camp.campaign_code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 capitalize">{camp.platform} Campaign</p>
                    </div>
                    <Link
                      href={`/admin/campaigns/${camp.id}`}
                      className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                    >
                      Manage <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
