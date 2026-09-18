'use client'

import React, { useState, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
  Trash2,
  Clock,
  ArrowLeft,
  HelpCircle,
  ShieldCheck,
  Phone,
  Mail,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

const ISSUE_CATEGORIES = [
  { value: 'otp_not_received', label: 'OTP Not Received (Mobile or Email)' },
  { value: 'login_failed', label: 'Login Error / Password Issue' },
  { value: 'signup_failed', label: 'Signup / Account Creation Issue' },
  { value: 'recaptcha_stuck', label: 'reCAPTCHA / Verification Stuck' },
  { value: 'other', label: 'Other Technical Problem' },
]

function ReportIssueContent() {
  const searchParams = useSearchParams()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [mobile, setMobile] = useState('')
  const [sourcePage, setSourcePage] = useState<'login' | 'signup'>('login')

  React.useEffect(() => {
    if (searchParams) {
      const s = searchParams.get('source')
      if (s === 'signup') setSourcePage('signup')
      else if (s === 'login') setSourcePage('login')
    }
  }, [searchParams])
  const [issueType, setIssueType] = useState('otp_not_received')
  const [description, setDescription] = useState('')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successTicketId, setSuccessTicketId] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

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

  const handleReset = () => {
    setName('')
    setEmail('')
    setMobile('')
    setDescription('')
    setIssueType('otp_not_received')
    handleRemoveFile()
    setSuccessTicketId(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-3.5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <img
              src="/logo.svg"
              alt="1to7 Media"
              className="h-8 sm:h-9 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <div className="h-5 w-px bg-slate-200 hidden sm:block" />
            <span className="text-xs text-slate-500 font-semibold tracking-wide hidden sm:inline">
              Creator Support Desk
            </span>
          </Link>

          <div className="flex items-center gap-2.5">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 border border-slate-200 px-3 py-1.5 rounded-lg transition-all"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Login
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white border border-slate-200/80 rounded-2xl shadow-xl shadow-slate-200/40 overflow-hidden"
        >
          {/* Card Header */}
          <div className="p-6 sm:p-8 pb-6 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-11 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-[#f50057] shrink-0 shadow-sm">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Facing Login or Signup Issues?
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  Submit your details and problem screenshot. Our engineering support team will resolve it quickly!
                </p>
              </div>
            </div>
          </div>

          {/* Body */}
          {successTicketId ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 sm:p-12 text-center flex flex-col items-center space-y-4"
            >
              <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-md shadow-emerald-500/10">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Issue Ticket Created!</h2>
              
              <div className="bg-slate-50 px-6 py-3 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Your Ticket Reference</p>
                <p className="text-xl font-mono font-bold text-[#f50057] tracking-wider mt-0.5">{successTicketId}</p>
              </div>

              <p className="text-xs sm:text-sm text-slate-600 max-w-md leading-relaxed">
                Thank you for notifying us! Our technical team has received your ticket details. If we need any additional information or have resolved the issue, we will reach out to your registered mobile or email.
              </p>

              <div className="pt-4 flex flex-wrap gap-3 justify-center">
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold px-6 h-11 rounded-xl hover:opacity-95 shadow-md shadow-rose-500/20 text-xs uppercase tracking-wider transition-all"
                >
                  Return to Login
                </Link>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-11 px-5 rounded-xl cursor-pointer"
                >
                  Submit Another Report
                </Button>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
              {/* Source Page Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Where did you face this problem? <span className="text-[#f50057]">*</span>
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSourcePage('login')}
                    className={`h-11 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      sourcePage === 'login'
                        ? 'bg-rose-50 border-[#f50057] text-[#f50057] shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Login Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourcePage('signup')}
                    className={`h-11 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      sourcePage === 'signup'
                        ? 'bg-rose-50 border-[#f50057] text-[#f50057] shadow-sm'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Signup Page
                  </button>
                </div>
              </div>

              {/* Name & Mobile Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Your Full Name <span className="text-[#f50057]">*</span>
                  </Label>
                  <Input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs h-11 rounded-xl focus-visible:ring-[#f50057]"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Mobile Number <span className="text-[#f50057]">*</span>
                  </Label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-slate-500 font-mono text-xs font-bold select-none">
                      +91
                    </span>
                    <Input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="9876543210"
                      className="pl-13 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs h-11 rounded-xl font-mono tracking-wider focus-visible:ring-[#f50057]"
                    />
                  </div>
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Email Address <span className="text-[#f50057]">*</span>
                </Label>
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs h-11 rounded-xl focus-visible:ring-[#f50057]"
                />
              </div>

              {/* Issue Category */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  What kind of issue are you facing? <span className="text-[#f50057]">*</span>
                </Label>
                <select
                  value={issueType}
                  onChange={(e) => setIssueType(e.target.value)}
                  className="w-full bg-white border border-slate-200 text-slate-900 text-xs h-11 rounded-xl px-3 outline-none focus:ring-2 focus:ring-[#f50057] transition-all cursor-pointer"
                >
                  {ISSUE_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value} className="bg-white text-slate-900">
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Problem Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700">
                    Describe the Issue <span className="text-[#f50057]">*</span>
                  </Label>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {description.length}/2000
                  </span>
                </div>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Tell us what you tried to do and any error message you saw..."
                  className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#f50057] transition-all resize-none shadow-sm"
                />
              </div>

              {/* Screenshot Upload Dropzone */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <ImageIcon className="h-3.5 w-3.5 text-[#f50057]" />
                    Problem Screenshot (Optional but Recommended)
                  </Label>
                  <span className="text-[11px] text-slate-400 font-mono">Max 5MB</span>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {screenshotPreview ? (
                  <div className="relative bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <img
                        src={screenshotPreview}
                        alt="Screenshot Preview"
                        className="h-14 w-14 object-cover rounded-lg border border-slate-200 shrink-0 bg-white"
                      />
                      <div className="truncate text-left">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {screenshotFile?.name}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {screenshotFile && formatFileSize(screenshotFile.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      className="h-9 w-9 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-red-200"
                      title="Remove Screenshot"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-[#f50057] bg-slate-50/60 hover:bg-slate-50 rounded-xl p-6 text-center cursor-pointer transition-all group flex flex-col items-center justify-center gap-2"
                  >
                    <div className="h-10 w-10 rounded-xl bg-rose-50 group-hover:bg-rose-100 text-[#f50057] flex items-center justify-center transition-colors shadow-sm">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700 group-hover:text-[#f50057] transition-colors">
                        Click to upload an error screenshot
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Supports PNG, JPG, or WebP (up to 5MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Anti-Spam Notice */}
              <div className="bg-amber-50/60 border border-amber-200/80 p-3 rounded-xl flex items-start gap-2.5">
                <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  <span className="font-semibold">Anti-Spam Protection:</span> Submissions are limited to a maximum of 3 reports per 30 minutes to prevent abuse.
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={submitting}
                className="w-full h-12 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs rounded-xl uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
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
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} 1to7 Media. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-700 underline transition-colors">
              Privacy Policy & Data Terms
            </Link>
            <Link href="/login" className="hover:text-slate-700 underline transition-colors">
              Login Portal
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default function ReportIssuePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#f50057]" />
      </div>
    }>
      <ReportIssueContent />
    </Suspense>
  )
}
