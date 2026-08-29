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
  const [slowDismissed, setSlowDismissed] = useState<boolean>(false)
  const [isChecking, setIsChecking] = useState<boolean>(false)

  const hasMounted = useRef(false)
  const restoredTimerRef = useRef<NodeJS.Timeout | null>(null)
  const slowTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Active ping function to check internet connectivity & response latency
  const checkConnection = useCallback(async (): Promise<boolean> => {
    setIsChecking(true)
    const startTime = performance.now()
    try {
      // Use no-cache fetch to our health endpoint with a 6-second timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 6000)

      const res = await fetch(`/api/health?t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)
      const duration = performance.now() - startTime

      if (res.ok) {
        setIsOnline(true)
        setShowOfflineBanner(false)

        // If latency is over 2500ms, mark as slow
        if (duration > 2500) {
          setIsSlow(true)
          if (!slowDismissed) setShowSlowBanner(true)
        } else {
          setIsSlow(false)
          setShowSlowBanner(false)
        }
        return true
      } else {
        setIsOnline(false)
        setShowOfflineBanner(true)
        return false
      }
    } catch {
      // If fetch failed completely or timed out
      setIsOnline(false)
      setShowOfflineBanner(true)
      return false
    } finally {
      setIsChecking(false)
    }
  }, [slowDismissed])

  // Monitor Network Information API & event listeners
  useEffect(() => {
    hasMounted.current = true
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    const handleOnline = () => {
      setIsOnline(true)
      setShowOfflineBanner(false)
      setShowRestoredBanner(true)

      if (restoredTimerRef.current) clearTimeout(restoredTimerRef.current)
      restoredTimerRef.current = setTimeout(() => {
        setShowRestoredBanner(false)
      }, 3500)

      // Verify connection via ping
      checkConnection()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowRestoredBanner(false)
      setShowOfflineBanner(true)
      setShowSlowBanner(false)
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

          // Slow 2G, 2G or High Latency (>1800ms) or Downlink (<0.3 Mbps)
          const isNetworkSlow =
            type === 'slow-2g' ||
            type === '2g' ||
            (type === '3g' && roundTrip > 1800) ||
            bandwidth < 0.35

          if (isNetworkSlow && navigator.onLine) {
            setIsSlow(true)
            if (!slowDismissed) {
              setShowSlowBanner(true)
            }
          } else {
            setIsSlow(false)
            setShowSlowBanner(false)
            setSlowDismissed(false)
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

    // Periodic heartbeat check every 30 seconds when window is active
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        checkConnection()
      }
    }, 30000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkConnection()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
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
    }
  }, [checkConnection, slowDismissed])

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

                <button
                  onClick={() => checkConnection()}
                  disabled={isChecking}
                  className="shrink-0 flex items-center gap-1.5 bg-white text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Checking...' : 'Retry'}</span>
                </button>
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
                    onClick={() => {
                      setShowSlowBanner(false)
                      setSlowDismissed(true)
                    }}
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
