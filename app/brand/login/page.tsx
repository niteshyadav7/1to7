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
  Instagram
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

  const fillDemoCredentials = () => {
    setEmail('demo@mamaearth.in')
    setPassword('brand123')
    setErrorMsg('')
    toast.info('Loaded demo Mamaearth credentials')
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen bg-[#181b1c] text-white flex flex-col justify-between selection:bg-[#febd1c] selection:text-black font-sans relative">
      {/* ─── AMBIENT BACKGROUND GLOWS (STRICTLY CONTAINED TO PREVENT HORIZONTAL SCROLL) ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 left-1/4 w-80 sm:w-[450px] h-60 sm:h-[300px] bg-[#febd1c]/10 rounded-full blur-[100px]" />
        <div className="absolute -bottom-20 right-1/4 w-72 sm:w-[400px] h-72 sm:h-[350px] bg-purple-600/10 rounded-full blur-[110px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff06_1px,transparent_1px)] [background-size:20px_20px] opacity-40" />
      </div>

      {/* ─── TOP BRAND HEADER ─── */}
      <header className="relative z-10 w-full px-4 sm:px-8 py-3.5 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-[#181b1c]/70">
        <div className="flex items-center gap-3">
          <Link href="/brand/login" className="flex items-center gap-2.5 group">
            <img
              src="/logo-icon.svg"
              alt="1to7 Media"
              className="w-9 h-9 object-contain drop-shadow-md group-hover:scale-105 transition-transform shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white tracking-tight text-base sm:text-lg">
                  1to7 <span className="text-[#febd1c] font-medium">Brand Portal</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#febd1c]/15 text-[#febd1c] border border-[#febd1c]/30">
                  Enterprise
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                Creator Review & Campaign Operations Suite
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-xs font-medium text-slate-300 hover:text-white transition flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-white/10 hover:bg-white/5 shrink-0"
          >
            <span>Influencer Login</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#febd1c]" />
          </Link>
        </div>
      </header>

      {/* ─── MAIN CONTENT: 2-COLUMN BALANCED DESKTOP / CENTERED MOBILE ─── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-6 sm:py-8 w-full max-w-full overflow-x-hidden">
        <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          
          {/* LEFT COLUMN: BRAND VALUE PROPOSITION (Desktop) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col space-y-4 pr-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-amber-300 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#febd1c]" />
              <span>Zero Spreadsheets • 100% Real-Time Connected</span>
            </div>

            <h1 className="text-3xl lg:text-[38px] xl:text-[42px] font-black text-white leading-[1.18] tracking-tight">
              Review, Approve & Track <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#febd1c] via-[#ffd269] to-amber-200">
                Creators in Seconds.
              </span>
            </h1>

            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg">
              Eliminate the delay of emailing Excel sheets back and forth. 1to7’s automated Brand Portal connects your shortlist directly to courier dispatches and live Reel approvals.
            </p>

            {/* 3 Value Pillars */}
            <div className="space-y-2.5 pt-1 max-w-md">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition">
                <div className="w-8 h-8 rounded-lg bg-[#febd1c]/20 text-[#febd1c] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">1-Click Creator Approval</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Review shortlisted profiles with Instagram previews, follower metrics, and sample product sizes in 1 tap.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Automated Courier Dispatch</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Approving a creator automatically queues Delhivery & Shiprocket sample dispatches with live AWB tracking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Live Reel Deliverables Hub</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Preview published Instagram Reels directly in your portal and approve content to unlock creator payouts.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LOGIN CARD */}
          <div className="w-full lg:col-span-5 max-w-sm sm:max-w-md mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-[#242728]/95 backdrop-blur-2xl border border-white/10 rounded-2xl sm:rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/60 relative"
            >
              {/* Card Header */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center mb-2.5">
                  <img
                    src="/logo-icon.svg"
                    alt="1to7 Media Badge"
                    className="w-12 h-12 object-contain drop-shadow-md hover:scale-105 transition-transform"
                  />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Brand Workspace Login
                </h2>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Enter your official work credentials to access your campaigns.
                </p>
              </div>

              {/* Error Message */}
              {errorMsg && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-200 text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="marketing@brand.com"
                      required
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#191b1c] border border-white/10 text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-[#febd1c] focus:ring-1 focus:ring-[#febd1c] transition"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
                      Password
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Encrypted Session
                    </span>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-9 pr-9 py-2.5 rounded-xl bg-[#191b1c] border border-white/10 text-white placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-[#febd1c] focus:ring-1 focus:ring-[#febd1c] transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#febd1c] to-[#f5aa00] hover:from-[#f5aa00] hover:to-[#e59b00] text-black font-extrabold text-xs sm:text-sm shadow-md shadow-amber-500/20 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Brand Workspace</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>

              {/* Quick Demo Access Box */}
              <div className="mt-5 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={fillDemoCredentials}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-[#febd1c]/15 border border-white/10 hover:border-[#febd1c]/40 text-xs font-semibold text-slate-300 hover:text-[#febd1c] transition flex items-center justify-center gap-1.5 cursor-pointer group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#febd1c] group-hover:scale-110 transition-transform" />
                  <span>Click to Load Demo Mamaearth Credentials</span>
                </button>
              </div>

              {/* Security Pill */}
              <div className="mt-4 text-center flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enterprise 256-Bit SSL • Creator PII Privacy Shield Active</span>
              </div>
            </motion.div>
          </div>

        </div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full py-3 text-center text-[11px] text-slate-500 border-t border-white/5 bg-[#181b1c]/80 backdrop-blur-xs">
        © {new Date().getFullYear()} 1to7 Media Platform. All rights reserved. • Enterprise Influencer Operations
      </footer>
    </div>
  )
}
