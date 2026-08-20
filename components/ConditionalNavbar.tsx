'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()

  // Do not show Navbar on homepage, auth pages, dashboard, and admin
  const hiddenRoutes = ['/', '/signup', '/login', '/forgot-password']
  if (hiddenRoutes.includes(pathname) || pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    return null
  }

  return <Navbar />
}
