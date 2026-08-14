'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Papa from 'papaparse'
import {
  Upload, Download, FileSpreadsheet, AlertCircle, CheckCircle2,
  X, Loader2, FileText, Check, AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface BulkCampaignUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

interface ParsedCampaignRow {
  rowNum: number
  campaign_code?: string
  brand_name: string
  platform: string
  category?: string
  budget_type?: string
  budget_amount?: string | number
  gender_required?: string
  requirements?: string
  deliverables?: string
  location?: string
  looking_for?: string
  followers?: string
  additional_info?: string
  status?: string
  is_live?: boolean | string
  isValid: boolean
  errorReason?: string
}

const SAMPLE_CSV_HEADERS = [
  'campaign_code',
  'brand_name',
  'platform',
  'category',
  'budget_type',
  'budget_amount',
  'gender_required',
  'requirements',
  'deliverables',
  'location',
  'looking_for',
  'followers',
  'additional_info',
  'status',
  'is_live'
]

const SAMPLE_CSV_DATA = [
  {
    campaign_code: 'DEL-101',
    brand_name: 'Delhair',
    platform: 'Instagram',
    category: 'Haircare',
    budget_type: 'Barter',
    budget_amount: '0',
    gender_required: 'Any',
    requirements: 'Promote haircare range in 1 reel + 2 stories',
    deliverables: '1 Reel + 2 Stories',
    location: 'Pan India',
    looking_for: 'Female content creators with high engagement',
    followers: '5k+',
    additional_info: 'Product link sent after approval',
    status: 'Active',
    is_live: 'true'
  }
]

export function BulkCampaignUploadModal({
  isOpen,
  onClose,
  onSuccess
}: BulkCampaignUploadModalProps) {
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedCampaignRow[]>([])
  const [parsing, setParsing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const downloadSampleCSV = () => {
    const csvContent = Papa.unparse({
      fields: SAMPLE_CSV_HEADERS,
      data: SAMPLE_CSV_DATA
    })

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', 'campaigns_bulk_upload_template.csv')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success('Downloaded sample CSV template!')
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      processCSVFile(selectedFile)
    }
  }

  const processCSVFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith('.csv')) {
      toast.error('Please upload a valid CSV file (.csv)')
      return
    }

    setFile(selectedFile)
    setParsing(true)

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: 'greedy',
      complete: (results) => {
        const rows: ParsedCampaignRow[] = results.data.map((row: any, idx: number) => {
          const brand_name = (row.brand_name || row['Brand Name'] || row.brand || '').toString().trim()
          const platform = (row.platform || row['Platform'] || '').toString().trim()
          const campaign_code = (row.campaign_code || row['Campaign Code'] || '').toString().trim()

          let isValid = true
          let errorReason = ''

          if (!brand_name) {
            isValid = false
            errorReason = 'Missing Brand Name'
          } else if (!platform) {
            isValid = false
            errorReason = 'Missing Platform'
          }

          return {
            rowNum: idx + 1,
            campaign_code,
            brand_name,
            platform,
            category: (row.category || row['Category'] || '').toString().trim(),
            budget_type: (row.budget_type || row['Budget Type'] || '').toString().trim(),
            budget_amount: row.budget_amount || row['Budget Amount'] || '0',
            gender_required: (row.gender_required || row['Gender Required'] || 'Any').toString().trim(),
            requirements: (row.requirements || row['Requirements'] || '').toString().trim(),
            deliverables: (row.deliverables || row['Deliverables'] || '').toString().trim(),
            location: (row.location || row['Location'] || '').toString().trim(),
            looking_for: (row.looking_for || row['Looking For'] || '').toString().trim(),
            followers: (row.followers || row['Followers'] || '').toString().trim(),
            additional_info: (row.additional_info || row['Additional Info'] || '').toString().trim(),
            status: (row.status || row['Status'] || 'Draft').toString().trim(),
            is_live: (row.is_live || row['Is Live'] || 'false').toString().trim().toLowerCase() === 'true',
            isValid,
            errorReason
          }
        })

        setParsedRows(rows)
        setParsing(false)

        const validCount = rows.filter(r => r.isValid).length
        const invalidCount = rows.length - validCount
        if (invalidCount > 0) {
          toast.warning(`Parsed ${rows.length} rows (${validCount} valid, ${invalidCount} invalid)`)
        } else {
          toast.success(`Successfully parsed ${rows.length} campaigns!`)
        }
      },
      error: (err) => {
        setParsing(false)
        toast.error(`Error reading CSV file: ${err.message}`)
      }
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      processCSVFile(droppedFile)
    }
  }

  const resetState = () => {
    setFile(null)
    setParsedRows([])
    setParsing(false)
    setUploading(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpload = async () => {
    const validCampaigns = parsedRows.filter(r => r.isValid)
    if (validCampaigns.length === 0) {
      toast.error('No valid campaigns found to upload')
      return
    }

    setUploading(true)

    try {
      const res = await fetch('/api/admin/campaigns/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaigns: validCampaigns })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload campaigns')
      }

      if (data.insertedCount > 0) {
        toast.success(`Successfully created ${data.insertedCount} campaigns!`)
      }

      if (data.failedCount > 0) {
        toast.error(`${data.failedCount} rows failed to insert`)
      }

      onSuccess()
      onClose()
      resetState()
    } catch (err: any) {
      toast.error(err.message || 'Error executing bulk upload')
    } finally {
      setUploading(false)
    }
  }

  const validRowsCount = parsedRows.filter(r => r.isValid).length
  const invalidRowsCount = parsedRows.length - validRowsCount

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-900/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white tracking-tight">Bulk Upload Campaigns</h2>
                <p className="text-xs text-slate-400">Upload multiple brand campaigns at once via CSV file</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetState()
                onClose()
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6 space-y-6 overflow-y-auto flex-1">
            {/* Step 1: Download Template Notice */}
            <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-indigo-200 uppercase tracking-wider">Step 1: Download Sample CSV Template</h4>
                  <p className="text-xs text-indigo-300/80 mt-0.5">
                    Download our pre-formatted template containing correct column headers and sample data rows.
                  </p>
                </div>
              </div>
              <Button
                onClick={downloadSampleCSV}
                variant="outline"
                className="h-9 px-4 rounded-xl border-indigo-500/30 bg-indigo-500/20 text-indigo-200 hover:bg-indigo-500/30 hover:text-white text-xs font-semibold shrink-0 cursor-pointer transition-all"
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                Download Template CSV
              </Button>
            </div>

            {/* Step 2: File Upload Zone */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Step 2: Choose or Drop CSV File</span>
                {file && (
                  <button
                    onClick={resetState}
                    className="text-[11px] text-pink-400 hover:underline flex items-center gap-1 cursor-pointer font-normal"
                  >
                    Clear File
                  </button>
                )}
              </label>

              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  file
                    ? 'border-indigo-500/50 bg-indigo-500/5'
                    : 'border-white/10 bg-slate-950/40 hover:border-indigo-500/30 hover:bg-slate-950/70'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {parsing ? (
                  <div className="flex flex-col items-center justify-center py-4 space-y-2">
                    <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                    <p className="text-xs font-medium text-slate-300">Parsing CSV rows...</p>
                  </div>
                ) : file ? (
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{file.name}</p>
                      <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB • Click or drag to replace</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-400">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        <span className="text-indigo-400 font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">Supports standard CSV files (.csv)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Step 3: Parsed Data Preview & Validation */}
            {parsedRows.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950/60 p-4 rounded-xl border border-white/5">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Step 3: Validation & Preview</h4>
                    <p className="text-xs text-slate-400">Review campaigns before creating them in database</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-white/5">
                      Total: {parsedRows.length}
                    </span>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                      Ready: {validRowsCount}
                    </span>
                    {invalidRowsCount > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/15 text-red-300 border border-red-500/30">
                        Invalid: {invalidRowsCount}
                      </span>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="border border-white/10 rounded-xl overflow-hidden max-h-64 overflow-y-auto bg-slate-950/50">
                  <table className="w-full text-left text-xs text-slate-300 border-collapse">
                    <thead className="sticky top-0 bg-slate-900 text-slate-400 border-b border-white/10 uppercase tracking-wider text-[10px] font-bold z-10">
                      <tr>
                        <th className="p-3">Row</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Brand Name</th>
                        <th className="p-3">Platform</th>
                        <th className="p-3">Category</th>
                        <th className="p-3">Budget</th>
                        <th className="p-3">Deliverables</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {parsedRows.map((row) => (
                        <tr key={row.rowNum} className={row.isValid ? 'hover:bg-white/5' : 'bg-red-500/5 hover:bg-red-500/10'}>
                          <td className="p-3 font-mono text-slate-400">#{row.rowNum}</td>
                          <td className="p-3">
                            {row.isValid ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400" title={row.errorReason}>
                                <AlertTriangle className="h-3.5 w-3.5" /> {row.errorReason}
                              </span>
                            )}
                          </td>
                          <td className="p-3 font-semibold text-white">{row.brand_name || '-'}</td>
                          <td className="p-3">{row.platform || '-'}</td>
                          <td className="p-3">{row.category || '-'}</td>
                          <td className="p-3">{row.budget_type ? `${row.budget_type} (₹${row.budget_amount || 0})` : '-'}</td>
                          <td className="p-3 text-slate-400 max-w-[200px] truncate">{row.deliverables || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-slate-900/80 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetState()
                onClose()
              }}
              className="h-10 px-5 rounded-xl border-white/10 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white text-xs font-semibold cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={uploading || validRowsCount === 0}
              onClick={handleUpload}
              className="h-10 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-500 hover:from-indigo-500 hover:to-purple-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 cursor-pointer disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading {validRowsCount} Campaigns...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload {validRowsCount} Campaigns
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
