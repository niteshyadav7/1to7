'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

export interface EllipsisTooltipProps {
  /** The full text to display inside the tooltip popup */
  text: string
  /** Optional secondary subtitle or description */
  subtext?: string
  /** The element triggering the tooltip */
  children: React.ReactNode
  /** Additional classes on the trigger wrapper */
  className?: string
  /** 'light' (clean white floating card with border & shadow) or 'dark' (slate-900) */
  theme?: 'light' | 'dark'
  /** Placement preference: default is 'top' */
  side?: 'top' | 'bottom'
  /** Disable the tooltip */
  disabled?: boolean
  /** Max width of the tooltip popup */
  maxWidth?: number | string
}

export function EllipsisTooltip({
  text,
  subtext,
  children,
  className = '',
  theme = 'light',
  side = 'top',
  disabled = false,
  maxWidth = 320,
}: EllipsisTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; isTop: boolean }>({
    top: 0,
    left: 0,
    isTop: true,
  })

  const triggerRef = useRef<HTMLSpanElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setMounted(true)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    // Decide whether to show on top or bottom based on available viewport space
    const isTop = side === 'top' ? rect.top > 50 : rect.bottom + 50 > window.innerHeight

    setCoords({
      top: isTop ? rect.top - 8 : rect.bottom + 8,
      left: rect.left + rect.width / 2,
      isTop,
    })
  }, [side])

  const handleMouseEnter = () => {
    if (disabled || !text) return
    updatePosition()
    // Smooth 60ms debounce for natural feel
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsOpen(true)
    }, 60)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsOpen(false)
  }

  // Dismiss on window scroll or resize to prevent floating desync
  useEffect(() => {
    if (!isOpen) return

    const handleDismiss = () => setIsOpen(false)
    window.addEventListener('scroll', handleDismiss, { passive: true, capture: true })
    window.addEventListener('resize', handleDismiss, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleDismiss, { capture: true })
      window.removeEventListener('resize', handleDismiss)
    }
  }, [isOpen])

  // Horizontal screen edge clamping
  const screenPadding = 20
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1200
  const clampedLeft = Math.max(
    screenPadding + 100,
    Math.min(viewportWidth - screenPadding - 100, coords.left)
  )
  const arrowOffset = coords.left - clampedLeft

  const isLight = theme === 'light'

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={`inline-flex min-w-0 max-w-full items-center ${className}`}
      >
        {children}
      </span>

      {mounted &&
        createPortal(
          <AnimatePresence>
            {isOpen && text && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: coords.isTop ? 4 : -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: coords.isTop ? 2 : -2 }}
                transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
                role="tooltip"
                style={{
                  position: 'fixed',
                  top: coords.top,
                  left: clampedLeft,
                  transform: coords.isTop ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
                  maxWidth,
                  zIndex: 999999,
                  pointerEvents: 'none',
                }}
                className={`select-none rounded-xl px-3 py-1.5 text-xs font-semibold tracking-tight shadow-xl ${
                  isLight
                    ? 'bg-white text-slate-800 border border-slate-200/90 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.14),0_4px_12px_-2px_rgba(0,0,0,0.06)]'
                    : 'bg-slate-900 text-white border border-slate-800 shadow-2xl'
                }`}
              >
                <div className="relative">
                  <div className="leading-snug break-words text-xs">
                    {text}
                  </div>
                  {subtext && (
                    <div className={`mt-0.5 text-[11px] font-normal leading-tight ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {subtext}
                    </div>
                  )}

                  {/* Downward / Upward Triangle Caret Arrow */}
                  {coords.isTop ? (
                    <div
                      style={{
                        transform: `translateX(calc(-50% + ${arrowOffset}px)) rotate(45deg)`,
                      }}
                      className={`absolute top-full left-1/2 -mt-1 w-2.5 h-2.5 ${
                        isLight
                          ? 'bg-white border-r border-b border-slate-200/90'
                          : 'bg-slate-900 border-r border-b border-slate-800'
                      }`}
                    />
                  ) : (
                    <div
                      style={{
                        transform: `translateX(calc(-50% + ${arrowOffset}px)) rotate(45deg)`,
                      }}
                      className={`absolute bottom-full left-1/2 -mb-1 w-2.5 h-2.5 ${
                        isLight
                          ? 'bg-white border-l border-t border-slate-200/90'
                          : 'bg-slate-900 border-l border-t border-slate-800'
                      }`}
                    />
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </>
  )
}
