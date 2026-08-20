'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, X, Share2, PlusSquare, Smartphone, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface PwaContextType {
  isInstallable: boolean
  isInstalled: boolean
  isIos: boolean
  installApp: () => Promise<void>
  showIosGuide: boolean
  setShowIosGuide: (show: boolean) => void
}

const PwaContext = createContext<PwaContextType>({
  isInstallable: false,
  isInstalled: false,
  isIos: false,
  installApp: async () => {},
  showIosGuide: false,
  setShowIosGuide: () => {},
})

export const usePwa = () => useContext(PwaContext)

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // 1. Check if already installed / standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    if (isStandalone) {
      setIsInstalled(true)
      return
    }

    // 2. Check if user dismissed banner in this session
    const dismissed = sessionStorage.getItem('pwa_banner_dismissed')
    if (dismissed === 'true') {
      setBannerDismissed(true)
    }

    // 3. Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream
    setIsIos(isIosDevice)

    if (isIosDevice && !isStandalone) {
      setIsInstallable(true)
    }

    // 4. Check for early captured prompt
    if (typeof window !== 'undefined' && (window as any).__deferredPwaPrompt) {
      setDeferredPrompt((window as any).__deferredPwaPrompt)
      setIsInstallable(true)
    }

    const handlePromptReady = () => {
      if ((window as any).__deferredPwaPrompt) {
        setDeferredPrompt((window as any).__deferredPwaPrompt)
        setIsInstallable(true)
      }
    }
    window.addEventListener('pwa-prompt-ready', handlePromptReady)

    // 5. Register Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('SW: Registered successfully with scope:', reg.scope)
        })
        .catch((err) => {
          console.warn('SW: Registration failed:', err)
        })
    }

    // 6. Handle beforeinstallprompt event for Android / Chrome / Edge
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      const promptEvent = e as BeforeInstallPromptEvent
      ;(window as any).__deferredPwaPrompt = promptEvent
      setDeferredPrompt(promptEvent)
      setIsInstallable(true)
    }

    // 7. Handle app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setIsInstallable(false)
      setDeferredPrompt(null)
      if (typeof window !== 'undefined') {
        ;(window as any).__deferredPwaPrompt = null
      }
      sessionStorage.removeItem('pwa_banner_dismissed')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('pwa-prompt-ready', handlePromptReady)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const [showGenericGuide, setShowGenericGuide] = useState(false)

  const installApp = async () => {
    if (isIos) {
      setShowIosGuide(true)
      return
    }

    const promptEvent = deferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt : null)

    if (promptEvent) {
      try {
        await promptEvent.prompt()
        const choice = await promptEvent.userChoice
        if (choice.outcome === 'accepted') {
          setIsInstalled(true)
          setIsInstallable(false)
        }
        setDeferredPrompt(null)
        if (typeof window !== 'undefined') {
          ;(window as any).__deferredPwaPrompt = null
        }
      } catch (err) {
        console.error('Error during PWA installation:', err)
      }
    } else {
      // Show Android/Desktop browser guide modal
      setShowGenericGuide(true)
    }
  }

  const dismissBanner = () => {
    setBannerDismissed(true)
    sessionStorage.setItem('pwa_banner_dismissed', 'true')
  }

  const shouldShowBanner = mounted && !isInstalled && isInstallable && !bannerDismissed

  return (
    <PwaContext.Provider
      value={{
        isInstallable,
        isInstalled,
        isIos,
        installApp,
        showIosGuide,
        setShowIosGuide,
      }}
    >
      {children}

      {/* 1-Tap Floating Install Banner */}
      <AnimatePresence>
        {shouldShowBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 pointer-events-auto"
          >
            <div className="relative overflow-hidden rounded-2xl bg-white/95 backdrop-blur-md border border-slate-200/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5">
              {/* Subtle top brand accent bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500" />

              <div className="flex items-center justify-between gap-3">
                {/* App Icon + Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 p-0.5 shadow-sm">
                    <div className="h-full w-full rounded-[10px] bg-slate-900 flex items-center justify-center">
                      <span className="font-extrabold text-xs text-white tracking-tight">1⚡7</span>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-xs font-extrabold text-charcoal-surface truncate">1to7 Media</h4>
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-1.5 py-0.2 text-[9px] font-bold text-amber-700 border border-amber-200/60">
                        <Sparkles className="h-2.5 w-2.5 text-amber-600" />
                        App
                      </span>
                    </div>
                    <p className="text-[11px] text-secondary truncate mt-0.5">
                      Install app for instant 1-tap access
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    onClick={installApp}
                    size="sm"
                    className="h-9 px-3.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-bold text-xs shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    App
                  </Button>

                  <button
                    onClick={dismissBanner}
                    aria-label="Close install prompt"
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Android / Browser Install Guide Modal */}
      <AnimatePresence>
        {showGenericGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowGenericGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-extrabold text-xs">
                    1⚡7
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-charcoal-surface">Install 1to7 App</h3>
                    <p className="text-xs text-secondary">Follow these simple steps</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGenericGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Tap the <strong>⋮ (Three Dots Menu)</strong>
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Located at the top right of your Chrome / browser window.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="h-6 w-6 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">
                      Select <strong>&quot;Install and create shortcut&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      The 1to7 app icon will be added to your home screen!
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowGenericGuide(false)}
                className="w-full h-10 rounded-xl bg-[#febd1c] hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
              >
                Got it!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIosGuide && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIosGuide(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-slate-100"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-extrabold text-xs">
                    1⚡7
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-charcoal-surface">Install 1to7 on iOS</h3>
                    <p className="text-xs text-secondary">Follow these 2 simple steps</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIosGuide(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 pt-2 text-xs text-slate-700">
                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      Tap the <Share2 className="h-3.5 w-3.5 text-blue-600 inline" /> Share button
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Located in the Safari toolbar at the bottom of your screen.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="h-6 w-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                      Select <PlusSquare className="h-3.5 w-3.5 text-amber-600 inline" /> Add to Home Screen
                    </p>
                    <p className="text-slate-500 text-[11px] mt-0.5">
                      Scroll down and tap &quot;Add to Home Screen&quot; to place the app on your home screen.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => setShowIosGuide(false)}
                className="w-full h-10 rounded-xl bg-charcoal-surface text-white font-bold text-xs cursor-pointer"
              >
                Got it!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PwaContext.Provider>
  )
}
