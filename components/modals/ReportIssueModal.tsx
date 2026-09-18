'use client'

import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Trash2,
  ShieldAlert,
  HelpCircle,
  Clock,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface ReportIssueModalProps {
  isOpen: boolean
  onClose: () => void
  sourcePage?: 'login' | 'signup'
}

const ISSUE_CATEGORIES = [
  { value: 'otp_not_received', label: 'OTP Not Received (Mobile or Email)' },
  { value: 'login_failed', label: 'Login Error / Password Issue' },
  { value: 'signup_failed', label: 'Signup / Account Creation Issue' },
  { value: 'recaptcha_stuck', label: 'reCAPTCHA / Verification Stuck' },
  { value: 'other', label: 'Other Technical Problem' },
]

export default function ReportIssueModal({
  isOpen,
  onClose,
  sourcePage = 'login',
}: ReportIssueModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [issueType, setIssueType] = useState('otp_not_received')
  const [description, setDescription] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // 5MB Limit check (5 * 1024 * 1024)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Screenshot size exceeds 5MB limit. Please upload a smaller image.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and WebP image formats are supported.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    setScreenshotFile(file)
    const previewUrl = URL.createObjectURL(file)
    setScreenshotPreview(previewUrl)
  }

  const handleRemoveFile = () => {
    setScreenshotFile(null)
    if (screenshotPreview) {
      URL.revokeObjectURL(screenshotPreview)
      setScreenshotPreview(null)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim() || name.trim().length < 2) {
      toast.error('Please enter your full name (at least 2 characters).')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      toast.error('Please enter a valid email address.')
      return
    }

    const cleanMobile = mobile.replace(/\D/g, '').slice(-10)
    if (!cleanMobile || cleanMobile.length !== 10 || !/^[6-9]\d{9}$/.test(cleanMobile)) {
      toast.error('Please enter a valid 10-digit Indian mobile number.')
      return
    }

    if (!description.trim() || description.trim().length < 10) {
      toast.error('Please describe your issue in a bit more detail (minimum 10 characters).')
      return
    }

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('email', email.trim().toLowerCase())
      formData.append('mobile', cleanMobile)
      formData.append('sourcePage', sourcePage)
      formData.append('issueType', issueType)
      formData.append('description', description.trim())

      if (screenshotFile) {
        formData.append('screenshot', screenshotFile)
      }

      const res = await fetch('/api/support/report-issue', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit issue report')
      }

      setSuccessTicketId(data.ticketId || 'TICKET-SUBMITTED')
      toast.success('Issue reported successfully!')
    } catch (err: any) {
      toast.error(err.message || 'Error submitting your issue report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetAndClose = () => {
    setName('')
    setEmail('')
    setMobile('')
    setDescription('')
    setIssueType('otp_not_received')
    handleRemoveFile()
    setSuccessTicketId(null)
    onClose()
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-white my-auto"
        >
          {/* Header */}
          <div className="relative p-5 pb-4 bg-gradient-to-r from-pink-500/10 via-rose-500/10 to-amber-500/10 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400 shrink-0 shadow-inner">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Facing {sourcePage === 'signup' ? 'Signup' : 'Login'} Issues?
                </h2>
                <p className="text-xs text-slate-400">
                  Send us your details & screenshot. Our team will resolve it quickly!
                </p>
              </div>
            </div>
            <button
              onClick={handleResetAndClose}
              className="h-8 w-8 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          {successTicketId ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-6 sm:p-8 text-center flex flex-col items-center space-y-4"
            >
              <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h3 className="text-xl font-extrabold text-white">Issue Reported!</h3>
              <div className="bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800">
                <p className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Your Ticket Reference</p>
                <p className="text-lg font-mono font-bold text-pink-400 tracking-wider mt-0.5">{successTicketId}</p>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 max-w-sm leading-relaxed">
                Our engineering & support team has received your ticket. If needed, we will reach out to you directly at your mobile or email.
              </p>
              <Button
                onClick={handleResetAndClose}
                className="mt-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold px-8 h-11 rounded-xl hover:opacity-90 cursor-pointer border-none shadow-md"
              >
                Close Window
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Name & Mobile Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Your Name <span className="text-pink-400">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl focus-visible:ring-pink-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-300">
                    Mobile Number <span className="text-pink-400">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3 text-slate-400 font-mono text-xs font-bold select-none">
                      +91
                    </span>
                    <Input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="pl-12 bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl font-mono tracking-wider focus-visible:ring-pink-500"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Email Address <span className="text-pink-400">*</span>
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-slate-950/80 border-slate-800 text-white placeholder:text-slate-500 text-xs h-10 rounded-xl focus-visible:ring-pink-500"
                />
              </div>

              {/* Issue Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  What kind of issue are you facing? <span className="text-pink-400">*</span>
                </Label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 text-white text-xs h-10 rounded-xl px-3 outline-none focus:ring-2 focus:ring-pink-500 transition-all cursor-pointer"
                >
                  {ISSUE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-slate-900 text-white">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Problem Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-300">
                    Describe the Issue <span className="text-pink-400">*</span>
                  </Label>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {description.length}/2000
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us what you tried to do and the error message you saw..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-pink-500 transition-all resize-none"
                />
              </div>

              {/* Screenshot Upload Dropzone */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-pink-400" />
                    Problem Screenshot (Optional but Recommended)
                  </Label>
                  <span className="text-[10px] text-slate-500 font-mono">Max 5MB</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {screenshotPreview ? (
                  <div className="relative bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot Preview"
                        className="h-12 w-12 object-cover rounded-lg border border-slate-700 shrink-0"
                      />
                      <div className="truncate text-left">
                        <p className="text-xs font-medium text-white truncate">
                          {screenshotFile?.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {screenshotFile && formatFileSize(screenshotFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="h-8 w-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Remove Screenshot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border border-dashed border-slate-800 hover:border-pink-500/50 bg-slate-950/40 hover:bg-slate-950/80 rounded-xl p-4 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-1.5"
                  >
                    <div className="h-8 w-8 rounded-lg bg-pink-500/10 group-hover:bg-pink-500/20 text-pink-400 flex items-center justify-center transition-colors">
                      <UploadCloud className="h-4 w-4" />
                    </div>
                    <p className="text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
                      Click to upload error screenshot
                    </p>
                    <p className="text-[10px] text-slate-500">
                      PNG, JPG or WebP (up to 5MB)
                    </p>
                  </div>
                )}
              </div>

              {/* Anti-Spam Notice */}
              <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 flex items-start gap-2">
                <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  To prevent abuse, issue submissions are limited to a maximum of 3 reports per 30 minutes.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-11 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all shadow-md active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Submitting Report...
                  </span>
                ) : (
                  'Submit Issue Report'
                )}
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
