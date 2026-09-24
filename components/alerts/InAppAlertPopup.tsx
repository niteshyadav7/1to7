'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, AlertTriangle, Info, CheckCircle2, X, ArrowRight, Check, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface BroadcastAlert {
  id: string
  title: string
  message: string
  type: 'critical' | 'warning' | 'info' | 'success'
  target_type: string
  action_label?: string
  action_url?: string
  auto_duration_seconds?: number
  allow_dismiss?: boolean
  auto_resolve_on_bank?: boolean
}

export default function InAppAlertPopup() {
  const router = useRouter()
  const [alerts, setAlerts] = useState<BroadcastAlert[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [visible, setVisible] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [progress, setProgress] = useState(100)
  const [resolving, setResolving] = useState(false)

  const activeAlert = alerts[currentIndex] || null
  const durationSec = activeAlert?.auto_duration_seconds || 8
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch active alerts for this creator
  useEffect(() => {
    let isMounted = true

    const fetchAlerts = async () => {
      try {
        const res = await fetch('/api/dashboard/alerts')
        if (!res.ok) return
        const data = await res.json()
        const list: BroadcastAlert[] = data.alerts || []

        // Check session storage to see if an alert was closed in this session (unless critical)
        const sessionDismissed = JSON.parse(sessionStorage.getItem('dismissed_alerts_session') || '[]')
        const unreadList = list.filter(a => !sessionDismissed.includes(a.id))

        if (isMounted && unreadList.length > 0) {
          setAlerts(unreadList)
          setCurrentIndex(0)
          setVisible(true)
        }
      } catch (err) {
        console.error('Failed to load dashboard alerts:', err)
      }
    }

    // Delay 1.2s after mount for smooth page entrance
    const timeout = setTimeout(fetchAlerts, 1200)
    return () => {
      isMounted = false
      clearTimeout(timeout)
    }
  }, [])

  // Auto-dismiss timer & progress bar
  useEffect(() => {
    if (!visible || !activeAlert || isPaused) {
      if (timerRef.current) clearTimeout(timerRef.current)
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    const totalMs = durationSec * 1000
    const stepMs = 50
    let elapsed = 0

    intervalRef.current = setInterval(() => {
      elapsed += stepMs
      const remainingPct = Math.max(0, 100 - (elapsed / totalMs) * 100)
      setProgress(remainingPct)
      if (elapsed >= totalMs) {
        clearInterval(intervalRef.current!)
        handleNextOrClose()
      }
    }, stepMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [visible, activeAlert, isPaused, durationSec, currentIndex])

  const handleNextOrClose = () => {
    if (currentIndex + 1 < alerts.length) {
      setCurrentIndex(prev => prev + 1)
      setProgress(100)
    } else {
      setVisible(false)
    }
  }

  // Temporary Dismiss ("cut")
  const handleCut = (alertId: string) => {
    try {
      const sessionDismissed = JSON.parse(sessionStorage.getItem('dismissed_alerts_session') || '[]')
      if (!sessionDismissed.includes(alertId)) {
        sessionDismissed.push(alertId)
        sessionStorage.setItem('dismissed_alerts_session', JSON.stringify(sessionDismissed))
      }
    } catch { /* ignore */ }

    handleNextOrClose()
  }

  // Permanent Resolve ("I have resolved this issue" / "Don't show again")
  const handleMarkResolved = async (alertId: string) => {
    setResolving(true)
    try {
      await fetch('/api/dashboard/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: alertId, resolved: true }),
      })

      // Also store in localStorage permanently
      const permanentlyResolved = JSON.parse(localStorage.getItem('resolved_alerts') || '[]')
      if (!permanentlyResolved.includes(alertId)) {
        permanentlyResolved.push(alertId)
        localStorage.setItem('resolved_alerts', JSON.stringify(permanentlyResolved))
      }

      handleNextOrClose()
    } catch (err) {
      console.error('Failed to mark alert as resolved:', err)
      handleNextOrClose()
    } finally {
      setResolving(false)
    }
  }

  // Navigate to action URL
  const handleActionClick = (url?: string) => {
    if (!url) return
    handleNextOrClose()
    router.push(url)
  }

  if (!visible || !activeAlert) return null

  const typeConfig = {
    critical: {
      border: 'border-rose-500/40',
      glow: 'shadow-rose-500/20',
      badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
      bar: 'bg-rose-500',
      icon: <ShieldAlert className="h-5 w-5 text-rose-400" />,
      label: 'Critical Alert',
    },
    warning: {
      border: 'border-amber-500/40',
      glow: 'shadow-amber-500/20',
      badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      bar: 'bg-amber-500',
      icon: <AlertTriangle className="h-5 w-5 text-amber-400" />,
      label: 'Action Required',
    },
    info: {
      border: 'border-indigo-500/40',
      glow: 'shadow-indigo-500/20',
      badge: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
      bar: 'bg-indigo-500',
      icon: <Info className="h-5 w-5 text-indigo-400" />,
      label: 'Notice',
    },
    success: {
      border: 'border-emerald-500/40',
      glow: 'shadow-emerald-500/20',
      badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      bar: 'bg-emerald-500',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-400" />,
      label: 'Update',
    },
  }[activeAlert.type || 'warning']

  return (
    <AnimatePresence>
      <div className="fixed bottom-6 right-6 z-[9999] max-w-md w-[calc(100vw-3rem)]">
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={`relative bg-slate-900/95 backdrop-blur-xl border ${typeConfig.border} rounded-2xl p-5 shadow-2xl ${typeConfig.glow} overflow-hidden text-white`}
        >
          {/* Header row: Badge + Title + Close Button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-white/5 border border-white/10 shrink-0">
                {typeConfig.icon}
              </div>
              <div>
                <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${typeConfig.badge}`}>
                  {typeConfig.label}
                </span>
                <h4 className="text-sm font-bold text-white mt-1 leading-snug">
                  {activeAlert.title}
                </h4>
              </div>
            </div>

            {/* Cut / Close Button */}
            {activeAlert.allow_dismiss !== false && (
              <button
                type="button"
                onClick={() => handleCut(activeAlert.id)}
                title="Dismiss for now"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Message Content */}
          <p className="text-xs text-slate-300 mt-3 leading-relaxed">
            {activeAlert.message}
          </p>

          {/* Action and Resolution Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-white/10">
            {activeAlert.action_url && (
              <button
                type="button"
                onClick={() => handleActionClick(activeAlert.action_url)}
                className="flex-1 min-w-[140px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {activeAlert.action_label || 'Resolve Issue'}
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Mark as Resolved button: Prevents alert from showing again */}
            <button
              type="button"
              disabled={resolving}
              onClick={() => handleMarkResolved(activeAlert.id)}
              title="Mark this issue as resolved so it won't appear again"
              className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span>Resolved (Don&apos;t show again)</span>
            </button>
          </div>

          {/* Countdown Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/5 overflow-hidden">
            <div
              className={`h-full ${typeConfig.bar} transition-all duration-75`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
