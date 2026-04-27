'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Home, Compass } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center font-sans overflow-hidden relative">
      {/* Background decorations for dark theme integration */}
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
