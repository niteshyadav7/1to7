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
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandPayload } from '@/types/brand'

export default function BrandPanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [brandUser, setBrandUser] = useState<BrandPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [counts, setCounts] = useState<{ rosters: number; campaigns: number; pendingApps: number }>({
    rosters: 0,
    campaigns: 0,
    pendingApps: 0,
  })

  const fetchBrandSessionAndCounts = useCallback(
    async (silent = false) => {
      try {
        const res = await fetch('/api/brand/auth/me', { cache: 'no-store' })
        const data = await res.json()
        if (data.authenticated && data.user) {
          setBrandUser(data.user)
        } else if (!silent) {
          router.replace('/brand/login')
          return
        }

        // Fetch lightweight tab counts in parallel
        const [rostersRes, campaignsRes] = await Promise.allSettled([
          fetch('/api/brand/sample-rosters', { cache: 'no-store' }),
          fetch('/api/brand/campaigns', { cache: 'no-store' }),
        ])

        let rostersCount = 0
        let campaignsCount = 0
        let pendingAppsCount = 0

        if (rostersRes.status === 'fulfilled' && rostersRes.value.ok) {
          const rData = await rostersRes.value.json()
          rostersCount = Array.isArray(rData.rosters) ? rData.rosters.length : 0
        }
        if (campaignsRes.status === 'fulfilled' && campaignsRes.value.ok) {
          const cData = await campaignsRes.value.json()
          if (Array.isArray(cData.campaigns)) {
            campaignsCount = cData.campaigns.length
            pendingAppsCount = cData.campaigns.reduce(
              (acc: number, c: any) => acc + (Number(c.pending_review) || 0),
              0
            )
          }
        }

        setCounts({
          rosters: rostersCount,
          campaigns: campaignsCount,
          pendingApps: pendingAppsCount,
        })
      } catch {
        if (!silent) router.replace('/brand/login')
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [router]
  )

  useEffect(() => {
    fetchBrandSessionAndCounts(false)

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
  }, [fetchBrandSessionAndCounts])

  const handleLogout = async () => {
    try {
      await fetch('/api/brand/auth/logout', { method: 'POST' })
      toast.success('Signed out of Brand Workspace')
      router.push('/brand/login')
    } catch {
      router.push('/brand/login')
    }
  }

  const isSampleRostersActive = pathname.startsWith('/brand/sample-rosters')
  const isCampaignsActive =
    pathname.startsWith('/brand/campaigns') ||
    pathname === '/brand' ||
    pathname === '/brand/dashboard'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-[#F95738] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-300 font-semibold">Loading TheHype Brand Hub...</p>
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
            className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-[10px] border border-white/15 transition-all flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <span>Back to Admin</span>
            <ArrowUpRight className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* ─── UNIFIED STICKY TOP NAVIGATION HUB (Zero Sidebar • Mobile-First 2-Tab Switcher) ─── */}
      <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-xl border-b border-white/10 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8">
          {/* Top Row: Brand Identity + Desktop Segmented Switcher + Profile/Logout */}
          <div className="h-14 sm:h-16 flex items-center justify-between gap-3">
            {/* Left: TheHype Logo & Active Brand Identity */}
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <img
                src="/thehype-logo.png"
                alt="TheHype"
                className="w-8 h-8 sm:w-9 sm:h-9 object-contain shrink-0 rounded-xl bg-white/10 p-1 border border-white/10"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm sm:text-base tracking-tight text-white leading-none">
                    TheHype
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F95738]/20 border border-[#F95738]/40 text-[#FF8A70] text-[10px] font-extrabold uppercase tracking-wider truncate max-w-[140px] sm:max-w-[200px]">
                    <Sparkles className="w-2.5 h-2.5 text-[#F95738] shrink-0" />
                    <span className="truncate">{brandUser?.brand_name || 'Brand Hub'}</span>
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block mt-0.5">
                  Client Creator Curation & Approval Studio
                </p>
              </div>
            </div>

            {/* Center (Desktop & Tablet): 2-Tab Segmented Switcher */}
            <nav
              aria-label="Brand Workspace Tabs"
              className="hidden md:flex items-center p-1 rounded-2xl bg-slate-900/90 border border-white/10 shadow-inner"
            >
              <Link
                href="/brand/sample-rosters"
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  isSampleRostersActive
                    ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                <span>Sample Pitch Decks</span>
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
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 ${
                  isCampaignsActive
                    ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Campaign Applications</span>
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
            </nav>

            {/* Right: Live Sync Status + Reviewer Identity + Logout */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Live Sync</span>
              </div>

              <div className="hidden sm:flex flex-col items-end text-right max-w-[150px]">
                <span className="text-xs font-bold text-white truncate w-full">
                  {brandUser?.full_name || 'Brand Reviewer'}
                </span>
                <span className="text-[10px] text-slate-400 truncate w-full">
                  {brandUser?.email || 'Brand Partner'}
                </span>
              </div>

              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-xl bg-white/5 hover:bg-red-500/15 text-slate-300 hover:text-red-300 border border-white/10 hover:border-red-500/30 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Bottom Row (Mobile Only): Full-Width 1-Tap 2-Tab Segmented Switcher */}
          <div className="md:hidden pb-2.5 pt-0.5">
            <nav
              aria-label="Mobile Workspace Switcher"
              className="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-slate-900/95 border border-white/10"
            >
              <Link
                href="/brand/sample-rosters"
                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  isSampleRostersActive
                    ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <BookmarkPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Sample Pitch</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
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
                className={`py-2 px-2.5 rounded-xl text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 ${
                  isCampaignsActive
                    ? 'bg-gradient-to-r from-[#F95738] to-[#FF6B4A] text-white shadow-md shadow-[#F95738]/25'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Applications</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-black shrink-0 ${
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
