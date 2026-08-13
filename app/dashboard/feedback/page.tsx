'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquareHeart, Star, Send, Loader2, Sparkles, CheckCircle2,
  HeartHandshake, Clock, MessageSquare, ThumbsUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/AuthProvider'

interface UserFeedbackItem {
  id: string
  rating: number
  category: string
  message: string
  created_at: string
}

const CATEGORIES = [
  'General Improvement',
  'Feature Request',
  'Bug Report',
  'Campaigns & Payments',
  'UI/UX Experience'
]

const RATING_LABELS: Record<number, string> = {
  1: 'Poor — Needs major work',
  2: 'Fair — Could be better',
  3: 'Good — Works fine',
  4: 'Very Good — Really liked it',
  5: 'Excellent — Absolutely love 1to7 Media!'
}

export default function CreatorFeedbackPage() {
  const { user } = useAuth()
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [category, setCategory] = useState<string>('General Improvement')
  const [message, setMessage] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)
  const [history, setHistory] = useState<UserFeedbackItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true)

  // Fetch creator's feedback history
  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/feedback')
      const data = await res.json()
      if (res.ok && data.feedback) {
        setHistory(data.feedback)
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!message || message.trim().length < 5) {
      toast.error('Please write at least a short message (5+ characters).')
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          category,
          message: message.trim(),
          fullName: user?.full_name,
          email: user?.email,
          mobile: user?.mobile,
          influencerId: user?.influencer_id
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback')
      }

      setIsSuccess(true)
      toast.success('Thank you for helping us improve!')
      setMessage('')
      fetchHistory()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3 w-full pb-2">
      {/* Header Banner */}
      <div className="bg-white p-3 px-4 sm:p-3.5 sm:px-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 w-full">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <MessageSquareHeart className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-extrabold text-charcoal-surface tracking-tight flex items-center gap-2">
              Share Your Feedback & Ideas
            </h1>
            <p className="text-[11px] text-secondary">
              Help us improve 1to7 Media — tell us what features you want or report issues.
            </p>
          </div>
        </div>
        {user && (
          <div className="shrink-0 bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-right">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Posting As</p>
            <p className="text-xs font-extrabold text-charcoal-surface">{user.full_name || 'Creator'}</p>
          </div>
        )}
      </div>

      {/* Main Form & Success Container */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-2xs overflow-hidden">
        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 sm:p-8 text-center flex flex-col items-center space-y-3"
          >
            <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-extrabold text-charcoal-surface">Thank You for Your Feedback!</h2>
            <p className="text-xs text-secondary max-w-md leading-relaxed">
              Your feedback has been received. Our team reviews every single suggestion to build a better experience for creators like you.
            </p>
            <Button
              onClick={() => setIsSuccess(false)}
              className="mt-2 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold px-5 h-10 rounded-xl shadow-sm cursor-pointer border-none text-xs"
            >
              Submit Another Suggestion
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-3.5">
            {/* Star Rating */}
            <div className="space-y-1.5 text-center bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80">
              <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                How is your overall experience with 1to7 Media?
              </Label>
              <div className="flex items-center justify-center gap-1.5 pt-0.5">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star
                  return (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-0.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`h-7 w-7 transition-colors ${
                          active
                            ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_2px_6px_rgba(251,191,36,0.4)]'
                            : 'text-slate-300 fill-slate-100'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] font-extrabold text-amber-600 h-3.5">
                {RATING_LABELS[hoverRating || rating]}
              </p>
            </div>

            {/* Feedback Category */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                What is this regarding?
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`text-[11px] font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-900 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex justify-between">
                <span>Your Feedback or Suggestion</span>
                <span className="text-[10px] text-amber-600 font-bold">Required</span>
              </Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what we can improve, what features you'd love to see, or any issues you encountered..."
                rows={3}
                required
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-xs rounded-xl p-3 focus:bg-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 placeholder:text-slate-400 transition-all resize-none outline-none font-sans"
              />
            </div>

            {/* Footer Submit Button */}
            <div className="flex items-center justify-end pt-1">
              <Button
                type="submit"
                disabled={submitting || !message.trim()}
                className="w-full sm:w-auto h-10 px-6 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold flex items-center justify-center shadow-sm transition-all disabled:opacity-50 cursor-pointer border-none text-xs"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Submit Feedback <Send className="h-3.5 w-3.5" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
