'use client'

import React, { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
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
  MapPin
} from 'lucide-react'
import { toast } from 'sonner'
import { formatFollowerCount } from '@/lib/utils/brand-privacy-utils'

export default function VirtualBrandProfilePage() {
  const { brandId } = useParams<{ brandId: string }>()
  const router = useRouter()

  const [brandName] = useState('Mamaearth')
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending')
  const [actionDone, setActionDone] = useState<string | null>(null)

  const [creators, setCreators] = useState([
    {
      id: 'app-vb-1',
      name: 'Pooja Verma',
      handle: 'pooja.lifestyle',
      followers: 125000,
      city: 'Mumbai',
      sample: 'Vitamin C Serum (30ml)',
      status: 'pending',
    },
    {
      id: 'app-vb-2',
      name: 'Rohan Malhotra',
      handle: 'rohan_fitness',
      followers: 84000,
      city: 'Delhi',
      sample: 'Vitamin C Face Wash (100ml)',
      status: 'pending',
    },
    {
      id: 'app-vb-3',
      name: 'Simran Kaur',
      handle: 'simran.beautyvlogs',
      followers: 210000,
      city: 'Chandigarh',
      sample: 'Vitamin C Glow Combo Kit',
      status: 'approved',
    },
  ])

  // Proxy approve on behalf of client
  const handleProxyApprove = (id: string, name: string) => {
    setActionDone(id)
    toast.success(`[Proxy Action] Approved ${name} on behalf of ${brandName}! Logged in audit trail.`)
    setCreators((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: 'approved' } : c))
    )
    setTimeout(() => setActionDone(null), 1000)
  }

  const filtered = creators.filter((c) => {
    if (activeTab === 'pending') return c.status === 'pending'
    if (activeTab === 'approved') return c.status === 'approved'
    return true
  })

  return (
    <div className="space-y-6">
      {/* ─── VIRTUAL BRAND TOP BANNER ─── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/60 via-purple-800/40 to-slate-900 border border-purple-500/40 text-purple-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
            <Eye className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-500/30 text-purple-200">
                Virtual Brand Mode
              </span>
              <span className="text-xs text-purple-300">
                Viewing as <strong>{brandName}</strong> ({brandId})
              </span>
            </div>
            <p className="text-xs text-purple-300/80 mt-0.5">
              You are seeing the exact creator list and status visible to the brand. Proxy actions will be logged in the audit trail.
            </p>
          </div>
        </div>

        <Link
          href="/admin/brands"
          className="self-end sm:self-center px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <X className="w-3.5 h-3.5" />
          <span>Exit Virtual Mode</span>
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-[#febd1c] text-black shadow-sm'
              : 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Pending Review ({creators.filter((c) => c.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-[#febd1c] text-black shadow-sm'
              : 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800'
          }`}
        >
          Approved ({creators.filter((c) => c.status === 'approved').length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
            activeTab === 'all'
              ? 'bg-[#febd1c] text-black shadow-sm'
              : 'bg-slate-900 border border-white/10 text-slate-300 hover:bg-slate-800'
          }`}
        >
          All ({creators.length})
        </button>
      </div>

      {/* Creators Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-slate-900/90 border border-white/10 shadow-sm flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center shrink-0">
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">{c.name}</h4>
                    <span className="text-xs text-pink-400 font-medium">@{c.handle}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    c.status === 'approved'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {c.status}
                </span>
              </div>

              <div className="mt-4 p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex items-center justify-around text-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Followers</span>
                  <span className="text-white font-semibold">{formatFollowerCount(c.followers)}</span>
                </div>
                <div className="w-px h-5 bg-white/10" />
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-bold">Location</span>
                  <span className="text-white font-semibold">{c.city}</span>
                </div>
              </div>

              {c.sample && (
                <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.sample}</span>
                </div>
              )}
            </div>

            {/* Proxy Approval Action */}
            <div className="pt-2 border-t border-white/10">
              {c.status === 'pending' ? (
                <button
                  onClick={() => handleProxyApprove(c.id, c.name)}
                  className="w-full py-2 px-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Proxy Approve (On Behalf of Brand)</span>
                </button>
              ) : (
                <div className="py-1.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approved & Dispatched</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
