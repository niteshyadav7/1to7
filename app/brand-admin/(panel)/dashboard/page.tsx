'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Users,
  Eye,
  Sparkles,
  ChevronRight,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

const BRAND_WORKSPACES = [
  {
    id: 'b-mamaearth',
    name: 'Mamaearth',
    slug: 'mamaearth',
    industry: 'Beauty & Skincare',
    initials: 'MA',
    color: 'from-amber-500 to-amber-700',
    assignedKam: 'Pooja Verma (KAM)',
    activeCampaigns: 2,
    pendingReviews: 18,
    slaStatus: 'warning', // > 24 hours
    oldestPendingHours: 31,
  },
  {
    id: 'b-plum',
    name: 'Plum Goodness',
    slug: 'plum',
    industry: 'Vegan Beauty',
    initials: 'PL',
    color: 'from-amber-600 to-orange-700',
    assignedKam: 'Nitesh Yadav (Senior Ops)',
    activeCampaigns: 1,
    pendingReviews: 6,
    slaStatus: 'breached', // > 48 hours
    oldestPendingHours: 52,
  },
  {
    id: 'b-sugar',
    name: 'Sugar Cosmetics',
    slug: 'sugar',
    industry: 'Color Cosmetics',
    initials: 'SU',
    color: 'from-neutral-700 to-neutral-900',
    assignedKam: 'Pooja Verma (KAM)',
    activeCampaigns: 3,
    pendingReviews: 0,
    slaStatus: 'healthy',
    oldestPendingHours: 0,
  },
]

export default function BrandAdminDashboardPage() {
  const [brands] = useState(BRAND_WORKSPACES)

  const totalPending = brands.reduce((acc, b) => acc + b.pendingReviews, 0)
  const slaBreaches = brands.filter((b) => b.slaStatus === 'breached').length
  const slaWarnings = brands.filter((b) => b.slaStatus === 'warning').length

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-semibold mb-2">
            <Building2 className="w-3 h-3" />
            Brand Operations Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Brand Management Overview
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 mt-1">
            Real-time health of client brand approvals, SLA bottlenecks, and KAM accountability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/brand-admin/team-rbac">
            <Button
              variant="outline"
              className="border-white/10 hover:bg-white/5 text-neutral-300 text-xs h-10"
            >
              <UserCheck className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              Staff RBAC
            </Button>
          </Link>
          <Link href="/brand-admin/brands">
            <Button className="bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold text-xs h-10 shadow-lg">
              <Building2 className="w-3.5 h-3.5 mr-1.5" />
              Manage Brands
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#121620] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Client Workspaces</span>
            <Building2 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">{brands.length}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-1">100% Active Workspaces</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#121620] border border-white/10 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#febd1c]">{totalPending}</div>
          <div className="text-[11px] text-neutral-400 font-medium mt-1">Across 6 active campaigns</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#121620] border border-amber-500/20 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">SLA Warnings (&gt;24h)</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-400">{slaWarnings}</div>
          <div className="text-[11px] text-amber-400/80 font-medium mt-1">Mamaearth pending 31h</div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#121620] border border-red-500/20 shadow-lg">
          <div className="flex items-center justify-between text-neutral-400 mb-2">
            <span className="text-xs font-medium">SLA Breaches (&gt;48h)</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-red-400">{slaBreaches}</div>
          <div className="text-[11px] text-red-400/80 font-medium mt-1">Plum Goodness pending 52h</div>
        </div>
      </div>

      {/* Urgent Bottlenecks Watchtower Quick Bar */}
      {slaBreaches > 0 && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Urgent Action Needed: {slaBreaches} Brand Review SLA Breached (&gt;48 hours)
              </h3>
              <p className="text-xs text-neutral-400">
                Creators for Plum Goodness are blocked from courier dispatch. Send a WhatsApp nudge or use Virtual Brand Mode to approve on their behalf.
              </p>
            </div>
          </div>
          <Link href="/brand-admin/reviews-sla">
            <Button size="sm" className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs shrink-0">
              Open SLA Watchtower <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      )}

      {/* Brand Workspaces Directory Snapshot */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-300">
            Client Brand Accounts
          </h2>
          <Link
            href="/brand-admin/brands"
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            View All Brands <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {brands.map((brand) => (
            <motion.div
              key={brand.id}
              whileHover={{ y: -2 }}
              className="p-5 rounded-2xl bg-[#121620] border border-white/10 hover:border-amber-500/40 transition-all shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${brand.color} flex items-center justify-center text-white font-black text-sm shadow-md`}
                    >
                      {brand.initials}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{brand.name}</h3>
                      <p className="text-xs text-neutral-400">{brand.industry}</p>
                    </div>
                  </div>

                  {brand.slaStatus === 'breached' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                      SLA BREACH
                    </span>
                  ) : brand.slaStatus === 'warning' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      WARNING
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 text-xs text-neutral-300 bg-[#0c1017] p-3 rounded-xl border border-white/5 mb-4">
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Assigned KAM:</span>
                    <span className="font-semibold text-white">{brand.assignedKam}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Active Campaigns:</span>
                    <span className="font-semibold text-white">{brand.activeCampaigns}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-neutral-500">Pending Review:</span>
                    <span
                      className={`font-bold ${
                        brand.pendingReviews > 0 ? 'text-[#febd1c]' : 'text-emerald-400'
                      }`}
                    >
                      {brand.pendingReviews > 0
                        ? `${brand.pendingReviews} creators (${brand.oldestPendingHours}h)`
                        : 'All Caught Up'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 1-Click Masquerade / Virtual Brand Button */}
              <Link
                href={`/brand/dashboard`}
                target="_blank"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold text-xs border border-purple-500/30 transition-colors shadow"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>View As Brand (Virtual Profile)</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
