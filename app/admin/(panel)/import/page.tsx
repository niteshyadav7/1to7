'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import {
  Upload, FileSpreadsheet, CheckCircle2, XCircle, AlertTriangle,
  Loader2, ChevronDown, Trash2, Download, ArrowRight,
  Users, UserPlus, RefreshCw, Info, X, Search, Eye,
  FileUp, Sparkles, ShieldCheck, ArrowLeft
} from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

// ─── Types ─────────────────────────────────────────────────
interface Campaign {
  id: string
  campaign_code: string
  brand_name: string
  platform: string
  status: string
}

interface ParsedRow {
  _rowIndex: number
  mobile: string
  full_name: string
  email: string
  instagram_username: string
  followers: string
  gender: string
  state: string
  city: string
  status: string
  influencer_id: string
  partial_payment?: string
  final_payment?: string
  pending_amount?: string
  order_id?: string
  account_name?: string
  account_number?: string
  ifsc_code?: string
  category?: string
  _valid: boolean
  _errors: string[]
}

interface ImportResults {
  total: number
  created_users: number
  existing_users: number
  applications_created: number
  applications_updated: number
  skipped: number
  errors: { row: number; mobile: string; error: string }[]
}

// ─── Column mapping: CSV Header → DB field ─────────────────
const COLUMN_MAP: Record<string, string> = {
  'mobile': 'mobile',
  'mobile number': 'mobile',
  'phone': 'mobile',
  'phone number': 'mobile',
  'contact': 'mobile',
  'contact number': 'mobile',
  'name': 'full_name',
  'full name': 'full_name',
  'full_name': 'full_name',
  'influencer name': 'full_name',
  'email': 'email',
  'email id': 'email',
  'email address': 'email',
  'instagram': 'instagram_username',
  'instagram username': 'instagram_username',
  'instagram_username': 'instagram_username',
  'insta id': 'instagram_username',
  'insta': 'instagram_username',
  'ig handle': 'instagram_username',
  'ig': 'instagram_username',
  'followers': 'followers',
  'follower count': 'followers',
  'follower': 'followers',
  'gender': 'gender',
  'state': 'state',
  'city': 'city',
  'status': 'status',
  'application status': 'status',
  'user id': 'influencer_id',
  'campaign user id': 'influencer_id',
  'influencer_id': 'influencer_id',
  'partial payment': 'partial_payment',
  'partial_payment': 'partial_payment',
  'final payment': 'final_payment',
  'final_payment': 'final_payment',
  'amount': 'final_payment',
  'pending amount': 'pending_amount',
  'pending_amount': 'pending_amount',
  'order id': 'order_id',
  'order_id': 'order_id',
  'account name': 'account_name',
  'account_name': 'account_name',
  'account number': 'account_number',
  'account_number': 'account_number',
  'account no': 'account_number',
  'ifsc': 'ifsc_code',
  'ifsc code': 'ifsc_code',
  'ifsc_code': 'ifsc_code',
  'category': 'category',
}

const VALID_STATUSES = ['Applied', 'Approved', 'Rejected', 'Completed', 'Payment Initiated', 'Payment Requested']

// ─── Helpers ───────────────────────────────────────────────
function normalizeHeader(header: string): string {
  const cleaned = header.trim().toLowerCase().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ')
  return COLUMN_MAP[cleaned] || ''
}

function validateRow(row: ParsedRow): ParsedRow {
  const errors: string[] = []
  const mobile = row.mobile?.toString().trim()
  const influencerId = row.influencer_id?.toString().trim()

  if (!mobile && !influencerId) {
    errors.push('Either Mobile Number or User ID is required')
  } else if (mobile && !/^\d{10,15}$/.test(mobile.replace(/[\s\-\+]/g, ''))) {
    errors.push('Invalid mobile number format')
  }

  if (row.status && !VALID_STATUSES.includes(row.status)) {
    errors.push(`Invalid status: "${row.status}"`)
  }

  return {
    ...row,
    mobile: mobile || '',
    influencer_id: influencerId || '',
    _valid: errors.length === 0,
    _errors: errors,
  }
}

