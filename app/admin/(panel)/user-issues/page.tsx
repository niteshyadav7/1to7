'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  Search,
  Filter,
  RefreshCw,
  Download,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Phone,
  Mail,
  Calendar,
  X,
  MessageSquare,
  Sparkles,
  ChevronDown,
  Trash2,
  ZoomIn,
  MessageCircle,
  Share2,
  FileText,
  ShieldCheck,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { getFastCache, setFastCache } from '@/lib/utils/cache-utils'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface UserIssue {
  id: string
  ticket_id: string
  name: string
  email: string
  mobile: string
  source_page: 'login' | 'signup'
  issue_type: string
  description: string
  screenshot_url?: string | null
  screenshot_name?: string | null
  status: 'pending' | 'in_progress' | 'resolved' | 'rejected'
  admin_notes?: string | null
  resolved_by?: string | null
  resolved_at?: string | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
  updated_at: string
}

interface IssueStats {
  total: number
  pending: number
  inProgress: number
  resolved: number
  rejected: number
}

const CATEGORY_LABELS: Record<string, string> = {
  otp_not_received: 'OTP Not Received',
  login_failed: 'Login / Password Error',
  signup_failed: 'Signup Registration Issue',
  recaptcha_stuck: 'reCAPTCHA Verification',
  other: 'General Technical Trouble',
}

