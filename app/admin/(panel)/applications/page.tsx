'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, CheckCircle2, XCircle, Send,
  Instagram, Users, MapPin, ChevronDown, ChevronUp,
  DollarSign, Phone, Search, Filter, Megaphone
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { GlobalLoader } from '@/components/ui/global-loader'
import { toast } from 'sonner'
import Link from 'next/link'

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

interface CampaignInfo {
  brand_name: string
  campaign_code: string
  platform: string
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
  campaigns: CampaignInfo
}

const statusColors: Record<string, string> = {
  'Applied': 'bg-blue-500/15 text-blue-300 border-blue-500/20',
  'Approved': 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
  'Rejected': 'bg-red-500/15 text-red-300 border-red-500/20',
  'Completed': 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  'Payment Initiated': 'bg-amber-500/15 text-amber-300 border-amber-500/20',
}

const filters = ['All', 'Applied', 'Approved', 'Rejected', 'Completed', 'Payment Initiated']

export default function AllApplicationsPage() {
  const [loading, setLoading] = useState(true)
  const [applications, setApplications] = useState<Application[]>([])
  const [activeFilter, setActiveFilter] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  // Bulk Actions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [])

  const fetchApplications = async () => {
    try {
      const res = await fetch(`/api/admin/applications`)
      const data = await res.json()
      setApplications(data.applications || [])
    } catch {
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const handleBulkAction = async (newStatus: string) => {
    if (selectedIds.size === 0) return

    setBulkUpdating(true)
    try {
      const res = await fetch(`/api/admin/applications/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationIds: Array.from(selectedIds),
          status: newStatus
        }),
      })
      if (!res.ok) throw new Error('Failed to perform bulk update')

      setApplications(prev =>
        prev.map(a => selectedIds.has(a.id) ? { ...a, status: newStatus } : a)
      )
      toast.success(`${selectedIds.size} applications ${newStatus.toLowerCase()}`)
      setSelectedIds(new Set()) // Clear selection after success
    } catch {
      toast.error('Failed to perform bulk action')
    } finally {
      setBulkUpdating(false)
    }
  }

  const filtered = applications.filter(a => {
    const matchesFilter = activeFilter === 'All' || a.status === activeFilter
    const user = a.users
    const camp = a.campaigns
    const searchString = `${user?.full_name} ${user?.influencer_id} ${user?.instagram_username} ${user?.email} ${camp?.brand_name} ${camp?.campaign_code}`.toLowerCase()
    const matchesSearch = searchString.includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set()) // Deselect all
    } else {
      setSelectedIds(new Set(filtered.map(a => a.id))) // Select all filtered
    }
  }

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedIds(newSelection)
  }

  if (loading) {
    return <GlobalLoader text="Loading Applications..." />
  }

  return (
    <div className="space-y-6 pb-24 relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-400" />
            All Applications
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage applications dynamically across all active campaigns — {applications.length} total
          </p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-slate-900/40 p-1.5 rounded-2xl border border-white/5">
        <div className="flex overflow-x-auto w-full sm:w-auto p-1 hide-scrollbar gap-1.5">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => { setActiveFilter(f); setSelectedIds(new Set()) }} // clear selection on filter change
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer border whitespace-nowrap shrink-0 ${
                activeFilter === f
                  ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20 shadow-lg shadow-indigo-500/10'
                  : 'bg-transparent text-slate-400 border-transparent hover:bg-white/5 hover:text-white'
              }`}
            >
              {f}
              {f !== 'All' && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  ({applications.filter(a => a.status === f).length})
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64 shrink-0 px-1 pb-1 sm:px-0 sm:pb-0 sm:pr-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchQuery(e.target.value); setSelectedIds(new Set()) }}
            placeholder="Search applicants or brands..."
            className="pl-10 bg-slate-900/50 border-white/10 text-white h-10 text-sm focus-visible:ring-indigo-500 rounded-xl w-full transition-all hover:bg-slate-900/80"
          />
        </div>
      </div>

      {/* Selection Control Bar */}
      {filtered.length > 0 && (
        <div className="flex items-center gap-3 px-2 py-1">
           <label className="flex items-center gap-3 group cursor-pointer">
             <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${selectedIds.size === filtered.length && filtered.length > 0 ? 'bg-indigo-500 border-indigo-500 text-white' : selectedIds.size > 0 ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400'  : 'border-slate-600 bg-slate-800/50 group-hover:border-slate-500'}`}>
               <input
                 type="checkbox"
                 className="hidden"
                 checked={selectedIds.size === filtered.length && filtered.length > 0}
                 onChange={handleSelectAll}
               />
               {(selectedIds.size === filtered.length && filtered.length > 0) && <CheckCircle2 className="h-3.5 w-3.5" />}
               {(selectedIds.size > 0 && selectedIds.size < filtered.length) && <div className="w-2.5 h-0.5 bg-current rounded-full" />}
             </div>
             <span className="text-sm font-medium text-slate-400 group-hover:text-slate-300">
                {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select All'}
             </span>
           </label>
        </div>
      )}

      {/* Applications List */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 rounded-3xl border border-white/5 bg-slate-900/20 border-dashed">
          <Filter className="h-12 w-12 text-slate-600 mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold text-slate-400">No applications found</h3>
          <p className="text-sm text-slate-500 mt-2">
            {activeFilter !== 'All' || searchQuery ? 'Try adjusting your filters or search query' : 'Applications will appear here when influencers apply'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((app, i) => {
              const isExpanded = expandedId === app.id
              const isSelected = selectedIds.has(app.id)
              const user = app.users
              const camp = app.campaigns

              return (
                <motion.div
                  layout
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2, delay: i * 0.03 }}
                  className={`rounded-2xl border bg-slate-900/60 backdrop-blur-lg overflow-hidden transition-all ${
                    isSelected ? 'border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : isExpanded ? 'border-white/20 shadow-xl shadow-indigo-500/5' : 'border-white/5 hover:border-white/10'
                  }`}
                >
                {/* Main Row */}
                <div className="flex items-stretch min-h-[5rem]">
                  {/* Select Trigger */}
                  <div 
                    className="pl-5 pr-3 py-4 flex items-center cursor-pointer hover:bg-white/[0.03] transition-colors border-r border-transparent"
                    onClick={(e) => { e.stopPropagation(); toggleSelection(app.id) }}
                  >
                     <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'}`}>
                       {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                     </div>
                  </div>

                  {/* Expansion Trigger */}
                  <div
                    className="flex-1 flex items-center justify-between pr-5 py-4 cursor-pointer hover:bg-white/[0.02] transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : app.id)}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white shrink-0">
                        {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                           <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Unknown'}</p>
                           <p className="text-[11px] font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 w-fit flex items-center gap-1 border border-white/5 truncate">
                             <Megaphone className="h-3 w-3 text-slate-500" />
                             {camp?.brand_name || 'Global'}
                           </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                          <span>{user?.influencer_id}</span>
                          {user?.instagram_username && (
                            <span className="flex items-center gap-0.5">
                              <Instagram className="h-3 w-3 text-pink-400" />
                              {user.instagram_username}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 pl-4">
                      <span className={`rounded-full px-3 py-1 text-[11px] font-medium border ${statusColors[app.status] || 'bg-slate-500/15 text-slate-300 border-slate-500/20'}`}>
                        {app.status}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-5 py-5 space-y-5 bg-slate-950/20">
                    {/* User Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Email</p>
                        <p className="text-slate-300 truncate">{user?.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Mobile</p>
                        <p className="text-slate-300">{user?.mobile || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Location</p>
                        <p className="text-slate-300 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {[user?.city, user?.state].filter(Boolean).join(', ') || '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">Followers</p>
                        <p className="text-slate-300 font-medium">
                          {user?.followers > 0 ? user.followers.toLocaleString() : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between">
                       <p className="text-[10px] text-slate-600 font-medium">
                         Applied: {new Date(app.created_at).toLocaleString('en-IN')}
                         {app.updated_at !== app.created_at && ` • Updated: ${new Date(app.updated_at).toLocaleString('en-IN')}`}
                       </p>
                       <Link href={`/admin/applications/${app.campaigns?.campaign_code || app.id}`}>
                           <Button variant="link" className="h-auto p-0 text-[11px] text-indigo-400">View Full Campaign Context →</Button>
                       </Link>
                    </div>
                  </div>
                )}
              </motion.div>
            )
          })}
          </AnimatePresence>
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-6 px-6 py-4 bg-slate-900 border border-white/10 shadow-2xl shadow-indigo-500/10 rounded-2xl backdrop-blur-xl ml-32"
          >
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">{selectedIds.size} Applications</span>
              <span className="text-[11px] text-slate-400">Selected for action</span>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkAction('Rejected')}
                disabled={bulkUpdating}
                className="h-9 px-4 rounded-xl border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 bg-slate-950 font-medium cursor-pointer"
              >
                {bulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => handleBulkAction('Approved')}
                disabled={bulkUpdating}
                className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 border-none font-medium cursor-pointer"
              >
                {bulkUpdating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Approve
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
