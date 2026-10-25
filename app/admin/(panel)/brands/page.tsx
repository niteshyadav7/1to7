'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Building2,
  Users,
  Search,
  ExternalLink,
  Eye,
  Plus,
  Shield,
  Clock,
  Sparkles,
  Phone,
  Mail,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'sonner'

interface BrandListItem {
  id: string
  name: string
  slug: string
  industry: string
  assigned_kam: string
  contact_person: string
  contact_email: string
  active_campaigns: number
  creators_pending_review: number
  status: 'active' | 'pending_onboarding'
}

export default function AdminBrandsManagementPage() {
  const [search, setSearch] = useState('')

  const [brands, setBrands] = useState<BrandListItem[]>([
    {
      id: 'brand-mamaearth',
      name: 'Mamaearth',
      slug: 'mamaearth',
      industry: 'Beauty & Skincare',
      assigned_kam: 'Pooja Verma (KAM)',
      contact_person: 'Ananya Sharma (Brand Head)',
      contact_email: 'ananya@mamaearth.in',
      active_campaigns: 2,
      creators_pending_review: 18,
      status: 'active',
    },
    {
      id: 'brand-plum',
      name: 'Plum Goodness',
      slug: 'plum',
      industry: 'Vegan Beauty',
      assigned_kam: 'Nitesh Yadav (Senior Ops)',
      contact_person: 'Rahul Sen (Marketing Lead)',
      contact_email: 'rahul@plumgoodness.com',
      active_campaigns: 1,
      creators_pending_review: 6,
      status: 'active',
    },
    {
      id: 'brand-sugar',
      name: 'Sugar Cosmetics',
      slug: 'sugar',
      industry: 'Color Cosmetics',
      assigned_kam: 'Pooja Verma (KAM)',
      contact_person: 'Kavita Roy (Digital Lead)',
      contact_email: 'kavita@sugarcosmetics.com',
      active_campaigns: 3,
      creators_pending_review: 0,
      status: 'active',
    },
  ])

  const filteredBrands = brands.filter((b) =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.industry.toLowerCase().includes(search.toLowerCase()) ||
    b.assigned_kam.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Client Brands Management
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Manage enterprise brand workspaces, track review bottlenecks, and enter Virtual Brand mode.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-full sm:w-64 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search brand, KAM..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#febd1c] transition"
            />
          </div>

          <button
            onClick={() => toast.info('New brand onboarding modal')}
            className="py-2 px-4 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-xs sm:text-sm transition flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Brand</span>
          </button>
        </div>
      </div>

      {/* Brands Cards / Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {filteredBrands.map((brand) => (
          <motion.div
            key={brand.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/90 rounded-2xl border border-white/10 p-5 flex flex-col justify-between hover:border-white/20 transition shadow-sm space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-[#febd1c] text-black font-bold text-lg flex items-center justify-center shrink-0">
                    {brand.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white leading-tight">
                      {brand.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {brand.industry}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {brand.status}
                </span>
              </div>

              {/* KAM & Contact Details */}
              <div className="mt-4 p-3 rounded-xl bg-slate-950/60 border border-white/5 space-y-1.5 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Assigned KAM:</span>
                  <span className="font-semibold text-amber-300">{brand.assigned_kam}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Primary Contact:</span>
                  <span className="text-slate-200">{brand.contact_person}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Email:</span>
                  <span className="truncate max-w-[170px]">{brand.contact_email}</span>
                </div>
              </div>

              {/* Status summary */}
              <div className="mt-3 flex items-center justify-between px-1 text-xs">
                <span className="text-slate-400">Active Campaigns: <strong>{brand.active_campaigns}</strong></span>
                {brand.creators_pending_review > 0 ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{brand.creators_pending_review} Pending Review</span>
                  </span>
                ) : (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>All Caught Up</span>
                  </span>
                )}
              </div>
            </div>

            {/* Virtual Brand Mode Entry Button */}
            <div className="pt-2 border-t border-white/10 flex items-center gap-2">
              <Link
                href={`/admin/virtual-brand/${brand.id}`}
                className="w-full py-2.5 px-3 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Eye className="w-4 h-4 text-purple-400" />
                <span>View as Brand (Virtual Profile)</span>
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
