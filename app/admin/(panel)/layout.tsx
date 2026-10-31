'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Megaphone,
  Users,
  LogOut,
  ShieldCheck,
  Menu,
  ChevronRight,
  ChevronDown,
  Sparkles,
  AlertTriangle,
  ClipboardList,
  FileCheck,
  CreditCard,
  BarChart3,
  TrendingUp,
  FileUp,
  MessageSquareHeart,
  UserCheck,
  Sliders,
  ShieldAlert,
  ArrowLeft,
  IndianRupee,
  Tags,
  Radio,
  Award,
  User,
  Instagram,
  MapPin,
  Search,
  X,
} from 'lucide-react'
import NotificationBell from '@/components/ui/NotificationBell'
import { AdminHeaderProvider, useAdminHeader } from '@/components/admin/AdminHeaderContext'
import {
  AdminPermissionsProvider,
  useAdminPermissions,
} from '@/components/admin/AdminPermissionsContext'
import { Button } from '@/components/ui/button'

interface NavLink {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  moduleKey: string
}

interface SidebarCategory {
  id: string
  name: string
  links: NavLink[]
}

const sidebarCategories: SidebarCategory[] = [
  {
    id: 'overview',
    name: 'Overview & Stats',
    links: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
      { href: '/admin/stats', label: 'Platform Stats', icon: TrendingUp, moduleKey: 'analytics' },
      { href: '/admin/poc-dashboard', label: 'POC Performance', icon: Award, moduleKey: 'poc_dashboard' },
      { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, moduleKey: 'analytics' },
    ],
  },
  {
    id: 'campaigns',
    name: 'Campaigns & Operations',
    links: [
      { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone, moduleKey: 'campaigns' },
      { href: '/admin/applications', label: 'Applications', icon: Users, moduleKey: 'applications' },
      { href: '/admin/order-details', label: 'Order Details', icon: ClipboardList, moduleKey: 'order_details' },
      { href: '/admin/address-confirmation', label: 'Address', icon: MapPin, moduleKey: 'applications' },
      { href: '/admin/completion-details', label: 'Completion Details', icon: FileCheck, moduleKey: 'applications' },
    ],
  },
  {
    id: 'talent',
    name: 'Creator & Talent Pool',
    links: [
      { href: '/admin/influencers', label: 'Influencers', icon: Users, moduleKey: 'influencers' },
      { href: '/admin/ghosted', label: 'Ghosted Creators', icon: ShieldAlert, moduleKey: 'applications' },
      { href: '/admin/instagram-logs', label: 'Instagram Logs', icon: Instagram, moduleKey: 'applications' },
      { href: '/admin/categories', label: 'Categories & Niches', icon: Tags, moduleKey: 'influencers' },
      { href: '/admin/import', label: 'Import Sync', icon: FileUp, moduleKey: 'import' },
    ],
  },
  {
    id: 'finance',
    name: 'Finance & Payments',
    links: [
      { href: '/admin/payments', label: 'Payment Desk', icon: CreditCard, moduleKey: 'payments' },
      { href: '/admin/finance', label: 'Finance Payouts', icon: IndianRupee, moduleKey: 'payments' },
    ],
  },
  {
    id: 'support',
    name: 'Support & Alerts',
    links: [
      { href: '/admin/user-issues', label: 'User Issues', icon: AlertTriangle, moduleKey: 'user_issues' },
      { href: '/admin/feedback', label: 'User Feedback', icon: MessageSquareHeart, moduleKey: 'feedback' },
      { href: '/admin/broadcasts', label: 'In-App Alerts', icon: Radio, moduleKey: 'broadcasts' },
    ],
  },
  {
    id: 'system',
    name: 'System & Security',
    links: [
      { href: '/admin/staff', label: 'Employee Management', icon: UserCheck, moduleKey: 'staff' },
      { href: '/admin/roles', label: 'Roles & Access', icon: Sliders, moduleKey: 'roles' },
    ],
  },
]

const allSidebarLinks: NavLink[] = sidebarCategories.flatMap((c) => c.links)

