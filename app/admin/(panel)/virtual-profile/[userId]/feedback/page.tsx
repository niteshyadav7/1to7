'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { MessageSquareHeart, Star, Clock, Loader2 } from 'lucide-react'
import { useParams } from 'next/navigation'
import BrandLoader from '@/components/ui/BrandLoader'
import { toast } from 'sonner'

interface UserFeedbackItem {
  id: string
  rating: number
  category: string
  message: string
  created_at: string
}

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Fair',
  3: 'Good',
  4: 'Very Good',
  5: 'Excellent'
}

export default function VirtualProfileFeedbackPage() {
  const { userId } = useParams<{ userId: string }>()
  const [history, setHistory] = useState<UserFeedbackItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    fetch(`/api/admin/virtual-profile/${userId}?action=feedback`)
      .then(r => r.json())
      .then(data => setHistory(data.feedback || []))
      .catch(() => toast.error('Failed to load feedback history'))
      .finally(() => setLoading(false))
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <BrandLoader />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
        <h1 className="text-sm font-extrabold text-charcoal-surface tracking-tight flex items-center gap-2">
          <MessageSquareHeart className="h-4 w-4 text-pink-500" />
          Feedback History
        </h1>
        <p className="text-[11px] text-secondary mt-0.5">Creator&apos;s submitted feedback and suggestions (read-only)</p>
      </div>

      {/* Feedback List */}
      {history.length === 0 ? (
        <div className="rounded-xl border border-border-subtle bg-white p-12 text-center shadow-sm">
          <MessageSquareHeart className="h-10 w-10 text-secondary mx-auto mb-3" />
          <p className="text-sm font-bold text-charcoal-surface">No feedback submitted yet</p>
          <p className="text-xs text-secondary mt-1">This creator hasn&apos;t submitted any feedback.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-white border border-border-subtle rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  {/* Stars */}
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star
                        key={s}
                        className={`h-3.5 w-3.5 ${s <= item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200'}`}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] font-bold text-slate-500">{RATING_LABELS[item.rating] || ''}</span>
                </div>
                <span className="text-[10px] text-secondary font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                  {item.category}
                </span>
              </div>

              <p className="text-sm text-charcoal-surface leading-relaxed">{item.message}</p>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
