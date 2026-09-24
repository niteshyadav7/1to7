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

        // Check session storage to see if an alert was closed recently (snoozed for 30 mins, unless critical)
        let sessionDismissed: Record<string, number> = {}
        try {
          const raw = sessionStorage.getItem('dismissed_alerts_snooze')
          if (raw) sessionDismissed = JSON.parse(raw)
        } catch { /* ignore */ }

        const now = Date.now()
        const unreadList = list.filter(a => {
          if (a.type === 'critical') return true
          const snoozedAt = sessionDismissed[a.id]
          if (snoozedAt && now - snoozedAt < 30 * 60 * 1000) {
            return false
          }
          return true
        })

        if (isMounted && unreadList.length > 0) {
          setAlerts(unreadList)
          setCurrentIndex(0)
          setVisible(true)
        }
      } catch (err) {
        console.error('Failed to load dashboard alerts:', err)
      }
    }

    // Delay 200ms after mount so dashboard layout is painted
    const timeout = setTimeout(fetchAlerts, 200)
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

  // Temporary Dismiss ("cut") - snoozes for 30 minutes
  const handleCut = (alertId: string) => {
    try {
      let sessionDismissed: Record<string, number> = {}
      const raw = sessionStorage.getItem('dismissed_alerts_snooze')
      if (raw) sessionDismissed = JSON.parse(raw)
      sessionDismissed[alertId] = Date.now()
      sessionStorage.setItem('dismissed_alerts_snooze', JSON.stringify(sessionDismissed))
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
    if (!url || !url.trim()) return
    handleNextOrClose()
    router.push(url.trim())
  }

  if (!visible || !activeAlert) return null

  const typeConfig = {
    critical: {
      border: 'border-rose-200/80',
      glow: 'shadow-rose-500/10',
      badge: 'bg-rose-50 text-rose-700 border-rose-200',
      iconBox: 'bg-rose-50 border-rose-200 text-rose-600',
      bar: 'bg-rose-500',
      icon: <ShieldAlert className="h-5 w-5 text-rose-600" />,
      label: 'Critical Alert',
    },
    warning: {
      border: 'border-amber-200/80',
      glow: 'shadow-amber-500/10',
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      iconBox: 'bg-amber-50 border-amber-200 text-amber-600',
      bar: 'bg-amber-500',
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      label: 'Action Required',
    },
    info: {
      border: 'border-blue-200/80',
      glow: 'shadow-blue-500/10',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      iconBox: 'bg-blue-50 border-blue-200 text-blue-600',
      bar: 'bg-blue-600',
      icon: <Info className="h-5 w-5 text-blue-600" />,
      label: 'Notice',
    },
    success: {
      border: 'border-emerald-200/80',
      glow: 'shadow-emerald-500/10',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      iconBox: 'bg-emerald-50 border-emerald-200 text-emerald-600',
      bar: 'bg-emerald-600',
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      label: 'Update',
    },
  }[activeAlert.type || 'warning']

  const secondsRemaining = Math.max(1, Math.ceil((progress / 100) * durationSec))

  return (
    <AnimatePresence>
      <div className="fixed top-3 left-3 right-3 sm:top-5 sm:right-6 sm:left-auto sm:max-w-md z-[99999] pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: -35, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -25, scale: 0.96 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className={`relative bg-white/98 backdrop-blur-2xl border ${typeConfig.border} rounded-2xl p-4 sm:p-5 shadow-2xl ${typeConfig.glow} overflow-hidden text-slate-900`}
        >
          {/* Top colored accent line */}
          <div className={`absolute top-0 left-0 right-0 h-1 ${typeConfig.bar}`} />

          {/* Header row: Badge + Title + Close Button */}
          <div className="flex items-start justify-between gap-3 pt-1">
            <div className="flex items-start gap-3 min-w-0">
              <div className={`p-2 rounded-xl border shrink-0 ${typeConfig.iconBox} shadow-xs`}>
                {typeConfig.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${typeConfig.badge}`}>
                    {typeConfig.label}
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {isPaused ? (
                      <span className="text-amber-600 font-bold">⏸ Paused</span>
                    ) : (
                      `${secondsRemaining}s`
                    )}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-900 mt-1 leading-snug break-words">
                  {activeAlert.title}
                </h4>
              </div>
            </div>

            {/* Cut / Close Button */}
            {activeAlert.allow_dismiss !== false && (
              <button
                type="button"
                onClick={() => handleCut(activeAlert.id)}
                title="Dismiss for now (Cut)"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 active:scale-95"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Message Content */}
          <p className="text-xs text-slate-600 mt-2.5 leading-relaxed whitespace-pre-line break-words pl-0.5">
            {activeAlert.message}
          </p>

          {/* Action and Resolution Buttons */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-100">
            {Boolean(activeAlert.action_url && activeAlert.action_url.trim()) && (
              <button
                type="button"
                onClick={() => handleActionClick(activeAlert.action_url)}
                className="flex-1 min-w-[130px] px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-xs font-bold shadow-xs hover:shadow active:scale-95 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>{activeAlert.action_label || 'Resolve Issue'}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Mark as Resolved button */}
            <button
              type="button"
              disabled={resolving}
              onClick={() => handleMarkResolved(activeAlert.id)}
              title="Mark this issue as resolved so it won't appear again"
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 hover:text-slate-950 text-xs font-semibold border border-slate-200/80 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Check className="h-3.5 w-3.5 text-emerald-600" />
              <span>Resolved (Don&apos;t show again)</span>
            </button>
          </div>

          {/* Countdown Progress Bar */}
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 overflow-hidden">
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
