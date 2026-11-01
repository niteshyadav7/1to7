'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

export default function CreatorReviewStudioRedirect() {
  const params = useParams<{ id: string }>()
  const router = useRouter()

  useEffect(() => {
    const campaignId = params?.id
    if (campaignId && campaignId !== 'all') {
      router.replace(`/brand/campaigns?campaign=${encodeURIComponent(campaignId)}`)
    } else {
      router.replace('/brand/campaigns')
    }
  }, [params, router])

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
    </div>
  )
}
