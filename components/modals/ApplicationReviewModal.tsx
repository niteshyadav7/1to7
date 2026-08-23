'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, MapPin, Store, Tag, Instagram, Calendar, CheckCircle2, ClipboardList } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getInstagramUrl } from '@/lib/instagram-utils'

interface ApplicationReviewModalProps {
  isOpen: boolean
  onClose: () => void
  application: any
}

export default function ApplicationReviewModal({
  isOpen,
  onClose,
  application,
}: ApplicationReviewModalProps) {
  if (!isOpen || !application) return null

  const camp = application.campaigns || {}
  const formData = application.form_data || {}
  const selectedStore = application.selected_store

  // Filter out internal metadata keys
  const excludedKeys = [
    'payment_request',
    'completion_submission',
    'requests',
    'total_deal',
    'rejection_reason',
    'revocation_note',
    'order_details',
    'order_details_approved',
  ]

  const customEntries = Object.entries(formData).filter(
    ([key]) => !excludedKeys.includes(key)
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 max-h-[85vh]"
        >
          {/* Header */}
          <div className="bg-slate-50 p-5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Submitted Application</h3>
                <p className="text-xs text-slate-500 font-medium">{camp.brand_name || 'Campaign'} • <span className="font-mono font-bold text-slate-700">{camp.campaign_code}</span></p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4 overflow-y-auto flex-1">
            {/* Status & Date */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
              <div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Status</p>
                <p className="text-xs font-bold text-slate-800 mt-0.5">{application.status}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Applied Date</p>
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  {new Date(application.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Selected Store Branch if applicable */}
            {selectedStore && (
              <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-2xl space-y-1">
                <p className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5" /> Selected Store Branch
                </p>
                <p className="text-xs font-bold text-purple-950">{selectedStore.name}</p>
                {selectedStore.address && (
                  <p className="text-[11px] text-purple-800 leading-snug">{selectedStore.address}</p>
                )}
              </div>
            )}

            {/* Form Responses / Questions */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
                Your Form Answers ({customEntries.length})
              </h4>

              {customEntries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {customEntries.map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs font-semibold text-slate-800 break-words">
                        {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val) || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">
                  No additional custom questions were required for this campaign.
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200/80 bg-slate-50 flex justify-end">
            <Button
              onClick={onClose}
              className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-5 h-10 cursor-pointer"
            >
              Close Review
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
