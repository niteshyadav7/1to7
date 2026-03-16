'use client'

import { usePathname } from 'next/navigation'
import { Navbar } from '@/components/Navbar'

export function ConditionalNavbar() {
  const pathname = usePathname()

  // Do not show Navbar on the signup and login pages
  const hiddenRoutes = ['/signup', '/login']
  if (hiddenRoutes.includes(pathname)) {
    return null
  }

  return <Navbar />
}
