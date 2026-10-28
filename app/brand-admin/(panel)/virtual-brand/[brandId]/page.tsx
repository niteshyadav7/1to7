'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function VirtualBrandRedirectPage() {
  const params = useParams<{ brandId: string }>()
  const router = useRouter()
  const brandId = params?.brandId

  useEffect(() => {
    if (brandId) {
      window.location.href = `/api/brand-admin/virtual-brand/impersonate?brandId=${encodeURIComponent(brandId)}`
    } else {
      router.replace('/brand-admin/brands')
    }
  }, [brandId, router])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-white">
      <div className="w-8 h-8 border-2 border-[#F95738] border-t-transparent rounded-full animate-spin" />
      <p className="text-xs text-neutral-400 font-medium">
        Launching live client brand dashboard...
      </p>
    </div>
  )
}
