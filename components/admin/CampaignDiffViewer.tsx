'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  History, ArrowRight, User, Calendar, Clock,
  CheckCircle2, Sparkles, ChevronDown, ChevronUp, AlertCircle,
  FileText, ShieldCheck, X
} from 'lucide-react'
import { CampaignEditLogEntry, CampaignEditChange } from '@/lib/utils/campaign-audit-diff'
import { Button } from '@/components/ui/button'

interface CampaignDiffViewerProps {
  editHistory?: CampaignEditLogEntry[] | null
  latestOnly?: boolean
  className?: string
  campaignName?: string
}

export function CampaignRecentDiffBanner({
  entry,
  className = '',
  onViewAllHistory
}: {
  entry: CampaignEditLogEntry
  className?: string
  onViewAllHistory?: () => void
}) {
  const [expanded, setExpanded] = useState(true)

  if (!entry || !entry.changes || entry.changes.length === 0) return null

  return (
    <div className={`rounded-2xl bg-amber-500/10 border border-amber-500/30 overflow-hidden shadow-lg shadow-amber-500/5 ${className}`}>
      {/* Header Bar */}
      <div className="p-3.5 sm:p-4 bg-amber-500/15 border-b border-amber-500/20 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
            <History className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black text-amber-200 uppercase tracking-wider">
                Recent Modifications ({entry.changes_count || entry.changes.length} {entry.changes.length === 1 ? 'Field' : 'Fields'} Changed)
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/30">
                Maker-Checker Review
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 flex items-center gap-1.5 flex-wrap">
              <span>Edited by <strong className="text-amber-300">{entry.edited_by_admin_name || 'Admin'}</strong></span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">{new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewAllHistory && (
            <button
              type="button"
              onClick={onViewAllHistory}
              className="text-[11px] font-bold text-amber-300 hover:text-amber-200 underline cursor-pointer px-2 py-1 rounded-lg hover:bg-amber-500/10"
            >
              Full History Log
            </button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-amber-300 hover:bg-amber-500/20 transition-colors cursor-pointer"
            title={expanded ? 'Collapse diff' : 'Expand diff'}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Diff Table */}
      {expanded && (
        <div className="p-3 sm:p-4 space-y-2.5 overflow-x-auto">
          <div className="min-w-[480px] space-y-2">
            {entry.changes.map((change, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 items-center p-2.5 rounded-xl bg-slate-950/60 border border-white/5 text-xs text-slate-200"
              >
                {/* Field Name */}
                <div className="col-span-4 min-w-0 pr-2">
                  <span className="font-bold text-slate-300 block truncate">{change.label}</span>
                  <span className="text-[9px] font-mono uppercase text-slate-500">{change.category}</span>
                </div>

                {/* Old Value */}
                <div className="col-span-3 min-w-0">
                  <div className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-300 line-through text-[11px] truncate font-medium" title={change.old_display}>
                    {change.old_display}
                  </div>
                </div>

                {/* Arrow */}
                <div className="col-span-1 flex justify-center text-amber-400/80">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>

                {/* New Value */}
                <div className="col-span-4 min-w-0">
                  <div className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] truncate" title={change.new_display}>
                    {change.new_display}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export function CampaignEditHistoryModal({
  isOpen,
  onClose,
  campaignName,
  editHistory
}: {
  isOpen: boolean
  onClose: () => void
  campaignName?: string
  editHistory?: CampaignEditLogEntry[] | null
}) {
  if (!isOpen) return null

  const historyList = Array.isArray(editHistory) ? editHistory : []

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-400 flex items-center justify-center">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">Campaign Edit Audit Trail</h3>
                <p className="text-xs text-slate-400">
                  {campaignName ? `Version history for ${campaignName}` : 'Chronological log of all modifications'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Timeline Content */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            {historyList.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <ShieldCheck className="h-10 w-10 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-slate-300">No modifications recorded yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  When any admin modifies campaign details, field-level before & after diffs will be archived here.
                </p>
              </div>
            ) : (
              historyList.map((entry, eIdx) => (
                <div
                  key={entry.id || eIdx}
                  className="rounded-2xl bg-slate-950/60 border border-white/10 overflow-hidden"
                >
                  <div className="p-3.5 bg-white/5 border-b border-white/5 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-300 font-black text-xs flex items-center justify-center">
                        #{historyList.length - eIdx}
                      </span>
                      <span className="text-xs font-bold text-slate-200">
                        {entry.edited_by_admin_name || 'Admin'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        ({entry.edited_by_admin_email || 'admin'})
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {new Date(entry.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>

                  <div className="p-3 sm:p-4 space-y-2">
                    <div className="text-xs font-semibold text-amber-300 mb-2">
                      {entry.summary}
                    </div>
                    <div className="space-y-1.5">
                      {entry.changes.map((change, cIdx) => (
                        <div
                          key={cIdx}
                          className="grid grid-cols-12 gap-2 items-center p-2 rounded-lg bg-slate-900/80 border border-white/5 text-xs"
                        >
                          <div className="col-span-4 text-slate-300 font-semibold truncate">
                            {change.label}
                          </div>
                          <div className="col-span-3 text-rose-400 line-through truncate text-[11px]" title={change.old_display}>
                            {change.old_display}
                          </div>
                          <div className="col-span-1 flex justify-center text-slate-500">
                            <ArrowRight className="h-3 w-3" />
                          </div>
                          <div className="col-span-4 text-emerald-400 font-bold truncate text-[11px]" title={change.new_display}>
                            {change.new_display}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 bg-slate-950/40 flex justify-end">
            <Button
              type="button"
              onClick={onClose}
              className="h-9 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs cursor-pointer"
            >
              Close History Log
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
