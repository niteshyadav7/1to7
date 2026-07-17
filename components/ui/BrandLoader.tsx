'use client'

import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { useState, useEffect } from 'react'

const LOADING_TEXTS = [
  'Finding the best campaigns...',
  'Connecting with premium brands...',
  'Loading your customized dashboard...',
  'Preparing brand collaborations...',
  'Almost there...',
]

export default function BrandLoader({ className = '' }: { className?: string }) {
  const [textIndex, setTextIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % LOADING_TEXTS.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {/* ─── Moving Zepto/Rapido style Animation Container ─── */}
      <div className="relative w-80 h-20 flex items-center justify-center overflow-hidden bg-slate-50/50 rounded-xl border border-slate-100/50 shadow-sm p-4">
        {/* Road Track Line */}
        <div className="absolute w-full h-[2px] border-t border-dashed border-slate-200/80 top-1/2 -translate-y-1/2" />

        {/* Speed lines moving in opposite direction (right to left) */}
        <div className="absolute inset-0 flex flex-col justify-around pointer-events-none py-2 px-6">
          <motion.div
            animate={{ x: [120, -120], opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0 }}
            className="w-8 h-[2px] bg-primary-container/40 rounded-full self-start ml-12"
          />
          <motion.div
            animate={{ x: [120, -120], opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 0.5 }}
            className="w-12 h-[2px] bg-[#f50057]/30 rounded-full self-end mr-8"
          />
          <motion.div
            animate={{ x: [120, -120], opacity: [0, 0.6, 0] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: 'linear', delay: 1 }}
            className="w-6 h-[2px] bg-tertiary/40 rounded-full self-center"
          />
        </div>

        {/* Trailing ripple effects behind the moving logo */}
        <motion.div
          animate={{
            x: [-140, 140],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: 'linear',
          }}
          className="absolute left-0 right-0 flex justify-center items-center"
        >
          {/* Bouncy Logo Wrapper */}
          <div className="relative flex flex-col items-center justify-center">
            {/* Pulsing/Ripple ring around the card */}
            <motion.div
              animate={{
                scale: [0.8, 1.6, 0.8],
                opacity: [0.5, 0.1, 0.5],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="absolute w-16 h-16 rounded-full border border-[#f50057]/20 bg-[#f50057]/5 -translate-y-2"
            />

            {/* Bouncing Logo Card */}
            <motion.div
              animate={{
                y: [-10, 10, -10],
                rotate: [0, 8, -8, 0],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-container to-[#f50057] shadow-md border border-white"
            >
              <Sparkles className="h-6 w-6 text-black animate-pulse" />
            </motion.div>

            {/* Moving drop shadow */}
            <motion.div
              animate={{
                scaleX: [0.5, 1.2, 0.5],
                opacity: [0.2, 0.7, 0.2],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="w-9 h-1.5 bg-slate-350/60 blur-[1.5px] rounded-full mt-2"
            />
          </div>
        </motion.div>
      </div>

      {/* Cycle loading status texts */}
      <div className="mt-6 h-6 overflow-hidden relative w-64 mx-auto">
        <motion.p
          key={textIndex}
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -20, opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="text-xs font-bold text-charcoal-surface uppercase tracking-widest"
        >
          {LOADING_TEXTS[textIndex]}
        </motion.p>
      </div>

      {/* Bouncing Dots indicator */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <span className="w-1.5 h-1.5 rounded-full bg-[#f50057] animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-primary-container animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}
