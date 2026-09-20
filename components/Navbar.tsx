'use client'

import { useAuth } from '@/components/providers/AuthProvider'
import { usePwa } from '@/components/pwa/PwaProvider'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download } from 'lucide-react'

export function Navbar() {
  const { user, logout, isLoading } = useAuth()
  const { isInstallable, isInstalled, installApp } = usePwa()
  const router = useRouter()

  return (
    <nav className="border-b border-border-subtle px-3 sm:px-6 py-2.5 sm:py-4 flex justify-between items-center bg-white z-50 relative w-full max-w-full min-w-0 overflow-x-hidden">
      <Link href="/" className="font-bold text-base sm:text-2xl text-charcoal-surface tracking-tight flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-primary-container text-black flex items-center justify-center font-extrabold text-xs sm:text-sm shrink-0">17</span>
        <span className="truncate">1to7 <span className="hidden xs:inline sm:inline">Media</span></span>
      </Link>

      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        {/* 1-Tap PWA Install Button */}
        {!isInstalled && (
          <Button
            variant="outline"
            size="sm"
            onClick={installApp}
            className="h-8 sm:h-9 px-2.5 sm:px-3 text-xs font-extrabold border-amber-300/80 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 flex items-center gap-1.5 cursor-pointer transition-all shadow-xs shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            <span>App</span>
          </Button>
        )}

        {isLoading ? (
          <div className="h-8 w-20 sm:h-9 sm:w-24 bg-gray-200 animate-pulse rounded-md"></div>
        ) : user ? (
          <>
            <div className="flex items-center gap-1.5 sm:gap-3 text-xs sm:text-sm font-medium">
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                {user.full_name?.charAt(0) || user.mobile.charAt(0)}
              </div>
              <span className="hidden md:inline-block text-gray-700">
                {user.full_name || user.mobile}
              </span>
            </div>
            <Button variant="ghost" size="sm" className="px-2 sm:px-3 text-xs sm:text-sm h-8 sm:h-9" onClick={async () => await logout()}>
              Log Out
            </Button>
            <Button size="sm" className="px-2.5 sm:px-4 text-xs sm:text-sm h-8 sm:h-9 bg-[#febd1c] hover:bg-amber-400 text-slate-950 font-bold" onClick={() => router.push('/dashboard')}>
              Dashboard
            </Button>
          </>
        ) : (
          <div className="flex items-center space-x-2">
            <Button size="sm" className="px-3 sm:px-4 text-xs sm:text-sm h-8 sm:h-9 bg-[#febd1c] hover:bg-amber-400 text-slate-950 font-bold" onClick={() => router.push('/login')}>
              Sign In
            </Button>
          </div>
        )}
      </div>
    </nav>
  )
}