export default function AdminUserIssuesPage() {
  const { can, isSuperAdmin } = useAdminPermissions()
  const canEdit = isSuperAdmin || can('user_issues', 'edit')
  const canDelete = isSuperAdmin || can('user_issues', 'delete')

  const [issues, setIssues] = useState<UserIssue[]>([])
  const [stats, setStats] = useState<IssueStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    rejected: 0,
  })
  const [loading, setLoading] = useState(true)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedSource, setSelectedSource] = useState<string>('all')

  // Selected Issue for Resolution Drawer
  const [selectedIssue, setSelectedIssue] = useState<UserIssue | null>(null)
  const [editStatus, setEditStatus] = useState<string>('pending')
  const [editAdminNotes, setEditAdminNotes] = useState<string>('')
  const [isUpdating, setIsUpdating] = useState(false)

  // Lightbox Image Preview
  const [previewImage, setPreviewImage] = useState<string | null>(null)

  // Delete Alert Dialog
  const [issueToDelete, setIssueToDelete] = useState<UserIssue | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const fetchIssues = async (isBackground = false) => {
    if (!isBackground && issues.length === 0) setLoading(true)
    try {
      const params = new URLSearchParams()
      if (selectedStatus !== 'all') params.set('status', selectedStatus)
      if (selectedCategory !== 'all') params.set('category', selectedCategory)
      if (selectedSource !== 'all') params.set('source', selectedSource)
      if (searchQuery.trim()) params.set('q', searchQuery.trim())

      const res = await fetch(`/api/admin/user-issues?${params.toString()}`)
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to load user issues')

      setIssues(data.issues || [])
      if (data.stats) setStats(data.stats)
      if (selectedStatus === 'all' && selectedCategory === 'all' && selectedSource === 'all' && !searchQuery.trim()) {
        setFastCache('admin_user_issues_cache', data)
      }
    } catch (err: any) {
      if (!isBackground) toast.error(err.message || 'Error loading user issues')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const cached = getFastCache<any>('admin_user_issues_cache')
    if (cached && selectedStatus === 'all' && selectedCategory === 'all' && selectedSource === 'all' && !searchQuery.trim()) {
      setIssues(cached.issues || [])
      if (cached.stats) setStats(cached.stats)
      setLoading(false)
      fetchIssues(true)
    } else {
      fetchIssues(false)
    }
  }, [selectedStatus, selectedCategory, selectedSource])

  useEffect(() => {
    fetchIssues()
  }, [selectedStatus, selectedCategory, selectedSource])

  // Local filter for instant typing feedback
  const filteredIssues = useMemo(() => {
    if (!searchQuery.trim()) return issues
    const q = searchQuery.toLowerCase().trim()
    const qDigits = searchQuery.replace(/\D/g, '')
    return issues.filter((item) => {
      const matchPhone = (item.mobile && item.mobile.toLowerCase().includes(q)) ||
        (qDigits.length >= 3 && item.mobile && item.mobile.replace(/\D/g, '').includes(qDigits))

      return (
        matchPhone ||
        item.ticket_id.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      )
    })
  }, [issues, searchQuery])

  // Open Drawer and initialize edit form
  const handleOpenDetails = (issue: UserIssue) => {
    setSelectedIssue(issue)
    setEditStatus(issue.status)
    setEditAdminNotes(issue.admin_notes || '')
  }

  // Handle Save Status & Notes
  const handleUpdateIssue = async () => {
    if (!selectedIssue) return
    setIsUpdating(true)
    try {
      const res = await fetch(`/api/admin/user-issues/${selectedIssue.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editStatus,
          admin_notes: editAdminNotes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update issue')

      toast.success('Ticket updated successfully!')
      // Update local state
      setIssues((prev) =>
        prev.map((i) => (i.id === selectedIssue.id ? { ...i, ...data.issue } : i))
      )
      setSelectedIssue(data.issue)
      fetchIssues()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update issue')
    } finally {
      setIsUpdating(false)
    }
  }

  // Handle Quick Status Change from row
  const handleQuickStatusChange = async (issueId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/user-issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update status')

      toast.success(`Status changed to ${newStatus.replace('_', ' ')}`)
      setIssues((prev) =>
        prev.map((i) => (i.id === issueId ? { ...i, status: newStatus as any } : i))
      )
      fetchIssues()
    } catch (err: any) {
      toast.error(err.message || 'Failed to update status')
    }
  }

  // Handle Delete
  const handleDeleteIssue = async () => {
    if (!issueToDelete) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/user-issues/${issueToDelete.id}`, {
        method: 'DELETE',
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete issue')

      toast.success('Ticket deleted successfully')
      setIssues((prev) => prev.filter((i) => i.id !== issueToDelete.id))
      if (selectedIssue?.id === issueToDelete.id) setSelectedIssue(null)
      fetchIssues()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete issue')
    } finally {
      setIsDeleting(false)
      setIssueToDelete(null)
    }
  }

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredIssues.length === 0) {
      toast.error('No issues to export')
      return
    }

    const headers = [
      'Ticket ID',
      'Date',
      'Source Page',
      'Name',
      'Email',
      'Mobile',
      'Category',
      'Status',
      'Description',
      'Admin Notes',
      'Screenshot URL',
    ]

    const rows = filteredIssues.map((i) => [
      i.ticket_id,
      new Date(i.created_at).toLocaleString(),
      i.source_page,
      `"${i.name.replace(/"/g, '""')}"`,
      i.email,
      i.mobile,
      CATEGORY_LABELS[i.issue_type] || i.issue_type,
      i.status,
      `"${i.description.replace(/"/g, '""')}"`,
      `"${(i.admin_notes || '').replace(/"/g, '""')}"`,
      i.screenshot_url || 'None',
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `user_issues_${Date.now()}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Issues exported to CSV successfully')
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="h-3 w-3" /> Pending
          </span>
        )
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <RefreshCw className="h-3 w-3 animate-spin" /> In Progress
          </span>
        )
      case 'resolved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Resolved
          </span>
        )
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="h-3 w-3" /> Rejected / Spam
          </span>
        )
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-400">
            {status}
          </span>
        )
    }
  }

  return (
    <>
      <SetAdminHeader>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-pink-400" /> User Auth Issues & Support
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time issues reported by creators facing problems during Login or Signup.
          </p>
        </div>
      </SetAdminHeader>

      <div className="space-y-6 text-slate-100">
        {/* KPI Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400 shrink-0">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Reports</p>
              <h3 className="text-2xl font-extrabold text-white mt-0.5">{stats.total}</h3>
            </div>
          </div>

          {/* Pending */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Action</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-0.5">{stats.pending}</h3>
            </div>
          </div>

          {/* In Progress */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
              <RefreshCw className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
              <h3 className="text-2xl font-extrabold text-blue-400 mt-0.5">{stats.inProgress}</h3>
            </div>
          </div>

          {/* Resolved */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Resolved</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-0.5">{stats.resolved}</h3>
            </div>
          </div>
        </div>

        {/* Action Controls & Filters */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col lg:flex-row gap-3.5 justify-between items-stretch lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search ticket ID, name, email, mobile..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 h-10 rounded-xl text-xs focus-visible:ring-pink-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 text-white text-xs h-10 rounded-xl px-3 outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer"
              >
                <option value="all">All Categories</option>
                <option value="otp_not_received">OTP Not Received</option>
                <option value="login_failed">Login Failed</option>
                <option value="signup_failed">Signup Issue</option>
                <option value="recaptcha_stuck">reCAPTCHA Error</option>
                <option value="other">Other Issues</option>
              </select>

              {/* Source Filter */}
              <select
                value={selectedSource}
                onChange={(e) => setSelectedSource(e.target.value)}
                className="bg-slate-950/80 border border-slate-800 text-white text-xs h-10 rounded-xl px-3 outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer"
              >
                <option value="all">All Sources</option>
                <option value="login">Login Page</option>
                <option value="signup">Signup Page</option>
              </select>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchIssues()}
                disabled={loading}
                className="bg-slate-950/80 border-slate-800 hover:bg-slate-800 text-slate-300 h-10 px-3.5 rounded-xl cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>

              {/* Export CSV */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="bg-slate-950/80 border-slate-800 hover:bg-slate-800 text-slate-300 h-10 px-3.5 rounded-xl cursor-pointer"
              >
                <Download className="h-3.5 w-3.5 mr-1.5 text-pink-400" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-2 border-t border-slate-800/80 pt-3.5 overflow-x-auto">
            {[
              { key: 'all', label: 'All Statuses', count: stats.total },
              { key: 'pending', label: 'Pending', count: stats.pending },
              { key: 'in_progress', label: 'In Progress', count: stats.inProgress },
              { key: 'resolved', label: 'Resolved', count: stats.resolved },
              { key: 'rejected', label: 'Rejected / Spam', count: stats.rejected },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setSelectedStatus(tab.key)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer ${
                  selectedStatus === tab.key
                    ? 'bg-pink-500 text-white shadow-md'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80'
                }`}
              >
                {tab.label}
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono ${
                    selectedStatus === tab.key ? 'bg-black/25 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Issues List Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
          {loading && issues.length === 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Ticket & Source</th>
                    <th className="p-4">User Details</th>
                    <th className="p-4">Category & Description</th>
                    <th className="p-4">Screenshot</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Reported</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Array.from({ length: 6 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse border-b border-slate-800/60">
                      <td className="p-4">
                        <div className="space-y-1.5">
                          <div className="w-16 h-3 rounded bg-slate-800" />
                          <div className="w-20 h-5 rounded-full bg-slate-800" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1.5">
                          <div className="w-28 h-3.5 rounded bg-slate-800" />
                          <div className="w-20 h-2.5 rounded bg-slate-800/60" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 max-w-xs">
                          <div className="w-24 h-4 rounded bg-slate-800" />
                          <div className="w-48 h-3 rounded bg-slate-800/60" />
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-800" />
                      </td>
                      <td className="p-4">
                        <div className="w-24 h-6 rounded-full bg-slate-800" />
                      </td>
                      <td className="p-4">
                        <div className="w-20 h-3 rounded bg-slate-800" />
                      </td>
                      <td className="p-4 text-right">
                        <div className="w-16 h-7 rounded-lg bg-slate-800 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : filteredIssues.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
              <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h4 className="text-base font-bold text-white">No Issues Found</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                No user issue reports match your selected status, category, or search filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-bold border-b border-slate-800">
                  <tr>
                    <th className="p-4">Ticket & Source</th>
                    <th className="p-4">User Details</th>
                    <th className="p-4">Category & Description</th>
                    <th className="p-4">Screenshot</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Reported</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredIssues.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                      onClick={() => handleOpenDetails(item)}
                    >
                      {/* Ticket & Source */}
                      <td className="p-4 align-top">
                        <div className="space-y-1">
                          <span className="font-mono font-bold text-pink-400 tracking-wider text-[11px] bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">
                            {item.ticket_id}
                          </span>
                          <div>
                            <span
                              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded uppercase ${
                                item.source_page === 'signup'
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {item.source_page} Page
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* User Info */}
                      <td className="p-4 align-top">
                        <div className="space-y-1">
                          <p className="font-bold text-white text-xs">{item.name}</p>
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Phone className="h-3 w-3 text-emerald-400" />
                            <a
                              href={`tel:+91${item.mobile}`}
                              onClick={(e) => e.stopPropagation()}
                              className="font-mono text-emerald-400 hover:underline"
                            >
                              +91 {item.mobile}
                            </a>
                            <a
                              href={`https://wa.me/91${item.mobile}?text=${encodeURIComponent(
                                `Hello ${item.name}, this is 1to7 Media support regarding your issue ticket ${item.ticket_id}.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-1 text-emerald-400 hover:text-emerald-300"
                              title="Message on WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Mail className="h-3 w-3" />
                            <a
                              href={`mailto:${item.email}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:text-slate-200 truncate max-w-[170px]"
                            >
                              {item.email}
                            </a>
                          </div>
                        </div>
                      </td>

                      {/* Category & Description */}
                      <td className="p-4 align-top max-w-sm">
                        <div className="space-y-1">
                          <span className="inline-block text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            {CATEGORY_LABELS[item.issue_type] || item.issue_type}
                          </span>
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {item.description}
                          </p>
                          {item.admin_notes && (
                            <p className="text-[10px] text-emerald-400 bg-emerald-500/10 p-1.5 rounded border border-emerald-500/20 font-medium">
                              Note: {item.admin_notes}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Screenshot Thumbnail */}
                      <td className="p-4 align-top">
                        {item.screenshot_url ? (
                          <div
                            onClick={(e) => {
                              e.stopPropagation()
                              setPreviewImage(item.screenshot_url!)
                            }}
                            className="relative group/thumb h-12 w-12 rounded-lg overflow-hidden border border-slate-700 bg-slate-950 cursor-pointer shadow hover:border-pink-500 transition-all"
                            title="Click to view full screenshot"
                          >
                            <img
                              src={item.screenshot_url}
                              alt="Screenshot"
                              className="h-full w-full object-cover group-hover/thumb:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity">
                              <ZoomIn className="h-4 w-4 text-white" />
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">No image</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-4 align-top">
                        {getStatusBadge(item.status)}
                      </td>

                      {/* Reported Date */}
                      <td className="p-4 align-top text-slate-400 text-[11px] whitespace-nowrap">
                        <div className="space-y-0.5">
                          <p className="text-slate-300 font-medium">
                            {new Date(item.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-[10px] text-slate-500 font-mono">
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="p-4 align-top text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => handleOpenDetails(item)}
                            className="bg-slate-800 hover:bg-slate-700 text-white text-[11px] h-8 px-2.5 rounded-lg cursor-pointer"
                          >
                            Manage
                          </Button>

                          {canDelete && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setIssueToDelete(item)}
                              className="text-slate-500 hover:text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 rounded-lg cursor-pointer"
                              title="Delete Ticket"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Details & Resolution Drawer / Modal */}
      <AnimatePresence>
        {selectedIssue && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white my-auto max-h-[90vh] flex flex-col"
            >
              {/* Drawer Header */}
              <div className="p-5 bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">
                        Ticket {selectedIssue.ticket_id}
                      </h3>
                      {getStatusBadge(selectedIssue.status)}
                    </div>
                    <p className="text-xs text-slate-400">
                      Submitted on {new Date(selectedIssue.created_at).toLocaleString()} from{' '}
                      <span className="font-semibold text-slate-300 capitalize">{selectedIssue.source_page} Page</span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedIssue(null)}
                  className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 space-y-5 overflow-y-auto flex-1">
                {/* User Info Card */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">User Name</p>
                    <p className="text-sm font-bold text-white mt-0.5">{selectedIssue.name}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Mobile Number</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <a
                        href={`tel:+91${selectedIssue.mobile}`}
                        className="text-xs font-mono font-bold text-emerald-400 hover:underline"
                      >
                        +91 {selectedIssue.mobile}
                      </a>
                      <a
                        href={`https://wa.me/91${selectedIssue.mobile}?text=${encodeURIComponent(
                          `Hello ${selectedIssue.name}, this is 1to7 Media team regarding your issue ticket ${selectedIssue.ticket_id}.`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:text-emerald-300"
                        title="Chat on WhatsApp"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Email Address</p>
                    <a
                      href={`mailto:${selectedIssue.email}`}
                      className="text-xs text-pink-400 hover:underline mt-0.5 block truncate"
                    >
                      {selectedIssue.email}
                    </a>
                  </div>
                </div>

                {/* Issue Details Card */}
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Issue Category
                    </p>
                    <span className="text-xs font-bold text-amber-400">
                      {CATEGORY_LABELS[selectedIssue.issue_type] || selectedIssue.issue_type}
                    </span>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                      Problem Description
                    </p>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 text-xs text-slate-200 whitespace-pre-wrap leading-relaxed">
                      {selectedIssue.description}
                    </div>
                  </div>
                </div>

                {/* Screenshot Preview (if present) */}
                {selectedIssue.screenshot_url && (
                  <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                        Screenshot Attachment
                      </p>
                      <a
                        href={selectedIssue.screenshot_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-pink-400 hover:underline inline-flex items-center gap-1"
                      >
                        Open Original <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div
                      onClick={() => setPreviewImage(selectedIssue.screenshot_url!)}
                      className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-950 cursor-pointer max-h-60 flex items-center justify-center group"
                    >
                      <img
                        src={selectedIssue.screenshot_url}
                        alt="Screenshot Preview"
                        className="w-full object-contain max-h-60"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <span className="bg-slate-900/90 text-white text-xs px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5">
                          <ZoomIn className="h-3.5 w-3.5 text-pink-400" /> Click to Zoom
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Update Resolution Section */}
                {canEdit && (
                  <div className="bg-slate-950/80 p-4 rounded-xl border border-pink-500/20 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-pink-400 flex items-center gap-1.5">
                      <ShieldCheck className="h-4 w-4" /> Admin Resolution & Status
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold">Change Status</label>
                        <select
                          value={editStatus}
                          onChange={(e) => setEditStatus(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-700 text-white text-xs h-10 rounded-xl px-3 outline-none focus:ring-1 focus:ring-pink-500 cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="in_progress">In Progress</option>
                          <option value="resolved">Resolved</option>
                          <option value="rejected">Rejected / Spam</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-400 font-semibold">Quick Actions</label>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setEditStatus('resolved')}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-10 flex-1 rounded-xl cursor-pointer"
                          >
                            Mark Resolved
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => setEditStatus('in_progress')}
                            className="bg-blue-600 hover:bg-blue-500 text-white text-xs h-10 flex-1 rounded-xl cursor-pointer"
                          >
                            In Progress
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-semibold">
                        Admin Resolution Remarks / Internal Notes
                      </label>
                      <textarea
                        rows={3}
                        value={editAdminNotes}
                        onChange={(e) => setEditAdminNotes(e.target.value)}
                        placeholder="e.g. Contacted user on WhatsApp, resolved OTP issue, user logged in successfully."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:ring-1 focus:ring-pink-500 resize-none"
                      />
                    </div>

                    <Button
                      onClick={handleUpdateIssue}
                      disabled={isUpdating}
                      className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:opacity-95 text-white font-bold text-xs h-10 rounded-xl cursor-pointer"
                    >
                      {isUpdating ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Updating Ticket...
                        </span>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal for Screenshot Preview */}
      <AnimatePresence>
        {previewImage && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl border border-slate-700 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewImage}
                alt="Enlarged Screenshot"
                className="max-h-[85vh] w-auto object-contain mx-auto"
              />
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <a
                  href={previewImage}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white text-xs flex items-center gap-1.5 border border-slate-700 backdrop-blur-sm"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Open Tab
                </a>
                <button
                  onClick={() => setPreviewImage(null)}
                  className="h-9 w-9 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-white flex items-center justify-center border border-slate-700 cursor-pointer backdrop-blur-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!issueToDelete} onOpenChange={(open) => !open && setIssueToDelete(null)}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle className="text-white">Delete Ticket {issueToDelete?.ticket_id}?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              Are you sure you want to delete this issue report from{' '}
              <span className="text-white font-semibold">{issueToDelete?.name}</span>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2">
            <AlertDialogCancel className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteIssue}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-500 text-white font-bold"
            >
              {isDeleting ? 'Deleting...' : 'Delete Ticket'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
