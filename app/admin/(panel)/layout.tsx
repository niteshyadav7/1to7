'use client'

import { useState, useEffect } from 'react'
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
  PieChart
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

interface AdminInfo {
  id: string
  name: string
  email: string
}

const sidebarLinks = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/admin/applications', label: 'Applications', icon: Users },
  { href: '/admin/order-details', label: 'Order Details', icon: ClipboardList },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  // { href: '/admin/requests', label: 'Requests', icon: PieChart },
  { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/admin/influencers', label: 'Influencers', icon: Users },
]

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [admin, setAdmin] = useState<AdminInfo | null>(null)

  useEffect(() => {
    try {
      const cached = localStorage.getItem('admin_cache')
      if (cached) setAdmin(JSON.parse(cached))
    } catch {
      // ignore
    }
  }, [])

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

        {/* Admin Info */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-sm font-bold text-white">
              {admin?.name?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{admin?.name || 'Admin'}</p>
              <p className="text-xs text-slate-400 truncate">{admin?.email || 'admin@1to7.com'}</p>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 p-3 space-y-1">
          {sidebarLinks.map((link) => {
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
                <link.icon className={`h-4.5 w-4.5 transition-colors ${active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {link.label}
                {active && <ChevronRight className="ml-auto h-4 w-4 text-indigo-400" />}
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
                  You are about to sign out of the <span className="text-slate-200 font-semibold">Admin Portal</span>. You will need to enter your credentials again to access these management tools.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="bg-slate-950/50 p-6 flex flex-col sm:flex-row items-center justify-center sm:justify-center gap-3 sm:gap-4 border-t border-white/5 w-full">
                <AlertDialogCancel className="mt-0 group relative overflow-hidden bg-slate-800/80 text-slate-300 border-white/10 hover:bg-slate-800 hover:text-white hover:border-white/20 cursor-pointer w-full sm:w-[150px] rounded-xl h-11 transition-all duration-300 font-medium flex items-center justify-center">
                  Stay Logged In
                </AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="group relative overflow-hidden bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white cursor-pointer w-full sm:w-[150px] rounded-xl h-11 shadow-[0_0_20px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)] transition-all duration-300 border border-red-500/50 hover:border-red-400 font-semibold tracking-wide flex items-center justify-center">
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
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-indigo-600 to-purple-500">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Admin</span>
          </div>
          <div className="w-9" />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
