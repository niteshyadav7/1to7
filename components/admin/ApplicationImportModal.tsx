'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import {
  Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2,
  X, Loader2, FileText, Check, AlertTriangle, ChevronRight,
  ArrowRight, Sparkles, RefreshCw, Eye, HelpCircle, Layers,
  ExternalLink, UserPlus, Users, ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { extractInstagramUsername } from '@/lib/instagram-utils'

interface ApplicationImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  campaignId?: string
  campaignBrand?: string
  campaignCode?: string
}

interface CampaignOption {
  id: string
  brand_name: string
  campaign_code: string
  platform: string
}

interface FieldDefinition {
  key: string
  label: string
  required: boolean
  description: string
  synonyms: string[]
}

const TARGET_FIELDS: FieldDefinition[] = [
  {
    key: 'mobile',
    label: 'Mobile / WhatsApp',
    required: true,
    description: 'Primary phone/WhatsApp for creator identification & lookup',
    synonyms: [
      'mobile', 'mobile number', 'phone', 'phone number', 'contact', 'contact number',
      'whatsapp', 'whatsapp number', 'mobile number / whatsapp', 'phone no', 'calling number',
      'active whatsapp number', 'your whatsapp no', 'whatsapp no.', 'phone_number', 'mobile_number'
    ]
  },
  {
    key: 'full_name',
    label: 'Full Name',
    required: false,
    description: 'Creator name or display name',
    synonyms: [
      'name', 'full name', 'full_name', 'influencer name', 'your name', 'creator name',
      'what is your name?', 'what is your name', 'candidate name', 'applicant name', 'first name'
    ]
  },
  {
    key: 'instagram_username',
    label: 'Instagram Profile / Handle',
    required: false,
    description: 'Instagram handle or full profile URL (links will be auto-cleaned)',
    synonyms: [
      'instagram', 'instagram username', 'instagram id', 'instagram handle', 'insta id', 'insta',
      'ig handle', 'ig', 'instagram profile link', 'instagram link', 'paste your instagram link',
      'paste your instagram link here', 'instagram profile url', 'instagram url', 'paste link of your instagram',
      'profile link', 'insta_id', 'ig_link'
    ]
  },
  {
    key: 'email',
    label: 'Email Address',
    required: false,
    description: 'Creator email address',
    synonyms: ['email', 'email id', 'email address', 'your email', 'e-mail', 'email_address']
  },
  {
    key: 'followers',
    label: 'Follower Count',
    required: false,
    description: 'Instagram followers (e.g., 50k, 1.2M, 50,000)',
    synonyms: [
      'followers', 'follower count', 'approx followers', 'how many followers do you have?',
      'how many followers', 'number of followers', 'current followers', 'insta followers', 'follower_count'
    ]
  },
  {
    key: 'city',
    label: 'City',
    required: false,
    description: 'Current city or location',
    synonyms: ['city', 'current city', 'which city are you from?', 'location', 'town']
  },
  {
    key: 'state',
    label: 'State',
    required: false,
    description: 'State or region',
    synonyms: ['state', 'current state', 'which state do you live in?', 'region']
  },
  {
    key: 'gender',
    label: 'Gender',
    required: false,
    description: 'Male, Female, or Other',
    synonyms: ['gender', 'sex', 'male/female']
  },
  {
    key: 'final_payment',
    label: 'Agreed Commercial / Fee (₹)',
    required: false,
    description: 'Agreed fee or commercial quote in INR',
    synonyms: [
      'commercial', 'commercials', 'commercial quote', 'quotation', 'rate',
      'quote for 1 reel', 'agreed commercial', 'deal amount', 'payout', 'fee', 'amount', 'commercial_quote'
    ]
  },
  {
    key: 'status',
    label: 'Application Status',
    required: false,
    description: 'Optional initial status (e.g., Approved, Applied)',
    synonyms: ['status', 'application status', 'selection status', 'approved?', 'selected?', 'shortlisted']
  },
  {
    key: 'category',
    label: 'Category / Niche',
    required: false,
    description: 'Creator niche (e.g. Fashion, Beauty, Tech)',
    synonyms: ['category', 'niche', 'content category', 'genre']
  }
]

// Normalizers
function cleanPhone(val: any): string {
  if (!val) return ''
  let digits = String(val).replace(/[\s\-\+\(\)]/g, '').trim()
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1)
  }
  return digits
}

