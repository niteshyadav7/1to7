'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Building2,
  ExternalLink,
} from 'lucide-react'
import { toast } from 'sonner'

function ReviewTokenHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const batch = searchParams.get('batch')

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying')
  const [errorMsg, setErrorMsg] = useState('')
  const [brandInfo, setBrandInfo] = useState<{ brand_name?: string; full_name?: string } | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMsg('No review token was provided in the link. Please ask your 1to7 Account Manager for a valid link.')
      return
    }

    const authenticateToken = async () => {
      try {
        const res = await fetch('/api/brand/auth/verify-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, batch }),
        })

        const data = await res.json()

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'The review link has expired or is invalid.')
        }

        setBrandInfo(data.user)
        setStatus('success')
        toast.success(`Welcome, ${data.user?.brand_name || 'Brand Partner'}! Direct access granted.`)

        // Short timeout for seamless visual feedback before redirect
        const timer = setTimeout(() => {
          router.replace(data.redirectUrl || '/brand/sample-rosters')
        }, 1200)

        return () => clearTimeout(timer)
      } catch (err: any) {
        setStatus('error')
        setErrorMsg(err.message || 'Failed to authenticate this link.')
        toast.error(err.message || 'Authentication failed')
      }
    }

    authenticateToken()
  }, [token, batch, router])

  return (
    <div className="w-full max-w-[480px] bg-[#1e2224]/95 backdrop-blur-2xl border border-white/12 rounded-3xl p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] relative text-center">
      {/* 1. Header Emblem */}
      <div className="relative mb-5 flex justify-center">
        <div className="absolute inset-0 bg-[#febd1c]/20 blur-2xl rounded-full scale-125 pointer-events-none" />
        <div className="relative w-20 h-20 rounded-full overflow-hidden shadow-2xl border-2 border-white/25 flex items-center justify-center bg-gradient-to-br from-[#FFB800] via-[#FF5E36] to-[#F50057]">
          <img
            src="/logo-icon.svg"
            alt="1to7 Media"
            className="w-full h-full object-cover"
          />
        </div>
      </div>

      {/* 2. Loading State */}
      {status === 'verifying' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-[#febd1c] border border-amber-500/25 text-xs font-bold uppercase tracking-wider">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Validating Secure Token</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Connecting to Brand Workspace...
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
            Please wait a moment while 1to7 verifies your credentials and decrypts your curated campaign roster.
          </p>

          <div className="pt-2 flex justify-center">
            <div className="w-36 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-amber-400 to-[#febd1c]"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* 3. Success State */}
      {status === 'success' && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Verified 1-Tap Access</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Welcome, {brandInfo?.brand_name || 'Brand Partner'}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-sm mx-auto leading-relaxed">
            Your workspace has been authenticated. Opening your creator curation roster now...
          </p>

          <div className="pt-3">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 bg-white/5 border border-white/10 px-4 py-2 rounded-xl">
              <Loader2 className="w-4 h-4 animate-spin text-[#febd1c]" />
              <span>Redirecting to Shortlist...</span>
            </div>
          </div>
        </motion.div>
      )}

      {/* 4. Error State */}
      {status === 'error' && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-bold uppercase tracking-wider">
            <AlertCircle className="w-3.5 h-3.5 text-red-400" />
            <span>Link Inactive or Expired</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Unable to Authenticate Link
          </h2>

          <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/25 text-red-200 text-xs text-left leading-relaxed">
            {errorMsg}
          </div>

          <div className="pt-2 space-y-2.5">
            <Link
              href="/brand/login"
              className="w-full py-3 px-4 rounded-xl bg-[#febd1c] hover:bg-[#febd1c]/90 text-black font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <span>Log in with Work Email</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>

            <a
              href="mailto:support@1to7.in?subject=Brand%20Review%20Link%20Expired"
              className="w-full py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 font-semibold text-xs transition flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Contact 1to7 Account Manager</span>
            </a>
          </div>
        </motion.div>
      )}

      {/* Footer Pill */}
      <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>Enterprise 256-Bit Cryptographic Review Protocol</span>
      </div>
    </div>
  )
}

export default function BrandReviewPage() {
  return (
    <div className="w-full min-h-screen bg-[#141718] text-white flex flex-col justify-center items-center selection:bg-[#febd1c] selection:text-black font-sans relative p-4 sm:p-6">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 left-1/4 w-96 sm:w-[500px] h-72 sm:h-[350px] bg-[#febd1c]/12 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 right-1/4 w-80 sm:w-[450px] h-80 sm:h-[400px] bg-purple-600/12 rounded-full blur-[130px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <div className="relative z-10">
        <Suspense
          fallback={
            <div className="w-full max-w-[480px] bg-[#1e2224]/95 border border-white/12 rounded-3xl p-8 text-center text-slate-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#febd1c]" />
              Loading security context...
            </div>
          }
        >
          <ReviewTokenHandler />
        </Suspense>
      </div>
    </div>
  )
}
