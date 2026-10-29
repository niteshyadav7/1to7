'use client'

import React, { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Users,
  LogOut,
  BookmarkPlus,
  Sparkles,
  ArrowUpRight,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandPayload } from '@/types/brand'
import { brandCache } from '@/lib/brand-cache'

export default function BrandPanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const cachedUser = brandCache.get<BrandPayload>('brand_user')
  const cachedCounts = brandCache.get<{ rosters: number; campaigns: number; pendingApps: number; dispatchCount: number }>('brand_counts')

  const [brandUser, setBrandUser] = useState<BrandPayload | null>(cachedUser)
  const [loading, setLoading] = useState(!cachedUser)
  const [counts, setCounts] = useState<{ rosters: number; campaigns: number; pendingApps: number; dispatchCount: number }>(
    cachedCounts || { rosters: 0, campaigns: 0, pendingApps: 0, dispatchCount: 0 }
  )

  const fetchBrandSessionAndCounts = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch('/api/brand/auth/me', { cache: 'no-store' })
        const data = await res.json()
        if (data.authenticated && data.user) {
          setBrandUser(data.user)
          brandCache.set('brand_user', data.user)
        } else if (!silent) {
          brandCache.invalidate()
          router.replace('/brand/login')
          return
        }

        // Fetch lightweight tab counts in parallel
        const [rostersRes, campaignsRes, dispatchRes] = await Promise.allSettled([
          fetch('/api/brand/sample-rosters', { cache: 'no-store' }),
          fetch('/api/brand/campaigns', { cache: 'no-store' }),
          fetch('/api/brand/dispatch', { cache: 'no-store' }),
        ])

        let rostersCount = counts.rosters
        let campaignsCount = counts.campaigns
        let pendingAppsCount = counts.pendingApps
        let dispatchCount = counts.dispatchCount

        if (rostersRes.status === 'fulfilled' && rostersRes.value.ok) {
          const rData = await rostersRes.value.json()
          if (Array.isArray(rData.rosters)) {
            rostersCount = rData.rosters.length
            brandCache.set('brand_sample_rosters', rData.rosters)
          }
        }
        if (campaignsRes.status === 'fulfilled' && campaignsRes.value.ok) {
          const cData = await campaignsRes.value.json()
          if (Array.isArray(cData.campaigns)) {
            campaignsCount = cData.campaigns.length
            pendingAppsCount = cData.campaigns.reduce(
              (acc: number, c: any) => acc + (Number(c.pending_review) || 0),
              0
            )
            brandCache.set('brand_campaigns', cData.campaigns)
          }
        }
        if (dispatchRes.status === 'fulfilled' && dispatchRes.value.ok) {
          const dData = await dispatchRes.value.json()
          if (Array.isArray(dData.shipments)) {
            dispatchCount = dData.shipments.length
            brandCache.set('brand_dispatch_shipments', dData.shipments)
          }
        }

        const newCounts = {
          rosters: rostersCount,
          campaigns: campaignsCount,
          pendingApps: pendingAppsCount,
          dispatchCount,
        }
        setCounts(newCounts)
        brandCache.set('brand_counts', newCounts)
      } catch {
        if (!silent) router.replace('/brand/login')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [router, counts.rosters, counts.campaigns, counts.pendingApps, counts.dispatchCount]
  )

  useEffect(() => {
    // If we have cached user, run in silent background revalidation mode
    fetchBrandSessionAndCounts(Boolean(cachedUser))

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        fetchBrandSessionAndCounts(true)
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [fetchBrandSessionAndCounts, cachedUser])

  const handleLogout = async () => {
    try {
      brandCache.invalidate()
      await fetch('/api/brand/auth/logout', { method: 'POST' })
      toast.success('Signed out of Brand Workspace')
      router.push('/brand/login')
    } catch {
      router.push('/brand/login')
    }
  }

  const isSampleRostersActive = pathname.startsWith('/brand/sample-rosters')
  const isDispatchActive = pathname.startsWith('/brand/dispatch')
  const isCampaignsActive =
    pathname.startsWith('/brand/campaigns') ||
    pathname === '/brand' ||
    pathname === '/brand/dashboard'

  if (loading && !brandUser) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#F95738] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-300 font-semibold tracking-wide">Connecting to TheHype...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col text-slate-900 font-sans antialiased selection:bg-[#F95738]/20 selection:text-[#F95738] overflow-x-hidden">
      {/* ─── VIRTUAL ADMIN PREVIEW STRIP (Compact Mobile-Ready Banner) ─── */}
      {brandUser?.is_virtual && (
        <div className="bg-gradient-to-r from-purple-950 via-[#1E1B4B] to-slate-900 border-b border-purple-500/30 px-3 sm:px-6 py-1.5 flex items-center justify-between gap-2 text-[11px] text-purple-200 z-50">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping shrink-0" />
            <span className="font-extrabold uppercase tracking-wider text-[9px] px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-200 border border-purple-400/30 shrink-0">
              Admin Preview
            </span>
            <span className="truncate">
              Viewing as <strong className="text-white">{brandUser.brand_name}</strong>
            </span>
          </div>
          <a
            href="/brand-admin/sample-lists"
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] border border-white/15 transition-all flex items-center gap-1 shrink-0 cursor-pointer active:scale-95"
          >
            <span>Back to Admin</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* ─── UNIFIED STICKY TOP NAVIGATION HUB (Zero Sidebar • Mobile-First 2-Tab Switcher) ─── */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-xl border-b border-white/10 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 relative">
          {/* Top Row: Brand Identity + Segmented Switcher + Profile/Logout */}
          <div className="h-16 flex items-center justify-between gap-2.5 sm:gap-4">
            {/* Left: TheHype Logo & Active Brand Identity */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <Link href="/brand/sample-rosters" className="flex items-center gap-2 group">
                <img
                  src="/thehype-logo.png"
                  alt="TheHype"
                  className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 rounded-xl bg-white/10 p-1 border border-white/10 group-hover:border-[#F95738]/50 transition-colors"
                />
                <span className="font-black text-sm sm:text-base tracking-tight text-white leading-none">
                  TheHype
                </span>
              </Link>

              <div className="h-4 w-px bg-white/15 hidden sm:block" />

              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gradient-to-r from-amber-500/15 via-[#F95738]/15 to-orange-500/10 border border-amber-500/30 text-amber-300 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-xs">
                <Sparkles className="w-3 h-3 text-[#F95738] shrink-0" />
                <span className="truncate max-w-[100px] sm:max-w-[150px] xl:max-w-[200px]">
                  {brandUser?.brand_name || 'Brand Hub'}
                </span>
              </div>
            </div>

            {/* Center (Desktop & Tablet): Non-Overlapping In-Flow Flex Navigation */}
            <div className="hidden md:flex items-center justify-center flex-1 min-w-0 px-1 lg:px-2">
              <nav
                aria-label="Brand Workspace Tabs"
                className="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-lg backdrop-blur-md shrink-0"
              >
                <Link
                  href="/brand/sample-rosters"
                  prefetch={true}
                  className={`px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs font-extrabold transition-all duration-150 active:scale-95 flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                    isSampleRostersActive
                      ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 font-semibold'
                  }`}
                >
                  <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline">Sample </span>
                  <span>Pitch Decks</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isSampleRostersActive
                        ? 'bg-black/25 text-white'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {counts.rosters}
                  </span>
                </Link>

                <Link
                  href="/brand/campaigns"
                  prefetch={true}
                  className={`px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs font-extrabold transition-all duration-150 active:scale-95 flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                    isCampaignsActive
                      ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 font-semibold'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline">Campaign </span>
                  <span>Applications</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isCampaignsActive
                        ? 'bg-black/25 text-white'
                        : counts.pendingApps > 0
                          ? 'bg-[#F95738]/25 text-[#FF8A70] border border-[#F95738]/40'
                          : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {counts.pendingApps > 0 ? `${counts.pendingApps} New` : counts.campaigns}
                  </span>
                </Link>

                <Link
                  href="/brand/dispatch"
                  prefetch={true}
                  className={`px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-xl text-xs font-extrabold transition-all duration-150 active:scale-95 flex items-center gap-1.5 lg:gap-2 whitespace-nowrap ${
                    isDispatchActive
                      ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25 font-black'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 font-semibold'
                  }`}
                >
                  <Truck className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden xl:inline">Product </span>
                  <span>Dispatch</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      isDispatchActive
                        ? 'bg-black/25 text-white'
                        : counts.dispatchCount > 0
                          ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-400/40'
                          : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {counts.dispatchCount}
                  </span>
                </Link>
              </nav>
            </div>

            {/* Right: Live Sync Status + Reviewer Profile Capsule + Logout */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
              <div className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Sync</span>
              </div>

              {/* Reviewer Profile Capsule */}
              <div className="hidden sm:flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white font-black text-[11px] flex items-center justify-center shrink-0 shadow-xs">
                  {(brandUser?.full_name || brandUser?.brand_name || 'B').charAt(0).toUpperCase()}
                </div>
                <div className="hidden lg:flex flex-col text-left max-w-[110px] xl:max-w-[140px]">
                  <span className="text-xs font-bold text-white truncate leading-tight">
                    {brandUser?.full_name || 'Brand Reviewer'}
                  </span>
                  <span className="text-[10px] text-slate-400 truncate leading-tight">
                    {brandUser?.email || 'Brand Partner'}
                  </span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/15 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition-all duration-150 active:scale-95 cursor-pointer flex items-center gap-1.5 text-xs font-bold shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden xl:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Bottom Row (Mobile Only): Full-Width 1-Tap 3-Tab Segmented Switcher */}
          <div className="md:hidden pb-2.5 pt-0.5">
            <nav
              aria-label="Mobile Workspace Switcher"
              className="grid grid-cols-3 gap-1 p-1 rounded-2xl bg-slate-900/95 border border-white/10"
            >
              <Link
                href="/brand/sample-rosters"
                prefetch={true}
                className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold transition-all duration-150 active:scale-95 flex items-center justify-center gap-1 ${
                  isSampleRostersActive
                    ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Pitch</span>
                <span
                  className={`px-1 py-0.2 rounded-full text-[9px] font-black shrink-0 ${
                    isSampleRostersActive
                      ? 'bg-black/25 text-white'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {counts.rosters}
                </span>
              </Link>

              <Link
                href="/brand/campaigns"
                prefetch={true}
                className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold transition-all duration-150 active:scale-95 flex items-center justify-center gap-1 ${
                  isCampaignsActive
                    ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Campaigns</span>
                <span
                  className={`px-1 py-0.2 rounded-full text-[9px] font-black shrink-0 ${
                    isCampaignsActive
                      ? 'bg-black/25 text-white'
                      : counts.pendingApps > 0
                        ? 'bg-[#F95738]/30 text-[#FF8A70]'
                        : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {counts.pendingApps > 0 ? counts.pendingApps : counts.campaigns}
                </span>
              </Link>

              <Link
                href="/brand/dispatch"
                prefetch={true}
                className={`py-2 px-1.5 rounded-xl text-[11px] font-extrabold transition-all duration-150 active:scale-95 flex items-center justify-center gap-1 ${
                  isDispatchActive
                    ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Dispatch</span>
                <span
                  className={`px-1 py-0.2 rounded-full text-[9px] font-black shrink-0 ${
                    isDispatchActive
                      ? 'bg-black/25 text-white'
                      : counts.dispatchCount > 0
                        ? 'bg-emerald-500/30 text-emerald-300'
                        : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {counts.dispatchCount}
                </span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* ─── CENTERED FULL-WIDTH MOBILE-FIRST MAIN CANVAS ─── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>
    </div>
  )
}
