'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()

  // Guard against null pathname during initial load or hydration
  if (!pathname) return null

  // Do not show Navbar on auth pages, dashboard, admin, and report-issue
  const hiddenRoutes = ['/signup', '/login', '/forgot-password', '/report-issue']
  if (hiddenRoutes.includes(pathname) || pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return null
  }

  return <Navbar />
}
