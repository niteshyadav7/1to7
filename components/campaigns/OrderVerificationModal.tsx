'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ClipboardList, Loader2, UploadCloud, Image as ImageIcon } from 'lucide-react'
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
  campaigns: {
    brand_name: string
    order_form: boolean
    order_form_fields: FormField[]
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

  // Initialize fields on open
  useEffect(() => {
    if (isOpen && application?.campaigns?.order_form_fields) {
      const initial: Record<string, any> = {}
      application.campaigns.order_form_fields.forEach(f => {
        initial[f.name] = ''
      })
      setOrderFormData(initial)
    }
  }, [isOpen, application])

  if (!isOpen || !application) return null

  const fields = application.campaigns.order_form_fields || []

  // Check if standard validation passes
  const isFormValid = () => {
    return fields.filter(f => f.required).every(f => !!orderFormData[f.name])
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
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-20">
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
          className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-emerald-400" />
                Upload Order Details
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                For {application.campaigns.brand_name}
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex gap-3">
              <ClipboardList className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <p className="text-xs font-medium text-emerald-200 leading-relaxed">
                Please fill all required details including the screenshot or order ID to confirm your purchase.
              </p>
            </div>

            <div className="space-y-5">
              {fields.map((field, idx) => (
                <div key={`of-${idx}`} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex items-center gap-2">
                    {field.name}
                    {field.required && <span className="text-red-400">*</span>}
                  </label>
                  
                  {field.type === 'dropdown' ? (
                    <Select
                      value={orderFormData[field.name] || ""}
                      onValueChange={(val) => setOrderFormData(p => ({ ...p, [field.name]: val }))}
                    >
                      <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus:ring-emerald-500">
                        <SelectValue placeholder={`Select ${field.name}`} />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10 text-white max-h-[300px]">
                        {field.options?.map(opt => (
                          <SelectItem key={opt} value={opt} className="cursor-pointer">{opt}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'textarea' ? (
                    <textarea
                      value={orderFormData[field.name] || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setOrderFormData(p => ({ ...p, [field.name]: e.target.value }))}
                      placeholder={`Enter ${field.name}...`}
                      rows={3}
                      className="w-full bg-white/5 border border-white/10 text-white text-sm rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none placeholder:text-slate-600"
                    />
                  ) : field.type === 'image' ? (
                    <div className="space-y-2">
                      {orderFormData[field.name] ? (
                        <div className="relative rounded-xl border border-white/10 overflow-hidden bg-white/5 aspect-video max-h-[200px] flex items-center justify-center">
                          <img src={orderFormData[field.name]} alt={field.name} className="max-w-full max-h-full object-contain" />
                          <button
                            type="button"
                            onClick={() => setOrderFormData(p => ({ ...p, [field.name]: '' }))}
                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-500/80 transition-colors"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="relative flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-white/10 hover:border-emerald-500/50 bg-white/5 hover:bg-emerald-500/5 transition-all cursor-pointer group">
                          {uploadingFields[field.name] ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="h-6 w-6 text-emerald-500 animate-spin" />
                              <span className="text-xs text-slate-400">Uploading...</span>
                            </div>
                          ) : (
                            <>
                              <UploadCloud className="h-8 w-8 text-slate-400 group-hover:text-emerald-400 mb-2 transition-colors" />
                              <span className="text-sm font-medium text-slate-300">Tap to select image</span>
                              <span className="text-[10px] text-slate-500 mt-1">PNG, JPG formats supported</span>
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
                      className="bg-white/5 border-white/10 text-white h-12 rounded-xl focus-visible:ring-emerald-500"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 flex gap-4">
            <Button
              variant="ghost"
              onClick={onClose}
              className="flex-1 h-12 rounded-xl text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !isFormValid() || Object.values(uploadingFields).some(Boolean)}
              className="flex-[2] h-12 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold shadow-lg shadow-emerald-500/20"
            >
              {submitting ? 'Submitting...' : 'Submit Details 🚀'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
