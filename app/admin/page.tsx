'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Lock, Mail, ShieldCheck, Sparkles, Eye, EyeOff, Clock, ArrowLeft, CheckCircle2, ShieldAlert } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { auth, googleProvider, signInWithPopup } from '@/lib/firebase'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // Pending approval screen state
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
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store admin info
      localStorage.setItem('admin_cache', JSON.stringify(data.admin))
      toast.success(`Welcome back, ${data.admin.name || 'Admin'}!`)
      router.push('/admin/dashboard')
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

      const res = await fetch('/api/admin/auth/google', {
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
        toast.info('Access request pending Super Admin review')
        return
      }

      if (!res.ok) {
        throw new Error(data.error || 'Google login failed')
      }

      // Successful login
      localStorage.setItem('admin_cache', JSON.stringify(data.admin))
      toast.success(`Welcome back, ${data.admin.name || 'Admin'}!`)
      router.push('/admin/dashboard')
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        toast.info('Google sign-in popup was cancelled')
      } else {
        toast.error(err.message || 'Google sign-in failed. Please try again.')
      }
    } finally {
      setGoogleLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans">
      {/* Background Effects */}
      <div className="pointer-events-none fixed inset-0 bg-gradient-to-b from-indigo-900/20 via-slate-950 to-slate-950" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(99,102,241,0.15),transparent_50%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo + Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-500 shadow-2xl shadow-indigo-500/30 mb-4">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Portal</h1>
          <p className="text-sm text-slate-400 mt-1">1to7 Media — Management Console</p>
        </div>

        <AnimatePresence mode="wait">
          {pendingApprovalInfo ? (
            /* Pending Approval Card */
            <motion.div
              key="pending-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-2xl border border-amber-500/20 bg-slate-900/80 backdrop-blur-xl p-8 shadow-2xl shadow-black/40 text-center"
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-5 shadow-lg shadow-amber-500/10">
                <Clock className="h-8 w-8 animate-pulse" />
              </div>

              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                Pending Super Admin Approval
              </span>

              <h2 className="text-xl font-bold text-white mb-2">Access Request Submitted</h2>
              <p className="text-xs text-slate-300 leading-relaxed mb-6">
                Your Google account has been registered in the system. A <strong className="text-purple-300">Super Admin</strong> must approve your access and assign your role and tab permissions before you can enter the console.
              </p>

              <div className="rounded-xl border border-white/5 bg-slate-950/60 p-4 mb-6 text-left">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                  Registered Account
                </div>
                {pendingApprovalInfo.name && (
                  <div className="text-sm font-semibold text-white truncate">
                    {pendingApprovalInfo.name}
                  </div>
                )}
                <div className="text-xs text-indigo-300 font-mono truncate">
                  {pendingApprovalInfo.email}
                </div>
              </div>

              <Button
                type="button"
                onClick={() => setPendingApprovalInfo(null)}
                variant="outline"
                className="w-full h-11 rounded-xl border-white/10 bg-slate-950/60 text-slate-300 hover:text-white hover:bg-white/5 font-semibold text-sm cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Sign In
              </Button>
            </motion.div>
          ) : (
            /* Main Login Card */
            <motion.div
              key="login-card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="rounded-2xl border border-white/10 bg-slate-900/70 backdrop-blur-xl p-8 shadow-2xl shadow-black/30"
            >
              {/* Google Sign-In Button */}
              <div className="space-y-4">
                <Button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={loading || googleLoading}
                  className="w-full h-12 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm shadow-xl shadow-white/5 transition-all active:scale-[0.98] flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                >
                  {googleLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-slate-800" />
                  ) : (
                    <>
                      <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                </Button>

                {/* Divider */}
                <div className="relative flex items-center justify-center py-1">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-white/10" />
                  </div>
                  <span className="relative bg-slate-900/90 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                    or continue with password
                  </span>
                </div>
              </div>

              {/* Email & Password Form */}
              <form onSubmit={handleLogin} className="space-y-4 mt-4">
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter admin email address"
                      className="pl-10 bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                      disabled={loading || googleLoading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 pr-10 bg-slate-950/70 border-white/10 !text-white placeholder:text-slate-500 h-11 text-sm focus-visible:ring-indigo-500 rounded-xl"
                      disabled={loading || googleLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-400 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading || googleLoading}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white font-semibold text-sm shadow-xl shadow-indigo-500/20 transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Sign In to Admin
                    </>
                  )}
                </Button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-gradient-to-br from-purple-600 to-pink-500">
              <Sparkles className="h-2.5 w-2.5 text-white" />
            </div>
            <span className="text-xs font-bold text-slate-500">1to7 Media</span>
          </div>
          <p className="text-[11px] text-slate-600 mb-6">Restricted access — authorized personnel only</p>
        </div>
      </motion.div>
    </div>
  )
}
