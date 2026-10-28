'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
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
  Search,
  ArrowRight,
  Layers,
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
  logo_url?: string | null
  active_campaigns?: number
  pending_reviews?: number
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
  const [brandSearch, setBrandSearch] = useState('')

  const filteredBrands = useMemo(() => {
    if (!brandSearch.trim()) return brands
    const q = brandSearch.toLowerCase().trim()
    return brands.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        (b.industry && b.industry.toLowerCase().includes(q))
    )
  }, [brands, brandSearch])

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

  // Fetch real creators shortlisted for this brand
  const fetchCreators = useCallback(async (bId: string, bName: string) => {
    if (!bId && !bName) return
    try {
      const res = await fetch(
        `/api/brand-admin/virtual-brand/creators?brandId=${encodeURIComponent(bId)}&brandName=${encodeURIComponent(bName)}`
      )
      const data = await res.json()
      if (res.ok && Array.isArray(data.creators)) {
        setCreators(data.creators)
      } else {
        setCreators([])
      }
    } catch {
      setCreators([])
    }
  }, [])

  useEffect(() => {
    if (currentBrand.id || currentBrand.name) {
      fetchCreators(currentBrand.id, currentBrand.name)
    }
  }, [currentBrand.id, currentBrand.name, fetchCreators])

  // Proxy Approve on behalf of the client brand
  const handleProxyApprove = async (id: string, name: string) => {
    try {
      const res = await fetch('/api/brand-admin/virtual-brand/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          application_ids: [id],
          brand_name: currentBrand.name,
          brand_id: currentBrand.id,
        }),
      })
      if (!res.ok) throw new Error('Proxy approval failed')

      setCreators((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c))
      )
      toast.success(`[Proxy Action] Approved ${name} on behalf of ${currentBrand.name}! Logged in audit trail.`)
    } catch (err: any) {
      toast.error(err.message || 'Approval failed')
    }
  }

  // Proxy Reject with reason
  const handleProxyReject = async () => {
    if (!rejectModalCreator) return
    const id = rejectModalCreator.id
    const name = rejectModalCreator.name

    try {
      const res = await fetch('/api/brand-admin/virtual-brand/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          application_ids: [id],
          reason: rejectionReason || 'Declined during KAM review',
          brand_name: currentBrand.name,
          brand_id: currentBrand.id,
        }),
      })
      if (!res.ok) throw new Error('Proxy rejection failed')

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
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed')
    }
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
          <a
            href={`/api/brand-admin/virtual-brand/impersonate?brandId=${encodeURIComponent(currentBrand.id)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 text-xs font-semibold border border-purple-500/30 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Real Brand View</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <Link
            href="/brand-admin/brands"
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            <span>Exit Virtual Mode</span>
          </Link>
        </div>
      </div>

      {/* ─── MASTER-DETAIL WORKSPACE: VERTICAL BRAND EXPLORER (LEFT) + CREATOR REVIEW CANVAS (RIGHT) ─── */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* ─── LEFT: VERTICAL BRAND EXPLORER (Searchable & Scalable for 100+ Brands) ─── */}
        <aside className="w-full lg:w-72 xl:w-80 shrink-0 bg-[#121622] border border-white/10 rounded-3xl p-4 shadow-xl flex flex-col gap-3">
          {/* Header with Title & Total Count */}
          <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Client Brands</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/10 text-neutral-300">
              {brands.length} Total
            </span>
          </div>

          {/* Live Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={brandSearch}
              onChange={(e) => setBrandSearch(e.target.value)}
              placeholder="Search brands by name..."
              className="w-full bg-[#0a0d14] border border-white/10 rounded-xl pl-8 pr-7 py-2 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#febd1c]/50 transition-colors"
            />
            {brandSearch && (
              <button
                onClick={() => setBrandSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white text-xs cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Vertical Scrollable Brand List */}
          <div className="max-h-[580px] overflow-y-auto space-y-1.5 pr-1 no-scrollbar scrollbar-thin scrollbar-thumb-white/10">
            {filteredBrands.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No brands matching &quot;{brandSearch}&quot;
                <button
                  onClick={() => setBrandSearch('')}
                  className="block mx-auto mt-2 text-[10px] text-amber-400 hover:underline cursor-pointer"
                >
                  Clear search
                </button>
              </div>
            ) : (
              filteredBrands.map((b) => {
                const isSelected = b.id === currentBrand.id
                return (
                  <button
                    key={b.id}
                    onClick={() => router.push(`/brand-admin/virtual-brand/${b.id}`)}
                    className={`w-full text-left p-2.5 rounded-2xl transition-all flex items-center justify-between gap-2.5 group cursor-pointer border ${
                      isSelected
                        ? 'bg-[#febd1c]/15 border-[#febd1c] text-white shadow-md'
                        : 'bg-[#0a0d14]/70 hover:bg-[#0a0d14] border-white/5 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl font-bold flex items-center justify-center shrink-0 text-xs border ${
                        isSelected
                          ? 'bg-[#febd1c] text-neutral-950 border-[#febd1c]'
                          : 'bg-white/5 text-neutral-400 border-white/10 group-hover:text-white'
                      }`}>
                        {b.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-semibold truncate ${isSelected ? 'text-[#febd1c]' : 'text-neutral-200'}`}>
                          {b.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 truncate">
                          {b.industry || 'Client Workspace'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {Number(b.pending_reviews) > 0 ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {b.pending_reviews} pending
                        </span>
                      ) : null}
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-[#febd1c] animate-pulse" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Navigator Footer */}
          <div className="pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Active: <strong className="text-white">{currentBrand.name}</strong></span>
            <Link
              href="/brand-admin/brands"
              className="text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Manage</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </aside>

        {/* ─── RIGHT CANVAS: CREATOR SHORTLIST FOR SELECTED BRAND ─── */}
        <div className="flex-1 min-w-0 w-full space-y-4">
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
            onClick: async (rows) => {
              const pendingRows = rows.filter((r) => r.status === 'pending')
              if (pendingRows.length === 0) {
                toast.info('All selected creators are already approved or resolved.')
                return
              }
              const approvedIds = pendingRows.map((r) => r.id)
              try {
                await fetch('/api/brand-admin/virtual-brand/creators', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'batch_approve',
                    application_ids: approvedIds,
                    brand_name: currentBrand.name,
                    brand_id: currentBrand.id,
                  }),
                })
                const approvedIdSet = new Set(approvedIds)
                setCreators((prev) =>
                  prev.map((c) => (approvedIdSet.has(c.id) ? { ...c, status: 'approved' } : c))
                )
                toast.success(`[Proxy Action] Bulk approved ${pendingRows.length} creators for ${currentBrand.name}!`)
              } catch {
                toast.error('Bulk proxy approval failed')
              }
            },
          },
        ]}
      />
        </div>
      </div>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectModalCreator && (
          <div
            onClick={() => setRejectModalCreator(null)}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#121622] border border-white/10 rounded-3xl p-6 shadow-2xl cursor-default"
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
