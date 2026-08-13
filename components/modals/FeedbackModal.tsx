'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Star, Send, Loader2, Sparkles, CheckCircle2, MessageSquarePlus, HeartHandshake } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/AuthProvider'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
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

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState<number>(5)
  const [hoverRating, setHoverRating] = useState<number>(0)
  const [category, setCategory] = useState<string>('General Improvement')
  const [message, setMessage] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [isSuccess, setIsSuccess] = useState<boolean>(false)

  if (!isOpen) return null

  const handleRatingClick = (r: number) => {
    setRating(r)
  }

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
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit feedback. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetAndClose = () => {
    setIsSuccess(false)
    setMessage('')
    setRating(5)
    setCategory('General Improvement')
    onClose()
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white my-auto"
        >
          {/* Header */}
          <div className="relative p-6 pb-5 bg-gradient-to-r from-amber-500/10 via-pink-500/10 to-purple-500/10 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Share Your Feedback
                </h2>
                <p className="text-xs text-slate-400">What can we improve for you?</p>
              </div>
            </div>
            <button
              onClick={handleResetAndClose}
              className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          {isSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 text-center flex flex-col items-center space-y-4"
            >
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20 animate-bounce">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Thank You!</h3>
              <p className="text-sm text-slate-300 max-w-xs leading-relaxed">
                Your feedback has been submitted successfully. Our team reviews every suggestion to make 1to7 Media better for you!
              </p>
              <Button
                onClick={handleResetAndClose}
                className="mt-4 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-bold px-6 h-11 rounded-xl hover:brightness-110 cursor-pointer border-none"
              >
                Close Window
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Star Rating */}
              <div className="space-y-2 text-center bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  How is your experience with 1to7 Media?
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
                        onClick={() => handleRatingClick(star)}
                        className="p-1 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                      >
                        <Star
                          className={`h-8 w-8 transition-colors ${
                            active
                              ? 'text-amber-400 fill-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                              : 'text-slate-600 fill-slate-800'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs font-semibold text-amber-400 h-4">
                  {RATING_LABELS[hoverRating || rating]}
                </p>
              </div>

              {/* Feedback Category */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Topic / Category
                </Label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => {
                    const isSelected = category === cat
                    return (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 shadow-sm'
                            : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'
                        }`}
                      >
                        {cat}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Text Message */}
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex justify-between">
                  <span>Your Suggestion or Idea</span>
                  <span className="text-[10px] text-slate-400">Required</span>
                </Label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what can we improve or what features you'd like to see..."
                  rows={4}
                  required
                  className="w-full bg-slate-950/80 border border-slate-800 text-white text-sm rounded-xl p-3.5 focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/80 placeholder:text-slate-500 transition-all resize-none outline-none"
                />
              </div>

              {/* User Metadata info banner */}
              {user && (
                <p className="text-[11px] text-slate-400 bg-slate-800/40 px-3 py-2 rounded-lg border border-slate-800 flex items-center gap-1.5">
                  <HeartHandshake className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Submitting as <strong className="text-white">{user.full_name || 'Creator'}</strong> ({user.influencer_id || 'ID'})</span>
                </p>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetAndClose}
                  className="flex-1 h-11 rounded-xl border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting || !message.trim()}
                  className="flex-1 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold flex items-center justify-center shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer border-none"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      Submit Feedback <Send className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
