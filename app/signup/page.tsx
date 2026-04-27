'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import { Sparkles, Loader2, Phone, Shield, CheckCircle2, ArrowRight, Lock, User as UserIcon, ArrowLeft, Eye, EyeOff, Mail, Instagram } from 'lucide-react'
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

  // Initialize invisible reCAPTCHA when needed
  const needsRecaptcha = view === 'verify-all' || view === 'details'
  useEffect(() => {
    if (needsRecaptcha && !window.recaptchaVerifierSignup) {
      try {
        window.recaptchaVerifierSignup = new RecaptchaVerifier(auth, 'recaptcha-container-signup', {
          size: 'invisible',
          callback: () => {},
          'expired-callback': () => {
            toast.error('reCAPTCHA expired. Please try again.')
            if (window.recaptchaVerifierSignup) {
              window.recaptchaVerifierSignup.clear()
              window.recaptchaVerifierSignup = null
            }
          }
        })
      } catch (e) {
        console.error('reCAPTCHA init error:', e)
      }
    }

    return () => {
      if (!needsRecaptcha && window.recaptchaVerifierSignup) {
        try { window.recaptchaVerifierSignup.clear() } catch (e) {}
        window.recaptchaVerifierSignup = null
      }
    }
  }, [needsRecaptcha])

  // ─── Step 1: Submit Details & Send OTPs ───
  const handleDetailsSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic validations
    if (!fullName || !email || !mobile || !password || !gender) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (mobile.replace(/\D/g, '').length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.')
      return
    }
    if (!email.includes('@')) {
      toast.error('Please enter a valid email address.')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.')
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

  const sendFirebaseOTP = async (mobileNum: string) => {
    if (!window.recaptchaVerifierSignup) {
      try {
        window.recaptchaVerifierSignup = new RecaptchaVerifier(auth, 'recaptcha-container-signup', {
          size: 'invisible',
          callback: () => {},
        })
      } catch (e) {
        throw new Error('Verification service not ready. Please refresh the page.')
      }
    }
    const confirmation = await signInWithPhoneNumber(auth, `+91${mobileNum}`, window.recaptchaVerifierSignup)
    confirmationRef.current = confirmation
    setCountdown(30)
  }

  const sendEmailOTP = async (emailAddr: string) => {
    const res = await fetch('/api/auth/send-email-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailAddr }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Failed to send email OTP')
    
    setEmailCountdown(60)
  }

  const handleResendMobile = async () => {
    try {
      await sendFirebaseOTP(mobile.replace(/\D/g, ''))
      toast.success(`OTP sent to +91 ${mobile}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend Mobile OTP.')
    }
  }

  const handleResendEmail = async () => {
    try {
      await sendEmailOTP(email)
      toast.success(`Verification code sent to ${email}`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to resend Email OTP.')
    }
  }

  // ─── Step 2: Verify Both OTPs & Create Account ───
  const handleVerifyAll = async () => {
    if (mobileOtp.length !== 6 || emailOtp.length !== 6) {
      toast.error('Please enter valid 6-digit OTPs for both Mobile and Email')
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
        body: JSON.stringify({ email, otp: emailOtp }),
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
        instagramUsername: instagramUsername || undefined
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
              Join the Elite <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Creator Network
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-slate-300 max-w-md"
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

      {/* Right Section (Signup Flow) */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 xl:w-2/5 relative bg-slate-950 overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent_70%)] lg:hidden" />

        <div className="w-full max-w-md space-y-6 relative z-10 py-10">
          <Link href="/" className="flex items-center gap-2 lg:hidden mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">1to7 Media</span>
          </Link>

          <AnimatePresence mode="wait">

            {/* ══════════════ VIEW: DETAILS ══════════════ */}
            {view === 'details' && (
              <motion.div key="details" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight text-white">Create Account</h2>
                  <p className="text-sm text-slate-400">Join 1to7 Media to unlock brand deals.</p>
                </div>

                <form onSubmit={handleDetailsSubmit} className="space-y-4">
                  {/* Full Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Full Name *</label>
                    <div className="relative group">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="John Doe"
                        className="bg-white/5 border-white/10 text-white h-12 pl-12 rounded-xl text-sm focus-visible:ring-purple-500 placeholder:text-slate-600"
                        required
                      />
                    </div>
                  </div>

                  {/* Email & Mobile */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Email *</label>
                      <div className="relative group">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          className="bg-white/5 border-white/10 text-white h-12 pl-12 rounded-xl text-sm focus-visible:ring-purple-500 placeholder:text-slate-600"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Mobile *</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9876543210"
                          className="bg-white/5 border-white/10 text-white h-12 pl-12 rounded-xl text-sm focus-visible:ring-purple-500 placeholder:text-slate-600"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Password *</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Create a password"
                        className="bg-white/5 border-white/10 text-white h-12 pl-12 pr-12 rounded-xl text-sm focus-visible:ring-purple-500 placeholder:text-slate-600"
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-purple-400 transition-colors cursor-pointer"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Gender & Instagram */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Gender *</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 text-white h-12 px-4 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none appearance-none cursor-pointer"
                        required
                      >
                        <option value="" disabled className="text-slate-900">Select Gender</option>
                        <option value="Male" className="text-slate-900">Male</option>
                        <option value="Female" className="text-slate-900">Female</option>
                        <option value="Other" className="text-slate-900">Other</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1">Instagram Handle</label>
                      <div className="relative group">
                        <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                        <Input
                          value={instagramUsername}
                          onChange={(e) => setInstagramUsername(e.target.value.replace('@', ''))}
                          placeholder="username"
                          className="bg-white/5 border-white/10 text-white h-12 pl-12 rounded-xl text-sm focus-visible:ring-purple-500 placeholder:text-slate-600"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-base shadow-xl shadow-purple-500/20 disabled:opacity-50 mt-4"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <>Send Verification Codes <ArrowRight className="ml-2 h-5 w-5" /></>}
                  </Button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-400">
                  Already have an account?{' '}
                  <Link href="/login" className="font-semibold text-purple-400 hover:text-purple-300 transition-colors">
                    Log in here
                  </Link>
                </p>
              </motion.div>
            )}

            {/* ══════════════ VIEW: VERIFY ALL (Mobile & Email) ══════════════ */}
            {view === 'verify-all' && (
              <motion.div key="verify-all" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <button onClick={() => setView('details')} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-white transition-colors mb-2">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to details
                </button>
                <div className="text-center space-y-2">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/20 mb-3">
                    <Shield className="h-6 w-6 text-emerald-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Verify Your Identity</h2>
                  <p className="text-sm text-slate-400">Enter the codes sent to your mobile and email.</p>
                </div>

                <div className="space-y-5">
                  {/* Mobile OTP Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between px-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Mobile OTP
                      </label>
                      {countdown > 0 ? (
                        <span className="text-[10px] text-slate-500">Resend in <span className="text-blue-400 font-medium">{countdown}s</span></span>
                      ) : (
                        <button onClick={handleResendMobile} className="text-[10px] text-blue-400 hover:text-blue-300 font-medium transition-colors">Resend SMS</button>
                      )}
                    </div>
                    <Input
                      value={mobileOtp}
                      onChange={(e) => setMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="bg-white/5 border-white/10 text-white h-14 rounded-xl text-center text-2xl font-mono tracking-[0.4em] focus-visible:ring-blue-500 placeholder:text-slate-700 placeholder:tracking-[0.4em]"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyAll()}
                    />
                  </div>

                  {/* Email OTP Input */}
                  <div className="space-y-2">
                    <div className="flex justify-between px-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                        <Mail className="h-3 w-3" /> Email OTP
                      </label>
                      {emailCountdown > 0 ? (
                        <span className="text-[10px] text-slate-500">Resend in <span className="text-emerald-400 font-medium">{emailCountdown}s</span></span>
                      ) : (
                        <button onClick={handleResendEmail} className="text-[10px] text-emerald-400 hover:text-emerald-300 font-medium transition-colors">Resend Email</button>
                      )}
                    </div>
                    <Input
                      value={emailOtp}
                      onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="bg-white/5 border-white/10 text-white h-14 rounded-xl text-center text-2xl font-mono tracking-[0.4em] focus-visible:ring-emerald-500 placeholder:text-slate-700 placeholder:tracking-[0.4em]"
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyAll()}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleVerifyAll}
                  disabled={loading || mobileOtp.length !== 6 || emailOtp.length !== 6}
                  className="w-full h-14 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-base shadow-xl shadow-emerald-500/20 disabled:opacity-50 mt-4"
                >
                  {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><CheckCircle2 className="mr-2 h-5 w-5" /> Verify & Create Account</>}
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
