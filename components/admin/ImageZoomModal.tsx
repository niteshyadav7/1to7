'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Maximize2,
  Minimize2,
  ExternalLink,
  Download,
  X,
  RotateCcw as ResetIcon,
  Eye,
  Loader2,
  Move
} from 'lucide-react'

export interface ImageZoomModalProps {
  src: string
  alt?: string
  title?: string
  subtitle?: string
  onClose: () => void
}

const ZOOM_PRESETS = [1, 1.5, 2, 3]

export default function ImageZoomModal({
  src,
  alt = 'Screenshot Proof',
  title,
  subtitle,
  onClose
}: ImageZoomModalProps) {
  const [scale, setScale] = useState<number>(1)
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [rotation, setRotation] = useState<number>(0)
  const [isDragging, setIsDragging] = useState<boolean>(false)
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [hasError, setHasError] = useState<boolean>(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  // Reset all transform adjustments
  const handleReset = useCallback(() => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
  }, [])

  // Zoom adjustments with bounds [0.5, 5]
  const handleZoom = useCallback((direction: 'in' | 'out', step = 0.25) => {
    setScale((prev) => {
      const next = direction === 'in' ? prev + step : prev - step
      const clamped = Math.min(Math.max(0.5, next), 5)
      if (clamped <= 1) {
        setPosition({ x: 0, y: 0 })
      }
      return parseFloat(clamped.toFixed(2))
    })
  }, [])

  const handleSetScale = useCallback((targetScale: number) => {
    setScale(targetScale)
    if (targetScale <= 1) {
      setPosition({ x: 0, y: 0 })
    }
  }, [])

  // Rotate adjustments
  const handleRotate = useCallback((direction: 'cw' | 'ccw') => {
    setRotation((prev) => (direction === 'cw' ? (prev + 90) % 360 : (prev - 90 + 360) % 360))
  }, [])

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87
    setScale((prev) => {
      const next = Math.min(Math.max(0.5, prev * zoomFactor), 5)
      if (next <= 1) {
        setPosition({ x: 0, y: 0 })
      }
      return parseFloat(next.toFixed(2))
    })
  }, [])

  // Double click toggles between 1x and 2.5x
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setScale((prev) => {
      if (prev > 1.05) {
        setPosition({ x: 0, y: 0 })
        return 1
      }
      return 2.5
    })
  }, [])

  // Drag to pan
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return // Left click only
      // Allow dragging whenever zoomed or slightly offset
      setIsDragging(true)
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    },
    [position.x, position.y]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    },
    [isDragging, dragStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch support for pinch & drag
  const touchStartRef = useRef<{ dist: number; x: number; y: number; posX: number; posY: number }>({
    dist: 0,
    x: 0,
    y: 0,
    posX: 0,
    posY: 0
  })

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        setIsDragging(true)
        touchStartRef.current = {
          dist: 0,
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          posX: position.x,
          posY: position.y
        }
      } else if (e.touches.length === 2) {
        setIsDragging(false)
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        touchStartRef.current.dist = Math.hypot(dx, dy)
      }
    },
    [position]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1 && isDragging) {
        const dx = e.touches[0].clientX - touchStartRef.current.x
        const dy = e.touches[0].clientY - touchStartRef.current.y
        setPosition({
          x: touchStartRef.current.posX + dx,
          y: touchStartRef.current.posY + dy
        })
      } else if (e.touches.length === 2 && touchStartRef.current.dist > 0) {
        const dx = e.touches[0].clientX - e.touches[1].clientX
        const dy = e.touches[0].clientY - e.touches[1].clientY
        const currentDist = Math.hypot(dx, dy)
        const ratio = currentDist / touchStartRef.current.dist
        setScale((prev) => {
          const next = Math.min(Math.max(0.5, prev * ratio), 5)
          return parseFloat(next.toFixed(2))
        })
        touchStartRef.current.dist = currentDist
      }
    },
    [isDragging]
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    touchStartRef.current.dist = 0
  }, [])

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return
    if (!document.fullscreenElement) {
      containerRef.current
        .requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(() => setIsFullscreen((prev) => !prev))
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false))
    }
  }, [])

  // Listen to browser fullscreen changes
  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          onClose()
          break
        case '+':
        case '=':
          e.preventDefault()
          handleZoom('in')
          break
        case '-':
        case '_':
          e.preventDefault()
          handleZoom('out')
          break
        case '0':
        case 'r':
        case 'R':
          e.preventDefault()
          handleReset()
          break
        case '[':
          e.preventDefault()
          handleRotate('ccw')
          break
        case ']':
          e.preventDefault()
          handleRotate('cw')
          break
        case 'f':
        case 'F':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'ArrowUp':
          if (scale > 1) {
            e.preventDefault()
            setPosition((p) => ({ ...p, y: p.y + 40 }))
          }
          break
        case 'ArrowDown':
          if (scale > 1) {
            e.preventDefault()
            setPosition((p) => ({ ...p, y: p.y - 40 }))
          }
          break
        case 'ArrowLeft':
          if (scale > 1) {
            e.preventDefault()
            setPosition((p) => ({ ...p, x: p.x + 40 }))
          }
          break
        case 'ArrowRight':
          if (scale > 1) {
            e.preventDefault()
            setPosition((p) => ({ ...p, x: p.x - 40 }))
          }
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose, handleZoom, handleReset, handleRotate, toggleFullscreen, scale])

  // Download handler
  const handleDownload = useCallback(async () => {
    try {
      const response = await fetch(src)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      const safeTitle = (title || alt || 'screenshot').replace(/[^a-z0-9_-]/gi, '_')
      link.download = `${safeTitle}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(src, '_blank')
    }
  }, [src, title, alt])

  const displayTitle = title || alt || 'Order Proof Screenshot'

  return (
    <AnimatePresence>
      <div
        ref={containerRef}
        className="fixed inset-0 z-[150] flex flex-col bg-slate-950/95 backdrop-blur-md select-none overflow-hidden"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Top Header Bar */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 flex items-center justify-between px-4 sm:px-6 py-3 bg-slate-900/80 border-b border-white/10 backdrop-blur-md shadow-lg"
        >
          {/* Left: Title & Info */}
          <div className="flex items-center gap-3 min-w-0 pr-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 shrink-0 shadow-xs">
              <Eye className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white truncate">{displayTitle}</h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 text-slate-300 border border-white/10">
                  {Math.round(scale * 100)}%
                </span>
                {rotation !== 0 && (
                  <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {rotation}°
                  </span>
                )}
              </div>
              {subtitle && (
                <p className="text-xs text-slate-400 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Rotate Left */}
            <button
              onClick={() => handleRotate('ccw')}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Rotate Left 90° ( [ )"
            >
              <RotateCcw className="h-4 w-4" />
            </button>

            {/* Rotate Right */}
            <button
              onClick={() => handleRotate('cw')}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Rotate Right 90° ( ] )"
            >
              <RotateCw className="h-4 w-4" />
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              className="hidden sm:inline-flex p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>

            {/* Open Original in New Tab */}
            <a
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Open raw original image in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>

            {/* Download Image */}
            <button
              onClick={handleDownload}
              className="hidden sm:inline-flex p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="Download image"
            >
              <Download className="h-4 w-4" />
            </button>

            <div className="h-5 w-px bg-white/15 mx-1" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-red-500/80 text-white transition-colors cursor-pointer shadow-sm"
              title="Close viewer (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>

        {/* Central Viewport / Canvas */}
        <div
          className={`relative flex-1 w-full h-full flex items-center justify-center overflow-hidden ${
            scale > 1
              ? isDragging
                ? 'cursor-grabbing'
                : 'cursor-grab'
              : 'cursor-zoom-in'
          }`}
          onWheel={handleWheel}
          onDoubleClick={handleDoubleClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Subtle Grid Background Pattern */}
          <div
            className="absolute inset-0 opacity-15 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.2) 1px, transparent 0)',
              backgroundSize: '24px 24px'
            }}
          />

          {/* Loading Spinner */}
          {isLoading && !hasError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
              <p className="text-xs font-medium">Loading high-resolution image...</p>
            </div>
          )}

          {/* Error Message */}
          {hasError && (
            <div className="flex flex-col items-center justify-center gap-2 p-6 rounded-2xl bg-slate-900 border border-red-500/30 text-center max-w-sm">
              <p className="text-sm font-bold text-red-400">Unable to load image preview</p>
              <p className="text-xs text-slate-400">The screenshot URL may be expired or inaccessible.</p>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Try Opening in Tab
              </a>
            </div>
          )}

          {/* The Image Element */}
          <div
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale}) rotate(${rotation}deg)`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)'
            }}
            className="max-w-[92vw] max-h-[78vh] flex items-center justify-center pointer-events-auto"
          >
            <img
              ref={imgRef}
              src={src}
              alt={alt}
              draggable={false}
              onLoad={() => setIsLoading(false)}
              onError={() => {
                setIsLoading(false)
                setHasError(true)
              }}
              className="max-w-[90vw] max-h-[76vh] object-contain rounded-xl shadow-2xl border border-white/10 pointer-events-none select-none transition-shadow"
            />
          </div>
        </div>

        {/* Floating Bottom Toolbar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-20 pb-4 pt-2 px-4 flex flex-col items-center gap-2"
        >
          {/* Main Controls Pill */}
          <div className="flex items-center gap-1 sm:gap-2 px-3 py-2 rounded-2xl bg-slate-900/90 border border-white/15 backdrop-blur-xl shadow-2xl">
            {/* Zoom Out Button */}
            <button
              onClick={() => handleZoom('out')}
              disabled={scale <= 0.5}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Zoom Out ( - )"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            {/* Zoom Presets */}
            <div className="hidden sm:flex items-center gap-1 px-1">
              {ZOOM_PRESETS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleSetScale(preset)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    Math.abs(scale - preset) < 0.05
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {preset * 100}%
                </button>
              ))}
            </div>

            {/* Mobile Current Scale Badge */}
            <div className="sm:hidden px-2 py-1 text-xs font-bold text-white bg-white/10 rounded-lg">
              {Math.round(scale * 100)}%
            </div>

            {/* Zoom In Button */}
            <button
              onClick={() => handleZoom('in')}
              disabled={scale >= 5}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer"
              title="Zoom In ( + )"
            >
              <ZoomIn className="h-4 w-4" />
            </button>

            <div className="h-5 w-px bg-white/15 mx-1" />

            {/* Reset View Button */}
            <button
              onClick={handleReset}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                scale !== 1 || position.x !== 0 || position.y !== 0 || rotation !== 0
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/10'
              }`}
              title="Reset Zoom & Pan ( R / 0 )"
            >
              <ResetIcon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
          </div>

          {/* User Interaction Hints */}
          <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Move className="h-3 w-3 text-slate-400" />
              <span>Scroll to zoom</span>
            </span>
            <span>•</span>
            <span>Drag to pan when zoomed</span>
            <span>•</span>
            <span>Double-click to toggle 100% / 250%</span>
            <span>•</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300 font-mono border border-slate-700">Esc</kbd>
            <span>to close</span>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
