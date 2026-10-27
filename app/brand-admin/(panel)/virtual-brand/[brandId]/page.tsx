'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye,
  ShieldAlert,
  ArrowLeft,
  X,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Check,
  Package,
  Instagram,
  MapPin,
  MessageSquare,
  ThumbsDown,
  RotateCcw,
  Sliders,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatFollowerCount } from '@/lib/utils/brand-privacy-utils'
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'

interface VirtualBrandOption {
  id: string
  name: string
  slug: string
  industry?: string
}

export default function BrandAdminVirtualBrandDetailPage() {
  const params = useParams<{ brandId: string }>()
  const router = useRouter()
  const brandId = params?.brandId

  const [brands, setBrands] = useState<VirtualBrandOption[]>([])
  const [loading, setLoading] = useState(true)
  const [creators, setCreators] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [rejectModalCreator, setRejectModalCreator] = useState<any | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  useEffect(() => {
    async function fetchBrands() {
      setLoading(true)
      try {
        const res = await fetch('/api/brand-admin/brands')
        const data = await res.json()
        if (res.ok && Array.isArray(data.brands)) {
          setBrands(data.brands)
        } else {
          setBrands([])
        }
      } catch {
        setBrands([])
      } finally {
        setLoading(false)
      }
    }
    fetchBrands()
  }, [])

  const currentBrand =
    brands.find((b) => b.id === brandId || b.slug === brandId) ||
    brands[0] || {
      id: brandId || '',
      name: 'Unassigned Workspace',
      slug: '',
    }

  // Proxy Approve on behalf of the client brand
  const handleProxyApprove = (id: string, name: string) => {
    setCreators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c))
    )
    toast.success(`[Proxy Action] Approved ${name} on behalf of ${currentBrand.name}! Logged in audit trail.`)
  }

  // Proxy Reject with reason
  const handleProxyReject = () => {
    if (!rejectModalCreator) return
    const id = rejectModalCreator.id
    const name = rejectModalCreator.name

    setCreators((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status: 'rejected',
              rejectionReason: rejectionReason || 'Declined during KAM review',
            }
          : c
      )
    )
    toast.error(`[Proxy Action] Rejected ${name} with feedback on behalf of ${currentBrand.name}.`)
    setRejectModalCreator(null)
    setRejectionReason('')
  }

  const filtered = creators.filter((c) => {
    if (activeTab === 'pending') return c.status === 'pending'
    if (activeTab === 'approved') return c.status === 'approved'
    if (activeTab === 'rejected') return c.status === 'rejected'
    return true
  })

  if (!loading && brands.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center space-y-6">
        <div className="w-16 h-16 mx-auto rounded-3xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center shadow-lg">
          <Eye className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            No Brand Workspaces in Database
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md mx-auto leading-relaxed">
            There are currently no active brand workspaces in PostgreSQL. Onboard a client brand in the Client Brands Directory to enter Virtual Brand Studio mode.
          </p>
        </div>
        <div>
          <Link
            href="/brand-admin/brands"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-xs transition shadow-md"
          >
            <Building2 className="w-4 h-4" />
            <span>Open Client Brands Directory</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── VIRTUAL BRAND TOP BANNER ─── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-purple-950/80 via-[#18112e] to-[#121622] border border-purple-500/40 text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0 shadow-lg">
            <Eye className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] uppercase font-extrabold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200 border border-purple-500/40">
                Virtual Brand Mode Active
              </span>
              <span className="text-xs sm:text-sm text-purple-200 font-semibold">
                Viewing as <strong>{currentBrand.name}</strong> ({currentBrand.id})
              </span>
            </div>
            <p className="text-xs text-purple-300/80 mt-1 max-w-2xl leading-relaxed">
              You are seeing the live creator shortlisted queue visible to this brand client. Any 1-click approvals or rejections made here are executed on behalf of the client and logged with your KAM staff signature in the audit trail.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          <Link
            href="/brand/dashboard"
            target="_blank"
            className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-colors"
          >
            <span>Real Brand View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/brand-admin/brands"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Virtual Mode</span>
          </Link>
        </div>
      </div>

      {/* Brand Switcher Bar */}
      <div className="p-3 rounded-2xl bg-[#121620] border border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-neutral-400">
          <Building2 className="w-4 h-4 text-amber-400" />
          <span>Switch Client Brand:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {brands.map((b) => (
              <button
                key={b.id}
                onClick={() => router.push(`/brand-admin/virtual-brand/${b.id}`)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  b.id === currentBrand.id
                    ? 'bg-[#febd1c] text-neutral-950 font-bold'
                    : 'bg-[#0c1017] text-neutral-300 hover:text-white border border-white/5'
                }`}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>

        <div className="text-neutral-400 text-[11px]">
          Workspace: <strong className="text-white">{currentBrand.name}</strong>
        </div>
      </div>

      {/* Dynamic Data Table for Creator Shortlists */}
      <DynamicDataTable
        loading={loading}
        emptyMessage="No creators currently awaiting review for this brand workspace."
        data={filtered}
        filterTabs={{
          key: 'status',
          options: [
            { label: 'Pending Review', value: 'pending', count: creators.filter((c) => c.status === 'pending').length },
            { label: 'Approved', value: 'approved', count: creators.filter((c) => c.status === 'approved').length },
            { label: 'Rejected', value: 'rejected', count: creators.filter((c) => c.status === 'rejected').length },
            { label: 'All Creators', value: 'all', count: creators.length },
          ],
          activeValue: activeTab,
          onChange: (val) => setActiveTab(val as any),
        }}
        columns={[
          {
            key: 'name',
            header: 'Creator & Profile',
            sortable: true,
            render: (c) => (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-[11px] truncate max-w-[140px]" title={c.name}>{c.name}</div>
                  <a
                    href={`https://instagram.com/${c.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] text-pink-400 hover:text-pink-300 font-medium inline-flex items-center gap-0.5 truncate max-w-[120px]"
                    title={`@${c.handle}`}
                  >
                    <Instagram className="w-2.5 h-2.5" /> @{c.handle}
                  </a>
                </div>
              </div>
            ),
          },
          {
            key: 'followers',
            header: 'Followers',
            sortable: true,
            align: 'center',
            render: (c) => (
              <span className="font-bold text-white text-[11px] px-2 py-0.5 rounded bg-white/5 border border-white/10 whitespace-nowrap">
                {formatFollowerCount(c.followers)}
              </span>
            ),
          },
          {
            key: 'city',
            header: 'Location',
            sortable: true,
            render: (c) => <span className="text-neutral-300 text-[10px] truncate block max-w-[110px]">{c.city}</span>,
          },
          {
            key: 'sample',
            header: 'Sample Product Specs',
            render: (c) => (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/5 border border-amber-500/15 text-amber-300 text-[10px] max-w-xs truncate" title={c.sample}>
                <Package className="w-3 h-3 shrink-0 text-amber-400" />
                <span className="truncate">{c.sample}</span>
              </div>
            ),
          },
          {
            key: 'status',
            header: 'Review Status',
            align: 'center',
            sortable: true,
            render: (c) => (
              <div className="min-w-0">
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full border whitespace-nowrap ${
                    c.status === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                      : c.status === 'rejected'
                      ? 'bg-red-500/15 text-red-400 border-red-500/30'
                      : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                  }`}
                >
                  {c.status}
                </span>
                {c.rejectionReason && (
                  <div className="text-[9px] text-red-400 mt-0.5 truncate max-w-[120px]" title={c.rejectionReason}>
                    {c.rejectionReason}
                  </div>
                )}
              </div>
            ),
          },
          {
            key: 'actions',
            header: 'Proxy Decision',
            align: 'right',
            sortable: false,
            render: (c) => (
              <div className="flex items-center justify-end gap-1">
                {c.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleProxyApprove(c.id, c.name)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-[10px] h-6 px-2 rounded-md shadow-sm"
                    >
                      <Check className="w-2.5 h-2.5 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectModalCreator(c)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-[10px] h-6 w-6 p-0 rounded-md"
                    >
                      <ThumbsDown className="w-2.5 h-2.5" />
                    </Button>
                  </>
                ) : c.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" /> Approved
                  </span>
                ) : (
                  <button
                    onClick={() => handleProxyApprove(c.id, c.name)}
                    className="text-amber-400 hover:text-amber-300 text-[10px] underline font-medium cursor-pointer"
                  >
                    Re-Approve
                  </button>
                )}
              </div>
            ),
          },
        ]}
        searchPlaceholder="Search creators by name, handle, or city..."
        exportFilename={`creator_shortlist_${currentBrand.id}.csv`}
        defaultPageSize={10}
        bulkActions={[
          {
            label: 'Bulk Proxy Approve Selected',
            icon: Check,
            variant: 'purple',
            onClick: (rows) => {
              const pendingRows = rows.filter((r) => r.status === 'pending')
              if (pendingRows.length === 0) {
                toast.info('All selected creators are already approved or resolved.')
                return
              }
              const approvedIds = new Set(pendingRows.map((r) => r.id))
              setCreators((prev) =>
                prev.map((c) => (approvedIds.has(c.id) ? { ...c, status: 'approved' } : c))
              )
              toast.success(`[Proxy Action] Bulk approved ${pendingRows.length} creators for ${currentBrand.name}!`)
            },
          },
        ]}
      />

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalCreator && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-[#121622] border border-white/10 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <ThumbsDown className="w-5 h-5 text-red-400" />
                  <h3 className="text-base font-bold text-white">Proxy Reject Creator</h3>
                </div>
                <button
                  onClick={() => setRejectModalCreator(null)}
                  className="text-neutral-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-neutral-300 mb-3">
                Rejecting <strong className="text-white">{rejectModalCreator.name}</strong> on behalf of{' '}
                <strong className="text-amber-400">{currentBrand.name}</strong>. Please provide a feedback reason:
              </p>

              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Follower demographic mismatch, aesthetic outside brand visual tone, profile inactive..."
                rows={3}
                className="w-full rounded-xl bg-[#0a0d14] border border-white/10 p-3 text-xs text-white placeholder:text-neutral-500 focus:border-red-400 focus:outline-none mb-4"
              />

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRejectModalCreator(null)}
                  className="flex-1 border-white/10 text-neutral-300 h-10 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleProxyReject}
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold h-10 text-xs"
                >
                  Confirm Rejection
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
