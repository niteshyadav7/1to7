'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Loader2, Pencil, MessageSquare, CheckCircle, ChevronDown, Layout, User, Users } from 'lucide-react'
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
  const [pitch, setPitch] = useState('')
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

    if (!pitch.trim()) {
      toast.error('Please provide a pitch/comment for your application')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: campaign.id,
          formData: { ...formData, 'pitch': pitch.trim() },
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
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-slate-900 shadow-2xl flex flex-col">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-6 right-6 z-10 rounded-full p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Header */}
              <div className="p-8 pb-6 bg-gradient-to-b from-white/[0.03] to-transparent border-b border-white/5">
                <div className="flex items-center gap-3 mb-2">
                   <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                      <Send className="h-5 w-5 text-purple-400" />
                   </div>
                   <h2 className="text-xl font-bold text-white tracking-tight">
                    Apply to Campaign
                  </h2>
                </div>
                
                {/* Campaign Info Bar */}
                <div className="flex items-center gap-6 mt-4 py-3 px-4 rounded-xl bg-white/[0.02] border border-white/5">
                   <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Campaign</p>
                      <p className="text-sm font-semibold text-purple-400">N/A</p>
                   </div>
                   <div className="w-px h-8 bg-white/5" />
                   <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Brand</p>
                      <p className="text-sm font-semibold text-white">{campaign.brand_name}</p>
                   </div>
                </div>
              </div>

              {/* Form Content */}
              <div className="flex-1 overflow-y-auto p-8 pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {fieldsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="h-10 w-10 text-purple-500 animate-spin" />
                      <p className="text-sm text-slate-500 font-medium">Preparing application form...</p>
                    </div>
                  ) : (
                    <>
                      {fields.length > 0 && fields.map((field) => (
                        <div key={field.id} className="space-y-2.5">
                        <Label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center">
                          {field.field_name}
                          {field.is_required && <span className="text-pink-500 ml-1.5">*</span>}
                        </Label>

                        <div className="relative group">
                          {field.field_type === 'textarea' ? (
                            <>
                              <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                              <textarea
                                value={formData[field.field_name] || ''}
                                onChange={(e) =>
                                  setFormData((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                                }
                                placeholder={`Enter ${field.field_name.toLowerCase()}...`}
                                rows={4}
                                className="w-full bg-slate-950/50 border border-white/10 text-white placeholder:text-slate-600 text-sm rounded-2xl pl-11 p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none hover:border-white/20"
                              />
                            </>
                          ) : field.field_type === 'dropdown' ? (
                            <>
                              <Layout className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 z-10" />
                              <Select
                                value={formData[field.field_name] || ''}
                                onValueChange={(value) =>
                                  setFormData((prev) => ({ ...prev, [field.field_name]: value || '' }))
                                }
                              >
                                <SelectTrigger className="bg-slate-950/50 border-white/10 text-white h-12 text-sm rounded-2xl pl-11 focus:ring-purple-500/30 transition-all hover:border-white/20">
                                  <SelectValue placeholder="Select an option" />
                                </SelectTrigger>
                                <SelectContent className="bg-slate-900 border-white/10 text-white rounded-2xl shadow-2xl p-1 overflow-hidden">
                                  {(Array.isArray(field.field_options)
                                    ? field.field_options
                                    : JSON.parse(field.field_options as unknown as string || '[]')
                                  ).map((option: string) => (
                                    <SelectItem
                                      key={option}
                                      value={option}
                                      className="focus:bg-purple-500/20 focus:text-purple-300 cursor-pointer py-3 rounded-lg"
                                    >
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </>
                          ) : (
                            <>
                              {field.field_name.toLowerCase().includes('follower') ? (
                                <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                              ) : (
                                <Pencil className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                              )}
                              <Input
                                type={field.field_type === 'number' ? 'number' : 'text'}
                                value={formData[field.field_name] || ''}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                  setFormData((prev) => ({ ...prev, [field.field_name]: e.target.value }))
                                }
                                placeholder={`Enter ${field.field_name.toLowerCase()}...`}
                                className="bg-slate-950/50 border border-white/10 text-white placeholder:text-slate-600 h-12 pl-11 pr-4 text-sm rounded-2xl focus-visible:ring-purple-500/30 transition-all hover:border-white/20"
                              />
                            </>
                          )}
                        </div>
                      </div>
                    ))}

                      {/* Mandatory Pitch Field */}
                      <div className="space-y-2.5">
                        <Label className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center">
                          Pitch to Brand
                          <span className="text-pink-500 ml-1.5">*</span>
                        </Label>
                        <div className="relative group">
                           <MessageSquare className="absolute left-4 top-4 h-4 w-4 text-slate-500 group-focus-within:text-purple-400 transition-colors" />
                           <textarea
                             value={pitch}
                             onChange={(e) => setPitch(e.target.value)}
                             placeholder="Why are you a good fit for this campaign?"
                             rows={4}
                             className="w-full bg-slate-950/50 border border-white/10 text-white placeholder:text-slate-600 text-sm rounded-2xl pl-11 p-4 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all resize-none hover:border-white/20"
                           />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 pl-1 font-medium">
                          Brands value thoughtful comments. Stand out by explaining how you can bring value to the campaign.
                        </p>
                      </div>
                    </>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={onClose}
                      className="flex-1 h-12 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5 font-semibold"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading}
                      className="flex-[2] h-12 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] group cursor-pointer disabled:opacity-50"
                    >
                      {loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          Submit Application
                        </div>
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
