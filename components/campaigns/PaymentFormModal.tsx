'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, CreditCard, Loader2, UploadCloud } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/components/providers/AuthProvider'

interface PaymentFormModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  application: any // Using any for simplicity here to match existing flows
}

export default function PaymentFormModal({ isOpen, onClose, onSuccess, application }: PaymentFormModalProps) {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [uploadingField, setUploadingField] = useState<string | null>(null)
  
  const paymentFields: any[] = application?.campaigns?.payment_form_fields || []
  const [formData, setFormData] = useState<Record<string, string>>({})

  // Format the bank details string for the read-only box
  const bankDetailsString = user 
    ? `${user.account_name || ''}\n${user.account_number || ''}\n${user.ifsc_code || ''}`
    : 'No bank details found.'

  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {
        'live_date': '',
        'payment_reason': '',
        'payment_amount': '',
        'supporting_document': ''
      }
      paymentFields.forEach(f => {
        initial[f.name] = ''
      })
      setFormData(initial)
    }
  }, [isOpen, application]) // Removed paymentFields from dependency array to avoid infinite loops

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingField(fieldName)
    try {
      const fd = new FormData()
      fd.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setFormData(prev => ({ ...prev, [fieldName]: data.url }))
      toast.success('Document uploaded successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload document')
    } finally {
      setUploadingField(null)
    }
  }

  const handleSubmit = async () => {
    // Validate core required fields
    const coreFields = [
      { name: 'live_date', label: 'Live Date' },
      { name: 'payment_reason', label: 'Payment Reason' },
      { name: 'payment_amount', label: 'Payment Amount' }
    ]

    for (const field of coreFields) {
      if (!formData[field.name]) {
        toast.error(`"${field.label}" is required`)
        return
      }
    }

    // Validate custom required fields
    for (const field of paymentFields) {
      if (field.required && !formData[field.name]) {
        toast.error(`"${field.name}" is required`)
        return
      }
    }

    try {
      setSubmitting(true)
      
      const res = await fetch(`/api/dashboard/applications/${application?.id}/payment-request`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          bank_details: bankDetailsString
        }),
      })
      
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to submit')
      
      toast.success('Payment Request Submitted Successfully!')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit payment request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
      <div key="payment-form-modal" className="fixed inset-0 z-[110] flex items-center justify-center p-4">
        <motion.div
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           exit={{ opacity: 0 }}
           className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
           onClick={onClose}
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 bg-slate-950/50 border-b border-white/5 shrink-0">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-400" />
              Payment Form
            </h2>
            <button 
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-800 [&::-webkit-scrollbar-thumb]:rounded-full">
            
            {/* Core Field: Live Date */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Live date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                value={formData.live_date || ''}
                onChange={e => setFormData(p => ({ ...p, live_date: e.target.value }))}
                className="bg-slate-950/50 border-white/10 text-white h-11 rounded-xl focus:ring-indigo-500"
              />
            </div>

            {/* Core Field: Payment Reason */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Payment Reason <span className="text-red-500">*</span></Label>
              <textarea
                value={formData.payment_reason || ''}
                onChange={e => setFormData(p => ({ ...p, payment_reason: e.target.value }))}
                placeholder="Explain reason for payment request"
                rows={3}
                className="w-full bg-slate-950/50 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-600"
              />
            </div>

            {/* Dynamic Custom Fields */}
            {paymentFields.map((field, idx) => (
              <div key={`pf-${idx}`} className="space-y-1.5">
                <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex items-center gap-1">
                  {field.name}
                  {field.required && <span className="text-red-500">*</span>}
                </Label>
                
                {field.type === 'dropdown' ? (
                    <Select
                      value={formData[field.name] || ""}
                      onValueChange={(val) => setFormData(p => ({ ...p, [field.name]: val }))}
                    >
                      <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-11 rounded-xl focus:ring-indigo-500">
                        <SelectValue placeholder={`Select ${field.name}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                        {field.options?.map((opt: string) => (
                          <SelectItem key={opt} value={opt} className="cursor-pointer focus:bg-slate-800">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={formData[field.name] || ''}
                    onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))}
                    placeholder={`Enter ${field.name}...`}
                    rows={3}
                    className="w-full bg-slate-950/50 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none placeholder:text-slate-600"
                  />
                ) : field.type === 'image' ? (
                  <>
                    {formData[field.name] ? (
                      <div className="relative rounded-xl border border-white/10 overflow-hidden bg-slate-950 aspect-[3/1] flex items-center justify-center">
                        <img src={formData[field.name]} alt="Document proof" className="max-w-full max-h-full object-contain" />
                        <button
                          type="button"
                          onClick={() => setFormData(p => ({ ...p, [field.name]: '' }))}
                          className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 transition-colors cursor-pointer"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="relative flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-indigo-500 bg-slate-950/50 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                        {uploadingField === field.name ? (
                          <div className="flex flex-col items-center gap-2">
                            <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                          </div>
                        ) : (
                          <>
                            <UploadCloud className="h-6 w-6 text-indigo-500 group-hover:text-indigo-400 mb-1 transition-colors" />
                            <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Click to upload</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingField === field.name}
                          onChange={(e) => handleImageUpload(e, field.name)}
                        />
                      </label>
                    )}
                  </>
                ) : (
                  <div className="relative">
                    {field.type === 'number' && field.name.toLowerCase().includes('amount') && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                    )}
                    <Input
                      type={field.type === 'date' ? 'date' : field.type === 'number' ? 'number' : 'text'}
                      value={formData[field.name] || ''}
                      onChange={e => setFormData(p => ({ ...p, [field.name]: e.target.value }))}
                      placeholder={`Enter ${field.name}`}
                      className={`bg-slate-950/50 border-white/10 text-white h-11 rounded-xl focus:ring-indigo-500 placeholder:text-slate-600 ${field.type === 'number' && field.name.toLowerCase().includes('amount') ? 'pl-8' : ''}`}
                    />
                  </div>
                )}
              </div>
            ))}

            {/* Core Field: Supporting Document */}
            <div className="space-y-1.5 pt-2">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Supporting Document</Label>
              {formData.supporting_document ? (
                <div className="relative rounded-xl border border-white/10 overflow-hidden bg-slate-950 aspect-[3/1] flex items-center justify-center">
                  <img src={formData.supporting_document} alt="Document proof" className="max-w-full max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setFormData(p => ({ ...p, supporting_document: '' }))}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <label className="relative flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed border-white/20 hover:border-indigo-500 bg-slate-950/50 hover:bg-indigo-500/5 transition-all cursor-pointer group">
                  {uploadingField === 'supporting_document' ? (
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="h-6 w-6 text-indigo-500 group-hover:text-indigo-400 mb-1 transition-colors" />
                      <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Click to upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={!!uploadingField}
                    onChange={(e) => handleImageUpload(e, 'supporting_document')}
                  />
                </label>
              )}
            </div>

            {/* Core Field: Payment Amount */}
            <div className="space-y-1.5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider">Payment Amount <span className="text-red-500">*</span></Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₹</span>
                <Input
                  type="number"
                  value={formData.payment_amount || ''}
                  onChange={e => setFormData(p => ({ ...p, payment_amount: e.target.value }))}
                  placeholder="Enter payment amount"
                  className="pl-8 bg-slate-950/50 border-white/10 text-white h-11 rounded-xl focus:ring-indigo-500 placeholder:text-slate-600"
                />
              </div>
            </div>

            {/* Bank Details (Read Only) */}
            <div className="space-y-1.5 pt-4 border-t border-white/5">
              <Label className="text-slate-400 text-xs font-medium uppercase tracking-wider flex justify-between">
                <span>Bank Details <span className="text-red-500">*</span></span>
                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 rounded">Verified</span>
              </Label>
              <textarea
                value={bankDetailsString}
                readOnly
                rows={3}
                className="w-full bg-slate-900 border border-white/10 text-slate-300 text-sm rounded-xl px-4 py-3 resize-none cursor-not-allowed opacity-80"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-slate-950/50 border-t border-white/5 flex gap-4 shrink-0">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 h-12 rounded-2xl border-white/10 text-slate-400 hover:bg-white/5 hover:text-white text-sm font-bold bg-transparent cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !!uploadingField}
              className="flex-1 h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Submitting...' : <>Submit <Send className="ml-2 h-4 w-4" /></>}
            </Button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  )
}
