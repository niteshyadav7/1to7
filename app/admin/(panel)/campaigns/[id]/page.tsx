'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Loader2, Save, Megaphone, FileSliders, ClipboardList,
  Percent, IndianRupee, Wallet, CreditCard, Lock, Unlock, Users, Clock,
  FileText, UserCheck, ShieldCheck, AlertTriangle, AlertCircle, History
} from 'lucide-react'
import FormFieldBuilder, { FormField } from '@/components/admin/FormFieldBuilder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { parseMinFollowers, formatFollowerCount } from '@/lib/utils/follower-utils'
import CampaignLocationPicker from '@/components/admin/CampaignLocationPicker'
import CampaignAudiencePicker, { PilotCreator } from '@/components/admin/CampaignAudiencePicker'
import { StoreLocation } from '@/lib/utils/location-utils'
import { CampaignRecentDiffBanner, CampaignEditHistoryModal } from '@/components/admin/CampaignDiffViewer'
import { CampaignEditLogEntry } from '@/lib/utils/campaign-audit-diff'

interface CampaignData {
  id: string
  campaign_code: string
  brand_name: string
  category: string
  platform: string
  budget_type: string
  budget_amount: number
  partial_payment_enabled: boolean
  partial_payment_config: { type: 'percentage' | 'fixed'; value: number }
  deliverables: string
  product_links: string[]
  requirements: string
  gender_required: string
  status: string
  is_live: boolean
  approval_status?: 'Approved' | 'Pending Approval' | 'Rejected'
  created_by_admin_id?: string
  created_by_admin_name?: string
  created_by_admin_email?: string
  last_edited_by_admin_id?: string
  last_edited_by_admin_name?: string
  last_edited_by_admin_email?: string
  last_edited_at?: string
  approved_by_admin_id?: string
  approved_by_admin_name?: string
  approved_by_admin_email?: string
  approved_at?: string
  rejection_reason?: string
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
  edit_history?: CampaignEditLogEntry[]
  additional_info?: string
  collab_date?: string
  form_link?: string
  form_fields?: FormField[]
  order_form?: boolean
  order_form_fields?: FormField[]
  show_order_form?: boolean
  payment_form_fields?: FormField[]
  completion_days?: number
  completion_deadline?: string
  enforce_completion_deadline?: boolean
  is_test_mode?: boolean
  test_user_ids?: string[]
  test_creators?: PilotCreator[]
}

