'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Compass, ArrowLeft, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  const [isBrandHost, setIsBrandHost] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname || ''
      if (host.includes('thehype.in') || host.startsWith('brand.') || host.startsWith('brands.')) {
        setIsBrandHost(true)
        document.title = '404 - Page Not Found | TheHype'
      }
    }
  }, [])

  // ─── BRAND PORTAL 404 EXPERIENCE (100% TheHype Branding & Coral Palette) ───
  if (isBrandHost) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center font-sans bg-[#101315] text-white selection:bg-[#F95738]/20 selection:text-[#F95738] relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-[#F95738]/10 blur-[130px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10 flex flex-col items-center max-w-md w-full"
        >
          {/* TheHype Logo Emblem */}
          <div className="mb-6 flex items-center gap-3">
            <img
              src="/thehype-logo.png"
              alt="TheHype"
              className="w-12 h-12 object-contain drop-shadow-md rounded-xl bg-white/5 p-1 border border-white/10"
            />
            <div className="text-left">
              <span className="font-black text-lg tracking-tight text-white block leading-tight">
                TheHype
              </span>
              <span className="text-[10px] uppercase tracking-widest text-[#F95738] font-bold">
                Enterprise Brand Portal
              </span>
            </div>
          </div>

          <div className="p-8 rounded-3xl bg-[#14171A]/90 border border-white/10 shadow-2xl backdrop-blur-xl w-full">
            <span className="text-6xl sm:text-7xl font-black tracking-tight text-white block mb-2 font-mono">
              404
            </span>

            <h1 className="text-lg font-bold text-white mb-2">
              Workspace Page Not Found
            </h1>

            <p className="text-xs text-slate-400 leading-relaxed mb-6">
              The link you followed might have expired, been archived by your TheHype Account Manager, or does not exist.
            </p>

            <Link href="/login" className="block w-full">
              <Button className="w-full h-11 rounded-xl bg-[#F95738] hover:bg-[#E04728] text-white font-bold text-xs shadow-lg shadow-[#F95738]/25 transition-all cursor-pointer flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Brand Workspace</span>
              </Button>
            </Link>

            <div className="mt-4 pt-4 border-t border-white/5 text-[11px] text-slate-500">
              Need assistance? Contact{' '}
              <a href="mailto:support@thehype.in" className="text-[#FF8C73] hover:underline">
                support@thehype.in
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  // ─── DEFAULT 1TO7 404 (For Creators / Admins) ───
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center font-sans overflow-hidden relative">
      <div className="pointer-events-none absolute inset-0 bg-slate-950" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(124,58,237,0.1),transparent)]" />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 h-64 w-64 rounded-full bg-purple-500/20 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 h-64 w-64 rounded-full bg-pink-500/10 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex flex-col items-center"
      >
        <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-md">
          <Compass className="h-12 w-12 text-purple-400" />
        </div>

        <h1 className="mb-2 text-8xl font-black tracking-tighter text-white">
          404
        </h1>
        
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
          Looks like you're lost in space
        </h2>
        
        <p className="mb-10 max-w-md text-slate-400 leading-relaxed">
          We couldn't find the page you're looking for. It might have been moved, deleted, or perhaps it never existed at all.
        </p>

        <Link href="/">
          <Button className="group h-14 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-8 text-base font-bold text-white shadow-xl shadow-purple-500/25 transition-all hover:from-purple-500 hover:to-pink-400 active:scale-[0.98] cursor-pointer">
            <Home className="mr-2 h-5 w-5 transition-transform group-hover:-translate-y-0.5" />
            Take Me Home
          </Button>
        </Link>
      </motion.div>
    </div>
  )
}
