'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import {
  LayoutDashboard,
  Send,
  CheckCircle2,
  User,
  LogOut,
  Sparkles,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react'

const sidebarLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Applied', icon: Send },
  { href: '/dashboard/approved', label: 'Approved', icon: CheckCircle2 },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-slate-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 shadow-lg shadow-purple-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-white">1to7 Media</span>
          </Link>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name || 'Creator'}</p>
              <p className="text-xs text-slate-400 truncate">{user?.influencer_id || 'ID Loading...'}</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 group cursor-pointer ${
                  isActive
                    ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
                }`}
              >
                <link.icon className={`h-4.5 w-4.5 ${isActive ? 'text-purple-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {link.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4 text-purple-400" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/5">
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-slate-950/90 backdrop-blur-lg border-b border-white/5 px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-pink-500">
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">1to7 Media</span>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
