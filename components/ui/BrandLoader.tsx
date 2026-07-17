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
      <div className="relative flex items-center justify-center w-36 h-36">
        {/* Ripple Wave 1 (Vibrant Pink) */}
        <motion.div
          animate={{
            scale: [1, 2.4, 2.8],
            opacity: [0.6, 0.2, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeOut',
          }}
          className="absolute w-12 h-12 rounded-full border-2 border-[#f50057] bg-[#f50057]/5"
        />

        {/* Ripple Wave 2 (Brand Yellow) */}
        <motion.div
          animate={{
            scale: [1, 2.0, 2.4],
            opacity: [0.8, 0.3, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: 0.6,
            ease: 'easeOut',
          }}
          className="absolute w-12 h-12 rounded-full border-2 border-primary-container bg-primary-container/10"
        />

        {/* Bouncing Logo Container */}
        <motion.div
          animate={{
            y: [-12, 12, -12],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-container to-[#f50057] shadow-xl border-2 border-white"
        >
          <Sparkles className="h-8 w-8 text-black animate-pulse" />
        </motion.div>

        {/* Scale Shadow underneath the bouncing element */}
        <motion.div
          animate={{
            scale: [0.6, 1.2, 0.6],
            opacity: [0.2, 0.6, 0.2],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute bottom-4 w-12 h-2 rounded-full bg-slate-200 blur-[2px]"
        />
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
