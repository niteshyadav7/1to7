'use client'

import { useState } from 'react'
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
  Sparkles,
  AlertTriangle,
  ClipboardList,
  CreditCard,
  BarChart3,
  FileUp,
  MessageSquareHeart,
  UserCheck,
  Sliders,
  ShieldAlert,
  ArrowLeft,
  IndianRupee,
  Tags,
} from 'lucide-react'
import NotificationBell from '@/components/ui/NotificationBell'
import { AdminHeaderProvider, useAdminHeader } from '@/components/admin/AdminHeaderContext'
import {
  AdminPermissionsProvider,
  useAdminPermissions,
} from '@/components/admin/AdminPermissionsContext'
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
import { Button } from '@/components/ui/button'

interface NavLink {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  moduleKey: string
}

const allSidebarLinks: NavLink[] = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone, moduleKey: 'campaigns' },
  { href: '/admin/applications', label: 'Applications', icon: Users, moduleKey: 'applications' },
  { href: '/admin/order-details', label: 'Order Details', icon: ClipboardList, moduleKey: 'order_details' },
  { href: '/admin/finance', label: 'Finance Payouts', icon: IndianRupee, moduleKey: 'payments' },
  { href: '/admin/payments', label: 'Payment Desk', icon: CreditCard, moduleKey: 'payments' },
  { href: '/admin/feedback', label: 'User Feedback', icon: MessageSquareHeart, moduleKey: 'feedback' },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3, moduleKey: 'analytics' },
  { href: '/admin/import', label: 'Import Sync', icon: FileUp, moduleKey: 'import' },
  { href: '/admin/influencers', label: 'Influencers', icon: Users, moduleKey: 'influencers' },
  { href: '/admin/categories', label: 'Categories & Niches', icon: Tags, moduleKey: 'influencers' },
  { href: '/admin/staff', label: 'Staff Management', icon: UserCheck, moduleKey: 'staff' },
  { href: '/admin/roles', label: 'Roles & Access', icon: Sliders, moduleKey: 'roles' },
]

function getModuleKeyFromPath(pathname: string): string | null {
  if (pathname === '/admin/dashboard') return 'dashboard'
  if (pathname.startsWith('/admin/campaigns')) return 'campaigns'
  if (pathname.startsWith('/admin/applications')) return 'applications'
  if (pathname.startsWith('/admin/order-details')) return 'order_details'
  if (pathname.startsWith('/admin/finance')) return 'payments'
  if (pathname.startsWith('/admin/payments')) return 'payments'
  if (pathname.startsWith('/admin/feedback')) return 'feedback'
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
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { headerContent } = useAdminHeader()
  const { admin, loading, isSuperAdmin, canAccessModule } = useAdminPermissions()

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

  // Filter sidebar links based on dynamic access
  const visibleLinks = allSidebarLinks.filter((link) => {
    if (isSuperAdmin) return true
    return canAccessModule(link.moduleKey)
  })

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
        <div className="p-5 border-b border-white/5">
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

        {/* Admin Info & Role Badge */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white shadow-md">
              {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{admin?.name || 'Admin'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 truncate max-w-[120px]">
                  {admin?.roleDisplayName || (isSuperAdmin ? 'Super Admin' : admin?.role || 'Staff')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto no-scrollbar scrollbar-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {visibleLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-all duration-200 group cursor-pointer ${
                  active
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 shadow-md shadow-indigo-500/5 translate-x-1'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent hover:border-white/5 hover:translate-x-0.5'
                }`}
              >
                <link.icon
                  className={`h-4.5 w-4.5 transition-colors ${
                    active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                  }`}
                />
                <span className="truncate">{link.label}</span>
                {active && <ChevronRight className="ml-auto h-4 w-4 text-indigo-400 shrink-0" />}
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
            <AlertDialogContent className="w-full max-w-[440px] p-6 sm:p-7 rounded-3xl bg-slate-900/98 backdrop-blur-2xl border border-white/10 text-white shadow-2xl shadow-black/90 font-sans">
              <AlertDialogHeader className="space-y-4 text-center items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-b from-red-500/20 to-red-950/40 shadow-inner shadow-red-500/20 ring-1 ring-red-500/30 mx-auto">
                  <AlertTriangle className="h-7 w-7 text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.5)]" />
                </div>
                <div className="space-y-1.5">
                  <AlertDialogTitle className="text-xl font-bold tracking-tight text-white">
                    Ready to Sign Out?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-slate-400 text-sm leading-relaxed max-w-[320px] mx-auto">
                    You are about to sign out of the <span className="text-slate-200 font-semibold">Admin Portal</span>. You will need to enter your credentials again to access management tools.
                  </AlertDialogDescription>
                </div>
              </AlertDialogHeader>
              <AlertDialogFooter className="mt-4 flex flex-row items-center justify-between gap-3 pt-3 border-t border-white/5 w-full">
                <AlertDialogCancel className="flex-1 bg-slate-800/90 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white rounded-xl h-11 transition-all font-medium flex items-center justify-center cursor-pointer">
                  Stay Logged In
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleLogout}
                  className="flex-1 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white cursor-pointer rounded-xl h-11 shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all border border-red-500/50 hover:border-red-400 font-semibold tracking-wide flex items-center justify-center"
                >
                  Yes, Sign Out
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
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
