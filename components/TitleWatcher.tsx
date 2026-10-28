'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getRouteMeta } from '@/lib/utils/page-titles'

export default function TitleWatcher() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname || typeof document === 'undefined') return

    const meta = getRouteMeta(pathname)
    if (meta.browserTitle) {
      document.title = meta.browserTitle
    }

    // Dynamic Favicon Switcher: Brand Portal (TheHype) vs Main Portal (1to7)
    const host = typeof window !== 'undefined' ? window.location.hostname : ''
    const isBrandPortal =
      pathname.startsWith('/brand') ||
      pathname.startsWith('/view') ||
      host.includes('thehype.in') ||
      host.startsWith('brand.') ||
      host.startsWith('brands.')
    const targetIcon = isBrandPortal ? '/thehype-logo.png' : '/logo-icon.svg'

    const existingIcons = document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']")
    if (existingIcons.length > 0) {
      existingIcons.forEach((el) => {
        el.href = targetIcon
      })
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = targetIcon
      document.head.appendChild(link)
    }

    // Optional event listener for deep nested pages wishing to override tab title
    const handleCustomTitle = (e: Event) => {
      const customDetail = (e as CustomEvent)?.detail
      if (customDetail && typeof customDetail === 'string') {
        if (isBrandPortal) {
          document.title = `${customDetail} | TheHype`
        } else {
          const isAdmin = pathname.startsWith('/admin')
          document.title = `${customDetail} | 1to7 ${isAdmin ? 'Admin' : 'Media'}`
        }
      }
    }

    window.addEventListener('set-tab-title', handleCustomTitle)
    return () => {
      window.removeEventListener('set-tab-title', handleCustomTitle)
    }
  }, [pathname])

  return null
}
