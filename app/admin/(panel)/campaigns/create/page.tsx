'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Check, Loader2, Save, Megaphone,
  FileSliders, ClipboardList, Wallet, CreditCard, Sparkles,
  Percent, IndianRupee, Layers, CheckCircle2, AlertCircle,
  RotateCcw, ShieldCheck
} from 'lucide-react'
import FormFieldBuilder, { FormField } from '@/components/admin/FormFieldBuilder'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'

const STEPS = [
  { id: 1, name: 'Essentials', icon: Megaphone, desc: 'Brand, Platform & Target' },
  { id: 2, name: 'Deliverables', icon: Layers, desc: 'Requirements & Product Links' },
  { id: 3, name: 'Budget', icon: Wallet, desc: 'Payouts & Split Payments' },
  { id: 4, name: 'Forms', icon: ClipboardList, desc: 'Order & Custom Fields' },
]

const DRAFT_KEY = 'admin_campaign_create_draft'

export default function AdminCreateCampaignPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [direction, setDirection] = useState(1)
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null)

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
    looking_for: '',
    followers: '',
    additional_info: '',
    collab_date: '',
    form_link: '',
    order_form: false,
    show_order_form: true,
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

  // Restore saved draft on mount
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(DRAFT_KEY)
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft)
        if (parsed.formData && (parsed.formData.brand_name || parsed.formData.campaign_code || parsed.formData.deliverables)) {
          setFormData(parsed.formData)
          if (parsed.currentStep) setCurrentStep(parsed.currentStep)
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
          currentStep,
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
  }, [formData, currentStep, customFields, orderFormFields, paymentFormFields])

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
      looking_for: '',
      followers: '',
      additional_info: '',
      collab_date: '',
      form_link: '',
      order_form: false,
      show_order_form: true,
    })
    setCurrentStep(1)
    setLastSavedTime(null)
    toast.success('Draft cleared. Starting fresh!')
  }

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!formData.brand_name.trim()) {
        toast.error('Brand Name is required to proceed')
        return false
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateStep(currentStep)) return
    if (currentStep < STEPS.length) {
      setDirection(1)
      setCurrentStep(prev => prev + 1)
    }
  }

  const handlePrev = () => {
    if (currentStep > 1) {
      setDirection(-1)
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleStepClick = (stepId: number) => {
    if (stepId > currentStep && !validateStep(currentStep)) return
    setDirection(stepId > currentStep ? 1 : -1)
    setCurrentStep(stepId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.brand_name.trim()) {
      toast.error('Brand name is required')
      setCurrentStep(1)
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
          ? formData.product_links.split('\n').map(l => l.trim()).filter(Boolean)
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

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 40 : -40,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 40 : -40,
      opacity: 0,
    }),
  }

  return (
    <div className="w-full space-y-5 pb-8">
      {/* Top Navbar Header Injection */}
      <SetAdminHeader>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 w-full">
          {/* Title + Back + Step Badge */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/admin/campaigns">
              <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition-all cursor-pointer shadow-md group">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-extrabold text-white tracking-tight">Create Campaign</h1>
                <Sparkles className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-[11px] font-bold text-indigo-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                  Step {currentStep} of {STEPS.length}
                </span>
                {lastSavedTime && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] font-medium text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Draft saved {lastSavedTime}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">Multi-step campaign builder • <span className="text-indigo-300 font-semibold">{Math.round((currentStep / STEPS.length) * 100)}%</span> complete</p>
            </div>
          </div>

          {/* 4 Multi-Step Navigation Buttons Inline + Clear Draft */}
          <div className="flex items-center gap-2 shrink-0">
            {lastSavedTime && (
              <button
                type="button"
                onClick={clearDraft}
                title="Clear saved draft and start fresh"
                className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-red-500/20 text-slate-400 hover:text-red-300 border border-white/10 text-xs font-medium transition-all cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Clear Draft</span>
              </button>
            )}

            <div className="grid grid-cols-4 gap-2 w-full lg:w-auto shrink-0">
            {STEPS.map((step) => {
              const Icon = step.icon
              const isDone = currentStep > step.id
              const isActive = currentStep === step.id

              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => handleStepClick(step.id)}
                  className={`relative flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all duration-300 cursor-pointer ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-500 text-white shadow-lg shadow-indigo-500/20 border border-indigo-400/40'
                      : isDone
                      ? 'bg-slate-950/60 text-emerald-300 border border-emerald-500/20 hover:bg-slate-800/40'
                      : 'bg-slate-950/40 text-slate-400 border border-white/5 opacity-60 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`flex items-center justify-center h-5 w-5 rounded-md text-[10px] font-bold shrink-0 transition-all ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : isDone
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {isDone ? <Check className="h-3 w-3 stroke-[3]" /> : <Icon className="h-3 w-3" />}
                  </div>

                  <div className="text-left hidden sm:block">
                    <span className="text-xs font-bold block leading-none">{step.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </SetAdminHeader>

      {/* Main Form Container */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-6 sm:p-8 shadow-2xl min-h-[480px] relative overflow-hidden flex flex-col justify-between">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentStep}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="space-y-6"
            >
              {/* STEP 1: Essentials */}
              {currentStep === 1 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                      <Megaphone className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Campaign Essentials</h2>
                      <p className="text-xs text-slate-400">Set brand info, platform, category and target criteria</p>
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
                        <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                          <SelectItem value="Paid" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Paid</SelectItem>
                          <SelectItem value="Barter" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Barter</SelectItem>
                          <SelectItem value="Hybrid" className="text-slate-100 hover:text-white focus:text-white focus:bg-indigo-500/30 cursor-pointer py-2.5 font-medium">Hybrid</SelectItem>
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

                  {/* Location & Timeline */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Location</Label>
                      <Input
                        value={formData.location}
                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                        placeholder="e.g. PAN India, Delhi NCR, Mumbai"
                        className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Collab Date / Timeline</Label>
                      <Input
                        type="date"
                        value={formData.collab_date}
                        onChange={(e) => setFormData({ ...formData, collab_date: e.target.value })}
                        className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl [color-scheme:dark]"
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
                      <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Followers Required</Label>
                      <Input
                        value={formData.followers}
                        onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                        placeholder="e.g. Above 2k, 10k+, 50k+"
                        className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: Deliverables & Requirements */}
              {currentStep === 2 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Deliverables & Content Requirements</h2>
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
                    <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Requirements</Label>
                    <textarea
                      value={formData.requirements}
                      onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                      placeholder="e.g. Must feature product clearly in high resolution; Tag @brandname in caption"
                      rows={3}
                      className="w-full bg-slate-950/70 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Additional Info</Label>
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
                </div>
              )}

              {/* STEP 3: Budget & Payment Structure */}
              {currentStep === 3 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      <Wallet className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Budget & Payout Structure</h2>
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
                    <div className="grid grid-cols-2 gap-4">
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
              )}

              {/* STEP 4: Application Forms & Custom Fields */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-3 pb-4 border-b border-white/10">
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-white">Application & Custom Forms</h2>
                      <p className="text-xs text-slate-400">Configure order forms, external links and dynamic field builders</p>
                    </div>
                  </div>

                  {/* Order Form Toggle */}
                  <div className="space-y-2">
                    <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Order Form Required?</Label>
                    <div className="grid grid-cols-2 gap-4">
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
                        Collect Order Details
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
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-3">
                      <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider">Order Form Fields</Label>
                      <FormFieldBuilder fields={orderFormFields} onChange={setOrderFormFields} />
                    </div>
                  )}

                  {/* External Form Link */}
                  <div className="space-y-1.5">
                    <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">External Form Redirect Link (Optional)</Label>
                    <Input
                      value={formData.form_link}
                      onChange={(e) => setFormData({ ...formData, form_link: e.target.value })}
                      placeholder="e.g. https://forms.gle/xyz"
                      className="bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                    />
                  </div>

                  {/* Custom Fields Builders */}
                  <div className="space-y-4 pt-2">
                    <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/15 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <FileSliders className="h-4 w-4 text-purple-400" />
                          Custom Creator Application Fields
                        </Label>
                        <span className="text-[10px] text-slate-400">{customFields.length} field(s)</span>
                      </div>
                      <FormFieldBuilder fields={customFields} onChange={setCustomFields} />
                    </div>

                    <div className="p-4 rounded-xl bg-pink-500/5 border border-pink-500/15 space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-slate-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                          <CreditCard className="h-4 w-4 text-pink-400" />
                          Custom Payment Request Fields
                        </Label>
                        <span className="text-[10px] text-slate-400">{paymentFormFields.length} field(s)</span>
                      </div>
                      <FormFieldBuilder fields={paymentFormFields} onChange={setPaymentFormFields} />
                    </div>
                  </div>

                  {/* Quick Summary Pill Bar before final submission */}
                  <div className="p-4 rounded-xl bg-slate-950/90 border border-white/10 space-y-2">
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" /> Ready to Launch Summary
                    </h4>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-300">
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-white/5 font-semibold">
                        Brand: {formData.brand_name || 'Not set'}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-white/5">
                        Platform: {formData.platform}
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-white/5">
                        Budget: ₹{formData.budget_amount || '0'} ({formData.budget_type})
                      </span>
                      <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-white/5">
                        Order Form: {formData.order_form ? 'Required' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Wizard Bottom Controls */}
          <div className="flex items-center justify-between pt-6 mt-8 border-t border-white/10">
            {/* Back Button */}
            <Button
              type="button"
              onClick={handlePrev}
              disabled={currentStep === 1}
              className="h-11 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs border border-white/10 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous Step
            </Button>

            {/* Step Counter */}
            <span className="text-xs text-slate-500 font-medium">
              Step {currentStep} of {STEPS.length}
            </span>

            {/* Next / Submit Button */}
            {currentStep < STEPS.length ? (
              <Button
                type="button"
                onClick={handleNext}
                className="h-11 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white font-semibold text-xs shadow-lg shadow-indigo-500/20 cursor-pointer"
              >
                Next Step
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={saving}
                className="h-11 px-7 rounded-xl bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-500 hover:from-emerald-500 hover:to-purple-400 text-white font-bold text-xs shadow-xl shadow-indigo-500/30 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Create Campaign Now
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
