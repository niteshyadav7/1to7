'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users,
  LogOut,
  BookmarkPlus,
  Sparkles,
  ArrowUpRight,
  Truck,
  Menu,
  X,
  Search,
  Bell,
  Headphones,
  CheckCircle2,
  ChevronRight,
  Building2,
  FolderKanban,
  FileText,
  HelpCircle,
  Flame,
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandPayload } from '@/types/brand'
import { brandCache } from '@/lib/brand-cache'
import { BrandSearchProvider, useBrandSearch } from '@/components/brand/BrandSearchContext'

function BrandHeaderSearch() {
  const { searchQuery, setSearchQuery, placeholder, headerSearchRef } = useBrandSearch()

  return (
    <div className="relative max-w-xs sm:max-w-md w-full mx-4">
      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        ref={headerSearchRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#10b981] rounded-none pl-8 pr-8 py-1.5 text-xs sm:text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none transition-colors"
      />
      {searchQuery ? (
        <button
          type="button"
          onClick={() => setSearchQuery('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="hidden sm:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono font-semibold text-[#64748b] bg-white border border-slate-200 px-1.5 py-0.5 rounded-none shadow-2xs pointer-events-none">
          ⌘K
        </span>
      )}
    </div>
  )
}

export default function BrandPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <BrandSearchProvider>
      <BrandPanelLayoutContent>{children}</BrandPanelLayoutContent>
    </BrandSearchProvider>
  )
}

function BrandPanelLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()

  const [brandUser, setBrandUser] = useState<BrandPayload | null>(() => brandCache.get<BrandPayload>('brand_user'))
  const [loading, setLoading] = useState(() => !brandCache.get<BrandPayload>('brand_user'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [counts, setCounts] = useState<{ rosters: number; campaigns: number; pendingApps: number; dispatchCount: number }>(() =>
    brandCache.get<{ rosters: number; campaigns: number; pendingApps: number; dispatchCount: number }>('brand_counts') || {
      rosters: 0,
      campaigns: 0,
      pendingApps: 0,
      dispatchCount: 0,
    }
  )

  const isFetchingRef = useRef(false)
  const lastFetchTimeRef = useRef<number>(0)

  const fetchBrandSessionAndCounts = useCallback(
    async (silent = false) => {
      // Guard against concurrent overlapping runs
      if (isFetchingRef.current) return
      // Throttle background/focus revalidation to prevent spamming
      const now = Date.now()
      if (silent && now - lastFetchTimeRef.current < 20000) return

      isFetchingRef.current = true
      lastFetchTimeRef.current = now

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

        let updatedRosters: number | null = null
        let updatedCampaigns: number | null = null
        let updatedPendingApps: number | null = null
        let updatedDispatch: number | null = null

        if (rostersRes.status === 'fulfilled' && rostersRes.value.ok) {
          const rData = await rostersRes.value.json()
          if (Array.isArray(rData.rosters)) {
            updatedRosters = rData.rosters.length
            brandCache.set('brand_sample_rosters', rData.rosters)
          }
        }
        if (campaignsRes.status === 'fulfilled' && campaignsRes.value.ok) {
          const cData = await campaignsRes.value.json()
          if (Array.isArray(cData.campaigns)) {
            updatedCampaigns = cData.campaigns.length
            updatedPendingApps = cData.campaigns.reduce(
              (acc: number, c: any) => acc + (Number(c.pending_review) || 0),
              0
            )
            brandCache.set('brand_campaigns', cData.campaigns)
          }
        }
        if (dispatchRes.status === 'fulfilled' && dispatchRes.value.ok) {
          const dData = await dispatchRes.value.json()
          if (Array.isArray(dData.shipments)) {
            updatedDispatch = dData.shipments.length
            brandCache.set('brand_dispatch_shipments', dData.shipments)
          }
        }

        setCounts((prev) => {
          const nextCounts = {
            rosters: updatedRosters !== null ? updatedRosters : prev.rosters,
            campaigns: updatedCampaigns !== null ? updatedCampaigns : prev.campaigns,
            pendingApps: updatedPendingApps !== null ? updatedPendingApps : prev.pendingApps,
            dispatchCount: updatedDispatch !== null ? updatedDispatch : prev.dispatchCount,
          }
          brandCache.set('brand_counts', nextCounts)
          return nextCounts
        })
      } catch {
        if (!silent) router.replace('/brand/login')
      } finally {
        isFetchingRef.current = false
        if (!silent) setLoading(false)
      }
    },
    [router]
  )

  useEffect(() => {
    const hasCachedUser = Boolean(brandCache.get<BrandPayload>('brand_user'))
    fetchBrandSessionAndCounts(hasCachedUser)

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

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

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

  const getPageTitle = () => {
    if (isSampleRostersActive) return 'Sample Pitch Decks'
    if (isDispatchActive) return 'Product Dispatch'
    if (pathname.includes('/creators')) return 'Creator Review Studio'
    if (isCampaignsActive) return 'Campaign Applications'
    return 'Brand Overview'
  }

  if (loading && !brandUser) {
    return (
      <div
        className="min-h-screen bg-[#161e2b] flex flex-col items-center justify-center gap-3"
        style={{
          fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
        }}
      >
        <div className="w-8 h-8 border-2 border-[#10b981] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-slate-300 font-semibold tracking-wide">Connecting to TheHype...</p>
      </div>
    )
  }

  const renderSidebarContent = (isMobile = false) => (
    <div className="h-full flex flex-col justify-between select-none overflow-hidden">
      {/* ─── Top: Gentelella-Style Brand Header ─── */}
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
        <div className={`shrink-0 p-4 border-b border-[#243044] flex items-center justify-between ${isCollapsed && !isMobile ? 'px-3' : 'px-4 sm:px-5'}`}>
          <Link href="/brand/sample-rosters" className="flex items-center gap-3 group min-w-0">
            {/* TheHype Official Brand Logo */}
            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center bg-white/5 border border-white/10 group-hover:scale-105 transition-transform">
              <img
                src="https://thehype.in/img/logo.png"
                alt="TheHype"
                className="w-full h-full object-contain p-0.5"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).src = '/thehype-logo.png'
                }}
              />
            </div>
            {(!isCollapsed || isMobile) && (
              <div className="flex items-baseline gap-1.5 min-w-0">
                <span className="font-bold text-[18px] tracking-tight text-white block leading-none truncate">
                  TheHype
                </span>
              </div>
            )}
          </Link>

          {isMobile && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1 rounded-none text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Client Workspace Card */}
        {(!isCollapsed || isMobile) && (
          <div className="m-3 p-2.5 rounded-none bg-[#131b26] border border-[#243044] flex items-center justify-between gap-2 shadow-inner">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full bg-[#10b981]/15 text-[#10b981] font-bold text-[11px] flex items-center justify-center shrink-0 border border-[#10b981]/30">
                {(brandUser?.brand_name || 'B').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-semibold text-white truncate block">
                  {brandUser?.brand_name || 'Brand Workspace'}
                </span>
                <span className="text-[10px] text-[#10b981] font-medium flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                  Active Portal
                </span>
              </div>
            </div>
            {brandUser?.is_virtual && (
              <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-none bg-purple-500/20 text-purple-300 border border-purple-400/30 shrink-0">
                Preview
              </span>
            )}
          </div>
        )}

        {/* ─── Navigation Links (Flat / Ungrouped) ─── */}
        <div className="py-3 space-y-1">
          <Link
            href="/brand/campaigns"
            prefetch={true}
            title={isCollapsed && !isMobile ? 'Campaign Creators' : undefined}
            className={`w-full px-4 py-2 text-[14px] flex items-center justify-between transition-colors duration-150 rounded-none ${
              isCampaignsActive
                ? 'bg-[#243044]/80 text-white font-medium shadow-xs border-r-[3px] border-[#10b981]'
                : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04] font-medium'
            } ${isCollapsed && !isMobile ? 'justify-center px-0' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Users className={`w-4 h-4 shrink-0 ${isCampaignsActive ? 'text-[#10b981]' : 'text-[#64748b]'}`} />
              {(!isCollapsed || isMobile) && <span className="truncate">Campaign Creators</span>}
            </div>

            {(!isCollapsed || isMobile) && (
              <span
                className={`px-2 py-0.5 rounded-none text-[11px] font-semibold shrink-0 ${
                  counts.pendingApps > 0
                    ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25'
                    : isCampaignsActive
                      ? 'bg-[#243044] text-[#cbd5e1]'
                      : 'bg-[#243044]/50 text-[#64748b]'
                }`}
              >
                {counts.pendingApps > 0 ? `${counts.pendingApps} New` : counts.campaigns}
              </span>
            )}
          </Link>

          <Link
            href="/brand/sample-rosters"
            prefetch={true}
            title={isCollapsed && !isMobile ? 'Sample Pitch Decks' : undefined}
            className={`w-full px-4 py-2 text-[14px] flex items-center justify-between transition-colors duration-150 rounded-none ${
              isSampleRostersActive
                ? 'bg-[#243044]/80 text-white font-medium shadow-xs border-r-[3px] border-[#10b981]'
                : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04] font-medium'
            } ${isCollapsed && !isMobile ? 'justify-center px-0' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <BookmarkPlus className={`w-4 h-4 shrink-0 ${isSampleRostersActive ? 'text-[#10b981]' : 'text-[#64748b]'}`} />
              {(!isCollapsed || isMobile) && <span className="truncate">Sample Pitch Decks</span>}
            </div>

            {(!isCollapsed || isMobile) && (
              <span
                className={`px-2 py-0.5 rounded-none text-[11px] font-semibold shrink-0 ${
                  isSampleRostersActive
                    ? 'bg-[#243044] text-[#cbd5e1]'
                    : counts.rosters > 0
                      ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25'
                      : 'bg-[#243044]/50 text-[#64748b]'
                }`}
              >
                {counts.rosters}
              </span>
            )}
          </Link>

          <Link
            href="/brand/dispatch"
            prefetch={true}
            title={isCollapsed && !isMobile ? 'Product Dispatch' : undefined}
            className={`w-full px-4 py-2 text-[14px] flex items-center justify-between transition-colors duration-150 rounded-none ${
              isDispatchActive
                ? 'bg-[#243044]/80 text-white font-medium shadow-xs border-r-[3px] border-[#10b981]'
                : 'text-[#94a3b8] hover:text-white hover:bg-white/[0.04] font-medium'
            } ${isCollapsed && !isMobile ? 'justify-center px-0' : ''}`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <Truck className={`w-4 h-4 shrink-0 ${isDispatchActive ? 'text-[#10b981]' : 'text-[#64748b]'}`} />
              {(!isCollapsed || isMobile) && <span className="truncate">Product Dispatch</span>}
            </div>

            {(!isCollapsed || isMobile) && (
              <span
                className={`px-2 py-0.5 rounded-none text-[11px] font-semibold shrink-0 ${
                  isDispatchActive
                    ? 'bg-[#243044] text-[#cbd5e1]'
                    : counts.dispatchCount > 0
                      ? 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/25'
                      : 'bg-[#243044]/50 text-[#64748b]'
                }`}
              >
                {counts.dispatchCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* ─── Dedicated KAM 1-Line Minimal Indicator ─── */}
      {(!isCollapsed || isMobile) && (
        <div className="shrink-0 px-3.5 py-2 border-t border-[#243044]/80 text-[11px] text-[#94a3b8] flex items-center gap-1.5 min-w-0 bg-[#131b26]/60">
          <Headphones className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
          <span className="truncate">
            Dedicated KAM: <span className="text-white font-medium">Annu Singh</span> <span className="text-[#64748b]">(Lead)</span>
          </span>
        </div>
      )}

      {/* ─── Bottom: Gentelella Profile Capsule ─── */}
      <div className={`shrink-0 p-3.5 border-t border-[#243044] bg-[#131b26] flex items-center justify-between gap-2 ${isCollapsed && !isMobile ? 'justify-center p-2' : ''}`}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-full bg-[#10b981] text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-sm">
            {(brandUser?.full_name || brandUser?.brand_name || 'B').charAt(0).toUpperCase()}
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-white truncate leading-tight">
                {brandUser?.full_name || brandUser?.brand_name || 'Brand POC'}
              </div>
              <div className="text-[12px] font-normal text-[#64748b] truncate leading-tight">
                Client Admin
              </div>
            </div>
          )}
        </div>

        {(!isCollapsed || isMobile) && (
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 rounded-none hover:bg-rose-500/15 text-[#64748b] hover:text-rose-300 transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )

  return (
    <div
      className="h-screen w-screen overflow-hidden flex bg-[#F4F6F9] text-slate-900 font-sans antialiased selection:bg-[#10b981]/20 selection:text-[#10b981]"
      style={{
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* ─── DESKTOP GENTELELLA SIDEBAR (#161e2b) ─── */}
      <aside
        className={`hidden md:flex shrink-0 h-full flex-col justify-between bg-[#161e2b] text-white z-30 shadow-xl overflow-hidden transition-all duration-200 border-r border-[#243044] ${
          isCollapsed ? 'w-20' : 'w-60 lg:w-64'
        }`}
      >
        {renderSidebarContent(false)}
      </aside>

      {/* ─── MOBILE SLIDE-IN DRAWER ─── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-72 bg-[#161e2b] text-white flex flex-col justify-between md:hidden shadow-2xl border-r border-[#243044]"
            >
              {renderSidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── RIGHT WORKSPACE CANVAS (Independently scrollable) ─── */}
      <div className="flex-1 min-w-0 flex flex-col h-full overflow-y-auto bg-[#F4F6F9]">
        {/* Mobile Sticky Navbar */}
        <header className="md:hidden sticky top-0 z-40 bg-[#161e2b] px-4 h-14 flex items-center justify-between text-white shadow-md shrink-0 border-b border-[#243044]">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setMobileOpen(true)}
              className="p-1.5 rounded-none bg-white/10 hover:bg-white/15 text-white cursor-pointer active:scale-95"
              aria-label="Open Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                <img
                  src="https://thehype.in/img/logo.png"
                  alt="TheHype"
                  className="w-full h-full object-contain p-0.5"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).src = '/thehype-logo.png'
                  }}
                />
              </div>
              <span className="font-bold text-sm text-white tracking-tight truncate max-w-[150px]">
                {brandUser?.brand_name || 'TheHype'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-none bg-[#10b981] text-white font-semibold text-xs flex items-center justify-center shrink-0">
              {(brandUser?.full_name || brandUser?.brand_name || 'B').charAt(0).toUpperCase()}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-300 hover:text-rose-400"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* ─── DESKTOP GENTELELLA TOP HEADER (Pure White) ─── */}
        <header className="hidden md:flex h-14 sm:h-16 sticky top-0 z-20 bg-white border-b border-slate-200/90 px-6 lg:px-8 items-center justify-between shadow-xs shrink-0">
          {/* Left: Hamburger Toggle & Clean Breadcrumb */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-none text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              <Menu className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-[13px]">
              <span className="font-normal text-[#64748b]">Home</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-800">{getPageTitle()}</span>
            </div>
          </div>

          {/* Center: Search Box with ⌘K Badge & Real-Time Sync */}
          <BrandHeaderSearch />

          {/* Right Status Controls */}
          <div className="flex items-center gap-3">
            {brandUser?.is_virtual ? (
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-none bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shrink-0" />
                <span>Admin Preview</span>
                <a
                  href="/brand-admin/sample-lists"
                  className="ml-1 text-[11px] underline text-purple-800 hover:text-purple-950 font-bold flex items-center gap-0.5"
                >
                  Exit <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-none bg-emerald-50 border border-emerald-200/80 text-[#10b981] text-xs font-semibold shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
                <span>Live Sync</span>
              </div>
            )}

            <button
              className="p-2 rounded-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {counts.pendingApps > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#ef4444] absolute top-1.5 right-1.5 ring-2 ring-white" />
              )}
            </button>

            <div className="h-5 w-px bg-slate-200" />

            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-[#10b981] text-white font-semibold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {(brandUser?.full_name || brandUser?.brand_name || 'B').charAt(0).toUpperCase()}
              </div>
              <div className="hidden xl:block text-left">
                <div className="text-[13px] font-semibold text-slate-800 leading-tight">
                  {brandUser?.full_name || brandUser?.brand_name || 'Brand POC'}
                </div>
                <div className="text-[11px] text-[#64748b] leading-tight">
                  {brandUser?.email || 'Client Admin'}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ─── Main Content Canvas (Gentelella Cloud Grey) ─── */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  )
}
