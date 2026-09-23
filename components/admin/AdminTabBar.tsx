'use client'

import React, { useEffect, useState, useRef, useMemo } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  X,
  LayoutDashboard,
  Megaphone,
  Users,
  ClipboardList,
  FileCheck,
  CreditCard,
  IndianRupee,
  MessageSquareHeart,
  AlertTriangle,
  BarChart3,
  FileUp,
  Tags,
  UserCheck,
  Sliders,
  User,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldAlert
} from 'lucide-react'
import { getRouteMeta } from '@/lib/utils/page-titles'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'

export interface AdminTab {
  href: string
  title: string
  moduleKey?: string
  iconName?: string
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Megaphone,
  Users,
  ClipboardList,
  FileCheck,
  CreditCard,
  IndianRupee,
  MessageSquareHeart,
  AlertTriangle,
  BarChart3,
  FileUp,
  Tags,
  UserCheck,
  Sliders,
  User,
}

const STORAGE_KEY = 'admin_workspace_open_tabs_v1'

const DEFAULT_TABS: AdminTab[] = [
  { href: '/admin/dashboard', title: 'Dashboard', moduleKey: 'dashboard', iconName: 'LayoutDashboard' },
]

export default function AdminTabBar() {
  const pathname = usePathname()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)
  const { isSuperAdmin, canAccessModule } = useAdminPermissions()

  const [tabs, setTabs] = useState<AdminTab[]>(DEFAULT_TABS)
  const [mounted, setMounted] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  // Load tabs from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTabs(parsed)
        }
      }
    } catch {
      // ignore
    }
    setMounted(true)
  }, [])

  // Auto-add current path to tabs if it's an admin panel page
  useEffect(() => {
    if (!mounted || !pathname || !pathname.startsWith('/admin') || pathname === '/admin') return
    if (pathname.startsWith('/admin/virtual-profile')) return // virtual profile has its own layout

    const meta = getRouteMeta(pathname)
    const baseHref = pathname

    setTabs((prev) => {
      const existsIndex = prev.findIndex((t) => t.href === baseHref)
      let nextTabs: AdminTab[]

      if (existsIndex >= 0) {
        // Already exists, update title if improved
        nextTabs = prev.map((t, idx) =>
          idx === existsIndex ? { ...t, title: meta.title, iconName: meta.iconName || t.iconName } : t
        )
      } else {
        // Add new tab
        const newTab: AdminTab = {
          href: baseHref,
          title: meta.title,
          moduleKey: meta.moduleKey,
          iconName: meta.iconName,
        }
        nextTabs = [...prev, newTab]
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(nextTabs))
      } catch {
        // ignore
      }
      return nextTabs
    })
  }, [pathname, mounted])

  // Scroll active tab into view
  useEffect(() => {
    if (!scrollRef.current) return
    const activeEl = scrollRef.current.querySelector('[data-active="true"]') as HTMLElement | null
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [pathname, tabs])

  // Filter tabs user has permission to see
  const authorizedTabs = useMemo(() => {
    return tabs.filter((t) => {
      if (isSuperAdmin || !t.moduleKey) return true
      return canAccessModule(t.moduleKey)
    })
  }, [tabs, isSuperAdmin, canAccessModule])

  const handleCloseTab = (e: React.MouseEvent, tabToClose: AdminTab) => {
    e.preventDefault()
    e.stopPropagation()

    const remaining = tabs.filter((t) => t.href !== tabToClose.href)
    const fallback = remaining.length > 0 ? remaining : DEFAULT_TABS

    setTabs(fallback)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback))
    } catch {
      // ignore
    }

    // If closing active tab, navigate to the adjacent or first tab
    if (pathname === tabToClose.href) {
      const closedIndex = tabs.findIndex((t) => t.href === tabToClose.href)
      const nextTab = tabs[closedIndex - 1] || tabs[closedIndex + 1] || fallback[0]
      if (nextTab) {
        router.push(nextTab.href)
      } else {
        router.push('/admin/dashboard')
      }
    }
  }

  const handleCloseOtherTabs = () => {
    const currentTab = tabs.find((t) => t.href === pathname)
    const newTabs = currentTab ? [currentTab] : DEFAULT_TABS
    setTabs(newTabs)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newTabs))
    } catch {
      // ignore
    }
    setMenuOpen(false)
  }

  const handleCloseAllTabs = () => {
    setTabs(DEFAULT_TABS)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TABS))
    } catch {
      // ignore
    }
    setMenuOpen(false)
    router.push('/admin/dashboard')
  }

  const scrollLeft = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: -200, behavior: 'smooth' })
  }

  const scrollRight = () => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: 200, behavior: 'smooth' })
  }

  if (!mounted || authorizedTabs.length === 0) return null

  return (
    <div className="flex items-center w-full bg-slate-900/40 border-t border-white/5 px-3 h-10 select-none">
      {/* Scroll Left Button */}
      <button
        type="button"
        onClick={scrollLeft}
        className="h-6 w-6 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-200 flex items-center justify-center shrink-0 mr-1 transition-colors cursor-pointer"
        title="Scroll left"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* Scrollable Tabs Container */}
      <div
        ref={scrollRef}
        className="flex-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none py-1"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {authorizedTabs.map((tab) => {
          const isActive = pathname === tab.href || (tab.href !== '/admin/dashboard' && pathname.startsWith(tab.href + '/'))
          const IconComponent = tab.iconName ? ICON_MAP[tab.iconName] || LayoutDashboard : LayoutDashboard

          return (
            <div
              key={tab.href}
              data-active={isActive ? 'true' : 'false'}
              onClick={() => {
                if (!isActive) router.push(tab.href)
              }}
              className={`group flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium cursor-pointer transition-all duration-150 border shrink-0 max-w-[200px] ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500/40 shadow-xs'
                  : 'bg-slate-900/60 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border-white/5 hover:border-white/10'
              }`}
            >
              <IconComponent
                className={`h-3.5 w-3.5 shrink-0 transition-colors ${
                  isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}
              />
              <span className="truncate">{tab.title}</span>

              {/* Close Button */}
              {authorizedTabs.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => handleCloseTab(e, tab)}
                  className={`p-0.5 rounded-md hover:bg-white/15 text-slate-500 hover:text-slate-100 transition-colors ml-0.5 cursor-pointer ${
                    isActive ? 'opacity-90' : 'opacity-0 group-hover:opacity-100'
                  }`}
                  title="Close tab"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Scroll Right Button */}
      <button
        type="button"
        onClick={scrollRight}
        className="h-6 w-6 rounded-md hover:bg-white/5 text-slate-500 hover:text-slate-200 flex items-center justify-center shrink-0 ml-1 transition-colors cursor-pointer"
        title="Scroll right"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {/* Actions Dropdown (Close Other / Close All) */}
      {authorizedTabs.length > 1 && (
        <div className="relative shrink-0 ml-1">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="h-7 w-7 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tab options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {menuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-8 z-40 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-2xl p-1.5 space-y-0.5 text-xs text-slate-300 backdrop-blur-xl animate-in fade-in-50 zoom-in-95">
                <button
                  type="button"
                  onClick={handleCloseOtherTabs}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white/5 hover:text-white transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>Close Other Tabs</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseAllTabs}
                  className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors cursor-pointer flex items-center justify-between"
                >
                  <span>Close All Tabs</span>
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
