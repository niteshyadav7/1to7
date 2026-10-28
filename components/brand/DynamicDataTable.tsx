'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CheckSquare,
  Square,
  MinusSquare,
  Eye,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'

export interface ColumnDef<T> {
  key: string
  header: string
  sortable?: boolean
  hideable?: boolean
  align?: 'left' | 'center' | 'right'
  width?: string
  minWidth?: string
  maxWidth?: string
  wrap?: boolean
  accessor?: (row: T) => any
  render?: (row: T, index: number) => React.ReactNode
}

export interface BulkAction<T> {
  label: string
  icon?: React.ComponentType<{ className?: string }>
  variant?: 'default' | 'danger' | 'outline' | 'amber' | 'purple' | 'emerald'
  onClick: (selectedRows: T[]) => void | Promise<void>
}

export interface FilterTabOption {
  label: string
  value: string
  count?: number
}

export interface DynamicDataTableProps<T> {
  title?: string
  subtitle?: string
  data: T[]
  columns: ColumnDef<T>[]
  keyField?: keyof T | ((row: T) => string)
  searchPlaceholder?: string
  searchFields?: (keyof T | string)[]
  filterTabs?: {
    key: string
    options: FilterTabOption[]
    activeValue: string
    onChange: (value: string) => void
  }
  bulkActions?: BulkAction<T>[]
  selectedRowIds?: string[]
  onSelectionChange?: (selectedIds: string[]) => void
  exportFilename?: string
  defaultPageSize?: number
  pageSizeOptions?: number[]
  rowActionMenu?: (row: T) => React.ReactNode
  onRowClick?: (row: T) => void
  emptyMessage?: string
  initialSortKey?: string
  initialSortDir?: 'asc' | 'desc'
  theme?: 'dark' | 'light'
  loading?: boolean
  tableLayout?: 'auto' | 'fixed'
  minTableWidth?: string
  defaultCompact?: boolean
  className?: string
  headerActions?: React.ReactNode
}

