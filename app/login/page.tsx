'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import { Sparkles, Loader2, Phone, Shield, CheckCircle2, ArrowRight, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Instagram, Mail, Clock } from 'lucide-react'
import { auth, googleProvider, signInWithPopup, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import type { ConfirmationResult } from '@/lib/firebase'

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

// Which tab the user picked
type AuthTab = 'password' | 'email-otp' | 'otp'

// Which flow triggered the mobile verification
type PendingFlow = 'password' | 'google' | 'instagram' | 'otp-login'

// The current view in the multi-step flow
type View =
  | 'main'           // Tabs + Google + Instagram buttons
  | 'verify-mobile'  // Enter mobile number (for Google & Instagram flow)
  | 'verify-otp'     // Enter the 6-digit OTP
  | 'google-ready'   // Mobile verified, show Google popup
  | 'instagram-ready'// Mobile verified, show Instagram redirect button

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<AuthTab>('password')
  const [view, setView] = useState<View>('main')
  const [pendingFlow, setPendingFlow] = useState<PendingFlow>('password')

  // Password state
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Email OTP state
  const [loginEmail, setLoginEmail] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [emailOtpSent, setEmailOtpSent] = useState(false)
  const [emailCountdown, setEmailCountdown] = useState(0)

  // OTP / Mobile state
  const [mobile, setMobile] = useState('')
  const [otp, setOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [maskedEmail, setMaskedEmail] = useState('')
  const [isSendingOtp, setIsSendingOtp] = useState(false)
  const [resendAttempts, setResendAttempts] = useState(0)

  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const { login } = useAuth()

  // Countdown timer for mobile OTP
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Countdown timer for email OTP
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [emailCountdown])

  // Helper to get or re-initialize a safe RecaptchaVerifier
  const getOrCreateRecaptchaVerifier = () => {
    if (window.recaptchaVerifier) {
      return window.recaptchaVerifier
    }

    const container = document.getElementById('recaptcha-container')
    if (container && container.parentNode && container.childNodes.length > 0) {
      const freshContainer = document.createElement('div')
      freshContainer.id = 'recaptcha-container'
      container.parentNode.replaceChild(freshContainer, container)
    }

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => {},
      'expired-callback': () => {
        toast.error('Security verification expired. Please try again.')
      },
    })

    window.recaptchaVerifier = verifier
    return verifier
  }

  const resetRecaptchaLogin = () => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear()
        window.recaptchaVerifier = null
      }
    } catch (e) {}
    const container = document.getElementById('recaptcha-container')
    if (container && container.parentNode) {
      const freshContainer = document.createElement('div')
      freshContainer.id = 'recaptcha-container'
      container.parentNode.replaceChild(freshContainer, container)
    }
  }

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear()
        } catch (e) {}
        window.recaptchaVerifier = null
      }
    }
  }, [])

  // ─── Helper: send Firebase OTP ───
  const sendFirebaseOTP = async (mobileNum: string, isResend = false): Promise<boolean> => {
    setIsSendingOtp(true)
    const toastId = toast.loading(isResend ? 'Resending OTP...' : 'Sending OTP...')
    try {
      const verifier = getOrCreateRecaptchaVerifier()
      const confirmation = await signInWithPhoneNumber(auth, `+91${mobileNum}`, verifier)
      confirmationRef.current = confirmation
      if (!isResend) {
        setCountdown(45)
      }
      toast.success(
        isResend ? `New OTP sent to +91 ${mobileNum}` : `OTP sent to +91 ${mobileNum}`,
        { id: toastId }
      )
      return true
    } catch (err: any) {
      console.error('Firebase OTP error:', err)
      resetRecaptchaLogin()

      if (err?.code === 'auth/too-many-requests' || err?.message?.includes('too-many-requests')) {
        toast.error(
          'Too many OTP attempts on this number. Firebase has temporarily paused requests for security. Please wait a few minutes before trying again.',
          { id: toastId, duration: 7000 }
        )
      } else if (err?.code === 'auth/quota-exceeded' || err?.message?.includes('quota-exceeded')) {
        toast.error(
          'Daily SMS limit reached for this project. Please contact support or try again later.',
          { id: toastId, duration: 6000 }
        )
      } else if (err?.code === 'auth/invalid-phone-number') {
        toast.error(
          'Invalid mobile number format. Please ensure it is a 10-digit Indian number.',
          { id: toastId }
        )
      } else if (err?.code === 'auth/captcha-check-failed') {
        toast.error(
          'Security verification failed. Please refresh the page and try again.',
          { id: toastId }
        )
      } else {
        toast.error(err?.message || 'Failed to send OTP. Please try again.', { id: toastId })
      }
      return false
    } finally {
      setIsSendingOtp(false)
    }
  }

  // ─── Helper: handle resend OTP with cooldown check & feedback ───
  const handleResendOTP = async () => {
    if (isSendingOtp) {
      return
    }

    if (countdown > 0) {
      toast.info(`Please wait ${countdown}s before requesting a new OTP.`)
      return
    }

    const cleanMobile = mobile.replace(/\D/g, '')
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Invalid mobile number. Please click "Change Number" to re-enter.')
      return
    }

    const nextAttempts = resendAttempts + 1
    setResendAttempts(nextAttempts)
    const cooldownDuration = nextAttempts === 1 ? 45 : nextAttempts === 2 ? 60 : 90
    setCountdown(cooldownDuration)

    await sendFirebaseOTP(cleanMobile, true)
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
    if (!res.ok) {
      toast.error(data.error || 'Login failed')
      return
    }
    if (data.requiresMobileVerification) {
      toast.error('Mobile still not verified. Please try again.')
      return
    }
    login(data.user)
    toast.success('Welcome back!')
    window.location.href = '/dashboard'
  }

  // ─── Helper: send Email OTP ───
  const handleSendEmailOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = loginEmail.trim().toLowerCase()
    if (!clean || !clean.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, type: 'login' }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to send OTP')
        return
      }

      setEmailOtpSent(true)
      setEmailCountdown(30)
      toast.success(`Verification code sent to ${clean}!`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification email')
    } finally {
      setLoading(false)
    }
  }

  // ─── Helper: verify Email OTP & Login ───
  const handleVerifyEmailOTP = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const clean = loginEmail.trim().toLowerCase()
    const cleanCode = emailOtp.trim()
    if (!cleanCode || cleanCode.length !== 6) {
      toast.error('Please enter the 6-digit OTP code')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: clean,
          otp: cleanCode,
          type: 'login',
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Invalid or expired OTP')
        return
      }

      login(data.user)
      toast.success('Welcome back!')
      window.location.href = '/dashboard'
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please try again.')
    } finally {
      setLoading(false)
    }
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
      if (!res.ok) {
        toast.error(data.error || 'Invalid credentials. Please try again.')
        setLoading(false)
        return
      }

      if (data.requiresMobileVerification) {
        // Credentials are valid but mobile isn't verified
        toast.info('Please verify your mobile number to continue.')
        setMobile(data.mobile || '')
        setPendingFlow('password')
        // Send OTP immediately to the mobile on file
        if (data.mobile) {
          const sent = await sendFirebaseOTP(data.mobile)
          if (sent) {
            setView('verify-otp')
          }
        }
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

  // ═══════════════════════════════════════════
  //  FLOW 3: INSTAGRAM LOGIN
  // ═══════════════════════════════════════════
  const handleInstagramStart = () => {
    setPendingFlow('instagram')
    setMobile('')
    setView('verify-mobile')
  }

  // ─── Shared Mobile Submit for Social Logins (Google & Instagram) ───
  const handleSocialMobileSubmit = async () => {
    const cleanMobile = mobile.replace(/\D/g, '')
    if (!cleanMobile) {
      toast.error('Please enter your mobile number')
      return
    }
    if (cleanMobile.length !== 10) {
      toast.error('Mobile number must be exactly 10 digits')
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
        // Already verified — go straight to Social popup
        setMaskedEmail(data.maskedEmail || '')
        if (pendingFlow === 'instagram') {
          setView('instagram-ready')
        } else {
          setView('google-ready')
        }
      } else {
        // Not verified — send OTP first
        const sent = await sendFirebaseOTP(cleanMobile)
        if (sent) {
          setView('verify-otp')
        }
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
        setLoading(false)
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
      if (!res.ok) {
        toast.error(data.error || 'Login failed', {
          duration: 6000
        })
        setLoading(false)
        return
      }

      login(data.user)
      toast.success('Welcome!')
      window.location.href = '/dashboard'
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setLoading(false)
        return
      }
      toast.error(err.message || 'Login failed. Please try again.', {
        duration: 6000
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInstagramRedirect = () => {
    const cleanMobile = mobile.replace(/\D/g, '')
    if (cleanMobile) {
      document.cookie = `pending_mobile=${cleanMobile}; path=/; max-age=600`
    }
    window.location.href = '/api/auth/instagram/login'
  }

  // ═══════════════════════════════════════════
  //  FLOW 4: DIRECT OTP LOGIN
  // ═══════════════════════════════════════════
  const handleOTPLoginStart = async () => {
    const cleanMobile = mobile.replace(/\D/g, '')
    if (!cleanMobile) {
      toast.error('Please enter your mobile number')
      return
    }
    if (cleanMobile.length !== 10) {
      toast.error('Mobile number must be exactly 10 digits')
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

      const sent = await sendFirebaseOTP(cleanMobile)
      if (sent) {
        setPendingFlow('otp-login')
        setView('verify-otp')
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to initiate mobile OTP.')
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════
  //  SHARED: VERIFY OTP
  // ═══════════════════════════════════════════
  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      toast.error('Please enter the 6-digit OTP code')
      return
    }
    if (otp.length !== 6) {
      toast.error('OTP must be exactly 6 digits')
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
      } else if (pendingFlow === 'instagram') {
        // Proceed to Instagram redirect
        setView('instagram-ready')
      } else if (pendingFlow === 'otp-login') {
        const res = await fetch('/api/auth/otp-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mobile: cleanMobile }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error || 'Login failed')
          setLoading(false)
          return
        }
        login(data.user)
        toast.success('Welcome back!')
        window.location.href = '/dashboard'
      }
    } catch (err: any) {
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
      {/* Left Section (Branding Banner Image & Text Overlay) */}
      <div className="relative hidden w-full lg:w-1/2 lg:flex flex-col justify-between overflow-hidden p-12 bg-charcoal-surface">
        {/* Background Image - Full Bleed object-cover */}
        <img 
          src="/signup_banner_clean.png" 
          alt="1to7 Media Banner Background" 
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(254,189,28,0.15),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(94,94,94,0.2),transparent_60%)]" />

        <div className="relative z-10 flex flex-col gap-6">
          <div className="mt-20">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight drop-shadow-md"
            >
              Turn Your Influence <br />
              <span className="text-primary-container">
                Into Income
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-secondary-container max-w-md drop-shadow-sm font-medium"
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
            className="flex items-center gap-3 bg-white/5 backdrop-blur-md rounded-md p-4 w-fit border border-white/10 shadow-lg"
          >
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-charcoal-surface bg-secondary flex items-center justify-center text-xs font-medium text-white">
                  {String.fromCharCode(64 + i)}
                </div>
              ))}
            </div>
            <div>
              <div className="flex text-primary-container text-sm">★★★★★</div>
              <p className="text-xs text-secondary-container font-medium">Trusted by 10,000+ Creators</p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Section (Login Flow) */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 relative bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,189,28,0.05),transparent_70%)] lg:hidden" />

        {/* Top-Left "Back to login" Button */}
        {view !== 'main' && (
          <button
            onClick={goBack}
            className="absolute top-6 left-6 sm:top-8 sm:left-8 flex items-center gap-1.5 text-xs font-semibold text-charcoal-surface hover:text-primary bg-slate-100 hover:bg-slate-200/80 px-3.5 py-2 rounded-full border border-border-subtle/60 shadow-sm transition-all duration-200 cursor-pointer active:scale-95 z-20"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to login</span>
          </button>
        )}

        <div className="w-full max-w-md space-y-6 relative z-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal-surface text-white shadow-md">
              <Sparkles className="h-5.5 w-5.5 text-primary-container" />
            </div>
            <span className="text-2xl font-bold tracking-wider text-charcoal-surface uppercase font-sans">1to7 Media</span>
          </div>

          <AnimatePresence mode="wait">

            {/* ══════════════ VIEW: MAIN ══════════════ */}
            {view === 'main' && (
              <motion.div key="main" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Hi, Welcome Back</h2>
                  <p className="text-sm text-slate-500 font-medium">Choose your preferred login method</p>
                </div>

                {/* Mode Tabs: Password vs Email OTP */}
                <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80">
                  <button
                    type="button"
                    onClick={() => { setActiveTab('password'); setEmailOtpSent(false); setEmailOtp('') }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'password'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Lock className="h-3.5 w-3.5" /> Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setActiveTab('email-otp') }}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      activeTab === 'email-otp'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    <Mail className="h-3.5 w-3.5" /> Email OTP
                  </button>
                </div>

                {/* Password Login Form */}
                {activeTab === 'password' && (
                  <motion.div key="pw" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <div className="relative group">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                          <Input
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder="Work Email Address, Mobile or HYID"
                            className="bg-white border border-slate-200 text-slate-900 h-13 pl-12 rounded-xl text-sm font-medium focus-visible:ring-primary-container placeholder:text-slate-400 shadow-sm"
                            required
                            autoFocus
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="bg-white border border-slate-200 text-slate-900 h-13 pl-12 pr-12 rounded-xl text-sm font-medium focus-visible:ring-primary-container placeholder:text-slate-400 shadow-sm"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          >
                            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end">
                        <Link href="/forgot-password" className="text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
                          Forgot Password?
                        </Link>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-13 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-sm transition-all active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-60 uppercase tracking-wider"
                      >
                        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'SIGN IN'}
                      </Button>
                    </form>
                  </motion.div>
                )}

                {/* Email OTP Login Form */}
                {activeTab === 'email-otp' && (
                  <motion.div key="email-otp-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    {!emailOtpSent ? (
                      <form onSubmit={handleSendEmailOTP} className="space-y-4">
                        <div className="space-y-2">
                          <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                            <Input
                              type="email"
                              value={loginEmail}
                              onChange={(e) => setLoginEmail(e.target.value)}
                              placeholder="Enter your registered email address"
                              className="bg-white border border-slate-200 text-slate-900 h-13 pl-12 rounded-xl text-sm font-medium focus-visible:ring-primary-container placeholder:text-slate-400 shadow-sm"
                              required
                              autoFocus
                            />
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={loading || !loginEmail.trim()}
                          className="w-full h-13 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-sm transition-all active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-60 uppercase tracking-wider"
                        >
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'SEND LOGIN CODE'}
                        </Button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyEmailOTP} className="space-y-4">
                        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center">
                          <p className="text-xs text-indigo-900 font-medium">
                            6-digit login code sent to <span className="font-bold">{loginEmail}</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => { setEmailOtpSent(false); setEmailOtp('') }}
                            className="text-[11px] font-bold text-indigo-600 hover:underline mt-0.5 cursor-pointer"
                          >
                            Change Email
                          </button>
                        </div>

                        <div className="space-y-2">
                          <Input
                            value={emailOtp}
                            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            placeholder="000000"
                            maxLength={6}
                            className="bg-white border border-slate-200 text-slate-900 h-14 rounded-xl text-center text-3xl font-mono tracking-[0.4em] focus-visible:ring-primary-container placeholder:text-slate-300 placeholder:tracking-[0.4em] shadow-sm font-bold"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && emailOtp.length === 6 && handleVerifyEmailOTP()}
                          />
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                          <span>Didn&apos;t receive code?</span>
                          {emailCountdown > 0 ? (
                            <button
                              type="button"
                              onClick={() => toast.info(`Please wait ${emailCountdown}s before requesting a new email code.`)}
                              className="font-semibold text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                            >
                              Resend in {emailCountdown}s
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleSendEmailOTP}
                              disabled={loading}
                              className="font-bold text-pink-600 hover:text-pink-700 cursor-pointer"
                            >
                              Resend OTP
                            </button>
                          )}
                        </div>

                        <Button
                          type="submit"
                          disabled={loading || emailOtp.length !== 6}
                          className="w-full h-13 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-extrabold text-sm transition-all active:scale-[0.98] shadow-md cursor-pointer disabled:opacity-60 uppercase tracking-wider"
                        >
                          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'VERIFY & SIGN IN'}
                        </Button>
                      </form>
                    )}
                  </motion.div>
                )}

                {/* Divider */}
                <div className="relative flex items-center justify-center my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative bg-white px-4 text-xs font-bold uppercase tracking-widest text-slate-400">
                    OR
                  </div>
                </div>

                {/* Standalone Google Button */}
                <Button
                  type="button"
                  onClick={handleGoogleStart}
                  disabled={loading}
                  className="w-full h-13 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-sm border border-slate-200 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                >
                  <div className="flex items-center justify-center gap-3">
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    SIGN-IN WITH GOOGLE
                  </div>
                </Button>

                {/* Continue with Instagram Button */}
                <Button
                  type="button"
                  onClick={handleInstagramStart}
                  disabled={loading}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-extrabold text-sm border-0 transition-all active:scale-[0.98] cursor-pointer shadow-md mt-3 uppercase tracking-wider"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Instagram className="h-5 w-5 text-white" />
                    CONTINUE WITH INSTAGRAM
                  </div>
                </Button>

                <p className="mt-6 text-center text-sm text-slate-600 font-medium">
                  Don&apos;t have an account?{' '}
                  <Link href="/signup" className="font-bold text-slate-900 hover:underline transition-colors">
                    Create an account
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ══════════════ VIEW: VERIFY MOBILE (for Google & Instagram flow) ══════════════ */}
            {view === 'verify-mobile' && (
              <motion.div key="verify-mobile" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-container/20 border border-primary-container/30 mb-3">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-charcoal-surface">Verify Your Mobile</h2>
                  <p className="text-sm text-secondary">
                    Enter your registered mobile number to continue with {pendingFlow === 'instagram' ? 'Instagram' : 'Google'} Sign-In.
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-secondary uppercase tracking-widest px-1">Mobile Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary group-focus-within:text-primary transition-colors" />
                    <Input
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      className="bg-white border border-border-subtle text-foreground h-12 pl-12 rounded-md text-sm font-medium focus-visible:ring-primary-container placeholder:text-secondary"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleSocialMobileSubmit()}
                    />
                  </div>
                </div>
                <Button
                  onClick={handleSocialMobileSubmit}
                  disabled={loading}
                  className="w-full h-12 rounded-md bg-primary-container text-black font-bold text-sm disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
                </Button>
              </motion.div>
            )}

            {/* ══════════════ VIEW: VERIFY OTP (shared) ══════════════ */}
            {view === 'verify-otp' && (
              <motion.div key="verify-otp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-container/20 border border-primary-container/30 mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-charcoal-surface">Verify OTP</h2>
                  <p className="text-sm text-secondary">Enter the 6-digit code sent to <strong className="text-charcoal-surface">+91 {mobile}</strong></p>
                </div>
                <Input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  className="bg-white border border-border-subtle text-charcoal-surface h-12 rounded-md text-center text-2xl font-mono tracking-[0.4em] focus-visible:ring-primary-container placeholder:text-secondary placeholder:tracking-[0.4em]"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOTP()}
                />
                <Button
                  onClick={handleVerifyOTP}
                  disabled={loading}
                  className="w-full h-12 rounded-md bg-primary-container text-black font-bold text-sm disabled:opacity-50 mt-2 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Verify & Continue</>}
                </Button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="text-xs text-secondary hover:text-charcoal-surface mr-4 transition-colors cursor-pointer"
                  >
                    Change Number
                  </button>
                  {countdown > 0 ? (
                    <button
                      type="button"
                      disabled
                      className="text-xs text-slate-400 bg-slate-100/90 px-2.5 py-1 rounded-md cursor-not-allowed select-none font-medium inline-flex items-center gap-1.5 border border-slate-200"
                    >
                      <Clock className="h-3 w-3 text-slate-400" />
                      Resend in <span className="text-primary font-bold">{countdown}s</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      disabled={isSendingOtp}
                      className="text-xs text-primary hover:text-surface-tint font-semibold transition-colors disabled:opacity-50 inline-flex items-center gap-1 cursor-pointer"
                    >
                      {isSendingOtp && <Loader2 className="h-3 w-3 animate-spin" />}
                      {isSendingOtp ? 'Sending...' : 'Resend OTP'}
                    </button>
                  )}
                </div>
              </motion.div>
            )}

            {/* ══════════════ VIEW: GOOGLE READY ══════════════ */}
            {view === 'google-ready' && (
              <motion.div key="google-ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-primary-container/20 border border-primary-container/30 mb-3">
                    <CheckCircle2 className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-charcoal-surface">Mobile Verified!</h2>
                  <p className="text-sm text-secondary">
                    <strong className="text-charcoal-surface">+91 {mobile}</strong> is confirmed. Now sign in with your Google account.
                  </p>
                  {maskedEmail && (
                    <div className="mt-3 p-3 rounded-md bg-primary-container/10 border border-primary-container/20 w-full text-center">
                      <p className="text-xs text-secondary mb-0.5">We found your account linked to:</p>
                      <p className="text-sm font-semibold text-primary">{maskedEmail}</p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleGooglePopup}
                  disabled={loading}
                  className="w-full h-12 rounded-md bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm border border-slate-200 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center justify-center gap-3">
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      CONTINUE WITH GOOGLE
                    </div>
                  )}
                </Button>
              </motion.div>
            )}

            {/* ══════════════ VIEW: INSTAGRAM READY ══════════════ */}
            {view === 'instagram-ready' && (
              <motion.div key="instagram-ready" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-pink-500/10 border border-pink-500/20 mb-3">
                    <CheckCircle2 className="h-6 w-6 text-pink-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Mobile Verified!</h2>
                  <p className="text-sm text-slate-500 font-medium">
                    <strong className="text-slate-900">+91 {mobile}</strong> is confirmed. Now sign in with your Instagram account.
                  </p>
                  {maskedEmail && (
                    <div className="mt-3 p-3 rounded-md bg-pink-50/50 border border-pink-200/50 w-full text-center">
                      <p className="text-xs text-slate-500 mb-0.5">Account linked to mobile:</p>
                      <p className="text-sm font-semibold text-pink-600">{maskedEmail}</p>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleInstagramRedirect}
                  disabled={loading}
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-extrabold text-sm border-0 transition-all active:scale-[0.98] cursor-pointer shadow-md uppercase tracking-wider"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Instagram className="h-5 w-5 text-white" />
                    CONTINUE WITH INSTAGRAM
                  </div>
                </Button>
              </motion.div>
            )}

          </AnimatePresence>

          <div id="recaptcha-container"></div>

          {/* Footer Privacy Link */}
          <div className="mt-8 text-center">
            <Link href="/privacy" className="text-xs text-secondary hover:text-charcoal-surface font-medium underline transition-colors">
              Privacy Policy & Data Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
