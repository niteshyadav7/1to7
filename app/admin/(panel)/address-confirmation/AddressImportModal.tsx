'use client'

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Upload, FileSpreadsheet, X, CheckCircle2, AlertTriangle, 
  RefreshCw, ShieldCheck, ArrowRight, UserCheck, Sparkles,
  Info, AlertCircle, FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'

interface CampaignOption {
  id: string
  campaign_code: string
  brand_name: string
  deliverables?: string
}

interface AddressImportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialCampaignId?: string
}

export default function AddressImportModal({
  isOpen,
  onClose,
  onSuccess,
  initialCampaignId
}: AddressImportModalProps) {
  const [campaigns, setCampaigns] = useState<CampaignOption[]>([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(false)
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>(initialCampaignId || '')
  
  const [fileName, setFileName] = useState<string>('')
  const [fileSize, setFileSize] = useState<string>('')
  const [parsedRows, setParsedRows] = useState<any[]>([])
  const [isDragging, setIsDragging] = useState(false)
  
  // Options
  const [autoApproveCampaign, setAutoApproveCampaign] = useState(true)
  const [autoApproveAddress, setAutoApproveAddress] = useState(true)

  // Dry Run State
  const [analyzing, setAnalyzing] = useState(false)
  const [dryRunData, setDryRunData] = useState<any | null>(null)
  const [showUnmatchedList, setShowUnmatchedList] = useState(false)

  // Execution State
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch campaigns for dropdown
  useEffect(() => {
    if (!isOpen) return
    const fetchCampaigns = async () => {
      try {
        setLoadingCampaigns(true)
        const res = await fetch('/api/admin/address-confirmation/import')
        const data = await res.json()
        if (res.ok && data.campaigns) {
          setCampaigns(data.campaigns)
          if (!selectedCampaignId && data.campaigns.length > 0) {
            // Find Plum or first campaign
            const plum = data.campaigns.find((c: any) => c.brand_name?.toLowerCase().includes('plum'))
            setSelectedCampaignId(initialCampaignId || (plum ? plum.id : data.campaigns[0].id))
          }
        }
      } catch (err) {
        console.error('Failed to load campaigns for import:', err)
      } finally {
        setLoadingCampaigns(false)
      }
    }
    fetchCampaigns()
  }, [isOpen, initialCampaignId])

  // Trigger Dry Run whenever parsedRows or selectedCampaignId changes
  useEffect(() => {
    if (parsedRows.length > 0 && selectedCampaignId) {
      runDryRun(parsedRows, selectedCampaignId)
    } else {
      setDryRunData(null)
    }
  }, [parsedRows, selectedCampaignId, autoApproveCampaign, autoApproveAddress])

  const runDryRun = async (rows: any[], campaignId: string) => {
    setAnalyzing(true)
    setImportResult(null)
    try {
      const res = await fetch('/api/admin/address-confirmation/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaignId,
          rows,
          options: {
            auto_approve_campaign: autoApproveCampaign,
            auto_approve_address: autoApproveAddress,
            dry_run: true
          }
        })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setDryRunData(data)
      } else {
        toast.error(data.error || 'Pre-flight dry run failed')
      }
    } catch {
      toast.error('Network error during pre-flight dry run')
    } finally {
      setAnalyzing(false)
    }
  }

  // Handle File Upload (CSV or XLSX)
  const handleFileProcess = (file: File) => {
    if (!file) return
    setFileName(file.name)
    setFileSize((file.size / 1024).toFixed(1) + ' KB')
    setImportResult(null)

    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

    if (isExcel) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array' })
          const firstSheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[firstSheetName]
          const json = XLSX.utils.sheet_to_json(sheet)
          if (json.length === 0) {
            toast.error('Excel file is empty')
            return
          }
          setParsedRows(json)
          toast.success(`Loaded ${json.length} rows from Excel sheet`)
        } catch (err: any) {
          toast.error('Failed to parse Excel file: ' + err.message)
        }
      }
      reader.readAsArrayBuffer(file)
    } else {
      // CSV using PapaParse
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        transformHeader: (h) => h.trim(),
        complete: (results) => {
          if (results.errors.length > 0 && results.data.length === 0) {
            toast.error('CSV parse error: ' + results.errors[0].message)
            return
          }
          setParsedRows(results.data as any[])
          toast.success(`Loaded ${results.data.length} rows from CSV`)
        },
        error: (err) => {
          toast.error('Failed to parse CSV: ' + err.message)
        }
      })
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0])
    }
  }

  // Execute Live Import
  const handleExecuteImport = async () => {
    if (!selectedCampaignId) {
      toast.error('Please select a target campaign')
      return
    }
    if (parsedRows.length === 0) {
      toast.error('Please upload a CSV or Excel file')
      return
    }

    setImporting(true)
    try {
      const res = await fetch('/api/admin/address-confirmation/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: selectedCampaignId,
          rows: parsedRows,
          options: {
            auto_approve_campaign: autoApproveCampaign,
            auto_approve_address: autoApproveAddress,
            dry_run: false
          }
        })
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setImportResult(data)
        toast.success(data.message || 'Addresses imported successfully!')
        onSuccess()
      } else {
        toast.error(data.error || 'Import failed')
      }
    } catch {
      toast.error('Failed to communicate with import service')
    } finally {
      setImporting(false)
    }
  }

  const resetAll = () => {
    setFileName('')
    setFileSize('')
    setParsedRows([])
    setDryRunData(null)
    setImportResult(null)
    setShowUnmatchedList(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/10 rounded-3xl shadow-2xl p-6 space-y-6 text-slate-200 scrollbar-thin scrollbar-thumb-slate-700"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  Auto-Import Offline Delivery Addresses
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Smart Reconciler
                  </span>
                </h2>
                <p className="text-xs text-slate-400">
                  Upload Google Forms or manager sheets. Automatically resolves creator profiles, handles newlines, and prevents duplicates.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Campaign Selection & Ingestion Rules */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
              Target Campaign:
              {loadingCampaigns && <RefreshCw className="h-3 w-3 animate-spin text-emerald-400" />}
            </label>
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-medium text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>
                  {c.brand_name} ({c.campaign_code})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500">
              Applications and delivery addresses will be assigned to this campaign.
            </p>
          </div>

          <div className="space-y-2 p-3 rounded-xl bg-slate-950/60 border border-white/5">
            <label className="text-xs font-semibold text-slate-300">Automated Pipeline Rules:</label>
            <div className="space-y-1.5 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApproveCampaign}
                  onChange={(e) => setAutoApproveCampaign(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Auto-Approve Campaign Selection (<code className="text-emerald-400">status = &apos;Approved&apos;</code>)</span>
              </label>
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApproveAddress}
                  onChange={(e) => setAutoApproveAddress(e.target.checked)}
                  className="rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer"
                />
                <span>Auto-Verify Address for Brand Dispatch (<code className="text-emerald-400">address_status = &apos;Approved&apos;</code>)</span>
              </label>
            </div>
          </div>
        </div>

        {/* Dropzone / File Picker */}
        {!fileName ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-emerald-500 bg-emerald-500/10 scale-[1.01]'
                : 'border-white/10 bg-slate-950/40 hover:border-emerald-500/50 hover:bg-slate-950/80'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv, .xlsx, .xls"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0])
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="p-3.5 rounded-full bg-slate-800/80 border border-white/10 text-emerald-400">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">
                  Click to browse or drop your CSV / Excel sheet here
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports Google Forms exports, Courier sheets, or manager CSVs (.csv, .xlsx)
                </p>
              </div>
              <div className="flex items-center gap-2 pt-2 text-[11px] text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>Auto-matches by Phone, Instagram Handle, or Email</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/80 border border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{fileName}</p>
                <p className="text-[11px] text-slate-400">
                  {fileSize} • {parsedRows.length} total rows parsed
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={resetAll}
              className="bg-transparent border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 text-xs cursor-pointer"
            >
              Change File
            </Button>
          </div>
        )}

        {/* Pre-Flight Analysis / Dry-Run Results */}
        {analyzing && (
          <div className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 flex items-center justify-center gap-3">
            <RefreshCw className="h-5 w-5 animate-spin text-emerald-400" />
            <p className="text-xs font-medium text-slate-300">
              Analyzing rows, matching registered creators, and verifying compound duplicate constraints...
            </p>
          </div>
        )}

        {dryRunData && !analyzing && !importResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Pre-Flight Ingestion Analysis
              </h3>
              <span className="text-[11px] text-slate-400">
                {dryRunData.summary.uniqueMatchedCandidates} unique registered creators matched
              </span>
            </div>

            {/* Metric Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-[10px] font-semibold uppercase text-emerald-300">Will Upgrade</p>
                <p className="text-xl font-bold text-emerald-400">{dryRunData.summary.upgradesCount}</p>
                <p className="text-[10px] text-emerald-300/70 mt-0.5">Move to Approved + Verified</p>
              </div>

              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <p className="text-[10px] font-semibold uppercase text-indigo-300">New Applications</p>
                <p className="text-xl font-bold text-indigo-400">{dryRunData.summary.newApplicationsCount}</p>
                <p className="text-[10px] text-indigo-300/70 mt-0.5">Direct Brand Dispatch</p>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] font-semibold uppercase text-amber-300">Exact Duplicates</p>
                <p className="text-xl font-bold text-amber-400">{dryRunData.summary.exactDuplicatesSkipped}</p>
                <p className="text-[10px] text-amber-300/70 mt-0.5">Safely skipped (No change)</p>
              </div>

              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                <p className="text-[10px] font-semibold uppercase text-rose-300">Unmatched In DB</p>
                <p className="text-xl font-bold text-rose-400">{dryRunData.summary.unmatchedCount}</p>
                <p className="text-[10px] text-rose-300/70 mt-0.5">Not registered on 1to7</p>
              </div>
            </div>

            {/* Unmatched creators toggle */}
            {dryRunData.summary.unmatchedCount > 0 && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4" />
                    <span>{dryRunData.summary.unmatchedCount} creators could not be matched with 1to7 accounts</span>
                  </div>
                  <button
                    onClick={() => setShowUnmatchedList(!showUnmatchedList)}
                    className="text-[11px] font-bold text-rose-400 hover:underline cursor-pointer"
                  >
                    {showUnmatchedList ? 'Hide Unmatched' : 'Review List'}
                  </button>
                </div>

                {showUnmatchedList && (
                  <div className="max-h-40 overflow-y-auto rounded-lg bg-black/40 border border-white/5 p-2 text-[11px] space-y-1 font-mono">
                    {dryRunData.breakdown.unmatched_sample.map((u: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-slate-300 border-b border-white/5 pb-1">
                        <span>{u.name} (ph: {u.mobile || 'N/A'}, @{u.instagram_username || 'N/A'})</span>
                        <span className="text-rose-400 text-[10px]">{u.city || 'Missing'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Execution Success Report */}
        {importResult && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-500 text-slate-950 font-bold">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Import & Synchronization Complete!</h4>
                <p className="text-xs text-emerald-300">{importResult.message}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400 text-[10px] block">Profiles Updated</span>
                <span className="font-bold text-white text-sm">{importResult.stats?.profilesUpdated}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400 text-[10px] block">Applications Upgraded</span>
                <span className="font-bold text-emerald-400 text-sm">{importResult.stats?.applicationsUpdated}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400 text-[10px] block">New Apps Created</span>
                <span className="font-bold text-indigo-400 text-sm">{importResult.stats?.applicationsInserted}</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950/40">
                <span className="text-slate-400 text-[10px] block">Exact Duplicates Skipped</span>
                <span className="font-bold text-amber-400 text-sm">{importResult.stats?.exactDuplicatesSkipped}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          <Button
            variant="outline"
            onClick={onClose}
            className="bg-transparent border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 text-xs"
          >
            {importResult ? 'Close' : 'Cancel'}
          </Button>

          {!importResult ? (
            <Button
              onClick={handleExecuteImport}
              disabled={importing || analyzing || !dryRunData || dryRunData.summary.uniqueMatchedCandidates === 0}
              className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {importing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing Database Sync...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>
                    Execute Import ({dryRunData ? dryRunData.summary.upgradesCount + dryRunData.summary.newApplicationsCount : 0} Creators)
                  </span>
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={resetAll}
              className="h-10 px-5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
            >
              Import Another File
            </Button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
