'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminBrandsManagementPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/brand-admin/brands')
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-[50vh] text-xs text-neutral-400">
      Redirecting to Brand Operations Directory...
    </div>
  )
}
