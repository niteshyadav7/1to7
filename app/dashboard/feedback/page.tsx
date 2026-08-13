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
    <div className="space-y-4 max-w-4xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
            <MessageSquareHeart className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-charcoal-surface tracking-tight flex items-center gap-2">
              Share Your Feedback & Ideas
            </h1>
            <p className="text-xs text-secondary">
              Help us improve 1to7 Media — tell us what features you want or report issues.
            </p>
          </div>
        </div>
        {user && (
          <div className="shrink-0 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-right">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posting As</p>
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
            className="p-8 sm:p-12 text-center flex flex-col items-center space-y-4"
          >
            <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm animate-bounce">
              <CheckCircle2 className="h-9 w-9" />
            </div>
            <h2 className="text-xl font-extrabold text-charcoal-surface">Thank You for Your Feedback!</h2>
            <p className="text-xs sm:text-sm text-secondary max-w-md leading-relaxed">
              Your feedback has been received. Our team reviews every single suggestion to build a better experience for creators like you.
            </p>
            <Button
              onClick={() => setIsSuccess(false)}
              className="mt-4 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-bold px-6 h-11 rounded-xl shadow-sm cursor-pointer border-none"
            >
              Submit Another Suggestion
            </Button>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 sm:p-7 space-y-6">
            {/* Star Rating */}
            <div className="space-y-2.5 text-center bg-slate-50/80 p-5 rounded-xl border border-slate-200/80">
              <Label className="text-xs font-extrabold uppercase tracking-wider text-slate-600">
                How is your overall experience with 1to7 Media?
              </Label>
              <div className="flex items-center justify-center gap-2 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (hoverRating || rating) >= star
                  return (
                    <button
                      type="button"
                      key={star}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`h-8 w-8 sm:h-9 sm:w-9 transition-colors ${
                          active
                            ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_2px_6px_rgba(251,191,36,0.4)]'
                            : 'text-slate-300 fill-slate-100'
                        }`}
                      />
                    </button>
                  )
                })}
              </div>
              <p className="text-xs font-extrabold text-amber-600 h-4">
                {RATING_LABELS[hoverRating || rating]}
              </p>
            </div>

            {/* Feedback Category */}
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                What is this regarding?
              </Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat
                  return (
                    <button
                      type="button"
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`text-xs font-semibold px-3.5 py-2 rounded-lg border transition-all cursor-pointer ${
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
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex justify-between">
                <span>Your Feedback or Suggestion</span>
                <span className="text-[10px] text-amber-600 font-bold">Required</span>
              </Label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what we can improve, what features you'd love to see, or any issues you encountered..."
                rows={4}
                required
                className="w-full bg-slate-50/50 border border-slate-200 text-slate-900 text-sm rounded-xl p-4 focus:bg-white focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 placeholder:text-slate-400 transition-all resize-none outline-none font-sans"
              />
            </div>

            {/* Footer Submit Button */}
            <div className="flex items-center justify-end pt-2">
              <Button
                type="submit"
                disabled={submitting || !message.trim()}
                className="w-full sm:w-auto h-11 px-8 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold flex items-center justify-center shadow-sm transition-all disabled:opacity-50 cursor-pointer border-none text-sm"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Submit Feedback <Send className="h-4 w-4" />
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Submitted History List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-extrabold text-charcoal-surface tracking-tight flex items-center gap-2">
            <Clock className="h-4 w-4 text-secondary" /> My Submitted Feedback
          </h2>
          <span className="text-xs text-slate-400 font-medium">{history.length} submission{history.length !== 1 ? 's' : ''}</span>
        </div>

        {loadingHistory ? (
          <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your history...
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white border border-slate-200/80 rounded-xl p-8 text-center space-y-2">
            <MessageSquare className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-500">No previous feedback submitted yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
              Your submitted feedback and ideas will be saved here for your records.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${
                            star <= item.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {new Date(item.created_at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  "{item.message}"
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
