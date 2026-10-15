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
import { initMsg91Widget, sendMsg91Otp, verifyMsg91Otp, retryMsg91Otp } from '@/lib/utils/msg91-otp'

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
  const [otpProvider, setOtpProvider] = useState<'msg91' | 'firebase'>('msg91')

  // Inline verification state (when credentials/social account is unverified)
  const [inlineVerification, setInlineVerification] = useState<{
    required: boolean
    needsMobile: boolean
    needsEmail: boolean
    mobile: string
    email: string
    mobileVerified: boolean
    emailVerified: boolean
    targetFlow: 'password' | 'google' | 'instagram' | null
  }>({
    required: false,
    needsMobile: false,
    needsEmail: false,
    mobile: '',
    email: '',
    mobileVerified: false,
    emailVerified: false,
    targetFlow: null,
  })

  const [inlineMobileOtp, setInlineMobileOtp] = useState('')
  const [isVerifyingMobile, setIsVerifyingMobile] = useState(false)
  const [inlineEmailOtp, setInlineEmailOtp] = useState('')
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false)
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false)
  const [inlineEmailOtpSent, setInlineEmailOtpSent] = useState(false)

  const [loading, setLoading] = useState(false)
  const confirmationRef = useRef<any>(null)
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

  const getRedirectUrl = () => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const redirect = params.get('redirect')
      if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
        return redirect
      }
    }
    return '/dashboard'
  }

  // Check for error and query params (e.g. mobile prefill or OAuth error)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const err = params.get('error')
      if (err) {
        toast.error(decodeURIComponent(err), { duration: 6000 })
        window.history.replaceState({}, '', window.location.pathname)
      }
      const mobileParam = params.get('mobile')
      if (mobileParam) {
        const clean = mobileParam.replace(/\D/g, '').slice(0, 10)
        if (clean) {
          setMobile(clean)
          setIdentifier(clean)
        }
      }
    }
  }, [])

  // Initialize MSG91 OTP Widget SDK on mount
  useEffect(() => {
    initMsg91Widget().catch((e) => console.warn('[MSG91] Init notice:', e))
  }, [])

  // Helper to initialize reCAPTCHA for Firebase fallback
  const getOrCreateRecaptchaVerifier = () => {
    if (typeof window === 'undefined') return null
    if (window.recaptchaVerifier) return window.recaptchaVerifier
    try {
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
    } catch (e) {
      console.error('[Firebase Fallback] reCAPTCHA init error:', e)
      return null
    }
  }

  // ─── Helper: send Mobile OTP via MSG91 with Firebase Fallback ───
  const sendFirebaseOTP = async (mobileNum: string, isResend = false): Promise<boolean> => {
    setIsSendingOtp(true)
    const toastId = toast.loading(isResend ? 'Resending OTP...' : 'Sending OTP...')
    
    // 1. Primary: Try MSG91 first
    try {
      if (isResend && otpProvider === 'msg91') {
        await retryMsg91Otp()
      } else {
        await sendMsg91Otp(mobileNum)
        setOtpProvider('msg91')
      }
      if (!isResend) {
        setCountdown(45)
      }
      toast.success(
        isResend ? `New OTP sent to +91 ${mobileNum}` : `OTP sent to +91 ${mobileNum} via WhatsApp/SMS`,
        { id: toastId }
      )
      return true
    } catch (msg91Err: any) {
      console.warn('[OTP] MSG91 failed, triggering fallback to Firebase Phone Auth:', msg91Err)

      // 2. Fallback: Firebase Phone Auth
      try {
        const verifier = getOrCreateRecaptchaVerifier()
        if (!verifier) throw new Error('Verification fallback service unavailable')
        const confirmation = await signInWithPhoneNumber(auth, `+91${mobileNum}`, verifier)
        confirmationRef.current = confirmation
        setOtpProvider('firebase')
        if (!isResend) {
          setCountdown(45)
        }
        toast.success(
          isResend ? `New OTP sent via SMS to +91 ${mobileNum}` : `OTP sent via SMS to +91 ${mobileNum}`,
          { id: toastId }
        )
        return true
      } catch (fbErr: any) {
        console.error('[OTP] Both MSG91 and Firebase failed:', fbErr)
        toast.error(fbErr?.message || msg91Err?.message || 'Failed to send OTP. Please try again.', { id: toastId })
        return false
      }
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
    setLoading(true)
    try {
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
      if (data.requiresVerification || data.requiresMobileVerification || data.requiresEmailVerification) {
        toast.error('Verification still pending. Please complete both OTPs.')
        return
      }
      login(data.user)
      toast.success('Welcome back!')
      window.location.href = getRedirectUrl()
    } catch (err: any) {
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  // ─── Helper: verify inline Mobile OTP ───
  const handleVerifyInlineMobileOtp = async () => {
    const cleanOtp = inlineMobileOtp.trim()
    if (!cleanOtp || cleanOtp.length < 4 || cleanOtp.length > 6) {
      toast.error('Please enter a valid OTP code')
      return
    }

    setIsVerifyingMobile(true)
    try {
      if (otpProvider === 'msg91') {
        const verifyRes = await verifyMsg91Otp(cleanOtp)
        const tokenStr = typeof verifyRes === 'string' ? verifyRes : verifyRes?.token || verifyRes?.message
        if (tokenStr && typeof tokenStr === 'string' && tokenStr.length > 20) {
          await fetch('/api/auth/msg91/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: tokenStr, mobile: inlineVerification.mobile }),
          }).catch(console.warn)
        }
      } else {
        if (!confirmationRef.current) throw new Error('Session expired. Please resend OTP.')
        await confirmationRef.current.confirm(cleanOtp)
      }

      const cleanNum = inlineVerification.mobile.replace(/\D/g, '')
      await markMobileVerified(cleanNum)
      toast.success('Mobile verified!')

      const nextState = { ...inlineVerification, mobileVerified: true }
      setInlineVerification(nextState)

      // If email is also verified or not needed, complete login immediately!
      if (!nextState.needsEmail || nextState.emailVerified) {
        if (nextState.targetFlow === 'password') {
          await completePasswordLogin()
        } else if (nextState.targetFlow === 'google') {
          setMobile(cleanNum)
          handleGooglePopup(cleanNum)
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid Mobile OTP. Please try again.')
    } finally {
      setIsVerifyingMobile(false)
    }
  }

  // ─── Helper: send inline Email OTP ───
  const handleSendInlineEmailOtp = async () => {
    const cleanEmail = inlineVerification.email.trim().toLowerCase()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      toast.error('Valid email address not found')
      return
    }

    setIsSendingEmailOtp(true)
    try {
      const res = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, type: 'login' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send verification email')

      setInlineEmailOtpSent(true)
      setEmailCountdown(45)
      toast.success(`Verification code sent to ${cleanEmail}!`)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification email')
    } finally {
      setIsSendingEmailOtp(false)
    }
  }

  // ─── Helper: verify inline Email OTP ───
  const handleVerifyInlineEmailOtp = async () => {
    const cleanEmail = inlineVerification.email.trim().toLowerCase()
    const cleanCode = inlineEmailOtp.trim()
    if (!cleanCode || cleanCode.length !== 6) {
      toast.error('Please enter the 6-digit Email OTP')
      return
    }

    setIsVerifyingEmail(true)
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          otp: cleanCode,
          type: 'verify',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid or expired Email OTP')

      toast.success('Email verified!')
      const nextState = { ...inlineVerification, emailVerified: true }
      setInlineVerification(nextState)

      // If mobile is also verified or not needed, complete login immediately!
      if (!nextState.needsMobile || nextState.mobileVerified) {
        if (nextState.targetFlow === 'password') {
          await completePasswordLogin()
        } else if (nextState.targetFlow === 'google') {
          setMobile(inlineVerification.mobile)
          handleGooglePopup(inlineVerification.mobile)
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid Email OTP. Please check and try again.')
    } finally {
      setIsVerifyingEmail(false)
    }
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
      window.location.href = getRedirectUrl()
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

      if (data.requiresVerification || data.requiresMobileVerification || data.requiresEmailVerification) {
        const needsMob = !!(data.needsMobile ?? data.requiresMobileVerification)
        const needsEm = !!(data.needsEmail ?? data.requiresEmailVerification)
        const userMobile = data.mobile || (identifier.replace(/\D/g, '').length === 10 ? identifier.replace(/\D/g, '') : '')
        const userEmail = data.email || (identifier.includes('@') ? identifier : '')

        setMobile(userMobile)
        setInlineVerification({
          required: true,
          needsMobile: needsMob,
          needsEmail: needsEm,
          mobile: userMobile,
          email: userEmail,
          mobileVerified: !needsMob,
          emailVerified: !needsEm,
          targetFlow: 'password',
        })

        toast.info('Please verify your unverified account details below to continue.')

        if (needsMob && userMobile) {
          sendFirebaseOTP(userMobile).catch(console.warn)
        }
        if (needsEm && userEmail) {
          fetch('/api/auth/send-email-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: userEmail, type: 'login' }),
          }).then((r) => {
            if (r.ok) {
              setInlineEmailOtpSent(true)
              setEmailCountdown(45)
            }
          }).catch(console.warn)
        }
        setLoading(false)
        return
      }

      // Mobile & email are already verified — login complete directly!
      login(data.user)
      toast.success('Welcome back!')
      window.location.href = getRedirectUrl()
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // ═══════════════════════════════════════════
  //  FLOW 2: GOOGLE LOGIN
  // ═══════════════════════════════════════════
  const handleGoogleStart = async () => {
    setPendingFlow('google')

    // Check if user already entered a 10-digit mobile in identifier input
    const cleanMobile = identifier.replace(/\D/g, '').slice(0, 10)
    if (cleanMobile.length === 10) {
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

        if (data.isVerified && data.isMobileVerified && data.isEmailVerified) {
          // Already verified! Direct Google popup!
          setMobile(cleanMobile)
          setLoading(false)
          handleGooglePopup(cleanMobile)
          return
        }

        // Needs verification! Show inline!
        setMobile(cleanMobile)
        const needsMob = !data.isMobileVerified
        const needsEm = !data.isEmailVerified

        setInlineVerification({
          required: true,
          needsMobile: needsMob,
          needsEmail: needsEm,
          mobile: cleanMobile,
          email: data.email || '',
          mobileVerified: !needsMob,
          emailVerified: !needsEm,
          targetFlow: 'google',
        })

        toast.info('Please verify your account details below to continue with Google.')

        if (needsMob) {
          sendFirebaseOTP(cleanMobile).catch(console.warn)
        }
        if (needsEm && data.email) {
          fetch('/api/auth/send-email-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: data.email, type: 'login' }),
          }).then((r) => {
            if (r.ok) {
              setInlineEmailOtpSent(true)
              setEmailCountdown(45)
            }
          }).catch(console.warn)
        }
        setLoading(false)
        return
      } catch (err: any) {
        toast.error(err.message || 'Failed to check mobile')
        setLoading(false)
      }
    } else {
      setMobile('')
      setView('verify-mobile')
    }
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

      if (data.isVerified && data.isMobileVerified && data.isEmailVerified) {
        // Already verified — go straight to Social popup
        setMaskedEmail(data.maskedEmail || '')
        if (pendingFlow === 'instagram') {
          setView('instagram-ready')
        } else {
          handleGooglePopup(cleanMobile)
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

  const handleGooglePopup = async (overrideMobile?: string) => {
    setLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const firebaseUser = result.user
      if (!firebaseUser.email) {
        toast.error('Could not get email from Google. Please try again.')
        setLoading(false)
        return
      }

      const activeMobile = overrideMobile || mobile || inlineVerification.mobile
      const cleanMobile = activeMobile ? activeMobile.replace(/\D/g, '') : ''
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
      window.location.href = getRedirectUrl()
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

  const handleInstagramRedirect = async () => {
    const cleanMobile = mobile.replace(/\D/g, '')
    if (!cleanMobile || cleanMobile.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/instagram/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: cleanMobile }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Failed to start Instagram Sign-In')
        setLoading(false)
        return
      }

      window.location.href = data.redirectUrl || '/api/auth/instagram/login'
    } catch (err: any) {
      toast.error(err.message || 'Failed to start Instagram Sign-In')
      setLoading(false)
    }
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
      toast.error('Please enter the OTP code')
      return
    }
    if (otp.length < 4 || otp.length > 6) {
      toast.error('Please enter a valid OTP code')
      return
    }

    setLoading(true)
    try {
      if (otpProvider === 'msg91') {
        // 1. Verify via MSG91 Custom UI method
        const verifyRes = await verifyMsg91Otp(otp)

        // Optionally verify access token server-side if returned
        const tokenStr = typeof verifyRes === 'string' ? verifyRes : verifyRes?.token || verifyRes?.message
        if (tokenStr && typeof tokenStr === 'string' && tokenStr.length > 20) {
          await fetch('/api/auth/msg91/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accessToken: tokenStr, mobile }),
          }).catch((e) => console.warn('[MSG91] Server verify notice:', e))
        }
      } else {
        // 2. Verify via Firebase confirmation
        if (!confirmationRef.current) throw new Error('Session expired. Please resend OTP.')
        await confirmationRef.current.confirm(otp)
      }

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
        window.location.href = getRedirectUrl()
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

                      {/* INLINE VERIFICATION PANEL (Only appears if unverified) */}
                      {inlineVerification.required && (
                        <div className="rounded-xl border border-amber-300 bg-amber-50/80 p-4 space-y-3.5 shadow-sm text-left">
                          <div className="flex items-center justify-between pb-2 border-b border-amber-200">
                            <div className="flex items-center gap-2">
                              <Shield className="h-4 w-4 text-amber-600" />
                              <span className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                                Account Verification
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setInlineVerification((prev) => ({ ...prev, required: false }))}
                              className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Mobile Verification Block */}
                          {inlineVerification.needsMobile && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 text-slate-600" /> +91 {inlineVerification.mobile}
                                </span>
                                {inlineVerification.mobileVerified ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                    Mobile Unverified
                                  </span>
                                )}
                              </div>

                              {!inlineVerification.mobileVerified && (
                                <div className="space-y-1.5 pt-1">
                                  <div className="flex gap-2">
                                    <Input
                                      value={inlineMobileOtp}
                                      onChange={(e) => setInlineMobileOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                      placeholder="Mobile OTP"
                                      maxLength={6}
                                      className="bg-white border-slate-300 text-slate-900 h-10 rounded-lg text-center font-mono tracking-widest text-sm focus-visible:ring-amber-500"
                                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyInlineMobileOtp()}
                                    />
                                    <Button
                                      type="button"
                                      onClick={handleVerifyInlineMobileOtp}
                                      disabled={isVerifyingMobile || inlineMobileOtp.length < 4}
                                      className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer shadow-sm disabled:opacity-50"
                                    >
                                      {isVerifyingMobile ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
                                    </Button>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] px-1 text-slate-500">
                                    <span>Sent via WhatsApp/SMS</span>
                                    {countdown > 0 ? (
                                      <span className="text-slate-400 font-medium">Resend in {countdown}s</span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => sendFirebaseOTP(inlineVerification.mobile, true)}
                                        disabled={isSendingOtp}
                                        className="font-bold text-amber-700 hover:underline cursor-pointer"
                                      >
                                        {isSendingOtp ? 'Sending...' : 'Resend OTP'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Email Verification Block */}
                          {inlineVerification.needsEmail && (
                            <div className="space-y-2 pt-2 border-t border-amber-200/60">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate max-w-[200px]">
                                  <Mail className="h-3.5 w-3.5 text-slate-600 shrink-0" /> {inlineVerification.email}
                                </span>
                                {inlineVerification.emailVerified ? (
                                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                                    <CheckCircle2 className="h-3 w-3" /> Verified
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                    Email Unverified
                                  </span>
                                )}
                              </div>

                              {!inlineVerification.emailVerified && (
                                <div className="space-y-1.5 pt-1">
                                  {!inlineEmailOtpSent ? (
                                    <Button
                                      type="button"
                                      onClick={handleSendInlineEmailOtp}
                                      disabled={isSendingEmailOtp}
                                      className="w-full h-9 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs cursor-pointer shadow-sm disabled:opacity-50"
                                    >
                                      {isSendingEmailOtp ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Send Email Verification Code'}
                                    </Button>
                                  ) : (
                                    <>
                                      <div className="flex gap-2">
                                        <Input
                                          value={inlineEmailOtp}
                                          onChange={(e) => setInlineEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                          placeholder="Email OTP"
                                          maxLength={6}
                                          className="bg-white border-slate-300 text-slate-900 h-10 rounded-lg text-center font-mono tracking-widest text-sm focus-visible:ring-amber-500"
                                          onKeyDown={(e) => e.key === 'Enter' && handleVerifyInlineEmailOtp()}
                                        />
                                        <Button
                                          type="button"
                                          onClick={handleVerifyInlineEmailOtp}
                                          disabled={isVerifyingEmail || inlineEmailOtp.length !== 6}
                                          className="h-10 px-4 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs cursor-pointer shadow-sm disabled:opacity-50"
                                        >
                                          {isVerifyingEmail ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
                                        </Button>
                                      </div>
                                      <div className="flex justify-between items-center text-[10px] px-1 text-slate-500">
                                        <span>Check inbox & spam folder</span>
                                        {emailCountdown > 0 ? (
                                          <span className="text-slate-400 font-medium">Resend in {emailCountdown}s</span>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={handleSendInlineEmailOtp}
                                            disabled={isSendingEmailOtp}
                                            className="font-bold text-amber-700 hover:underline cursor-pointer"
                                          >
                                            {isSendingEmailOtp ? 'Sending...' : 'Resend Email OTP'}
                                          </button>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

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
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-700 hover:via-pink-700 hover:to-amber-600 text-white font-extrabold text-sm border-0 transition-all active:scale-[0.98] cursor-pointer shadow-sm mt-3 uppercase tracking-wider relative overflow-hidden group"
                >
                  <div className="flex items-center justify-center gap-2.5">
                    <Instagram className="h-5 w-5 text-white" />
                    <span>CONTINUE WITH INSTAGRAM</span>
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
                  onClick={() => handleGooglePopup()}
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
                  className="w-full h-13 rounded-xl bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-700 hover:via-pink-700 hover:to-amber-600 text-white font-extrabold text-sm border-0 transition-all active:scale-[0.98] cursor-pointer shadow-sm uppercase tracking-wider relative overflow-hidden group"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <div className="flex items-center justify-center gap-2.5">
                      <Instagram className="h-5 w-5 text-white" />
                      <span>AUTHORIZE WITH INSTAGRAM</span>
                    </div>
                  )}
                </Button>
                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={goBack}
                    className="text-xs text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    Change Number
                  </button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

          <div id="recaptcha-container"></div>

          {/* Footer Privacy Link & Report Issue */}
          <div className="mt-8 text-center flex items-center justify-center gap-2.5 text-xs text-secondary">
            <Link href="/privacy" className="text-xs text-secondary hover:text-charcoal-surface font-medium underline transition-colors">
              Privacy Policy & Data Terms
            </Link>
            <span className="text-secondary/40 select-none">•</span>
            <Link
              href="/report-issue?source=login"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-secondary hover:text-charcoal-surface font-medium underline transition-colors cursor-pointer"
            >
              Facing Issues? Report Here
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
