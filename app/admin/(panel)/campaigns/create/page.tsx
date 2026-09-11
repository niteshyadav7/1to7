'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Check, Loader2, Save, Megaphone,
  FileSliders, ClipboardList, Wallet, CreditCard, Sparkles,
  Percent, IndianRupee, Layers, CheckCircle2, AlertCircle,
  RotateCcw, ShieldCheck, Lock, Unlock, Users, Clock, FileText,
  Copy, CopyPlus, ClipboardPaste, Sparkle
} from 'lucide-react'
import FormFieldBuilder, { FormField } from '@/components/admin/FormFieldBuilder'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import { parseMinFollowers, formatFollowerCount } from '@/lib/utils/follower-utils'
import CampaignLocationPicker from '@/components/admin/CampaignLocationPicker'
import CampaignAudiencePicker, { PilotCreator } from '@/components/admin/CampaignAudiencePicker'
import { StoreLocation } from '@/lib/utils/location-utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'

const DRAFT_KEY = 'admin_campaign_create_draft'

export default function AdminCreateCampaignPage() {
  const router = useRouter()
  const { admin, isSuperAdmin } = useAdminPermissions()
  const [saving, setSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)
  const [existingCampaigns, setExistingCampaigns] = useState<any[]>([])

  const [formData, setFormData] = useState({
    campaign_code: '',
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
  const [orderFormFields, setOrderFormFields] = useState<FormField[]>([
    { name: 'Order ID', type: 'text', required: true, options: [] },
    { name: 'Order Date (DD-MM-YYYY)', type: 'text', required: true, options: [] },
    { name: 'Product Amount (₹)', type: 'number', required: true, options: [] },
    { name: 'Reviewer Name', type: 'text', required: true, options: [] },
    { name: 'Reviewer Profile Link', type: 'text', required: true, options: [] },
    { name: 'Order Placement Screenshot', type: 'image', required: true, options: [] },
    { name: 'Payment Proof Screenshot (UPI/Bank)', type: 'image', required: true, options: [] }
  ])
  const [paymentFormFields, setPaymentFormFields] = useState<FormField[]>([])

  // Helper to populate all form fields from another campaign
  const populateFromCampaign = (source: any) => {
    if (!source) return
    const randomSuffix = Math.floor(100 + Math.random() * 900)
    const baseCode = source.campaign_code ? source.campaign_code.replace(/-COPY(-\d+)?$/i, '') : 'CAM'
    const newCode = `${baseCode}-COPY-${randomSuffix}`

    setFormData({
      campaign_code: newCode,
      brand_name: source.brand_name ? `${source.brand_name} (Copy)` : '',
      category: source.category || '',
      platform: source.platform || 'Instagram',
      budget_type: source.budget_type || 'Paid',
      budget_amount: source.budget_amount ? String(source.budget_amount) : '',
      partial_payment_enabled: Boolean(source.partial_payment_enabled),
      partial_payment_config: source.partial_payment_config || { type: 'percentage', value: '' },
      deliverables: source.deliverables || '',
      product_links: Array.isArray(source.product_links) ? source.product_links.join('\n') : (source.product_links || ''),
      requirements: source.requirements || '',
      gender_required: source.gender_required || 'Any',
      location: source.location || '',
      location_type: source.location_type || 'PAN_INDIA',
      target_states: Array.isArray(source.target_states) ? source.target_states : [],
      target_cities: Array.isArray(source.target_cities) ? source.target_cities : [],
      store_locations: Array.isArray(source.store_locations) ? source.store_locations : [],
      enforce_location: Boolean(source.enforce_location),
      looking_for: source.looking_for || '',
      followers: source.followers || '',
      min_followers: source.min_followers ? String(source.min_followers) : '',
      enforce_followers: Boolean(source.enforce_followers),
      additional_info: source.additional_info || '',
      collab_date: source.collab_date || '',
      form_link: source.form_link || '',
      order_form: Boolean(source.order_form),
      show_order_form: source.show_order_form !== false,
      completion_days: source.completion_days ? String(source.completion_days) : '7',
      completion_deadline: source.completion_deadline || '',
      enforce_completion_deadline: source.enforce_completion_deadline !== false,
      brief_document_url: source.brief_document_url || '',
      is_test_mode: Boolean(source.is_test_mode),
      test_user_ids: Array.isArray(source.test_user_ids) ? source.test_user_ids : [],
      test_creators: Array.isArray(source.test_creators) ? source.test_creators : [],
    })

    if (Array.isArray(source.form_fields) && source.form_fields.length > 0) {
      setCustomFields(source.form_fields)
    }
    if (Array.isArray(source.order_form_fields) && source.order_form_fields.length > 0) {
      setOrderFormFields(source.order_form_fields)
    }
    if (Array.isArray(source.payment_form_fields) && source.payment_form_fields.length > 0) {
      setPaymentFormFields(source.payment_form_fields)
    }

    toast.success(`Loaded all specifications from "${source.brand_name}"! You can now customize and publish.`)
  }

  // Paste configuration from clipboard or localStorage
  const handlePasteConfig = async () => {
    try {
      let text = ''
      try {
        text = await navigator.clipboard.readText()
      } catch {
        text = localStorage.getItem('admin_copied_campaign_config') || ''
      }

      if (!text) {
        text = localStorage.getItem('admin_copied_campaign_config') || ''
      }

      if (!text) {
        toast.error('No campaign specifications found on clipboard. Click "Copy Specs" on any campaign card first!')
        return
      }

      const parsed = JSON.parse(text)
      if (!parsed.brand_name && !parsed.campaign_code && !parsed.deliverables) {
        toast.error('The clipboard data does not contain valid campaign details.')
        return
      }

      populateFromCampaign(parsed)
    } catch {
      toast.error('Failed to parse clipboard data. Make sure valid campaign JSON was copied.')
    }
  }

  // Copy current form configuration
  const handleCopyCurrentConfig = () => {
    try {
      const payload = {
        ...formData,
        form_fields: customFields,
        order_form_fields: orderFormFields,
        payment_form_fields: paymentFormFields,
      }
      const str = JSON.stringify(payload, null, 2)
      navigator.clipboard.writeText(str)
      localStorage.setItem('admin_copied_campaign_config', str)
      toast.success('Copied current campaign details to clipboard & template storage!')
    } catch {
      toast.error('Failed to copy current details')
    }
  }

  // Restore saved draft or clone from URL on mount
  useEffect(() => {
    // Fetch list of all campaigns for template dropdown
    fetch('/api/admin/campaigns')
      .then(res => res.json())
      .then(data => {
        if (data.campaigns) setExistingCampaigns(data.campaigns)
      })
      .catch(() => {})

    // Check if clone_from is in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const cloneFromId = params.get('clone_from')
      if (cloneFromId) {
        fetch(`/api/admin/campaigns/${cloneFromId}`)
          .then(res => res.json())
          .then(data => {
            if (data.campaign) {
              populateFromCampaign(data.campaign)
            }
          })
          .catch(() => {
            toast.error('Failed to load source campaign for cloning')
          })
        return
      }
    }

    // Otherwise restore saved draft on mount
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft)
        if (parsed.formData && (parsed.formData.brand_name || parsed.formData.campaign_code || parsed.formData.deliverables)) {
          setFormData(parsed.formData)
          if (parsed.customFields) setCustomFields(parsed.customFields)
          if (parsed.orderFormFields) setOrderFormFields(parsed.orderFormFields)
          if (parsed.paymentFormFields) setPaymentFormFields(parsed.paymentFormFields)
          if (parsed.savedAt) setLastSavedTime(parsed.savedAt)
          toast.info('Restored your saved campaign draft!')
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Auto-save draft on form change
  useEffect(() => {
    if (formData.brand_name || formData.campaign_code || formData.deliverables) {
      try {
        const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        const draftPayload = {
          formData,
          customFields,
          orderFormFields,
          paymentFormFields,
          savedAt: now,
        }
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftPayload))
        setLastSavedTime(now)
      } catch {
        // ignore
      }
    }
  }, [formData, customFields, orderFormFields, paymentFormFields])

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY)
    setFormData({
      campaign_code: '',
      brand_name: '',
      category: '',
      platform: 'Instagram',
      budget_type: 'Paid',
      budget_amount: '',
      partial_payment_enabled: false,
      partial_payment_config: { type: 'percentage', value: '' },
      deliverables: '',
      product_links: '',
      requirements: '',
      gender_required: 'Any',
      location: '',
      location_type: 'PAN_INDIA',
      target_states: [],
      target_cities: [],
      store_locations: [],
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
      test_user_ids: [],
      test_creators: [],
    })
    setLastSavedTime(null)
    toast.success('Draft cleared. Starting fresh!')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.brand_name.trim()) {
      toast.error('Brand name is required')
      const brandInput = document.getElementById('brand_name_input')
      if (brandInput) brandInput.focus()
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
      }

      const res = await fetch('/api/admin/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to create campaign')

      localStorage.removeItem(DRAFT_KEY)
      toast.success('Campaign created successfully!')
      router.push('/admin/campaigns')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create campaign'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Navbar Header Injection */}
      <SetAdminHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
          {/* Title + Back */}
          <div className="flex items-center gap-3">
            <Link href="/admin/campaigns">
              <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition-all cursor-pointer shadow-md group">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-white tracking-tight">Create Campaign</h1>
                <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                {formData.is_test_mode ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400">
                    <Sparkles className="h-3 w-3" />
                    Pre-Launch Pilot Mode
                  </span>
                ) : isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-bold text-emerald-400">
                    <ShieldCheck className="h-3 w-3" />
                    Super Admin: Direct Live Publish
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-bold text-amber-400">
                    <Clock className="h-3 w-3" />
                    Maker-Checker: Requires 2nd Admin Approval
                  </span>
                )}
                {lastSavedTime && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-800 border border-white/10 text-[11px] font-medium text-slate-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Draft saved {lastSavedTime}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {formData.is_test_mode
                  ? 'Campaign will be published in Private Pilot Mode for designated testers.'
                  : isSuperAdmin
                  ? 'Campaign will be published immediately upon creation.'
                  : 'Campaign will enter Pending Approval state until reviewed by another admin.'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {lastSavedTime && (
              <button
                type="button"
                onClick={clearDraft}
                title="Clear saved draft and start fresh"
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>Clear Draft</span>
              </button>
            )}

            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className={`h-10 px-5 rounded-xl text-white font-bold text-xs shadow-lg cursor-pointer disabled:opacity-50 flex items-center gap-1.5 ${
                formData.is_test_mode
                  ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20'
                  : isSuperAdmin
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/25'
              }`}
            >
              {saving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  <span>{formData.is_test_mode ? 'Publish to Pilot Testers' : isSuperAdmin ? 'Publish Campaign Live' : 'Submit for Approval'}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </SetAdminHeader>

      {/* Main Single-Page Unified Form */}
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* ─── QUICK CLONE & TEMPLATE ASSISTANT TOOLBAR ─── */}
        <div className="rounded-2xl border border-amber-500/30 bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0 shadow-inner">
              <CopyPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                1-Click Campaign Clone & Template Assistant
                <span className="text-[10px] lowercase font-semibold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                  Instant Auto-Fill
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Choose an existing campaign to auto-fill all deliverables, requirements, location rules, & custom questions
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap sm:flex-nowrap">
            {/* Quick Template Selector */}
            <div className="w-full sm:w-64">
              <Select onValueChange={(val) => {
                const selected = existingCampaigns.find(c => c.id === val)
                if (selected) {
                  populateFromCampaign(selected)
                }
              }}>
                <SelectTrigger className="bg-slate-950 border-amber-500/30 text-white h-9.5 text-xs focus:ring-amber-400 rounded-xl hover:border-amber-400/50 transition-colors">
                  <SelectValue placeholder="⚡ Clone from Template..." />
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white max-h-[260px] shadow-2xl shadow-black/80">
                  {existingCampaigns.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">No existing campaigns found</div>
                  ) : (
                    existingCampaigns.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs py-2 text-slate-200 hover:text-white focus:bg-amber-500/20 cursor-pointer">
                        <span className="font-bold text-white">{c.brand_name}</span>
                        <span className="text-[10px] text-slate-400 ml-1.5 font-mono">({c.campaign_code})</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Paste Specs Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handlePasteConfig}
              title="Paste campaign specifications from clipboard"
              className="h-9.5 px-3 rounded-xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold shrink-0 cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
            >
              <ClipboardPaste className="h-4 w-4 text-amber-400" />
              Paste Specs
            </Button>

            {/* Copy Current Specs Button */}
            <Button
              type="button"
              variant="outline"
              onClick={handleCopyCurrentConfig}
              title="Copy current form specifications to clipboard"
              className="h-9.5 px-3 rounded-xl border-white/10 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium shrink-0 cursor-pointer flex items-center gap-1.5 active:scale-95"
            >
              <Copy className="h-3.5 w-3.5 text-slate-400" />
              Copy Current
            </Button>
          </div>
        </div>

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

        {/* ─── SECTION 1: Essentials & Core Identity ─── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">1. Campaign Essentials & Identity</h2>
              <p className="text-xs text-slate-400">Set brand details, category, platform, and target audience</p>
            </div>
          </div>

          {/* Campaign ID / Code */}
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Campaign ID / Code</Label>
            <div className="flex gap-2">
              <Input
                value={formData.campaign_code}
                onChange={(e) => setFormData({ ...formData, campaign_code: e.target.value.toUpperCase() })}
                placeholder="e.g. CAM-SUMMER24 (Leave blank to auto-generate)"
                className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
              <Button
                type="button"
                onClick={() => setFormData({ ...formData, campaign_code: `CAM-${Date.now().toString(36).toUpperCase()}` })}
                className="h-11 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-white/10 shrink-0 font-medium text-xs cursor-pointer"
              >
                Auto Generate
              </Button>
            </div>
          </div>

          {/* Brand & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Brand Name *</Label>
              <Input
                id="brand_name_input"
                value={formData.brand_name}
                onChange={(e) => setFormData({ ...formData, brand_name: e.target.value })}
                placeholder="e.g. Nike, Meesho, Boat"
                className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Category</Label>
              <Input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Fashion, Tech, Beauty, Fitness"
                className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
            </div>
          </div>

          {/* Platform, Budget Type, Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Platform *</Label>
              <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v || 'Instagram' })}>
                <SelectTrigger className="bg-slate-950/70 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
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
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Budget Type</Label>
              <Select value={formData.budget_type} onValueChange={(v) => setFormData({ ...formData, budget_type: v || 'Paid' })}>
                <SelectTrigger className="bg-slate-950/70 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="bottom" align="start" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50 min-w-[290px]">
                  <SelectItem value="Paid Fixed" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Paid Fixed (Standard Deal)</SelectItem>
                  <SelectItem value="Paid Variable" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Paid Variable (Negotiable Deal)</SelectItem>
                  <SelectItem value="Barter" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Barter (Product/Service)</SelectItem>
                  <SelectItem value="Hybrid" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Hybrid (Barter + Commercial)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Gender Required</Label>
              <Select value={formData.gender_required} onValueChange={(v) => setFormData({ ...formData, gender_required: v || 'Any' })}>
                <SelectTrigger className="bg-slate-950/70 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
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

          {/* Timeline & Looking For */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Collab Date / Timeline</Label>
              <Input
                type="date"
                value={formData.collab_date}
                onChange={(e) => setFormData({ ...formData, collab_date: e.target.value })}
                className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl [color-scheme:dark]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Looking For</Label>
              <Input
                value={formData.looking_for}
                onChange={(e) => setFormData({ ...formData, looking_for: e.target.value })}
                placeholder="e.g. Female fashion creators, Lifestyle vloggers"
                className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
            </div>
          </div>

          {/* Target Audience & Followers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Looking For</Label>
              <Input
                value={formData.looking_for}
                onChange={(e) => setFormData({ ...formData, looking_for: e.target.value })}
                placeholder="e.g. Fashion & Lifestyle Creators"
                className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Followers Label / Display</Label>
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
                className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
            </div>
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
                        followers: preset.count > 0 ? `${preset.label}+` : 'Any'
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
        </div>

        {/* ─── SECTION 2: Deliverables & Requirements ─── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">2. Deliverables & Content Requirements</h2>
              <p className="text-xs text-slate-400">Specify expected creator outputs, criteria, and product URLs</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Deliverables</Label>
            <textarea
              value={formData.deliverables}
              onChange={(e) => setFormData({ ...formData, deliverables: e.target.value })}
              placeholder="e.g. 1 Reel (minimum 30 seconds) + 2 Instagram Stories with swipe-up link"
              rows={3}
              className="w-full bg-slate-950/70 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Requirements & Guidelines</Label>
            <textarea
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              placeholder="e.g. Must feature product clearly in high resolution; Tag @brandname in caption"
              rows={3}
              className="w-full bg-slate-950/70 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Additional Information / Notes</Label>
            <textarea
              value={formData.additional_info}
              onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
              placeholder="e.g. Product reimbursement will be processed within 48 hours of order verification."
              rows={3}
              className="w-full bg-slate-950/70 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-slate-500"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Product Links (One link per line)</Label>
            <textarea
              value={formData.product_links}
              onChange={(e) => setFormData({ ...formData, product_links: e.target.value })}
              placeholder="https://brand.com/product-1&#10;https://brand.com/product-2"
              rows={3}
              className="w-full bg-slate-950/70 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-slate-500 font-mono text-xs"
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

        {/* ─── SECTION 5: Forms & Application Setup ─── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wallet className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">3. Budget & Payout Structure</h2>
              <p className="text-xs text-slate-400">Define budget allocation and split/partial payment rules</p>
            </div>
          </div>

          {/* Budget Amount */}
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Campaign Budget (₹)</Label>
            <div className="relative">
              <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                min="0"
                value={formData.budget_amount}
                onChange={(e) => setFormData({ ...formData, budget_amount: e.target.value })}
                placeholder="e.g. 50000"
                className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-amber-500 rounded-xl pl-10"
              />
            </div>
            <p className="text-xs text-slate-500">Total budget allocated for this campaign across all creators.</p>
          </div>

          {/* Partial Payment Toggle */}
          <div className="space-y-2">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Enable Partial / Split Payment?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, partial_payment_enabled: true })}
                className={`h-12 rounded-xl text-sm font-semibold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                  formData.partial_payment_enabled
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-950/50 text-slate-400 border-white/10 hover:border-white/20'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                Split Payment Enabled
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, partial_payment_enabled: false })}
                className={`h-12 rounded-xl text-sm font-semibold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                  !formData.partial_payment_enabled
                    ? 'bg-slate-800 text-slate-200 border-slate-600'
                    : 'bg-slate-950/50 text-slate-400 border-white/10 hover:border-white/20'
                }`}
              >
                Full Payment (Single Payout)
              </button>
            </div>
          </div>

          {/* Partial Payment Config Details */}
          {formData.partial_payment_enabled && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-4 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Partial Type</Label>
                  <Select
                    value={formData.partial_payment_config.type}
                    onValueChange={(v) => setFormData({
                      ...formData,
                      partial_payment_config: { ...formData.partial_payment_config, type: v as 'percentage' | 'fixed' }
                    })}
                  >
                    <SelectTrigger className="bg-slate-950/70 border-white/10 text-white h-11 text-sm focus:ring-amber-500 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                      <SelectItem value="percentage" className="focus:bg-amber-500/30 focus:text-white cursor-pointer py-2.5">
                        <span className="flex items-center gap-2"><Percent className="h-3.5 w-3.5" /> Percentage %</span>
                      </SelectItem>
                      <SelectItem value="fixed" className="focus:bg-amber-500/30 focus:text-white cursor-pointer py-2.5">
                        <span className="flex items-center gap-2"><IndianRupee className="h-3.5 w-3.5" /> Fixed Amount ₹</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    {formData.partial_payment_config.type === 'percentage' ? 'Partial Percentage (%)' : 'Partial Amount (₹)'}
                  </Label>
                  <div className="relative">
                    {formData.partial_payment_config.type === 'percentage'
                      ? <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      : <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
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
                      placeholder={formData.partial_payment_config.type === 'percentage' ? 'e.g. 50' : 'e.g. 1000'}
                      className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-amber-500 rounded-xl pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Live Calculation Preview */}
              {formData.budget_amount && formData.partial_payment_config.value && (
                <div className="flex items-center gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-300">
                  <IndianRupee className="h-4 w-4 text-amber-400 shrink-0" />
                  <div>
                    {(() => {
                      const budget = parseFloat(formData.budget_amount) || 0
                      const val = parseFloat(formData.partial_payment_config.value as string) || 0
                      const partial = formData.partial_payment_config.type === 'percentage'
                        ? (budget * val / 100)
                        : val
                      const final_ = Math.max(0, budget - partial)
                      return (
                        <span>
                          <strong className="text-amber-400">Payout Breakdown:</strong> ₹{partial.toLocaleString('en-IN')} upfront/partial + ₹{final_.toLocaleString('en-IN')} upon post completion.
                        </span>
                      )
                    })()}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* ─── SECTION 4: Completion Timeline & Overdue Rules ─── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">4. Completion Timeline & Overdue Rules</h2>
              <p className="text-xs text-slate-400">Control deadline window and block overdue creators from applying to other campaigns</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Completion Window (Days after Approval)</Label>
              <Input
                type="number"
                min="1"
                max="90"
                value={formData.completion_days}
                onChange={(e) => setFormData({ ...formData, completion_days: e.target.value })}
                placeholder="7"
                className="bg-slate-950/70 border-white/10 !text-white h-11 text-sm rounded-xl"
              />
              <p className="text-xs text-slate-500">Default is 7 days. Creators must submit live links within this time.</p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Fixed End Deadline Date (Optional)</Label>
              <Input
                type="date"
                value={formData.completion_deadline}
                onChange={(e) => setFormData({ ...formData, completion_deadline: e.target.value })}
                className="bg-slate-950/70 border-white/10 !text-white h-11 text-sm rounded-xl"
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

        {/* ─── SECTION 5: Application & Custom Forms Builder ─── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-7 shadow-xl space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-white/10">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">5. Application & Custom Forms</h2>
              <p className="text-xs text-slate-400">Configure custom creator questions, order forms, and payment fields</p>
            </div>
          </div>

          {/* External Form Link */}
          <div className="space-y-1.5">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">External Form Redirect Link (Optional)</Label>
            <Input
              value={formData.form_link}
              onChange={(e) => setFormData({ ...formData, form_link: e.target.value })}
              placeholder="e.g. https://forms.gle/xyz (If provided, creators apply via this link)"
              className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>

          {/* Order Form Toggle */}
          <div className="space-y-2 pt-2">
            <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Order Verification Form Required?</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, order_form: true })}
                className={`h-12 rounded-xl text-sm font-semibold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                  formData.order_form
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/50 text-slate-400 border-white/10 hover:border-white/20'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Collect Order Details (Product Purchases)
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, order_form: false })}
                className={`h-12 rounded-xl text-sm font-semibold transition-all cursor-pointer border flex items-center justify-center gap-2 ${
                  !formData.order_form
                    ? 'bg-orange-500/20 text-orange-300 border-orange-500/40'
                    : 'bg-slate-950/50 text-slate-400 border-white/10 hover:border-white/20'
                }`}
              >
                Simple Application Only
              </button>
            </div>
          </div>

          {/* Order Form Fields Builder */}
          {formData.order_form && (
            <div className="p-5 rounded-2xl bg-emerald-500/5 border border-emerald-500/15 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  Order Verification Fields
                </Label>
                <span className="text-[11px] text-slate-400">{orderFormFields.length} field(s)</span>
              </div>
              <FormFieldBuilder fields={orderFormFields} onChange={setOrderFormFields} />
            </div>
          )}

          {/* Custom Creator Questions Fields Builder */}
          <div className="space-y-4 pt-2">
            <div className="p-5 rounded-2xl bg-purple-500/5 border border-purple-500/15 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                    <FileSliders className="h-4 w-4 text-purple-400" />
                    Custom Creator Application Questions
                  </Label>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Ask questions like DOB, Shoe Size, T-Shirt Size, Skin Tone, etc. Answers are automatically synced to creator profiles!
                  </p>
                </div>
                <span className="text-[11px] text-slate-400 shrink-0">{customFields.length} field(s)</span>
              </div>
              <FormFieldBuilder fields={customFields} onChange={setCustomFields} />
            </div>

            {/* Custom Payment Fields Builder */}
            <div className="p-5 rounded-2xl bg-pink-500/5 border border-pink-500/15 space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-pink-400" />
                  Custom Payment Request Fields
                </Label>
                <span className="text-[11px] text-slate-400">{paymentFormFields.length} field(s)</span>
              </div>
              <FormFieldBuilder fields={paymentFormFields} onChange={setPaymentFormFields} />
            </div>
          </div>
        </div>

        {/* ─── BOTTOM ACTION BAR ─── */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/90 backdrop-blur-xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {lastSavedTime && (
              <Button
                type="button"
                variant="outline"
                onClick={clearDraft}
                className="h-11 px-4 rounded-xl border-white/10 text-slate-400 hover:text-red-300 hover:bg-red-500/10 text-xs cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                Discard Draft
              </Button>
            )}
            <Link href="/admin/campaigns">
              <Button
                type="button"
                variant="ghost"
                className="h-11 px-4 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
              >
                Cancel
              </Button>
            </Link>
          </div>

          <Button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto h-12 px-8 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl shadow-indigo-500/30 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Creating Campaign...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Create Campaign Now</span>
              </>
            )}
          </Button>
        </div>

      </form>
    </div>
  )
}
