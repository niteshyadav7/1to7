'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Loader2, UploadCloud, Send, CheckCircle2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface FormField {
  name: string
  type: string
  required: boolean
  options?: string[]
}

interface Application {
  id: string
  form_data?: {
    order_details?: Record<string, any>
    rejection_reason?: string
  }
  campaigns: {
    brand_name: string
    order_form?: boolean
    order_form_fields?: FormField[]
  }
}

export default function OrderVerificationModal({
  isOpen,
  onClose,
  application,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  application: Application | null
  onSuccess: () => void
}) {
  const [orderFormData, setOrderFormData] = useState<Record<string, any>>({})
  const [uploadingFields, setUploadingFields] = useState<Record<string, boolean>>({})
  const [submitting, setSubmitting] = useState(false)

  // Derive order fields dynamically from campaign configuration
  const fields = application?.campaigns?.order_form_fields || []

  // Initialize fields on open
  useEffect(() => {
    if (isOpen && application) {
      const activeFields = application.campaigns?.order_form_fields || []
      const existingData = application.form_data?.order_details || {}
      const initial: Record<string, any> = {}
      activeFields.forEach(f => {
        initial[f.name] = existingData[f.name] || ''
      })
      setOrderFormData(initial)
    }
  }, [isOpen, application])

  if (!isOpen || !application) return null

  // Check if standard validation passes
  const isFormValid = () => {
    if (fields.length === 0) return true
    return fields.filter(f => f.required).every(f => {
      const val = orderFormData[f.name]
      return val !== undefined && val !== null && String(val).trim() !== ''
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
    const file = e.target.files?.[0]
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP images are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB')
      return
    }

    setUploadingFields(p => ({ ...p, [fieldName]: true }))

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Upload failed')

      setOrderFormData(p => ({ ...p, [fieldName]: data.url }))
      toast.success('Image uploaded successfully')
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload image')
    } finally {
      setUploadingFields(p => ({ ...p, [fieldName]: false }))
    }
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const res = await fetch(`/api/dashboard/applications/${application.id}/order`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderFormData }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to submit order details')

      toast.success('Order details submitted successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && application && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-20">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" 
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-lg bg-white border border-slate-200/80 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden text-slate-900"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 sm:p-6 pb-4 bg-slate-50 border-b border-slate-200/80 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shadow-2xs shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-extrabold text-slate-900">
                    Campaign Verification
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {application.campaigns?.brand_name || 'Campaign'} Order Details
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
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 no-scrollbar scrollbar-none">
              {/* Notice Banner */}
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-4 flex gap-3 items-start shrink-0">
                <div className="mt-0.5 w-5 h-5 rounded-full bg-amber-500/20 text-amber-700 flex items-center justify-center font-bold text-xs shrink-0">i</div>
                <p className="text-xs sm:text-sm font-medium text-amber-900 leading-snug">
                  Please fill all required details including the screenshot to enable the submit button.
                </p>
              </div>

              {/* Form Fields Card */}
              <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4 sm:p-5 space-y-4 shadow-2xs">
                {fields.length === 0 ? (
                  <div className="text-center py-8 px-4 text-slate-500 text-sm">
                    No verification form fields have been configured for this campaign by the admin.
                  </div>
                ) : (
                  fields.map((field, idx) => (
                    <div key={`of-${idx}`} className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-600 uppercase tracking-wider px-0.5 flex items-center gap-1">
                        {field.name}
                        {field.required && <span className="text-red-500">*</span>}
                      </label>
                      
                      {field.type === 'dropdown' ? (
                        <Select
                          value={orderFormData[field.name] || ""}
                          onValueChange={(val) => setOrderFormData(p => ({ ...p, [field.name]: val }))}
                        >
                          <SelectTrigger className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl focus:ring-amber-500 shadow-2xs">
                            <SelectValue placeholder={`Select ${field.name}`} />
                          </SelectTrigger>
                          <SelectContent className="bg-white border-slate-200 text-slate-900 shadow-xl max-h-[300px] rounded-xl">
                            {field.options?.map(opt => (
                              <SelectItem key={opt} value={opt} className="cursor-pointer focus:bg-slate-100 text-slate-800">{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : field.type === 'textarea' ? (
                        <textarea
                          value={orderFormData[field.name] || ''}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOrderFormData(p => ({ ...p, [field.name]: e.target.value }))}
                          placeholder={`Enter ${field.name}...`}
                          rows={3}
                          className="w-full bg-white border border-slate-200 text-slate-900 text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 resize-none placeholder:text-slate-400 font-medium shadow-2xs"
                        />
                      ) : field.type === 'image' ? (
                        <div className="space-y-2">
                          {orderFormData[field.name] ? (
                            <div className="relative rounded-2xl border border-slate-200 overflow-hidden bg-slate-100 aspect-video max-h-[200px] flex items-center justify-center">
                              <img src={orderFormData[field.name]} alt={field.name} className="max-w-full max-h-full object-contain" />
                              <button
                                type="button"
                                onClick={() => setOrderFormData(p => ({ ...p, [field.name]: '' }))}
                                className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-red-500 transition-colors shadow-md cursor-pointer"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <label className="relative flex flex-col items-center justify-center w-full h-36 rounded-2xl border-2 border-dashed border-slate-300 hover:border-amber-500 bg-white hover:bg-amber-50/20 transition-all cursor-pointer group shadow-2xs">
                              {uploadingFields[field.name] ? (
                                <div className="flex flex-col items-center gap-2">
                                  <Loader2 className="h-6 w-6 text-amber-500 animate-spin" />
                                  <span className="text-xs font-semibold text-slate-500">Uploading...</span>
                                </div>
                              ) : (
                                <>
                                  <UploadCloud className="h-8 w-8 text-amber-500 group-hover:scale-110 mb-2 transition-transform" />
                                  <span className="text-sm font-bold text-slate-800">Tap to select image</span>
                                  <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">PNG, JPG, WEBP formats supported (Max 5MB)</span>
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/png, image/jpeg, image/webp"
                                className="hidden"
                                disabled={uploadingFields[field.name]}
                                onChange={(e) => handleImageUpload(e, field.name)}
                              />
                            </label>
                          )}
                        </div>
                      ) : (
                        <Input
                          value={orderFormData[field.name] || ''}
                          type={field.type === 'number' ? 'number' : 'text'}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOrderFormData(p => ({ ...p, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                          placeholder={`Enter ${field.name}...`}
                          className="bg-white border-slate-200 text-slate-900 h-11 rounded-xl focus-visible:ring-amber-500 placeholder:text-slate-400 font-medium text-sm shadow-2xs"
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200/80 flex gap-3 shrink-0">
              <Button
                variant="outline"
                onClick={onClose}
                className="flex-1 h-11 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs uppercase tracking-wider bg-white cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !isFormValid() || Object.values(uploadingFields).some(Boolean)}
                className="flex-[2] h-11 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center transition-all disabled:opacity-50 cursor-pointer shadow-md shadow-amber-500/20"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit Details <Send className="ml-2 h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
