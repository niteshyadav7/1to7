'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useParams, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Send, CheckCircle2, User, ChevronRight, ChevronLeft,
  PanelLeft, MessageSquareHeart, ArrowLeft, Loader2, Menu, LogOut, Sparkles,
  Eye, ShieldCheck
} from 'lucide-react'
import Logo from '@/components/ui/Logo'

interface VirtualUser {
  id: string
  influencer_id: string
  full_name: string
  instagram_profile_pic?: string
  instagram_username?: string
  email?: string
  followers?: number
}

export default function VirtualProfileLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { userId } = useParams<{ userId: string }>()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [virtualUser, setVirtualUser] = useState<VirtualUser | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  const basePath = `/admin/virtual-profile/${userId}`

  const sidebarLinks = [
    { href: basePath, label: 'Overview', icon: LayoutDashboard },
    { href: `${basePath}/applied`, label: 'Applied', icon: Send },
    { href: `${basePath}/approved`, label: 'Approved', icon: CheckCircle2 },
    { href: `${basePath}/profile`, label: 'Profile', icon: User },
    { href: `${basePath}/feedback`, label: 'Feedback', icon: MessageSquareHeart },
  ]

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

  // Fetch the target creator's basic info for the sidebar
  useEffect(() => {
    if (!userId) return
    setLoadingUser(true)
    fetch(`/api/admin/virtual-profile/${userId}?action=profile`)
      .then(r => r.json())
      .then(data => {
        if (data.is_super_admin !== undefined) {
          setIsSuperAdmin(Boolean(data.is_super_admin))
        }
        if (data.user) {
          setVirtualUser({
            id: data.user.id,
            influencer_id: data.user.influencer_id,
            full_name: data.user.full_name || 'Creator',
            instagram_profile_pic: data.user.instagram_profile_pic,
            instagram_username: data.user.instagram_username,
            email: data.user.email,
            followers: data.user.followers,
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoadingUser(false))
  }, [userId])

  const isActive = (href: string) => {
    if (href === basePath) return pathname === basePath
    return pathname.startsWith(href)
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

      {/* Sidebar - EXACT replica of creator dashboard */}
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

        {/* Creator Info */}
        <div className={`px-4 py-3 border-t border-b border-white/5 ${isCollapsed ? 'lg:px-2' : ''}`}>
          <div className={`flex items-center ${isCollapsed ? 'lg:justify-center' : 'gap-3'}`} title={isCollapsed ? (virtualUser?.full_name || 'Creator') : undefined}>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white shadow-sm shrink-0 overflow-hidden border border-white/20">
              {loadingUser ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : virtualUser?.instagram_profile_pic ? (
                <img src={virtualUser.instagram_profile_pic} alt={virtualUser.full_name || 'Creator'} className="h-full w-full object-cover" />
              ) : (
                virtualUser?.full_name?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{virtualUser?.full_name || 'Loading...'}</p>
                <p className="text-xs text-slate-400 truncate">{virtualUser?.influencer_id || 'ID'}</p>
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-3 space-y-1.5 overflow-y-auto">
          {sidebarLinks.map((link) => {
            const active = isActive(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={true}
                onClick={() => setSidebarOpen(false)}
                title={isCollapsed ? link.label : undefined}
                className={`flex items-center ${isCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3.5'} rounded-lg py-2.5 text-sm font-semibold transition-all duration-200 group cursor-pointer border ${
                  active
                    ? 'bg-primary-container text-black border-primary-container/30 shadow-sm'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white border-transparent'
                }`}
              >
                <link.icon className={`h-4.5 w-4.5 shrink-0 ${active ? 'text-black' : 'text-slate-400 group-hover:text-white'}`} />
                {!isCollapsed && <span>{link.label}</span>}
                {!isCollapsed && active && <ChevronRight className="ml-auto h-4 w-4 text-black shrink-0" />}
              </Link>
            )
          })}
        </nav>

        {/* Exit Virtual Profile */}
        <div className="p-3 mt-auto border-t border-white/5">
          <Link
            href="/admin/influencers"
            title={isCollapsed ? "Exit Virtual Profile" : undefined}
            className={`flex items-center ${isCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3.5'} w-full rounded-lg py-2.5 text-sm font-semibold text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all cursor-pointer`}
          >
            <LogOut className="h-4.5 w-4.5 shrink-0 text-slate-400 group-hover:text-red-400" />
            {!isCollapsed && <span>Exit Virtual Profile</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 bg-background relative transition-[padding] duration-300 ${isCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
        {/* Top Header Bar - identical to creator dashboard */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-border-subtle px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu toggle */}
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

            {/* Virtual Creator Mode Badge in Top Bar */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <span>Virtual Creator:</span>
              <strong className="text-amber-950 font-extrabold truncate max-w-[160px]">{virtualUser?.full_name || 'Creator'}</strong>
              <span className="font-mono text-[10px] text-amber-700 font-semibold">({virtualUser?.influencer_id || 'ID'})</span>
            </div>

            {/* Admin Role Tier Badge */}
            {isSuperAdmin ? (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[11px] font-extrabold shadow-2xs">
                <ShieldCheck className="h-3.5 w-3.5 text-purple-600" />
                Super Admin (Full Edit Power)
              </span>
            ) : (
              <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-extrabold shadow-2xs">
                <Eye className="h-3.5 w-3.5 text-slate-500" />
                Admin (Read-Only View)
              </span>
            )}
          </div>

          {/* Right Action: Return to Admin Panel */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/admin/influencers"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Back to Influencers Directory</span>
              <span className="sm:hidden">Exit</span>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:px-5 sm:pt-3.5 sm:pb-5 lg:px-6 lg:pt-3.5 lg:pb-6 min-w-0 overflow-x-hidden flex flex-col">
          {children}
        </main>
      </div>
    </div>
  )
}