function parseFollowers(val: any): number {
  if (!val) return 0
  let str = String(val).trim().toUpperCase()
  if (!str) return 0
  if (str.endsWith('K')) {
    const num = parseFloat(str.replace('K', ''))
    return isNaN(num) ? 0 : Math.round(num * 1000)
  }
  if (str.endsWith('M')) {
    const num = parseFloat(str.replace('M', ''))
    return isNaN(num) ? 0 : Math.round(num * 1000000)
  }
  const num = parseInt(str.replace(/[^0-9]/g, ''), 10)
  return isNaN(num) ? 0 : num
}

function normalizeStatus(val?: string, defaultStatus = 'Applied'): string {
  if (!val) return defaultStatus
  const s = val.trim().toLowerCase()
  if (['approved', 'approve', 'yes', 'y', 'true', '1', 'ok', 'pass', 'selected', 'shortlisted'].includes(s)) return 'Approved'
  if (['rejected', 'reject', 'no', 'n', 'false', '0', 'fail', 'declined'].includes(s)) return 'Rejected'
  if (['completed', 'complete', 'done', 'finished'].includes(s)) return 'Completed'
  if (['applied', 'pending', 'new', 'waiting', 'in review', 'under review'].includes(s)) return 'Applied'
  if (['payment initiated', 'payment_initiated'].includes(s)) return 'Payment Initiated'
  if (['payment requested', 'payment_requested'].includes(s)) return 'Payment Requested'
  return defaultStatus
}

