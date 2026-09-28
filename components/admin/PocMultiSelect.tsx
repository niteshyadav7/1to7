'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Check, ChevronsUpDown, X, Search, UserCheck, Shield, Sparkles } from 'lucide-react'

export interface PocStaff {
  id: string
  name: string
  email: string
  role: string
  roleDisplayName: string
  avatarUrl: string | null
}

interface PocMultiSelectProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
  disabled?: boolean
  label?: string
  placeholder?: string
}

export function PocMultiSelect({
  selectedIds = [],
  onChange,
  disabled = false,
  label = 'Assign Point of Contact (POC)',
  placeholder = 'Select one or more Operations Admins...',
}: PocMultiSelectProps) {
  const [open, setOpen] = useState(false)
  const [staffList, setStaffList] = useState<PocStaff[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    async function fetchPocs() {
      try {
        setLoading(true)
        const res = await fetch('/api/admin/staff/poc-list')
        if (res.ok) {
          const data = await res.json()
          if (isMounted && Array.isArray(data.pocs)) {
            setStaffList(data.pocs)
          }
        }
      } catch (err) {
        console.error('Failed to load POC list:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    fetchPocs()
    return () => {
      isMounted = false
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open])

  const toggleSelect = (id: string) => {
    if (disabled) return
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(item => item !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  const removeId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onChange(selectedIds.filter(item => item !== id))
  }

  const selectAllOperations = () => {
    if (disabled) return
    const opAdminIds = staffList.filter(s => s.role === 'admin').map(s => s.id)
    const combined = Array.from(new Set([...selectedIds, ...opAdminIds]))
    onChange(combined)
  }

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (disabled) return
    onChange([])
  }

  const filteredStaff = staffList.filter(staff => {
    const q = searchQuery.toLowerCase()
    return (
      staff.name.toLowerCase().includes(q) ||
      staff.email.toLowerCase().includes(q) ||
      staff.roleDisplayName.toLowerCase().includes(q)
    )
  })

  const selectedStaffMembers = staffList.filter(s => selectedIds.includes(s.id))

  // Color generator for avatar initials
  const getInitialsBg = (name: string) => {
    const colors = [
      'from-blue-600 to-indigo-600',
      'from-emerald-600 to-teal-600',
      'from-purple-600 to-pink-600',
      'from-amber-600 to-orange-600',
      'from-cyan-600 to-blue-600',
      'from-rose-600 to-pink-600',
    ]
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="space-y-2 relative" ref={containerRef}>
      {/* Label and Selected Count Header */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5 text-blue-400" />
          {label}
          <span className="text-[10px] text-slate-500 font-normal ml-1">
            (Operations Admins responsible for this campaign)
          </span>
        </label>
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className="text-[11px] text-slate-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer"
          >
            Clear selection ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Trigger Box / Selected Badges Display */}
      <div
        onClick={() => !disabled && setOpen(!open)}
        className={`w-full min-h-[46px] px-3 py-2 bg-slate-900/60 border rounded-xl text-left transition-all cursor-pointer flex flex-wrap items-center gap-1.5 ${
          open
            ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg shadow-blue-500/10'
            : 'border-white/[0.08] hover:border-white/[0.16]'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        {selectedStaffMembers.length === 0 ? (
          <div className="flex items-center justify-between w-full text-sm text-slate-500">
            <span>{loading ? 'Loading team members...' : placeholder}</span>
            <ChevronsUpDown className="w-4 h-4 text-slate-500 shrink-0" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-1.5 flex-1 pr-2">
              {selectedStaffMembers.map(staff => (
                <span
                  key={staff.id}
                  className="inline-flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs font-medium shadow-sm animate-in fade-in zoom-in-95 duration-150"
                >
                  <span
                    className={`w-4 h-4 rounded-full bg-gradient-to-br ${getInitialsBg(
                      staff.name
                    )} text-white text-[9px] font-bold flex items-center justify-center shrink-0`}
                  >
                    {staff.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate max-w-[120px]">{staff.name}</span>
                  {!disabled && (
                    <button
                      type="button"
                      onClick={e => removeId(staff.id, e)}
                      className="text-blue-400/70 hover:text-blue-200 transition-colors p-0.5 rounded-full hover:bg-blue-500/20"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
            </div>
            <ChevronsUpDown className="w-4 h-4 text-slate-500 shrink-0 ml-auto" />
          </>
        )}
      </div>

      {/* Floating Dropdown Popover */}
      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-2 bg-slate-900 border border-white/[0.12] rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Bar */}
          <div className="p-2.5 border-b border-white/[0.08] bg-slate-950/40">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or role..."
                className="w-full pl-8.5 pr-3 py-1.5 bg-slate-800/80 border border-white/[0.06] rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="px-3 py-1.5 border-b border-white/[0.06] bg-slate-900/50 flex items-center justify-between text-[11px] text-slate-400">
            <span>Select team members:</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectAllOperations}
                className="text-blue-400 hover:text-blue-300 transition-colors font-medium flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Select All Ops
              </button>
              {selectedIds.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-slate-400 hover:text-red-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Staff List */}
          <div className="max-h-60 overflow-y-auto p-1 divide-y divide-white/[0.03]">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500">Loading team members...</div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                {searchQuery ? 'No team members matching search' : 'No staff found'}
              </div>
            ) : (
              filteredStaff.map(staff => {
                const isSelected = selectedIds.includes(staff.id)
                return (
                  <div
                    key={staff.id}
                    onClick={() => toggleSelect(staff.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-500/10 text-white'
                        : 'hover:bg-slate-800/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {/* Avatar Initials */}
                      <div
                        className={`w-7 h-7 rounded-full bg-gradient-to-br ${getInitialsBg(
                          staff.name
                        )} text-white text-xs font-bold flex items-center justify-center shrink-0 shadow-sm`}
                      >
                        {staff.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold truncate text-white">{staff.name}</p>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-semibold uppercase tracking-wider ${
                              staff.role === 'super_admin'
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20'
                                : staff.role === 'admin'
                                ? 'bg-blue-500/15 text-blue-300 border border-blue-500/20'
                                : 'bg-slate-700/50 text-slate-400'
                            }`}
                          >
                            {staff.roleDisplayName}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate">{staff.email}</p>
                      </div>
                    </div>

                    {/* Checkbox indicator */}
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-white/20 bg-slate-800/50'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer note */}
          <div className="p-2 border-t border-white/[0.06] bg-slate-950/60 text-[10px] text-slate-400 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-slate-500 shrink-0" />
            <span>Assigned POCs will be credited for campaign milestones & performance analytics.</span>
          </div>
        </div>
      )}
    </div>
  )
}
