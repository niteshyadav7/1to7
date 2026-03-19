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

const inputClasses = "bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 h-12 px-10 text-sm focus-visible:ring-purple-500 transition-all rounded-xl shadow-inner group-hover:border-white/20"

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
    <div className="flex min-h-screen bg-slate-950 font-sans selection:bg-purple-500/30">
      {/* Left Section (Branding) */}
      <div className="relative hidden lg:w-3/5 flex-col justify-between overflow-hidden p-12 lg:flex">
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
              Reset Your <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                Password
              </span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-slate-300 max-w-md"
            >
              No worries! Enter your email and we&apos;ll send you a verification code to reset your password securely.
            </motion.p>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <ul className="space-y-3 text-slate-300">
            {[
              "Secure OTP-based verification",
              "Password updated instantly",
              "Your data stays protected"
            ].map((benefit, i) => (
              <motion.li 
                key={i}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3 + (i * 0.1) }}
                className="flex items-center gap-2 text-sm font-medium"
              >
                <div className="h-5 w-5 rounded-full bg-purple-500/20 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-purple-400" />
                </div>
                {benefit}
              </motion.li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Section (Form) */}
      <div className="flex w-full items-center justify-center p-6 lg:w-2/5 relative bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent_70%)] lg:hidden" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg xl:max-w-xl space-y-8 p-8 md:p-12 relative z-10"
        >
          {/* Mobile Logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden mb-8 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">1to7 Media</span>
          </Link>

          {/* Header */}
          <div className="space-y-2 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 to-pink-500/20 border border-purple-500/20 mb-2 mx-auto">
              <ShieldCheck className="h-7 w-7 text-purple-400" />
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Forgot Password</h2>
            <p className="text-sm text-slate-400">
              {step === 'email' && "Enter your registered email to receive a reset code"}
              {step === 'otp' && "Enter the 6-digit code sent to your email"}
              {step === 'password' && "Create a new secure password for your account"}
            </p>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2">
            {steps.map((s, i) => (
              <div key={s.key} className="flex items-center gap-2">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
                  i < currentStepIndex 
                    ? 'bg-emerald-500 text-white' 
                    : i === currentStepIndex 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-lg shadow-purple-500/30' 
                      : 'bg-slate-800 text-slate-500 border border-white/10'
                }`}>
                  {i < currentStepIndex ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-12 h-0.5 rounded-full transition-all duration-300 ${
                    i < currentStepIndex ? 'bg-emerald-500' : 'bg-slate-800'
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
                  <Label htmlFor="email" className="text-slate-300 font-medium">Email Address</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="hello@creator.com"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleSendOtp()}
                      className={inputClasses}
                    />
                    <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20" />
                  </div>
                </div>

                <Button
                  onClick={handleSendOtp}
                  loading={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-base shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] group cursor-pointer"
                >
                  Send Verification Code
                  {!loading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />}
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
                <div className="p-5 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur space-y-5">
                  <div className="text-center space-y-1">
                    <p className="text-slate-300 text-sm">Code sent to</p>
                    <p className="text-purple-400 font-medium text-sm">{email}</p>
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
                        {[0,1,2,3,4,5].map((index) => (
                          <InputOTPSlot 
                            key={index} 
                            index={index} 
                            className="w-10 h-12 bg-slate-950/80 border-white/20 text-white rounded-lg text-lg font-bold shadow-inner" 
                          />
                        ))}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={() => { setStep('email'); setOtp('') }}
                      className="flex-1 h-11 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <ArrowLeft className="mr-1 h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleVerifyOtp}
                      className="flex-1 h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white font-semibold cursor-pointer"
                    >
                      Verify Code
                    </Button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSendOtp}
                  className="w-full text-center text-sm text-slate-500 hover:text-purple-400 transition-colors cursor-pointer"
                >
                  Didn&apos;t receive the code? <span className="underline">Resend</span>
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
                  <Label htmlFor="newPassword" className="text-slate-300 font-medium">New Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min 8 characters, symbols"
                      value={newPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPassword(e.target.value)}
                      className={`${inputClasses} pr-10`}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400 transition-colors z-10 cursor-pointer"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20" />
                  </div>

                  {/* Strength Meter */}
                  {newPassword.length > 0 && (
                    <div className="flex space-x-1 mt-1.5 h-1">
                      <div className={`flex-1 rounded-full ${strengthScore >= 1 ? (strengthScore >= 3 ? 'bg-emerald-500' : strengthScore === 2 ? 'bg-amber-400' : 'bg-red-400') : 'bg-white/10'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 2 ? (strengthScore >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-white/10'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 3 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      <div className={`flex-1 rounded-full ${strengthScore >= 4 ? 'bg-emerald-500' : 'bg-white/10'}`} />
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300 font-medium">Confirm Password</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                      onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && handleResetPassword()}
                      className={`${inputClasses} pr-10 ${
                        confirmPassword.length > 0 && confirmPassword === newPassword 
                          ? 'border-emerald-500/50 focus-visible:ring-emerald-500' 
                          : confirmPassword.length > 0 
                            ? 'border-red-500/50 focus-visible:ring-red-500' 
                            : ''
                      }`}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-400 transition-colors z-10 cursor-pointer"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20" />
                  </div>
                  {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                    <p className="text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>

                <Button
                  onClick={handleResetPassword}
                  loading={loading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-base shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] group cursor-pointer"
                >
                  Reset Password
                  {!loading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Back to Login */}
          <div className="text-center text-sm font-medium text-slate-400">
            Remember your password?{' '}
            <Link href="/login" className="text-purple-400 hover:text-purple-300 hover:underline transition-all cursor-pointer">
              Sign In
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
