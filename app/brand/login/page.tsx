'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  AlertCircle,
  Eye,
  EyeOff,
  Zap,
  Package,
  TrendingUp,
} from 'lucide-react'
import { toast } from 'sonner'

export default function BrandLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Please enter both your official email and password.')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/brand/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please verify your credentials.')
      }

      toast.success(`Welcome back, ${data.user?.full_name || 'Brand Partner'}!`)
      router.push('/brand/dashboard')
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong. Please try again.')
      toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#141718] text-white flex flex-col justify-center items-center selection:bg-[#febd1c] selection:text-black font-sans relative p-4 sm:p-6 lg:p-10">
      {/* ─── AMBIENT BACKGROUND GLOWS (STRICTLY CONTAINED TO PREVENT HORIZONTAL SCROLL) ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-96 sm:w-[500px] h-72 sm:h-[350px] bg-[#febd1c]/12 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 right-1/4 w-80 sm:w-[450px] h-80 sm:h-[400px] bg-purple-600/12 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      {/* ─── MAIN CONTENT CONTAINER (2-Column Balanced Desktop / Centered Mobile) ─── */}
      <div className="relative z-10 w-full max-w-[1200px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center my-auto">
        
        {/* LEFT COLUMN: BRAND VALUE PROPOSITION (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-6 flex-col space-y-5 max-w-lg">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-amber-300 w-fit backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-[#febd1c]" />
            <span>Zero Spreadsheets • 100% Real-Time Connected</span>
          </div>

          <h1 className="text-3xl lg:text-4xl xl:text-[46px] font-black text-white leading-[1.16] tracking-tight">
            Review, Approve & Track <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#febd1c] via-[#ffd269] to-amber-200">
              Creators in Seconds.
            </span>
          </h1>

          <p className="text-slate-300 text-sm leading-relaxed max-w-md">
            Eliminate the delay of emailing Excel sheets back and forth. 1to7’s automated Brand Portal connects your shortlist directly to courier dispatches and live Reel approvals.
          </p>

          {/* 3 Value Pillars */}
          <div className="space-y-3 pt-2 max-w-md">
            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition backdrop-blur-xs">
              <div className="w-9 h-9 rounded-xl bg-[#febd1c]/20 text-[#febd1c] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">1-Click Creator Approval</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  Review shortlisted profiles with Instagram previews, follower metrics, and commercial quotations in 1 tap.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition backdrop-blur-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Automated Courier Dispatch</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  Approving a creator automatically queues Delhivery & Shiprocket sample dispatches with live AWB tracking.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition backdrop-blur-xs">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Live Reel Deliverables Hub</h4>
                <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                  Preview published Instagram Reels directly in your portal and approve content to unlock creator payouts.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ENLARGED, PREMIUM LOGIN CARD */}
        <div className="w-full lg:col-span-6 flex justify-center lg:justify-end">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-[460px] bg-[#1e2224]/95 backdrop-blur-2xl border border-white/12 rounded-3xl p-7 sm:p-9 md:p-10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative"
          >
            {/* Card Header */}
            <div className="flex flex-col items-center justify-center text-center mb-6 sm:mb-7">
              {/* Logo Emblem with Ambient Back-Glow */}
              <div className="relative mb-3.5">
                <div className="absolute inset-0 bg-[#febd1c]/25 blur-2xl rounded-full scale-125 pointer-events-none" />
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl sm:rounded-3xl bg-[#141718] border border-white/10 shadow-2xl flex items-center justify-center p-3 hover:scale-105 transition-transform">
                  <img
                    src="/logo-icon.svg"
                    alt="1to7 Media"
                    className="w-full h-full object-contain drop-shadow-md"
                  />
                </div>
              </div>

              {/* Centered Purpose Pill Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#febd1c]/10 text-[#febd1c] border border-[#febd1c]/25 text-[11px] font-bold uppercase tracking-wider mb-2.5 shadow-xs">
                <Building2 className="w-3.5 h-3.5" />
                <span>Enterprise Brand Portal</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Brand Workspace Login
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xs leading-relaxed">
                Sign in with your official brand credentials to manage campaigns & reviews.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Work Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marketing@brand.com"
                    required
                    className="w-full pl-11 pr-4 py-3 sm:py-3.5 rounded-2xl bg-[#141718] border border-white/10 text-white placeholder:text-slate-500 text-sm sm:text-base focus:outline-none focus:border-[#febd1c] focus:ring-1 focus:ring-[#febd1c] transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                    Password
                  </label>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Encrypted Session
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-11 pr-11 py-3 sm:py-3.5 rounded-2xl bg-[#141718] border border-white/10 text-white placeholder:text-slate-500 text-sm sm:text-base focus:outline-none focus:border-[#febd1c] focus:ring-1 focus:ring-[#febd1c] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 sm:py-4 px-5 rounded-2xl bg-gradient-to-r from-[#febd1c] via-[#ffc634] to-[#f5aa00] hover:from-[#f5aa00] hover:to-[#e59b00] text-black font-extrabold text-sm sm:text-base shadow-lg shadow-amber-500/25 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Authenticating Workspace...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Brand Workspace</span>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>

            {/* Security Pill */}
            <div className="mt-5 text-center flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Enterprise 256-Bit SSL • Creator PII Privacy Shield Active</span>
            </div>

            {/* Subtle portal navigation link */}
            <div className="mt-4 pt-4 border-t border-white/5 text-center">
              <Link
                href="/login"
                className="text-xs text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
              >
                <span>Influencer / Creator Login</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#febd1c]" />
              </Link>
            </div>
          </motion.div>
        </div>

      </div>
    </div>
  )
}
