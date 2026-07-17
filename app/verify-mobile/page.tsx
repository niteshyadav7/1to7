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
    <div className="min-h-screen bg-background flex items-center justify-center p-4 font-sans selection:bg-primary-container/30">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(254,189,28,0.1),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(rgba(0,0,0,0.01)_1px,transparent_1px)] [background-size:24px_24px]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-md"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 justify-center mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary-container shadow-md">
            <Sparkles className="h-4 w-4 text-black" />
          </div>
          <span className="text-lg font-bold tracking-tight text-charcoal-surface">1to7 Media</span>
        </Link>

        {/* Card */}
        <div className="rounded-lg border border-border-subtle bg-white shadow-xl overflow-hidden text-foreground">
          {/* Header */}
          <div className="p-8 pb-6 text-center border-b border-border-subtle bg-gray-muted">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-primary-container/20 border border-primary-container/30">
              {step === 'success' ? (
                <CheckCircle2 className="h-8 w-8 text-primary" />
              ) : (
                <Phone className="h-8 w-8 text-primary" />
              )}
            </div>
            <h2 className="text-xl font-bold text-charcoal-surface">
              {step === 'success' ? 'Mobile Verified!' : 'Verify Your Mobile'}
            </h2>
            <p className="text-sm text-secondary mt-2">
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
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1">
                    Mobile Number
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary group-focus-within:text-primary transition-colors" />
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="bg-white border border-border-subtle text-foreground h-11 pl-11 rounded-md text-sm font-medium focus-visible:ring-primary-container placeholder:text-secondary"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSendOTP()}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSendOTP}
                  disabled={sending || mobile.replace(/\D/g, '').length !== 10}
                  className="w-full h-11 rounded-md bg-primary-container hover:bg-primary-container/90 text-black font-bold text-sm disabled:opacity-50"
                >
                  {sending ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Sending OTP...</>
                  ) : (
                    <><Shield className="mr-2 h-4 w-4" /> Send Verification Code</>
                  )}
                </Button>
              </>
            )}

            {/* Step 2: OTP Verification */}
            {step === 'otp' && (
              <>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1">
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
                    className="bg-white border border-border-subtle text-charcoal-surface h-12 rounded-md text-center text-2xl font-mono tracking-[0.4em] focus-visible:ring-primary-container placeholder:text-secondary placeholder:tracking-[0.4em]"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                  />
                </div>

                <Button
                  onClick={handleVerifyOTP}
                  disabled={verifying || otp.length !== 6}
                  className="w-full h-11 rounded-md bg-primary-container hover:bg-primary-container/90 text-black font-bold text-sm"
                >
                  {verifying ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Verifying...</>
                  ) : (
                    <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify OTP</>
                  )}
                </Button>

                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-xs text-secondary">
                      Resend OTP in <span className="text-primary font-medium">{countdown}s</span>
                    </p>
                  ) : (
                    <button
                      onClick={() => { setStep('input'); setOtp(''); setError(''); confirmationRef.current = null }}
                      className="text-xs text-primary font-bold hover:underline cursor-pointer transition-colors"
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
                  className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary-container/20 border border-primary-container/30"
                >
                  <CheckCircle2 className="h-10 w-10 text-primary" />
                </motion.div>
                <p className="text-base text-primary font-semibold">
                  +91 {mobile} is now verified
                </p>
                <p className="text-xs text-secondary mt-2">Redirecting to your dashboard...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 rounded-md bg-error/10 border border-error/20 px-4 py-3"
              >
                <AlertCircle className="h-4 w-4 text-error shrink-0" />
                <p className="text-xs text-error font-medium">{error}</p>
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
