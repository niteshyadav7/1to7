'use client'

import { useState, useEffect, use } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  ArrowLeft, Loader2, CheckCircle2, XCircle, Send,
  Instagram, Users, MapPin, ChevronDown, ChevronUp,
  DollarSign, Phone, Save, Search
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'

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
}

interface Application {
  id: string
  status: string
  form_data: Record<string, any>
  partial_payment: number
  final_payment: number
  pending_amount: number
  manager_phone: string
  created_at: string
  updated_at: string
  users: UserInfo
}

interface CampaignInfo {
  brand_name: string
  campaign_code: string
  platform: string
}

const statusColors: Record<string, string> = {
  'Applied': 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  'Approved': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Rejected': 'bg-red-500/15 text-red-300 border-red-500/20',
  'Completed': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Payment Initiated': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
}

const filters = ['All', 'Applied', 'Approved', 'Rejected', 'Completed', 'Payment Initiated']

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

  const updateStatus = async (appId: string, newStatus: string) => {
    setUpdatingId(appId)
    try {
      const res = await fetch(`/api/admin/applications/${appId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update')

      setApplications(prev =>
        prev.map(a => a.id === appId ? { ...a, status: newStatus } : a)
      )
      toast.success(`Application ${newStatus.toLowerCase()}`)
    } catch {
      toast.error('Failed to update status')
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

  const filtered = applications.filter(a => {
    const matchesFilter = activeFilter === 'All' || a.status === activeFilter
    const user = a.users
    const searchString = `${user?.full_name} ${user?.influencer_id} ${user?.instagram_username} ${user?.email}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/admin/campaigns">
          <button className="flex items-center justify-center h-9 w-9 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all cursor-pointer">
            <ArrowLeft className="h-4 w-4" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Applications</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {campaign?.brand_name || 'Campaign'} ({campaign?.campaign_code}) — {applications.length} applicants
          </p>
        </div>
      </div>

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

      {/* Applications */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Send className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-400">No applications found</h3>
          <p className="text-sm text-slate-500 mt-2">
            {activeFilter !== 'All' || searchQuery ? 'Try a different filter or search query' : 'Applications will appear here when influencers apply'}
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
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white shrink-0">
                      {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Unknown'}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        <span>{user?.influencer_id}</span>
                        {user?.instagram_username && (
                          <a href={`https://instagram.com/${user.instagram_username.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 hover:text-indigo-400 hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>
                            <Instagram className="h-3 w-3 text-pink-400" />
                            {user.instagram_username}
                          </a>
                        )}
                        {user?.followers > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Users className="h-3 w-3" />
                            {user.followers.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
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
                              <a href={`https://instagram.com/${user.instagram_username.replace('@', '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-indigo-400 hover:underline transition-colors" onClick={(e) => e.stopPropagation()}>
                                <Instagram className="h-3 w-3 text-pink-400" />
                                {user.instagram_username}
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

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      {app.status === 'Applied' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(app.id, 'Approved')}
                            disabled={updatingId === app.id}
                            className="h-9 px-4 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 hover:bg-emerald-500/25 text-xs font-medium cursor-pointer"
                          >
                            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => updateStatus(app.id, 'Rejected')}
                            disabled={updatingId === app.id}
                            className="h-9 px-4 rounded-lg bg-red-500/15 text-red-300 border border-red-500/20 hover:bg-red-500/25 text-xs font-medium cursor-pointer"
                          >
                            <XCircle className="mr-1.5 h-3.5 w-3.5" />
                            Reject
                          </Button>
                        </>
                      )}
                      {app.status === 'Approved' && (
                        <>
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
                            <DollarSign className="mr-1.5 h-3.5 w-3.5" />
                            Initiate Payment
                          </Button>
                        </>
                      )}
                    </div>

                    {/* Payment Section */}
                    {(app.status === 'Approved' || app.status === 'Completed' || app.status === 'Payment Initiated') && paymentEdits[app.id] && (
                      <div className="rounded-xl border border-white/5 bg-slate-950/40 p-4 space-y-4">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5" />
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
    </div>
  )
}