function getModuleKeyFromPath(pathname: string): string | null {
  if (pathname === '/admin/dashboard') return 'dashboard'
  if (pathname.startsWith('/admin/stats')) return 'analytics'
  if (pathname.startsWith('/admin/poc-dashboard')) return 'poc_dashboard'
  if (pathname.startsWith('/admin/campaigns')) return 'campaigns'
  if (pathname.startsWith('/admin/applications')) return 'applications'
  if (pathname.startsWith('/admin/order-details')) return 'order_details'
  if (pathname.startsWith('/admin/address-confirmation')) return 'applications'
  if (pathname.startsWith('/admin/completion-details')) return 'applications'
  if (pathname.startsWith('/admin/ghosted')) return 'applications'
  if (pathname.startsWith('/admin/instagram-logs')) return 'applications'
  if (pathname.startsWith('/admin/finance')) return 'payments'
  if (pathname.startsWith('/admin/payments')) return 'payments'
  if (pathname.startsWith('/admin/feedback')) return 'feedback'
  if (pathname.startsWith('/admin/user-issues')) return 'user_issues'
  if (pathname.startsWith('/admin/broadcasts')) return 'broadcasts'
  if (pathname.startsWith('/admin/analytics')) return 'analytics'
  if (pathname.startsWith('/admin/import')) return 'import'
  if (pathname.startsWith('/admin/influencers')) return 'influencers'
  if (pathname.startsWith('/admin/categories')) return 'influencers'
  if (pathname.startsWith('/admin/staff')) return 'staff'
  if (pathname.startsWith('/admin/roles')) return 'roles'
  return null
}

function AdminPanelInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  // Virtual Profile & Virtual Brand use their dedicated layouts
  if (pathname.startsWith('/admin/virtual-profile') || pathname.startsWith('/admin/virtual-brand')) {
    return <>{children}</>
  }

  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)
  const { headerContent } = useAdminHeader()
  const { admin, loading, isSuperAdmin, canAccessModule } = useAdminPermissions()

  // Sidebar search & category collapse state
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({})
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Load category collapse preference from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_collapsed_categories')
      if (saved) {
        setCollapsedCategories(JSON.parse(saved))
      }
    } catch {
      // ignore
    }
  }, [])

  // Keyboard shortcut: '/' to focus search input, Escape to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement !== searchInputRef.current) {
        const isInput = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')
        if (!isInput) {
          e.preventDefault()
          searchInputRef.current?.focus()
        }
      } else if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
        setSearchQuery('')
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const toggleCategory = (categoryId: string) => {
    setCollapsedCategories((prev) => {
      const next = { ...prev, [categoryId]: !prev[categoryId] }
      try {
        localStorage.setItem('admin_sidebar_collapsed_categories', JSON.stringify(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  // Sidebar dynamic badge counters (unresolved issues & pending feedback)
  const [sidebarCounters, setSidebarCounters] = useState<{
    user_issues?: { unresolved: number; total: number }
    feedback?: { unresolved: number; total: number }
  }>({})

  const fetchCounters = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sidebar-counters')
      if (res.ok) {
        const data = await res.json()
        if (data.counters) {
          setSidebarCounters(data.counters)
        }
      }
    } catch {
      // ignore network errors silently
    }
  }, [])

  useEffect(() => {
    fetchCounters()
    const interval = setInterval(fetchCounters, 30000)

    const handleRefresh = () => fetchCounters()
    window.addEventListener('admin-counters-refresh', handleRefresh)
    window.addEventListener('focus', handleRefresh)

    return () => {
      clearInterval(interval)
      window.removeEventListener('admin-counters-refresh', handleRefresh)
      window.removeEventListener('focus', handleRefresh)
    }
  }, [fetchCounters])

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' })
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('admin_cache')
      router.push('/admin')
      router.refresh()
    }
  }

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  // Filter categories and links based on RBAC permissions and user search query
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const processedCategories = useMemo(() => {
    return sidebarCategories
      .map((cat) => {
        // 1. Filter by role access
        const permittedLinks = cat.links.filter((link) => {
          if (isSuperAdmin) return true
          return canAccessModule(link.moduleKey)
        })

        // 2. Filter by search query
        const matchingLinks = permittedLinks.filter((link) => {
          if (!normalizedQuery) return true
          return (
            link.label.toLowerCase().includes(normalizedQuery) ||
            cat.name.toLowerCase().includes(normalizedQuery) ||
            link.href.toLowerCase().includes(normalizedQuery)
          )
        })

        const hasActiveLink = matchingLinks.some((link) => isActive(link.href))

        return {
          ...cat,
          links: matchingLinks,
          totalPermitted: permittedLinks.length,
          hasActiveLink,
        }
      })
      .filter((cat) => cat.links.length > 0)
  }, [isSuperAdmin, canAccessModule, normalizedQuery, pathname])

  const totalMatchingLinks = useMemo(() => {
    return processedCategories.reduce((acc, cat) => acc + cat.links.length, 0)
  }, [processedCategories])

  const visibleLinks = useMemo(() => {
    return allSidebarLinks.filter((link) => {
      if (isSuperAdmin) return true
      return canAccessModule(link.moduleKey)
    })
  }, [isSuperAdmin, canAccessModule])

  // Check if current route is authorized
  const currentModuleKey = getModuleKeyFromPath(pathname)
  const isAuthorized = !currentModuleKey || isSuperAdmin || canAccessModule(currentModuleKey)

  const firstAvailableLink = visibleLinks[0]?.href || '/admin'

  return (
    <div className="dark min-h-screen bg-slate-950 text-white font-sans flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col overflow-hidden transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/5 shrink-0">
          <Link href="/admin/dashboard" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-500 shadow-lg shadow-indigo-500/20">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold text-white">Admin</span>
              <span className="text-[10px] text-indigo-400 block -mt-1 font-medium">1to7 Media</span>
            </div>
          </Link>
        </div>

        {/* Admin Info & Role Badge - Clickable to /admin/profile */}
        <Link
          href="/admin/profile"
          onClick={() => setSidebarOpen(false)}
          className={`block p-4 border-b border-white/5 transition-all hover:bg-white/[0.04] group cursor-pointer shrink-0 ${
            pathname === '/admin/profile' ? 'bg-indigo-500/10' : ''
          }`}
          suppressHydrationWarning
        >
          <div className="flex items-center gap-3" suppressHydrationWarning>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white shadow-md group-hover:scale-105 transition-transform" suppressHydrationWarning>
              {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0" suppressHydrationWarning>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white truncate group-hover:text-indigo-300 transition-colors" suppressHydrationWarning>{admin?.name || 'Admin'}</p>
                <User className="h-3.5 w-3.5 text-slate-500 group-hover:text-indigo-400 transition-colors shrink-0" />
              </div>
              <div className="flex items-center gap-1.5 mt-0.5" suppressHydrationWarning>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate max-w-[120px]" suppressHydrationWarning>
                  {admin?.roleDisplayName || (isSuperAdmin ? 'Super Admin' : admin?.role || 'Staff')}
                </span>
                {admin?.phone ? (
                  <span className="text-[10px] text-emerald-400 font-mono" title={`Phone linked: ${admin.phone}`}>
                    📞
                  </span>
                ) : (
                  <span className="text-[9px] text-amber-400/80 font-medium" title="Add phone in profile">
                    +Phone
                  </span>
                )}
              </div>
            </div>
          </div>
        </Link>

        {/* Quick Search Input */}
        <div className="p-3 pb-2 border-b border-white/5 shrink-0 bg-slate-900/60">
          <div className="relative flex items-center">
            <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search routes... (/)"
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition-all shadow-inner"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 p-0.5 text-slate-400 hover:text-white rounded-md cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : (
              <kbd className="absolute right-2 pointer-events-none text-[9px] font-mono text-slate-500 bg-white/5 px-1 py-0.5 rounded border border-white/5">
                /
              </kbd>
            )}
          </div>
        </div>

        {/* Dynamic Nav Links Grouped by Category with Collapse/Expand */}
        <nav className="flex-1 p-3 space-y-3 overflow-y-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {totalMatchingLinks === 0 ? (
            <div className="py-8 px-2 text-center space-y-2">
              <p className="text-xs text-slate-400 font-medium">No routes found matching</p>
              <p className="text-xs font-mono text-indigo-300 break-all">&ldquo;{searchQuery}&rdquo;</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer pt-1"
              >
                Clear filter
              </button>
            </div>
          ) : (
            processedCategories.map((category) => {
              // Expanded if user is searching, or if it contains active child, or if not collapsed in state
              const isSearching = normalizedQuery.length > 0
              const isExpanded = isSearching || category.hasActiveLink || !collapsedCategories[category.id]

              return (
                <div key={category.id} className="space-y-1">
                  {/* Category Header with Collapse/Expand Toggle */}
                  <button
                    type="button"
                    onClick={() => toggleCategory(category.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] rounded-lg transition-colors group cursor-pointer select-none"
                    title={isExpanded ? 'Click to collapse section' : 'Click to expand section'}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {category.hasActiveLink && (
                        <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-sm shadow-indigo-400/80 shrink-0" />
                      )}
                      <span
                        className={`truncate tracking-wider ${
                          category.hasActiveLink ? 'text-indigo-300 font-extrabold' : 'text-slate-400 group-hover:text-slate-300'
                        }`}
                      >
                        {category.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      <span className="text-[9px] font-mono text-slate-600 group-hover:text-slate-500">
                        {category.links.length}
                      </span>
                      <ChevronDown
                        className={`h-3 w-3 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                          isExpanded ? 'rotate-0' : '-rotate-90'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Category Links */}
                  {isExpanded && (
                    <div className="space-y-0.5 pt-0.5">
                      {category.links.map((link) => {
                        const active = isActive(link.href)

                        // Check for unaddressed counter badge
                        let counterCount = 0
                        let counterType: 'issues' | 'feedback' | null = null

                        if (link.href === '/admin/user-issues' && sidebarCounters.user_issues) {
                          counterCount = sidebarCounters.user_issues.unresolved
                          counterType = 'issues'
                        } else if (link.href === '/admin/feedback' && sidebarCounters.feedback) {
                          counterCount = sidebarCounters.feedback.unresolved
                          counterType = 'feedback'
                        }

                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            prefetch={true}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 group cursor-pointer ${
                              active
                                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-md shadow-indigo-500/5 translate-x-1'
                                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5 hover:translate-x-0.5'
                            }`}
                          >
                            <link.icon
                              className={`h-4 w-4 transition-colors shrink-0 ${
                                active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                              }`}
                            />
                            <span className="truncate">{link.label}</span>

                            {/* Unresolved Issues Counter Badge */}
                            {counterCount > 0 && counterType === 'issues' && (
                              <span
                                title={`${counterCount} unresolved user issue${counterCount > 1 ? 's' : ''}`}
                                className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0 shadow-sm shadow-rose-500/10"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
                                {counterCount}
                              </span>
                            )}

                            {/* Pending Feedback Counter Badge */}
                            {counterCount > 0 && counterType === 'feedback' && (
                              <span
                                title={`${counterCount} pending feedback submission${counterCount > 1 ? 's' : ''}`}
                                className="ml-auto inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0 shadow-sm shadow-amber-500/10"
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                {counterCount}
                              </span>
                            )}

                            {active && counterCount === 0 && (
                              <ChevronRight className="ml-auto h-4 w-4 text-indigo-400 shrink-0" />
                            )}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </nav>

        {/* Profile & Logout Footer */}
        <div className="p-3 border-t border-white/5 space-y-1 shrink-0">
          <Link
            href="/admin/profile"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium transition-all cursor-pointer ${
              pathname === '/admin/profile'
                ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-md shadow-indigo-500/5'
                : 'text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <User className="h-4.5 w-4.5 text-indigo-400" />
            <span>My Profile</span>
            {admin?.phone ? (
              <span className="ml-auto text-[10px] text-emerald-400 font-mono font-medium">Linked</span>
            ) : (
              <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded font-semibold">
                Add Phone
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setShowLogoutDialog(true)}
            className="flex items-center gap-3 w-full rounded-xl px-4 py-2 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 lg:pl-64">
        {/* Top Bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-slate-950/90 backdrop-blur-lg border-b border-white/5 px-4 py-5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-purple-500">
                <ShieldCheck className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-bold text-white">Admin</span>
            </div>
            <NotificationBell apiEndpoint="/api/admin/notifications" accentColor="indigo" storageKey="admin_notif_read" />
          </div>
          {headerContent && (
            <div className="pt-2 border-t border-white/5">{headerContent}</div>
          )}
        </header>

        {/* Desktop Top Bar */}
        <header className="hidden lg:flex sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-white/5 px-6 py-6 items-center justify-between gap-6 min-h-[80px]">
          <div className="flex-1 min-w-0 py-1.5">
            {headerContent || (
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  {allSidebarLinks.find((link) => isActive(link.href))?.label || 'Admin Panel'}
                </h1>
              </div>
            )}
          </div>
          <div className="shrink-0 flex items-center gap-3">
            <NotificationBell apiEndpoint="/api/admin/notifications" accentColor="indigo" storageKey="admin_notif_read" />
          </div>
        </header>

        {/* Page Content with Dynamic Route Guard */}
        <main
          className={`flex-1 min-w-0 overflow-x-hidden ${
            pathname === '/admin/profile'
              ? 'p-3 sm:p-4 lg:p-5 pt-2 sm:pt-2.5 lg:pt-3'
              : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          {!loading && !isAuthorized ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-6 shadow-xl shadow-amber-500/5">
                <ShieldAlert className="h-10 w-10" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Access Restricted</h2>
              <p className="text-slate-400 text-sm max-w-md mb-6 leading-relaxed">
                Your role ({admin?.roleDisplayName || admin?.role || 'Staff'}) does not have permission to view or manage this module. Please contact a Super Admin if you need access.
              </p>
              <Button
                onClick={() => router.push(firstAvailableLink)}
                className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl px-5 h-11 cursor-pointer font-medium flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Return to Permitted Modules
              </Button>
            </div>
          ) : (
            children
          )}
        </main>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showLogoutDialog && (
        <div className="fixed inset-0 isolate z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowLogoutDialog(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />
          <div className="relative z-50 w-full max-w-[440px] p-6 sm:p-7 rounded-3xl bg-slate-900/98 backdrop-blur-2xl border border-white/10 text-white shadow-2xl shadow-black/90 font-sans">
            <div className="space-y-4 text-center items-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-red-500/20 to-red-950/40 shadow-inner shadow-red-500/20 ring-1 ring-red-500/30 mx-auto">
                <AlertTriangle className="h-7 w-7 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-xl font-bold tracking-tight text-white">
                  Ready to Sign Out?
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed max-w-[320px] mx-auto">
                  You are about to sign out of the <span className="text-slate-200 font-semibold">Admin Portal</span>. You will need to enter your credentials again to access management tools.
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-row items-center justify-between gap-3 pt-3 border-t border-white/5 w-full">
              <button
                type="button"
                onClick={() => setShowLogoutDialog(false)}
                className="flex-1 bg-slate-800/90 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white rounded-xl h-11 transition-all font-medium flex items-center justify-center cursor-pointer text-sm"
              >
                Stay Logged In
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white cursor-pointer rounded-xl h-11 shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all border border-red-500/50 hover:border-red-400 font-semibold tracking-wide flex items-center justify-center text-sm"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminPermissionsProvider>
      <AdminHeaderProvider>
        <AdminPanelInner>{children}</AdminPanelInner>
      </AdminHeaderProvider>
    </AdminPermissionsProvider>
  )
}
