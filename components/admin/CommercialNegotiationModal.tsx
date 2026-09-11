'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, IndianRupee, MessageSquare, Clock, CheckCircle2,
  AlertTriangle, ShieldCheck, UserCheck, Loader2, User,
  Instagram, Users, ExternalLink, Sparkles
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { useAdminPermissions } from '@/components/admin/AdminPermissionsContext'
import { getInstagramDisplayHandle, getInstagramUrl } from '@/lib/instagram-utils'

interface CommercialNegotiationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  application: any
  currentAdminEmail?: string
}

export default function CommercialNegotiationModal({
  isOpen,
  onClose,
  onSuccess,
  application,
  currentAdminEmail,
}: CommercialNegotiationModalProps) {
  const { admin } = useAdminPermissions()
  const [amount, setAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const effectiveAdminEmail = (currentAdminEmail || admin?.email || '').toLowerCase()
  const effectiveAdminId = admin?.id || ''
  const effectiveAdminName = admin?.name || admin?.email || 'Admin'

  const negotiation = application?.form_data?.negotiation || {}
  const history = negotiation.history || []
  const isPending = negotiation.status === 'pending_peer_approval'
  const isApproved = negotiation.status === 'approved'

  const proposedById = negotiation.proposed_by_id || ''
  const proposedByName = negotiation.proposed_by_name || ''
  const proposedByEmail = negotiation.proposed_by_email || ''

  // Current admin is the proposer if ID matches or Email/Name matches
  const isProposer = isPending && (
    Boolean(effectiveAdminId && proposedById === effectiveAdminId) ||
    Boolean(effectiveAdminEmail && (
      (proposedByEmail && proposedByEmail.toLowerCase() === effectiveAdminEmail) ||
      (proposedByName && proposedByName.toLowerCase() === effectiveAdminEmail) ||
      (effectiveAdminName && proposedByName.toLowerCase() === effectiveAdminName.toLowerCase())
    ))
  )

  useEffect(() => {
    if (application) {
      setAmount(
        String(
          negotiation.proposed_amount ||
          application.form_data?.commercial_amount ||
          application.form_data?.agreed_commercial ||
          application.form_data?.total_deal ||
          application.pending_amount ||
          ''
        )
      )
      setNotes('')
    }
  }, [application, negotiation.proposed_amount])

  if (!isOpen || !application) return null

  const creatorName = application.users?.full_name || 'Creator'
  const instagramHandle = application.users?.instagram_username
    ? getInstagramDisplayHandle(application.users.instagram_username)
    : ''
  const instagramUrl = application.users?.instagram_username
    ? getInstagramUrl(application.users.instagram_username)
    : ''
  const followersCount = application.users?.followers || 0
  const campaignBrand = application.campaigns?.brand_name || 'Campaign'

  const handlePropose = async () => {
    const num = parseFloat(amount)
    if (isNaN(num) || num < 0) {
      toast.error('Please enter a valid commercial amount (0 or more)')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/applications/${application.id}/commercial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'propose',
          amount: num,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit quote')

      toast.success(data.message || 'Commercial deal proposed! Waiting for colleague approval.')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to propose deal')
    } finally {
      setSubmitting(false)
    }
  }

  const handleApprove = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/applications/${application.id}/commercial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Approval failed')

      toast.success(data.message || 'Deal approved successfully! Creator is now Approved.')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Approval failed')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReject = async () => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/admin/applications/${application.id}/commercial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Rejection failed')

      toast.success(data.message || 'Commercial quote rejected.')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]"
        >
          {/* Header */}
          <div className="bg-slate-950/80 p-5 border-b border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shadow-md">
                <IndianRupee className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  Creator Commercial Deal
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Paid Variable
                  </span>
                </h3>
                <p className="text-xs text-slate-400">Maker-Checker Dual Approval (Colleague Review Required)</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Creator Profile Summary Card */}
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500/20 to-yellow-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold shrink-0">
                  {creatorName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate flex items-center gap-1.5">
                    {creatorName}
                  </p>
                  <div className="flex items-center gap-2.5 text-xs text-slate-400 mt-0.5">
                    {instagramHandle && (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-pink-400 hover:underline flex items-center gap-1 truncate"
                      >
                        <Instagram className="h-3 w-3 shrink-0" />
                        <span className="truncate">{instagramHandle}</span>
                        <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-70" />
                      </a>
                    )}
                    {followersCount > 0 && (
                      <span className="flex items-center gap-1 text-slate-400 shrink-0">
                        <Users className="h-3 w-3 text-slate-500" />
                        {Number(followersCount).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Campaign</span>
                <span className="text-xs font-bold text-white truncate max-w-[120px] block">{campaignBrand}</span>
              </div>
            </div>

            {/* Active Pending Proposal Alert */}
            {isPending && (
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-md flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Pending Colleague Approval
                  </span>
                  <span className="text-base font-extrabold text-amber-200">
                    ₹{Number(negotiation.proposed_amount).toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Proposed by <strong className="text-white">{negotiation.proposed_by_name || 'Admin'}</strong> on{' '}
                  {new Date(negotiation.proposed_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}.
                </p>
                {negotiation.notes && (
                  <div className="p-2.5 bg-slate-950/70 rounded-xl border border-white/5 text-xs text-slate-300">
                    <span className="text-slate-500 font-bold uppercase text-[10px] block mb-0.5">
                      Negotiation Notes from Proposer:
                    </span>
                    {negotiation.notes}
                  </div>
                )}

                {/* Maker Notice */}
                {isProposer && (
                  <div className="p-2.5 bg-amber-500/15 rounded-xl border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
                    <span>
                      <strong>Maker-Checker Policy:</strong> You proposed this amount. A colleague must log in to approve this deal. You cannot approve your own proposal.
                    </span>
                  </div>
                )}

                {/* Checker Notice */}
                {!isProposer && (
                  <div className="p-2.5 bg-emerald-500/15 rounded-xl border border-emerald-500/20 text-xs text-emerald-300 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
                    <span>
                      <strong>Colleague Review:</strong> Please verify the negotiated deal of ₹{Number(negotiation.proposed_amount).toLocaleString()}. Click <strong>Approve Deal</strong> below to approve both the commercial and creator application.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Approved Deal Banner */}
            {isApproved && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-emerald-300">Deal Approved & Locked</p>
                    <p className="text-[11px] text-slate-400">
                      Approved by <strong className="text-white">{negotiation.approved_by_name}</strong> for{' '}
                      <strong className="text-emerald-300">₹{Number(negotiation.proposed_amount || negotiation.approved_amount || 0).toLocaleString()}</strong>
                    </p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/20 px-2 py-1 rounded-lg">
                  Approved
                </span>
              </div>
            )}

            {/* Notice for new negotiation */}
            {!isPending && !isApproved && (
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 flex items-start gap-2">
                <Sparkles className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
                <span>
                  After discussing and negotiating with the creator, enter the agreed amount below. Your proposal will then require approval from a colleague before this application is approved.
                </span>
              </div>
            )}

            {/* Input Section for Proposing / Countering */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {isPending ? 'Update / Counter Negotiated Amount (₹)' : 'Final Negotiated Commercial Amount (₹)'}
                </Label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 7500"
                    className="bg-slate-950/60 border-white/10 text-white pl-8 h-11 text-sm font-mono focus:ring-amber-500 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Negotiation Notes & Rationale
                </Label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Discussed with creator on call. Agreed on 1 Reel + 2 Stories for ₹7,500..."
                  rows={3}
                  className="w-full bg-slate-950/60 border border-white/10 text-white text-xs rounded-xl p-3 focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none placeholder:text-slate-500"
                />
              </div>
            </div>

            {/* Negotiation History Log */}
            {history.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-white/10">
                <h4 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Audit History ({history.length})
                </h4>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {history.map((h: any, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">
                          {h.action === 'approved' ? '🟢 Approved' : h.action === 'rejected' ? '🔴 Rejected' : '🟡 Proposed'}: ₹{Number(h.amount || 0).toLocaleString()}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(h.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        By <strong className="text-slate-300">{h.by_name}</strong> {h.notes ? `— "${h.notes}"` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-2.5 shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              className="rounded-xl border-white/10 text-slate-300 hover:bg-white/5 bg-transparent text-xs h-10 cursor-pointer"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {/* If pending and current user is a colleague (NOT the proposer) -> Colleague approves deal */}
              {isPending && !isProposer && (
                <>
                  <Button
                    type="button"
                    onClick={handleReject}
                    disabled={submitting}
                    className="rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs h-10 px-3 cursor-pointer"
                  >
                    Reject Quote
                  </Button>
                  <Button
                    type="button"
                    onClick={handleApprove}
                    disabled={submitting}
                    className="rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs h-10 px-4 cursor-pointer shadow-md shadow-emerald-500/20"
                  >
                    {submitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve Deal (Colleague)
                      </>
                    )}
                  </Button>
                </>
              )}

              {/* If pending and current user IS the proposer -> Show waiting notice or update quote */}
              <Button
                type="button"
                onClick={handlePropose}
                disabled={submitting || !amount}
                className="rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-extrabold text-xs h-10 px-4 cursor-pointer shadow-md shadow-amber-500/20 disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  isPending ? 'Update / Counter Quote' : 'Propose Deal to Colleague'
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
