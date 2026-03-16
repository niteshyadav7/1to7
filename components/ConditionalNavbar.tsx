'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()

  // Do not show Navbar on the homepage, signup, login, and dashboard pages
  const hiddenRoutes = ['/', '/signup', '/login']
  if (hiddenRoutes.includes(pathname) || pathname.startsWith('/dashboard')) {
    return null
  }

  return <Navbar />
}
