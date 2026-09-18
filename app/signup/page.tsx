'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import { Sparkles, Loader2, Phone, Shield, CheckCircle2, ArrowRight, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Mail, Instagram, Clock } from 'lucide-react'
import { extractInstagramUsername } from '@/lib/instagram-utils'
import { auth, RecaptchaVerifier, signInWithPhoneNumber } from '@/lib/firebase'
import type { ConfirmationResult } from '@/lib/firebase'

declare global {
  interface Window {
    recaptchaVerifierSignup: any;
  }
}

type View =
  | 'details'        // Fill in basic details
  | 'verify-all'     // Enter mobile OTP AND email OTP together

export default function SignupPage() {
  const [view, setView] = useState<View>('details')

  // Form State
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')
  const [gender, setGender] = useState('')
  const [instagramUsername, setInstagramUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // OTP State
  const [mobileOtp, setMobileOtp] = useState('')
  const [emailOtp, setEmailOtp] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [emailCountdown, setEmailCountdown] = useState(0)
  const [isResendingMobile, setIsResendingMobile] = useState(false)
  const [isResendingEmail, setIsResendingEmail] = useState(false)
  const [mobileResendAttempts, setMobileResendAttempts] = useState(0)

  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef<ConfirmationResult | null>(null)
  const { login } = useAuth()

  // Countdowns
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown(emailCountdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [emailCountdown])

  // Helper to get or re-initialize a safe RecaptchaVerifier
  const getOrCreateRecaptchaVerifierSignup = () => {
    if (window.recaptchaVerifierSignup) {
      return window.recaptchaVerifierSignup
    }

    const container = document.getElementById('recaptcha-container-signup')
    if (container && container.parentNode && container.childNodes.length > 0) {
      const freshContainer = document.createElement('div')
      freshContainer.id = 'recaptcha-container-signup'
      container.parentNode.replaceChild(freshContainer, container)
    }

    const verifier = new RecaptchaVerifier(auth, 'recaptcha-container-signup', {
      size: 'invisible',
      callback: () => { },
      'expired-callback': () => {
        toast.error('Security verification expired. Please try again.')
      }
    })

    window.recaptchaVerifierSignup = verifier
    return verifier
  }

  const resetRecaptchaSignup = () => {
    try {
      if (window.recaptchaVerifierSignup) {
        window.recaptchaVerifierSignup.clear()
        window.recaptchaVerifierSignup = null
      }
    } catch (e) {}
    const container = document.getElementById('recaptcha-container-signup')
    if (container && container.parentNode) {
      const freshContainer = document.createElement('div')
      freshContainer.id = 'recaptcha-container-signup'
      container.parentNode.replaceChild(freshContainer, container)
    }
  }

  // Cleanup reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      if (window.recaptchaVerifierSignup) {
        try { window.recaptchaVerifierSignup.clear() } catch (e) { }
        window.recaptchaVerifierSignup = null
      }
    }
  }, [])

  // ─── Step 1: Submit Details & Send OTPs ───
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!fullName.trim()) {
      toast.error('Please enter your full name')
      return
    }
    if (!email.trim()) {
      toast.error('Please enter your email address')
      return
    }
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }
    if (!mobile.trim()) {
      toast.error('Please enter your mobile number')
      return
    }
    if (mobile.replace(/\D/g, '').length !== 10) {
      toast.error('Mobile number must be exactly 10 digits')
      return
    }
    if (!password.trim()) {
      toast.error('Please enter a password')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }
    if (!gender) {
      toast.error('Please select your gender')
      return
    }

    setLoading(true)
    try {
      const cleanMobile = mobile.replace(/\D/g, '')

      // 1. Check if user already exists
      const res = await fetch('/api/auth/check-user-exists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile, email })
      })
      const data = await res.json()

      if (data.exists) {
        toast.error(data.message || 'User already exists.')
        setLoading(false)
        return
      }

      // 2. Send both OTPs simultaneously
      await Promise.all([
        sendFirebaseOTP(cleanMobile),
        sendEmailOTP(email)
      ])

      setView('verify-all')
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const sendFirebaseOTP = async (mobileNum: string, isResend = false) => {
    const verifier = getOrCreateRecaptchaVerifierSignup()
    const confirmation = await signInWithPhoneNumber(auth, `+91${mobileNum}`, verifier)
    confirmationRef.current = confirmation
    if (!isResend) {
      setCountdown(45)
    }
    return confirmation
  }

  const sendEmailOTP = async (emailAddr: string) => {
    const res = await fetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddr, type: 'signup' }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send email OTP')

    setEmailCountdown(60)
  }

  const handleResendMobile = async () => {
    if (isResendingMobile) {
      return
    }

    if (countdown > 0) {
      toast.info(`Please wait ${countdown}s before requesting a new mobile OTP.`)
      return
    }

    const cleanMobile = mobile.replace(/\D/g, '')
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Invalid mobile number. Please check the number.')
      return
    }

    setIsResendingMobile(true)
    const nextAttempts = mobileResendAttempts + 1
    setMobileResendAttempts(nextAttempts)
    const cooldownDuration = nextAttempts === 1 ? 45 : nextAttempts === 2 ? 60 : 90
    setCountdown(cooldownDuration)

    const toastId = toast.loading('Resending Mobile OTP...')
    try {
      await sendFirebaseOTP(cleanMobile, true)
      toast.success(`New OTP sent to +91 ${cleanMobile}`, { id: toastId })
    } catch (err: any) {
      console.error('Firebase OTP error:', err)
      resetRecaptchaSignup()

      if (err?.code === 'auth/too-many-requests' || err?.message?.includes('too-many-requests')) {
        toast.error(
          'Too many OTP attempts on this number. Firebase has temporarily paused requests for security. Please wait a few minutes before trying again.',
          { id: toastId, duration: 7000 }
        )
      } else if (err?.code === 'auth/quota-exceeded' || err?.message?.includes('quota-exceeded')) {
        toast.error('Daily SMS quota reached. Please contact support or try again later.', { id: toastId, duration: 6000 })
      } else if (err?.code === 'auth/invalid-phone-number') {
        toast.error('Invalid mobile number format. Please ensure it is a 10-digit number.', { id: toastId })
      } else if (err?.code === 'auth/captcha-check-failed') {
        toast.error('Security verification failed. Please refresh the page.', { id: toastId })
      } else {
        toast.error(err.message || 'Failed to resend Mobile OTP.', { id: toastId })
      }
    } finally {
      setIsResendingMobile(false)
    }
  }

  const handleResendEmail = async () => {
    if (isResendingEmail) {
      toast.info('Sending email code, please wait...')
      return
    }

    if (emailCountdown > 0) {
      toast.info(`Please wait ${emailCountdown}s before requesting a new email code.`)
      return
    }

    const cleanEmail = email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Invalid email address.')
      return
    }

    setIsResendingEmail(true)
    const toastId = toast.loading('Resending Email OTP...')
    try {
      await sendEmailOTP(cleanEmail)
      toast.success(`Verification code sent to ${cleanEmail}`, { id: toastId })
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend Email OTP.', { id: toastId })
    } finally {
      setIsResendingEmail(false)
    }
  }

  // ─── Step 2: Verify Both OTPs & Create Account ───
  const handleVerifyAll = async () => {
    if (!mobileOtp.trim()) {
      toast.error('Please enter the Mobile OTP')
      return
    }
    if (mobileOtp.length !== 6) {
      toast.error('Mobile OTP must be exactly 6 digits')
      return
    }
    if (!emailOtp.trim()) {
      toast.error('Please enter the Email OTP')
      return
    }
    if (emailOtp.length !== 6) {
      toast.error('Email OTP must be exactly 6 digits')
      return
    }

    setLoading(true)
    try {
      // 1. Verify Mobile OTP via Firebase
      if (!confirmationRef.current) throw new Error('Mobile session expired. Please go back and try again.')
      await confirmationRef.current.confirm(mobileOtp)

      // 2. Verify Email OTP via Backend
      const verifyRes = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp: emailOtp, type: 'signup' }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyRes.ok) throw new Error(verifyData.error || 'Invalid Email OTP')

      // Both verified successfully, proceed to create the account
      await finalizeSignup()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Verification failed. Please check your OTPs.')
      setLoading(false)
    }
  }

  const finalizeSignup = async () => {
    const cleanMobile = mobile.replace(/\D/g, '')
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fullName,
        email,
        mobile: cleanMobile,
        password,
        gender,
        instagramUsername: extractInstagramUsername(instagramUsername) || undefined
      }),
    })
    const data = await res.json()

    if (!res.ok) {
      toast.error(data.error || 'Failed to create account.')
      setLoading(false)
      return
    }

    login(data.user)
    toast.success('Account created successfully!')
    window.location.href = '/dashboard'
  }

  return (
    <div className="flex min-h-screen bg-background font-sans selection:bg-primary-container/30">
      {/* Left Section (Branding Banner Image & Text Overlay) */}
      <div className="relative hidden w-full lg:w-1/2 lg:flex flex-col justify-between overflow-hidden p-12 bg-charcoal-surface">
        {/* Background Image - Full Bleed object-cover */}
        <img 
          src="/signup_banner_clean.png" 
          alt="1to7 Media Banner Background" 
          className="absolute inset-0 h-full w-full object-cover opacity-50"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(254,189,28,0.15),transparent_60%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(94,94,94,0.2),transparent_60%)]" />

        <div className="relative z-10 flex flex-col gap-6">
          <Link href="/" className="flex items-center gap-2 group w-fit bg-black/35 backdrop-blur-md px-4 py-2 rounded-md border border-white/10 shadow-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-container shadow-md transition-transform group-hover:scale-105">
              <Sparkles className="h-4 w-4 text-black" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">1to7 Media</span>
          </Link>

          <div className="mt-20">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-5xl font-extrabold tracking-tight text-white mb-6 leading-tight drop-shadow-md"
            >
              Join the Elite <br />
              <span className="text-primary-container">
                Creator Network
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-secondary-container max-w-md drop-shadow-sm font-medium"
            >
              Create your account to start applying to premium brand campaigns, manage your collaborations, and get paid quickly.
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

      {/* Right Section (Signup Flow) */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 relative bg-background overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,189,28,0.05),transparent_70%)] lg:hidden" />

        <div className="w-full max-w-md space-y-6 relative z-10 py-10">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal-surface text-white shadow-md">
              <Sparkles className="h-5.5 w-5.5 text-primary-container" />
            </div>
            <span className="text-2xl font-bold tracking-wider text-charcoal-surface uppercase font-sans">1to7 Media</span>
          </div>

          <AnimatePresence mode="wait">

            {/* ══════════════ VIEW: DETAILS ══════════════ */}
            {view === 'details' && (
              <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Create Account</h2>
                  <p className="text-sm text-slate-500 font-medium">Join 1to7 Media to unlock brand deals.</p>
                </div>

                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <div className="relative group">
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full Name"
                        className="bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-5 rounded-md text-base font-medium focus-visible:ring-primary-container placeholder:text-slate-400 focus:bg-white transition-all"
                        required
                      />
                    </div>
                  </div>

                  {/* Email & Mobile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="relative group">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="Email Address"
                          className="bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-5 rounded-md text-base font-medium focus-visible:ring-primary-container placeholder:text-slate-400 focus:bg-white transition-all"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="relative group">
                        <Input
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="Mobile Number"
                          className="bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-5 rounded-md text-base font-medium focus-visible:ring-primary-container placeholder:text-slate-400 focus:bg-white transition-all"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <div className="relative group">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password (min 6 characters)"
                        className="bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-5 pr-12 rounded-md text-base font-medium focus-visible:ring-primary-container placeholder:text-slate-400 focus:bg-white transition-all"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Gender & Instagram */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-4 rounded-md text-base font-medium focus:ring-2 focus:ring-primary-container focus:outline-none appearance-none cursor-pointer placeholder:text-slate-400 focus:bg-white transition-all"
                        required
                      >
                        <option value="" disabled className="text-slate-400">Select Gender</option>
                        <option value="Male" className="text-slate-900">Male</option>
                        <option value="Female" className="text-slate-900">Female</option>
                        <option value="Other" className="text-slate-900">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <div className="relative group">
                        <Input
                          value={instagramUsername}
                          onChange={(e) => setInstagramUsername(e.target.value)}
                          onBlur={(e) => setInstagramUsername(extractInstagramUsername(e.target.value))}
                          placeholder="Instagram Handle (e.g. username or profile link)"
                          className="bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-5 rounded-md text-base font-medium focus-visible:ring-primary-container placeholder:text-slate-400 focus:bg-white transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-13 rounded-md bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-sm uppercase tracking-wider transition-all shadow-md active:scale-[0.98] mt-4 cursor-pointer"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send Verification Codes</>}
                  </Button>
                </form>

                {/* OR Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-slate-200/80" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-3 text-slate-500 font-bold tracking-widest">Or</span>
                  </div>
                </div>

                {/* Continue with Instagram Button */}
                <Button
                  type="button"
                  onClick={() => { window.location.href = '/api/auth/instagram/login' }}
                  disabled={loading}
                  className="w-full h-13 rounded-md bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:opacity-95 text-white font-extrabold text-sm border-0 transition-all active:scale-[0.98] cursor-pointer shadow-md"
                >
                  <div className="flex items-center justify-center gap-3">
                    <Instagram className="h-5 w-5 text-white" />
                    Sign up with Instagram
                  </div>
                </Button>

                <p className="mt-6 text-center text-sm text-slate-600 font-medium">
                  Already have an account?{' '}
                  <Link href="/login" className="font-bold text-slate-800 hover:underline transition-colors">
                    Log in here
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ══════════════ VIEW: VERIFY ALL (Mobile & Email) ══════════════ */}
            {view === 'verify-all' && (
              <motion.div key="verify-all" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <button onClick={() => setView('details')} className="flex items-center gap-1.5 text-xs text-secondary hover:text-charcoal-surface transition-colors mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to details
                </button>
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg bg-primary-container/20 border border-primary-container/30 mb-3">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-charcoal-surface">Verify Your Identity</h2>
                  <p className="text-sm text-secondary">Enter the codes sent to your mobile and email.</p>
                </div>

                <div className="space-y-5">
                  {/* Mobile OTP Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between px-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Mobile OTP
                      </label>
                      {countdown > 0 ? (
                        <button
                          type="button"
                          disabled
                          className="text-[10px] text-slate-400 bg-slate-100/90 px-2 py-0.5 rounded cursor-not-allowed select-none font-medium flex items-center gap-1 border border-slate-200"
                        >
                          <Clock className="h-2.5 w-2.5 text-slate-400" />
                          Resend in <span className="text-primary font-bold">{countdown}s</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendMobile}
                          disabled={isResendingMobile}
                          className="text-[10px] text-primary hover:underline font-bold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {isResendingMobile && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          {isResendingMobile ? 'Sending...' : 'Resend SMS'}
                        </button>
                      )}
                    </div>
                    <Input
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="bg-white border border-border-subtle text-charcoal-surface h-12 rounded-md text-center text-2xl font-mono tracking-[0.4em] focus-visible:ring-primary-container placeholder:text-secondary placeholder:tracking-[0.4em]"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyAll()}
                    />
                  </div>

                  {/* Email OTP Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between px-1">
                      <label className="text-[10px] font-bold text-secondary uppercase tracking-widest flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email OTP
                      </label>
                      {emailCountdown > 0 ? (
                        <button
                          type="button"
                          onClick={handleResendEmail}
                          className="text-[10px] text-secondary hover:text-primary transition-colors cursor-pointer"
                        >
                          Resend in <span className="text-primary font-medium">{emailCountdown}s</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendEmail}
                          disabled={isResendingEmail}
                          className="text-[10px] text-primary hover:underline font-bold transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {isResendingEmail && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                          {isResendingEmail ? 'Sending...' : 'Resend Email'}
                        </button>
                      )}
                    </div>
                    <Input
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="bg-white border border-border-subtle text-charcoal-surface h-12 rounded-md text-center text-2xl font-mono tracking-[0.4em] focus-visible:ring-primary-container placeholder:text-secondary placeholder:tracking-[0.4em]"
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyAll()}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleVerifyAll}
                  disabled={loading}
                  className="w-full h-12 rounded-md bg-[#f50057] hover:bg-[#d8004c] text-white font-extrabold text-sm uppercase tracking-wider transition-all shadow-md active:scale-[0.98] mt-4 cursor-pointer"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-4 w-4" /> Verify & Create Account</>}
                </Button>
              </motion.div>
            )}

          </AnimatePresence>

          <div id="recaptcha-container-signup"></div>
        </div>
      </div>
    </div>
  )
}
