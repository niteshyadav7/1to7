'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowLeft, Loader2, Save, Megaphone, FileSliders } from 'lucide-react'
import FormFieldBuilder, { FormField } from '@/components/admin/FormFieldBuilder'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'

interface CampaignData {
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
  status: string
  is_live: boolean
  location: string
  looking_for: string
  followers: string
  additional_info: string
  collab_date: string
  form_link: string
  form_fields: FormField[]
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
    deliverables: '',
    product_links: '',
    requirements: '',
    gender_required: 'Any',
    status: 'Draft' as string,
    is_live: false,
    location: '',
    looking_for: '',
    followers: '',
    additional_info: '',
    collab_date: '',
    form_link: '',
  })
  const [customFields, setCustomFields] = useState<FormField[]>([])

  useEffect(() => {
    fetchCampaign()
  }, [id])

  const fetchCampaign = async () => {
    try {
      const res = await fetch(`/api/admin/campaigns/${id}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error)

      setCampaign(data.campaign)
      setFormData({
        brand_name: data.campaign.brand_name || '',
        category: data.campaign.category || '',
        platform: data.campaign.platform || 'Instagram',
        budget_type: data.campaign.budget_type || 'Paid',
        deliverables: data.campaign.deliverables || '',
        product_links: (data.campaign.product_links || []).join('\n'),
        requirements: data.campaign.requirements || '',
        gender_required: data.campaign.gender_required || 'Any',
        status: data.campaign.status || 'Draft',
        is_live: data.campaign.is_live || false,
        location: data.campaign.location || '',
        looking_for: data.campaign.looking_for || '',
        followers: data.campaign.followers || '',
        additional_info: data.campaign.additional_info || '',
        collab_date: data.campaign.collab_date || '',
        form_link: data.campaign.form_link || '',
      })
      setCustomFields(data.campaign.form_fields || [])
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

    setSaving(true)
    try {
      const payload = {
        ...formData,
        product_links: formData.product_links
          ? formData.product_links.split('\n').map(l => l.trim()).filter(Boolean)
          : [],
        form_fields: customFields.filter(f => f.name.trim()),
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
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/campaigns">
          <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Edit Campaign</h1>
          <p className="text-sm text-slate-400 mt-0.5">{campaign.campaign_code} — {campaign.brand_name}</p>
        </div>
      </div>

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        {/* Status & Live Controls */}
        <div className="rounded-2xl border border-white/5 bg-slate-900/60 backdrop-blur-lg p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                  <SelectItem value="Draft" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Draft</SelectItem>
                  <SelectItem value="Active" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Active</SelectItem>
                  <SelectItem value="Review" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Review</SelectItem>
                  <SelectItem value="Closed" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Visibility</Label>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_live: !formData.is_live })}
                className={`w-full h-11 rounded-xl text-sm font-medium transition-all cursor-pointer border ${
                  formData.is_live
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20'
                    : 'bg-slate-950/50 text-slate-400 border-white/10'
                }`}
              >
                {formData.is_live ? '🟢 Live — Visible to Influencers' : '⚫ Offline — Hidden'}
              </button>
            </div>
          </div>
        </div>

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
                <Select value={formData.platform} onValueChange={(v) => setFormData({ ...formData, platform: v })}>
                  <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                    <SelectItem value="Instagram" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Instagram</SelectItem>
                    <SelectItem value="YouTube" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">YouTube</SelectItem>
                    <SelectItem value="Amazon" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Amazon</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Budget Type</Label>
                <Select value={formData.budget_type} onValueChange={(v) => setFormData({ ...formData, budget_type: v })}>
                  <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                    <SelectItem value="Paid" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Paid</SelectItem>
                    <SelectItem value="Barter" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Barter</SelectItem>
                    <SelectItem value="Hybrid" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Hybrid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Gender</Label>
                <Select value={formData.gender_required} onValueChange={(v) => setFormData({ ...formData, gender_required: v })}>
                  <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus:ring-indigo-500 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent side="bottom" className="bg-slate-950 border-white/20 text-white shadow-2xl shadow-black/50">
                    <SelectItem value="Any" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Any</SelectItem>
                    <SelectItem value="Male" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Male</SelectItem>
                    <SelectItem value="Female" className="focus:bg-indigo-500/30 focus:text-white cursor-pointer py-2.5">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Location</Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Collab Date / Timeline</Label>
                <Input
                  type="date"
                  value={formData.collab_date}
                  onChange={(e) => setFormData({ ...formData, collab_date: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Looking For</Label>
                <Input
                  value={formData.looking_for}
                  onChange={(e) => setFormData({ ...formData, looking_for: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Followers Required</Label>
                <Input
                  value={formData.followers}
                  onChange={(e) => setFormData({ ...formData, followers: e.target.value })}
                  className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">External Form Link (Optional)</Label>
              <Input
                value={formData.form_link}
                onChange={(e) => setFormData({ ...formData, form_link: e.target.value })}
                className="bg-slate-950/50 border-white/10 text-white h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
              />
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
    </div>
  )
}
