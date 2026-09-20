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
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans selection:bg-[#f50057]/10 overflow-x-hidden overflow-y-auto lg:overflow-hidden">
      <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-4 flex flex-col justify-between">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between pb-2 mb-2 lg:mb-3 border-b border-slate-200/60 shrink-0">
          <Link
            href={sourcePage === 'signup' ? '/signup' : '/login'}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg transition-all shadow-xs group"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5 text-slate-500" />
            Back to {sourcePage === 'signup' ? 'Signup' : 'Login'}
          </Link>

          <Link href="/" className="flex items-center gap-2 group cursor-pointer">
            <img
              src="/logo.svg"
              alt="1to7 Media"
              className="h-6 sm:h-7 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
              Creator Support Desk
            </span>
          </Link>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start my-auto">
          {/* Left Column: Context, Guidance & Quick Troubleshooting */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-3.5">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-[#f50057] border border-rose-200">
                <AlertTriangle className="h-3 w-3" />
                Support & Issue Desk
              </span>
              <h1 className="text-xl sm:text-2xl lg:text-[24px] font-extrabold text-slate-900 tracking-tight leading-tight">
                Facing Login or Signup Issues?
              </h1>
              <p className="text-xs text-slate-600 leading-relaxed">
                Submit your details and screenshot below. Our engineering team audits access failures directly to restore your account quickly.
              </p>
            </div>

            {/* Quick Troubleshooting Guide */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 sm:p-4 shadow-xs space-y-2.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <HelpCircle className="h-3.5 w-3.5 text-[#f50057]" />
                Common Quick Fixes
              </h2>

              <div className="space-y-2 text-xs text-slate-600">
                <div className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-rose-50 text-[#f50057] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    <strong className="text-slate-800 font-semibold">OTP Delay:</strong> SMS can take 30-60s during network load. Check SMS spam filters.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-rose-50 text-[#f50057] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    <strong className="text-slate-800 font-semibold">Stuck Loader:</strong> Refresh the page or try an incognito/private browsing window.
                  </span>
                </div>

                <div className="flex items-start gap-2">
                  <span className="h-4 w-4 rounded-full bg-rose-50 text-[#f50057] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    <strong className="text-slate-800 font-semibold">Registered user?</strong> Try logging in with Email OTP or your Password.
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Assistance Info */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="text-slate-600 text-[11px]">Priority Support (~30m review)</span>
              </div>
              <a
                href="mailto:support@1to7media.com"
                className="text-[11px] font-medium text-slate-700 hover:text-[#f50057] flex items-center gap-1 transition-colors"
              >
                <Mail className="h-3 w-3 text-slate-400" />
                support@1to7media.com
              </a>
            </div>
          </div>

          {/* Right Column: The Form Card */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden"
            >
              {/* Card Header */}
              <div className="px-4 py-2.5 sm:px-6 sm:py-3 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Submit Problem Report
                  </h2>
                  <p className="text-[11px] text-slate-500">Provide details for quick investigation</p>
                </div>

                {/* Source Page Selector */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200/80 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSourcePage('login')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      sourcePage === 'login'
                        ? 'bg-white text-[#f50057] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Login Page
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourcePage('signup')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                      sourcePage === 'signup'
                        ? 'bg-white text-[#f50057] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Signup Page
                  </button>
                </div>
              </div>

              {/* Body */}
              {successTicketId ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-6 sm:p-8 text-center flex flex-col items-center space-y-3"
                >
                  <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm">
                    <CheckCircle2 className="h-7 w-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">Issue Ticket Created!</h3>
                  
                  <div className="bg-slate-50 px-5 py-2.5 rounded-xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Your Ticket Reference</p>
                    <p className="text-lg font-mono font-bold text-[#f50057] tracking-wider mt-0.5">{successTicketId}</p>
                  </div>

                  <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
                    Our technical team has received your ticket details. We will investigate and reach out to your registered mobile or email.
                  </p>

                  <div className="pt-2 flex flex-wrap gap-2.5 justify-center">
                    <Link
                      href={sourcePage === 'signup' ? '/signup' : '/login'}
                      className="inline-flex items-center justify-center bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold px-5 h-9 rounded-lg hover:opacity-95 shadow-sm text-xs uppercase tracking-wider transition-all"
                    >
                      Return to {sourcePage === 'signup' ? 'Signup' : 'Login'}
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleReset}
                      className="border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold h-9 px-4 rounded-lg cursor-pointer"
                    >
                      Submit Another Report
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-2.5">
                  {/* Row 1: Name & Mobile */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">
                        Full Name <span className="text-[#f50057]">*</span>
                      </Label>
                      <Input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs h-9 rounded-lg focus-visible:ring-[#f50057]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">
                        Mobile Number <span className="text-[#f50057]">*</span>
                      </Label>
                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-slate-500 font-mono text-xs font-bold select-none">
                          +91
                        </span>
                        <Input
                          type="tel"
                          required
                          maxLength={10}
                          value={mobile}
                          onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          placeholder="9876543210"
                          className="pl-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs h-9 rounded-lg font-mono tracking-wider focus-visible:ring-[#f50057]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Email & Issue Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">
                        Email Address <span className="text-[#f50057]">*</span>
                      </Label>
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 text-xs h-9 rounded-lg focus-visible:ring-[#f50057]"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700">
                        Issue Category <span className="text-[#f50057]">*</span>
                      </Label>
                      <select
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                        className="w-full bg-white border border-slate-200 text-slate-900 text-xs h-9 rounded-lg px-2.5 outline-none focus:ring-2 focus:ring-[#f50057] transition-all cursor-pointer"
                      >
                        {ISSUE_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Row 3: Problem Description */}
                  <div className="space-y-1">
                    <div className="flex justify-between items-center">
                      <Label className="text-[11px] font-semibold text-slate-700">
                        Describe the Issue <span className="text-[#f50057]">*</span>
                      </Label>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {description.length}/2000
                      </span>
                    </div>
                    <textarea
                      required
                      rows={2}
                      maxLength={2000}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell us what you tried to do and any error message you saw..."
                      className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-[#f50057] transition-all resize-none shadow-xs"
                    />
                  </div>

                  {/* Row 4: Screenshot Upload (Compact & Clean) */}
                  <div className="space-y-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={handleFileChange}
                    />

                    {screenshotPreview ? (
                      <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 px-2.5 flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <img
                            src={screenshotPreview}
                            alt="Screenshot Preview"
                            className="h-8 w-8 object-cover rounded border border-slate-200 shrink-0 bg-white"
                          />
                          <div className="truncate text-left">
                            <p className="text-xs font-medium text-slate-900 truncate">
                              {screenshotFile?.name}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                              {screenshotFile && formatFileSize(screenshotFile.size)}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveFile}
                          className="h-6 w-6 rounded bg-red-50 hover:bg-red-100 text-red-600 flex items-center justify-center transition-colors cursor-pointer shrink-0 border border-red-200"
                          title="Remove Screenshot"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border border-dashed border-slate-200 hover:border-[#f50057] bg-slate-50/70 hover:bg-rose-50/30 rounded-lg px-3 py-1.5 flex items-center justify-between cursor-pointer transition-all group"
                      >
                        <div className="flex items-center gap-2">
                          <UploadCloud className="h-3.5 w-3.5 text-slate-400 group-hover:text-[#f50057] transition-colors shrink-0" />
                          <span className="text-xs text-slate-600 group-hover:text-[#f50057] transition-colors">
                            Attach error screenshot <span className="text-[10px] text-slate-400">(PNG, JPG, WebP &le; 5MB)</span>
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded shadow-xs group-hover:border-[#f50057] transition-colors">
                          Browse
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Row 5: Submit Button & Anti-spam Note */}
                  <div className="pt-0.5 space-y-1.5">
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full h-9 bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:opacity-95 text-white font-bold text-xs rounded-lg uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 active:scale-[0.99] cursor-pointer disabled:opacity-50"
                    >
                      {submitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting Report...
                        </span>
                      ) : (
                        'Submit Issue Report'
                      )}
                    </Button>

                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-500">
                      <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                      <span>Anti-spam: Limited to 3 reports per 30 minutes.</span>
                    </div>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        </div>

        {/* Minimal Footer */}
        <footer className="pt-2 pb-1 text-center text-[11px] text-slate-400 border-t border-slate-200/80 shrink-0">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-1">
            <p>© {new Date().getFullYear()} 1to7 Media. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <Link href="/privacy" className="hover:text-slate-700 underline transition-colors">
                Privacy Policy
              </Link>
              <Link href="/login" className="hover:text-slate-700 underline transition-colors">
                Login Portal
              </Link>
            </div>
          </div>
        </footer>
      </div>
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
