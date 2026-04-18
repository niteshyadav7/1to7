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
  AlertTriangle,
} from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

const sidebarLinks = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/campaigns', label: 'Applied', icon: Send },
  { href: '/dashboard/approved', label: 'Approved', icon: CheckCircle2 },
  { href: '/dashboard/profile', label: 'Profile', icon: User },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout, isProfileComplete } = useAuth()
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
          <AlertDialog>
            <AlertDialogTrigger className="flex items-center gap-3 w-full rounded-xl px-4 py-2.5 text-sm font-medium text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer">
              <LogOut className="h-4.5 w-4.5" />
              Sign Out
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-slate-900/95 backdrop-blur-xl border border-white/10 text-white shadow-2xl shadow-black/50 rounded-3xl overflow-hidden font-['Lato',sans-serif] w-full max-w-[400px] p-0 flex flex-col gap-0 border-t-white/20">
              <AlertDialogHeader className="p-8 pb-6 flex flex-col items-center justify-center space-y-5 w-full text-center sm:text-center">
                <AlertDialogTitle className="flex flex-col items-center justify-center gap-5 text-xl font-bold tracking-wide w-full text-center sm:text-center">
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-2xl bg-gradient-to-b from-red-500/20 to-red-950/40 shadow-inner shadow-red-500/20 ring-1 ring-white/5 mx-auto">
                    <AlertTriangle className="h-8 w-8 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                  </div>
                  Ready to Sign Out?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-400 text-center sm:text-center text-[15px] leading-relaxed max-w-[320px] mx-auto w-full">
                  You are about to sign out of the <span className="text-slate-200 font-semibold">Creator Dashboard</span>. You will need to log in again to access your campaigns.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="bg-slate-950/50 p-6 flex flex-col sm:flex-row items-center justify-center sm:justify-center gap-3 sm:gap-4 border-t border-white/5 w-full">
                <AlertDialogCancel className="mt-0 group relative overflow-hidden bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-800 hover:text-white hover:border-white/20 cursor-pointer w-full sm:w-[150px] rounded-xl h-11 transition-all duration-300 font-medium flex items-center justify-center">
                  Stay Logged In
                </AlertDialogCancel>
                <AlertDialogAction onClick={logout} className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white cursor-pointer w-full sm:w-[150px] rounded-xl h-11 shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all duration-300 border border-red-500/50 hover:border-red-400 font-semibold tracking-wide flex items-center justify-center">
                  Yes, Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
          {!isProfileComplete() && (
            <div className="mb-6 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 p-4 lg:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg shadow-amber-500/5">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm lg:text-base">🚀 Your application is under review!</h3>
                  <p className="text-slate-300 text-xs lg:text-sm mt-0.5 max-w-xl leading-relaxed">Please complete your profile (Instagram & Bank Details) so brands can verify your applications and we can process your payments faster.</p>
                </div>
              </div>
              <Link href="/dashboard/profile" className="shrink-0 bg-amber-500 hover:bg-amber-400 text-slate-950 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-amber-500/20 w-full sm:w-auto text-center cursor-pointer">
                Complete Profile
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
