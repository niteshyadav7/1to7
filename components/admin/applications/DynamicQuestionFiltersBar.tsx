'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import {
  Filter, X, ChevronDown, Hash, List, Type, Calendar,
  Sparkles, Check, RotateCcw, AlertCircle, Search
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { FormField } from '@/components/admin/FormFieldBuilder'
import { QuestionFilterCriteria, getApplicationQuestionAnswer } from '@/lib/utils/question-filter-utils'
import { orderFieldsStateBeforeCity } from '@/lib/utils/location-utils'

interface DynamicQuestionFiltersBarProps {
  fields: FormField[]
  questionFilters: Record<string, QuestionFilterCriteria>
  onFilterChange: (fieldName: string, criteria: QuestionFilterCriteria | null) => void
  onClearAll: () => void
  totalCount?: number
  filteredCount?: number
  campaignName?: string
  applications?: any[]
}

export function DynamicQuestionFiltersBar({
  fields,
  questionFilters,
  onFilterChange,
  onClearAll,
  totalCount,
  filteredCount,
  campaignName,
  applications,
}: DynamicQuestionFiltersBarProps) {
  const [openField, setOpenField] = useState<string | null>(null)
  const [optionSearchQuery, setOptionSearchQuery] = useState('')
  const [showAllQuestions, setShowAllQuestions] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Clear inner option search when opened field changes
  useEffect(() => {
    setOptionSearchQuery('')
  }, [openField])

  // Extract all distinct answers submitted by applicants for each question
  const fieldAnswersMap = useMemo(() => {
    const map: Record<string, { value: string; count: number }[]> = {}
    if (!fields || fields.length === 0) return map

    fields.forEach(field => {
      const counts: Record<string, number> = {}

      if (applications && Array.isArray(applications)) {
        applications.forEach(app => {
          const rawAns = getApplicationQuestionAnswer(app?.form_data, field)
          let valStr = ''

          if (rawAns !== undefined && rawAns !== null && rawAns !== '') {
            if (typeof rawAns === 'object') {
              if (rawAns.city) valStr = String(rawAns.city).trim()
              else if (rawAns.state) valStr = String(rawAns.state).trim()
              else if (rawAns.name || rawAns.title) valStr = String(rawAns.name || rawAns.title).trim()
              else valStr = JSON.stringify(rawAns)
            } else {
              valStr = String(rawAns).trim()
            }
          } else if (/state/i.test(field.name)) {
            const fallback = app?.users?.state || app?.form_data?.shipping_address?.state || app?.form_data?.state || app?.form_data?.State
            if (fallback && typeof fallback === 'string' && fallback.trim()) {
              valStr = fallback.trim()
            }
          } else if (/city/i.test(field.name)) {
            const fallback = app?.users?.city || app?.form_data?.shipping_address?.city || app?.form_data?.city || app?.form_data?.City
            if (fallback && typeof fallback === 'string' && fallback.trim()) {
              valStr = fallback.trim()
            }
          }

          if (valStr) {
            counts[valStr] = (counts[valStr] || 0) + 1
          }
        })
      }

      // Merge predefined options from form definition if any
      if (field.options && Array.isArray(field.options)) {
        field.options.forEach(opt => {
          const trimmed = String(opt).trim()
          if (trimmed) {
            const existingKey = Object.keys(counts).find(k => k.toLowerCase() === trimmed.toLowerCase())
            if (!existingKey) {
              counts[trimmed] = 0
            }
          }
        })
      }

      // Only keep options that have actual answers (count > 0) or are explicitly in field.options
      // Strictly campaign-wise: do not inject unrelated external states/cities
      const list = Object.entries(counts)
        .filter(([value, count]) => count > 0 || (field.options && Array.isArray(field.options) && field.options.includes(value)))
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => {
          if (a.count !== b.count) return b.count - a.count
          return a.value.localeCompare(b.value)
        })

      map[field.name] = list
    })

    return map
  }, [applications, fields])

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

  // Visible fields: filterable ones by default, or all if toggled (State strictly before City)
  const orderedFields = useMemo(() => orderFieldsStateBeforeCity(fields), [fields])
  const filterableFields = orderedFields.filter(f => f.filterable === true || /commercial|quote|budget|rate|charge|fee/i.test(f.name))
  const otherFields = orderedFields.filter(f => !filterableFields.some(ff => ff.name === f.name))
  const displayedFields = showAllQuestions ? orderedFields : (filterableFields.length > 0 ? filterableFields : orderedFields)

  return (
    <div
      ref={containerRef}
      className="relative z-40 p-3 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/25 to-slate-900/90 border border-indigo-500/25 shadow-lg backdrop-blur-sm space-y-2.5 transition-all"
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
          {otherFields.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAllQuestions(!showAllQuestions)}
              className="text-[11px] text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer"
            >
              {showAllQuestions ? 'Show quick filters only' : `+${otherFields.length} more campaign questions`}
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
              if (currentFilter.selectedOptions.length === 1) {
                activeSummary = currentFilter.selectedOptions[0]
              } else if (currentFilter.selectedOptions.length === 2) {
                activeSummary = currentFilter.selectedOptions.join(', ')
              } else {
                activeSummary = `${currentFilter.selectedOptions[0]} (+${currentFilter.selectedOptions.length - 1})`
              }
            } else if (currentFilter?.textSearch) {
              activeSummary = `"${currentFilter.textSearch}"`
            }
          }

          return (
            <div key={field.name} className={`relative ${isOpen ? 'z-[60]' : 'z-10'}`}>
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
                    className="absolute left-0 top-full mt-2 z-[100] w-72 sm:w-84 max-w-[calc(100vw-2.5rem)] p-4 rounded-2xl bg-slate-900/98 backdrop-blur-2xl border border-indigo-500/50 text-white shadow-[0_20px_50px_rgba(0,0,0,0.95)] space-y-3 ring-1 ring-white/10"
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

                    {/* Selectable Options from Form Answers / Dropdown / Text */}
                    {!isCommercial && field.type !== 'number' && (() => {
                      const allOptions = fieldAnswersMap[field.name] || []
                      const filteredOptions = allOptions.filter(opt =>
                        !optionSearchQuery.trim() ||
                        opt.value.toLowerCase().includes(optionSearchQuery.toLowerCase().trim())
                      )
                      const submittedCount = allOptions.filter(o => o.count > 0).length

                      return (
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                              <span>Options from Form:</span>
                              {submittedCount > 0 ? (
                                <span className="text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                  {submittedCount} answered
                                </span>
                              ) : (
                                <span className="text-slate-500">({allOptions.length} total)</span>
                              )}
                            </span>
                            {allOptions.length > 0 && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allVals = allOptions.map(o => o.value)
                                    onFilterChange(field.name, {
                                      ...(currentFilter || {}),
                                      selectedOptions: allVals,
                                    })
                                  }}
                                  className="text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                                >
                                  Select All
                                </button>
                                <span className="text-slate-600">•</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    onFilterChange(field.name, {
                                      ...(currentFilter || {}),
                                      selectedOptions: [],
                                    })
                                  }}
                                  className="text-slate-400 hover:text-slate-300 font-semibold cursor-pointer"
                                >
                                  Clear
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Search within available options */}
                          {allOptions.length > 4 && (
                            <div className="relative">
                              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                              <input
                                type="text"
                                placeholder={`Filter ${allOptions.length} options...`}
                                value={optionSearchQuery}
                                onChange={(e) => setOptionSearchQuery(e.target.value)}
                                className="w-full pl-7.5 pr-6 py-1.5 rounded-lg bg-slate-950/80 border border-white/10 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                              />
                              {optionSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => setOptionSearchQuery('')}
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Options list with checkbox and count */}
                          <div className="max-h-48 overflow-y-auto space-y-1 p-1 bg-slate-950/70 rounded-xl border border-white/5 no-scrollbar">
                            {filteredOptions.length > 0 ? (
                              filteredOptions.map(opt => {
                                const isSelected = currentFilter?.selectedOptions?.includes(opt.value) || false
                                return (
                                  <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => {
                                      const prev = currentFilter?.selectedOptions || []
                                      const next = prev.includes(opt.value)
                                        ? prev.filter(x => x !== opt.value)
                                        : [...prev, opt.value]
                                      onFilterChange(field.name, {
                                        ...(currentFilter || {}),
                                        selectedOptions: next,
                                      })
                                    }}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                                      isSelected
                                        ? 'bg-indigo-600/35 text-white border border-indigo-500/50 shadow-xs'
                                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0 pr-2">
                                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border transition-colors ${
                                        isSelected
                                          ? 'bg-indigo-500 border-indigo-400 text-white'
                                          : 'border-slate-600 bg-slate-900'
                                      }`}>
                                        {isSelected && <Check className="h-2.5 w-2.5 stroke-[3]" />}
                                      </div>
                                      <span className="truncate">{opt.value}</span>
                                    </div>
                                    {opt.count > 0 ? (
                                      <span className="shrink-0 px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                        {opt.count}
                                      </span>
                                    ) : (
                                      <span className="shrink-0 text-[10px] text-slate-600">0</span>
                                    )}
                                  </button>
                                )
                              })
                            ) : (
                              <p className="text-[11px] text-slate-500 p-2 text-center">
                                No matching options found
                              </p>
                            )}
                          </div>

                          {/* Free-text search fallback */}
                          <div className="pt-2 border-t border-white/5 space-y-1">
                            <label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                              Or search custom keyword text:
                            </label>
                            <input
                              type="text"
                              placeholder="Type custom text..."
                              value={currentFilter?.textSearch || ''}
                              onChange={(e) => {
                                onFilterChange(field.name, {
                                  ...(currentFilter || {}),
                                  textSearch: e.target.value,
                                })
                              }}
                              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-white/10 text-white text-xs focus:ring-1 focus:ring-indigo-500 outline-none placeholder:text-slate-500"
                            />
                          </div>
                        </div>
                      )
                    })()}

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
