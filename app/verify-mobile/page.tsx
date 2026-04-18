'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Phone, Shield, Loader2, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import type { ConfirmationResult } from '@/lib/firebase'
import { useAuth } from '@/components/providers/AuthProvider'
import Link from 'next/link'

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

export default function VerifyMobilePage() {
  const [mobile, setMobile] = useState('')
  const [step, setStep] = useState<'input' | 'otp' | 'success'>('input')
  const [otp, setOtp] = useState('')
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(0)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const { refreshUserProfile } = useAuth()

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Initialize invisible reCAPTCHA
  useEffect(() => {
    if (step === 'input' && !window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            setError('reCAPTCHA expired. Please try again.')
            if (window.recaptchaVerifier) {
              window.recaptchaVerifier.clear()
              window.recaptchaVerifier = null
            }
          }
        })
      } catch (e) {
        console.error('reCAPTCHA init error:', e)
      }
    }

    return () => {
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear() } catch (e) {}
        window.recaptchaVerifier = null
      }
    }
  }, [step])

  const handleSendOTP = async () => {
    const cleanMobile = mobile.replace(/\D/g, '')
    if (cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setSending(true)
    setError('')

    try {
      if (!window.recaptchaVerifier) {
        throw new Error('Verification service not ready. Please refresh the page.')
      }

      const phoneNumber = `+91${cleanMobile}`
      const confirmation = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier)
      confirmationRef.current = confirmation
      setStep('otp')
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

      // OTP verified — update our database with the mobile number
      const res = await fetch('/api/auth/verify-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: mobile.replace(/\D/g, '') }),
      })

      if (!res.ok) throw new Error('Failed to update verification status')

      setStep('success')
      toast.success('Mobile number verified successfully!')

      // Refresh auth profile and redirect to dashboard
      await refreshUserProfile()
      setTimeout(() => {
        window.location.href = '/dashboard'
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

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans selection:bg-purple-500/30">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,58,237,0.15),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:24px_24px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 shadow-xl">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white">1to7 Media</span>
        </Link>

        {/* Card */}
        <div className="rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-8 pb-6 text-center border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20">
              {step === 'success' ? (
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              ) : (
                <Phone className="h-8 w-8 text-purple-400" />
              )}
            </div>
            <h2 className="text-xl font-bold text-white">
              {step === 'success' ? 'Mobile Verified!' : 'Verify Your Mobile'}
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              {step === 'input' && 'Enter your mobile number to receive an OTP verification code'}
              {step === 'otp' && `Enter the 6-digit code sent to +91 ${mobile}`}
              {step === 'success' && 'Redirecting you to the dashboard...'}
            </p>
          </div>

          {/* Body */}
          <div className="p-8 space-y-5">

            {/* Step 1: Mobile Input */}
            {step === 'input' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">
                    Mobile Number
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="bg-white/5 border-white/10 text-white h-14 pl-11 rounded-xl text-base font-medium focus-visible:ring-purple-500 placeholder:text-slate-600"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSendOTP}
                  disabled={sending || mobile.replace(/\D/g, '').length !== 10}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-base shadow-lg shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                >
                  {sending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending OTP...</>
                  ) : (
                    <><Shield className="mr-2 h-5 w-5" /> Send Verification Code</>
                  )}
                </Button>
              </>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
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
                    className="bg-white/5 border-white/10 text-white h-16 rounded-xl text-center text-3xl font-mono tracking-[0.5em] focus-visible:ring-purple-500 placeholder:text-slate-700 placeholder:tracking-[0.5em]"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                  />
                </div>

                <Button
                  onClick={handleVerifyOTP}
                  disabled={verifying || otp.length !== 6}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-base shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {verifying ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify OTP</>
                  )}
                </Button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-xs text-slate-500">
                      Resend OTP in <span className="text-purple-400 font-medium">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={() => { setStep('input'); setOtp(''); setError(''); confirmationRef.current = null }}
                      className="text-xs text-purple-400 hover:text-purple-300 font-medium cursor-pointer transition-colors"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Step 3: Success */}
            {step === 'success' && (
              <div className="text-center py-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/20 border border-emerald-500/30"
                >
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </motion.div>
                <p className="text-base text-emerald-300 font-semibold">
                  +91 {mobile} is now verified
                </p>
                <p className="text-xs text-slate-500 mt-2">Redirecting to your dashboard...</p>
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
        </div>

        {/* Invisible reCAPTCHA container */}
        <div id="recaptcha-container"></div>
      </motion.div>
    </div>
  )
}
