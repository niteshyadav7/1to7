'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  UploadCloud,
  FileImage,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Trash2,
  Sparkles,
  Clipboard,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { GHOST_REASONS, UNGHOST_REASONS } from '@/lib/constants/ghost-reasons'

export type GhostActionType = 'ghost' | 'unghost' | 'bulk-ghost'

export interface TargetCreatorItem {
  applicationId?: string
  userId?: string
  creatorName: string
  instagramUsername?: string | null
  brandName?: string
  campaignCode?: string
}

interface GhostActionModalProps {
  isOpen: boolean
  actionType: GhostActionType
  /** Single application target (when actionType is 'ghost' or 'unghost') */
  targetCreator?: TargetCreatorItem | null
  /** Bulk application targets (when actionType is 'bulk-ghost') */
  bulkCreators?: TargetCreatorItem[]
  onClose: () => void
  onSuccess: () => void
}

export function GhostActionModal({
  isOpen,
  actionType,
  targetCreator,
  bulkCreators = [],
  onClose,
  onSuccess,
}: GhostActionModalProps) {
  const isUnghosting = actionType === 'unghost'
  const isBulk = actionType === 'bulk-ghost'

  const reasonsList = isUnghosting ? UNGHOST_REASONS : GHOST_REASONS

  const [selectedReason, setSelectedReason] = useState<string>(reasonsList[0])
  const [customReason, setCustomReason] = useState<string>('')
  const [comment, setComment] = useState<string>('')
  const [proofUrls, setProofUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState<boolean>(false)
  const [submitting, setSubmitting] = useState<boolean>(false)
  const [isDragOver, setIsDragOver] = useState<boolean>(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Reset modal state on open
  useEffect(() => {
    if (isOpen) {
      setSelectedReason(reasonsList[0])
      setCustomReason('')
      setComment('')
      setProofUrls([])
      setUploading(false)
      setSubmitting(false)
    }
  }, [isOpen, reasonsList])

  // Handles uploading files to /api/upload
  const handleUploadFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.type)) {
        if (file.size <= 5 * 1024 * 1024) {
          validFiles.push(file)
        } else {
          toast.error(`"${file.name}" exceeds the 5MB file size limit`)
        }
      } else {
        toast.error(`"${file.name}" is not a supported image format`)
      }
    }

    if (validFiles.length === 0) return

    setUploading(true)
    const uploaded: string[] = []

    try {
      for (const file of validFiles) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', 'ghost-proofs')

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData.error || 'Failed to upload image')
        }

        const data = await res.json()
        if (data.url) {
          uploaded.push(data.url)
        }
      }

      setProofUrls(prev => [...prev, ...uploaded])
      toast.success(`${uploaded.length} proof screenshot(s) uploaded successfully`)
    } catch (err: any) {
      console.error('Upload error:', err)
      toast.error(err.message || 'Error uploading screenshots')
    } finally {
      setUploading(false)
    }
  }

  // Support clipboard paste (Ctrl+V) anywhere inside modal
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return

      const pastedFiles: File[] = []
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) pastedFiles.push(file)
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault()
        handleUploadFiles(pastedFiles)
      }
    },
    []
  )

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer?.files) {
      handleUploadFiles(e.dataTransfer.files)
    }
  }

  const handleRemoveProof = (indexToRemove: number) => {
    setProofUrls(prev => prev.filter((_, idx) => idx !== indexToRemove))
  }

  // Effective reason text
  const finalReason =
    selectedReason.startsWith('Other') && customReason.trim()
      ? customReason.trim()
      : selectedReason

  // Validation
  const isCommentValid = comment.trim().length >= 15
  const hasProof = proofUrls.length >= 1
  const isFormValid = Boolean(finalReason) && isCommentValid && hasProof && !uploading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || submitting) return

    setSubmitting(true)
    try {
      if (isBulk) {
        // Bulk Ghost
        const appIds = bulkCreators.map(c => c.applicationId)
        const res = await fetch('/api/admin/applications/ghost/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            application_ids: appIds,
            reason_category: finalReason,
            comment: comment.trim(),
            proof_urls: proofUrls,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to bulk ghost creators')
        }

        toast.success(data.message || `Successfully marked ${data.succeededCount} creators as ghosted`)
        onSuccess()
        onClose()
      } else {
        // Single Ghost or Unghost
        const isUserLevel = Boolean(targetCreator?.userId && !targetCreator?.applicationId)
        const endpoint = isUserLevel
          ? `/api/admin/influencers/${targetCreator!.userId}/ghost`
          : `/api/admin/applications/${targetCreator?.applicationId}/ghost`

        if (!targetCreator?.userId && !targetCreator?.applicationId) {
          throw new Error('Target creator or application not specified')
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: isUnghosting ? 'unghosted' : 'ghosted',
            reason_category: finalReason,
            comment: comment.trim(),
            proof_urls: proofUrls,
          }),
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || 'Failed to update creator ghost status')
        }

        toast.success(
          data.message ||
            (isUnghosting
              ? 'Creator successfully un-ghosted and unblocked'
              : 'Creator marked as ghosted with proof')
        )
        onSuccess()
        onClose()
      }
    } catch (err: any) {
      console.error('Submit ghost action error:', err)
      toast.error(err.message || 'Operation failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        onPaste={handlePaste}
        className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="w-full max-w-xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div
            className={`px-6 py-4 border-b flex items-center justify-between ${
              isUnghosting
                ? 'bg-emerald-950/40 border-emerald-500/20'
                : 'bg-rose-950/40 border-rose-500/20'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`h-10 w-10 rounded-xl flex items-center justify-center text-lg border ${
                  isUnghosting
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {isUnghosting ? '🛡️' : '👻'}
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  {isUnghosting
                    ? 'Un-ghost & Restore Creator'
                    : isBulk
                    ? `Bulk Mark Ghosted (${bulkCreators.length} Creators)`
                    : 'Mark Creator as Ghosted'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isBulk
                    ? `Assigning shared ghosting violation to ${bulkCreators.length} selected creators`
                    : `${targetCreator?.creatorName || 'Creator'} • ${
                        targetCreator?.brandName || (targetCreator?.userId ? 'Direct Account Action' : 'Campaign')
                      }`}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={submitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
            {/* Context Notice */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                isUnghosting
                  ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                  : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
              }`}
            >
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
              <div className="space-y-1">
                <p className="font-bold text-[12px]">
                  {isUnghosting
                    ? 'Mandatory Accountability Reversal Requirement'
                    : 'Strict Accountability Requirement'}
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {isUnghosting
                    ? 'To protect against unjustified unblocking, you must upload verified proof (e.g. deliverable link or creator WhatsApp resolution) and document the explicit reason. This is recorded in the permanent audit trail.'
                    : 'Ghosting will pause this creator from applying to any future campaigns. At least one screenshot proof (e.g. WhatsApp conversation, call attempt log) and a clear explanation are strictly required.'}
                </p>
              </div>
            </div>

            {/* Bulk Creators Roster Preview */}
            {isBulk && bulkCreators.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10 space-y-2">
                <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-indigo-400" />
                    Selected Creators ({bulkCreators.length})
                  </span>
                  <span className="text-[10px] text-slate-500">All will be flagged</span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {bulkCreators.map(c => (
                    <span
                      key={c.applicationId}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[10px] font-mono border border-white/5"
                    >
                      {c.creatorName} {c.instagramUsername ? `(@${c.instagramUsername})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reason Category */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                {isUnghosting ? 'Resolution Reason *' : 'Ghosting Reason Category *'}
              </label>
              <select
                value={selectedReason}
                onChange={e => setSelectedReason(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs focus:outline-hidden focus:border-rose-500/50 cursor-pointer"
              >
                {reasonsList.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>

              {selectedReason.startsWith('Other') && (
                <input
                  type="text"
                  placeholder="Specify custom reason..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs mt-2 focus:outline-hidden focus:border-rose-500/50"
                  required
                />
              )}
            </div>

            {/* Explanation Comment */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Detailed Explanation / Incident Notes *
                </label>
                <span
                  className={`text-[10px] ${
                    isCommentValid ? 'text-emerald-400' : 'text-slate-500'
                  }`}
                >
                  {comment.trim().length} / 15 chars min
                </span>
              </div>
              <textarea
                rows={3}
                placeholder={
                  isUnghosting
                    ? 'Document why this creator is being unghosted (e.g. Creator provided proof of parcel delay, content is now live at https://...)'
                    : 'Describe dates contacted, call attempts, WhatsApp follow-ups, or unposted deliverables...'
                }
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-hidden focus:border-rose-500/50 resize-none leading-relaxed"
                required
              />
            </div>

            {/* Screenshots Proof Upload Zone */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <FileImage className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Mandatory Screenshot Proofs *</span>
                </label>
                <span
                  className={`text-[10px] ${
                    hasProof ? 'text-emerald-400 font-bold' : 'text-rose-400'
                  }`}
                >
                  {proofUrls.length} attached (min 1 required)
                </span>
              </div>

              {/* Drag & drop upload area with paste hint */}
              <div
                onDragOver={e => {
                  e.preventDefault()
                  setIsDragOver(true)
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${
                  isDragOver
                    ? 'border-indigo-400 bg-indigo-500/10'
                    : 'border-white/10 hover:border-white/20 bg-slate-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={e => e.target.files && handleUploadFiles(e.target.files)}
                  className="hidden"
                />

                {uploading ? (
                  <div className="flex flex-col items-center justify-center py-2 text-slate-400 gap-1.5">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                    <p className="text-[11px]">Uploading proof screenshots...</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <UploadCloud className="h-6 w-6 text-indigo-400 mx-auto" />
                    <p className="text-xs font-semibold text-white">
                      Click to browse or drag & drop screenshots
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <Clipboard className="h-3 w-3 text-amber-400" />
                      <span>
                        Tip: You can press <strong className="text-amber-300">Ctrl + V</strong>{' '}
                        anywhere to paste copied screenshots
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Uploaded Thumbnails Preview */}
              {proofUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {proofUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative group h-16 w-16 rounded-lg overflow-hidden border border-white/20 bg-slate-950"
                    >
                      <img
                        src={url}
                        alt={`Proof ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          handleRemoveProof(idx)
                        }}
                        className="absolute inset-0 bg-rose-950/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity cursor-pointer"
                        title="Remove screenshot"
                      >
                        <Trash2 className="h-4 w-4 text-rose-300" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!isFormValid || submitting}
                className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                  !isFormValid || submitting
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50'
                    : isUnghosting
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/50'
                }`}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : isUnghosting ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Confirm Un-ghosting & Restore</span>
                  </>
                ) : isBulk ? (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Confirm Bulk Ghosting ({bulkCreators.length})</span>
                  </>
                ) : (
                  <>
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>Confirm & Mark as Ghosted</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
