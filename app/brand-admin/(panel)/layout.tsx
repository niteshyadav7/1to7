'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  LayoutDashboard,
  Building2,
  Clock,
  Target,
  Users,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ArrowRightLeft,
  Crown,
  Eye,
  BookmarkPlus,
  CheckSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { BrandAdminPayload } from '@/types/brand-admin'

interface NavItem {
  title: string
  href: string
  icon: any
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/brand-admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Client Brands',
    href: '/brand-admin/brands',
    icon: Building2,
  },
  {
    title: 'Campaign Curation',
    href: '/brand-admin/campaign-pitches',
    icon: Sparkles,
    badge: 'Desk',
  },
  {
    title: 'Sample Rosters',
    href: '/brand-admin/sample-lists',
    icon: BookmarkPlus,
    badge: 'Pitch',
  },
  {
    title: 'Brand Shortlists',
    href: '/brand-admin/brand-shortlists',
    icon: CheckSquare,
    badge: 'Inbound',
  },
  {
    title: 'Virtual Brand Studio',
    href: '/brand-admin/virtual-brand',
    icon: Eye,
    badge: 'Proxy',
  },
  {
    title: 'Review SLA Watchtower',
    href: '/brand-admin/reviews-sla',
    icon: Clock,
    badge: 'Live',
  },
  {
    title: 'Campaign Mapping',
    href: '/brand-admin/campaign-mapping',
    icon: Target,
  },
  {
    title: 'Staff RBAC & Approvals',
    href: '/brand-admin/team-rbac',
    icon: ShieldCheck,
  },
]

