'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

interface FormField {
  id: string
  campaign_code: string
  field_name: string
  field_type: string
  field_options: string[] | null
  is_required: boolean
  field_order: number
}

interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
}

export default function ApplicationFormModal({
  campaign,
  isOpen,
  onClose,
  onSuccess,
}: {
  campaign: Campaign | null
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [fields, setFields] = useState<FormField[]>([])
  const [formData, setFormData] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [fieldsLoading, setFieldsLoading] = useState(false)

  // Fetch form config when modal opens
  useEffect(() => {
    if (isOpen && campaign) {
      fetchFormConfig()
    }
  }, [isOpen, campaign])

  const fetchFormConfig = async () => {
    if (!campaign) return
    setFieldsLoading(true)
    try {
      const res = await fetch(`/api/apply/form-config/${campaign.campaign_code}`)
      const data = await res.json()
      if (data.formConfig) {
        setFields(data.formConfig)
        // Initialize formData with empty strings
        const initialData: Record<string, string> = {}
        data.formConfig.forEach((f: FormField) => {
          initialData[f.field_name] = ''
        })
        setFormData(initialData)
      }
    } catch {
      toast.error('Failed to load application form')
    } finally {
      setFieldsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaign) return

    // Validate required fields
    for (const field of fields) {
      if (field.is_required && !formData[field.field_name]?.trim()) {
        toast.error(`"${field.field_name}" is required`)
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          formData,
        }),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Application failed')

      toast.success('🎉 Application submitted successfully!')
      onSuccess()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!campaign) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900/95 backdrop-blur-xl shadow-2xl">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 rounded-full p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="p-6 pb-4 border-b border-white/10">
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  Apply to {campaign.brand_name}
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  Fill in the details below to submit your application
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                {fieldsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                  </div>
                ) : fields.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">No additional information needed.</p>
                    <p className="text-slate-500 text-xs mt-1">Click below to submit your application directly!</p>
                  </div>
                ) : (
                  fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label className="text-slate-300 font-medium text-sm">
                        {field.field_name}
                        {field.is_required && <span className="text-pink-400 ml-1">*</span>}
                      </Label>

                      {field.field_type === 'textarea' ? (
                        <textarea
                          value={formData[field.field_name] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                          }
                          placeholder={`Enter ${field.field_name.toLowerCase()}...`}
                          rows={3}
                          className="w-full bg-slate-950/50 border border-white/10 text-white placeholder:text-slate-500 text-sm rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none"
                        />
                      ) : field.field_type === 'dropdown' && field.field_options ? (
                        <Select
                          value={formData[field.field_name] || ''}
                          onValueChange={(value) =>
                            setFormData((prev) => ({ ...prev, [field.field_name]: value }))
                          }
                        >
                          <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-10 text-sm rounded-lg focus:ring-purple-500 transition-all">
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-white/10 text-white rounded-xl shadow-2xl">
                            {(Array.isArray(field.field_options)
                              ? field.field_options
                              : JSON.parse(field.field_options as unknown as string)
                            ).map((option: string) => (
                              <SelectItem
                                key={option}
                                value={option}
                                className="focus:bg-purple-500/20 focus:text-purple-300 cursor-pointer"
                              >
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={field.field_type === 'number' ? 'number' : 'text'}
                          value={formData[field.field_name] || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                          }
                          placeholder={`Enter ${field.field_name.toLowerCase()}...`}
                          className="bg-slate-950/50 border-white/10 text-white placeholder:text-slate-500 h-10 px-4 text-sm focus-visible:ring-purple-500 transition-all rounded-lg"
                        />
                      )}
                    </div>
                  ))
                )}

                {/* Submit */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all active:scale-[0.98] mt-2 group cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      Submit Application
                      <Send className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
