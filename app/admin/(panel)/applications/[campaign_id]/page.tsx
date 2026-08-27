'use client'

import { useState, useEffect, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Papa from 'papaparse'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Send,
  Instagram, Users, MapPin, ChevronDown, ChevronUp,
  IndianRupee, Phone, Save, Search, Clock, RotateCcw, Trash2,
  History, Sparkles, Store, ExternalLink, ShieldCheck, Calendar, AlertTriangle,
  Share2, Download, CheckSquare, Square, Tag, RefreshCw
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { getInstagramDisplayHandle, getInstagramUrl } from '@/lib/instagram-utils'
import { InfluencerCampaignHistoryCard, InfluencerCampaignHistory } from '@/components/admin/InfluencerCampaignHistoryCard'
import CommercialNegotiationModal from '@/components/admin/CommercialNegotiationModal'

interface UserInfo {
  id: string
  full_name: string
  influencer_id: string
  email: string
  mobile: string
  instagram_username: string
  followers: number
  state: string
  city: string
  gender: string
  profile_photo?: string
  instagram_profile_pic?: string
}

interface Application {
  id: string
  campaign_id: string
  status: string
  form_data: Record<string, any>
  selected_store?: { name?: string; city?: string; area?: string; address?: string; google_maps_url?: string } | null
  partial_payment: number
  final_payment: number
  pending_amount: number
  manager_phone: string
  completion_deadline?: string | null
  is_delay_exempted?: boolean | null
  delay_exemption_reason?: string | null
  completion_submitted_at?: string | null
  created_at: string
  updated_at: string
  users: UserInfo
  influencer_history?: InfluencerCampaignHistory
}

interface CampaignInfo {
  brand_name: string
  campaign_code: string
  platform: string
  completion_days?: number | null
  completion_deadline?: string | null
  enforce_completion_deadline?: boolean | null
}

const statusColors: Record<string, string> = {
  'Applied': 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  'Under Process': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Under Review': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
  'Approved': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Rejected': 'bg-red-500/15 text-red-300 border-red-500/20',
  'Completed': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Payment Initiated': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
}

const filters = ['All', 'Applied', 'Under Process', 'Approved', 'Rejected', 'Completed', 'Payment Initiated']

export default function AdminApplicationsPage({ params }: { params: Promise<{ campaign_id: string }> }) {
  const { campaign_id } = use(params)
  const [loading, setLoading] = useState(true)
  const [campaign, setCampaign] = useState<CampaignInfo | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [paymentEdits, setPaymentEdits] = useState<Record<string, {
    partial_payment: number
    final_payment: number
    pending_amount: number
    manager_phone: string
  }>>({})
  const [exemptionModalApp, setExemptionModalApp] = useState<Application | null>(null)
  const [selectedExemptionReason, setSelectedExemptionReason] = useState('Brand parcel/shipment delayed')
  const [customExemptionReason, setCustomExemptionReason] = useState('')

  const [revokeModalApp, setRevokeModalApp] = useState<Application | null>(null)
  const [selectedRevokeReason, setSelectedRevokeReason] = useState('Accidental approval / Selection misclick')
  const [customRevokeReason, setCustomRevokeReason] = useState('')
  const [sendRevokeEmail, setSendRevokeEmail] = useState(false)
  const [negotiationModalApp, setNegotiationModalApp] = useState<Application | null>(null)

  // ─── Sprint 5: Sent to Brand Batch Tracker States ─────────
  const [brandSentFilter, setBrandSentFilter] = useState<'all' | 'sent' | 'not_sent'>('all')
  const [selectedAppIds, setSelectedAppIds] = useState<string[]>([])
  const [showSentModal, setShowSentModal] = useState(false)
  const [batchLabel, setBatchLabel] = useState('')
  const [batchNotes, setBatchNotes] = useState('')
  const [markingSent, setMarkingSent] = useState(false)

  const handleBatchSentToBrand = async (action: 'mark_sent' | 'unmark_sent' = 'mark_sent', targetIds?: string[]) => {
    const ids = targetIds || selectedAppIds
    if (ids.length === 0) {
      toast.error('Please select at least one applicant profile')
      return
    }

    setMarkingSent(true)
    try {
      const res = await fetch('/api/admin/applications/sent-to-brand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          application_ids: ids,
          batch_label: batchLabel.trim() || undefined,
          notes: batchNotes.trim() || undefined,
          action,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')

      toast.success(data.message)
      setShowSentModal(false)
      setSelectedAppIds([])
      setBatchLabel('')
      setBatchNotes('')
      fetchApplications()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update Sent to Brand status')
    } finally {
      setMarkingSent(false)
    }
  }

  const handleExportBrandCSV = (appsToExport: Application[]) => {
    if (appsToExport.length === 0) {
      toast.error('No applicant profiles to export')
      return
    }

    const exportData = appsToExport.map((a, idx) => ({
      'Sr No': idx + 1,
      'Creator Name': a.users?.full_name || '',
      'User ID': a.users?.influencer_id || '',
      'Instagram Handle': a.users?.instagram_username ? getInstagramDisplayHandle(a.users.instagram_username) : '',
      'Instagram URL': a.users?.instagram_username ? getInstagramUrl(a.users.instagram_username) : '',
      'Followers': a.users?.followers || 0,
      'City': a.users?.city || '',
      'State': a.users?.state || '',
      'Gender': a.users?.gender || '',
      'Application Status': a.status || '',
      'Commercial Quote (INR)': a.form_data?.agreed_commercial || a.form_data?.commercial_amount || a.form_data?.total_deal || '',
      'Sent to Brand Status': a.form_data?.sent_to_brand?.is_sent ? `Sent (${a.form_data.sent_to_brand.batch_label || 'Batch'})` : 'Not Sent',
      'Sent Date': a.form_data?.sent_to_brand?.sent_at ? new Date(a.form_data.sent_to_brand.sent_at).toLocaleDateString('en-IN') : '',
    }))

    const csv = Papa.unparse(exportData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `Brand_Profiles_${campaign?.campaign_code || 'Export'}_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success(`Exported ${appsToExport.length} creator profiles to CSV!`)
  }

  const updateApplicationTimeline = async (
    appId: string,
    payload: {
      is_delay_exempted?: boolean
      delay_exemption_reason?: string
      completion_deadline?: string
      extend_days?: number
    }
  ) => {
    setUpdatingId(appId)
    try {
      const res = await fetch(`/api/admin/applications/${appId}/timeline`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update timeline')

      setApplications(prev =>
        prev.map(a => (a.id === appId ? { ...a, ...data.application } : a))
      )
      toast.success(data.message || 'Timeline updated successfully')
      setExemptionModalApp(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update timeline')
    } finally {
      setUpdatingId(null)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [campaign_id])

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/admin/applications?campaign_id=${campaign_id}`)
      const data = await res.json()
      setCampaign(data.campaign || null)
      setApplications(data.applications || [])

      // Initialize payment edits
      const edits: typeof paymentEdits = {}
      for (const app of (data.applications || [])) {
        edits[app.id] = {
          partial_payment: app.partial_payment || 0,
          final_payment: app.final_payment || 0,
          pending_amount: app.pending_amount || 0,
          manager_phone: app.manager_phone || '',
        }
      }
      setPaymentEdits(edits)
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (
    appId: string,
    newStatus: string,
    extraPayload?: { rejection_reason?: string; send_email?: boolean; is_revert?: boolean }
  ) => {
    setUpdatingId(appId)
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, ...extraPayload }),
      })
      if (!res.ok) throw new Error('Failed to update')

      setApplications(prev =>
        prev.map(a => a.id === appId ? { ...a, status: newStatus } : a)
      )

      const targetApp = applications.find(a => a.id === appId)
      const creatorName = targetApp?.users?.full_name || 'Creator'

      if (newStatus === 'Approved') {
        toast.success(`Approved ${creatorName} for collaboration!`, {
          description: 'Galti se approve hua? Click Undo.',
          duration: 8000,
          action: {
            label: 'Undo',
            onClick: () => updateStatus(appId, 'Applied', { is_revert: true, send_email: false }),
          },
        })
      } else if (newStatus === 'Applied' && extraPayload?.is_revert) {
        toast.success(`Approval reverted. ${creatorName} moved back to Applied.`)
      } else if (newStatus === 'Rejected' && extraPayload?.rejection_reason) {
        toast.success(`Approval revoked for ${creatorName}.`)
      } else {
        toast.success(`Application status updated to ${newStatus}`)
      }
    } catch {
      toast.error('Failed to update status')
    } finally {
      setUpdatingId(null)
    }
  }

  const handleRevertApproval = (app: Application) => {
    const hasOrder = Boolean(app.form_data?.order_details || app.form_data?.order_details_approved)
    const hasPayment = Boolean(app.form_data?.payment_request)
    
    let confirmMsg = `Are you sure you want to revert approval for ${app.users?.full_name || 'this creator'} and move back to Applied? This will remove the campaign from their Approved tab.`
    if (hasOrder || hasPayment) {
      confirmMsg = `⚠️ WARNING: ${app.users?.full_name || 'Creator'} has already submitted order/payment details. Reverting approval will cancel active progress and move application back to Pending. Proceed?`
    }

    if (confirm(confirmMsg)) {
      updateStatus(app.id, 'Applied', { is_revert: true, send_email: false })
    }
  }

  const deleteApplication = async (appId: string, influencerName?: string) => {
    if (!confirm(`Are you sure you want to reset/delete this application${influencerName ? ` for ${influencerName}` : ''}? This will allow the creator to apply completely fresh from scratch.`)) {
      return
    }
    setUpdatingId(appId)
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setApplications(prev => prev.filter(a => a.id !== appId))
      toast.success('Application reset successfully. Creator can now apply again from scratch!')
    } catch {
      toast.error('Failed to reset application')
    } finally {
      setUpdatingId(null)
    }
  }

  const savePayment = async (appId: string) => {
    setUpdatingId(appId)
    try {
      const payment = paymentEdits[appId]
      if (!payment) return

      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payment),
      })
      if (!res.ok) throw new Error('Failed to save')

      toast.success('Payment details saved')
    } catch {
      toast.error('Failed to save payment')
    } finally {
      setUpdatingId(null)
    }
  }

  if (loading) {
    return <GlobalLoader text="Loading Applications..." />
  }

  const sentCount = applications.filter(a => a.form_data?.sent_to_brand?.is_sent).length
  const unsharedCount = applications.filter(a => !a.form_data?.sent_to_brand?.is_sent).length

  const filtered = applications.filter(a => {
    const matchesFilter = activeFilter === 'All' || a.status === activeFilter
    const matchesBrandSent =
      brandSentFilter === 'all' ? true :
      brandSentFilter === 'sent' ? Boolean(a.form_data?.sent_to_brand?.is_sent) :
      !a.form_data?.sent_to_brand?.is_sent

    const user = a.users
    const searchString = `${user?.full_name} ${user?.influencer_id} ${user?.instagram_username} ${user?.email}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())
    return matchesFilter && matchesBrandSent && matchesSearch
  })

  return (
    <div className="space-y-6 pb-24">
      {/* Header Injection */}
      <SetAdminHeader>
        <div className="flex items-center justify-between gap-4 w-full">
          <div className="flex items-center gap-3">
            <Link href="/admin/campaigns">
              <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/10 transition-all cursor-pointer shadow-md group">
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight">Applications</h1>
              <p className="text-xs text-slate-400">
                {campaign?.brand_name || 'Campaign'} ({campaign?.campaign_code}) • {applications.length} applicants
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/admin/campaigns/export?type=applications&campaign_id=${campaign_id}`}
              download
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 hover:text-white transition-all cursor-pointer shadow-sm"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export Import-Ready CSV</span>
            </a>
          </div>
        </div>
      </SetAdminHeader>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border ${
                activeFilter === f
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                  : 'bg-slate-900/50 text-slate-400 border-white/5 hover:bg-white/5 hover:text-white'
              }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  ({applications.filter(a => a.status === f).length})
                </span>
              )}
              {f === 'All' && (
                <span className="ml-1.5 text-[10px] opacity-60">({applications.length})</span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            placeholder="Search applicants..."
            className="pl-9 bg-slate-900/50 border-white/5 text-white h-10 text-sm focus-visible:ring-indigo-500 rounded-xl w-full transition-all hover:bg-slate-900/80"
          />
        </div>
      </div>

      {/* ─── Sprint 5: Sent to Brand Batch Tracker Bar & Bulk Action Hub ─── */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/70 border border-white/10 backdrop-blur-xl shadow-lg">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mr-1">
            <Share2 className="h-3.5 w-3.5 text-purple-400" />
            Brand Shared Tracker:
          </span>
          <button
            onClick={() => setBrandSentFilter('all')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              brandSentFilter === 'all'
                ? 'bg-slate-800 text-white border border-white/15'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All ({applications.length})
          </button>
          <button
            onClick={() => setBrandSentFilter('sent')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              brandSentFilter === 'sent'
                ? 'bg-purple-600/30 text-purple-300 border border-purple-500/40 shadow-sm'
                : 'text-purple-400/80 hover:text-purple-300'
            }`}
          >
            📤 Sent to Brand ({sentCount})
          </button>
          <button
            onClick={() => setBrandSentFilter('not_sent')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              brandSentFilter === 'not_sent'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-amber-400/80 hover:text-amber-300'
            }`}
          >
            🆕 Unshared Profiles ({unsharedCount})
          </button>
        </div>

        {/* Selection & Export Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              if (selectedAppIds.length === filtered.length && filtered.length > 0) {
                setSelectedAppIds([])
              } else {
                setSelectedAppIds(filtered.map(a => a.id))
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 hover:bg-slate-700 text-slate-300 cursor-pointer border border-white/5 transition-all"
          >
            {selectedAppIds.length === filtered.length && filtered.length > 0 ? (
              <CheckSquare className="h-3.5 w-3.5 text-indigo-400" />
            ) : (
              <Square className="h-3.5 w-3.5 text-slate-400" />
            )}
            {selectedAppIds.length === filtered.length && filtered.length > 0 ? 'Deselect All' : `Select All (${filtered.length})`}
          </button>

          {selectedAppIds.length > 0 && (
            <button
              onClick={() => {
                setBatchLabel(`Batch #${Math.floor(Date.now() / 100000) % 100} - ${selectedAppIds.length} Profiles`)
                setShowSentModal(true)
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 cursor-pointer transition-all animate-pulse"
            >
              <Share2 className="h-3.5 w-3.5" />
              Mark {selectedAppIds.length} as Sent to Brand
            </button>
          )}

          <button
            onClick={() => handleExportBrandCSV(selectedAppIds.length > 0 ? applications.filter(a => selectedAppIds.includes(a.id)) : filtered)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 cursor-pointer transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export Brand Sheet ({selectedAppIds.length > 0 ? selectedAppIds.length : filtered.length})
          </button>
        </div>
      </div>

      {/* Applications */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Send className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No applications found</h3>
          <p className="text-sm text-slate-500 mt-2">
            {activeFilter !== 'All' || brandSentFilter !== 'all' || searchQuery ? 'Try a different filter or search query' : 'Applications will appear here when influencers apply'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((app, i) => {
              const isExpanded = expandedId === app.id
              const user = app.users

              return (
                <motion.div
                  layout
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className={`rounded-2xl border bg-slate-900/60 backdrop-blur-lg overflow-hidden transition-all ${
                    isExpanded ? 'border-white/20 shadow-xl shadow-indigo-500/5' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                {/* Main Row */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : app.id)}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Selection Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedAppIds(prev =>
                          prev.includes(app.id) ? prev.filter(id => id !== app.id) : [...prev, app.id]
                        )
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                    >
                      {selectedAppIds.includes(app.id) ? (
                        <CheckSquare className="h-4 w-4 text-indigo-400" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-600 hover:text-slate-400" />
                      )}
                    </button>

                    {user?.profile_photo || user?.instagram_profile_pic ? (
                      <img
                        src={user.profile_photo || user.instagram_profile_pic}
                        alt={user?.full_name || 'Influencer'}
                        className="h-10 w-10 rounded-full object-cover shrink-0 border border-white/15 shadow-md"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white shrink-0 shadow-lg shadow-indigo-500/10">
                        {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Unknown'}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span>{user?.influencer_id}</span>
                        {user?.instagram_username && (
                          <a
                            href={getInstagramUrl(user.instagram_username)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-semibold text-slate-300 hover:text-pink-400 hover:underline transition-colors"
                            onClick={(e) => e.stopPropagation()}
                            title={getInstagramDisplayHandle(user.instagram_username)}
                          >
                            <Instagram className="h-3 w-3 text-pink-400 shrink-0" />
                            <span className="truncate max-w-[150px]">{getInstagramDisplayHandle(user.instagram_username)}</span>
                            <ExternalLink className="h-3 w-3 text-pink-400 shrink-0 inline" />
                          </a>
                        )}
                        {user?.followers > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />
                            {user.followers.toLocaleString()}
                          </span>
                        )}

                        {/* Shortlisting Intelligence Badges */}
                        {app.influencer_history?.active_campaigns_count ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                            {app.influencer_history.active_campaigns_count} Active
                          </span>
                        ) : null}

                        {app.influencer_history?.completed_campaigns_count ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {app.influencer_history.completed_campaigns_count} Done
                          </span>
                        ) : null}

                        {app.influencer_history?.is_first_collab ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            ✨ 1st Collab
                          </span>
                        ) : null}

                        {app.selected_store ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                            <Store className="h-2.5 w-2.5" />
                            {app.selected_store.name}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                    {/* Sent to Brand Badge */}
                    {app.form_data?.sent_to_brand?.is_sent ? (
                      <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                        <Share2 className="h-3 w-3 text-purple-400" />
                        Sent ({app.form_data.sent_to_brand.batch_label || 'Brand'})
                      </span>
                    ) : (
                      <span className="rounded-full px-2.5 py-1 text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                        🆕 Unshared
                      </span>
                    )}

                    <span className={`rounded-full px-3 py-1 text-xs font-medium border ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                      {app.status}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-5 py-5 space-y-5">
                    {/* User Profile Details */}
                    <div>
                      <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-3">Influencer Profile</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Full Name</p>
                          <p className="text-slate-300">{user?.full_name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Influencer ID</p>
                          <p className="text-slate-300 font-mono">{user?.influencer_id || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Email</p>
                          <p className="text-slate-300 truncate">{user?.email || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Mobile</p>
                          <p className="text-slate-300">{user?.mobile || '—'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Instagram</p>
                          <div className="text-slate-300 flex items-center gap-1">
                            {user?.instagram_username ? (
                              <a
                                href={getInstagramUrl(user.instagram_username)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 font-semibold text-slate-200 hover:text-pink-400 hover:underline transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Instagram className="h-3 w-3 text-pink-400 shrink-0" />
                                <span>{getInstagramDisplayHandle(user.instagram_username)}</span>
                                <ExternalLink className="h-3 w-3 text-pink-400 shrink-0" />
                              </a>
                            ) : '—'}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Followers</p>
                          <p className="text-slate-300 font-medium">
                            {user?.followers > 0 ? user.followers.toLocaleString() : '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Location</p>
                          <p className="text-slate-300 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[user?.city, user?.state].filter(Boolean).join(', ') || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Gender</p>
                          <p className="text-slate-300">{user?.gender || '—'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Influencer Active & Past Campaigns Intelligence Card */}
                    <InfluencerCampaignHistoryCard
                      history={app.influencer_history}
                      influencerName={user?.full_name}
                    />

                    {/* Selected Store Outlet Card */}
                    {app.selected_store && (
                      <div className="bg-purple-500/10 border border-purple-500/25 rounded-2xl p-4 space-y-2">
                        <p className="text-[11px] text-purple-300 uppercase tracking-wider font-bold flex items-center gap-1.5">
                          <Store className="h-3.5 w-3.5 text-purple-400" />
                          Selected Store Branch (Store Visit)
                        </p>
                        <div className="flex items-start justify-between gap-3 flex-wrap bg-slate-900/80 p-3.5 rounded-xl border border-white/10">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-white">{app.selected_store.name}</span>
                              {app.selected_store.city && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-500/20 text-purple-200 font-bold">
                                  {app.selected_store.city}
                                </span>
                              )}
                              {app.selected_store.area && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                                  📍 {app.selected_store.area}
                                </span>
                              )}
                            </div>
                            {app.selected_store.address && (
                              <p className="text-xs text-slate-400 mt-1">{app.selected_store.address}</p>
                            )}
                          </div>
                          {app.selected_store.google_maps_url && (
                            <a
                              href={app.selected_store.google_maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Google Maps Direction
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Completion Timeline & Delay Exemption Controls for Active Collabs */}
                    {(app.status === 'Approved' || app.status === 'Payment Requested' || app.status === 'Payment Initiated' || app.status === 'Completed') && (() => {
                      const baseDate = app.updated_at ? new Date(app.updated_at) : new Date(app.created_at)
                      const defaultDays = campaign?.completion_days || 7
                      const effectiveDeadline = app.completion_deadline 
                        ? new Date(app.completion_deadline)
                        : (campaign?.completion_deadline ? new Date(campaign.completion_deadline) : new Date(baseDate.getTime() + defaultDays * 24 * 60 * 60 * 1000))
                      
                      const isCompleted = Boolean(app.completion_submitted_at || app.form_data?.payment_request || app.status === 'Completed' || app.status === 'Payment Requested')
                      const isOverdue = !isCompleted && new Date() > effectiveDeadline
                      const diffDays = isOverdue ? Math.ceil((new Date().getTime() - effectiveDeadline.getTime()) / (1000 * 60 * 60 * 24)) : Math.max(0, Math.ceil((effectiveDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
                      
                      return (
                        <div className="rounded-2xl border border-white/10 bg-slate-950/70 p-4 space-y-3 shadow-lg">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-indigo-400" />
                              <h5 className="text-xs font-bold text-white uppercase tracking-wider">
                                Deliverable Completion Timeline
                              </h5>
                            </div>
                            
                            {/* Live Timeline Status Badge */}
                            <div>
                              {isCompleted ? (
                                <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Deliverable Submitted On Time
                                </span>
                              ) : app.is_delay_exempted ? (
                                <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5" title={app.delay_exemption_reason || 'Brand delay'}>
                                  <ShieldCheck className="h-3 w-3" />
                                  Delay Exempted ({app.delay_exemption_reason || 'Brand delay'}) — Unblocked
                                </span>
                              ) : isOverdue ? (
                                <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-rose-500/25 text-rose-200 border border-rose-500/40 flex items-center gap-1.5 animate-pulse">
                                  <AlertTriangle className="h-3 w-3 text-rose-400" />
                                  Overdue by {diffDays} days — Next Campaigns Blocked
                                </span>
                              ) : (
                                <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-blue-500/15 text-blue-300 border border-blue-500/25 flex items-center gap-1.5">
                                  <Clock className="h-3 w-3" />
                                  Due in {diffDays} days ({effectiveDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                            <div>
                              <p className="text-[11px]">
                                Target Deadline: <strong className="text-white">{effectiveDeadline.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                                {app.completion_deadline ? ' (Admin Custom Extension)' : ` (${defaultDays} days window)`}
                              </p>
                              {app.is_delay_exempted && app.delay_exemption_reason && (
                                <p className="text-[11px] text-amber-300 mt-0.5">
                                  🛡️ Exemption Note: <em>"{app.delay_exemption_reason}"</em>
                                </p>
                              )}
                            </div>

                            {/* Admin Quick Action Buttons */}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {!app.is_delay_exempted ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => setExemptionModalApp(app)}
                                  disabled={updatingId === app.id}
                                  className="h-7 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-[11px] font-bold cursor-pointer"
                                >
                                  <ShieldCheck className="h-3 w-3 mr-1" />
                                  Exempt Brand Delay
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => updateApplicationTimeline(app.id, { is_delay_exempted: false })}
                                  disabled={updatingId === app.id}
                                  className="h-7 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 text-[11px] font-bold cursor-pointer"
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Remove Exemption
                                </Button>
                              )}

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => updateApplicationTimeline(app.id, { extend_days: 7 })}
                                disabled={updatingId === app.id}
                                className="h-7 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold cursor-pointer"
                                title="Extend deadline by +7 days"
                              >
                                +7 Days
                              </Button>

                              <Button
                                type="button"
                                size="sm"
                                onClick={() => updateApplicationTimeline(app.id, { extend_days: 14 })}
                                disabled={updatingId === app.id}
                                className="h-7 px-2 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-bold cursor-pointer"
                                title="Extend deadline by +14 days"
                              >
                                +14 Days
                              </Button>
                            </div>
                          </div>
                        </div>
                      )
                    })()}

                    {/* Form Data */}
                    {app.form_data && Object.keys(app.form_data).length > 0 && (
                      <div>
                        <p className="text-[11px] text-indigo-400 uppercase tracking-wider font-semibold mb-3">Application Form Responses</p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 text-sm">
                          {Object.entries(app.form_data).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                                {key.replace(/[_-]/g, ' ')}
                              </p>
                              <p className="text-slate-300 break-words">
                                {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : (String(value) || '—')}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Negotiation Status Card */}
                    {app.form_data?.negotiation?.status === 'pending_peer_approval' && (
                      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            Negotiated Deal: ₹{Number(app.form_data.negotiation.proposed_amount).toLocaleString()} (Awaiting Colleague Approval)
                          </span>
                          <span className="text-xs text-slate-400">
                            By <strong className="text-white">{app.form_data.negotiation.proposed_by_name}</strong>
                          </span>
                        </div>
                        {app.form_data.negotiation.notes && (
                          <p className="text-xs text-slate-300 italic">
                            "{app.form_data.negotiation.notes}"
                          </p>
                        )}
                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            size="sm"
                            type="button"
                            onClick={() => setNegotiationModalApp(app)}
                            className="h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs cursor-pointer shadow-sm"
                          >
                            <IndianRupee className="mr-1 h-3.5 w-3.5" />
                            Review / Approve Deal
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Sprint 5: Sent to Brand Quick Tracker Box */}
                    <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/10 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${app.form_data?.sent_to_brand?.is_sent ? 'bg-purple-500/20 text-purple-300' : 'bg-slate-800 text-slate-400'}`}>
                          <Share2 className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white flex items-center gap-2">
                            {app.form_data?.sent_to_brand?.is_sent
                              ? `📤 Sent to Brand: ${app.form_data.sent_to_brand.batch_label || 'Batch'}`
                              : '🆕 Profile Not Shared with Brand Yet'}
                            {app.form_data?.sent_to_brand?.is_sent && (
                              <span className="text-[10px] font-normal text-purple-300 bg-purple-500/15 px-2 py-0.5 rounded-full border border-purple-500/30">
                                Logged by {app.form_data.sent_to_brand.sent_by || 'Admin'}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {app.form_data?.sent_to_brand?.is_sent
                              ? `Dispatched to brand on ${new Date(app.form_data.sent_to_brand.sent_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}`
                              : 'Keep track of new applications received after sending previous batches to the brand.'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {app.form_data?.sent_to_brand?.is_sent ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBatchSentToBrand('unmark_sent', [app.id])
                            }}
                            disabled={markingSent}
                            className="h-8 text-xs border-white/10 text-slate-400 hover:text-white cursor-pointer"
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Reset Sent Status
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleBatchSentToBrand('mark_sent', [app.id])
                            }}
                            disabled={markingSent}
                            className="h-8 text-xs bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer shadow-md shadow-purple-600/20"
                          >
                            <Share2 className="h-3 w-3 mr-1" />
                            Mark as Sent to Brand
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-400 mr-1 font-medium">Update Status:</span>

                      {/* Negotiate Commercial Button */}
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => setNegotiationModalApp(app)}
                        className="h-9 px-3.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 text-xs font-semibold cursor-pointer"
                      >
                        <IndianRupee className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                        {app.form_data?.negotiation?.proposed_amount
                          ? `Deal: ₹${Number(app.form_data.negotiation.proposed_amount).toLocaleString()}`
                          : 'Negotiate Deal'}
                      </Button>

                      {app.status !== 'Under Process' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatus(app.id, 'Under Process')}
                          disabled={updatingId === app.id}
                          className="h-9 px-4 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 text-xs font-medium cursor-pointer"
                        >
                          <Clock className="mr-1.5 h-3.5 w-3.5" />
                          Under Process
                        </Button>
                      )}

                      {app.status === 'Approved' ? (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleRevertApproval(app)}
                            disabled={updatingId === app.id}
                            className="h-9 px-3 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 text-xs font-semibold cursor-pointer"
                            title="Undo accidental approval and move back to Applied/Pending"
                          >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            Revert to Applied
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setRevokeModalApp(app)}
                            disabled={updatingId === app.id}
                            className="h-9 px-3 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 text-xs font-semibold cursor-pointer"
                            title="Revoke approval with a specific reason"
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Revoke Approval
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(app.id, 'Completed')}
                            disabled={updatingId === app.id}
                            className="h-9 px-4 rounded-lg bg-purple-500/15 text-purple-300 border border-purple-500/20 hover:bg-purple-500/25 text-xs font-medium cursor-pointer"
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Mark Completed
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(app.id, 'Payment Initiated')}
                            disabled={updatingId === app.id}
                            className="h-9 px-4 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/20 hover:bg-amber-500/25 text-xs font-medium cursor-pointer"
                          >
                            <IndianRupee className="mr-1.5 h-3.5 w-3.5" />
                            Initiate Payment
                          </Button>
                        </>
                      ) : (
                        <>
                          {app.status !== 'Approved' && (
                            <Button
                              size="sm"
                              onClick={() => updateStatus(app.id, 'Approved')}
                              disabled={updatingId === app.id}
                              className="h-9 px-4 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 text-xs font-medium cursor-pointer"
                            >
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              Approve
                            </Button>
                          )}

                          {app.status !== 'Rejected' ? (
                            <Button
                              size="sm"
                              onClick={() => updateStatus(app.id, 'Rejected')}
                              disabled={updatingId === app.id}
                              className="h-9 px-4 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/20 hover:bg-rose-500/25 text-xs font-medium cursor-pointer"
                              title="Reject and allow creator to re-apply"
                            >
                              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                              Allow Re-Apply
                            </Button>
                          ) : (
                            <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                              <RotateCcw className="h-3.5 w-3.5" />
                              Re-Apply Enabled
                            </span>
                          )}
                        </>
                      )}

                      <Button
                        size="sm"
                        onClick={() => deleteApplication(app.id, app.users?.full_name)}
                        disabled={updatingId === app.id}
                        className="h-9 px-3.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/25 text-xs font-medium cursor-pointer ml-auto"
                        title="Delete application so creator can apply from scratch"
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Reset (Delete)
                      </Button>
                    </div>

                    {/* Payment Section */}
                    {(app.status === 'Approved' || app.status === 'Completed' || app.status === 'Payment Initiated') && paymentEdits[app.id] && (
                      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <IndianRupee className="h-3.5 w-3.5" />
                          Payment Tracking
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <Label className="text-slate-500 text-[10px] uppercase">Partial Payment (₹)</Label>
                            <Input
                              type="number"
                              value={paymentEdits[app.id].partial_payment}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentEdits(prev => ({
                                ...prev,
                                [app.id]: { ...prev[app.id], partial_payment: parseFloat(e.target.value) || 0 }
                              }))}
                              className="bg-slate-950/50 border-white/10 text-white h-9 text-sm rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-slate-500 text-[10px] uppercase">Final Payment (₹)</Label>
                            <Input
                              type="number"
                              value={paymentEdits[app.id].final_payment}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentEdits(prev => ({
                                ...prev,
                                [app.id]: { ...prev[app.id], final_payment: parseFloat(e.target.value) || 0 }
                              }))}
                              className="bg-slate-950/50 border-white/10 text-white h-9 text-sm rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-slate-500 text-[10px] uppercase">Pending Amount (₹)</Label>
                            <Input
                              type="number"
                              value={paymentEdits[app.id].pending_amount}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentEdits(prev => ({
                                ...prev,
                                [app.id]: { ...prev[app.id], pending_amount: parseFloat(e.target.value) || 0 }
                              }))}
                              className="bg-slate-950/50 border-white/10 text-white h-9 text-sm rounded-lg"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-slate-500 text-[10px] uppercase flex items-center gap-1">
                              <Phone className="h-3 w-3" /> Manager Phone
                            </Label>
                            <Input
                              value={paymentEdits[app.id].manager_phone}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPaymentEdits(prev => ({
                                ...prev,
                                [app.id]: { ...prev[app.id], manager_phone: e.target.value }
                              }))}
                              className="bg-slate-950/50 border-white/10 text-white h-9 text-sm rounded-lg"
                              placeholder="+91 XXXXX XXXXX"
                            />
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => savePayment(app.id)}
                          disabled={updatingId === app.id}
                          className="h-9 px-4 rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/25 text-xs font-medium cursor-pointer"
                        >
                          <Save className="mr-1.5 h-3.5 w-3.5" />
                          Save Payment Details
                        </Button>
                      </div>
                    )}

                    {/* Meta */}
                    <p className="text-[10px] text-slate-600">
                      Applied: {new Date(app.created_at).toLocaleString('en-IN')}
                      {app.updated_at !== app.created_at && ` • Updated: ${new Date(app.updated_at).toLocaleString('en-IN')}`}
                    </p>
                  </div>
                )}
              </motion.div>
            )
          })}
          </AnimatePresence>
        </div>
      )}

      {/* Admin Delay Exemption Reason Modal */}
      <AnimatePresence>
        {exemptionModalApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Exempt Creator Delay</h3>
                    <p className="text-[11px] text-slate-400">Waive overdue penalty for {exemptionModalApp.users?.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setExemptionModalApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Select the reason why deliverable is delayed on brand/campaign side. This creator will be <strong>immediately unblocked</strong> from applying to other campaigns.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Standard Reason</Label>
                  <select
                    value={selectedExemptionReason}
                    onChange={(e) => setSelectedExemptionReason(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-amber-400 outline-none"
                  >
                    <option value="Brand parcel/shipment delayed">📦 Brand parcel/shipment delayed</option>
                    <option value="Brand requested content revision">✏️ Brand requested content revision</option>
                    <option value="Shoot/visit rescheduled by brand">🏬 Shoot/visit rescheduled by brand</option>
                    <option value="Brand asked to hold posting">⏸️ Brand asked to hold posting</option>
                    <option value="Sample issue / replacement in transit">🔄 Sample issue / replacement in transit</option>
                    <option value="Creator medical/personal emergency">🏥 Creator personal emergency</option>
                    <option value="Custom">✍️ Custom Reason (Specify Below)</option>
                  </select>
                </div>

                {selectedExemptionReason === 'Custom' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Custom Note / Reason</Label>
                    <Input
                      value={customExemptionReason}
                      onChange={(e) => setCustomExemptionReason(e.target.value)}
                      placeholder="e.g. Brand delayed product launch to next week"
                      className="bg-slate-950 border-white/10 text-white text-xs h-9"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setExemptionModalApp(null)}
                  className="border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const finalReason = selectedExemptionReason === 'Custom' ? (customExemptionReason || 'Admin custom exemption') : selectedExemptionReason
                    updateApplicationTimeline(exemptionModalApp.id, {
                      is_delay_exempted: true,
                      delay_exemption_reason: finalReason,
                    })
                  }}
                  disabled={updatingId === exemptionModalApp.id}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                >
                  Confirm & Unblock Creator
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Revoke Approval Modal with Reasons */}
      <AnimatePresence>
        {revokeModalApp && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Revoke / Cancel Approval</h3>
                    <p className="text-[11px] text-slate-400">Cancel approved collaboration for {revokeModalApp.users?.full_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setRevokeModalApp(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Select why this approval is being revoked. The application will be moved to <strong>Rejected</strong> (allowing creator to re-apply if eligible) and removed from their Approved dashboard.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Reason for Revocation</Label>
                  <select
                    value={selectedRevokeReason}
                    onChange={(e) => setSelectedRevokeReason(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-rose-400 outline-none"
                  >
                    <option value="Accidental approval / Selection misclick">⚠️ Accidental approval / Selection misclick</option>
                    <option value="Brand campaign quota / slots filled">📦 Brand campaign quota / slots filled</option>
                    <option value="Profile / Niche criteria mismatch">🎯 Profile / Niche criteria mismatch</option>
                    <option value="Brand requested to hold/cancel selection">⏸️ Brand requested to hold/cancel selection</option>
                    <option value="Creator unresponsive / unreachable">📵 Creator unresponsive / unreachable</option>
                    <option value="Custom">✍️ Custom Reason (Specify Below)</option>
                  </select>
                </div>

                {selectedRevokeReason === 'Custom' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] text-slate-400 uppercase font-bold">Custom Revocation Note</Label>
                    <Input
                      value={customRevokeReason}
                      onChange={(e) => setCustomRevokeReason(e.target.value)}
                      placeholder="e.g. Brand changed budget structure"
                      className="bg-slate-950 border-white/10 text-white text-xs h-9"
                    />
                  </div>
                )}

                <div className="pt-2">
                  <label className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-950/60 border border-white/10 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendRevokeEmail}
                      onChange={(e) => setSendRevokeEmail(e.target.checked)}
                      className="h-4 w-4 rounded accent-rose-500 bg-slate-900 border-white/20"
                    />
                    <div>
                      <p className="text-[11px] font-semibold text-white">Send Revocation / Status Update Email to Creator</p>
                      <p className="text-[10px] text-slate-400">Leave unchecked if this was an immediate accidental misclick.</p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRevokeModalApp(null)}
                  className="border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    const finalReason = selectedRevokeReason === 'Custom' ? (customRevokeReason || 'Approval revoked by Admin') : selectedRevokeReason
                    updateStatus(revokeModalApp.id, 'Rejected', {
                      rejection_reason: finalReason,
                      send_email: sendRevokeEmail,
                      is_revert: false,
                    })
                    setRevokeModalApp(null)
                  }}
                  disabled={updatingId === revokeModalApp.id}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                >
                  Confirm Revocation
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sprint 5: Sent to Brand Batch Assignment Modal */}
      <AnimatePresence>
        {showSentModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Mark as Sent to Brand</h3>
                    <p className="text-[11px] text-slate-400">
                      Batch tagging <strong className="text-white">{selectedAppIds.length} creator profiles</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSentModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <XCircle className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs">
                <p className="text-slate-300 leading-relaxed">
                  Assign a batch name or date label so your team knows these creators have already been submitted to the client brand. Newly arrived profiles in the future will automatically stand out as <strong>Unshared</strong>.
                </p>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Batch Label / Shortlist Name</Label>
                  <Input
                    value={batchLabel}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatchLabel(e.target.value)}
                    placeholder="e.g. Batch #1 - Morning Shortlist (50 creators)"
                    className="bg-slate-950 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] text-slate-400 uppercase font-bold">Notes / Client Feedback Reference (Optional)</Label>
                  <Input
                    value={batchNotes}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatchNotes(e.target.value)}
                    placeholder="e.g. Emailed to Brand POC Rajesh on 23rd Aug"
                    className="bg-slate-950 border-white/10 text-white text-xs h-10 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSentModal(false)}
                  className="border-white/10 text-slate-400 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleBatchSentToBrand('mark_sent')}
                  disabled={markingSent}
                  className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold cursor-pointer shadow-md shadow-purple-500/20"
                >
                  {markingSent ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Tagging Batch...
                    </>
                  ) : (
                    <>
                      <Share2 className="mr-1.5 h-3.5 w-3.5" />
                      Confirm & Tag Batch
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CommercialNegotiationModal
        isOpen={Boolean(negotiationModalApp)}
        onClose={() => setNegotiationModalApp(null)}
        application={negotiationModalApp}
        onSuccess={fetchApplications}
      />
    </div>
  )
}
