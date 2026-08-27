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
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Link from 'next/link'
import { SetAdminHeader } from '@/components/admin/AdminHeaderContext'
import { extractInstagramUsername } from '@/lib/instagram-utils'

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
  'whatsapp': 'mobile',
  'whatsapp number': 'mobile',
  'mobile number / whatsapp': 'mobile',
  'phone no': 'mobile',
  'name': 'full_name',
  'full name': 'full_name',
  'full_name': 'full_name',
  'influencer name': 'full_name',
  'your name': 'full_name',
  'creator name': 'full_name',
  'what is your name?': 'full_name',
  'email': 'email',
  'email id': 'email',
  'email address': 'email',
  'instagram': 'instagram_username',
  'instagram username': 'instagram_username',
  'instagram id': 'instagram_username',
  'instagram_username': 'instagram_username',
  'insta id': 'instagram_username',
  'insta': 'instagram_username',
  'ig handle': 'instagram_username',
  'ig': 'instagram_username',
  'instagram handle': 'instagram_username',
  'instagram profile link': 'instagram_username',
  'instagram link': 'instagram_username',
  'paste your instagram link': 'instagram_username',
  'followers': 'followers',
  'follower count': 'followers',
  'follower': 'followers',
  'approx followers': 'followers',
  'gender': 'gender',
  'state': 'state',
  'city': 'city',
  'status': 'status',
  'application status': 'status',
  'user id': 'influencer_id',
  'campaign user id': 'influencer_id',
  'influencer id': 'influencer_id',
  'influencer_id': 'influencer_id',
  'partial payment': 'partial_payment',
  'partial_payment': 'partial_payment',
  'final payment': 'final_payment',
  'final_payment': 'final_payment',
  'amount': 'final_payment',
  'agreed commercial': 'final_payment',
  'commercial quote': 'final_payment',
  'deal amount': 'final_payment',
  'pending amount': 'pending_amount',
  'pending_amount': 'pending_amount',
  'order id': 'order_id',
  'order_id': 'order_id',
  'account name': 'account_name',
  'account_name': 'account_name',
  'account number': 'account_number',
  'account_number': 'account_number',
  'account no': 'account_number',
  'bank a/c no': 'account_number',
  'bank account number': 'account_number',
  'ifsc': 'ifsc_code',
  'ifsc code': 'ifsc_code',
  'ifsc_code': 'ifsc_code',
  'bank ifsc': 'ifsc_code',
  'category': 'category',
}

const VALID_STATUSES = ['Applied', 'Approved', 'Rejected', 'Completed', 'Payment Initiated', 'Payment Requested']

// ─── Status Normalization (Maps synonyms like 'yes', 'true', 'approved' to canonical DB status) ───
function normalizeStatus(rawStatus?: string): string {
  if (!rawStatus) return 'Applied'
  const s = rawStatus.trim().toLowerCase()
  if (['approved', 'approve', 'yes', 'y', 'true', '1', 'ok', 'pass', 'selected'].includes(s)) return 'Approved'
  if (['rejected', 'reject', 'no', 'n', 'false', '0', 'fail', 'declined'].includes(s)) return 'Rejected'
  if (['completed', 'complete', 'done', 'finished'].includes(s)) return 'Completed'
  if (['applied', 'pending', 'new', 'waiting', 'in review'].includes(s)) return 'Applied'
  if (['payment initiated', 'payment_initiated', 'paid partial', 'partial'].includes(s)) return 'Payment Initiated'
  if (['payment requested', 'payment_requested', 'requested'].includes(s)) return 'Payment Requested'

  // Match case-insensitively to VALID_STATUSES
  const found = VALID_STATUSES.find(v => v.toLowerCase() === s)
  return found || rawStatus.trim()
}

// ─── Helpers ───────────────────────────────────────────────
function normalizeHeader(header: string): string {
  const cleaned = header.trim().toLowerCase().replace(/[_\-\.]/g, ' ').replace(/\s+/g, ' ')
  return COLUMN_MAP[cleaned] || ''
}

