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
  Eye,
  Lock,
  Smartphone,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import Link from 'next/link'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'

interface ProfileData {
  id: string
  name: string
  email: string
  phone: string
  creatorViewName?: string
  creatorViewPhone?: string
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

/**
 * Premium shimmer effect utility class
 */
const shimmerClass =
  'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/[0.07] before:to-transparent'

/**
 * Full-width Profile Skeleton Shimmer Component
 */
function ProfileShimmer() {
  return (
    <div className="w-full space-y-5 pb-16 animate-pulse">
      <SetAdminHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <div className={`h-9 w-9 rounded-xl bg-slate-800/80 ${shimmerClass}`} />
            <div className="space-y-1.5">
              <div className={`h-4 w-48 rounded-md bg-slate-800/90 ${shimmerClass}`} />
              <div className={`h-2.5 w-64 rounded-md bg-slate-800/60 ${shimmerClass}`} />
            </div>
          </div>
          <div className={`h-9 w-28 rounded-xl bg-slate-800/80 ${shimmerClass}`} />
        </div>
      </SetAdminHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full">
        <div className={`lg:col-span-4 xl:col-span-3.5 rounded-2xl bg-slate-900/60 border border-white/[0.08] p-6 flex flex-col items-center text-center space-y-4 backdrop-blur-xl ${shimmerClass}`}>
          <div className="w-20 h-20 rounded-2xl bg-slate-800/80 ring-4 ring-white/5" />
          <div className="space-y-2 w-full flex flex-col items-center">
            <div className="h-4 w-36 rounded-md bg-slate-800/90" />
            <div className="h-3 w-44 rounded-md bg-slate-800/60" />
          </div>
        </div>

        <div className="lg:col-span-8 xl:col-span-8.5 space-y-5">
          <div className={`rounded-2xl bg-slate-900/60 border border-white/[0.08] p-6 space-y-5 backdrop-blur-xl ${shimmerClass}`}>
            <div className="h-4 w-64 rounded-md bg-slate-800/90" />
            <div className="h-20 rounded-xl bg-slate-800/40 border border-white/[0.04]" />
            <div className="h-32 rounded-xl bg-slate-800/50 border border-white/[0.04]" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminProfilePage() {
  const { admin, refreshAdmin } = useAdminPermissions()
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [assignedCampaigns, setAssignedCampaigns] = useState<AssignedCampaign[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)

  // Internal Private Fields
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  // Creator-Facing Public Fields
  const [creatorViewName, setCreatorViewName] = useState('')
  const [creatorViewPhone, setCreatorViewPhone] = useState('')

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
          setCreatorViewName(data.profile.creatorViewName || '')
          setCreatorViewPhone(data.profile.creatorViewPhone || '')
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
      toast.error('Legal name cannot be blank')
      return
    }

    setSaving(true)
    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim() || null,
          creator_view_name: creatorViewName.trim() || null,
          creator_view_phone: creatorViewPhone.trim() || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      toast.success('Profile and Privacy settings saved successfully!')
      setProfile((prev) => (prev ? { ...prev, ...data.profile } : null))
      if (refreshAdmin) {
        refreshAdmin()
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <ProfileShimmer />
  }

  // Display values for creator preview card
  const previewDisplayName = creatorViewName.trim() || name.trim() || 'Campaign Manager'
  const previewDisplayPhone = creatorViewPhone.trim() || phone.trim() || '8875912020'

  return (
    <div className="w-full space-y-6 pb-20">
      <SetAdminHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              POC Profile & Contact Details
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Configure your private internal contact and public creator-facing alias
            </p>
          </div>
          <Button
            onClick={() => handleSave()}
            disabled={saving}
            className="h-10 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
      </SetAdminHeader>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
        {/* Left Column: Account Overview & Badges */}
        <div className="lg:col-span-4 xl:col-span-3.5 space-y-5">
          <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-6 flex flex-col items-center text-center space-y-4 backdrop-blur-xl relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 left-0 h-24 bg-gradient-to-b from-indigo-500/10 via-purple-500/5 to-transparent pointer-events-none" />

            {/* Avatar */}
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-500/30 ring-4 ring-white/10">
                {profile?.name?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center">
                <CheckCircle2 className="h-3 w-3 text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <h2 className="text-base font-bold text-white tracking-tight">{profile?.name || 'Admin'}</h2>
              <p className="text-xs text-slate-400 font-mono">{profile?.email}</p>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/25">
                <ShieldCheck className="h-3 w-3 text-indigo-400" />
                {profile?.roleDisplayName || profile?.role || 'Staff'}
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/25">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Approved
              </span>
            </div>

            <div className="w-full border-t border-white/[0.06] pt-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span>Assigned Campaigns</span>
                <span className="font-bold text-white font-mono bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                  {assignedCampaigns.length}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-400">
                <span>Public Alias</span>
                <span className="font-semibold text-pink-300 truncate max-w-[120px]">
                  {profile?.creatorViewName ? `@${profile.creatorViewName}` : 'Default Manager'}
                </span>
              </div>
              {profile?.lastLogin && (
                <div className="flex justify-between items-center text-slate-400">
                  <span>Last Active</span>
                  <span className="text-[11px] font-mono text-slate-300">
                    {new Date(profile.lastLogin).toLocaleDateString('en-IN')}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Campaigns Widget */}
          <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-5 space-y-3 backdrop-blur-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="h-3.5 w-3.5 text-indigo-400" />
                Assigned Campaigns ({assignedCampaigns.length})
              </h3>
              <Link
                href="/admin/campaigns"
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                All
              </Link>
            </div>
            {assignedCampaigns.length === 0 ? (
              <p className="text-xs text-slate-500 py-2">No campaigns currently assigned.</p>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {assignedCampaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-2.5 rounded-xl bg-slate-950/40 border border-white/5 flex items-center justify-between gap-2"
                  >
                    <span className="text-xs font-medium text-slate-200 truncate">{camp.brand_name}</span>
                    <span className="text-[10px] font-mono text-slate-400 shrink-0">{camp.campaign_code}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dual-Identity Form */}
        <div className="lg:col-span-8 xl:col-span-8.5 space-y-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* SECTION 1: INTERNAL PRIVATE IDENTITY */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl bg-slate-900/60 border border-white/[0.08] p-6 space-y-4 backdrop-blur-xl relative overflow-hidden shadow-xl">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-400" />
                    Internal Staff Profile (Private — 1to7 Management Only)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Your real identity and personal number. Strictly protected and hidden from influencers.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  <ShieldCheck className="h-3 w-3 text-emerald-400" /> 100% Private
                </span>
              </div>

              {/* Private notice alert */}
              <div className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 flex items-start gap-3">
                <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  <strong>Zero Leakage Guarantee:</strong> Your real personal name and mobile number entered below are stored internally for team coordination, task assignment, and system login. They are <strong>never</strong> transmitted to creator browsers or WhatsApp links.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Real Full Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400" /> Legal / Full Name *
                  </label>
                  <Input
                    value={name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
                    placeholder="Enter your real legal name"
                    className="bg-slate-950/70 border-white/10 text-white h-11 text-xs rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[10.5px] text-slate-500">Internal management name</p>
                </div>

                {/* Email Address (Read-only) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-slate-400" /> Work Email Address
                  </label>
                  <Input
                    value={profile?.email || ''}
                    disabled
                    className="bg-slate-950/40 border-white/5 text-slate-400 h-11 text-xs rounded-xl cursor-not-allowed font-mono select-none"
                  />
                  <p className="text-[10.5px] text-slate-500">Account login ID (Managed by Super Admin)</p>
                </div>

                {/* Personal Mobile Number */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Smartphone className="h-3.5 w-3.5 text-emerald-400" /> Personal Mobile Number (Internal Escalation Only)
                    </span>
                    <span className="text-[10.5px] text-slate-400 font-mono">🔒 Private to Team</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-semibold text-slate-400 pointer-events-none select-none border-r border-white/10 pr-2">
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
                      className="pl-20 bg-slate-950/70 border-white/10 text-white h-11 text-xs font-mono tracking-wider rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                  <p className="text-[10.5px] text-slate-500">
                    Your real phone number for team operations and emergency admin escalations.
                  </p>
                </div>
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* SECTION 2: CREATOR-FACING PUBLIC IDENTITY */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900/60 to-purple-950/20 border border-purple-500/20 p-6 space-y-5 backdrop-blur-xl relative overflow-hidden shadow-xl ring-1 ring-purple-500/10">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-400" />
                    Creator-Facing Public Identity (Brand Manager Persona)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    What influencers see on campaign details, approved deliverable cards, and WhatsApp contact buttons.
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30">
                  <Eye className="h-3 w-3 text-pink-400" /> Public To Influencers
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Creator View Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-pink-400" /> Public Display Alias *
                    </span>
                    <span className="text-[10px] text-pink-400 font-mono">Visible to Creators</span>
                  </label>
                  <Input
                    value={creatorViewName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCreatorViewName(e.target.value)}
                    placeholder="e.g. Aarav - 1to7 Media, or Brand Support"
                    className="bg-slate-950/80 border-purple-500/30 text-white h-11 text-xs rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                  />
                  <p className="text-[10.5px] text-slate-400">
                    Shown as the Brand Operations Manager name across campaign screens.
                  </p>
                </div>

                {/* Creator View Phone / WhatsApp */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <MessageCircle className="h-3.5 w-3.5 text-emerald-400" /> Creator WhatsApp Number *
                    </span>
                    <span className="text-[10px] text-emerald-400 font-mono">WhatsApp Button</span>
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-xs font-semibold text-slate-400 pointer-events-none select-none border-r border-white/10 pr-2">
                      🇮🇳 +91
                    </span>
                    <Input
                      type="tel"
                      value={creatorViewPhone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        const val = e.target.value.replace(/[^\d\s]/g, '')
                        setCreatorViewPhone(val)
                      }}
                      placeholder="88759 12020 (Office / Proxy Line)"
                      maxLength={14}
                      className="pl-20 bg-slate-950/80 border-purple-500/30 text-white h-11 text-xs font-mono tracking-wider rounded-xl focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                  <p className="text-[10.5px] text-slate-400">
                    Official WhatsApp/helpline number influencers connect with.
                  </p>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════════ */}
              {/* LIVE CREATOR VIEW PREVIEW CARD */}
              {/* ═══════════════════════════════════════════════════════════ */}
              <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-indigo-400" />
                    Live Influencer Preview Card
                  </span>
                  <span className="text-[10px] text-indigo-300 font-semibold bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    What creators see in the app
                  </span>
                </div>

                <div className="rounded-xl border border-pink-500/30 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-slate-950/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-pink-500/20 shrink-0">
                      {previewDisplayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white tracking-tight">
                          {previewDisplayName}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Brand Manager POC
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                        <Phone className="h-3 w-3 text-slate-500" />
                        +91 {previewDisplayPhone.replace(/^(\d{5})(\d{5})$/, '$1 $2')}
                      </p>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 self-start sm:self-auto cursor-default">
                    <MessageCircle className="h-3.5 w-3.5" />
                    <span>WhatsApp Manager</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button Row */}
            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="h-11 px-8 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/25 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving All Changes...' : 'Save Profile & Privacy Shield'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