export default function AdminEditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [campaign, setCampaign] = useState<CampaignData | null>(null)
  const [formData, setFormData] = useState({
    brand_name: '',
    category: '',
    platform: 'Instagram',
    budget_type: 'Paid',
    budget_amount: '',
    partial_payment_enabled: false,
    partial_payment_config: { type: 'percentage' as 'percentage' | 'fixed', value: '' as string },
    deliverables: '',
    product_links: '',
    requirements: '',
    gender_required: 'Any',
    status: 'Draft' as string,
    is_live: false,
    location: '',
    location_type: 'PAN_INDIA' as 'PAN_INDIA' | 'STATES' | 'CITIES' | 'STORES',
    target_states: [] as string[],
    target_cities: [] as string[],
    store_locations: [] as StoreLocation[],
    enforce_location: false,
    looking_for: '',
    followers: '',
    min_followers: '',
    enforce_followers: false,
    additional_info: '',
    collab_date: '',
    form_link: '',
    order_form: false,
    show_order_form: true,
    completion_days: '7',
    completion_deadline: '',
    enforce_completion_deadline: true,
    brief_document_url: '',
    is_test_mode: false,
    test_user_ids: [] as string[],
    test_creators: [] as PilotCreator[],
  })
  const [customFields, setCustomFields] = useState<FormField[]>([])
  const [orderFormFields, setOrderFormFields] = useState<FormField[]>([])
  const [paymentFormFields, setPaymentFormFields] = useState<FormField[]>([])
  const [historyModalOpen, setHistoryModalOpen] = useState(false)

  useEffect(() => {
    fetchCampaign()
  }, [id])

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setCampaign(data.campaign)
      const ppConfig = data.campaign.partial_payment_config || {}
      setFormData({
        brand_name: data.campaign.brand_name || '',
        category: data.campaign.category || '',
        platform: data.campaign.platform || 'Instagram',
        budget_type: data.campaign.budget_type || 'Paid',
        budget_amount: data.campaign.budget_amount ? String(data.campaign.budget_amount) : '',
        partial_payment_enabled: data.campaign.partial_payment_enabled || false,
        partial_payment_config: {
          type: (ppConfig.type || 'percentage') as 'percentage' | 'fixed',
          value: ppConfig.value !== undefined ? String(ppConfig.value) : '',
        },
        deliverables: data.campaign.deliverables || '',
        product_links: (data.campaign.product_links || []).join('\n'),
        requirements: data.campaign.requirements || '',
        gender_required: data.campaign.gender_required || 'Any',
        status: data.campaign.status || 'Draft',
        is_live: data.campaign.is_live || false,
        location: data.campaign.location || '',
        location_type: data.campaign.location_type || 'PAN_INDIA',
        target_states: data.campaign.target_states || [],
        target_cities: data.campaign.target_cities || [],
        store_locations: Array.isArray(data.campaign.store_locations) ? data.campaign.store_locations : [],
        enforce_location: Boolean(data.campaign.enforce_location),
        looking_for: data.campaign.looking_for || '',
        followers: data.campaign.followers || '',
        min_followers: data.campaign.min_followers !== undefined && data.campaign.min_followers !== null ? String(data.campaign.min_followers) : '',
        enforce_followers: Boolean(data.campaign.enforce_followers),
        additional_info: data.campaign.additional_info || '',
        collab_date: data.campaign.collab_date || '',
        form_link: data.campaign.form_link || '',
        order_form: data.campaign.order_form || false,
        show_order_form: data.campaign.show_order_form !== false,
        completion_days: data.campaign.completion_days ? String(data.campaign.completion_days) : '7',
        completion_deadline: data.campaign.completion_deadline ? data.campaign.completion_deadline.split('T')[0] : '',
        enforce_completion_deadline: data.campaign.enforce_completion_deadline !== false,
        brief_document_url: data.campaign.brief_document_url || '',
        is_test_mode: Boolean(data.campaign.is_test_mode),
        test_user_ids: Array.isArray(data.campaign.test_user_ids) ? data.campaign.test_user_ids : [],
        test_creators: Array.isArray(data.campaign.test_creators) ? data.campaign.test_creators : [],
      })
      setCustomFields(data.campaign.form_fields || [])
      setOrderFormFields(data.campaign.order_form_fields || [])
      setPaymentFormFields(data.campaign.payment_form_fields || [])
    } catch {
      toast.error('Failed to load campaign')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.brand_name.trim()) {
      toast.error('Brand name is required')
      return
    }

    if (formData.is_test_mode && formData.test_user_ids.length === 0) {
      toast.error('Please select at least one pilot creator for testing before saving in Pilot Mode')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        budget_amount: formData.budget_amount ? parseFloat(formData.budget_amount) : 0,
        partial_payment_config: formData.partial_payment_enabled
          ? { type: formData.partial_payment_config.type, value: parseFloat(formData.partial_payment_config.value as string) || 0 }
          : {},
        product_links: formData.product_links
          ? formData.product_links.split('\n').map(l => l.trim()).filter(l => l && l.toLowerCase() !== 'na' && l.toLowerCase() !== 'n/a')
          : [],
        form_fields: customFields.filter(f => f.name.trim()),
        order_form: formData.order_form,
        order_form_fields: formData.order_form ? orderFormFields.filter(f => f.name.trim()) : [],
        show_order_form: formData.show_order_form,
        payment_form_fields: paymentFormFields.filter(f => f.name.trim()),
        completion_days: formData.completion_days ? parseInt(formData.completion_days, 10) || 7 : 7,
        completion_deadline: formData.completion_deadline || null,
        enforce_completion_deadline: formData.enforce_completion_deadline !== false,
      }

      const res = await fetch(`/api/admin/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to update')

      toast.success('Campaign updated successfully!')
      router.push('/admin/campaigns')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <Megaphone className="h-12 w-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-400">Campaign not found</h3>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header Injection */}
      <SetAdminHeader>
        <div className="flex items-center gap-3">
          <Link href="/admin/campaigns">
            <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition-all cursor-pointer shadow-md group">
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
            </button>
          </Link>
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Edit Campaign</h1>
            <p className="text-xs text-slate-400">{campaign.campaign_code} — {campaign.brand_name}</p>
          </div>
        </div>
      </SetAdminHeader>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Dual Governance Re-Approval Warning Banner */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-4 flex items-start gap-3 text-xs text-amber-200 shadow-lg">
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-300 text-sm">Strict Dual-Admin Governance Policy</p>
            <p className="text-slate-300 leading-relaxed">
              Saving any edits to this campaign will <strong className="text-amber-300">automatically reset prior approvals</strong> and set its status to <strong className="text-amber-300">Pending Approval</strong>. The admin who makes these edits cannot self-approve; another admin must review and approve the clean version before it goes Live.
            </p>
          </div>
        </div>

        {/* Creator, Last Editor & Approver Audit Card */}
        <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 backdrop-blur-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-indigo-400 shrink-0" />
              <span className="text-slate-400">
                Created by <strong className="text-white">{campaign.created_by_admin_name || 'Admin'}</strong>
                {campaign.created_by_admin_email && (
                  <span className="ml-1.5 font-mono text-[11px] text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                    {campaign.created_by_admin_email}
                  </span>
                )}
              </span>
            </div>

            {campaign.last_edited_by_admin_name && campaign.last_edited_by_admin_name !== campaign.created_by_admin_name && (
              <div className="flex items-center gap-2 border-l border-white/10 pl-4 flex-wrap">
                <Clock className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-slate-400">
                  Last edited by <strong className="text-amber-300">{campaign.last_edited_by_admin_name}</strong>
                  {campaign.last_edited_at && (
                    <span className="ml-1.5 text-[11px] text-slate-400">
                      ({new Date(campaign.last_edited_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </span>
                {campaign.edit_history && campaign.edit_history.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setHistoryModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 transition-all cursor-pointer shadow-xs ml-2"
                  >
                    <History className="h-3.5 w-3.5" />
                    <span>View Changes ({campaign.edit_history[0]?.changes_count || campaign.edit_history[0]?.changes?.length || campaign.edit_history.length})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {campaign.approval_status === 'Approved' ? (
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
              <ShieldCheck className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-slate-400">
                Approved by <strong className="text-emerald-300">{campaign.approved_by_admin_name || 'Super Admin'}</strong>
                {campaign.approved_by_admin_email && (
                  <span className="ml-1.5 font-mono text-[11px] text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    {campaign.approved_by_admin_email}
                  </span>
                )}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-xl border border-amber-500/20">
              <Clock className="h-4 w-4 text-amber-400 shrink-0" />
              <span className="text-amber-400 font-bold">
                Governance Status: {campaign.approval_status || 'Pending Approval'}
              </span>
            </div>
          )}
        </div>

        {/* Live Publishing Notice */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg p-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-white">Live Publication Control</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Live status is governed strictly by Dual Admin Approval. Saving changes submits this campaign for 2nd Admin Review.
            </p>
          </div>
          <div className="shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20">
              <Clock className="h-3.5 w-3.5" /> Re-Approval Required on Save
            </span>
          </div>
        </div>

        {/* Recent Edit Diff Banner */}
        {campaign.edit_history && campaign.edit_history.length > 0 && (
          <CampaignRecentDiffBanner
            entry={campaign.edit_history[0]}
            onViewAllHistory={() => setHistoryModalOpen(true)}
          />
        )}

        {/* ─── AUDIENCE & VISIBILITY (PUBLIC VS PRE-LAUNCH PILOT) ─── */}
        <CampaignAudiencePicker
          isTestMode={formData.is_test_mode}
          testUserIds={formData.test_user_ids}
          testCreators={formData.test_creators}
          onChange={(updates) => {
            setFormData(prev => ({
              ...prev,
              is_test_mode: updates.is_test_mode,
              test_user_ids: updates.test_user_ids,
              test_creators: updates.test_creators,
            }))
          }}
        />

        {/* Campaign Details */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/5 to-transparent">
            <Megaphone className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Campaign Details</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Brand Name *</Label>
                <Input
                  value={formData.brand_name}
                  onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Platform</Label>
                <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v || 'Instagram' })}>
                  <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                    <SelectItem value="Instagram" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Instagram</SelectItem>
                    <SelectItem value="YouTube" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">YouTube</SelectItem>
                    <SelectItem value="Amazon" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Amazon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Budget Type</Label>
                <Select value={formData.budget_type} onValueChange={(v) => setFormData({ ...formData, budget_type: v || 'Paid' })}>
                  <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                    <SelectItem value="Paid Fixed" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Paid Fixed (Standard Deal)</SelectItem>
                    <SelectItem value="Paid Variable" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Paid Variable (Negotiable Deal)</SelectItem>
                    <SelectItem value="Barter" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Barter (Product/Service)</SelectItem>
                    <SelectItem value="Hybrid" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Hybrid (Barter + Commercial)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Gender</Label>
                <Select value={formData.gender_required} onValueChange={(v) => setFormData({ ...formData, gender_required: v || 'Any' })}>
                  <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                    <SelectItem value="Any" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Any</SelectItem>
                    <SelectItem value="Male" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Male</SelectItem>
                    <SelectItem value="Female" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location & Geographic Targeting Card */}
            <CampaignLocationPicker
              locationType={formData.location_type}
              targetStates={formData.target_states}
              targetCities={formData.target_cities}
              storeLocations={formData.store_locations}
              enforceLocation={formData.enforce_location}
              locationDisplay={formData.location}
              onChange={(updates) => {
                setFormData({
                  ...formData,
                  location_type: updates.location_type,
                  target_states: updates.target_states,
                  target_cities: updates.target_cities,
                  store_locations: updates.store_locations,
                  enforce_location: updates.enforce_location,
                  location: updates.location,
                })
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Collab Date / Timeline</Label>
                <Input
                  type="date"
                  value={formData.collab_date}
                  onChange={(e) => setFormData({ ...formData, collab_date: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Looking For</Label>
                <Input
                  value={formData.looking_for}
                  onChange={(e) => setFormData({ ...formData, looking_for: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Followers Label / Display</Label>
              <Input
                value={formData.followers}
                onChange={(e) => {
                  const val = e.target.value
                  const parsed = parseMinFollowers(val)
                  setFormData({
                    ...formData,
                    followers: val,
                    min_followers: parsed > 0 ? String(parsed) : formData.min_followers,
                  })
                }}
                placeholder="e.g. 10k+, Above 2k, Any"
                className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
            </div>

            {/* Followers Minimum Threshold & Strict Control Card */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-white/10 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-indigo-400" />
                    <h4 className="text-sm font-bold text-white">Minimum Follower Eligibility</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Set the exact minimum follower count and choose whether to enforce strictly or allow bypass.
                  </p>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Presets:</span>
                  {[
                    { label: 'Any', count: 0 },
                    { label: '1K', count: 1000 },
                    { label: '5K', count: 5000 },
                    { label: '10K', count: 10000 },
                    { label: '25K', count: 25000 },
                    { label: '50K', count: 50000 },
                    { label: '100K', count: 100000 },
                  ].map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          min_followers: String(preset.count),
                          followers: preset.count > 0 ? `${preset.label}+` : 'Any',
                        })
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        Number(formData.min_followers) === preset.count
                          ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-white/5">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    Minimum Followers (Exact Number)
                  </Label>
                  <Input
                    type="number"
                    value={formData.min_followers}
                    onChange={(e) => setFormData({ ...formData, min_followers: e.target.value })}
                    placeholder="e.g. 10000"
                    className="bg-slate-950 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                  />
                  {Number(formData.min_followers) > 0 && (
                    <span className="text-[11px] text-indigo-400 font-medium block">
                      Targeting: {formatFollowerCount(Number(formData.min_followers))} ({Number(formData.min_followers).toLocaleString('en-IN')} followers)
                    </span>
                  )}
                </div>

                {/* Strict Mode Toggle Box */}
                <div className="flex items-center">
                  <div 
                    onClick={() => setFormData({ ...formData, enforce_followers: !formData.enforce_followers })}
                    className={`w-full p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 select-none ${
                      formData.enforce_followers
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                        : 'bg-slate-900/60 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                      formData.enforce_followers ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'
                    }`}>
                      {formData.enforce_followers ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">
                          {formData.enforce_followers ? '🔒 Strict Mode (Enforced)' : '🔓 Flexible / Bypass Allowed'}
                        </span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          formData.enforce_followers ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {formData.enforce_followers ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                        {formData.enforce_followers
                          ? 'Creators below this minimum follower count will be strictly blocked from applying.'
                          : 'Creators with any follower count can apply. Requirement is purely informative.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>



            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Deliverables</Label>
              <textarea
                value={formData.deliverables}
                onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
                rows={3}
                className="w-full bg-slate-950/50 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Requirements</Label>
              <textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                rows={3}
                className="w-full bg-slate-950/50 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Additional Info</Label>
              <textarea
                value={formData.additional_info}
                onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                rows={3}
                className="w-full bg-slate-950/50 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-600"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Product Links (one per line)</Label>
              <textarea
                value={formData.product_links}
                onChange={(e) => setFormData({ ...formData, product_links: e.target.value })}
                rows={3}
                className="w-full bg-slate-950/50 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-600"
              />
            </div>

            {/* Campaign Brief Document Upload (Gated) */}
            <div className="space-y-2 p-4 rounded-xl bg-slate-950/60 border border-white/10">
              <div className="flex items-center justify-between">
                <Label className="text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-purple-400" />
                  Campaign Brief Document (Gated — Approved Creators Only)
                </Label>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  🔒 Gated Asset
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Provide PDF/Word link or document URL with script guidelines and do's/don'ts. This is hidden from public view and automatically unlocks for approved profiles.
              </p>
              <Input
                type="url"
                value={formData.brief_document_url}
                onChange={(e) => setFormData({ ...formData, brief_document_url: e.target.value })}
                placeholder="https://storage.googleapis.com/.../Brand_Brief_Guide.pdf"
                className="bg-slate-900 border-white/10 text-white h-11 text-xs font-mono rounded-xl focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Budget & Payment */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-amber-500/5 to-transparent">
            <Wallet className="h-4 w-4 text-amber-400" />
            <h3 className="text-sm font-semibold text-white">Budget & Payment</h3>
          </div>
          <div className="p-6 space-y-5">
            {/* Budget Amount */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Campaign Budget (₹)</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  type="number"
                  min="0"
                  value={formData.budget_amount}
                  onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                  placeholder="e.g. 50000"
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-amber-500 rounded-xl pl-10"
                />
              </div>
              <p className="text-xs text-slate-500">Optional. Total budget allocated for this campaign across all influencers.</p>
            </div>

            {/* Partial Payment Toggle */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Enable Partial Payment?</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, partial_payment_enabled: true })}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    formData.partial_payment_enabled
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/20'
                      : 'bg-slate-950/50 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  ✅ Yes — Split Payment
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, partial_payment_enabled: false })}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    !formData.partial_payment_enabled
                      ? 'bg-slate-500/15 text-slate-300 border-slate-500/20'
                      : 'bg-slate-950/50 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  💵 No — Full Payment
                </button>
              </div>
              <p className="text-xs text-slate-500">When enabled, influencer payments will be split into partial + final installments.</p>
            </div>

            {/* Partial Payment Config (shown only when enabled) */}
            {formData.partial_payment_enabled && (
              <div className="space-y-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Payment Type</Label>
                    <Select
                      value={formData.partial_payment_config.type}
                      onValueChange={(v) => setFormData({
                        ...formData,
                        partial_payment_config: { ...formData.partial_payment_config, type: v as 'percentage' | 'fixed' }
                      })}
                    >
                      <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-amber-500 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                        <SelectItem value="percentage" className="text-slate-100 hover:text-white focus:text-white focus:bg-amber-500/30 cursor-pointer py-2.5 font-medium">
                          <span className="flex items-center gap-2"><Percent className="h-3.5 w-3.5 text-amber-400" /> Percentage</span>
                        </SelectItem>
                        <SelectItem value="fixed" className="text-slate-100 hover:text-white focus:text-white focus:bg-amber-500/30 cursor-pointer py-2.5 font-medium">
                          <span className="flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5 text-amber-400" /> Fixed Amount</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">
                      {formData.partial_payment_config.type === 'percentage' ? 'Partial %' : 'Partial Amount (₹)'}
                    </Label>
                    <div className="relative">
                      {formData.partial_payment_config.type === 'percentage'
                        ? <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                        : <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      }
                      <Input
                        type="number"
                        min="0"
                        max={formData.partial_payment_config.type === 'percentage' ? '100' : undefined}
                        value={formData.partial_payment_config.value}
                        onChange={(e) => setFormData({
                          ...formData,
                          partial_payment_config: { ...formData.partial_payment_config, value: e.target.value }
                        })}
                        placeholder={formData.partial_payment_config.type === 'percentage' ? 'e.g. 50' : 'e.g. 500'}
                        className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-amber-500 rounded-xl pl-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                {formData.budget_amount && formData.partial_payment_config.value && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-900/80 border border-white/5">
                    <IndianRupee className="h-4 w-4 text-amber-400 shrink-0" />
                    <div className="text-xs text-slate-300">
                      {(() => {
                        const budget = parseFloat(formData.budget_amount) || 0
                        const val = parseFloat(formData.partial_payment_config.value as string) || 0
                        const partial = formData.partial_payment_config.type === 'percentage'
                          ? (budget * val / 100)
                          : val
                        const final_ = Math.max(0, budget - partial)
                        return (
                          <>
                            <span className="text-amber-400 font-semibold">Per influencer:</span>{' '}
                            ₹{partial.toLocaleString('en-IN')} partial + ₹{final_.toLocaleString('en-IN')} final{' '}
                            <span className="text-slate-500">(of ₹{budget.toLocaleString('en-IN')} total)</span>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Completion Timeline & Overdue Enforcement */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-indigo-500/5 to-transparent">
            <Clock className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-semibold text-white">Completion Timeline & Overdue Rules</h3>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Completion Window (Days after Approval)</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.completion_days}
                  onChange={(e) => setFormData({ ...formData, completion_days: e.target.value })}
                  placeholder="7"
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm rounded-xl"
                />
                <p className="text-xs text-slate-500">Default is 7 days. Creators must submit live links within this time.</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Fixed End Deadline Date (Optional)</Label>
                <Input
                  type="date"
                  value={formData.completion_deadline}
                  onChange={(e) => setFormData({ ...formData, completion_deadline: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm rounded-xl"
                />
                <p className="text-xs text-slate-500">Overrides rolling window if set (hard cut-off date).</p>
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/60 border border-white/10 cursor-pointer hover:border-white/20 transition-all">
                <input
                  type="checkbox"
                  checked={formData.enforce_completion_deadline}
                  onChange={(e) => setFormData({ ...formData, enforce_completion_deadline: e.target.checked })}
                  className="h-4 w-4 rounded accent-amber-400 bg-slate-900 border-white/20"
                />
                <div>
                  <p className="text-sm font-semibold text-white">Block Overdue Creators from Applying to Other Campaigns</p>
                  <p className="text-xs text-slate-400">If creator passes deadline without submitting proof, their applications to new campaigns will be locked (unless delay is exempted by Admin).</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Application Settings */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-emerald-500/5 to-transparent">
            <ClipboardList className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">Application Settings</h3>
          </div>
          <div className="p-6 space-y-5">
            {/* Order Form Toggle */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Order Form Required?</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, order_form: true })}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    formData.order_form
                      ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                      : 'bg-slate-950/50 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  ✅ Yes — Collect Order Details
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, order_form: false })}
                  className={`flex-1 h-11 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                    !formData.order_form
                      ? 'bg-orange-500/15 text-orange-300 border-orange-500/20'
                      : 'bg-slate-950/50 text-slate-400 border-white/10 hover:border-white/20'
                  }`}
                >
                  ❌ No — Just Comments
                </button>
              </div>
            </div>

            {/* Show Order Form to Influencers Toggle */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Show Order Form info to Influencers?</Label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, show_order_form: !formData.show_order_form })}
                className={`w-full h-11 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                  formData.show_order_form
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/20'
                    : 'bg-slate-950/50 text-slate-400 border-white/10'
                }`}
              >
                {formData.show_order_form ? '👁️ Visible — Influencers can see Order Form info' : '🙈 Hidden — Order Form info hidden from influencers'}
              </button>
            </div>

            {/* Order Form Fields (only when order_form = true) */}
            {formData.order_form && (
              <div className="space-y-3">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Order Form Fields</Label>
                <p className="text-xs text-slate-500">Define fields for order details (e.g. Delivery Address, T-shirt Size, Quantity).</p>
                <FormFieldBuilder fields={orderFormFields} onChange={setOrderFormFields} />
              </div>
            )}

            {/* External Form Link */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">External Form Link (Optional)</Label>
              <p className="text-xs text-slate-500 mb-1">If set, clicking &quot;Apply&quot; will redirect influencers to this link instead of showing the built-in form.</p>
              <Input
                value={formData.form_link}
                onChange={(e) => setFormData({ ...formData, form_link: e.target.value })}
                placeholder="e.g. https://forms.gle/..."
                className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Custom Application Fields */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-purple-500/5 to-transparent">
            <FileSliders className="h-4 w-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">Custom Application Fields</h3>
            <span className="text-[10px] text-slate-500 ml-auto">{customFields.length} field{customFields.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-6">
            <p className="text-xs text-slate-500 mb-4">Define extra fields that influencers must fill when applying. These appear in the application form.</p>
            <FormFieldBuilder fields={customFields} onChange={setCustomFields} />
          </div>
        </div>

        {/* Payment Form Fields */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/5 bg-gradient-to-r from-pink-500/5 to-transparent">
            <CreditCard className="h-4 w-4 text-pink-400" />
            <h3 className="text-sm font-semibold text-white">Payment Form Settings</h3>
            <span className="text-[10px] text-slate-500 ml-auto">{paymentFormFields.length} field{paymentFormFields.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="p-6">
            <p className="text-xs text-slate-500 mb-4">Live Date, Payment Reason, Payment Amount, and Supporting Document are already required. Use this to add ANY EXTRA payment-related fields.</p>
            <FormFieldBuilder fields={paymentFormFields} onChange={setPaymentFormFields} />
          </div>
        </div>

        {/* Submit */}
        <Button
          type="submit"
          disabled={saving}
          className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white font-semibold text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </motion.form>

      {/* Full Edit History Timeline Modal */}
      <CampaignEditHistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        campaignName={campaign?.brand_name}
        editHistory={campaign?.edit_history}
      />
    </div>
  )
}
