'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function VirtualBrandDefaultPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/brand-admin/brands')
  }, [router])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-white">
      <div className="w-8 h-8 border-2 border-[#F95738] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-neutral-400 font-medium">
        Redirecting to Client Brands...
      </p>
    </div>
  )
}
