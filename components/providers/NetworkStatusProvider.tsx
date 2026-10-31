'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, AlertTriangle, RefreshCw, X } from 'lucide-react'

interface NetworkStatusContextType {
  isOnline: boolean
  isSlow: boolean
  effectiveType: string | null
  rtt: number | null
  downlink: number | null
  checkConnection: () => Promise<boolean>
}

const NetworkStatusContext = createContext<NetworkStatusContextType>({
  isOnline: true,
  isSlow: false,
  effectiveType: '4g',
  rtt: null,
  downlink: null,
  checkConnection: async () => true,
})

export const useNetworkStatus = () => useContext(NetworkStatusContext)

export function NetworkStatusProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState<boolean>(true)
  const [isSlow, setIsSlow] = useState<boolean>(false)
  const [effectiveType, setEffectiveType] = useState<string | null>('4g')
  const [rtt, setRtt] = useState<number | null>(null)
  const [downlink, setDownlink] = useState<number | null>(null)

  // Banner display states
  const [showOfflineBanner, setShowOfflineBanner] = useState<boolean>(false)
  const [showRestoredBanner, setShowRestoredBanner] = useState<boolean>(false)
  const [showSlowBanner, setShowSlowBanner] = useState<boolean>(false)
  const [slowDismissed, setSlowDismissed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return sessionStorage.getItem('slow_network_banner_dismissed') === 'true'
      } catch {
        return false
      }
    }
    return false
  })
  const [isChecking, setIsChecking] = useState<boolean>(false)

  const hasMounted = useRef(false)
  const restoredTimerRef = useRef<NodeJS.Timeout | null>(null)
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null)
  const offlineDebounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const consecutiveFailuresRef = useRef<number>(0)
  const autoRetryTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckTimeRef = useRef<number>(0)

  // Detect whether running in local development environment
  const isLocalEnvironment = useCallback(() => {
    if (typeof window === 'undefined') return false
    const host = window.location.hostname
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host.endsWith('.local')
    )
  }, [])

  // Lightweight fallback ping to verify real external internet reachability
  // Used to prevent false-positives when local Next.js dev server or internal API route is slow
  const pingExternal = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 3500)
      // Ping Cloudflare trace or generate_204 with no-cors to test genuine external internet reachability
      await fetch('https://cloudflare.com/cdn-cgi/trace', {
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timer)
      return true
    } catch {
      return false
    }
  }, [])

  // User manual dismissal handler persisted in sessionStorage
  const dismissSlowBanner = useCallback(() => {
    setShowSlowBanner(false)
    setSlowDismissed(true)
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('slow_network_banner_dismissed', 'true')
      } catch {}
    }
  }, [])

  // Auto-hide slow banner after 10 seconds so it doesn't linger indefinitely
  useEffect(() => {
    if (showSlowBanner) {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
      slowTimerRef.current = setTimeout(() => {
        setShowSlowBanner(false)
      }, 10000)
    }
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
    }
  }, [showSlowBanner])

  // Active ping function to check internet connectivity & response latency
  const checkConnection = useCallback(async (): Promise<boolean> => {
    // If the browser natively reports offline, verify immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      consecutiveFailuresRef.current += 1
      setIsOnline(false)
      setShowOfflineBanner(true)
      return false
    }

    setIsChecking(true)
    const startTime = performance.now()
    try {
      // 8.5s in dev, 6s in prod to tolerate dev-server HMR compile delays
      const timeoutLimit = isLocalEnvironment() ? 8500 : 6000
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeoutLimit)

      const res = await fetch(`/api/health?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const duration = performance.now() - startTime
      lastCheckTimeRef.current = Date.now()

      if (res.ok) {
        consecutiveFailuresRef.current = 0
        setIsOnline(true)
        setShowOfflineBanner(false)

        // Only mark as slow if latency is genuinely critical (> 4500ms) AND not on localhost.
        if (duration > 4500 && !isLocalEnvironment()) {
          setIsSlow(true)
          if (!slowDismissed) setShowSlowBanner(true)
        } else {
          setIsSlow(false)
          setShowSlowBanner(false)
        }
        return true
      } else {
        // Internal endpoint gave non-200. Check if user actually has outside internet.
        const externalAlive = await pingExternal()
        if (externalAlive) {
          // Internet is active! Origin server is just compiling or briefly returning 50x.
          consecutiveFailuresRef.current = 0
          setIsOnline(true)
          setShowOfflineBanner(false)
          return true
        }

        consecutiveFailuresRef.current += 1
        if (consecutiveFailuresRef.current >= 2) {
          setIsOnline(false)
          setShowOfflineBanner(true)
          return false
        }
        return true
      }
    } catch {
      // Fetch threw or timed out. Check if machine actually has active internet reachability
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const externalAlive = await pingExternal()
        if (externalAlive) {
          // External internet works; server compilation or cold start caused local timeout
          consecutiveFailuresRef.current = 0
          setIsOnline(true)
          setShowOfflineBanner(false)
          return true
        }
      }

      consecutiveFailuresRef.current += 1
      // Require at least 2 consecutive failures or native navigator.onLine === false before declaring offline
      if (consecutiveFailuresRef.current >= 2 || (typeof navigator !== 'undefined' && !navigator.onLine)) {
        setIsOnline(false)
        setShowOfflineBanner(true)
        return false
      }
      return true
    } finally {
      setIsChecking(false)
    }
  }, [slowDismissed, isLocalEnvironment, pingExternal])

  // Auto-recovery polling: When offline banner is visible, periodically attempt to restore in background
  useEffect(() => {
    if (showOfflineBanner) {
      if (autoRetryTimerRef.current) clearInterval(autoRetryTimerRef.current)
      autoRetryTimerRef.current = setInterval(() => {
        checkConnection()
      }, 7000)
    } else {
      if (autoRetryTimerRef.current) clearInterval(autoRetryTimerRef.current)
    }
    return () => {
      if (autoRetryTimerRef.current) clearInterval(autoRetryTimerRef.current)
    }
  }, [showOfflineBanner, checkConnection])

  // Monitor Network Information API & event listeners
  useEffect(() => {
    hasMounted.current = true
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    const handleOnline = () => {
      if (offlineDebounceTimerRef.current) clearTimeout(offlineDebounceTimerRef.current)
      consecutiveFailuresRef.current = 0
      setIsOnline(true)
      setShowOfflineBanner(false)
      setShowRestoredBanner(true)

      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current)
      restoredTimerRef.current = setTimeout(() => {
        setShowRestoredBanner(false)
      }, 3500)

      // Verify connection via ping quietly
      checkConnection()
    }

    const handleOffline = () => {
      // Debounce offline notification to avoid false alarms from brief OS/NIC renegotiation
      if (offlineDebounceTimerRef.current) clearTimeout(offlineDebounceTimerRef.current)
      offlineDebounceTimerRef.current = setTimeout(() => {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setIsOnline(false)
          setShowRestoredBanner(false)
          setShowOfflineBanner(true)
          setShowSlowBanner(false)
        }
      }, 2500)
    }

    // Inspect Network Information API if supported
    const updateConnectionInfo = () => {
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const conn = (navigator as any).connection
        if (conn) {
          const type = conn.effectiveType || '4g'
          const roundTrip = conn.rtt || 0
          const bandwidth = conn.downlink || 10

          setEffectiveType(type)
          setRtt(roundTrip)
          setDownlink(bandwidth)

          // On localhost, skip false-positive slow network alerts from Chrome's fluctuating connection estimator
          if (isLocalEnvironment()) {
            setIsSlow(false)
            setShowSlowBanner(false)
            return
          }

          // Strict threshold: Slow 2G, 2G, or 3G with extreme latency (>2500ms), or severe bandwidth (<0.1 Mbps)
          const isNetworkSlow =
            type === 'slow-2g' ||
            type === '2g' ||
            (type === '3g' && roundTrip > 2500) ||
            (type !== '4g' && bandwidth < 0.1 && roundTrip > 2000)

          if (isNetworkSlow && navigator.onLine) {
            setIsSlow(true)
            if (!slowDismissed) {
              setShowSlowBanner(true)
            }
          } else {
            setIsSlow(false)
            setShowSlowBanner(false)
          }
        }
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection
      if (conn) {
        updateConnectionInfo()
        conn.addEventListener('change', updateConnectionInfo)
      }
    }

    // Periodic heartbeat check every 45 seconds when window is active (skip on localhost if online)
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        if (isLocalEnvironment() && navigator.onLine) {
          return // Avoid spamming local dev server
        }
        checkConnection()
      }
    }, 45000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Debounce 1.5s after returning to tab so OS can resume Wi-Fi / TLS handshakes
        setTimeout(() => {
          if (document.visibilityState === 'visible') {
            const now = Date.now()
            // Only ping if at least 30s has passed since last check
            if (now - lastCheckTimeRef.current > 30000) {
              checkConnection()
            }
          }
        }, 1500)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (offlineDebounceTimerRef.current) clearTimeout(offlineDebounceTimerRef.current)
      if (typeof navigator !== 'undefined' && 'connection' in navigator) {
        const conn = (navigator as any).connection
        if (conn) {
          conn.removeEventListener('change', updateConnectionInfo)
        }
      }
      clearInterval(interval)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current)
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current)
      if (autoRetryTimerRef.current) clearInterval(autoRetryTimerRef.current)
    }
  }, [checkConnection, slowDismissed, isLocalEnvironment])

  return (
    <NetworkStatusContext.Provider
      value={{
        isOnline,
        isSlow,
        effectiveType,
        rtt,
        downlink,
        checkConnection,
      }}
    >
      {/* Top Floating Network Notification Bar */}
      <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex flex-col items-center justify-start px-3 pt-2 sm:pt-3">
        <AnimatePresence>
          {/* 🔴 OFFLINE / DISCONNECTED STATE */}
          {showOfflineBanner && (
            <motion.div
              key="offline-banner"
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl bg-rose-600/95 backdrop-blur-md text-white shadow-[0_10px_35px_rgba(225,29,72,0.35)] border border-rose-400/50 p-3 sm:p-3.5 mb-2 ring-1 ring-black/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative h-9 w-9 shrink-0 rounded-xl bg-white/20 flex items-center justify-center">
                    <WifiOff className="h-5 w-5 text-white animate-pulse" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-300 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black tracking-wide uppercase">No Internet Connection</h4>
                    <p className="text-[11px] text-rose-100 truncate font-medium">
                      You are offline. Please check your WiFi or mobile data.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => checkConnection()}
                    disabled={isChecking}
                    className="shrink-0 flex items-center gap-1.5 bg-white text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                    <span>{isChecking ? 'Checking...' : 'Retry'}</span>
                  </button>
                  <button
                    onClick={() => setShowOfflineBanner(false)}
                    title="Dismiss"
                    className="p-1.5 rounded-xl hover:bg-white/20 text-white/90 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* 🟢 BACK ONLINE RESTORED STATE */}
          {showRestoredBanner && !showOfflineBanner && (
            <motion.div
              key="restored-banner"
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl bg-emerald-600/95 backdrop-blur-md text-white shadow-[0_10px_35px_rgba(5,150,105,0.35)] border border-emerald-400/50 p-3 sm:p-3.5 mb-2 ring-1 ring-black/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-white/20 flex items-center justify-center">
                    <Wifi className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-black tracking-wide uppercase">Back Online!</h4>
                    <p className="text-[11px] text-emerald-100 truncate font-medium">
                      Internet connection restored. Everything is synced.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowRestoredBanner(false)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-white/20 text-emerald-100 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* 🟡 SLOW / WEAK INTERNET STATE */}
          {showSlowBanner && !showOfflineBanner && !showRestoredBanner && (
            <motion.div
              key="slow-banner"
              initial={{ opacity: 0, y: -40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -40, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="pointer-events-auto w-full max-w-lg overflow-hidden rounded-2xl bg-amber-400/95 backdrop-blur-md text-slate-950 shadow-[0_10px_35px_rgba(251,191,36,0.35)] border border-amber-300 p-3 sm:p-3.5 mb-2 ring-1 ring-black/10"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 shrink-0 rounded-xl bg-black/10 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5 text-amber-950" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-black tracking-wide uppercase text-slate-950">Slow Internet Connection</h4>
                      {effectiveType && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-black/10 text-slate-900 font-bold uppercase">
                          {effectiveType}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-800 truncate font-medium">
                      Unstable network detected. Uploading or loading data may take longer.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => checkConnection()}
                    disabled={isChecking}
                    title="Check connection"
                    className="p-1.5 rounded-lg bg-black/10 hover:bg-black/20 text-slate-950 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    onClick={dismissSlowBanner}
                    title="Dismiss"
                    className="p-1.5 rounded-lg hover:bg-black/10 text-slate-900 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {children}
    </NetworkStatusContext.Provider>
  )
}
