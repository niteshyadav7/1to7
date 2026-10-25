'use client'

import React, { useState } from 'react'
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

const ALL_BRANDS = [
  { id: 'b-mamaearth', name: 'Mamaearth', campaign: 'Rosemary Anti-Hair Fall UGC Drive' },
  { id: 'b-plum', name: 'Plum Goodness', campaign: 'Vitamin C Serum Launch (Diwali Edition)' },
  { id: 'b-sugar', name: 'Sugar Cosmetics', campaign: 'Matte Attack Lipstick Reels' },
]

export default function BrandAdminVirtualBrandDetailPage() {
  const params = useParams<{ brandId: string }>()
  const router = useRouter()
  const brandId = params?.brandId || 'b-mamaearth'

  const currentBrand = ALL_BRANDS.find((b) => b.id === brandId) || {
    id: brandId,
    name: brandId.replace('b-', '').toUpperCase(),
    campaign: 'Active Influencer Campaign',
  }

  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [rejectModalCreator, setRejectModalCreator] = useState<any | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')

  const [creators, setCreators] = useState([
    {
      id: 'app-vb-1',
      name: 'Pooja Verma',
      handle: 'pooja.lifestyle',
      followers: 125000,
      city: 'Mumbai',
      sample: 'Sample Kit (30ml) • Size: Standard',
      status: 'pending',
    },
    {
      id: 'app-vb-2',
      name: 'Rohan Malhotra',
      handle: 'rohan_fitness',
      followers: 84000,
      city: 'Delhi',
      sample: 'Face Wash (100ml) • Size: Full',
      status: 'pending',
    },
    {
      id: 'app-vb-3',
      name: 'Simran Kaur',
      handle: 'simran.beautyvlogs',
      followers: 210000,
      city: 'Chandigarh',
      sample: 'Glow Combo Kit',
      status: 'approved',
    },
    {
      id: 'app-vb-4',
      name: 'Aakash Mehta',
      handle: 'aakash_style',
      followers: 45000,
      city: 'Bengaluru',
      sample: 'Trial Sachet (15ml)',
      status: 'rejected',
      rejectionReason: 'Aesthetic did not align with luxury reel guidelines',
    },
  ])

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
            {ALL_BRANDS.map((b) => (
              <button
                key={b.id}
                onClick={() => router.push(`/brand-admin/virtual-brand/${b.id}`)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                  b.id === brandId
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
          Campaign: <strong className="text-white">{currentBrand.campaign}</strong>
        </div>
      </div>

      {/* Dynamic Data Table for Creator Shortlists */}
      <DynamicDataTable
        data={creators.filter((c) => {
          if (activeTab === 'pending') return c.status === 'pending'
          if (activeTab === 'approved') return c.status === 'approved'
          if (activeTab === 'rejected') return c.status === 'rejected'
          return true
        })}
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
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 text-purple-300 font-bold flex items-center justify-center shrink-0 text-xs">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-white text-xs sm:text-sm">{c.name}</div>
                  <a
                    href={`https://instagram.com/${c.handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-pink-400 hover:text-pink-300 font-medium inline-flex items-center gap-1"
                  >
                    <Instagram className="w-3 h-3" /> @{c.handle}
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
              <span className="font-bold text-white text-xs px-2.5 py-1 rounded-lg bg-white/5 border border-white/10">
                {formatFollowerCount(c.followers)}
              </span>
            ),
          },
          {
            key: 'city',
            header: 'Location',
            sortable: true,
            render: (c) => <span className="text-neutral-300 text-xs">{c.city}</span>,
          },
          {
            key: 'sample',
            header: 'Sample Product Specs',
            render: (c) => (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/5 border border-amber-500/15 text-amber-300 text-xs max-w-xs truncate">
                <Package className="w-3.5 h-3.5 shrink-0 text-amber-400" />
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
              <div>
                <span
                  className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                    c.status === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : c.status === 'rejected'
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {c.status}
                </span>
                {c.rejectionReason && (
                  <div className="text-[10px] text-red-400 mt-0.5 truncate max-w-[140px]" title={c.rejectionReason}>
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
              <div className="flex items-center justify-end gap-1.5">
                {c.status === 'pending' ? (
                  <>
                    <Button
                      size="sm"
                      onClick={() => handleProxyApprove(c.id, c.name)}
                      className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-8 px-2.5 shadow-sm"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setRejectModalCreator(c)}
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 text-xs h-8 px-2"
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </Button>
                  </>
                ) : c.status === 'approved' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                ) : (
                  <button
                    onClick={() => handleProxyApprove(c.id, c.name)}
                    className="text-amber-400 hover:text-amber-300 text-xs underline font-medium"
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
