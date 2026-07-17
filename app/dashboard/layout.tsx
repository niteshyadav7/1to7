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
import NotificationBell from '@/components/ui/NotificationBell'
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
    <div className="min-h-screen bg-background text-charcoal-surface font-sans flex selection:bg-primary-container/30">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-border-subtle flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 pb-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-container shadow-md">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <span className="text-lg font-bold text-charcoal-surface">1to7 Media</span>
          </Link>
          <div className="hidden lg:block">
            <NotificationBell apiEndpoint="/api/dashboard/notifications" accentColor="yellow" storageKey="influencer_notif_read" />
          </div>
        </div>

        {/* User Info */}
        <div className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-sm font-bold text-black shadow-sm">
              {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-charcoal-surface truncate">{user?.full_name || 'Creator'}</p>
              <p className="text-xs text-secondary truncate">{user?.influencer_id || 'ID Loading...'}</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-2 space-y-1">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-md px-4 py-2.5 text-sm font-semibold transition-all duration-200 group cursor-pointer border ${
                  isActive
                    ? 'bg-primary-container text-black border-primary-container/30 shadow-sm'
                    : 'text-secondary hover:bg-slate-100 hover:text-charcoal-surface border-transparent'
                }`}
              >
                <link.icon className={`h-4.5 w-4.5 ${isActive ? 'text-black' : 'text-secondary group-hover:text-charcoal-surface'}`} />
                {link.label}
                {isActive && <ChevronRight className="ml-auto h-4 w-4 text-black" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 mt-auto">
          <AlertDialog>
            <AlertDialogTrigger className="flex items-center gap-3 w-full rounded-md px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer">
              <LogOut className="h-4.5 w-4.5" />
              Sign Out
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-white border border-border-subtle text-charcoal-surface shadow-2xl rounded-md overflow-hidden w-full max-w-[400px] p-0 flex flex-col gap-0">
              <AlertDialogHeader className="p-8 pb-6 flex flex-col items-center justify-center space-y-5 w-full text-center sm:text-center">
                <AlertDialogTitle className="flex flex-col items-center justify-center gap-5 text-xl font-bold tracking-wide w-full text-center sm:text-center">
                  <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-red-50 border border-red-100 mx-auto">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  Ready to Sign Out?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-secondary text-center sm:text-center text-[15px] leading-relaxed max-w-[320px] mx-auto w-full">
                  You are about to sign out of the <span className="text-charcoal-surface font-semibold">Creator Dashboard</span>. You will need to log in again to access your campaigns.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="bg-slate-50/50 p-6 flex flex-col sm:flex-row items-center justify-center sm:justify-center gap-3 sm:gap-4 border-t border-border-subtle w-full">
                <AlertDialogCancel className="mt-0 group relative overflow-hidden bg-white text-secondary border border-border-subtle hover:bg-slate-100 hover:text-charcoal-surface cursor-pointer w-full sm:w-[150px] rounded-md h-11 transition-all duration-300 font-medium flex items-center justify-center">
                  Stay Logged In
                </AlertDialogCancel>
                <AlertDialogAction onClick={logout} className="group relative overflow-hidden bg-red-600 hover:bg-red-700 text-white cursor-pointer w-full sm:w-[150px] rounded-md h-11 shadow-sm transition-all duration-300 font-semibold tracking-wide flex items-center justify-center">
                  Yes, Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 bg-background relative">
        {/* Top Bar (mobile) */}
        <header className="lg:hidden sticky top-0 z-30 bg-white/90 backdrop-blur-lg border-b border-border-subtle px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-2 hover:bg-slate-100 text-secondary hover:text-charcoal-surface transition-colors cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-container shadow-sm">
              <Sparkles className="h-3 w-3 text-black" />
            </div>
            <span className="text-sm font-bold text-charcoal-surface">1to7 Media</span>
          </div>
          <NotificationBell apiEndpoint="/api/dashboard/notifications" accentColor="yellow" storageKey="influencer_notif_read" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          {!isProfileComplete() && (
            <div className="mb-6 rounded-md bg-primary-container/5 border border-primary-container/25 py-2.5 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 shrink-0 rounded-md bg-primary-container/20 flex items-center justify-center border border-primary-container/20">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-charcoal-surface font-extrabold text-xs lg:text-sm flex items-center gap-1.5">
                    🚀 Your application is under review!
                  </h3>
                  <p className="text-secondary text-[11px] lg:text-xs mt-0.5 max-w-2xl leading-normal">
                    Please complete your profile (Instagram & Bank Details) so brands can verify your applications and we can process your payments faster.
                  </p>
                </div>
              </div>
              <Link href="/dashboard/profile" className="shrink-0 bg-primary-container hover:bg-primary-container/90 text-black px-4 py-1.5 rounded-md font-bold text-xs transition-all shadow-sm w-full sm:w-auto text-center cursor-pointer">
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
