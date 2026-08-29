'use client'

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, User, MapPin, Store, Tag, Instagram, Calendar, CheckCircle2,
  ClipboardList, Clock, IndianRupee, FileText, Sparkles, ExternalLink
} from 'lucide-react'
import { Button } from '@/components/ui/button'

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
  const isPaid = (camp.budget_type || '').toLowerCase().includes('paid') || (camp.budget_amount && camp.budget_amount > 0) || (application.commercial_amount && application.commercial_amount > 0)
  const dealValue = application.commercial_amount || camp.budget_amount || 0

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
          className="relative w-full max-w-2xl bg-white border border-slate-200/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-900 max-h-[88vh]"
        >
          {/* Header */}
          <div className="bg-slate-50 p-5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-2xs shrink-0">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <span>{camp.brand_name || 'Campaign'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-md font-bold bg-slate-200/70 text-slate-700 font-mono">
                    {camp.campaign_code}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Deliverables: <span className="font-semibold text-slate-800">{camp.deliverables || 'Social Media Reel / Post'}</span>
                </p>
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
          <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 no-scrollbar scrollbar-none">
            {/* Status & Highlights */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1 shadow-2xs">
                <p className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1">
                  <Tag className="h-3 w-3 text-indigo-600" /> Status
                </p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {application.status}
                </p>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1 shadow-2xs">
                <p className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                  <IndianRupee className="h-3 w-3 text-emerald-600" /> Deal Value
                </p>
                <p className="text-xs font-bold text-emerald-700">
                  {isPaid && dealValue > 0 ? `₹${dealValue.toLocaleString()}` : (camp.budget_type || 'Barter')}
                </p>
              </div>

              <div className="p-3 bg-pink-50/70 border border-pink-100 rounded-xl space-y-1 shadow-2xs">
                <p className="text-[10px] font-bold text-pink-900 uppercase tracking-wider flex items-center gap-1">
                  <Instagram className="h-3 w-3 text-pink-600" /> Platform & Niche
                </p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {camp.platform || 'Instagram'} {camp.category ? `• ${camp.category}` : ''}
                </p>
              </div>

              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-xl space-y-1 shadow-2xs">
                <p className="text-[10px] font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600" /> Applied On
                </p>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {new Date(application.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Campaign Brief PDF Banner if available */}
            {camp.brief_document_url && (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900 to-indigo-900 text-white flex items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-300 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-white">Official Brand Guidelines Document</h4>
                    <p className="text-[10px] text-purple-200">Guidelines & creative references provided by {camp.brand_name}</p>
                  </div>
                </div>
                <a
                  href={camp.brief_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-slate-950 hover:bg-slate-100 text-xs font-bold shrink-0 transition-colors"
                >
                  <FileText className="h-3 w-3 text-purple-700" />
                  View Brief ↗
                </a>
              </div>
            )}

            {/* Campaign Guidelines & Requirements Card */}
            {(camp.requirements || camp.looking_for || camp.additional_info || (camp.product_links && camp.product_links.length > 0)) && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Campaign Guidelines & Overview
                  </span>
                </div>

                {camp.requirements && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Requirements & Guidelines
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                      {camp.requirements}
                    </div>
                  </div>
                )}

                {camp.looking_for && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Target Creator Profile
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-800 font-medium">
                      {camp.looking_for}
                    </div>
                  </div>
                )}

                {camp.additional_info && (
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Additional Notes
                    </p>
                    <div className="p-3 bg-white rounded-xl border border-slate-200/70 text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed">
                      {camp.additional_info}
                    </div>
                  </div>
                )}

                {camp.product_links && camp.product_links.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Product Reference Links
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {camp.product_links.map((link: string, idx: number) => (
                        <a
                          key={idx}
                          href={link.startsWith('http') ? link : `https://${link}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:border-indigo-300 shadow-2xs transition-all"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Product Link #{idx + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Your Submitted Answers ({customEntries.length})
                  </span>
                </div>
              </div>

              {customEntries.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {customEntries.map(([key, val]) => (
                    <div key={key} className="p-2.5 bg-white rounded-xl border border-slate-200/70 space-y-0.5 shadow-2xs">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate">
                        {key.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs font-semibold text-slate-800 break-words">
                        {typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val) || '—'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">
                  No additional questionnaire was required for this campaign.
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
              Close Details
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

