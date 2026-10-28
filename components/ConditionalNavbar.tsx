'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()

  // Guard against null pathname during initial load or hydration
  if (!pathname) return null

  // ZERO LEAKAGE: Never render 1to7 Navbar on TheHype Brand domain (e.g. brand.thehype.in / brands.thehype.in)
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || ''
    if (host.includes('thehype.in') || host.startsWith('brand.') || host.startsWith('brands.')) {
      return null
    }
  }

  // Do not show Navbar on homepage, auth pages, dashboard, admin, brand portal, view roster, and report-issue
  const hiddenRoutes = ['/', '/signup', '/login', '/forgot-password', '/report-issue']
  if (
    hiddenRoutes.includes(pathname) ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/brand') ||
    pathname.startsWith('/brand-admin') ||
    pathname.startsWith('/view')
  ) {
    return null
  }

  return <Navbar />
}
