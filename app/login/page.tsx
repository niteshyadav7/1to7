'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/components/providers/AuthProvider'
import { toast } from 'sonner'
import { ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!identifier.trim()) {
      toast.error('Please enter your Email, Mobile, or Influencer ID')
      return
    }

    if (!password) {
      toast.error('Please enter your password')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier, password })
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Login failed')

      login(data.user)
      toast.success('Welcome back!')
      
      // Use window.location for hard redirect to ensure cookies are fresh
      window.location.href = '/dashboard'
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

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

      {/* Right Section (Login Form) */}
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

          <div className="space-y-2 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">Welcome back</h2>
            <p className="text-sm text-slate-400">
              Enter your details to access your creator dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="identifier" className="text-slate-300 font-medium">Email / Mobile / Influencer ID</Label>
                <div className="relative group">
                  <Input
                    id="identifier"
                    placeholder="e.g. hello@example.com or HY10000"
                    value={identifier}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIdentifier(e.target.value)}
                    required
                    className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 h-12 px-4 focus-visible:ring-purple-500 transition-all rounded-xl shadow-inner group-hover:border-white/20"
                  />
                  <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 opacity-0 blur transition-opacity group-focus-within:opacity-20" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-slate-300 font-medium">Password</Label>
                  <Link href="#" className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors cursor-pointer">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                    required
                    className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 h-12 px-4 pr-10 focus-visible:ring-purple-500 transition-all rounded-xl shadow-inner group-hover:border-white/20"
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
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-semibold text-base shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] mt-2 group cursor-pointer" 
              loading={loading}
            >
              Sign In to Dashboard
              {!loading && <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm font-medium text-slate-400">
            Don't have an account?{' '}
            <Link href="/signup" className="text-purple-400 hover:text-purple-300 hover:underline transition-all cursor-pointer">
              Create My Creator Account
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
