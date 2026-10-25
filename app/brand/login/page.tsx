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
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

export default function BrandLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!email || !password) {
      setErrorMsg('Please enter both work email and password.')
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
        throw new Error(data.error || 'Login failed. Please check your credentials.')
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
    toast.info('Loaded demo credentials')
  }

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col justify-between selection:bg-[#febd1c] selection:text-black">
      {/* Top Navbar */}
      <header className="w-full bg-[#2d3132] border-b border-white/10 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#febd1c] flex items-center justify-center font-bold text-black text-xl shadow-md">
            1:7
          </div>
          <div>
            <span className="font-bold text-white tracking-wide text-lg sm:text-xl">
              1to7 <span className="text-[#febd1c] font-normal">Brand Portal</span>
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              Enterprise
            </span>
          </div>
        </div>

        <Link
          href="/login"
          className="text-xs sm:text-sm text-slate-300 hover:text-white transition flex items-center gap-1.5"
        >
          <span>Creator Portal</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          {/* Brand Welcome Card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200/90 p-6 sm:p-8"
          >
            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2d3132] text-[#febd1c] mb-4 shadow-sm">
                <Building2 className="w-7 h-7" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#1a1c1c] tracking-tight">
                Brand Workspace
              </h1>
              <p className="text-sm text-slate-500 mt-1.5">
                Review creators, approve deliverables, and track campaign ROI in real time.
              </p>
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs sm:text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Official Work Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#febd1c] focus:border-transparent transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                  <span className="text-xs text-slate-400">
                    Confidential
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#febd1c] focus:border-transparent transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-[#febd1c] hover:bg-[#e5a812] text-black font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Enter Brand Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Helper */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-xs font-medium text-slate-600 hover:text-black py-1.5 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Fill Demo Brand Credentials</span>
              </button>
            </div>
          </motion.div>

          {/* Security Assurance */}
          <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Encrypted B2B Brand Session • Creator Data Privacy Protected</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-400 border-t border-slate-200/60 bg-white">
        © {new Date().getFullYear()} 1to7 Media Platform. All rights reserved.
      </footer>
    </div>
  )
}
