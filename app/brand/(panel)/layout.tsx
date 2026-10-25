'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Users,
  Truck,
  Video,
  BarChart3,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Sparkles,
  ExternalLink,
  Bell,
  CheckCircle2
} from 'lucide-react'
import { toast } from 'sonner'
import type { BrandPayload } from '@/types/brand'

interface NavItem {
  name: string
  href: string
  icon: React.ElementType
  badge?: string
}

const navItems: NavItem[] = [
  { name: 'Dashboard', href: '/brand/dashboard', icon: LayoutDashboard },
  { name: 'Campaigns & Review', href: '/brand/campaigns', icon: Users },
  { name: 'Sample Dispatches', href: '/brand/dispatches', icon: Truck },
  { name: 'Live Deliverables', href: '/brand/deliverables', icon: Video },
  { name: 'Analytics & ROI', href: '/brand/reports', icon: BarChart3 },
  { name: 'Brand Admin', href: '/brand/admin/team', icon: Shield },
]

export default function BrandPanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [brandUser, setBrandUser] = useState<BrandPayload | null>(null)
  const [loading, setLoading] = useState(true)

  // Fetch brand session
  useEffect(() => {
    fetch('/api/brand/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated && data.user) {
          setBrandUser(data.user)
        } else {
          // Fallback demo user if running locally without active session
          setBrandUser({
            id: 'brand-demo-1',
            brand_id: 'brand-101',
            email: 'marketing@brand.com',
            full_name: 'Brand Marketing Lead',
            role: 'owner',
            brand_name: 'Mamaearth',
            brand_slug: 'mamaearth',
          })
        }
      })
      .catch(() => {
        setBrandUser({
          id: 'brand-demo-1',
          brand_id: 'brand-101',
          email: 'marketing@brand.com',
          full_name: 'Brand Marketing Lead',
          role: 'owner',
          brand_name: 'Mamaearth',
          brand_slug: 'mamaearth',
        })
      })
      .finally(() => setLoading(false))
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    try {
      await fetch('/api/brand/auth/logout', { method: 'POST' })
      toast.success('Signed out of Brand Workspace')
      router.push('/brand/login')
    } catch {
      router.push('/brand/login')
    }
  }

  const isActive = (href: string) => {
    if (href === '/brand/dashboard') {
      return pathname === '/brand/dashboard' || pathname === '/brand'
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col md:flex-row text-[#1a1c1c]">
      {/* ─── DESKTOP SIDEBAR (Strictly #2d3132 dark charcoal slate) ─── */}
      <aside className="hidden md:flex flex-col w-64 bg-[#2d3132] border-r border-white/10 shrink-0 select-none">
        {/* Brand Workspace Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/logo-icon.svg"
              alt="1to7 Media"
              className="w-10 h-10 object-contain drop-shadow-md shrink-0"
            />
            <div className="overflow-hidden">
              <h2 className="font-bold text-white text-base truncate leading-tight">
                {brandUser?.brand_name || 'Brand Workspace'}
              </h2>
              <span className="text-[11px] uppercase tracking-wider text-amber-400 font-medium">
                {brandUser?.role === 'owner' ? 'Director Workspace' : 'Brand Reviewer'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#febd1c] text-black font-semibold shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-black' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Mini Profile & Logout */}
        <div className="p-4 border-t border-white/10 bg-[#242728]">
          <div className="flex items-center justify-between">
            <div className="overflow-hidden pr-2">
              <p className="text-xs font-semibold text-white truncate">
                {brandUser?.full_name || 'Brand Manager'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {brandUser?.email || 'brand@company.com'}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* ─── MOBILE TOPBAR & DRAWER ─── */}
      <div className="md:hidden sticky top-0 z-40 bg-[#2d3132] border-b border-white/10 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo-icon.svg"
            alt="1to7 Media"
            className="w-8 h-8 object-contain shrink-0"
          />
          <div>
            <h1 className="font-bold text-sm leading-tight text-white">
              {brandUser?.brand_name || 'Brand Workspace'}
            </h1>
            <span className="text-[10px] text-amber-400 uppercase font-semibold">
              Brand Portal
            </span>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition cursor-pointer"
          aria-label="Toggle Navigation"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden fixed inset-x-0 top-14.5 z-50 bg-[#2d3132] border-b border-white/10 p-4 shadow-xl"
          >
            <nav className="space-y-2">
              {navItems.map((item) => {
                const active = isActive(item.href)
                const Icon = item.icon
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                      active
                        ? 'bg-[#febd1c] text-black font-semibold'
                        : 'text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
              <div className="pt-3 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 font-medium"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT CANVAS (#f9f9f9) ─── */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Sticky Desktop Sub-header */}
        <header className="hidden md:flex h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 sm:px-8 items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
              Enterprise Brand Hub
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-sm font-semibold text-[#1a1c1c]">
              {brandUser?.brand_name || 'Brand Workspace'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-time Live Sync</span>
            </div>

            <Link
              href="/admin/applications"
              className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500 hover:text-black py-1.5 px-3 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
            >
              <span>1to7 Internal Admin</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Page Inner Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* ─── MOBILE BOTTOM BAR (For Quick Thumb Navigation) ─── */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 4).map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-3 rounded-lg text-[10px] font-medium transition ${
                active ? 'text-[#febd1c] font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-4 h-4 mb-0.5 ${active ? 'text-[#febd1c]' : 'text-slate-400'}`} />
              <span>{item.name.split(' ')[0]}</span>
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
