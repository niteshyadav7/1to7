'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, Check, X } from 'lucide-react'

export interface SearchableOption {
  value: string
  label: string
  sublabel?: string
  group?: string
  badge?: string
  icon?: React.ReactNode
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: SearchableOption[]
  placeholder?: string
  searchPlaceholder?: string
  icon?: React.ComponentType<{ className?: string }>
  label?: string
  disabled?: boolean
  className?: string
  popoverWidth?: string
}

export function SearchableSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  searchPlaceholder = 'Search...',
  icon: Icon,
  label,
  disabled = false,
  className = '',
  popoverWidth = 'w-full min-w-[280px]',
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => opt.value === value)
  }, [options, value])

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase().trim()
    return options.filter((opt) => {
      const matchLabel = opt.label.toLowerCase().includes(q)
      const matchSub = opt.sublabel?.toLowerCase().includes(q)
      const matchGroup = opt.group?.toLowerCase().includes(q)
      return matchLabel || matchSub || matchGroup
    })
  }, [options, search])

  // Group filtered options
  const groupedOptions = useMemo(() => {
    const hasGroups = options.some((opt) => Boolean(opt.group))
    if (!hasGroups) return { ungrouped: filteredOptions }

    const groups: Record<string, SearchableOption[]> = {}
    filteredOptions.forEach((opt) => {
      const g = opt.group || 'Other'
      if (!groups[g]) groups[g] = []
      groups[g].push(opt)
    })
    return groups
  }, [options, filteredOptions])

  // Outside click & Escape listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleKeyDown)
      // Focus search input on open
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
  }

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev)
            setSearch('')
          }
        }}
        className={`w-full h-9 pl-9 pr-8 py-2 text-xs font-semibold border rounded-xl bg-slate-950 text-white transition-all cursor-pointer flex items-center justify-between text-left ${
          open
            ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-lg shadow-amber-500/10'
            : 'border-white/10 hover:border-white/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {/* Left Icon */}
        {Icon && (
          <Icon className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500 pointer-events-none" />
        )}

        {/* Selected Label Display */}
        <span className="truncate pr-2">
          {selectedOption ? (
            <span className="flex items-center gap-1.5 truncate">
              {selectedOption.icon}
              <span className="truncate">{selectedOption.label}</span>
              {selectedOption.badge && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-white/10 text-amber-300 font-bold">
                  {selectedOption.badge}
                </span>
              )}
            </span>
          ) : (
            <span className="text-neutral-500">{placeholder}</span>
          )}
        </span>

        {/* Right Chevron */}
        <ChevronDown
          className={`absolute right-3 top-2.5 h-4 w-4 text-neutral-400 transition-transform duration-200 pointer-events-none ${
            open ? 'rotate-180 text-amber-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {open && (
        <div
          className={`absolute left-0 top-full mt-1.5 ${popoverWidth} max-w-[95vw] z-50 rounded-2xl bg-[#0B1120] border border-white/15 shadow-2xl shadow-black/80 overflow-hidden backdrop-blur-2xl flex flex-col animate-in fade-in zoom-in-95 duration-100`}
        >
          {/* Search Header */}
          <div className="p-2 border-b border-white/10 bg-slate-900/90 relative flex items-center">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-4 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-950/80 border border-white/10 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-amber-400 transition-colors"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-4 text-neutral-400 hover:text-white text-xs cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-64 sm:max-h-72 overflow-y-auto overscroll-contain py-1 divide-y divide-white/5 text-xs scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center text-xs text-neutral-400 space-y-1">
                <p className="font-semibold text-neutral-300">No matching results found</p>
                <p className="text-[11px] text-neutral-500">Try searching with a different keyword</p>
              </div>
            ) : (
              Object.entries(groupedOptions).map(([groupName, groupItems]) => (
                <div key={groupName} className="py-1">
                  {groupName !== 'ungrouped' && (
                    <div className="px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-amber-400/90 bg-white/5 flex items-center justify-between">
                      <span className="truncate">{groupName}</span>
                      <span className="text-[9px] text-neutral-400 font-mono">
                        ({groupItems.length})
                      </span>
                    </div>
                  )}

                  {groupItems.map((opt) => {
                    const isSelected = opt.value === value
                    return (
                      <button
                        key={`${opt.group || 'flat'}-${opt.value}`}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-400/15 text-amber-300 font-bold'
                            : 'text-neutral-200 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-xs leading-tight">
                              {opt.label}
                            </div>
                            {opt.sublabel && (
                              <div className="text-[10px] text-neutral-400 truncate mt-0.5">
                                {opt.sublabel}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {opt.badge && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-white/10 text-neutral-300 font-mono">
                              {opt.badge}
                            </span>
                          )}
                          {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
