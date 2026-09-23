'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getRouteMeta } from '@/lib/utils/page-titles'

export default function TitleWatcher() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    const meta = getRouteMeta(pathname)
    if (meta.browserTitle && typeof document !== 'undefined') {
      document.title = meta.browserTitle
    }

    // Optional event listener for deep nested pages wishing to override tab title
    // e.g. window.dispatchEvent(new CustomEvent('set-tab-title', { detail: 'Custom Brand Name' }))
    const handleCustomTitle = (e: Event) => {
      const customDetail = (e as CustomEvent)?.detail
      if (customDetail && typeof customDetail === 'string') {
        const isAdmin = pathname.startsWith('/admin')
        document.title = `${customDetail} | 1to7 ${isAdmin ? 'Admin' : 'Media'}`
      }
    }

    window.addEventListener('set-tab-title', handleCustomTitle)
    return () => {
      window.removeEventListener('set-tab-title', handleCustomTitle)
    }
  }, [pathname])

  return null
}
