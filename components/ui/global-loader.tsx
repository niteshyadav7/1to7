'use client'

import { motion } from 'framer-motion'

export function GlobalLoader({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4">
      <div className="relative flex items-center justify-center h-20 w-20">
        {/* Outer glowing rings */}
        <motion.div
           animate={{ rotate: 360 }}
           transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
           className="absolute inset-0 rounded-full border-t-2 border-indigo-500/30 w-full h-full"
        />
        <motion.div
           animate={{ rotate: -360 }}
           transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
           className="absolute inset-2 rounded-full border-r-2 border-purple-500/50"
        />
        
        {/* Center pulsing core */}
        <motion.div
           animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
           transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
           className="h-6 w-6 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]"
        />
      </div>
      
      {/* Loading text */}
      <motion.p
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="text-xs font-semibold text-indigo-300/80 tracking-widest uppercase mt-4"
      >
        {text}
      </motion.p>
    </div>
  )
}
