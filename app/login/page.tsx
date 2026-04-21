'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import { Sparkles, Loader2, Phone, Shield, CheckCircle2, ArrowRight, Lock, User as UserIcon, ArrowLeft } from 'lucide-react'
import { auth, googleProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import type { ConfirmationResult } from '@/lib/firebase'

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

// Which tab the user picked
type AuthTab = 'password' | 'otp'

// The current view in the multi-step flow
type View =
  | 'main'           // Tabs + Google button
  | 'verify-mobile'  // Enter mobile number (for Google flow)
  | 'verify-otp'     // Enter the 6-digit OTP
  | 'google-ready'   // Mobile verified, show Google popup

// Which flow triggered the mobile verification
type PendingFlow = 'password' | 'google' | 'otp-login'

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>('password')
  const [view, setView] = useState<View>('main')
  const [pendingFlow, setPendingFlow] = useState<PendingFlow>('password')

  // Password state
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')

  // OTP / Mobile state
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [maskedEmail, setMaskedEmail] = useState('')

  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const { login } = useAuth()

  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Initialize invisible reCAPTCHA when we need OTP
  const needsRecaptcha = (view === 'verify-otp' || view === 'verify-mobile' || (view === 'main' && activeTab === 'otp'))
  useEffect(() => {
    if (needsRecaptcha && !window.recaptchaVerifier) {
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
      if (!needsRecaptcha && window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear() } catch (e) {}
        window.recaptchaVerifier = null
      }
    }
  }, [needsRecaptcha])

  // ─── Helper: send Firebase OTP ───
  const sendFirebaseOTP = async (mobileNum: string) => {
    if (!window.recaptchaVerifier) {
      // Try to re-initialize
      try {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
          callback: () => {},
        })
      } catch (e) {
        throw new Error('Verification service not ready. Please refresh the page.')
      }
    }
    const confirmation = await signInWithPhoneNumber(auth, `+91${mobileNum}`, window.recaptchaVerifier)
    confirmationRef.current = confirmation
    setCountdown(30)
    toast.success(`OTP sent to +91 ${mobileNum}`)
  }

  // ─── Helper: mark mobile verified in DB ───
  const markMobileVerified = async (mobileNum: string) => {
    await fetch('/api/auth/mark-mobile-verified', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mobile: mobileNum }),
    })
  }

  // ─── Helper: complete login after verification ───
  const completePasswordLogin = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Login failed')
    if (data.requiresMobileVerification) {
      throw new Error('Mobile still not verified. Please try again.')
    }
    login(data.user)
    toast.success('Welcome back!')
    window.location.href = '/dashboard'
  }

  // ═══════════════════════════════════════════
  //  FLOW 1: PASSWORD LOGIN
  // ═══════════════════════════════════════════
  const handlePasswordSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!identifier || !password) {
      toast.error('Please enter both identifier and password')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')

      if (data.requiresMobileVerification) {
        // Credentials are valid but mobile isn't verified
        toast.info('Please verify your mobile number to continue.')
        setMobile(data.mobile || '')
        setPendingFlow('password')
        // Send OTP immediately to the mobile on file
        if (data.mobile) {
          try {
            await sendFirebaseOTP(data.mobile)
          } catch (otpErr: any) {
            console.error('OTP send error:', otpErr)
            toast.error(otpErr.message || 'Failed to send OTP')
          }
        }
        setView('verify-otp')
        return
      }

      // Mobile is verified — login complete
      login(data.user)
      toast.success('Welcome back!')
      window.location.href = '/dashboard'
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════
  //  FLOW 2: GOOGLE LOGIN
  // ═══════════════════════════════════════════
  const handleGoogleStart = () => {
    setPendingFlow('google')
    setMobile('')
    setView('verify-mobile')
  }

  const handleGoogleMobileSubmit = async () => {
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

      if (!data.exists) {
        toast.error('No account found with this mobile. Please sign up first.')
        setLoading(false)
        return
      }

      if (data.isVerified) {
        // Already verified — go straight to Google popup
        setMaskedEmail(data.maskedEmail || '')
        setView('google-ready')
      } else {
        // Not verified — send OTP first
        await sendFirebaseOTP(cleanMobile)
        setView('verify-otp')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to check mobile. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGooglePopup = async () => {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const firebaseUser = result.user
      if (!firebaseUser.email) {
        toast.error('Could not get email from Google. Please try again.')
        return
      }

      const cleanMobile = mobile.replace(/\D/g, '')
      const res = await fetch('/api/auth/google-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || '',
          mobile: cleanMobile,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')

      login(data.user)
      toast.success('Welcome!')
      window.location.href = '/dashboard'
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return
      console.error('Google Login Error:', err)
      toast.error(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════
  //  FLOW 3: DIRECT OTP LOGIN
  // ═══════════════════════════════════════════
  const handleOTPLoginStart = async () => {
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

      if (!data.exists) {
        toast.error('This mobile number is not registered. Please sign up first.')
        setLoading(false)
        return
      }

      await sendFirebaseOTP(cleanMobile)
      setPendingFlow('otp-login')
      setView('verify-otp')
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        toast.error('Too many attempts. Please try again later.')
      } else {
        toast.error(err.message || 'Failed to send OTP.')
      }
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════
  //  SHARED: VERIFY OTP
  // ═══════════════════════════════════════════
  const handleVerifyOTP = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter a valid 6-digit OTP')
      return
    }

    setLoading(true)
    try {
      if (!confirmationRef.current) throw new Error('Session expired. Please start over.')
      await confirmationRef.current.confirm(otp)

      const cleanMobile = mobile.replace(/\D/g, '')
      // Mark mobile verified in DB
      await markMobileVerified(cleanMobile)
      toast.success('Mobile verified!')

      // Now complete the pending flow
      if (pendingFlow === 'password') {
        // Re-attempt password login — mobile is now verified, cookie will be set
        await completePasswordLogin()
      } else if (pendingFlow === 'google') {
        // Proceed to Google popup
        setView('google-ready')
      } else if (pendingFlow === 'otp-login') {
        // Direct OTP login — use the mark-mobile-verified flow then login API
        // We need to log the user in. Since OTP login doesn't have password,
        // we call google-login with empty email to create session, or a dedicated endpoint.
        // Simplest: call check-mobile to get userId, then set a session via a dedicated route.
        const res = await fetch('/api/auth/otp-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanMobile }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Login failed')
        login(data.user)
        toast.success('Welcome back!')
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Invalid OTP. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ─── Go back to main ───
  const goBack = () => {
    setView('main')
    setOtp('')
    setCountdown(0)
    confirmationRef.current = null
  }

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════
  return (
    <div className="flex min-h-screen bg-slate-950 font-sans selection:bg-purple-500/30">
      {/* Left Section (Branding) */}
      <div className="relative hidden w-full lg:w-1/2 xl:w-3/5 flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-900 via-slate-900 to-pink-900 opacity-60" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.4),transparent_50%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(236,72,153,0.3),transparent_50%)]" />

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
              Turn Your Influence <br />
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
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-medium text-slate-300">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div>
              <div className="flex text-amber-400 text-sm">★★★★★</div>
              <p className="text-xs text-slate-300 font-medium">Trusted by 10,000+ Creators</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Section (Login Flow) */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 xl:w-2/5 relative bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent_70%)] lg:hidden" />

        <div className="w-full max-w-md space-y-6 relative z-10">
          <Link href="/" className="flex items-center gap-2 lg:hidden mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">1to7 Media</span>
          </Link>

          <AnimatePresence mode="wait">

            {/* ══════════════ VIEW: MAIN ══════════════ */}
            {view === 'main' && (
              <motion.div key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Welcome Back</h2>
                  <p className="text-sm text-slate-400">Sign in to your creator account to continue.</p>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-white/5 border border-white/10 rounded-xl">
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'password' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    Password
                  </button>
                  <button
                    onClick={() => setActiveTab('otp')}
                    className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${activeTab === 'otp' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                  >
                    Login via OTP
                  </button>
                </div>

                <AnimatePresence mode="wait">
                  {/* PASSWORD TAB */}
                  {activeTab === 'password' && (
                    <motion.div key="pw" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}>
                      <form onSubmit={handlePasswordSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Email, Mobile or HYID</label>
                          <div className="relative group">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <Input
                              value={identifier}
                              onChange={(e) => setIdentifier(e.target.value)}
                              placeholder="Enter your credential"
                              className="bg-white/5 border-white/10 text-white h-14 pl-12 rounded-xl text-sm font-medium focus-visible:ring-purple-500 placeholder:text-slate-600"
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center px-1">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Password</label>
                            <Link href="/forgot-password" className="text-[10px] text-purple-400 hover:text-purple-300 transition-colors">Forgot?</Link>
                          </div>
                          <div className="relative group">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                            <Input
                              type="password"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                              placeholder="Enter password"
                              className="bg-white/5 border-white/10 text-white h-14 pl-12 rounded-xl text-sm font-medium focus-visible:ring-purple-500 placeholder:text-slate-600"
                            />
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={loading || !identifier || !password}
                          className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-base shadow-xl shadow-purple-500/20 disabled:opacity-50 mt-2"
                        >
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Sign In <ArrowRight className="ml-2 h-5 w-5" /></>}
                        </Button>
                      </form>
                    </motion.div>
                  )}

                  {/* OTP TAB */}
                  {activeTab === 'otp' && (
                    <motion.div key="otp-tab" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
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
                            onKeyDown={(e) => e.key === 'Enter' && handleOTPLoginStart()}
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleOTPLoginStart}
                        disabled={loading || mobile.length !== 10}
                        className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-base shadow-xl shadow-purple-500/20 disabled:opacity-50 mt-2"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send OTP <ArrowRight className="ml-2 h-5 w-5" /></>}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ─── OR Divider ─── */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-950 px-3 text-slate-500 font-bold tracking-widest">Or</span>
                  </div>
                </div>

                {/* Standalone Google Button */}
                <Button
                  onClick={handleGoogleStart}
                  disabled={loading}
                  className="w-full h-14 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-base shadow-xl shadow-white/10 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 border border-white/20"
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Sign in with Google
                  </div>
                </Button>

                <p className="mt-6 text-center text-sm text-slate-400">
                  New to 1to7 Media?{' '}
                  <Link href="/signup" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                    Create an account
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ══════════════ VIEW: VERIFY MOBILE (for Google flow) ══════════════ */}
            {view === 'verify-mobile' && (
              <motion.div key="verify-mobile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                </button>
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-blue-500/20 mb-3">
                    <Phone className="h-6 w-6 text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Verify Your Mobile</h2>
                  <p className="text-sm text-slate-400">Enter your registered mobile number to continue with Google Sign-In.</p>
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
                      onKeyDown={(e) => e.key === 'Enter' && handleGoogleMobileSubmit()}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleGoogleMobileSubmit}
                  disabled={loading || mobile.length !== 10}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-bold text-base shadow-xl shadow-blue-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="ml-2 h-5 w-5" /></>}
                </Button>
              </motion.div>
            )}

            {/* ══════════════ VIEW: VERIFY OTP (shared) ══════════════ */}
            {view === 'verify-otp' && (
              <motion.div key="verify-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                </button>
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/20 mb-3">
                    <Shield className="h-6 w-6 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Verify OTP</h2>
                  <p className="text-sm text-slate-400">Enter the 6-digit code sent to <strong className="text-white">+91 {mobile}</strong></p>
                </div>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="bg-white/5 border-white/10 text-white h-16 rounded-xl text-center text-3xl font-mono tracking-[0.5em] focus-visible:ring-purple-500 placeholder:text-slate-700 placeholder:tracking-[0.5em]"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                />
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.length !== 6}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-base shadow-xl shadow-emerald-500/20 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify & Continue</>}
                </Button>
                <div className="text-center pt-2">
                  <button onClick={goBack} className="text-xs text-slate-500 hover:text-white mr-4 transition-colors">Change Number</button>
                  {countdown > 0 ? (
                    <span className="text-xs text-slate-500">Resend in <span className="text-purple-400 font-medium">{countdown}s</span></span>
                  ) : (
                    <button onClick={() => sendFirebaseOTP(mobile.replace(/\D/g, ''))} className="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors">Resend OTP</button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══════════════ VIEW: GOOGLE READY ══════════════ */}
            {view === 'google-ready' && (
              <motion.div key="google-ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <button onClick={goBack} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to login
                </button>
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-green-500/20 border border-emerald-500/20 mb-3">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Mobile Verified!</h2>
                  <p className="text-sm text-slate-400">
                    <strong className="text-white">+91 {mobile}</strong> is confirmed. Now sign in with your Google account.
                  </p>
                  {maskedEmail && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 w-full">
                      <p className="text-xs text-slate-400 mb-0.5">We found your account linked to:</p>
                      <p className="text-sm font-semibold text-emerald-400">{maskedEmail}</p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleGooglePopup}
                  disabled={loading}
                  className="w-full h-14 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-base shadow-xl shadow-white/10 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60 border border-white/20"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-600" />
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      Continue with Google
                    </div>
                  )}
                </Button>
              </motion.div>
            )}

          </AnimatePresence>

          <div id="recaptcha-container"></div>
        </div>
      </div>
    </div>
  )
}
