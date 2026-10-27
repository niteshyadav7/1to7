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
import { DynamicDataTable } from '@/components/brand/DynamicDataTable'

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

      {/* Brand Workspaces Directory Dynamic Table */}
      <DynamicDataTable
        title="Client Brand Accounts"
        subtitle="Manage client review workflows, track KAM assignments, and enter Virtual Brand mode."
        data={brands}
        columns={[
          {
            key: 'name',
            header: 'Brand Workspace',
            sortable: true,
            render: (brand) => (
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg bg-gradient-to-br ${brand.color} flex items-center justify-center text-white font-black text-[10px] shadow-sm shrink-0`}
                >
                  {brand.initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white text-[11px] truncate max-w-[150px]" title={brand.name}>{brand.name}</div>
                  <div className="text-[10px] text-neutral-400 truncate">{brand.industry}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'assignedKam',
            header: 'Assigned KAM',
            sortable: true,
            render: (brand) => (
              <span className="font-semibold text-amber-300 text-[11px] truncate block">{brand.assignedKam}</span>
            ),
          },
          {
            key: 'activeCampaigns',
            header: 'Active Campaigns',
            align: 'center',
            sortable: true,
            render: (brand) => (
              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 font-bold text-white text-[11px]">
                {brand.activeCampaigns}
              </span>
            ),
          },
          {
            key: 'pendingReviews',
            header: 'Pending Shortlists',
            align: 'center',
            sortable: true,
            render: (brand) => (
              <div className="text-center">
                {brand.pendingReviews > 0 ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/25 text-[#febd1c] font-bold text-[10px]">
                    <Clock className="w-2.5 h-2.5" />
                    {brand.pendingReviews} ({brand.oldestPendingHours}h)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-[10px]">
                    <CheckCircle2 className="w-3 h-3" /> All Caught Up
                  </span>
                )}
              </div>
            ),
          },
          {
            key: 'slaStatus',
            header: 'SLA Status',
            align: 'center',
            sortable: true,
            render: (brand) => {
              if (brand.slaStatus === 'breached') {
                return (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-500/20 text-red-300 border border-red-500/30">
                    BREACH (&gt;48h)
                  </span>
                )
              }
              if (brand.slaStatus === 'warning') {
                return (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    WARNING (&gt;24h)
                  </span>
                )
              }
              return (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  HEALTHY
                </span>
              )
            },
          },
          {
            key: 'actions',
            header: 'Virtual Brand Actions',
            align: 'right',
            sortable: false,
            render: (brand) => (
              <Link
                href={`/brand-admin/virtual-brand/${brand.id}`}
                className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold text-[10px] border border-purple-500/30 transition-colors shadow-sm"
              >
                <Eye className="w-2.5 h-2.5" />
                <span>Virtual Brand</span>
              </Link>
            ),
          },
        ]}
        searchPlaceholder="Search brand name, KAM, or category..."
        exportFilename="brand_accounts_overview.csv"
        defaultPageSize={10}
      />
    </div>
  )
}