export function DynamicDataTable<T extends Record<string, any>>({
  title,
  subtitle,
  data,
  columns,
  keyField = 'id',
  searchPlaceholder = 'Search records...',
  searchFields,
  filterTabs,
  bulkActions = [],
  selectedRowIds,
  onSelectionChange,
  exportFilename = 'export_data.csv',
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  onRowClick,
  emptyMessage = 'No matching records found.',
  initialSortKey,
  initialSortDir = 'asc',
  className = '',
  headerActions,
  theme = 'dark',
  loading = false,
  tableLayout = 'auto',
  minTableWidth = 'min-w-full',
  defaultCompact = true,
}: DynamicDataTableProps<T>) {
  const isLight = theme === 'light'
  // 1. Search Query
  const [search, setSearch] = useState('')

  // 2. Sorting
  const [sortKey, setSortKey] = useState<string | null>(initialSortKey || null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>(initialSortDir)

  // 3. Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(defaultPageSize)

  // 4. Row Selection
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set(selectedRowIds || []))

  React.useEffect(() => {
    if (selectedRowIds !== undefined) {
      setInternalSelectedIds(new Set(selectedRowIds))
    }
  }, [selectedRowIds])

  const selectedIds = useMemo(() => {
    return selectedRowIds !== undefined ? new Set(selectedRowIds) : internalSelectedIds
  }, [selectedRowIds, internalSelectedIds])

  const updateSelectedIds = (newSet: Set<string>) => {
    setInternalSelectedIds(newSet)
    if (onSelectionChange) {
      onSelectionChange(Array.from(newSet))
    }
  }

  // 5. Density toggle (compact vs comfortable - compact by default)
  const [isCompact, setIsCompact] = useState(defaultCompact ?? true)

  // 6. Column Visibility
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(new Set())
  const [isColumnDropdownOpen, setIsColumnDropdownOpen] = useState(false)

  // Helper to extract row ID
  const getRowId = (row: T): string => {
    if (typeof keyField === 'function') return keyField(row)
    return String(row[keyField] ?? Math.random())
  }

  // Filter columns based on visibility
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => !hiddenColumnKeys.has(col.key))
  }, [columns, hiddenColumnKeys])

  // Toggle sorting
  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDir === 'asc') setSortDir('desc')
      else {
        setSortKey(null)
        setSortDir('asc')
      }
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setCurrentPage(1)
  }

  // Filtered & Sorted Data
  const processedData = useMemo(() => {
    let result = [...data]

    // A. Search
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      result = result.filter((row) => {
        if (searchFields && searchFields.length > 0) {
          return searchFields.some((field) => {
            const val = row[field as keyof T]
            return val !== undefined && val !== null && String(val).toLowerCase().includes(q)
          })
        }
        // Fallback: search all values in the row
        return Object.values(row).some(
          (val) => val !== undefined && val !== null && String(val).toLowerCase().includes(q)
        )
      })
    }

    // B. Sorting
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey)
      result.sort((a, b) => {
        let valA = col?.accessor ? col.accessor(a) : a[sortKey]
        let valB = col?.accessor ? col.accessor(b) : b[sortKey]

        if (typeof valA === 'string') valA = valA.toLowerCase()
        if (typeof valB === 'string') valB = valB.toLowerCase()

        if (valA === valB) return 0
        if (valA === undefined || valA === null) return 1
        if (valB === undefined || valB === null) return -1

        const comp = valA > valB ? 1 : -1
        return sortDir === 'asc' ? comp : -comp
      })
    }

    return result
  }, [data, search, searchFields, sortKey, sortDir, columns])

  // Pagination calculations
  const totalItems = processedData.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return processedData.slice(start, start + pageSize)
  }, [processedData, currentPage, pageSize])

  // Page selection state
  const isAllPageSelected =
    paginatedData.length > 0 && paginatedData.every((row) => selectedIds.has(getRowId(row)))
  const isSomePageSelected =
    paginatedData.some((row) => selectedIds.has(getRowId(row))) && !isAllPageSelected

  const handleSelectAllPage = () => {
    const next = new Set(selectedIds)
    if (isAllPageSelected) {
      paginatedData.forEach((row) => next.delete(getRowId(row)))
    } else {
      paginatedData.forEach((row) => next.add(getRowId(row)))
    }
    updateSelectedIds(next)
  }

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    updateSelectedIds(next)
  }

  // Selected rows
  const selectedRows = useMemo(() => {
    return data.filter((row) => selectedIds.has(getRowId(row)))
  }, [data, selectedIds])

  // CSV Export
  const handleExportCSV = () => {
    try {
      const rowsToExport = selectedRows.length > 0 ? selectedRows : processedData
      if (rowsToExport.length === 0) {
        toast.error('No data to export')
        return
      }

      const headers = visibleColumns.map((col) => `"${col.header.replace(/"/g, '""')}"`)
      const csvLines = rowsToExport.map((row, idx) => {
        return visibleColumns
          .map((col) => {
            const val = col.accessor ? col.accessor(row) : row[col.key]
            const strVal = val === null || val === undefined ? '' : String(val)
            return `"${strVal.replace(/"/g, '""')}"`
          })
          .join(',')
      })

      const csvContent = '\uFEFF' + [headers.join(','), ...csvLines].join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = exportFilename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(
        `Exported ${rowsToExport.length} rows to ${exportFilename} (${selectedRows.length > 0 ? 'Selected' : 'All filtered'})`
      )
    } catch {
      toast.error('Failed to export CSV')
    }
  }

  return (
    <div className={`font-sans space-y-3 w-full max-w-full overflow-hidden ${className}`}>
      {/* ─── TABLE TOP BAR (Title + Global Actions) ─── */}
      {(title || headerActions) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            {title && (
              <h2 className={`text-base sm:text-lg font-extrabold tracking-tight flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <span>{title}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${isLight ? 'bg-slate-100 text-slate-700 border border-slate-200' : 'bg-white/10 text-neutral-300'}`}>
                  {totalItems}
                </span>
              </h2>
            )}
            {subtitle && <p className={`text-xs mt-0.5 font-medium ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>{subtitle}</p>}
          </div>

          {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
        </div>
      )}

      {/* ─── CONTROLS BAR (Filter Tabs, Search, Column Visibility, Density, Export) ─── */}
      <div className={`p-2 sm:p-2.5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-2 ${
        isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-[#121620] border-white/10 shadow-lg'
      }`}>
        {/* Left: Filter Tabs (if provided) */}
        {filterTabs && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            {filterTabs.options.map((opt) => {
              const isActive = filterTabs.activeValue === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    filterTabs.onChange(opt.value)
                    setCurrentPage(1)
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-[#febd1c] text-neutral-950 font-bold shadow-md'
                      : isLight
                      ? 'bg-white text-slate-600 hover:text-black hover:bg-slate-50 border border-slate-200'
                      : 'bg-[#0c1017] text-neutral-400 hover:text-white hover:bg-white/5 border border-white/5'
                  }`}
                >
                  <span>{opt.label}</span>
                  {typeof opt.count === 'number' && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold ${
                        isActive
                          ? 'bg-neutral-950/20 text-neutral-950'
                          : isLight
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-white/10 text-neutral-300'
                      }`}
                    >
                      {opt.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Right Controls: Search, Column Manager, Density, CSV Export */}
        <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap md:ml-auto">
          {/* Live Search */}
          <div className="relative flex-1 sm:w-56 min-w-[160px]">
            <Search className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-500'}`} />
            <Input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              placeholder={searchPlaceholder}
              className={`pl-7 pr-6 h-8 text-xs rounded-lg transition ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-[#febd1c]'
                  : 'bg-[#0c1017] border-white/10 text-white placeholder:text-neutral-500 focus:border-amber-400'
              }`}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${
                  isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-500 hover:text-white'
                }`}
              >
                ✕
              </button>
            )}
          </div>

          {/* Density Toggle Button */}
          <button
            type="button"
            onClick={() => setIsCompact(!isCompact)}
            title={isCompact ? 'Comfortable Density' : 'Compact Density'}
            className={`h-8 px-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50'
                : 'bg-[#0c1017] border-white/10 text-neutral-400 hover:text-white'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isCompact ? 'Compact' : 'Comfortable'}</span>
          </button>

          {/* Column Visibility Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsColumnDropdownOpen(!isColumnDropdownOpen)}
              className={`h-8 px-2 rounded-lg border text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-black hover:bg-slate-50'
                  : 'bg-[#0c1017] border-white/10 text-neutral-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Columns</span>
            </button>

            {isColumnDropdownOpen && (
              <div className={`absolute right-0 top-10 z-50 w-52 p-2 rounded-xl border shadow-2xl space-y-1 ${
                isLight ? 'bg-white border-slate-200 text-slate-700 shadow-xl' : 'bg-[#121620] border-white/10 text-neutral-300'
              }`}>
                <div className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border-b mb-1 ${
                  isLight ? 'text-slate-400 border-slate-100' : 'text-neutral-400 border-white/5'
                }`}>
                  Toggle Columns
                </div>
                {columns
                  .filter((c) => c.hideable !== false)
                  .map((col) => {
                    const isVisible = !hiddenColumnKeys.has(col.key)
                    return (
                      <label
                        key={col.key}
                        className={`flex items-center gap-2 px-2 py-1 rounded-md text-xs cursor-pointer ${
                          isLight ? 'text-slate-700 hover:bg-slate-50' : 'text-neutral-300 hover:bg-white/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={() => {
                            setHiddenColumnKeys((prev) => {
                              const next = new Set(prev)
                              if (next.has(col.key)) next.delete(col.key)
                              else next.add(col.key)
                              return next
                            })
                          }}
                          className={`rounded ${
                            isLight
                              ? 'border-slate-300 text-[#febd1c] focus:ring-0'
                              : 'border-white/20 bg-[#0c1017] text-amber-500 focus:ring-0'
                          }`}
                        />
                        <span className="truncate">{col.header}</span>
                      </label>
                    )
                  })}
              </div>
            )}
          </div>

          {/* Export to CSV */}
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            className={`h-8 text-xs px-2.5 rounded-lg border ${
              isLight
                ? 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                : 'border-white/10 bg-[#0c1017] hover:bg-white/5 text-neutral-300'
            }`}
          >
            <Download className="w-3.5 h-3.5 mr-1 text-[#febd1c]" />
            <span className="hidden sm:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* ─── FLOATING BULK ACTIONS BAR (When rows selected) ─── */}
      <AnimatePresence>
        {selectedRows.length > 0 && bulkActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-3 rounded-2xl border shadow-xl flex flex-wrap items-center justify-between gap-3 ${
              isLight
                ? 'bg-amber-50/90 border-amber-300 text-slate-900'
                : 'bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-[#121620] border-amber-500/30 text-white'
            }`}
          >
            <div className={`flex items-center gap-2 text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>
              <span className="w-6 h-6 rounded-lg bg-[#febd1c] text-neutral-950 font-black flex items-center justify-center text-xs">
                {selectedRows.length}
              </span>
              <span>Selected for Bulk Actions</span>
              <button
                type="button"
                onClick={() => updateSelectedIds(new Set())}
                className={`text-[11px] underline ml-2 cursor-pointer ${isLight ? 'text-slate-500 hover:text-slate-800' : 'text-neutral-400 hover:text-white'}`}
              >
                Clear Selection
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {bulkActions.map((action, idx) => {
                const Icon = action.icon
                return (
                  <Button
                    key={idx}
                    size="sm"
                    onClick={() => action.onClick(selectedRows)}
                    className={`h-8 text-xs font-bold rounded-xl shadow transition-all ${
                      action.variant === 'danger'
                        ? 'bg-red-600 hover:bg-red-500 text-white'
                        : action.variant === 'purple'
                        ? 'bg-purple-600 hover:bg-purple-500 text-white'
                        : action.variant === 'emerald'
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : action.variant === 'outline'
                        ? 'bg-slate-900 hover:bg-slate-800 text-neutral-200 border border-white/20'
                        : 'bg-[#febd1c] hover:bg-[#febd1c]/90 text-neutral-950'
                    }`}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 mr-1" />}
                    <span>{action.label}</span>
                  </Button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── DATA TABLE CANVAS ─── */}
      <div className={`rounded-2xl border overflow-hidden w-full max-w-full ${
        isLight ? 'bg-white border-slate-200/90 shadow-sm' : 'bg-[#121620] border-white/10 shadow-xl'
      }`}>
        <div className="overflow-x-auto w-full max-w-full scrollbar-none">
          <table className={`w-full text-left border-collapse text-xs ${tableLayout === 'fixed' ? 'table-fixed' : ''} ${minTableWidth}`}>
            {/* Header */}
            <thead className={`font-bold uppercase tracking-wider text-[10px] border-b select-none sticky top-0 z-10 ${
              isLight ? 'bg-slate-50/95 text-slate-500 border-slate-200' : 'bg-[#0c1017] text-neutral-400 border-white/10'
            }`}>
              <tr>
                {/* Master Selection Checkbox */}
                {bulkActions.length > 0 && (
                  <th className={`${isCompact ? 'p-1.5 w-7' : 'p-3 sm:p-3.5 w-10'} text-center`}>
                    <button
                      type="button"
                      onClick={handleSelectAllPage}
                      className="cursor-pointer transition-colors"
                    >
                      {isAllPageSelected ? (
                        <CheckSquare className="w-3.5 h-3.5 text-[#febd1c]" />
                      ) : isSomePageSelected ? (
                        <MinusSquare className="w-3.5 h-3.5 text-amber-500" />
                      ) : (
                        <Square className={`w-3.5 h-3.5 ${isLight ? 'text-slate-400' : 'text-neutral-600'}`} />
                      )}
                    </button>
                  </th>
                )}

                {/* Column Headers */}
                {visibleColumns.map((col) => {
                  const isSorted = sortKey === col.key
                  const canSort = col.sortable !== false

                  return (
                    <th
                      key={col.key}
                      onClick={() => canSort && handleSort(col.key)}
                      style={{ width: col.width, minWidth: col.minWidth || col.width, maxWidth: col.maxWidth }}
                      className={`${isCompact ? 'py-1.5 px-1.5 text-[9.5px]' : 'py-2.5 px-2.5 sm:px-3'} transition-colors ${
                        col.wrap ? 'whitespace-normal' : tableLayout === 'fixed' ? 'overflow-hidden truncate' : 'whitespace-nowrap'
                      } ${
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                          ? 'text-right'
                          : 'text-left'
                      } ${canSort ? (isLight ? 'cursor-pointer hover:text-black hover:bg-slate-100/50' : 'cursor-pointer hover:text-white hover:bg-white/[0.02]') : ''}`}
                    >
                      <div
                        className={`inline-flex items-center gap-1.5 ${
                          col.align === 'center'
                            ? 'justify-center'
                            : col.align === 'right'
                            ? 'justify-end'
                            : 'justify-start'
                        }`}
                      >
                        <span className={isSorted ? (isLight ? 'text-amber-600 font-bold' : 'text-amber-400 font-bold') : ''}>
                          {col.header}
                        </span>
                        {canSort && (
                          <span className={isLight ? 'text-slate-400 hover:text-slate-700' : 'text-neutral-600 group-hover:text-neutral-400'}>
                            {isSorted ? (
                              sortDir === 'asc' ? (
                                <ArrowUp className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                              ) : (
                                <ArrowDown className={`w-3.5 h-3.5 ${isLight ? 'text-amber-600' : 'text-amber-400'}`} />
                              )
                            ) : (
                              <ArrowUpDown className="w-3 h-3 opacity-40 hover:opacity-100" />
                            )}
                          </span>
                        )}
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            {/* Body */}
            <tbody className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
              {loading ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (bulkActions.length > 0 ? 1 : 0)}
                    className="p-12 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Loader2 className={`w-7 h-7 animate-spin ${isLight ? 'text-[#febd1c]' : 'text-amber-400'}`} />
                      <span className={`text-xs font-medium ${isLight ? 'text-slate-500' : 'text-neutral-400'}`}>
                        Loading records...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleColumns.length + (bulkActions.length > 0 ? 1 : 0)}
                    className="p-10 text-center"
                  >
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mx-auto ${
                        isLight ? 'bg-slate-100 text-slate-500' : 'bg-white/5 text-neutral-500'
                      }`}>
                        <Filter className="w-5 h-5" />
                      </div>
                      <p className={`text-sm font-semibold ${isLight ? 'text-slate-800' : 'text-neutral-300'}`}>
                        {emptyMessage}
                      </p>
                      <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-neutral-500'}`}>
                        Try adjusting your search query or switching filter tabs.
                      </p>
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch('')}
                          className="text-xs text-[#febd1c] hover:underline font-semibold cursor-pointer"
                        >
                          Clear Search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, index) => {
                  const id = getRowId(row)
                  const isSelected = selectedIds.has(id)

                  return (
                    <tr
                      key={id}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={`transition-colors ${
                        isSelected
                          ? isLight
                            ? 'bg-amber-50/70 hover:bg-amber-50/90'
                            : 'bg-amber-500/10 hover:bg-amber-500/15'
                          : isLight
                          ? 'hover:bg-slate-50/80 text-slate-800'
                          : 'hover:bg-white/[0.02] text-neutral-200'
                      } ${onRowClick ? 'cursor-pointer' : ''}`}
                    >
                      {/* Checkbox */}
                      {bulkActions.length > 0 && (
                        <td className={`${isCompact ? 'p-1.5 w-7' : 'p-3 sm:p-3.5 w-10'} text-center`}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleToggleRow(id)
                            }}
                            className={`cursor-pointer ${isLight ? 'text-slate-400 hover:text-black' : 'text-neutral-500 hover:text-amber-400'}`}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#febd1c]" />
                            ) : (
                              <Square className={`w-3.5 h-3.5 ${isLight ? 'text-slate-300' : 'text-neutral-600'}`} />
                            )}
                          </button>
                        </td>
                      )}

                      {/* Cells */}
                      {visibleColumns.map((col) => {
                        const cellContent = col.render
                          ? col.render(row, index)
                          : col.accessor
                          ? col.accessor(row)
                          : row[col.key]

                        return (
                          <td
                            key={col.key}
                            style={{ width: col.width, minWidth: col.minWidth || col.width, maxWidth: col.maxWidth }}
                            className={`${
                              col.wrap ? 'whitespace-normal' : tableLayout === 'fixed' ? 'overflow-hidden' : 'whitespace-nowrap'
                            } ${
                              isCompact ? 'py-1 px-1.5 text-[10px]' : 'py-2.5 px-2.5 sm:px-3 text-xs'
                            } ${
                              col.align === 'center'
                                ? 'text-center'
                                : col.align === 'right'
                                ? 'text-right'
                                : 'text-left'
                            }`}
                          >
                            {cellContent}
                          </td>
                        )
                      })}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── FOOTER PAGINATION ─── */}
        <div className={`${isCompact ? 'p-2 sm:p-2.5 text-[11px]' : 'p-3.5 sm:p-4 text-xs'} border-t flex flex-col sm:flex-row items-center justify-between gap-2.5 ${
          isLight ? 'border-slate-200 bg-slate-50/90 text-slate-600' : 'border-white/5 bg-[#0c1017] text-neutral-400'
        }`}>
          {/* Row Counter */}
          <div className="flex items-center gap-3">
            <span>
              Showing{' '}
              <strong className={isLight ? 'text-slate-900' : 'text-white'}>
                {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </strong>{' '}
              to{' '}
              <strong className={isLight ? 'text-slate-900' : 'text-white'}>
                {Math.min(currentPage * pageSize, totalItems)}
              </strong>{' '}
              of <strong className={isLight ? 'text-slate-900' : 'text-white'}>{totalItems}</strong> entries
            </span>

            {/* Page Size Selector */}
            <div className={`flex items-center gap-1.5 pl-3 border-l ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className={`rounded-lg px-2 py-0.5 ${isCompact ? 'text-[11px]' : 'text-xs'} focus:ring-0 ${
                  isLight
                    ? 'bg-white border border-slate-200 text-slate-800 focus:border-[#febd1c]'
                    : 'bg-[#121620] border border-white/10 text-white focus:border-amber-400'
                }`}
              >
                {pageSizeOptions.map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Page Navigation Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(1)}
              className={`p-1 rounded-md border disabled:opacity-40 transition cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-black hover:bg-slate-100'
                  : 'bg-[#121620] border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="First Page"
            >
              <ChevronsLeft className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className={`p-1 rounded-md border disabled:opacity-40 transition cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-black hover:bg-slate-100'
                  : 'bg-[#121620] border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Previous Page"
            >
              <ChevronLeft className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>

            <span className={`px-2.5 py-0.5 font-semibold ${isCompact ? 'text-[11px]' : 'text-xs'} ${isLight ? 'text-slate-900' : 'text-white'}`}>
              Page {currentPage} of {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className={`p-1 rounded-md border disabled:opacity-40 transition cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-black hover:bg-slate-100'
                  : 'bg-[#121620] border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Next Page"
            >
              <ChevronRight className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(totalPages)}
              className={`p-1 rounded-md border disabled:opacity-40 transition cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-200 text-slate-600 hover:text-black hover:bg-slate-100'
                  : 'bg-[#121620] border-white/10 text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
              title="Last Page"
            >
              <ChevronsRight className={isCompact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