// ─── Step Indicator ────────────────────────────────────────
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: 'Select Campaign' },
    { num: 2, label: 'Upload CSV' },
    { num: 3, label: 'Preview & Submit' },
  ]

  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, i) => (
        <React.Fragment key={step.num}>
          <div className="flex items-center gap-2.5">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-300 ${
              currentStep > step.num
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : currentStep === step.num
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 ring-4 ring-indigo-500/20'
                  : 'bg-slate-800 text-slate-500 border border-white/10'
            }`}>
              {currentStep > step.num ? <CheckCircle2 className="h-4 w-4" /> : step.num}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${
              currentStep >= step.num ? 'text-white' : 'text-slate-500'
            }`}>{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-12 h-px transition-colors duration-300 ${
              currentStep > step.num ? 'bg-emerald-500' : 'bg-slate-700'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────
export default function ImportPage() {
  // State
  const [step, setStep] = useState(1)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [importMode, setImportMode] = useState<'campaign' | 'users'>('campaign')
  const [campaignSearch, setCampaignSearch] = useState('')
  const [campaignDropdownOpen, setCampaignDropdownOpen] = useState(false)
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)

  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [fileName, setFileName] = useState('')
  const [dragging, setDragging] = useState(false)

  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<ImportResults | null>(null)
  const [previewSearch, setPreviewSearch] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ─── Fetch campaigns ────────────────────────────────────
  useEffect(() => {
    fetchCampaigns()
  }, [])

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch {
      toast.error('Failed to load campaigns')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  // Close campaign dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCampaignDropdownOpen(false)
      }
    }
    if (campaignDropdownOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [campaignDropdownOpen])

  // ─── Filtered campaigns ─────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch.trim()) return campaigns
    const q = campaignSearch.toLowerCase()
    return campaigns.filter(c =>
      c.brand_name.toLowerCase().includes(q) ||
      c.campaign_code.toLowerCase().includes(q)
    )
  }, [campaigns, campaignSearch])

  // ─── CSV Parsing ────────────────────────────────────────
  const handleFile = useCallback((file: File) => {
    if (!file) return

    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
    const validExts = ['.csv', '.txt']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast.error('Please upload a CSV file (.csv)')
      return
    }

    setFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data || result.data.length === 0) {
          toast.error('The CSV file appears to be empty')
          return
        }

        const headers = result.meta.fields || []
        setRawHeaders(headers)

        // Map CSV headers to our internal fields
        const mappedHeaders = headers.map(h => normalizeHeader(h))

        // Check if we have a mobile column or influencer id column
        if (!mappedHeaders.includes('mobile') && !mappedHeaders.includes('influencer_id')) {
          toast.error('CSV must contain a "Mobile" or "User Id" column')
          return
        }

        const rows: ParsedRow[] = (result.data as Record<string, string>[]).map((row, idx) => {
          const mapped: any = { _rowIndex: idx + 1 }

          headers.forEach((header, hIdx) => {
            const field = mappedHeaders[hIdx]
            if (field) {
              mapped[field] = row[header]?.trim() || ''
            }
          })

          // Collect any unmapped columns as form_data
          const formData: Record<string, string> = {}
          headers.forEach((header, hIdx) => {
            const field = mappedHeaders[hIdx]
            if (!field && row[header]?.trim()) {
              formData[header] = row[header].trim()
            }
          })
          if (Object.keys(formData).length > 0) {
            mapped.form_data = formData
          }

          return validateRow(mapped as ParsedRow)
        })

        setParsedRows(rows)
        setStep(3)
        toast.success(`Parsed ${rows.length} rows from ${file.name}`)
      },
      error: (err) => {
        toast.error(`Failed to parse CSV: ${err.message}`)
      },
    })
  }, [])

  // ─── Drag and Drop ──────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
  }, [])

  // ─── Import Submit ──────────────────────────────────────
  const handleImport = async () => {
    if ((importMode === 'campaign' && !selectedCampaign) || parsedRows.length === 0) return

    const validRows = parsedRows.filter(r => r._valid)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setImporting(true)

    try {
      const payload = validRows.map(r => ({
        mobile: r.mobile ? r.mobile.replace(/[\s\-\+]/g, '') : '',
        influencer_id: r.influencer_id || undefined,
        full_name: r.full_name || undefined,
        email: r.email || undefined,
        instagram_username: r.instagram_username || undefined,
        followers: r.followers || undefined,
        gender: r.gender || undefined,
        state: r.state || undefined,
        city: r.city || undefined,
        status: r.status || 'Applied',
        partial_payment: r.partial_payment ? Number(r.partial_payment.replace(/[^0-9.]/g, '')) : undefined,
        final_payment: r.final_payment ? Number(r.final_payment.replace(/[^0-9.]/g, '')) : undefined,
        pending_amount: r.pending_amount ? Number(r.pending_amount.replace(/[^0-9.]/g, '')) : undefined,
        order_id: r.order_id?.toString().trim() || undefined,
        account_name: r.account_name?.trim() || undefined,
        account_number: r.account_number?.toString().trim() || undefined,
        ifsc_code: r.ifsc_code?.toString().trim() || undefined,
        category: r.category?.trim() || undefined,
        form_data: (r as any).form_data || undefined,
      }))

      const res = await fetch('/api/admin/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rows: payload,
          campaign_id: importMode === 'campaign' ? selectedCampaign?.id : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Import failed')
        return
      }

      setImportResults(data.results)
      toast.success(`Import complete! ${data.results.applications_created} new, ${data.results.applications_updated} updated`)
    } catch (err: any) {
      toast.error(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  // ─── Reset ──────────────────────────────────────────────
  const handleReset = () => {
    setStep(1)
    setSelectedCampaign(null)
    setImportMode('campaign')
    setParsedRows([])
    setRawHeaders([])
    setFileName('')
    setImportResults(null)
    setPreviewSearch('')
    setCampaignSearch('')
  }

  // ─── Stats for preview ─────────────────────────────────
  const validCount = parsedRows.filter(r => r._valid).length
  const invalidCount = parsedRows.filter(r => !r._valid).length

  // ─── Filtered preview rows ─────────────────────────────
  const filteredPreviewRows = useMemo(() => {
    if (!previewSearch.trim()) return parsedRows
    const q = previewSearch.toLowerCase()
    return parsedRows.filter(r =>
      r.mobile?.toLowerCase().includes(q) ||
      r.full_name?.toLowerCase().includes(q) ||
      r.instagram_username?.toLowerCase().includes(q)
    )
  }, [parsedRows, previewSearch])

  // ─── Download template CSV ─────────────────────────────
  const downloadTemplate = () => {
    const template = 'Mobile,Full Name,Email,Instagram Username,Followers,Gender,State,City,Status\n9876543210,John Doe,john@example.com,@johndoe,15000,Male,Maharashtra,Mumbai,Approved\n'
    const blob = new Blob([template], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'import_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-500 shadow-lg shadow-indigo-500/20">
              <FileUp className="h-5 w-5 text-white" />
            </div>
            Bulk Import
          </h1>
          <p className="text-sm text-slate-400 mt-1">Import influencers from your Google Sheets / Excel into the database</p>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-medium bg-slate-800/60 text-slate-300 border border-white/5 hover:bg-slate-800 hover:text-white hover:border-white/10 transition-all cursor-pointer"
        >
          <Download className="h-3.5 w-3.5" />
          Download Template
        </button>
      </div>

      {/* ─── Steps ──────────────────────────────────────────── */}
      <StepIndicator currentStep={importResults ? 4 : step} />

      {/* ─── Results Screen ─────────────────────────────────── */}
      {importResults ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Summary Cards */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/20">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Import Complete</h2>
                <p className="text-sm text-slate-400">
                  Campaign: <span className="text-indigo-400">{selectedCampaign?.brand_name} ({selectedCampaign?.campaign_code})</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Total Rows', value: importResults.total, color: 'text-white', bg: 'bg-slate-800' },
                { label: 'New Users', value: importResults.created_users, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                { label: 'Existing Users', value: importResults.existing_users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { label: 'Apps Created', value: importResults.applications_created, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                { label: 'Apps Updated', value: importResults.applications_updated, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                { label: 'Skipped', value: importResults.skipped, color: 'text-red-400', bg: 'bg-red-500/10' },
              ].map(stat => (
                <div key={stat.label} className={`${stat.bg} rounded-xl p-4 border border-white/5`}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Errors List */}
            {importResults.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-red-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Errors ({importResults.errors.length})
                </h3>
                <div className="max-h-[200px] overflow-y-auto space-y-1 custom-scrollbar">
                  {importResults.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg text-xs">
                      <span className="text-red-400 font-mono font-bold">Row {err.row}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400">{err.mobile}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-red-300 flex-1">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Import More
            </button>
            <Link
              href="/admin/applications"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all"
            >
              <Eye className="h-4 w-4" />
              View Applications
            </Link>
          </div>
        </motion.div>
      ) : (
        <>
          {/* ─── Step 1: Select Campaign ───────────────────────── */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8"
            >
              <div className="max-w-lg mx-auto">
                <h2 className="text-lg font-bold text-white mb-1">Select Campaign</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Choose the campaign you are importing influencer data for. All rows in the CSV will be linked to this campaign.
                </p>

                {/* Campaign Dropdown */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setCampaignDropdownOpen(!campaignDropdownOpen)}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-sm border transition-all cursor-pointer ${
                      selectedCampaign
                        ? 'bg-indigo-500/10 border-indigo-500/25 text-white'
                        : 'bg-slate-800/60 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    {selectedCampaign ? (
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/20">
                          <Sparkles className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-white">{selectedCampaign.brand_name}</p>
                          <p className="text-xs text-slate-400">{selectedCampaign.campaign_code} • {selectedCampaign.platform}</p>
                        </div>
                      </div>
                    ) : (
                      <span>Choose a campaign...</span>
                    )}
                    <ChevronDown className={`h-4 w-4 transition-transform ${campaignDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {campaignDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.98 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden"
                      >
                        {/* Search */}
                        <div className="p-3 border-b border-white/5">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                            <input
                              type="text"
                              placeholder="Search campaigns..."
                              value={campaignSearch}
                              onChange={(e) => setCampaignSearch(e.target.value)}
                              className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-white/5 rounded-lg text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/30"
                              autoFocus
                            />
                          </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[280px] overflow-y-auto custom-scrollbar p-1.5">
                          {loadingCampaigns ? (
                            <div className="p-6 text-center text-slate-500 text-xs">
                              <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                              Loading campaigns...
                            </div>
                          ) : filteredCampaigns.length === 0 ? (
                            <div className="p-6 text-center text-slate-500 text-xs">No campaigns found</div>
                          ) : (
                            filteredCampaigns.map(c => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setSelectedCampaign(c)
                                  setCampaignDropdownOpen(false)
                                  setCampaignSearch('')
                                }}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer ${
                                  selectedCampaign?.id === c.id
                                    ? 'bg-indigo-500/15 text-indigo-300'
                                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                }`}
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{c.brand_name}</p>
                                  <p className="text-[10px] text-slate-500">{c.campaign_code} • {c.platform}</p>
                                </div>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  c.status === 'Active'
                                    ? 'bg-emerald-500/15 text-emerald-400'
                                    : 'bg-slate-700 text-slate-400'
                                }`}>{c.status}</span>
                              </button>
                            ))
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Next Button */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={() => { setImportMode('campaign'); selectedCampaign && setStep(2) }}
                    disabled={!selectedCampaign}
                    className={`w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                      selectedCampaign
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 cursor-pointer'
                        : 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    Next: Upload CSV
                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-white/5"></div>
                    <span className="flex-shrink-0 mx-4 text-[10px] text-slate-500 uppercase tracking-widest font-bold">Or</span>
                    <div className="flex-grow border-t border-white/5"></div>
                  </div>

                  <button
                    onClick={() => { setImportMode('users'); setStep(2) }}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all bg-slate-800 text-slate-300 hover:bg-slate-700 border border-white/5 hover:border-white/10 hover:text-white cursor-pointer"
                  >
                    Skip & Import Users Only
                    <Users className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 2: Upload CSV ────────────────────────────── */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8"
            >
              <div className="max-w-lg mx-auto">
                {/* Back */}
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer mb-4"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Campaign Selection
                </button>

                {/* Selected Campaign Tag */}
                {importMode === 'campaign' ? (
                  <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl mb-6">
                    <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                    <span className="text-xs text-indigo-300 font-medium">
                      Importing for: <span className="text-white">{selectedCampaign?.brand_name} ({selectedCampaign?.campaign_code})</span>
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-6">
                    <Users className="h-3.5 w-3.5 text-amber-400" />
                    <span className="text-xs text-amber-300 font-medium">
                      Importing <span className="text-white font-bold">Users Only</span> (No campaign assigned)
                    </span>
                  </div>
                )}

                <h2 className="text-lg font-bold text-white mb-1">Upload CSV File</h2>
                <p className="text-sm text-slate-400 mb-6">
                  Upload the Google Sheet / Excel export as a .csv file. The system will auto-detect columns.
                </p>

                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center py-16 px-6 border-2 border-dashed rounded-2xl transition-all cursor-pointer group ${
                    dragging
                      ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]'
                      : 'border-white/10 bg-slate-800/30 hover:border-indigo-500/30 hover:bg-slate-800/50'
                  }`}
                >
                  <div className={`flex h-16 w-16 items-center justify-center rounded-2xl mb-4 transition-all ${
                    dragging
                      ? 'bg-indigo-500/20 scale-110'
                      : 'bg-slate-800 group-hover:bg-indigo-500/10'
                  }`}>
                    <Upload className={`h-7 w-7 transition-colors ${
                      dragging ? 'text-indigo-400' : 'text-slate-500 group-hover:text-indigo-400'
                    }`} />
                  </div>
                  <p className="text-sm font-medium text-white mb-1">
                    {dragging ? 'Drop your file here' : 'Drag & drop your CSV file'}
                  </p>
                  <p className="text-xs text-slate-500">
                    or <span className="text-indigo-400 underline">browse files</span>
                  </p>
                  <p className="text-[10px] text-slate-600 mt-3">Supported: .csv files up to 1000 rows</p>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFile(file)
                      e.target.value = ''
                    }}
                  />
                </div>

                {/* Column Info */}
                <div className="mt-6 p-4 bg-slate-800/40 border border-white/5 rounded-xl">
                  <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-2">
                    <Info className="h-3.5 w-3.5 text-indigo-400" />
                    Auto-detected Column Names
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {['User Id', 'Mobile', 'Full Name', 'Email', 'Instagram', 'Followers', 'Gender', 'State', 'City', 'Status'].map(col => (
                      <span key={col} className="text-[10px] px-2 py-1 bg-slate-700/60 text-slate-300 rounded-md border border-white/5">{col}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Either <span className="text-amber-400">User Id</span> or <span className="text-amber-400">Mobile</span> is required. Extra columns are saved as form data.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── Step 3: Preview & Submit ──────────────────────── */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Top Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => { setStep(2); setParsedRows([]); setFileName('') }}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Re-upload
                  </button>
                  <div className="h-4 w-px bg-white/10" />
                  <span className="text-xs text-slate-400 flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3.5 w-3.5 text-indigo-400" />
                    {fileName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Stats pills */}
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 font-medium">
                    {validCount} valid
                  </span>
                  {invalidCount > 0 && (
                    <span className="text-[10px] px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/15 font-medium">
                      {invalidCount} invalid
                    </span>
                  )}
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-white/5 font-medium">
                    {parsedRows.length} total
                  </span>
                </div>
              </div>

              {/* Campaign Info + Search */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="text-xs text-indigo-300 font-medium">
                    {selectedCampaign?.brand_name} ({selectedCampaign?.campaign_code})
                  </span>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search in preview..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-800/60 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500/30"
                    />
                  </div>
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5">
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500 w-12">#</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Status</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">User ID</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Mobile</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Name</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Instagram</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Followers</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Gender</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Location</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500">Import Status</th>
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500 w-10"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPreviewRows.slice(0, 100).map((row) => (
                        <tr
                          key={row._rowIndex}
                          className={`border-b border-white/[0.03] transition-colors ${
                            row._valid ? 'hover:bg-white/[0.02]' : 'bg-red-500/[0.03]'
                          }`}
                        >
                          <td className="px-4 py-3 text-xs text-slate-500 font-mono">{row._rowIndex}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              row.status === 'Approved' ? 'bg-emerald-500/15 text-emerald-400' :
                              row.status === 'Rejected' ? 'bg-red-500/15 text-red-400' :
                              row.status === 'Completed' ? 'bg-purple-500/15 text-purple-400' :
                              row.status === 'Payment Initiated' ? 'bg-amber-500/15 text-amber-400' :
                              'bg-blue-500/15 text-blue-400'
                            }`}>
                              {row.status || 'Applied'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-white font-mono">{row.influencer_id || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 font-mono">{row.mobile || '—'}</td>
                          <td className="px-4 py-3 text-xs text-slate-300">{row.full_name || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{row.instagram_username || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{row.followers || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">{row.gender || <span className="text-slate-600">—</span>}</td>
                          <td className="px-4 py-3 text-xs text-slate-400">
                            {row.state || row.city
                              ? `${row.city || ''}${row.city && row.state ? ', ' : ''}${row.state || ''}`
                              : <span className="text-slate-600">—</span>
                            }
                          </td>
                          <td className="px-4 py-3">
                            {row._valid ? (
                              <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                                <CheckCircle2 className="h-3 w-3" /> Ready
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-[10px] text-red-400" title={row._errors.join(', ')}>
                                <XCircle className="h-3 w-3" /> Error
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {!row._valid && (
                              <button
                                onClick={() => setParsedRows(prev => prev.filter(r => r._rowIndex !== row._rowIndex))}
                                className="p-1 rounded hover:bg-red-500/10 text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
                                title="Remove row"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredPreviewRows.length > 100 && (
                  <div className="px-4 py-3 border-t border-white/5 text-center">
                    <p className="text-xs text-slate-500">
                      Showing first 100 of {filteredPreviewRows.length} rows. All valid rows will be imported.
                    </p>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                  Cancel
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || validCount === 0}
                  className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    importing || validCount === 0
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 cursor-pointer'
                  }`}
                >
                  {importing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Importing {validCount} rows...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      Import {validCount} Valid Rows
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </>
      )}
    </div>
  )
}
