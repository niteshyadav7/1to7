'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Instagram,
  AlertCircle,
  Loader2,
  Check,
  ShieldCheck,
  History,
  ArrowRight,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import InstagramLogTimeline from './InstagramLogTimeline'

interface LinkedProfile {
  id: string
  username: string
  followers?: number
  is_primary?: boolean
}

interface ChangeInstagramProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (updated: any) => void
  applicationId: string
  creatorName?: string
  currentAppliedHandle?: string
}

export default function ChangeInstagramProfileModal({
  isOpen,
  onClose,
  onSuccess,
  applicationId,
  creatorName,
  currentAppliedHandle
}: ChangeInstagramProfileModalProps) {
  const [loadingDetails, setLoadingDetails] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'change' | 'history'>('change')

  // Form states
  const [newHandle, setNewHandle] = useState('')
  const [reason, setReason] = useState('')
  const [makePrimary, setMakePrimary] = useState(false)

  // API data
  const [linkedProfiles, setLinkedProfiles] = useState<LinkedProfile[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [appliedInfo, setAppliedInfo] = useState<any>(null)
  const [isMismatch, setIsMismatch] = useState(false)

  useEffect(() => {
    if (isOpen && applicationId) {
      loadApplicationDetails()
      setActiveTab('change')
      setNewHandle('')
      setReason('')
      setMakePrimary(false)
    }
  }, [isOpen, applicationId])

  const loadApplicationDetails = async () => {
    try {
      setLoadingDetails(true)
      const res = await fetch(`/api/admin/applications/${applicationId}/instagram-profile`)
      const data = await res.json()
      if (res.ok) {
        setLinkedProfiles(data.linkedProfiles || [])
        setLogs(data.logs || [])
        setAppliedInfo(data.applied)
        setIsMismatch(Boolean(data.isMismatch))
      }
    } catch (err: any) {
      console.error('Failed to load application profile details:', err)
    } finally {
      setLoadingDetails(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleaned = newHandle.replace(/^@/, '').trim()
    if (!cleaned) {
      toast.error('Please enter an Instagram handle')
      return
    }

    if (!reason || reason.trim().length < 4) {
      toast.error('Please enter a valid reason for audit logging (min 4 characters)')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch(`/api/admin/applications/${applicationId}/instagram-profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: cleaned,
          reason: reason.trim(),
          make_primary: makePrimary
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update Instagram profile')

      toast.success(data.message || `Profile updated to @${cleaned}`)
      onSuccess?.(data)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to change Instagram profile')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 p-5 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
                <Instagram className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Campaign Instagram Profile
                  {isMismatch && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Mismatch
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  {creatorName ? `Creator: ${creatorName}` : 'Manage locked submission profile'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/40 px-5 pt-2">
            <button
              onClick={() => setActiveTab('change')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'change'
                  ? 'border-pink-500 text-pink-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Instagram className="h-3.5 w-3.5" />
              Change Profile
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-indigo-500 text-indigo-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              Audit Logs ({logs.length})
            </button>
          </div>

          {/* Body */}
          <div className="p-5 overflow-y-auto flex-1">
            {loadingDetails ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-pink-500" />
                <span className="text-xs">Loading profile consistency state...</span>
              </div>
            ) : activeTab === 'history' ? (
              <InstagramLogTimeline logs={logs} emptyMessage="No Instagram changes recorded yet for this application." />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Current Applied Banner */}
                <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Currently Locked For Campaign
                    </span>
                    <div className="text-sm font-bold text-white flex items-center gap-2 mt-0.5">
                      <span className="text-pink-400">
                        @{appliedInfo?.username || currentAppliedHandle || 'None'}
                      </span>
                      {appliedInfo?.followers ? (
                        <span className="text-xs font-normal text-slate-400">
                          ({appliedInfo.followers.toLocaleString()} followers)
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {isMismatch && (
                    <div className="flex items-center gap-1 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Not in creator profile</span>
                    </div>
                  )}
                </div>

                {/* Quick-Pick From Creator's Linked Profiles */}
                {linkedProfiles.length > 0 && (
                  <div>
                    <Label className="text-xs text-slate-300 font-semibold mb-2 block">
                      Select From Creator's Linked Profiles:
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {linkedProfiles.map((p) => {
                        const isCurrent =
                          appliedInfo?.username &&
                          p.username.toLowerCase() === appliedInfo.username.toLowerCase()
                        const isSelected =
                          newHandle.replace(/^@/, '').toLowerCase() === p.username.toLowerCase()
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => setNewHandle(p.username)}
                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'border-pink-500 bg-pink-500/10 text-white'
                                : 'border-slate-800 bg-slate-950/40 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="font-semibold text-xs flex items-center gap-1.5 truncate">
                                @{p.username}
                                {p.is_primary && (
                                  <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-medium">
                                    Primary
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="text-[9px] bg-pink-500/20 text-pink-300 px-1.5 py-0.2 rounded font-medium">
                                    Current
                                  </span>
                                )}
                              </div>
                              {p.followers !== undefined && (
                                <div className="text-[11px] text-slate-400">
                                  {p.followers.toLocaleString()} followers
                                </div>
                              )}
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-pink-400 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Or Custom Handle */}
                <div className="space-y-1.5">
                  <Label htmlFor="new-handle" className="text-xs text-slate-300 font-semibold">
                    Or Enter Different Instagram Handle / URL:
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-500 font-mono">@</span>
                    <Input
                      id="new-handle"
                      placeholder="username or instagram.com/username"
                      value={newHandle}
                      onChange={(e) => setNewHandle(e.target.value)}
                      className="pl-7 bg-slate-950 border-slate-800 text-white text-xs h-9 focus-visible:ring-pink-500/30"
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 pt-0.5">
                    <Info className="h-3 w-3 text-slate-500 shrink-0" />
                    <span>This will automatically link this profile into the creator's Profile section.</span>
                  </p>
                </div>

                {/* Audit Reason Required */}
                <div className="space-y-1.5">
                  <Label htmlFor="override-reason" className="text-xs text-slate-300 font-semibold flex items-center justify-between">
                    <span>Reason for Changing Profile *</span>
                    <span className="text-[10px] text-pink-400 font-normal">Audit logged</span>
                  </Label>
                  <textarea
                    id="override-reason"
                    rows={2}
                    placeholder="e.g. Creator changed main account per manager approval; old account was restricted"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 p-2.5 text-xs text-white placeholder:text-slate-500 focus:border-pink-500 focus:outline-none focus:ring-1 focus:ring-pink-500/30"
                  />
                </div>

                {/* Toggle: Also set as user's primary profile */}
                <label className="flex items-center gap-2 cursor-pointer pt-1 text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={makePrimary}
                    onChange={(e) => setMakePrimary(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-pink-500 focus:ring-pink-500/30"
                  />
                  <span>Also set as creator's primary account</span>
                </label>

                {/* Submit Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting || !newHandle.trim() || reason.trim().length < 4}
                    className="bg-pink-600 hover:bg-pink-500 text-white font-semibold text-xs h-9 px-4 rounded-xl gap-2 shadow-lg shadow-pink-600/20 disabled:opacity-50"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Updating Profile...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Confirm & Log Change</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
