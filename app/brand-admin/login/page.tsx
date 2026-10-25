'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  KeyRound,
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

  // Quick Demo fill for Super Admin
  const handleQuickFillSuperAdmin = () => {
    setEmail('superadmin@gmail.com')
    setPassword('superadmin123')
    toast.info('Filled credentials for superadmin@gmail.com')
  }

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
        toast.info('Access request sent for Super Admin RBAC review')
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
    <div className="relative min-h-screen w-full max-w-full overflow-x-hidden bg-[#0c1017] text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Ambient Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-amber-500/10 via-amber-400/5 to-transparent blur-3xl rounded-full" />
        <div className="absolute bottom-10 left-10 w-72 h-72 bg-blue-500/5 blur-3xl rounded-full" />
      </div>

      <div className="relative z-10 w-full max-w-[500px] mx-auto">
        <AnimatePresence mode="wait">
          {pendingApprovalInfo ? (
            /* Pending Super Admin Approval Screen */
            <motion.div
              key="pending-screen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#151a24]/90 backdrop-blur-xl border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl text-center"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Clock className="w-8 h-8 animate-pulse" />
              </div>

              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-3">
                <ShieldAlert className="w-3.5 h-3.5" />
                RBAC Authorization Required
              </div>

              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
                Brand Admin Access Pending
              </h2>

              <p className="text-sm text-neutral-400 leading-relaxed mb-6">
                Your account <span className="text-white font-medium">({pendingApprovalInfo.email})</span> is awaiting explicit RBAC approval by{' '}
                <span className="text-amber-400 font-semibold">superadmin@gmail.com</span>.
              </p>

              <div className="bg-[#0e121a] border border-white/5 rounded-xl p-4 mb-6 text-left space-y-2.5">
                <div className="flex items-start gap-2.5 text-xs text-neutral-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Influencer Admin access does NOT automatically grant Brand Admin access.</span>
                </div>
                <div className="flex items-start gap-2.5 text-xs text-neutral-300">
                  <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>Super Admin has been notified to review and assign your role (KAM Lead, KAM, Ops, Viewer).</span>
                </div>
              </div>

              <Button
                variant="outline"
                onClick={() => setPendingApprovalInfo(null)}
                className="w-full h-11 border-white/10 hover:bg-white/5 text-neutral-300 hover:text-white"
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
              className="bg-[#151a24]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl"
            >
              {/* Header */}
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0c1017] border border-white/10 p-2.5 mb-3 shadow-lg">
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
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Brand Admin Portal
                </h1>
                <p className="text-xs sm:text-sm text-neutral-400 mt-1">
                  1to7 Key Account Management &amp; Client Brand Operations
                </p>
              </div>

              {/* Google Sign-In Button */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || loading}
                className="w-full h-12 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-semibold text-sm flex items-center justify-center gap-3 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 cursor-pointer mb-5"
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
                <span className="bg-[#151a24] px-3 text-[11px] uppercase tracking-wider text-neutral-500 font-medium">
                  or staff email
                </span>
                <div className="border-t border-white/10 w-full" />
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Internal Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="superadmin@gmail.com"
                      required
                      className="pl-10 h-11 bg-[#0c1017] border-white/10 text-white placeholder:text-neutral-600 rounded-xl focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="pl-10 pr-10 h-11 bg-[#0c1017] border-white/10 text-white placeholder:text-neutral-600 rounded-xl focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-11 bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950 font-bold rounded-xl shadow-lg transition-all duration-200 mt-2"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Access Brand Admin <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Super Admin 1-Click Quick Fill */}
              <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between text-xs">
                <span className="text-neutral-500">Need quick testing?</span>
                <button
                  type="button"
                  onClick={handleQuickFillSuperAdmin}
                  className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  Fill superadmin@gmail.com
                </button>
              </div>

              {/* RBAC Notice */}
              <div className="mt-4 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-[11px] text-neutral-400 leading-relaxed flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict RBAC Enforced:</strong> Main Influencer Admin credentials do not grant access to Brand Admin unless approved by Super Admin.
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