function validateRow(row: ParsedRow): ParsedRow {
  const errors: string[] = []
  let mobile = row.mobile ? row.mobile.toString().trim() : ''
  const influencerId = row.influencer_id ? row.influencer_id.toString().trim() : ''

  // Normalize phone digits
  let digits = mobile.replace(/[\s\-\+]/g, '')
  if (digits.startsWith('91') && digits.length === 12) {
    digits = digits.slice(2)
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1)
  }

  if (digits.length >= 10 && digits.length <= 15) {
    mobile = digits
  } else if (mobile) {
    // If mobile is not a valid 10-15 digit phone:
    if (influencerId) {
      // If User ID exists, gracefully clear invalid mobile so User ID is used without failing validation
      mobile = ''
    } else {
      errors.push(`Invalid mobile format "${mobile}" (must be 10-15 digits)`)
    }
  }

  if (!mobile && !influencerId) {
    errors.push('Mobile number or User ID is missing')
  }

  // Normalize status if present
  let normalizedStatus = row.status ? normalizeStatus(row.status) : 'Applied'
  if (row.status && !VALID_STATUSES.includes(normalizedStatus)) {
    errors.push(`Invalid status "${row.status}". Allowed: Approved, Applied, Completed, Rejected (or yes/no)`)
  }

  return {
    ...row,
    mobile: mobile || '',
    influencer_id: influencerId || '',
    status: normalizedStatus,
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

// ─── CSV Cleaner & Formatter Helpers ─────────────────────────
function parseFollowersValue(val: any): string | number {
  if (!val) return ''
  let str = String(val).trim().toUpperCase()
  if (!str) return ''
  if (str.endsWith('K')) {
    const num = parseFloat(str.replace('K', ''))
    return isNaN(num) ? '' : Math.round(num * 1000)
  }
  if (str.endsWith('M')) {
    const num = parseFloat(str.replace('M', ''))
    return isNaN(num) ? '' : Math.round(num * 1000000)
  }
  const num = parseInt(str.replace(/,/g, ''), 10)
  return isNaN(num) ? '' : num
}

function cleanPhoneNumber(val: any): string {
  if (!val) return ''
  let str = String(val).trim().replace(/[\s\-\+\(\)]/g, '')
  if (str.startsWith('91') && str.length === 12) str = str.substring(2)
  if (str.startsWith('0') && str.length === 11) str = str.substring(1)
  return str
}

function cleanGenderValue(val: any): string {
  if (!val) return ''
  const s = String(val).trim().toLowerCase()
  if (s === 'female' || s === 'f') return 'Female'
  if (s === 'male' || s === 'm') return 'Male'
  if (s === 'other' || s === 'o') return 'Other'
  return String(val).trim()
}

interface CleanedUploadRow {
  _index: number
  influencer_id: string
  full_name: string
  mobile: string
  email: string
  instagram_username: string
  followers: string | number
  gender: string
  state: string
  city: string
  category: string
  account_name: string
  account_number: string
  ifsc_code: string
}

// ─── Main Component ────────────────────────────────────────
export default function ImportPage() {
  // Top Level Navigation
  const [activeMainTab, setActiveMainTab] = useState<'import' | 'formatter'>('import')

  // Import State
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
  const [importProgress, setImportProgress] = useState<{ current: number; total: number; processed: number } | null>(null)
  const [importResults, setImportResults] = useState<ImportResults | null>(null)
  const [previewSearch, setPreviewSearch] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // ─── CSV Formatter State ────────────────────────────────
  const [formatterFileName, setFormatterFileName] = useState('')
  const [formatterDragging, setFormatterDragging] = useState(false)
  const [formatterParsing, setFormatterParsing] = useState(false)
  const [formatterRows, setFormatterRows] = useState<CleanedUploadRow[]>([])
  const [formatterSearch, setFormatterSearch] = useState('')
  const [formatterStats, setFormatterStats] = useState({
    total: 0,
    validPhones: 0,
    validHandles: 0,
    withFollowers: 0,
    withBank: 0,
  })
  const formatterFileInputRef = useRef<HTMLInputElement>(null)

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

  // Prevent accidental tab closure during large bulk imports
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (importing) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [importing])

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

  // ─── CSV Formatter Logic ────────────────────────────────
  const handleFormatterFile = (file: File) => {
    if (!file) return

    const validTypes = ['text/csv', 'application/vnd.ms-excel', 'text/plain']
    const validExts = ['.csv', '.txt']
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase()

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast.error('Please upload a CSV file (.csv)')
      return
    }

    setFormatterParsing(true)
    setFormatterFileName(file.name)

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (!result.data || result.data.length === 0) {
          toast.error('The CSV file is empty')
          setFormatterParsing(false)
          return
        }

        const rawRows = result.data as Record<string, string>[]
        const seenUserIds = new Set<string>()
        let maxIdNum = 25000

        // Find initial max user ID from rows
        rawRows.forEach(r => {
          const rawId = (r['User ID'] || r['User Id'] || r['user_id'] || r['influencer_id'] || r['ID'] || '').trim()
          const num = parseInt(rawId.replace(/\D/g, ''), 10)
          if (!isNaN(num) && num > maxIdNum) maxIdNum = num
        })

        let validPhones = 0
        let validHandles = 0
        let withFollowers = 0
        let withBank = 0

        const cleanedList: CleanedUploadRow[] = rawRows.map((row, idx) => {
          let uid = (row['User ID'] || row['User Id'] || row['user_id'] || row['influencer_id'] || row['ID'] || '').trim()
          const name = (row['Name'] || row['Full Name'] || row['full_name'] || row['Creator Name'] || row['Influencer Name'] || '').trim()
          const rawPhone = row['Phone'] || row['Phone Number'] || row['Mobile'] || row['Mobile Number'] || row['Contact'] || row['Whatsapp'] || ''
          const phone = cleanPhoneNumber(rawPhone)
          const email = (row['Email'] || row['Email ID'] || row['Email Address'] || '').trim()
          
          const rawInsta = row['Instagram ID'] || row['Instagram Username'] || row['Instagram Handle'] || row['Instagram Link'] || row['Instagram'] || row['Insta ID'] || row['IG'] || ''
          const insta = extractInstagramUsername(rawInsta)

          const rawFollowers = row['Followers'] || row['Follower Count'] || row['Approx Followers'] || ''
          const followers = parseFollowersValue(rawFollowers)

          const rawGender = row['Gender'] || row['Sex'] || ''
          const gender = cleanGenderValue(rawGender)

          const state = (row['State'] || row['Region'] || '').trim()
          const city = (row['City'] || row['Location'] || '').trim()
          const category = (row['Category'] || row['Niche'] || '').trim()

          const accName = (row['Account Name'] || row['Account Holder Name'] || row['A/C Name'] || '').trim()
          const accNum = (row['Account Number'] || row['Account No'] || row['Bank Account Number'] || row['Bank A/C No'] || '').trim()
          const ifsc = (row['IFSC'] || row['IFSC Code'] || row['Bank IFSC'] || '').trim()

          if (phone && phone.length >= 10) validPhones++
          if (insta) validHandles++
          if (followers) withFollowers++
          if (accNum || ifsc) withBank++

          if (uid && seenUserIds.has(uid)) {
            maxIdNum++
            uid = `HY${maxIdNum}`
          } else if (uid) {
            seenUserIds.add(uid)
          }

          return {
            _index: idx + 1,
            influencer_id: uid,
            full_name: name,
            mobile: phone,
            email: email,
            instagram_username: insta,
            followers: followers,
            gender: gender,
            state: state,
            city: city,
            category: category,
            account_name: accName,
            account_number: accNum,
            ifsc_code: ifsc,
          }
        })

        setFormatterRows(cleanedList)
        setFormatterStats({
          total: cleanedList.length,
          validPhones,
          validHandles,
          withFollowers,
          withBank,
        })
        setFormatterParsing(false)
        toast.success(`Successfully formatted ${cleanedList.length.toLocaleString()} rows into upload-ready format!`)
      },
      error: (err) => {
        toast.error(`CSV Parsing error: ${err.message}`)
        setFormatterParsing(false)
      }
    })
  }

  const downloadFormattedCSV = () => {
    if (formatterRows.length === 0) return toast.error('No formatted data to download')

    const headers = [
      'User ID',
      'Name',
      'Phone',
      'Email',
      'Instagram ID',
      'Followers',
      'Gender',
      'State',
      'City',
      'Category',
      'Account Name',
      'Account Number',
      'IFSC'
    ]

    function escapeCell(val: any) {
      if (val === null || val === undefined) return '""'
      let str = String(val).trim()
      str = str.replace(/\r\n|\r|\n/g, ' ')
      str = str.replace(/"/g, '""')
      return `"${str}"`
    }

    const csvRows = [headers.map(h => escapeCell(h)).join(',')]

    for (const r of formatterRows) {
      const line = [
        escapeCell(r.influencer_id),
        escapeCell(r.full_name),
        escapeCell(r.mobile),
        escapeCell(r.email),
        escapeCell(r.instagram_username),
        escapeCell(r.followers),
        escapeCell(r.gender),
        escapeCell(r.state),
        escapeCell(r.city),
        escapeCell(r.category),
        escapeCell(r.account_name),
        escapeCell(r.account_number),
        escapeCell(r.ifsc_code),
      ].join(',')
      csvRows.push(line)
    }

    const finalCsv = '\uFEFF' + csvRows.join('\r\n')
    const blob = new Blob([finalCsv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const cleanBaseName = formatterFileName.replace(/\.[^/.]+$/, '') || 'formatted_upload'
    a.download = `${cleanBaseName}_upload_format.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success(`Downloaded upload-ready CSV with ${formatterRows.length.toLocaleString()} rows!`)
  }

  const sendToBulkImport = () => {
    if (formatterRows.length === 0) return toast.error('No data to import')

    const rows: ParsedRow[] = formatterRows.map((r, idx) => {
      const parsed: ParsedRow = {
        _rowIndex: idx + 1,
        mobile: r.mobile || '',
        influencer_id: r.influencer_id || '',
        full_name: r.full_name || '',
        email: r.email || '',
        instagram_username: r.instagram_username || '',
        followers: String(r.followers || ''),
        gender: r.gender || '',
        state: r.state || '',
        city: r.city || '',
        category: r.category || '',
        account_name: r.account_name || '',
        account_number: r.account_number || '',
        ifsc_code: r.ifsc_code || '',
        status: 'Applied',
        _valid: true,
        _errors: []
      }
      return validateRow(parsed)
    })

    setParsedRows(rows)
    setFileName(`${formatterFileName} (Cleaned)`)
    setActiveMainTab('import')
    setStep(3)
    toast.success(`Loaded ${rows.length.toLocaleString()} cleaned rows into Bulk Import!`)
  }

  const resetFormatter = () => {
    setFormatterFileName('')
    setFormatterRows([])
    setFormatterSearch('')
    setFormatterStats({ total: 0, validPhones: 0, validHandles: 0, withFollowers: 0, withBank: 0 })
  }

  const filteredFormatterRows = useMemo(() => {
    if (!formatterSearch.trim()) return formatterRows
    const q = formatterSearch.toLowerCase()
    return formatterRows.filter(r =>
      r.full_name.toLowerCase().includes(q) ||
      r.mobile.toLowerCase().includes(q) ||
      r.influencer_id.toLowerCase().includes(q) ||
      r.instagram_username.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q)
    )
  }, [formatterRows, formatterSearch])

  // ─── Import Submit ──────────────────────────────────────
  const handleImport = async () => {
    if ((importMode === 'campaign' && !selectedCampaign) || parsedRows.length === 0) return

    const validRows = parsedRows.filter(r => r._valid)
    if (validRows.length === 0) {
      toast.error('No valid rows to import')
      return
    }

    setImporting(true)
    
    const BATCH_SIZE = 500
    const totalBatches = Math.ceil(validRows.length / BATCH_SIZE)
    setImportProgress({ current: 0, total: totalBatches, processed: 0 })

    const accumulatedResults: ImportResults = {
      total: 0,
      created_users: 0,
      existing_users: 0,
      applications_created: 0,
      applications_updated: 0,
      skipped: 0,
      errors: [],
    }

    try {
      for (let i = 0; i < totalBatches; i++) {
        setImportProgress({ current: i + 1, total: totalBatches, processed: i * BATCH_SIZE })
        
        const batch = validRows.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE)
        
        const payload = batch.map(r => ({
          mobile: r.mobile ? r.mobile.replace(/[\s\-\+]/g, '') : '',
          influencer_id: r.influencer_id || undefined,
          full_name: r.full_name || undefined,
          email: r.email || undefined,
          instagram_username: extractInstagramUsername(r.instagram_username) || undefined,
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
          throw new Error(data.error || `Batch ${i + 1} failed`)
        }
        
        // Aggregate results
        accumulatedResults.total += data.results.total
        accumulatedResults.created_users += data.results.created_users
        accumulatedResults.existing_users += data.results.existing_users
        accumulatedResults.applications_created += data.results.applications_created
        accumulatedResults.applications_updated += data.results.applications_updated
        accumulatedResults.skipped += data.results.skipped
        
        // Adjust error rows to match original CSV index
        if (data.results.errors && data.results.errors.length > 0) {
          const adjustedErrors = data.results.errors.map((e: any) => {
            const originalRow = batch[e.row - 1]?._rowIndex || 'Unknown'
            return {
              ...e,
              row: originalRow
            }
          })
          accumulatedResults.errors.push(...adjustedErrors)
        }
      }

      setImportResults(accumulatedResults)
      toast.success(`Import complete! ${accumulatedResults.applications_created} new, ${accumulatedResults.applications_updated} updated`)
    } catch (err: any) {
      toast.error(err.message || 'Import failed midway')
      if (accumulatedResults.total > 0) {
        setImportResults(accumulatedResults)
      }
    } finally {
      setImporting(false)
      setImportProgress(null)
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
    setImportProgress(null)
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

  // ─── Download dynamic template CSV based on selected campaign ───
  const downloadTemplate = async () => {
    let headers = [
      'Full Name',
      'Mobile Number',
      'Email',
      'Instagram Username',
      'Followers',
      'Gender',
      'State',
      'City',
      'Status',
    ]

    let sampleRow: Record<string, string> = {
      'Full Name': 'Pooja Sharma',
      'Mobile Number': '9876543210',
      'Email': 'pooja.sharma@example.com',
      'Instagram Username': '@poojasharma',
      'Followers': '45000',
      'Gender': 'Female',
      'State': 'Maharashtra',
      'City': 'Mumbai',
      'Status': 'Approved',
    }

    if (selectedCampaign) {
      try {
        const res = await fetch(`/api/admin/campaigns/${selectedCampaign.id}`)
        const data = await res.json()
        const camp = data.campaign || {}

        // Add custom fields
        if (Array.isArray(camp.custom_fields) && camp.custom_fields.length > 0) {
          camp.custom_fields.forEach((field: any) => {
            const fName = field.name || field.label || 'Custom Field'
            if (!headers.includes(fName)) {
              headers.push(fName)
              sampleRow[fName] = field.type === 'select' && field.options?.[0] ? field.options[0] : 'Sample Response'
            }
          })
        }

        // Add commercial & bank fields for paid campaigns
        headers.push('Agreed Commercial', 'Bank Account Number', 'IFSC Code', 'Account Holder Name')
        sampleRow['Agreed Commercial'] = '5000'
        sampleRow['Bank Account Number'] = '987654321098'
        sampleRow['IFSC Code'] = 'HDFC0001234'
        sampleRow['Account Holder Name'] = 'Pooja Sharma'
      } catch {
        headers.push('Agreed Commercial', 'Bank Account Number', 'IFSC Code')
      }
    }

    const csvData = [sampleRow]
    const csv = Papa.unparse({ fields: headers, data: csvData })
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Template_${selectedCampaign ? selectedCampaign.campaign_code : 'Influencer_Import'}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${selectedCampaign ? selectedCampaign.campaign_code : 'General'} CSV template!`)
  }

  // ─── Download failed / error rows as CSV ─────────────────
  const downloadFailedRows = () => {
    if (!importResults || importResults.errors.length === 0) return

    const data = importResults.errors.map(err => {
      const original = parsedRows.find(r => r._rowIndex === err.row)
      return {
        'Row Number': err.row,
        'Mobile': err.mobile !== '(empty)' ? err.mobile : (original?.mobile || ''),
        'User ID': original?.influencer_id || '',
        'Full Name': original?.full_name || '',
        'Email': original?.email || '',
        'Instagram Handle': original?.instagram_username || '',
        'Followers': original?.followers || '',
        'Gender': original?.gender || '',
        'State': original?.state || '',
        'City': original?.city || '',
        'Account Number': original?.account_number || '',
        'IFSC': original?.ifsc_code || '',
        'Account Name': original?.account_name || '',
        'Category': original?.category || '',
        'Error Reason': err.error,
      }
    })

    const csv = Papa.unparse(data)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `failed_import_rows_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${data.length} failed rows as CSV`)
  }

  return (
    <div className="space-y-6">
      {/* Header Injection */}
      <SetAdminHeader>
        <div className="flex items-center justify-between gap-4 w-full">
          <div>
            <h1 className="text-xl font-extrabold text-white tracking-tight">Bulk Import Sync</h1>
            <p className="text-xs text-slate-400">Import &amp; format influencer spreadsheets into platform-ready data</p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-800/80 text-slate-300 border border-white/10 hover:bg-slate-800 hover:text-white transition-all cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            Download Template
          </button>
        </div>
      </SetAdminHeader>

      {/* ─── Top Tabs Switcher ─── */}
      <div className="flex items-center gap-2 border-b border-white/10 pb-4">
        <button
          onClick={() => setActiveMainTab('import')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'import'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <FileUp className="h-4 w-4" />
          Direct Bulk Import
        </button>
        <button
          onClick={() => setActiveMainTab('formatter')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeMainTab === 'formatter'
              ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-500/20'
              : 'bg-slate-900/60 text-slate-400 hover:text-white border border-white/5'
          }`}
        >
          <Sparkles className="h-4 w-4 text-pink-300" />
          CSV Cleaner &amp; Formatter
        </button>
      </div>

      {activeMainTab === 'formatter' ? (
        /* ─── CSV Cleaner & Formatter Tab ─── */
        <div className="space-y-6">
          {formatterRows.length === 0 ? (
            /* Upload Screen */
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-8 max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-3 rounded-2xl bg-pink-500/10 border border-pink-500/20 text-pink-400 mb-2">
                  <Sparkles className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-white">Smart CSV Cleaner &amp; Formatter</h2>
                <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                  Upload any raw Google Forms or Portal Responses CSV. It will automatically extract clean Instagram handles, parse numbers/K/M followers, clean mobiles, and output an upload-ready CSV.
                </p>
              </div>

              {/* Dropzone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setFormatterDragging(true) }}
                onDragLeave={() => setFormatterDragging(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setFormatterDragging(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFormatterFile(file)
                }}
                onClick={() => formatterFileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                  formatterDragging
                    ? 'border-pink-500 bg-pink-500/10 scale-[0.99]'
                    : 'border-white/10 bg-slate-950/40 hover:border-pink-500/40 hover:bg-slate-900/80'
                }`}
              >
                <input
                  ref={formatterFileInputRef}
                  type="file"
                  accept=".csv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFormatterFile(file)
                  }}
                />

                {formatterParsing ? (
                  <div className="space-y-3">
                    <Loader2 className="h-10 w-10 text-pink-400 animate-spin mx-auto" />
                    <p className="text-sm font-semibold text-white">Cleaning &amp; Formatting Data...</p>
                    <p className="text-xs text-slate-500">Extracting handles, parsing followers, and normalizing phones</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-800 text-pink-400 flex items-center justify-center mx-auto border border-white/10">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Drag and drop your raw CSV here</p>
                      <p className="text-xs text-slate-500 mt-1">Supports Google Forms responses, passwords, portal exports (.csv)</p>
                    </div>
                    <Button variant="outline" size="sm" className="rounded-xl border-pink-500/30 text-pink-300 hover:bg-pink-500/10">
                      Browse File
                    </Button>
                  </div>
                )}
              </div>

              {/* Automatic Features */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {[
                  { title: 'Auto Handle Extraction', desc: 'Converts full URLs, story links & handles to clean usernames' },
                  { title: 'Smart Follower Parser', desc: 'Parses 12K, 364k, 1.5M into pure integer numbers' },
                  { title: 'Mobile Normalizer', desc: 'Strips +91, spaces & hyphens into valid 10-digit mobiles' },
                  { title: '100% Upload Compatible', desc: 'Generates standard headers for 1-click import' },
                ].map((feat, i) => (
                  <div key={i} className="p-3 bg-slate-800/40 border border-white/5 rounded-xl text-xs space-y-0.5">
                    <p className="font-bold text-slate-200 flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                      {feat.title}
                    </p>
                    <p className="text-[11px] text-slate-400 pl-5">{feat.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Results & Preview Screen */
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5 mb-5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-400">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white flex items-center gap-2">
                        {formatterFileName}
                        <span className="text-[10px] font-mono font-normal px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Formatted &amp; Cleaned
                        </span>
                      </h2>
                      <p className="text-xs text-slate-400">Ready to download or send directly to Bulk Import</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetFormatter}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Upload Another
                    </button>
                    <button
                      onClick={downloadFormattedCSV}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-green-500 text-white shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Upload-Ready CSV
                    </button>
                    <button
                      onClick={sendToBulkImport}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <FileUp className="h-3.5 w-3.5" />
                      Direct Import ({formatterStats.total.toLocaleString()})
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="bg-slate-800/60 rounded-xl p-3.5 border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Total Rows</p>
                    <p className="text-xl font-bold text-white">{formatterStats.total.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5 border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Instagram Handles</p>
                    <p className="text-xl font-bold text-pink-400">{formatterStats.validHandles.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5 border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Valid Mobiles</p>
                    <p className="text-xl font-bold text-emerald-400">{formatterStats.validPhones.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5 border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Followers Parsed</p>
                    <p className="text-xl font-bold text-indigo-400">{formatterStats.withFollowers.toLocaleString()}</p>
                  </div>
                  <div className="bg-slate-800/60 rounded-xl p-3.5 border border-white/5">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Bank Records</p>
                    <p className="text-xl font-bold text-amber-400">{formatterStats.withBank.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Data Preview Table */}
              <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">Cleaned Data Preview</h3>
                    <span className="text-xs text-slate-500 font-mono">({filteredFormatterRows.length.toLocaleString()} matching)</span>
                  </div>

                  <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                      type="text"
                      placeholder="Search names, phones, handles, IDs..."
                      value={formatterSearch}
                      onChange={(e) => setFormatterSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-pink-500"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[480px] custom-scrollbar">
                  <table className="w-full text-xs text-left">
                    <thead className="sticky top-0 bg-slate-950/90 backdrop-blur-md border-b border-white/10 text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">User ID</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Phone</th>
                        <th className="px-4 py-3">Instagram Handle</th>
                        <th className="px-4 py-3">Followers</th>
                        <th className="px-4 py-3">Gender</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">Bank Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-300">
                      {filteredFormatterRows.slice(0, 100).map((r) => (
                        <tr key={r._index} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5 font-mono text-slate-500">{r._index}</td>
                          <td className="px-4 py-2.5 font-mono font-bold text-indigo-300">{r.influencer_id || 'Auto'}</td>
                          <td className="px-4 py-2.5 font-semibold text-white">{r.full_name || '—'}</td>
                          <td className="px-4 py-2.5 font-mono text-slate-300">{r.mobile || '—'}</td>
                          <td className="px-4 py-2.5">
                            {r.instagram_username ? (
                              <span className="font-semibold text-pink-400">@{r.instagram_username}</span>
                            ) : (
                              <span className="text-slate-500 italic">None</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-300">
                            {r.followers ? Number(r.followers).toLocaleString() : '—'}
                          </td>
                          <td className="px-4 py-2.5 capitalize">{r.gender || '—'}</td>
                          <td className="px-4 py-2.5 truncate max-w-[160px]">
                            {r.city ? `${r.city}, ` : ''}{r.state || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {r.account_number ? (
                              <span className="text-[10px] font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded font-bold">
                                {r.ifsc_code ? `${r.ifsc_code} • ` : ''}***{r.account_number.slice(-4)}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px]">No bank</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredFormatterRows.length > 100 && (
                  <div className="px-4 py-3 border-t border-white/5 text-center bg-slate-950/40">
                    <p className="text-xs text-slate-400">
                      Showing first 100 of {filteredFormatterRows.length.toLocaleString()} rows. All {formatterRows.length.toLocaleString()} rows will be exported in the download.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ─── Direct Bulk Import Tab ─── */
        <>
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
                <div className="flex items-center justify-between gap-4 mb-3">
                  <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Failed Rows ({importResults.errors.length})
                  </h3>
                  <button
                    onClick={downloadFailedRows}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 hover:text-white border border-red-500/30 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm shadow-red-500/10"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download Failed Rows CSV
                  </button>
                </div>
                <div className="max-h-[220px] overflow-y-auto space-y-1 custom-scrollbar">
                  {importResults.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 bg-red-500/5 border border-red-500/10 rounded-lg text-xs">
                      <span className="text-red-400 font-mono font-bold">Row {err.row}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-400 font-mono">{err.mobile}</span>
                      <span className="text-slate-500">|</span>
                      <span className="text-red-300 flex-1">{err.error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className="h-4 w-4" />
              Import More
            </button>
            {importResults.errors.length > 0 && (
              <button
                onClick={downloadFailedRows}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500/10 text-red-300 border border-red-500/25 hover:bg-red-500/20 hover:text-white transition-all cursor-pointer"
              >
                <Download className="h-4 w-4" />
                Download Failed List ({importResults.errors.length})
              </button>
            )}
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
                <p className="text-sm text-slate-400 mb-4">
                  Upload your Google Sheet / Form export as a .csv file. Columns will be auto-mapped to profile & custom campaign fields.
                </p>

                {/* Template Download Card */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-white/10 flex items-center justify-between mb-5">
                  <div className="flex items-center gap-2.5">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-xs font-bold text-white">
                        {selectedCampaign ? `${selectedCampaign.brand_name} Template` : 'Standard Import Template'}
                      </p>
                      <p className="text-[10px] text-slate-400">Pre-formatted CSV with all required & custom fields</p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={downloadTemplate}
                    className="h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer shadow-sm flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download CSV
                  </Button>
                </div>

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
                  <p className="text-[10px] text-emerald-400/90 mt-3 flex items-center justify-center gap-1 font-medium">
                    <Sparkles className="h-3 w-3" /> Supports any size — 50k, 100k+ rows (automatically chunked & synced smoothly)
                  </p>

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

              {/* Validation Errors Notice */}
              {invalidCount > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/25 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs">
                    <p className="font-semibold text-red-300">
                      {invalidCount} {invalidCount === 1 ? 'row has' : 'rows have'} errors and will be skipped:
                    </p>
                    <ul className="list-disc list-inside text-[11px] text-red-300/80 space-y-0.5">
                      {Array.from(new Set(parsedRows.flatMap(r => r._errors))).map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Check the &quot;Import Status&quot; column below for details on each row, or remove invalid rows using the trash icon.
                    </p>
                  </div>
                </div>
              )}

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
                        <th className="px-4 py-3 text-[10px] uppercase tracking-wider font-bold text-slate-500 min-w-[150px]">Import Status</th>
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
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="h-3 w-3" /> Ready
                              </span>
                            ) : (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
                                  <XCircle className="h-3 w-3 text-red-400" /> Error
                                </span>
                                {row._errors.map((err, errIdx) => (
                                  <p key={errIdx} className="text-[10px] text-red-400 leading-tight">
                                    • {err}
                                  </p>
                                ))}
                              </div>
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

                {/* Live Import Progress Banner for Large Uploads */}
                {importing && importProgress && (
                  <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-indigo-300 flex items-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-400" />
                        Processing batch {importProgress.current} of {importProgress.total}...
                      </span>
                      <span className="font-mono text-white font-bold">
                        {Math.min(validCount, importProgress.current * 500)} / {validCount} ({Math.round((importProgress.current / importProgress.total) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.round((importProgress.current / importProgress.total) * 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      ⚡ High-speed sync in progress. Please keep this tab open until complete.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleReset}
                    disabled={importing}
                    className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium bg-slate-800 text-slate-300 border border-white/10 hover:bg-slate-700 hover:text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                        Syncing {validCount} Creators ({Math.round((importProgress?.current || 1) / (importProgress?.total || 1) * 100)}%)...
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
    </>
  )}
</div>
  )
}
