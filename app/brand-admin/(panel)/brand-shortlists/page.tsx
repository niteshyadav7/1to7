'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function BrandShortlistsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/brand-admin/sample-lists')
  }, [router])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-white">
      <div className="w-8 h-8 border-2 border-[#febd1c] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-neutral-400 font-medium">
        Redirecting to unified Sample Rosters desk...
      </p>
    </div>
  )
}
