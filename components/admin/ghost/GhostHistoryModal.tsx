'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  History,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  User,
  MessageSquare,
  FileImage,
  Loader2,
  ExternalLink,
} from 'lucide-react'
import ImageZoomModal from '@/components/admin/ImageZoomModal'
import type { GhostEventRecord } from '@/lib/services/ghost.service'

interface GhostHistoryModalProps {
  applicationId?: string
  userId?: string
  creatorName?: string
  brandName?: string
  title?: string
  isOpen: boolean
  onClose: () => void
}

export function GhostHistoryModal({
  applicationId,
  userId,
  creatorName = 'Creator',
  brandName,
  title,
  isOpen,
  onClose,
}: GhostHistoryModalProps) {
  const [events, setEvents] = useState<GhostEventRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [zoomImage, setZoomImage] = useState<{ src: string; title: string } | null>(null)

  useEffect(() => {
    if (!isOpen) return

    let isMounted = true
    setLoading(true)

    const fetchHistory = async () => {
      try {
        let url = ''
        if (applicationId) {
          url = `/api/admin/applications/${applicationId}/ghost`
        } else if (userId) {
          url = `/api/admin/influencers/${userId}/ghost-history`
        }

        if (!url) return

        const res = await fetch(url)
        if (res.ok) {
          const json = await res.json()
          if (isMounted) {
            setEvents(json.history || [])
          }
        }
      } catch (err) {
        console.error('Failed to load ghost history:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchHistory()

    return () => {
      isMounted = false
    }
  }, [isOpen, applicationId, userId])

  if (!isOpen) return null

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-lg">
                  👻
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    {title || 'Ghost & Accountability Audit Trail'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {creatorName} {brandName ? `• ${brandName}` : ''}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-rose-500" />
                  <p className="text-xs">Loading accountability records...</p>
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-16 bg-slate-950/40 border border-dashed border-white/10 rounded-xl p-6">
                  <ShieldCheck className="h-12 w-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                  <h4 className="text-sm font-bold text-white">Clean Accountability Record</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    No ghosting incidents or accountability penalties have been recorded for this collaboration.
                  </p>
                </div>
              ) : (
                <div className="relative pl-6 space-y-8 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-white/10">
                  {events.map((event, idx) => {
                    const isGhosted = event.action === 'ghosted'
                    return (
                      <div key={event.id || idx} className="relative group">
                        {/* Timeline Node Icon */}
                        <div
                          className={`absolute -left-[30px] top-0 h-6 w-6 rounded-full flex items-center justify-center border text-xs shadow-md ${
                            isGhosted
                              ? 'bg-rose-950 border-rose-500 text-rose-400 ring-4 ring-slate-900'
                              : 'bg-emerald-950 border-emerald-500 text-emerald-400 ring-4 ring-slate-900'
                          }`}
                        >
                          {isGhosted ? '👻' : '✓'}
                        </div>

                        {/* Card */}
                        <div
                          className={`rounded-xl border p-4 transition-all shadow-md ${
                            isGhosted
                              ? 'bg-rose-950/20 border-rose-500/30'
                              : 'bg-emerald-950/20 border-emerald-500/30'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider ${
                                  isGhosted
                                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {isGhosted ? 'Marked Ghosted' : 'Un-ghosted / Restored'}
                              </span>
                              {event.brand_name && (
                                <span className="text-xs text-slate-300 font-semibold">
                                  {event.brand_name}{' '}
                                  <span className="text-slate-500 text-[10px]">
                                    ({event.campaign_code})
                                  </span>
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              {new Date(event.created_at).toLocaleString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          {/* Reason Badge */}
                          <div className="mt-3">
                            <span className="text-xs font-semibold text-slate-200">
                              Reason Category:{' '}
                              <span
                                className={`font-bold ${
                                  isGhosted ? 'text-rose-300' : 'text-emerald-300'
                                }`}
                              >
                                {event.reason_category}
                              </span>
                            </span>
                          </div>

                          {/* Remarks / Comment */}
                          <div className="mt-2.5 p-3 rounded-lg bg-black/40 border border-white/5">
                            <p className="text-xs text-slate-300 leading-relaxed italic">
                              &ldquo;{event.comment}&rdquo;
                            </p>
                          </div>

                          {/* Proof Screenshots */}
                          {event.proof_urls && event.proof_urls.length > 0 && (
                            <div className="mt-3.5 space-y-1.5">
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                <FileImage className="h-3.5 w-3.5 text-indigo-400" />
                                <span>
                                  Verified Proof Screenshots ({event.proof_urls.length})
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {event.proof_urls.map((url, pIdx) => (
                                  <button
                                    key={pIdx}
                                    type="button"
                                    onClick={() =>
                                      setZoomImage({
                                        src: url,
                                        title: `${isGhosted ? 'Ghost' : 'Unghost'} Proof #${
                                          pIdx + 1
                                        } (${event.reason_category})`,
                                      })
                                    }
                                    className="relative group/thumb h-16 w-16 rounded-lg overflow-hidden border border-white/10 hover:border-indigo-400 hover:ring-2 hover:ring-indigo-500/50 transition-all cursor-pointer bg-slate-950"
                                  >
                                    <img
                                      src={url}
                                      alt={`Proof ${pIdx + 1}`}
                                      className="h-full w-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-bold">
                                      Zoom
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Action Author Attribution */}
                          <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-500" />
                              Action recorded by:{' '}
                              <strong className="text-slate-200">
                                {event.actor_name || 'Admin'}
                              </strong>
                              {event.actor_role && (
                                <span className="text-[10px] text-slate-500 capitalize">
                                  ({event.actor_role})
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/60 flex items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-white transition-colors cursor-pointer"
              >
                Close Audit Record
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Proof Zoom Viewer */}
      {zoomImage && (
        <ImageZoomModal
          src={zoomImage.src}
          title={zoomImage.title}
          subtitle={creatorName}
          onClose={() => setZoomImage(null)}
        />
      )}
    </>
  )
}
