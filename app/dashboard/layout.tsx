'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { usePwa } from '@/components/pwa/PwaProvider'
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
  ChevronLeft,
  PanelLeft,
  AlertTriangle,
  MessageSquareHeart,
  Download,
} from 'lucide-react'
import FeedbackModal from '@/components/modals/FeedbackModal'
import NotificationBell from '@/components/ui/NotificationBell'
import Logo from '@/components/ui/Logo'
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
  { href: '/dashboard/feedback', label: 'Feedback', icon: MessageSquareHeart },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout, isProfileComplete } = useAuth()
  const { isInstallable, isInstalled, installApp } = usePwa()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  // Load saved sidebar collapse preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed')
      if (saved !== null) setIsCollapsed(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      try { localStorage.setItem('sidebar_collapsed', JSON.stringify(next)) } catch { /* ignore */ }
      return next
    })
  }

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
        className={`fixed top-0 left-0 z-50 h-screen bg-[#2d3132] border-r border-white/10 flex flex-col transition-all duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64`}
      >
        {/* Logo & Toggle */}
        <div className={`relative p-4 pb-3 flex items-center ${isCollapsed ? 'lg:justify-center' : 'justify-start pl-[10%]'}`}>
          <div className="flex items-center">
            <Logo size="md" collapsed={isCollapsed} />
          </div>
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex items-center justify-center h-8 w-8 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer absolute right-3 top-1/2 -translate-y-1/2"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            <ChevronLeft className={`h-4 w-4 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* User Info */}
        <div className={`px-4 py-3 border-t border-b border-white/5 ${isCollapsed ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'}`} title={isCollapsed ? (user?.full_name || 'Creator') : undefined}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-sm shrink-0 overflow-hidden border border-white/20">
              {user?.instagram_profile_pic ? (
                <img src={user.instagram_profile_pic} alt={user.full_name || 'Creator'} className="h-full w-full object-cover" />
              ) : (
                user?.full_name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user?.full_name || 'Creator'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.influencer_id || 'ID Loading...'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const isActive = pathname === link.href
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? link.label : undefined}
                className={`flex items-center ${isCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3.5'} rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 group cursor-pointer border ${
                  isActive
                    ? 'bg-primary-container text-black border-primary-container/30 shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white border-transparent'
                }`}
              >
                <link.icon className={`h-4.5 w-4.5 shrink-0 ${isActive ? 'text-black' : 'text-slate-400 group-hover:text-white'}`} />
                {!isCollapsed && <span>{link.label}</span>}
                {!isCollapsed && isActive && <ChevronRight className="ml-auto h-4 w-4 text-black shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 mt-auto border-t border-white/5">
          <AlertDialog>
            <AlertDialogTrigger
              title={isCollapsed ? "Sign Out" : undefined}
              className={`flex items-center ${isCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3.5'} w-full rounded-lg py-2.5 text-sm font-semibold text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer`}
            >
              <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-400 group-hover:text-red-400" />
              {!isCollapsed && <span>Sign Out</span>}
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
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 bg-background relative transition-[padding] duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-border-subtle px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle & brand */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-md p-1.5 hover:bg-slate-100 text-secondary hover:text-charcoal-surface transition-colors cursor-pointer lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden">
              <Logo size="sm" />
            </div>

            {/* Desktop collapse toggle */}
            <button
              onClick={toggleCollapse}
              className="hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <PanelLeft className="h-5 w-5" />
            </button>
          </div>

          {/* Right aligned actions / Notification Bell + Install App */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!isInstalled && (
              <button
                onClick={installApp}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-amber-300/80 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-bold transition-all shadow-xs hover:shadow active:scale-95 cursor-pointer shrink-0"
                title="1to7 App"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="font-extrabold text-xs">App</span>
              </button>
            )}
            <NotificationBell apiEndpoint="/api/dashboard/notifications" accentColor="yellow" storageKey="influencer_notif_read" />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:px-5 sm:pt-3.5 sm:pb-5 lg:px-6 lg:pt-3.5 lg:pb-6 min-w-0 overflow-x-hidden flex flex-col">
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
