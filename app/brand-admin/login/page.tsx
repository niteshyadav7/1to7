'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Lock,
  Mail,
  ShieldCheck,
  Eye,
  EyeOff,
  Clock,
  ArrowRight,
  ShieldAlert,
  Building2,
  CheckCircle2,
  Sparkles,
  ArrowLeft,
  Zap,
  Target,
  ArrowRightLeft,
  Shield,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { auth, googleProvider, signInWithPopup } from '@/lib/firebase'

export default function BrandAdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Pending approval state for unapproved users
  const [pendingApprovalInfo, setPendingApprovalInfo] = useState<{
    email: string
    name?: string
  } | null>(null)

  // Standard Email/Password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Please enter email and password')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/brand-admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.pendingApproval) {
          setPendingApprovalInfo({ email })
          return
        }
        throw new Error(data.error || 'Login failed')
      }

      localStorage.setItem('brand_admin_user', JSON.stringify(data.user))
      toast.success(data.message || `Welcome, ${data.user.name}!`)
      router.push('/brand-admin/dashboard')
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  // Google Sign-In Flow
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)
    try {
      const result = await signInWithPopup(auth, googleProvider)
      const user = result.user

      if (!user.email) {
        toast.error('Could not get email from Google. Please try again.')
        return
      }

      const res = await fetch('/api/brand-admin/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          displayName: user.displayName || user.email.split('@')[0],
          photoURL: user.photoURL || null,
        }),
      })

      const data = await res.json()

      if (data.pendingApproval) {
        setPendingApprovalInfo({
          email: user.email,
          name: user.displayName || undefined,
        })
        toast.info('Access request sent for Super Admin review')
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Google login failed')
      }

      localStorage.setItem('brand_admin_user', JSON.stringify(data.user))
      toast.success(`Welcome back, ${data.user.name || 'Admin'}!`)
      router.push('/brand-admin/dashboard')
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        toast.info('Sign-in cancelled')
      } else {
        toast.error(err.message || 'Google sign-in failed')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#0a0d14] text-white flex flex-col font-sans selection:bg-[#febd1c] selection:text-black">
      {/* Background Ambient Glows (Strictly contained to prevent any horizontal scroll) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 left-1/4 w-[650px] h-[450px] bg-gradient-to-tr from-amber-500/10 via-amber-400/5 to-transparent blur-[140px] rounded-full" />
        <div className="absolute top-1/2 -right-32 w-[550px] h-[550px] bg-blue-600/5 blur-[150px] rounded-full" />
        <div className="absolute -bottom-20 left-10 w-[450px] h-[350px] bg-amber-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40" />
      </div>

      {/* ─── TOP NAVIGATION HEADER ─── */}
      <header className="relative z-20 w-full px-5 sm:px-10 lg:px-14 py-4 flex items-center justify-between border-b border-white/5 backdrop-blur-md bg-[#0a0d14]/70">
        <div className="flex items-center gap-3">
          <Link href="/brand-admin/login" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-[#121622] border border-white/10 flex items-center justify-center p-2 shadow-lg group-hover:scale-105 transition-transform shrink-0">
              <Image
                src="/logo-icon.svg"
                alt="1to7 Media"
                width={30}
                height={30}
                className="object-contain"
                priority
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white tracking-tight text-base sm:text-lg">
                  1to7 <span className="text-[#febd1c] font-medium">Brand Ops</span>
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#febd1c]/15 text-[#febd1c] border border-[#febd1c]/30">
                  Internal Ops Suite
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 hidden sm:block">
                Key Account Management &amp; Client Workspace Console
              </p>
            </div>
          </Link>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            href="/admin/dashboard"
            className="text-xs font-semibold text-neutral-300 hover:text-white transition flex items-center gap-1.5 py-1.5 px-3 rounded-xl border border-white/10 hover:bg-white/5 shrink-0"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-neutral-400" />
            <span className="hidden sm:inline">Influencer Admin</span>
            <span className="sm:hidden">Admin</span>
          </Link>
          <Link
            href="/brand/login"
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 transition flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 shrink-0"
          >
            <Building2 className="w-3.5 h-3.5 text-[#febd1c]" />
            <span className="hidden sm:inline">Client Portal</span>
            <span className="sm:hidden">Brands</span>
          </Link>
        </div>
      </header>

      {/* ─── MAIN CONTENT: 2-COLUMN BALANCED DESKTOP / CENTERED MOBILE ─── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-8 lg:px-14 py-8 sm:py-12 w-full max-w-full overflow-x-hidden">
        <div className="max-w-[1240px] w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center">
          
          {/* LEFT COLUMN: BRAND OPERATIONS VALUE SUITE (Desktop) */}
          <div className="hidden lg:flex lg:col-span-7 flex-col space-y-5 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-xs font-semibold text-amber-300 w-fit">
              <Sparkles className="w-3.5 h-3.5 text-[#febd1c]" />
              <span>Key Account Management • Enterprise Governance</span>
            </div>

            <h1 className="text-3xl lg:text-[40px] xl:text-[44px] font-black text-white leading-[1.18] tracking-tight">
              Enterprise Brand Operations &amp; <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#febd1c] via-[#ffd269] to-amber-200">
                Client Success Suite.
              </span>
            </h1>

            <p className="text-neutral-300 text-xs sm:text-sm leading-relaxed max-w-lg">
              The internal command center for 1to7 Key Account Managers (KAMs) and Leadership. Monitor brand review turnaround times, eliminate logistics bottlenecks, and manage enterprise client workspaces.
            </p>

            {/* 4 Feature Pillars */}
            <div className="space-y-3 pt-1 max-w-lg">
              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 font-bold border border-amber-500/25">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Review SLA Watchtower</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    Instantly identify brands holding creator shortlists &gt;24h or &gt;48h. Send 1-click WhatsApp nudges directly to client marketing heads.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 mt-0.5 font-bold border border-blue-500/25">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Multi-Brand Workspace Directory</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    Manage accounts for Mamaearth, Sugar, Plum, and 150+ brands. Assign dedicated KAMs and configure custom approval workflows.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold border border-emerald-500/25">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Strict Isolated RBAC</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    Influencer admin staff are blocked by default. Access to brand commercial data requires explicit approval by superadmin@gmail.com.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-colors">
                <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0 mt-0.5 font-bold border border-purple-500/25">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white">Virtual Brand Masquerade</h4>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-snug">
                    Jump directly into any brand’s portal on live client support calls to guide review decisions and approve creators on their behalf.
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Real-Time Status Ticker */}
            <div className="pt-2 flex items-center gap-3 text-xs text-neutral-400">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              <span>100% Operational • 3 Enterprise Workspaces Active • 99.8% SLA Target</span>
            </div>
          </div>

          {/* RIGHT COLUMN: LOGIN CARD */}
          <div className="w-full lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[460px]">
              <AnimatePresence mode="wait">
                {pendingApprovalInfo ? (
                  /* Pending Super Admin Approval Screen */
                  <motion.div
                    key="pending-screen"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-[#121622]/95 backdrop-blur-xl border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl text-center"
                  >
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                      <Clock className="w-8 h-8 animate-pulse" />
                    </div>

                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
                      <ShieldAlert className="w-3.5 h-3.5" />
                      RBAC Authorization Required
                    </div>

                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                      Access Request Pending
                    </h2>

                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed mb-6">
                      Your account <span className="text-white font-semibold">({pendingApprovalInfo.email})</span> is awaiting explicit RBAC approval by{' '}
                      <span className="text-amber-400 font-bold">superadmin@gmail.com</span>.
                    </p>

                    <div className="bg-[#0a0d14] border border-white/5 rounded-2xl p-4 mb-6 text-left space-y-3">
                      <div className="flex items-start gap-2.5 text-xs text-neutral-300">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Influencer Admin access does NOT automatically grant Brand Admin access.</span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-neutral-300">
                        <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <span>Super Admin will review and assign your role (KAM Lead, KAM, Ops, Viewer).</span>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => setPendingApprovalInfo(null)}
                      className="w-full h-11 border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white rounded-xl"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Sign In
                    </Button>
                  </motion.div>
                ) : (
                  /* Login Form */
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-[#121622]/95 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl"
                  >
                    {/* Header */}
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0a0d14] border border-white/10 p-2.5 mb-3 shadow-xl">
                        <Image
                          src="/logo-icon.svg"
                          alt="1to7 Media"
                          width={40}
                          height={40}
                          className="object-contain"
                          priority
                        />
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-[11px] font-semibold mb-2">
                        <Building2 className="w-3 h-3" />
                        Brand Operations Suite
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-white">
                        Brand Admin Portal
                      </h2>
                      <p className="text-xs text-neutral-400 mt-1">
                        1to7 Key Account Management &amp; Client Brand Operations
                      </p>
                    </div>

                    {/* Google Sign-In Button */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={googleLoading || loading}
                      className="w-full h-12 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 cursor-pointer mb-5"
                    >
                      {googleLoading ? (
                        <div className="w-5 h-5 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Sign in with Google</span>
                        </>
                      )}
                    </button>

                    {/* Divider */}
                    <div className="relative flex items-center justify-center mb-5">
                      <div className="border-t border-white/10 w-full" />
                      <span className="px-3 text-[11px] uppercase tracking-wider text-neutral-400 font-semibold whitespace-nowrap bg-[#121622]">
                        or staff credentials
                      </span>
                      <div className="border-t border-white/10 w-full" />
                    </div>

                    {/* Email/Password Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                          Internal Email
                        </label>
                        <div className="relative">
                          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="superadmin@gmail.com"
                            required
                            className="pl-10 h-11 bg-[#0a0d14] border-white/10 text-white placeholder:text-neutral-500 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                          Password
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                          <Input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            className="pl-10 pr-10 h-11 bg-[#0a0d14] border-white/10 text-white placeholder:text-neutral-500 rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        disabled={loading || googleLoading}
                        className="w-full h-11 bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-extrabold rounded-xl shadow-lg shadow-amber-500/10 hover:shadow-amber-500/20 transition-all duration-200 mt-2"
                      >
                        {loading ? (
                          <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <span className="flex items-center justify-center gap-2">
                            ACCESS BRAND ADMIN <ArrowRight className="w-4 h-4" />
                          </span>
                        )}
                      </Button>
                    </form>

                    {/* RBAC Notice */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-neutral-300 leading-relaxed flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-amber-300 font-semibold">Strict RBAC Enforced:</strong> Main Influencer Admin credentials do not grant access to Brand Admin unless approved by Super Admin.
                      </span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="relative z-10 w-full px-6 py-4 border-t border-white/5 text-center text-[11px] text-neutral-500">
        © 1to7 Media Platform • Brand Operations Console • Strictly Confidential
      </footer>
    </div>
  )
}
