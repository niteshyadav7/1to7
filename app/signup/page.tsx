'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2, Instagram, Sparkles, Mail, Lock, User, Phone, Eye, EyeOff } from 'lucide-react'
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { z } from 'zod'

// Shared input styling
const inputClasses = "bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 h-10 px-9 text-sm focus-visible:ring-purple-500 transition-all rounded-lg shadow-inner group-hover:border-white/20"

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultMobile = searchParams.get('mobile') || ''

  const [formData, setFormData] = useState({
    fullName: '',
    mobile: defaultMobile,
    email: '',
    password: '',
    instagramUsername: '',
    gender: ''
  })

  // Auth / UI States
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [isEmailVerified, setIsEmailVerified] = useState(false)
  const [emailOtp, setEmailOtp] = useState("")
  const [otpLoading, setOtpLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  
  const { login } = useAuth()

  // Password strength calculator
  const calculateStrength = (pass: string) => {
    let score = 0
    if (pass.length > 7) score += 1
    if (/[A-Z]/.test(pass)) score += 1
    if (/[0-9]/.test(pass)) score += 1
    if (/[^A-Za-z0-9]/.test(pass)) score += 1
    return score
  }
  const strengthScore = calculateStrength(formData.password)

  // Handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleGenderChange = (value: string) => {
    setFormData(prev => ({ ...prev, gender: value }))
  }

  const sendEmailOtp = async () => {
    if (!formData.email) {
      toast.error('Please enter your email first')
      return
    }
    
    // Basic email validation
    const emailSchema = z.string().email()
    if (!emailSchema.safeParse(formData.email).success) {
       toast.error('Please enter a valid email address')
       return
    }

    setOtpLoading(true)
    try {
      const res = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')
      
      setOtpSent(true)
      toast.success('Verification code sent to email')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  const verifyEmailOtp = async () => {
    if (emailOtp.length !== 6) {
      toast.error('Please enter 6-digit OTP')
      return
    }
    
    setOtpLoading(true)
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp: emailOtp })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid OTP')
      
      setIsEmailVerified(true)
      toast.success('Email verified successfully!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setOtpLoading(false)
    }
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Front-end validation
    if (!formData.fullName.trim()) {
      toast.error('Please enter your full name')
      return
    }

    if (formData.mobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number')
      return
    }

    if (!isEmailVerified) {
      toast.error('Please verify your email address to continue')
      return
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    if (strengthScore < 3) {
      toast.error('Please choose a stronger password (use numbers and symbols)')
      return
    }

    if (!formData.gender) {
      toast.error('Please select your gender')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Signup failed')

      login(data.user)
      toast.success('Account created successfully!')
      window.location.href = '/dashboard'
    } catch (err: any) {
      toast.error(err.message || 'Error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSignup} className="space-y-3 md:space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {/* Full Name */}
        <div className="space-y-2">
          <Label htmlFor="fullName" className="text-slate-300 font-medium text-sm">Full Name</Label>
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
            <Input
              id="fullName"
              name="fullName"
              placeholder="Alex Walker"
              required
              value={formData.fullName}
              onChange={handleInputChange}
              className={inputClasses}
            />
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20" />
          </div>
        </div>

        {/* Mobile Number */}
        <div className="space-y-2">
          <Label htmlFor="mobile" className="text-slate-300 font-medium text-sm">Mobile Number</Label>
          <div className="relative group">
             <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
            <Input
              id="mobile"
              name="mobile"
              placeholder="9990000000"
              required
              value={formData.mobile}
              onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
              className={inputClasses}
            />
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20" />
          </div>
        </div>
      </div>

      {/* Email Verification Section */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-slate-300 font-medium text-sm flex justify-between">
          <span>Email Address</span>
          {isEmailVerified && <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/> Verified</span>}
        </Label>
        <div className="flex gap-2 relative">
          <div className="relative group flex-1">
             <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="hello@creator.com"
              required
              disabled={isEmailVerified || otpSent}
              value={formData.email}
              onChange={handleInputChange}
              className={`${inputClasses} ${isEmailVerified ? 'border-emerald-500/50 focus-visible:ring-emerald-500 bg-emerald-500/5 text-emerald-100' : ''}`}
            />
             <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20" />
          </div>
          
          <AnimatePresence>
            {!isEmailVerified && !otpSent && (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}>
                <Button 
                  type="button" 
                  onClick={sendEmailOtp} 
                  loading={otpLoading}
                  className="h-10 px-5 text-sm rounded-lg bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 text-purple-300 font-medium transition-colors cursor-pointer"
                >
                  Verify
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* OTP Input UI */}
        <AnimatePresence>
          {otpSent && !isEmailVerified && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-4 overflow-hidden"
            >
              <div className="p-4 rounded-xl border border-white/10 bg-slate-900/50 backdrop-blur space-y-4">
                <Label className="text-slate-300 text-sm text-center block">Enter the 6-digit code sent to your email</Label>
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={emailOtp}
                    onChange={(value) => setEmailOtp(value)}
                    pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                  >
                    <InputOTPGroup className="gap-2">
                       {[0,1,2,3,4,5].map((index) => (
                           <InputOTPSlot 
                              key={index} 
                              index={index} 
                              className="w-9 h-10 md:w-10 md:h-10 bg-slate-950/80 border-white/20 text-white rounded-md text-base font-bold shadow-inner" 
                            />
                       ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                <div className="flex justify-center gap-2 pt-2">
                   <Button 
                     type="button" 
                     variant="ghost" 
                     onClick={() => { setOtpSent(false); setEmailOtp(""); }} 
                     className="text-slate-400 hover:text-white"
                   >
                     Cancel
                   </Button>
                   <Button 
                     type="button" 
                     onClick={verifyEmailOtp} 
                     loading={otpLoading} 
                     className="bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-white"
                   >
                     Confirm OTP
                   </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Password with Strength Meter */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-slate-300 font-medium text-sm">Secure Password</Label>
        <div className="relative group">
           <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="Min 8 characters, symbols"
            required
            value={formData.password}
            onChange={handleInputChange}
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
        
        {/* Strength Meter Bar */}
        {formData.password.length > 0 && (
          <div className="flex space-x-1 mt-1.5 h-1">
            <div className={`flex-1 rounded-full ${strengthScore >= 1 ? (strengthScore >= 3 ? 'bg-emerald-500' : strengthScore === 2 ? 'bg-amber-400' : 'bg-red-400') : 'bg-white/10'}`} />
            <div className={`flex-1 rounded-full ${strengthScore >= 2 ? (strengthScore >= 3 ? 'bg-emerald-500' : 'bg-amber-400') : 'bg-white/10'}`} />
            <div className={`flex-1 rounded-full ${strengthScore >= 3 ? 'bg-emerald-500' : 'bg-white/10'}`} />
            <div className={`flex-1 rounded-full ${strengthScore >= 4 ? 'bg-emerald-500' : 'bg-white/10'}`} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Instagram */}
        <div className="space-y-2">
          <Label htmlFor="instagramUsername" className="text-slate-300 font-medium text-sm">Instagram</Label>
          <div className="relative group">
            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-pink-500 z-10" />
            <Input
              id="instagramUsername"
              name="instagramUsername"
              placeholder="@username"
              value={formData.instagramUsername}
              onChange={handleInputChange}
              className={inputClasses}
            />
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20" />
          </div>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-slate-300 font-medium text-sm">Gender</Label>
          <div className="relative group">
            <Select value={formData.gender} onValueChange={handleGenderChange} required>
              <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-10 text-sm rounded-lg focus:ring-purple-500 transition-all shadow-inner group-hover:border-white/20">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl shadow-2xl">
                <SelectItem value="Male" className="focus:bg-purple-500/20 focus:text-purple-300 cursor-pointer transition-colors">Male</SelectItem>
                <SelectItem value="Female" className="focus:bg-purple-500/20 focus:text-purple-300 cursor-pointer transition-colors">Female</SelectItem>
                <SelectItem value="Other" className="focus:bg-purple-500/20 focus:text-purple-300 cursor-pointer transition-colors">Other</SelectItem>
              </SelectContent>
            </Select>
            <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20 pointer-events-none" />
          </div>
        </div>
      </div>

      <Button 
        type="submit" 
        disabled={!isEmailVerified || loading}
        className="w-full h-11 rounded-lg bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] mt-4 group disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer" 
        loading={loading}
      >
        Create My Creator Account
        {!loading && <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />}
      </Button>

      <div className="mt-6 text-center text-sm font-medium text-slate-400">
        Already have an account?{' '}
        <Link href="/login" className="text-purple-400 hover:text-purple-300 hover:underline transition-all cursor-pointer">
          Sign In
        </Link>
      </div>
    </form>
  )
}

export default function SignupPage() {
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
          
          <ul className="space-y-3 text-slate-300">
            {[
              "High-paying brand collaborations",
              "Fast & secure payouts",
              "Exclusive creator deals"
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

      {/* Right Section (Signup Form) */}
      <div className="flex w-full min-h-screen items-center justify-center p-4 lg:w-2/5 relative bg-slate-950 overflow-y-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent_70%)] lg:hidden" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-xl xl:max-w-2xl space-y-4 p-8 md:p-12 relative z-10"
        >
          {/* Mobile Logo */}
          <Link href="/" className="flex items-center gap-2 lg:hidden mb-4 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-pink-500 shadow-xl">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">1to7 Media</span>
          </Link>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Create Account</h2>
            <p className="text-sm text-slate-400">
              Join the premium platform for top influencers
            </p>
          </div>

          <Suspense fallback={<div className="h-64 animate-pulse bg-slate-800/50 rounded-xl"></div>}>
             <SignupForm />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}
