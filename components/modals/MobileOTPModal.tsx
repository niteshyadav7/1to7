'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Phone, Shield, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import { initMsg91Widget, sendMsg91Otp, verifyMsg91Otp, retryMsg91Otp } from '@/lib/utils/msg91-otp'

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
  const [otpProvider, setOtpProvider] = useState<'msg91' | 'firebase'>('msg91')
  const confirmationRef = useRef<any>(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      initMsg91Widget().catch(console.warn)
      setStep('send')
      setOtp('')
      setError('')
      setSending(false)
      setVerifying(false)
      setCountdown(0)
      confirmationRef.current = null
    }
  }, [isOpen])

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Helper to initialize reCAPTCHA for Firebase fallback
  const getOrCreateRecaptchaVerifier = () => {
    if (typeof window === 'undefined') return null
    if (window.recaptchaVerifier) return window.recaptchaVerifier
    try {
      const container = document.getElementById('recaptcha-wrapper')
      if (container && container.parentNode && container.childNodes.length > 0) {
        const freshContainer = document.createElement('div')
        freshContainer.id = 'recaptcha-wrapper'
        container.parentNode.replaceChild(freshContainer, container)
      }
      const verifier = new RecaptchaVerifier(auth, 'recaptcha-wrapper', {
        size: 'invisible',
        callback: () => {},
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try again.')
        },
      })
      window.recaptchaVerifier = verifier
      return verifier
    } catch (e) {
      console.error('[Firebase Fallback Modal] reCAPTCHA init error:', e)
      return null
    }
  }

  const handleSendOTP = async () => {
    setSending(true)
    setError('')

    const cleanMobile = mobile.replace(/\D/g, '')

    // 1. Primary: Try MSG91
    try {
      await sendMsg91Otp(cleanMobile)
      setOtpProvider('msg91')
      setStep('verify')
      setCountdown(45)
      toast.success('OTP sent to your mobile via WhatsApp/SMS')
    } catch (msg91Err: any) {
      console.warn('[Modal OTP] MSG91 failed, triggering fallback to Firebase Phone Auth:', msg91Err)

      // 2. Fallback: Firebase Phone Auth
      try {
        const verifier = getOrCreateRecaptchaVerifier()
        if (!verifier) throw new Error('Verification fallback service unavailable')
        const confirmation = await signInWithPhoneNumber(auth, `+91${cleanMobile}`, verifier)
        confirmationRef.current = confirmation
        setOtpProvider('firebase')
        setStep('verify')
        setCountdown(45)
        toast.success('OTP sent via SMS to your mobile')
      } catch (fbErr: any) {
        console.error('[Modal OTP] Both providers failed:', fbErr)
        setError(fbErr?.message || msg91Err?.message || 'Failed to send OTP. Please try again.')
      }
    } finally {
      setSending(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length < 4 || otp.length > 6) {
      setError('Please enter a valid OTP code')
      return
    }

    setVerifying(true)
    setError('')

    try {
      if (otpProvider === 'msg91') {
        await verifyMsg91Otp(otp)
      } else {
        if (!confirmationRef.current) throw new Error('Session expired. Please resend OTP.')
        await confirmationRef.current.confirm(otp)
      }

      // OTP verified — now update our database
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
      setError(err?.message || 'Verification failed. Please try again.')
    } finally {
      setVerifying(false)
    }
  }

  const handleResend = async () => {
    try {
      if (otpProvider === 'msg91') {
        await retryMsg91Otp()
        setCountdown(45)
        toast.success('New OTP sent to your mobile via WhatsApp/SMS')
      } else {
        await handleSendOTP()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to resend OTP')
    }
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
            <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl pointer-events-auto text-slate-900">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 rounded-full p-2 bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>

              {/* Header */}
              <div className="p-6 pb-0 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 shadow-inner text-amber-500">
                  {step === 'success' ? (
                    <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                  ) : (
                    <Phone className="h-7 w-7 text-amber-500" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900 tracking-tight">
                  {step === 'success' ? 'Mobile Verified!' : 'Verify Mobile Number'}
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {step === 'send' && `We'll send an OTP to +91 ${mobile}`}
                  {step === 'verify' && `Enter the 6-digit code sent to +91 ${mobile}`}
                  {step === 'success' && 'Your mobile number has been verified successfully'}
                </p>
              </div>

              {/* Body */}
              <div className="p-6 space-y-4">
                {step === 'send' && (
                  <>
                    <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600">
                          <Phone className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">+91 {mobile}</p>
                          <p className="text-xs text-slate-500">SMS OTP will be sent</p>
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={handleSendOTP}
                      disabled={sending}
                      className="w-full h-12 rounded-xl bg-[#F5A623] hover:bg-[#e0961f] text-slate-950 font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 transition-all"
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
                        Enter OTP Code
                      </label>
                      <Input
                        value={otp}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                          setOtp(val)
                          setError('')
                        }}
                        placeholder="••••"
                        maxLength={6}
                        className="bg-slate-50 border-slate-200 text-slate-900 h-14 rounded-xl text-center text-2xl font-mono tracking-[0.5em] focus-visible:ring-amber-400 focus-visible:border-amber-400 placeholder:text-slate-300 placeholder:tracking-[0.5em]"
                        autoFocus
                      />
                    </div>

                    <Button
                      onClick={handleVerifyOTP}
                      disabled={verifying || otp.length < 4 || otp.length > 6}
                      className="w-full h-12 rounded-xl bg-[#F5A623] hover:bg-[#e0961f] text-slate-950 font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50 transition-all"
                    >
                      {verifying ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                      ) : (
                        <><CheckCircle2 className="mr-2 h-4 w-4" /> Verify OTP</>
                      )}
                    </Button>

                    <div className="text-center">
                      {countdown > 0 ? (
                        <button
                          type="button"
                          disabled
                          className="text-xs text-slate-400 bg-slate-100/90 px-2.5 py-1 rounded-md cursor-not-allowed select-none font-medium inline-flex items-center gap-1.5 border border-slate-200"
                        >
                          <Clock className="h-3 w-3 text-slate-400" />
                          Resend in <span className="text-amber-600 font-bold">{countdown}s</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResend}
                          className="text-xs text-amber-600 hover:text-amber-700 font-bold cursor-pointer transition-colors"
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
                      className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20"
                    >
                      <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </motion.div>
                    <p className="text-sm text-emerald-600 font-bold">
                      +91 {mobile} is now verified
                    </p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3"
                  >
                    <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs text-red-600 font-medium">{error}</p>
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
