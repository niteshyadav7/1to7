'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Filter, X, ChevronDown, Hash, List, Type, Calendar,
  Sparkles, Check, RotateCcw, AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FormField } from '@/components/admin/FormFieldBuilder'
import { QuestionFilterCriteria } from '@/lib/utils/question-filter-utils'

interface DynamicQuestionFiltersBarProps {
  fields: FormField[]
  questionFilters: Record<string, QuestionFilterCriteria>
  onFilterChange: (fieldName: string, criteria: QuestionFilterCriteria | null) => void
  onClearAll: () => void
  totalCount?: number
  filteredCount?: number
  campaignName?: string
}

export function DynamicQuestionFiltersBar({
  fields,
  questionFilters,
  onFilterChange,
  onClearAll,
  totalCount,
  filteredCount,
  campaignName,
}: DynamicQuestionFiltersBarProps) {
  const [openField, setOpenField] = useState<string | null>(null)
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close popup if clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpenField(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!fields || fields.length === 0) return null

  // Active filter count on questions
  const activeQuestionCount = Object.keys(questionFilters).filter(k => {
    const c = questionFilters[k]
    return c && (
      c.min !== undefined ||
      c.max !== undefined ||
      (c.selectedOptions && c.selectedOptions.length > 0) ||
      (c.textSearch && c.textSearch.trim() !== '') ||
      c.startDate ||
      c.endDate
    )
  }).length

  // Visible fields: filterable ones by default, or all if toggled
  const filterableFields = fields.filter(f => f.filterable !== false)
  const nonFilterableFields = fields.filter(f => f.filterable === false)
  const displayedFields = showAllQuestions ? fields : (filterableFields.length > 0 ? filterableFields : fields)

  return (
    <div
      ref={containerRef}
      className="p-3 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/25 to-slate-900/90 border border-indigo-500/25 shadow-lg backdrop-blur-sm space-y-2.5 transition-all"
    >
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Filter className="h-3.5 w-3.5" />
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-wide flex items-center gap-1.5">
              Campaign Questions Filter
              {campaignName && (
                <span className="text-indigo-400 font-semibold max-w-[200px] truncate text-[11px]">
                  ({campaignName})
                </span>
              )}
            </span>
          </div>
          {activeQuestionCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500 text-white shadow-xs shadow-indigo-500/40 animate-pulse">
              {activeQuestionCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {nonFilterableFields.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAllQuestions(!showAllQuestions)}
              className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {showAllQuestions ? 'Show quick filters only' : `+${nonFilterableFields.length} more campaign questions`}
            </button>
          )}

          {activeQuestionCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              Reset question filters
            </button>
          )}
        </div>
      </div>

      {/* Filter Badges and Popovers */}
      <div className="flex flex-wrap items-center gap-2">
        {displayedFields.map(field => {
          const currentFilter = questionFilters[field.name]
          const isCommercial = /commercial|quote|budget|rate|charge|fee/i.test(field.name)
          const isOpen = openField === field.name

          const hasActiveFilter = currentFilter && (
            currentFilter.min !== undefined ||
            currentFilter.max !== undefined ||
            (currentFilter.selectedOptions && currentFilter.selectedOptions.length > 0) ||
            (currentFilter.textSearch && currentFilter.textSearch.trim() !== '') ||
            currentFilter.startDate ||
            currentFilter.endDate
          )

          // Short label for the button
          let activeSummary = ''
          if (hasActiveFilter) {
            if (currentFilter?.min !== undefined && currentFilter?.max !== undefined) {
              activeSummary = `${currentFilter.min} - ${currentFilter.max}`
            } else if (currentFilter?.max !== undefined) {
              activeSummary = `≤ ${currentFilter.max}`
            } else if (currentFilter?.min !== undefined) {
              activeSummary = `≥ ${currentFilter.min}`
            } else if (currentFilter?.selectedOptions && currentFilter.selectedOptions.length > 0) {
              activeSummary = currentFilter.selectedOptions.join(', ')
            } else if (currentFilter?.textSearch) {
              activeSummary = `"${currentFilter.textSearch}"`
            }
          }

          return (
            <div key={field.name} className="relative">
              <button
                type="button"
                onClick={() => setOpenField(isOpen ? null : field.name)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer shadow-xs ${
                  hasActiveFilter
                    ? 'bg-indigo-600/30 border-indigo-500 text-indigo-100 shadow-indigo-500/20'
                    : 'bg-slate-900/80 border-white/10 text-slate-300 hover:bg-slate-800 hover:border-indigo-500/30 hover:text-white'
                }`}
                title={field.name}
              >
                {isCommercial ? (
                  <span className="text-amber-400 font-bold">₹</span>
                ) : field.type === 'number' ? (
                  <Hash className="h-3 w-3 text-indigo-400" />
                ) : field.type === 'dropdown' ? (
                  <List className="h-3 w-3 text-emerald-400" />
                ) : field.type === 'date' ? (
                  <Calendar className="h-3 w-3 text-purple-400" />
                ) : (
                  <Type className="h-3 w-3 text-slate-400" />
                )}

                <span className="max-w-[160px] truncate">{field.name}</span>

                {hasActiveFilter ? (
                  <span className="px-1.5 py-0.2 rounded-md bg-indigo-500/40 text-indigo-200 text-[10px] font-bold">
                    {activeSummary}
                  </span>
                ) : (
                  <ChevronDown className="h-3 w-3 text-slate-500 opacity-70" />
                )}
              </button>

              {/* Popover Filter Editor */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 4, scale: 0.98 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 top-full mt-1.5 z-50 w-72 sm:w-80 p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/30 text-white shadow-2xl shadow-black/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white line-clamp-2">{field.name}</p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          Type: {field.type} {isCommercial ? '• Commercial Payout' : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setOpenField(null)}
                        className="text-slate-400 hover:text-white p-1 rounded-md cursor-pointer"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    {/* Number / Commercial Filter Input */}
                    {(field.type === 'number' || isCommercial) && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Min (₹)
                            </label>
                            <input
                              type="number"
                              placeholder="0"
                              value={currentFilter?.min ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : Number(e.target.value)
                                onFilterChange(field.name, {
                                  ...(currentFilter || {}),
                                  min: val,
                                })
                              }}
                              className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Max (₹)
                            </label>
                            <input
                              type="number"
                              placeholder="e.g. 3500"
                              value={currentFilter?.max ?? ''}
                              onChange={(e) => {
                                const val = e.target.value === '' ? undefined : Number(e.target.value)
                                onFilterChange(field.name, {
                                  ...(currentFilter || {}),
                                  max: val,
                                })
                              }}
                              className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                            />
                          </div>
                        </div>

                        {/* Quick Presets for Commercials */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-slate-400">Quick Commercial Presets:</label>
                          <div className="flex flex-wrap gap-1.5">
                            {[
                              { label: '≤ 2.5k', max: 2500 },
                              { label: '≤ 3.5k', max: 3500 },
                              { label: '≤ 5k', max: 5000 },
                              { label: '≤ 10k', max: 10000 },
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  onFilterChange(field.name, {
                                    ...(currentFilter || {}),
                                    max: preset.max,
                                  })
                                }}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition-colors cursor-pointer border ${
                                  currentFilter?.max === preset.max
                                    ? 'bg-indigo-600 text-white border-indigo-400'
                                    : 'bg-slate-950 text-indigo-300 border-indigo-500/20 hover:bg-indigo-600/20'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Dropdown Multi-Select */}
                    {field.type === 'dropdown' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Select Options:
                        </label>
                        <div className="max-h-40 overflow-y-auto space-y-1 p-1 bg-slate-950/60 rounded-xl border border-white/5">
                          {field.options && field.options.length > 0 ? (
                            field.options.map(opt => {
                              const selected = currentFilter?.selectedOptions?.includes(opt)
                              return (
                                <button
                                  key={opt}
                                  type="button"
                                  onClick={() => {
                                    const prev = currentFilter?.selectedOptions || []
                                    const next = prev.includes(opt)
                                      ? prev.filter(x => x !== opt)
                                      : [...prev, opt]
                                    onFilterChange(field.name, {
                                      ...(currentFilter || {}),
                                      selectedOptions: next,
                                    })
                                  }}
                                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                                    selected
                                      ? 'bg-indigo-600/30 text-white border border-indigo-500/40'
                                      : 'text-slate-300 hover:bg-slate-800'
                                  }`}
                                >
                                  <span className="truncate">{opt}</span>
                                  {selected && <Check className="h-3.5 w-3.5 text-indigo-400 shrink-0" />}
                                </button>
                              )
                            })
                          ) : (
                            <p className="text-[11px] text-slate-500 p-2">No predefined options found</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Text Search */}
                    {field.type === 'text' && !isCommercial && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Search answer text:
                        </label>
                        <input
                          type="text"
                          placeholder="Search text..."
                          value={currentFilter?.textSearch || ''}
                          onChange={(e) => {
                            onFilterChange(field.name, {
                              ...(currentFilter || {}),
                              textSearch: e.target.value,
                            })
                          }}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    )}

                    {/* Historical Aliases Info */}
                    {field.aliases && field.aliases.length > 0 && (
                      <p className="text-[10px] text-amber-300/80 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                        ⚡ Preserves {field.aliases.length} historical question phrasing(s) so earlier applicants are included.
                      </p>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
                      {hasActiveFilter ? (
                        <button
                          type="button"
                          onClick={() => {
                            onFilterChange(field.name, null)
                            setOpenField(null)
                          }}
                          className="text-[11px] text-red-400 hover:text-red-300 font-semibold cursor-pointer"
                        >
                          Clear this filter
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500">No filter set</span>
                      )}
                      <button
                        type="button"
                        onClick={() => setOpenField(null)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </div>
  )
}
