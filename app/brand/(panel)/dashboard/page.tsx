'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function BrandDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/brand/campaigns')
  }, [router])

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
      <Loader2 className="w-6 h-6 animate-spin text-[#febd1c]" />
      <p className="text-xs text-slate-500 font-medium">Redirecting to Creator Review Studio...</p>
    </div>
  )
}
