'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, ArrowRight, Mail, Lock, CheckCircle2, Sparkles, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

const inputClasses = "bg-white border border-border-subtle text-foreground placeholder:text-secondary h-12 px-10 text-sm focus-visible:ring-primary-container transition-all rounded-md"

type Step = 'email' | 'otp' | 'password'

export default function ForgotPasswordPage() {
  const router = useRouter()

  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  // Password strength calculator
  const calculateStrength = (pass: string) => {
    let score = 0
    if (pass.length > 7) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1
    return score
  }
  const strengthScore = calculateStrength(newPassword)

  const handleSendOtp = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')

      setStep('otp')
      toast.success('Verification code sent to your email')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit code')
      return
    }
    // Just move to the password step — OTP is verified on final submit
    setStep('password')
  }

  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (strengthScore < 3) {
      toast.error('Please choose a stronger password (use uppercase, numbers, symbols)')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset password')

      toast.success('Password reset successfully! Please log in.')
      router.push('/login')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const steps = [
    { key: 'email', label: 'Email' },
    { key: 'otp', label: 'Verify' },
    { key: 'password', label: 'Reset' },
  ]
  const currentStepIndex = steps.findIndex(s => s.key === step)

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
              Reset Your <br />
              <span className="text-primary-container">
                Password
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-secondary-container max-w-md drop-shadow-sm font-medium"
            >
              No worries! Enter your email and we&apos;ll send you a verification code to reset your password securely.
            </motion.p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <ul className="space-y-3 text-secondary-container">
            {[
              "Secure OTP-based verification",
              "Password updated instantly",
              "Your data stays protected"
            ].map((benefit, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + (i * 0.1) }}
                className="flex items-center gap-2 text-sm font-medium drop-shadow-sm"
              >
                <div className="h-5 w-5 rounded-full bg-primary-container/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-primary-container" />
                </div>
                {benefit}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Section (Form) */}
      <div className="flex w-full items-center justify-center p-6 lg:w-1/2 relative bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(254,189,28,0.05),transparent_70%)] lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md space-y-6 relative z-10"
        >
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-charcoal-surface text-white shadow-md">
              <Sparkles className="h-5.5 w-5.5 text-primary-container" />
            </div>
            <span className="text-2xl font-bold tracking-wider text-charcoal-surface uppercase font-sans">1to7 Media</span>
          </div>

          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary-container/20 border border-primary-container/30 mb-2 mx-auto">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Forgot Password</h2>
            <p className="text-sm text-slate-500 font-medium">
              {step === 'email' && "Enter your registered email to receive a reset code"}
              {step === 'otp' && "Enter the 6-digit code sent to your email"}
              {step === 'password' && "Create a new secure password for your account"}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${i < currentStepIndex
                    ? 'bg-emerald-500 text-white'
                    : i === currentStepIndex
                      ? 'bg-primary-container text-black shadow-md'
                      : 'bg-slate-100 text-secondary border border-border-subtle'
                  }`}>
                  {i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 h-0.5 rounded-full transition-all duration-300 ${i < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-200'
                    }`} />
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="space-y-2">
                  <div className="relative group">
                    <Input
                      id="email"
                      type="email"
                      placeholder="Email Address"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendOtp()}
                      className="bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-5 rounded-md text-base font-medium focus-visible:ring-primary-container placeholder:text-slate-400 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleSendOtp}
                  loading={loading}
                  className="w-full h-13 rounded-md bg-[#e91e63] hover:bg-[#d81b60] text-white font-extrabold text-sm uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Send Reset Code
                </Button>
              </motion.div>
            )}

            {step === 'otp' && (
              <motion.div
                key="otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                <div className="p-5 rounded-md border border-border-subtle bg-white/40 space-y-5">
                  <div className="text-center space-y-1">
                    <p className="text-secondary text-sm">Code sent to</p>
                    <p className="text-primary font-bold text-sm">{email}</p>
                  </div>

                  <div className="flex justify-center">
                    <InputOTP
                      className=""
                      containerClassName=""
                      maxLength={6}
                      value={otp}
                      onChange={(value: string) => setOtp(value)}
                      pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                    >
                      <InputOTPGroup className="gap-2">
                        {[0, 1, 2, 3, 4, 5].map((index) => (
                          <InputOTPSlot
                            key={index}
                            index={index}
                            className="w-10 h-12 bg-white border border-border-subtle text-charcoal-surface rounded-md text-lg font-bold focus-visible:ring-primary-container"
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => { setStep('email'); setOtp('') }}
                      className="flex-1 h-11 text-secondary hover:text-charcoal-surface cursor-pointer"
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleVerifyOtp}
                      className="flex-1 h-11 rounded-md bg-[#e91e63] hover:bg-[#d81b60] text-white font-extrabold text-sm uppercase tracking-wider transition-all shadow-md cursor-pointer"
                    >
                      Verify Code
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full text-center text-sm text-secondary hover:text-primary transition-colors cursor-pointer"
                >
                  Didn&apos;t receive the code? <span className="underline font-bold">Resend</span>
                </button>
              </motion.div>
            )}

            {step === 'password' && (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-5"
              >
                {/* New Password */}
                <div className="space-y-2">
                  <div className="relative group">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="New Password (min 8 chars)"
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                      className="bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-5 pr-12 rounded-md text-base font-medium focus-visible:ring-primary-container placeholder:text-slate-400 focus:bg-white transition-all shadow-sm"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors z-10 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Strength Meter */}
                  {newPassword.length > 0 && (
                    <div className="flex space-x-1 mt-1.5 h-1">
                      <div className={`flex-1 rounded-full ${strengthScore >= 1 ? (strengthScore >= 3 ? 'bg-emerald-500' : strengthScore === 2 ? 'bg-amber-400' : 'bg-red-400') : 'bg-slate-200'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 2 ? (strengthScore >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-slate-200'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 3 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 4 ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <div className="relative group">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleResetPassword()}
                      className={`bg-slate-50/40 border border-slate-200/80 text-slate-900 h-14 px-5 pr-12 rounded-md text-base font-medium focus-visible:ring-primary-container placeholder:text-slate-400 focus:bg-white transition-all shadow-sm ${confirmPassword.length > 0 && confirmPassword === newPassword
                          ? 'border-emerald-500/50 focus-visible:ring-emerald-500'
                          : confirmPassword.length > 0
                            ? 'border-red-500/50 focus-visible:ring-red-500'
                            : ''
                        }`}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors z-10 cursor-pointer"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>

                <Button
                  onClick={handleResetPassword}
                  loading={loading}
                  className="w-full h-13 rounded-md bg-[#e91e63] hover:bg-[#d81b60] text-white font-extrabold text-sm uppercase tracking-wider transition-all shadow-md active:scale-[0.98] cursor-pointer"
                >
                  Reset Password
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back to Login */}
          <div className="text-center text-sm font-medium text-slate-600 font-medium">
            Remember your password?{' '}
            <Link href="/login" className="text-slate-800 hover:underline transition-all cursor-pointer font-bold">
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
