'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function VirtualBrandProfilePage() {
  const { brandId } = useParams<{ brandId: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/brand-admin/virtual-brand/${brandId || ''}`)
  }, [brandId, router])

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-xs text-neutral-400">
      Redirecting to Brand Operations Virtual Studio...
    </div>
  )
}
