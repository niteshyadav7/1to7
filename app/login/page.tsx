'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import { Sparkles, Loader2, Phone, Shield, CheckCircle2, ArrowRight } from 'lucide-react'
import { auth, googleProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import type { ConfirmationResult } from '@/lib/firebase'

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

type AuthStep = 'mobile' | 'otp' | 'google'

export default function LoginPage() {
  const [step, setStep] = useState<AuthStep>('mobile')
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [maskedEmail, setMaskedEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const { login } = useAuth()

  // Countdown timer for OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Initialize invisible reCAPTCHA
  useEffect(() => {
    if (step === 'mobile' && !window.recaptchaVerifier) {
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            toast.error('reCAPTCHA expired. Please try again.')
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
      // Clean up on unmount
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear() } catch (e) {}
        window.recaptchaVerifier = null
      }
    }
  }, [step])

  const handleMobileSubmit = async () => {
    const cleanMobile = mobile.replace(/\D/g, '')
    if (cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/check-mobile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile }),
      })
      const data = await res.json()

      if (data.exists && data.isVerified) {
        // Already registered and verified - go straight to Google
        setMaskedEmail(data.maskedEmail)
        setStep('google')
      } else {
        // New user or unverified - trigger OTP
        await triggerOTP(cleanMobile)
      }
    } catch (error) {
      toast.error('Failed to verify network status. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const triggerOTP = async (cleanMobile: string) => {
    try {
      if (!window.recaptchaVerifier) {
        throw new Error('Verification service not ready. Please refresh.')
      }
      const confirmation = await signInWithPhoneNumber(auth, `+91${cleanMobile}`, window.recaptchaVerifier)
      confirmationRef.current = confirmation
      setStep('otp')
      setCountdown(30)
      toast.success('OTP sent to your mobile.')
    } catch (err: any) {
      console.error(err)
      if (err.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.')
      } else {
        toast.error(err.message || 'Failed to send OTP. Please try again.')
      }
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      if (!confirmationRef.current) throw new Error('Session expired. Please start over.')
      
      // Verify with Firebase
      await confirmationRef.current.confirm(otp)
      
      // Successfully verified mobile! Now force them to link a Google account to complete signup.
      toast.success('Mobile verified successfully!')
      setStep('google')
    } catch (err: any) {
      console.error(err)
      toast.error('Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      // Step 1: Firebase Google popup
      const result = await signInWithPopup(auth, googleProvider)
      const firebaseUser = result.user

      if (!firebaseUser.email) {
        toast.error('Could not get email from Google. Please try again.')
        return
      }

      // Step 2: Send to our backend passing the *verified* mobile number
      const cleanMobile = mobile.replace(/\D/g, '')
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          mobile: cleanMobile, // Link this mobile to the Google account
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')

      // Step 3: Cache user in AuthProvider and instantly redirect
      login(data.user)
      toast.success('Welcome!')
      window.location.href = '/dashboard'
      
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return
      }
      console.error('Google Login Error:', err)
      toast.error(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans selection:bg-purple-500/30">
      {/* Left Section (Branding) */}
      <div className="relative hidden lg:w-3/5 flex-col justify-between overflow-hidden p-12 lg:flex">
        {/* Animated Gradient Background */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-900 via-slate-900 to-pink-900 opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.4),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.3),transparent_50%)]" />
        
        {/* Content relative to background */}
        <div className="relative z-10 flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-xl transition-transform group-hover:scale-105">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">1to7 Media</span>
          </Link>
          
          <div className="mt-20">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight"
            >
              Turn Your Influence <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Into Income
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-slate-300 max-w-md"
            >
              Join thousands of creators collaborating with top brands. Manage campaigns, track earnings, and grow your audience in one place.
            </motion.p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-2xl p-4 w-fit border border-white/10"
          >
            <div className="flex -space-x-2">
              {[1,2,3,4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300">
                   {String.fromCharCode(64+i)}
                </div>
              ))}
            </div>
            <div>
              <div className="flex text-amber-400 text-sm">
                ★★★★★
              </div>
              <p className="text-xs text-slate-300 font-medium">Trusted by 10,000+ Creators</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Section (Login Flow) */}
      <div className="flex w-full items-center justify-center p-6 lg:w-2/5 relative bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent_70%)] lg:hidden" />
        
        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Mobile Logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden mb-12 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">1to7 Media</span>
          </Link>

          <AnimatePresence mode="wait">
            
            {/* STEP 1: MOBILE */}
            {step === 'mobile' && (
              <motion.div 
                key="mobile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-3 text-center mb-8">
                  <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Welcome</h2>
                  <p className="text-sm text-slate-400">Enter your mobile number to securely sign in or create a creator profile.</p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Mobile Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="bg-white/5 border-white/10 text-white h-14 pl-12 rounded-xl text-base font-medium focus-visible:ring-purple-500 placeholder:text-slate-600"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleMobileSubmit()}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleMobileSubmit}
                  disabled={loading || mobile.length !== 10}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-base shadow-xl shadow-purple-500/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>Continue <ArrowRight className="ml-2 h-5 w-5" /></>
                  )}
                </Button>
              </motion.div>
            )}

            {/* STEP 2: OTP */}
            {step === 'otp' && (
              <motion.div 
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-3 text-center mb-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 mb-4">
                    <Shield className="h-8 w-8 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Verify Your Number</h2>
                  <p className="text-sm text-slate-400">Enter the 6-digit code sent to +91 {mobile}</p>
                </div>
                
                <div className="space-y-2">
                  <Input
                    value={otp}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="bg-white/5 border-white/10 text-white h-16 rounded-xl text-center text-3xl font-mono tracking-[0.5em] focus-visible:ring-purple-500 placeholder:text-slate-700 placeholder:tracking-[0.5em]"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                  />
                </div>

                <Button 
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-base shadow-xl shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify OTP</>
                  )}
                </Button>

                <div className="text-center pt-2">
                  <button onClick={() => setStep('mobile')} className="text-xs text-slate-500 hover:text-white mr-4">Change Number</button>
                  {countdown > 0 ? (
                    <span className="text-xs text-slate-500">Resend in <span className="text-purple-400 font-medium">{countdown}s</span></span>
                  ) : (
                    <button onClick={() => triggerOTP(mobile)} className="text-xs text-purple-400 hover:text-purple-300 font-medium">Resend OTP</button>
                  )}
                </div>
              </motion.div>
            )}

            {/* STEP 3: GOOGLE LINKING */}
            {step === 'google' && (
              <motion.div 
                key="google"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                <div className="space-y-3 text-center mb-8">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 mb-4">
                    <Sparkles className="h-8 w-8 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Almost there!</h2>
                  <p className="text-sm text-slate-400">
                    Your number <strong className="text-white">+91 {mobile}</strong> is verified.
                  </p>
                  
                  {maskedEmail && (
                    <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 inline-block w-full">
                      <p className="text-xs text-slate-400 mb-1">We found your account.</p>
                      <p className="text-sm text-white">Please sign in with: <br/><strong className="text-emerald-400 text-lg">{maskedEmail}</strong></p>
                    </div>
                  )}
                </div>

                <Button 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                  className="w-full h-14 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-base shadow-xl shadow-white/10 transition-all active:scale-[0.98] group cursor-pointer disabled:opacity-60 border border-white/20"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                      </svg>
                      Continue with Google
                    </div>
                  )}
                </Button>
                
                <div className="text-center">
                  <button onClick={() => setStep('mobile')} className="text-xs text-slate-500 hover:text-white transition-colors">Start Over</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  )
}
