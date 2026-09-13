'use client'

import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Users, Check, X, UserPlus, Instagram, Mail,
  Loader2, CheckSquare, Square, Sparkles, ExternalLink
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatFollowerCount } from '@/lib/utils/follower-utils'
import { PilotCreator } from '@/components/admin/CampaignAudiencePicker'

interface PilotCreatorPickerModalProps {
  isOpen: boolean
  onClose: () => void
  initialSearch?: string
  initialResults?: PilotCreator[]
  existingUserIds: string[]
  onAddCreators: (creators: PilotCreator[]) => void
  onRemoveCreator?: (creatorId: string) => void
}

export function PilotCreatorPickerModal({
  isOpen,
  onClose,
  initialSearch = '',
  initialResults = [],
  existingUserIds = [],
  onAddCreators,
  onRemoveCreator,
}: PilotCreatorPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [creators, setCreators] = useState<PilotCreator[]>(initialResults)
  const [loading, setLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const abortControllerRef = useRef<AbortController | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sync initial search query when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialSearch)
      if (initialResults.length > 0) {
        setCreators(initialResults)
      } else if (initialSearch.trim()) {
        fetchCreators(initialSearch.trim())
      } else {
        // Fetch top recent creators if search is empty
        fetchCreators('')
      }
      setSelectedIds(new Set())
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialSearch, initialResults])

  // Fetch creators from fast search
  const fetchCreators = async (query: string) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    try {
      const url = query.trim()
        ? `/api/admin/influencers/fast-search?search=${encodeURIComponent(query.trim())}&limit=50`
        : `/api/admin/influencers/fast-search?limit=50`

      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) {
        setCreators([])
        return
      }
      const data = await res.json()

      const list: PilotCreator[] = (data.creators || []).map((inf: any) => ({
        id: inf.id,
        name: inf.name || inf.full_name || 'Creator',
        email: inf.email || '',
        instagram_username: inf.instagram_username || '',
        influencer_id: inf.influencer_id || '',
        followers: inf.followers || 0,
        avatar_url: inf.avatar_url || '',
      }))

      setCreators(list)
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Modal search error:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  // Debounced search on input change
  useEffect(() => {
    if (!isOpen) return
    const timer = setTimeout(() => {
      fetchCreators(searchQuery)
    }, 150)

    return () => clearTimeout(timer)
  }, [searchQuery, isOpen])

  // List of creators that are not yet added to campaign
  const availableCreators = useMemo(() => {
    return creators.filter(c => !existingUserIds.includes(c.id))
  }, [creators, existingUserIds])

  const toggleSelect = (creator: PilotCreator) => {
    if (existingUserIds.includes(creator.id)) return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(creator.id)) {
        next.delete(creator.id)
      } else {
        next.add(creator.id)
      }
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === availableCreators.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(availableCreators.map(c => c.id)))
    }
  }

  const handleBatchAdd = () => {
    const toAdd = creators.filter(c => selectedIds.has(c.id))
    if (toAdd.length > 0) {
      onAddCreators(toAdd)
      setSelectedIds(new Set())
      onClose()
    }
  }

  const handleSingleAdd = (creator: PilotCreator) => {
    onAddCreators([creator])
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="bg-slate-900 border border-white/15 rounded-2xl sm:rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-slate-900/90">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 text-amber-300 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  Browse & Select Pilot Creators
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
                    Pilot Testing
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Search through all creators and pick who should test this campaign before launch.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search & Actions Bar */}
          <div className="p-4 border-b border-white/10 bg-slate-950/50 space-y-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, @handle, email, or INF-XXXX..."
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                name="pilot_modal_creator_search"
                data-1p-ignore="true"
                data-lpignore="true"
                className="pl-9 pr-9 bg-slate-900/90 border-white/15 text-white h-11 text-xs rounded-xl focus-visible:ring-amber-500/50"
              />
              {loading && (
                <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400 animate-spin" />
              )}
            </div>

            {/* Quick Action Bar */}
            <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
              <div className="flex items-center gap-3">
                {availableCreators.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="flex items-center gap-1.5 text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                  >
                    {selectedIds.size === availableCreators.length ? (
                      <CheckSquare className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Square className="h-4 w-4 text-slate-500" />
                    )}
                    <span>
                      {selectedIds.size === availableCreators.length ? 'Deselect All' : `Select All (${availableCreators.length})`}
                    </span>
                  </button>
                )}
                <span className="text-slate-500 text-[11px]">
                  Found {creators.length} creators
                </span>
              </div>

              {selectedIds.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleBatchAdd}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs h-8 px-3.5 rounded-lg shadow-lg shadow-amber-500/20 gap-1.5 cursor-pointer"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Selected ({selectedIds.size}) Testers
                </Button>
              )}
            </div>
          </div>

          {/* Creators List */}
          <div className="p-4 overflow-y-auto max-h-[55vh] divide-y divide-white/5 space-y-1">
            {loading && creators.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Loader2 className="h-8 w-8 text-amber-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-400">Searching creators...</p>
              </div>
            ) : creators.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <Users className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No matching creators found</p>
                <p className="text-xs text-slate-500">Try searching with a different name, email, or handle.</p>
              </div>
            ) : (
              creators.map((creator) => {
                const isAlreadyAdded = existingUserIds.includes(creator.id)
                const isSelected = selectedIds.has(creator.id)

                return (
                  <div
                    key={creator.id}
                    onClick={() => !isAlreadyAdded && toggleSelect(creator)}
                    className={`p-3 rounded-xl flex items-center justify-between gap-3 transition-all ${
                      isAlreadyAdded
                        ? 'bg-amber-500/5 opacity-85'
                        : isSelected
                        ? 'bg-amber-500/10 border border-amber-500/30 cursor-pointer'
                        : 'hover:bg-white/5 cursor-pointer border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Checkbox (if not added yet) */}
                      {!isAlreadyAdded ? (
                        <div className="shrink-0 text-slate-400">
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-amber-400" />
                          ) : (
                            <Square className="h-4 w-4 text-slate-600" />
                          )}
                        </div>
                      ) : (
                        <div className="h-4 w-4 rounded bg-amber-500/20 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-amber-400" />
                        </div>
                      )}

                      {/* Avatar */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-inner">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.name}
                            className="h-full w-full object-cover rounded-xl"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          creator.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-white text-xs truncate">{creator.name}</p>
                          {creator.influencer_id && (
                            <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-white/10 shrink-0">
                              {creator.influencer_id}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                          {creator.instagram_username && (
                            <span className="flex items-center gap-1 text-pink-400 font-medium">
                              <Instagram className="h-3 w-3" />
                              @{creator.instagram_username}
                            </span>
                          )}
                          {creator.email && (
                            <span className="truncate text-slate-400">{creator.email}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions & Badges */}
                    <div className="flex items-center gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {creator.followers !== undefined && creator.followers > 0 && (
                        <span className="text-[10px] text-slate-400 font-medium hidden sm:inline px-2 py-0.5 rounded-full bg-slate-800 border border-white/5">
                          {formatFollowerCount(creator.followers)} followers
                        </span>
                      )}

                      {isAlreadyAdded ? (
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                            <Check className="h-3 w-3" /> Added to Pilot
                          </span>
                          {onRemoveCreator && (
                            <button
                              type="button"
                              onClick={() => onRemoveCreator(creator.id)}
                              className="text-[10px] text-red-400 hover:text-red-300 hover:underline px-1 py-0.5 cursor-pointer"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSingleAdd(creator)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold transition-all shadow-sm cursor-pointer"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          + Add Tester
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-3.5 sm:p-4 border-t border-white/10 bg-slate-950/80 flex items-center justify-between text-xs text-slate-400">
            <span>
              Already Added: <strong className="text-amber-300">{existingUserIds.length}</strong> testers
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-white/10 text-slate-300 hover:bg-white/5 h-8 text-xs cursor-pointer"
            >
              Done / Close
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