export default function BrandAdminPanelLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<BrandAdminPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load saved sidebar collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('brand_admin_sidebar_collapsed')
      if (saved !== null) setIsCollapsed(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('brand_admin_sidebar_collapsed', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

  // Verify Brand Admin session
  useEffect(() => {
    let mounted = true
    async function verifyAuth() {
      try {
        const cached = localStorage.getItem('brand_admin_user')
        if (cached) {
          try {
            setUser(JSON.parse(cached))
          } catch {}
        }

        const res = await fetch('/api/brand-admin/auth/me')
        if (!res.ok) {
          if (mounted) {
            router.push('/brand-admin/login')
          }
          return
        }

        const data = await res.json()
        if (mounted && data.user) {
          setUser(data.user)
          localStorage.setItem('brand_admin_user', JSON.stringify(data.user))
        }
      } catch {
        if (mounted) router.push('/brand-admin/login')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    verifyAuth()
    return () => {
      mounted = false
    }
  }, [router])

  const handleLogout = async () => {
    try {
      await fetch('/api/brand-admin/auth/logout', { method: 'POST' })
      localStorage.removeItem('brand_admin_user')
      toast.success('Logged out of Brand Operations Admin')
      router.push('/brand-admin/login')
    } catch {
      router.push('/brand-admin/login')
    }
  }

  return (
    <div className="min-h-screen w-full max-w-full bg-[#0c1017] text-white flex flex-col font-sans">
      {/* Desktop Sidebar (Fixed sticky admin style with collapsible state) */}
      <aside className={`hidden lg:flex flex-col fixed top-0 left-0 z-40 h-screen bg-[#121620] border-r border-white/10 select-none overflow-hidden transition-all duration-300 ${
        isCollapsed ? 'lg:w-20' : 'lg:w-72'
      } w-72`}>
        {/* Brand Header */}
        <div className={`p-4 border-b border-white/10 flex items-center shrink-0 ${
          isCollapsed ? 'lg:flex-col lg:gap-2.5 lg:justify-center' : 'justify-between'
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#0c1017] border border-white/10 flex items-center justify-center p-1.5 shadow-md shrink-0">
              <Image
                src="/logo-icon.svg"
                alt="1to7 Media"
                width={24}
                height={24}
                className="object-contain"
              />
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white text-sm tracking-tight truncate">1to7 Media</span>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#febd1c] text-neutral-950 shrink-0">
                    OPS
                  </span>
                </div>
                <p className="text-[10px] text-neutral-400 font-medium truncate">Brand Operations</p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            className="hidden lg:flex items-center justify-center h-7 w-7 text-neutral-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Current User Pill */}
        {user && (
          <div
            className={`my-2 p-2 rounded-xl bg-[#171d2a] border border-white/5 flex items-center shrink-0 ${
              isCollapsed ? 'mx-2 justify-center' : 'mx-3 gap-2.5'
            }`}
            title={isCollapsed ? `${user.name} (${user.is_super_admin ? 'Super Admin' : user.brand_admin_role.toUpperCase()})` : undefined}
          >
            <div className="w-8 h-8 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
              {user.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            {!isCollapsed && (
              <div className="overflow-hidden min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {user.is_super_admin ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Crown className="w-2.5 h-2.5" /> Super Admin
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-blue-500/20 text-blue-300">
                      {user.brand_admin_role.toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Navigation Items (Scrollable internally) */}
        <nav className={`flex-1 space-y-1 overflow-y-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isCollapsed ? 'px-2 py-2' : 'px-3 py-2'
        }`}>
          {!isCollapsed && (
            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
              Brand Management
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (item.href !== '/brand-admin/dashboard' && pathname.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                title={isCollapsed ? (item.badge ? `${item.title} (${item.badge})` : item.title) : undefined}
                className={`flex items-center rounded-xl text-xs font-medium transition-all duration-200 group relative ${
                  isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2.5'
                } ${
                  isActive
                    ? 'bg-[#febd1c] text-neutral-950 font-bold shadow-md shadow-amber-500/10'
                    : 'text-neutral-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-neutral-950' : 'text-neutral-400 group-hover:text-white'
                    }`}
                  />
                  {!isCollapsed && <span>{item.title}</span>}
                </div>
                {!isCollapsed && item.badge && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isActive
                        ? 'bg-neutral-950 text-[#febd1c]'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isCollapsed && item.badge && (
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-400" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Footer Switches */}
        <div className={`border-t border-white/10 space-y-1.5 shrink-0 bg-[#121620] ${
          isCollapsed ? 'p-2' : 'p-3'
        }`}>
          {/* Switch to Influencer Admin */}
          <Link
            href="/admin/dashboard"
            title={isCollapsed ? "Switch to Influencer Admin" : undefined}
            className={`flex items-center rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-white/5 transition-colors border border-white/5 ${
              isCollapsed ? 'justify-center p-2.5' : 'justify-between px-3.5 py-2'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              {!isCollapsed && <span>Influencer Admin</span>}
            </div>
            {!isCollapsed && <ExternalLink className="w-3 h-3 text-neutral-500 shrink-0" />}
          </Link>

          {/* Sign Out */}
          <button
            type="button"
            onClick={handleLogout}
            title={isCollapsed ? "Sign Out" : undefined}
            className={`w-full flex items-center rounded-xl text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors cursor-pointer ${
              isCollapsed ? 'justify-center p-2.5' : 'gap-2.5 px-3.5 py-2'
            }`}
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area Wrapper (Padded on desktop to accommodate fixed sidebar) */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 w-full max-w-full transition-[padding] duration-300 ${
        isCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      }`}>
        {/* Mobile Top Header */}
        <header className="lg:hidden w-full bg-[#121620] border-b border-white/10 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#0c1017] border border-white/10 flex items-center justify-center p-1.5">
              <Image src="/logo-icon.svg" alt="1to7" width={22} height={22} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-sm text-white">1to7 Media</span>
                <span className="px-1 py-0.2 rounded text-[9px] font-bold bg-[#febd1c] text-neutral-950">
                  BRAND OPS
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-white/5 text-neutral-300 hover:text-white hover:bg-white/10"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex">
            <div className="w-72 bg-[#121620] border-r border-white/10 h-full p-4 flex flex-col">
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <Image src="/logo-icon.svg" alt="1to7" width={26} height={26} />
                  <span className="font-bold text-white text-sm">Brand Operations</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg bg-white/5 text-neutral-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {user && (
                <div className="p-3 rounded-xl bg-[#171d2a] border border-white/5 mb-4">
                  <p className="text-xs font-semibold text-white">{user.name}</p>
                  <p className="text-[11px] text-neutral-400">{user.email}</p>
                  <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {user.brand_admin_role.toUpperCase()}
                  </span>
                </div>
              )}

              <nav className="flex-1 space-y-1">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                        isActive
                          ? 'bg-[#febd1c] text-neutral-950 font-bold'
                          : 'text-neutral-300 hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  )
                })}
              </nav>

              <div className="pt-4 border-t border-white/10 space-y-2">
                <Link
                  href="/admin/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 text-xs text-neutral-400 rounded-xl bg-white/5"
                >
                  <span>Influencer Admin</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 rounded-xl hover:bg-red-500/10"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
            <div className="flex-1" onClick={() => setMobileMenuOpen(false)} />
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 w-full max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