export function ApplicationImportModal({
  isOpen,
  onClose,
  onSuccess,
  campaignId,
  campaignBrand,
  campaignCode,
}: ApplicationImportModalProps) {
  // Steps: 1 = File & Campaign, 2 = Column Mapping, 3 = Preview & Confirmation, 4 = Results
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)

  // Campaign selection state
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(campaignId || '')
  const [campaignSearch, setCampaignSearch] = useState('')

  // File parsing state
  const [file, setFile] = useState<File | null>(null)
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([])
  const [parsing, setParsing] = useState(false)

  // Column mapping: fieldKey -> CSV Header Name
  const [mappings, setMappings] = useState<Record<string, string>>({})
  const [defaultStatus, setDefaultStatus] = useState<string>('Applied')

  // Execution state
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; percentage: number }>({
    current: 0,
    total: 0,
    percentage: 0
  })
  const [importResults, setImportResults] = useState<{
    total: number
    created_users: number
    existing_users: number
    applications_created: number
    applications_updated: number
    skipped: number
    errors: { row: number; mobile: string; error: string }[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch campaigns if campaignId is not fixed
  useEffect(() => {
    if (isOpen) {
      if (campaignId) {
        setSelectedCampaignId(campaignId)
      } else {
        fetchCampaigns()
      }
    }
  }, [isOpen, campaignId])

  const fetchCampaigns = async () => {
    setLoadingCampaigns(true)
    try {
      const res = await fetch('/api/admin/campaigns')
      const data = await res.json()
      setCampaigns(data.campaigns || [])
    } catch {
      toast.error('Failed to load campaigns list')
    } finally {
      setLoadingCampaigns(false)
    }
  }

  const filteredCampaigns = useMemo(() => {
    if (!campaignSearch.trim()) return campaigns
    const q = campaignSearch.toLowerCase()
    return campaigns.filter(c =>
      c.brand_name.toLowerCase().includes(q) ||
      c.campaign_code.toLowerCase().includes(q)
    )
  }, [campaigns, campaignSearch])

  const currentSelectedCampaign = useMemo(() => {
    if (campaignId) {
      return {
        id: campaignId,
        brand_name: campaignBrand || 'Active Campaign',
        campaign_code: campaignCode || ''
      }
    }
    return campaigns.find(c => c.id === selectedCampaignId)
  }, [campaignId, campaignBrand, campaignCode, campaigns, selectedCampaignId])

  // Download Sample Google Form CSV
  const downloadSampleGoogleFormCSV = () => {
    const sampleHeaders = [
      'Timestamp',
      'What is your name?',
      'Mobile number / WhatsApp',
      'Instagram profile link',
      'Email address',
      'How many followers do you have?',
      'City',
      'State',
      'Gender',
      'Commercial quote (₹)',
      'Can you visit Mumbai store this Saturday?',
      'Shoe / T-Shirt Size'
    ]

    const sampleRows = [
      [
        '2026/09/10 11:20:45 AM GMT+5:30',
        'Rohan Sharma',
        '9876543210',
        'https://instagram.com/rohan_creates',
        'rohan@example.com',
        '45.5k',
        'Mumbai',
        'Maharashtra',
        'Male',
        '5000',
        'Yes, after 3 PM',
        'Medium / UK 8'
      ],
      [
        '2026/09/10 11:45:12 AM GMT+5:30',
        'Priya Kapoor',
        '+91 9988776655',
        '@priya_lifestyle',
        'priya@example.com',
        '120k',
        'Delhi',
        'Delhi',
        'Female',
        '8500',
        'Yes, anytime',
        'Small / UK 6'
      ]
    ]

    const csvContent = '\uFEFF' + Papa.unparse({
      fields: sampleHeaders,
      data: sampleRows
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `google_form_application_template_${currentSelectedCampaign?.campaign_code || 'sample'}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success('Downloaded Google Form sample CSV template!')
  }

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) processFile(selectedFile)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) processFile(droppedFile)
  }

  const processFile = (inputFile: File) => {
    const validExts = ['.csv', '.txt']
    const ext = inputFile.name.substring(inputFile.name.lastIndexOf('.')).toLowerCase()
    if (!validExts.includes(ext)) {
      toast.error('Please upload a CSV (.csv) file exported from Google Forms')
      return
    }

    setParsing(true)
    setFile(inputFile)

    Papa.parse<Record<string, string>>(inputFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false)
        if (!results.data || results.data.length === 0) {
          toast.error('The uploaded CSV file is empty')
          return
        }

        const headers = results.meta.fields || []
        setRawHeaders(headers)
        setRawRows(results.data)

        // Automatically map columns based on synonyms
        const autoMappings: Record<string, string> = {}
        const matchedHeaders = new Set<string>()

        TARGET_FIELDS.forEach(field => {
          for (const header of headers) {
            if (matchedHeaders.has(header)) continue
            const cleanHeader = header.trim().toLowerCase().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ')
            
            // Direct exact match
            if (field.synonyms.includes(cleanHeader)) {
              autoMappings[field.key] = header
              matchedHeaders.add(header)
              break
            }

            // Fuzzy partial match
            const partial = field.synonyms.some(syn => cleanHeader.includes(syn) || syn.includes(cleanHeader))
            if (partial) {
              autoMappings[field.key] = header
              matchedHeaders.add(header)
              break
            }
          }
        })

        setMappings(autoMappings)
        setStep(2) // Move to column mapping step
        toast.success(`Loaded ${results.data.length} responses. Please review column mappings.`)
      },
      error: (err) => {
        setParsing(false)
        toast.error(`CSV Parsing error: ${err.message}`)
      }
    })
  }

  // Update a single field's mapping
  const handleMappingChange = (fieldKey: string, headerName: string) => {
    setMappings(prev => {
      const next = { ...prev }
      if (!headerName) {
        delete next[fieldKey]
      } else {
        next[fieldKey] = headerName
      }
      return next
    })
  }

  // Identify unmapped columns (which will become form_data answers)
  const unmappedHeaders = useMemo(() => {
    const mappedHeaderValues = new Set(Object.values(mappings))
    return rawHeaders.filter(h => {
      // Exclude Timestamp by default from custom questions if it's purely a timestamp
      if (h.toLowerCase() === 'timestamp') return false
      return !mappedHeaderValues.has(h)
    })
  }, [rawHeaders, mappings])

  // Process rows for preview
  const parsedData = useMemo(() => {
    if (rawRows.length === 0) return { validRows: [], invalidRows: [] }

    const valid: any[] = []
    const invalid: any[] = []

    rawRows.forEach((row, idx) => {
      const rawMobile = mappings.mobile ? row[mappings.mobile] : ''
      const phone = cleanPhone(rawMobile)

      const name = mappings.full_name ? row[mappings.full_name]?.trim() : ''
      const email = mappings.email ? row[mappings.email]?.trim() : ''
      
      const rawInsta = mappings.instagram_username ? row[mappings.instagram_username] : ''
      const insta = extractInstagramUsername(rawInsta)

      const rawFollowers = mappings.followers ? row[mappings.followers] : ''
      const followersCount = parseFollowers(rawFollowers)

      const city = mappings.city ? row[mappings.city]?.trim() : ''
      const state = mappings.state ? row[mappings.state]?.trim() : ''
      const gender = mappings.gender ? row[mappings.gender]?.trim() : ''
      const category = mappings.category ? row[mappings.category]?.trim() : ''

      const rawAmount = mappings.final_payment ? row[mappings.final_payment] : ''
      const finalPayment = rawAmount ? Number(String(rawAmount).replace(/[^0-9.]/g, '')) || undefined : undefined

      const rawStatus = mappings.status ? row[mappings.status] : ''
      const status = normalizeStatus(rawStatus, defaultStatus)

      // Collect all unmapped headers into form_data
      const formData: Record<string, any> = {}
      unmappedHeaders.forEach(header => {
        const val = row[header]?.trim()
        if (val) {
          formData[header] = val
        }
      })

      const item = {
        _index: idx + 1,
        mobile: phone,
        full_name: name || undefined,
        email: email || undefined,
        instagram_username: insta || undefined,
        followers: followersCount || undefined,
        city: city || undefined,
        state: state || undefined,
        gender: gender || undefined,
        category: category || undefined,
        final_payment: finalPayment,
        status: status,
        form_data: Object.keys(formData).length > 0 ? formData : undefined,
        rawRow: row
      }

      if (phone && phone.length >= 10 && phone.length <= 15) {
        valid.push(item)
      } else {
        invalid.push({
          ...item,
          errorReason: !phone ? 'Missing phone/WhatsApp number' : `Invalid phone digits: "${phone}"`
        })
      }
    })

    return { validRows: valid, invalidRows: invalid }
  }, [rawRows, mappings, unmappedHeaders, defaultStatus])

  // Execute Batch Import
  const handleExecuteImport = async () => {
    if (!selectedCampaignId) {
      toast.error('Please select a target campaign for these applications')
      return
    }

    if (parsedData.validRows.length === 0) {
      toast.error('No valid rows found to import. Please check mobile mapping.')
      return
    }

    setImporting(true)
    setStep(4)

    const BATCH_SIZE = 250
    const totalBatches = Math.ceil(parsedData.validRows.length / BATCH_SIZE)
    setProgress({ current: 0, total: totalBatches, percentage: 0 })

    const accumulatedResults = {
      total: 0,
      created_users: 0,
      existing_users: 0,
      applications_created: 0,
      applications_updated: 0,
      skipped: 0,
      errors: [] as { row: number; mobile: string; error: string }[]
    }

    try {
      for (let i = 0; i < totalBatches; i++) {
        const batch = parsedData.validRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
        
        const payload = batch.map(r => ({
          mobile: r.mobile,
          full_name: r.full_name,
          email: r.email,
          instagram_username: r.instagram_username,
          followers: r.followers,
          city: r.city,
          state: r.state,
          gender: r.gender,
          category: r.category,
          final_payment: r.final_payment,
          status: r.status,
          form_data: r.form_data
        }))

        const res = await fetch('/api/admin/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            rows: payload,
            campaign_id: selectedCampaignId
          })
        })

        const data = await res.json()
        if (!res.ok) {
          throw new Error(data.error || `Batch ${i + 1} failed`)
        }

        accumulatedResults.total += data.results.total
        accumulatedResults.created_users += data.results.created_users
        accumulatedResults.existing_users += data.results.existing_users
        accumulatedResults.applications_created += data.results.applications_created
        accumulatedResults.applications_updated += data.results.applications_updated
        accumulatedResults.skipped += data.results.skipped

        if (data.results.errors && data.results.errors.length > 0) {
          const adjustedErrors = data.results.errors.map((e: any) => ({
            ...e,
            row: batch[e.row - 1]?._index || e.row
          }))
          accumulatedResults.errors.push(...adjustedErrors)
        }

        const currentBatchNum = i + 1
        setProgress({
          current: currentBatchNum,
          total: totalBatches,
          percentage: Math.round((currentBatchNum / totalBatches) * 100)
        })
      }

      setImportResults(accumulatedResults)
      toast.success(`Import complete! ${accumulatedResults.applications_created} created, ${accumulatedResults.applications_updated} updated`)
      onSuccess()
    } catch (err: any) {
      toast.error(err.message || 'Import failed midway')
      if (accumulatedResults.total > 0) {
        setImportResults(accumulatedResults)
      }
    } finally {
      setImporting(false)
    }
  }

  const resetModal = () => {
    setStep(1)
    setFile(null)
    setRawHeaders([])
    setRawRows([])
    setMappings({})
    setImportResults(null)
    if (!campaignId) setSelectedCampaignId('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200"
      >
        {/* ─── Modal Header ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">Import Applications</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                  Google Form / CSV
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {currentSelectedCampaign ? (
                  <>
                    Target Campaign: <span className="text-white font-medium">{currentSelectedCampaign.brand_name}</span>{' '}
                    {currentSelectedCampaign.campaign_code && (
                      <span className="text-indigo-400 font-mono text-[11px]">({currentSelectedCampaign.campaign_code})</span>
                    )}
                  </>
                ) : (
                  'Import external Google Form applicants into campaign management'
                )}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (!importing) {
                resetModal()
                onClose()
              }
            }}
            disabled={importing}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ─── Step Indicator ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-8 py-3 bg-slate-950/40 border-b border-white/5 shrink-0">
          {[
            { num: 1, label: 'Upload & Campaign' },
            { num: 2, label: 'Column Mapping' },
            { num: 3, label: 'Preview & Confirm' },
            { num: 4, label: 'Import Progress' }
          ].map((s, idx) => (
            <div key={s.num} className="flex items-center gap-2">
              <div
                className={`flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold transition-all ${
                  step === s.num
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-500/40'
                    : step > s.num
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {step > s.num ? <Check className="h-3.5 w-3.5" /> : s.num}
              </div>
              <span className={`text-xs font-medium hidden sm:inline ${step >= s.num ? 'text-white' : 'text-slate-500'}`}>
                {s.label}
              </span>
              {idx < 3 && <ChevronRight className="h-4 w-4 text-slate-700 hidden sm:inline ml-2" />}
            </div>
          ))}
        </div>

        {/* ─── Modal Body ──────────────────────────────────────────── */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* STEP 1: Upload & Target Campaign */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Campaign Picker (if not fixed) */}
              {!campaignId && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                    <span>1. Select Target Campaign <span className="text-rose-400">*</span></span>
                    {loadingCampaigns && <span className="text-xs text-indigo-400">Loading campaigns...</span>}
                  </label>
                  <div className="relative">
                    <Input
                      value={campaignSearch}
                      onChange={(e) => setCampaignSearch(e.target.value)}
                      placeholder="Search campaign by brand name or code..."
                      className="bg-slate-950/60 border-white/10 text-white text-xs h-9 rounded-xl pl-3 pr-8 focus-visible:ring-indigo-500/40"
                    />
                  </div>
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-white/10 bg-slate-950/40 divide-y divide-white/5">
                    {filteredCampaigns.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500">No matching campaigns found</div>
                    ) : (
                      filteredCampaigns.map(c => (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCampaignId(c.id)}
                          className={`p-2.5 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                            selectedCampaignId === c.id
                              ? 'bg-indigo-600/20 text-indigo-300 font-medium'
                              : 'hover:bg-white/5 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{c.brand_name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-400">
                              {c.campaign_code}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{c.platform}</span>
                            {selectedCampaignId === c.id && <Check className="h-4 w-4 text-indigo-400" />}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Upload Dropzone */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300">
                  2. Upload Google Form Responses (.CSV) <span className="text-rose-400">*</span>
                </label>

                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 hover:border-indigo-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all bg-slate-950/40 hover:bg-slate-950/70 group"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 group-hover:scale-105 transition-transform">
                      <Upload className="h-7 w-7" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Click or drag & drop Google Form CSV here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Exported directly from Google Forms or Google Sheets (.csv)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Download & Tips */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-950/50 border border-white/5">
                <div className="flex items-start gap-2.5">
                  <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Need the recommended format?</strong> Download the sample Google Form CSV template. It includes common influencer questions, store visit questions, and quotes.
                  </p>
                </div>
                <Button
                  onClick={downloadSampleGoogleFormCSV}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs h-8 px-3 rounded-lg shrink-0 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Download Template</span>
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: Intelligent Column Mapping */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div>
                  <h3 className="text-sm font-bold text-white">Match Google Form Questions to Fields</h3>
                  <p className="text-xs text-slate-400">
                    We auto-detected {Object.keys(mappings).length} columns based on common Google Form phrasing. You can modify any mapping below.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-1 rounded-lg">
                    {rawRows.length} responses loaded
                  </span>
                </div>
              </div>

              {/* Mapping Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {TARGET_FIELDS.map(field => {
                  const currentMapped = mappings[field.key] || ''
                  const isMatched = Boolean(currentMapped)

                  return (
                    <div
                      key={field.key}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isMatched
                          ? 'bg-slate-950/60 border-white/10'
                          : field.required
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : 'bg-slate-950/30 border-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-semibold text-white flex items-center gap-1">
                          {field.label}
                          {field.required && <span className="text-rose-400">*</span>}
                        </span>
                        {isMatched && (
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            Auto-matched
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mb-2 leading-tight">
                        {field.description}
                      </p>

                      <select
                        value={currentMapped}
                        onChange={(e) => handleMappingChange(field.key, e.target.value)}
                        className="w-full bg-slate-900 border border-white/10 text-white text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">-- Do not map --</option>
                        {rawHeaders.map(h => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                })}
              </div>

              {/* Unmapped Columns Notice */}
              {unmappedHeaders.length > 0 && (
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-indigo-400" />
                    <h4 className="text-xs font-semibold text-white">
                      Custom Google Form Questions ({unmappedHeaders.length})
                    </h4>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    The following Google Form questions were not mapped to standard user fields. Their full answers will automatically be saved into the applicant’s custom form data (Q&A):
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {unmappedHeaders.map(h => (
                      <span key={h} className="text-[10px] font-mono bg-white/5 border border-white/10 text-slate-300 px-2 py-1 rounded-md">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Preview & Confirmation */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Validation Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10">
                  <span className="text-[11px] text-slate-400">Total Responses</span>
                  <p className="text-xl font-bold text-white mt-0.5">{rawRows.length}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[11px] text-emerald-400 font-medium">Valid Ready to Import</span>
                  <p className="text-xl font-bold text-emerald-300 mt-0.5">{parsedData.validRows.length}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[11px] text-amber-400 font-medium">Incomplete / Skipped</span>
                  <p className="text-xl font-bold text-amber-300 mt-0.5">{parsedData.invalidRows.length}</p>
                </div>
              </div>

              {/* Default Application Status Option */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/40 border border-white/5">
                <div>
                  <span className="text-xs font-semibold text-white">Default Application Status</span>
                  <p className="text-[11px] text-slate-400">
                    Status applied when not specified by an individual row
                  </p>
                </div>
                <select
                  value={defaultStatus}
                  onChange={(e) => setDefaultStatus(e.target.value)}
                  className="bg-slate-900 border border-white/15 text-white text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Applied">Applied (Pending Review)</option>
                  <option value="Approved">Approved</option>
                  <option value="Under Review">Under Review</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              {/* Incomplete Rows Warning (if any) */}
              {parsedData.invalidRows.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span>{parsedData.invalidRows.length} row(s) missing valid phone/WhatsApp number</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    These rows will be skipped safely without stopping the rest of the import.
                  </p>
                </div>
              )}

              {/* Live Preview Table */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-300">
                  Sample Preview (First 5 Applicants)
                </span>
                <div className="border border-white/10 rounded-xl overflow-x-auto bg-slate-950/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02] text-slate-400 font-semibold">
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">Creator Name</th>
                        <th className="p-2.5">Phone (Cleaned)</th>
                        <th className="p-2.5">Instagram</th>
                        <th className="p-2.5">Followers</th>
                        <th className="p-2.5">Location</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5">Q&A Saved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {parsedData.validRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.02]">
                          <td className="p-2.5 text-slate-500 font-mono text-[11px]">{row._index}</td>
                          <td className="p-2.5 font-medium text-white">{row.full_name || '—'}</td>
                          <td className="p-2.5 font-mono text-emerald-400">{row.mobile}</td>
                          <td className="p-2.5">
                            {row.instagram_username ? (
                              <span className="text-indigo-300">@{row.instagram_username}</span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="p-2.5">
                            {row.followers ? row.followers.toLocaleString() : '—'}
                          </td>
                          <td className="p-2.5">
                            {[row.city, row.state].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="p-2.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/15 text-blue-300 border border-blue-500/20">
                              {row.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-[11px] text-slate-400">
                            {row.form_data ? (
                              <span className="text-indigo-400">
                                {Object.keys(row.form_data).length} question(s)
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Progress & Final Results */}
          {step === 4 && (
            <div className="py-6 space-y-6">
              {importing ? (
                <div className="text-center space-y-4 max-w-md mx-auto">
                  <div className="inline-flex p-4 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 animate-pulse">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Importing Applications...</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Processing batch {progress.current} of {progress.total} ({progress.percentage}%)
                    </p>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-indigo-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress.percentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Matching existing creator accounts, creating user profiles, and recording campaign applications.
                  </p>
                </div>
              ) : importResults ? (
                <div className="space-y-6 text-center max-w-xl mx-auto">
                  <div className="inline-flex p-4 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                    <CheckCircle2 className="h-10 w-10" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Import Completed Successfully!</h3>
                    <p className="text-xs text-slate-400 mt-1">
                      Target campaign:{' '}
                      <span className="text-white font-medium">{currentSelectedCampaign?.brand_name}</span>
                    </p>
                  </div>

                  {/* Results Breakdown Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-white/10">
                      <span className="text-[11px] text-slate-400">Total Processed</span>
                      <p className="text-lg font-bold text-white">{importResults.total}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                      <span className="text-[11px] text-indigo-400">New Creators</span>
                      <p className="text-lg font-bold text-indigo-300">{importResults.created_users}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <span className="text-[11px] text-emerald-400">Applications Created</span>
                      <p className="text-lg font-bold text-emerald-300">{importResults.applications_created}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <span className="text-[11px] text-cyan-400">Apps Updated</span>
                      <p className="text-lg font-bold text-cyan-300">{importResults.applications_updated}</p>
                    </div>
                  </div>

                  {/* Error Breakdown if any */}
                  {importResults.errors.length > 0 && (
                    <div className="text-left p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2 max-h-40 overflow-y-auto">
                      <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4" />
                        {importResults.errors.length} item(s) had issues:
                      </span>
                      <ul className="text-[11px] text-rose-200 divide-y divide-rose-500/10">
                        {importResults.errors.map((e, idx) => (
                          <li key={idx} className="py-1 flex justify-between">
                            <span>Row {e.row}: {e.mobile}</span>
                            <span className="text-slate-400">{e.error}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* ─── Modal Footer ────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-slate-900/90 shrink-0">
          <div>
            {step === 2 && (
              <Button
                onClick={() => setStep(1)}
                type="button"
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs h-9 px-3 rounded-xl cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Back
              </Button>
            )}
            {step === 3 && (
              <Button
                onClick={() => setStep(2)}
                type="button"
                variant="outline"
                size="sm"
                className="bg-white/5 border-white/10 hover:bg-white/10 text-white text-xs h-9 px-3 rounded-xl cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1.5" />
                Edit Mapping
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {step === 1 && (
              <Button
                onClick={() => {
                  if (!selectedCampaignId) {
                    toast.error('Please select a target campaign first')
                    return
                  }
                  if (!file) {
                    toast.error('Please choose a Google Form CSV file to upload')
                    return
                  }
                  setStep(2)
                }}
                disabled={!selectedCampaignId || !file || parsing}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4 rounded-xl cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <span>Continue to Column Mapping</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}

            {step === 2 && (
              <Button
                onClick={() => {
                  if (!mappings.mobile) {
                    toast.error('Mobile / WhatsApp column must be mapped')
                    return
                  }
                  setStep(3)
                }}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 px-4 rounded-xl cursor-pointer shadow-lg shadow-indigo-600/30"
              >
                <span>Preview Applicants</span>
                <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}

            {step === 3 && (
              <Button
                onClick={handleExecuteImport}
                disabled={parsedData.validRows.length === 0}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold h-9 px-5 rounded-xl cursor-pointer shadow-lg shadow-emerald-600/30"
              >
                <span>Import {parsedData.validRows.length} Applications</span>
                <Check className="h-3.5 w-3.5 ml-1.5" />
              </Button>
            )}

            {step === 4 && !importing && (
              <Button
                onClick={() => {
                  resetModal()
                  onClose()
                }}
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white text-xs font-semibold h-9 px-4 rounded-xl cursor-pointer"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  )
}
export default ApplicationImportModal
