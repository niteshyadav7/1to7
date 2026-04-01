'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Shield, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import type { ConfirmationResult } from '@/lib/firebase'

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

interface MobileOTPModalProps {
  isOpen: boolean
  onClose: () => void
  onVerified: () => void
  mobile: string
}

export default function MobileOTPModal({ isOpen, onClose, onVerified, mobile }: MobileOTPModalProps) {
  const [step, setStep] = useState<'send' | 'verify' | 'success'>('send')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const confirmationRef = useRef<ConfirmationResult | null>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('send')
      setOtp('')
      setError('')
      setSending(false)
      setVerifying(false)
      setCountdown(0)
      confirmationRef.current = null
    }
    return () => {
      // Clean up global recaptcha on unmount to prevent invisible Captcha crashes on React StrictMode
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear()
        } catch (e) {}
        window.recaptchaVerifier = null
      }
    }
  }, [isOpen])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Initialize reCAPTCHA silently when the modal is open and on the send step
  useEffect(() => {
    if (isOpen && step === 'send' && !window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-wrapper', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.')
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear()
            window.recaptchaVerifier = null
          }
        }
      })
    }
  }, [isOpen, step])

  const handleSendOTP = async () => {
    setSending(true)
    setError('')

    try {
      // It should already be initialized by the useEffect above
      if (!window.recaptchaVerifier) {
        throw new Error('Verification service not ready. Please refresh the page.')
      }

      const phoneNumber = `+91${mobile}`
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
      confirmationRef.current = confirmation

      setStep('verify')
      setCountdown(30)
      toast.success('OTP sent to your mobile number')
    } catch (err: any) {
      console.error('Send OTP Error:', err)
      if (err.code === 'auth/too-many-requests') {
        setError('Too many attempts. Please try again later.')
      } else if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format.')
      } else {
        setError(err.message || 'Failed to send OTP. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    setVerifying(true)
    setError('')

    try {
      if (!confirmationRef.current) {
        setError('Session expired. Please resend OTP.')
        return
      }

      await confirmationRef.current.confirm(otp)

      // OTP verified by Firebase — now update our database
      const res = await fetch('/api/auth/verify-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile }),
      })

      if (!res.ok) {
        throw new Error('Failed to update verification status')
      }

      setStep('success')
      toast.success('Mobile number verified successfully!')

      // Auto close after 1.5s
      setTimeout(() => {
        onVerified()
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error('Verify OTP Error:', err)
      if (err.code === 'auth/invalid-verification-code') {
        setError('Invalid OTP. Please check and try again.')
      } else if (err.code === 'auth/code-expired') {
        setError('OTP has expired. Please resend.')
      } else {
        setError(err.message || 'Verification failed. Please try again.')
      }
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = () => {
    setStep('send')
    setOtp('')
    setError('')
    confirmationRef.current = null
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150]"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-[151] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl pointer-events-auto">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 rounded-full p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="p-6 pb-0 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20">
                  {step === 'success' ? (
                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                  ) : (
                    <Phone className="h-7 w-7 text-purple-400" />
                  )}
                </div>
                <h3 className="text-lg font-bold text-white">
                  {step === 'success' ? 'Mobile Verified!' : 'Verify Mobile Number'}
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {step === 'send' && `We'll send an OTP to +91 ${mobile}`}
                  {step === 'verify' && `Enter the 6-digit code sent to +91 ${mobile}`}
                  {step === 'success' && 'Your mobile number has been verified successfully'}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {step === 'send' && (
                  <>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-slate-300">
                          <Phone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">+91 {mobile}</p>
                          <p className="text-xs text-slate-500">SMS OTP will be sent</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSendOTP}
                      disabled={sending}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {sending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending OTP...</>
                      ) : (
                        <><Shield className="mr-2 h-4 w-4" /> Send OTP</>
                      )}
                    </Button>
                  </>
                )}

                {step === 'verify' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                        Enter 6-Digit OTP
                      </label>
                      <Input
                        value={otp}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setOtp(val)
                          setError('')
                        }}
                        placeholder="000000"
                        maxLength={6}
                        className="bg-white/5 border-white/10 text-white h-14 rounded-xl text-center text-2xl font-mono tracking-[0.5em] focus-visible:ring-purple-500 placeholder:text-slate-700 placeholder:tracking-[0.5em]"
                        autoFocus
                      />
                    </div>

                    <Button
                      onClick={handleVerifyOTP}
                      disabled={verifying || otp.length !== 6}
                      className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                    >
                      {verifying ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Verify OTP</>
                      )}
                    </Button>

                    <div className="text-center">
                      {countdown > 0 ? (
                        <p className="text-xs text-slate-500">
                          Resend OTP in <span className="text-purple-400 font-medium">{countdown}s</span>
                        </p>
                      ) : (
                        <button
                          onClick={handleResend}
                          className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer transition-colors"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                  </>
                )}

                {step === 'success' && (
                  <div className="text-center py-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', damping: 15 }}
                      className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30"
                    >
                      <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                    </motion.div>
                    <p className="text-sm text-emerald-300 font-medium">
                      +91 {mobile} is now verified
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3"
                  >
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                    <p className="text-xs text-red-300">{error}</p>
                  </motion.div>
                )}
              </div>

              {/* Invisible reCAPTCHA container - using wrapper div ID to avoid NextJS re-render bugs */}
              <div id="recaptcha-wrapper"></div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
