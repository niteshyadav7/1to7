'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Globe, FlaskConical, Search, Users, Check, X, AlertCircle,
  Sparkles, Trash2, UserPlus, Instagram, Mail, Loader2, ShieldCheck,
  Clock, ExternalLink, SlidersHorizontal
} from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { formatFollowerCount } from '@/lib/utils/follower-utils'
import { PilotCreatorPickerModal } from '@/components/admin/PilotCreatorPickerModal'

export interface PilotCreator {
  id: string
  name: string
  email?: string
  instagram_username?: string
  influencer_id?: string
  followers?: number
  avatar_url?: string
}

export interface CampaignAudiencePickerProps {
  isTestMode: boolean
  testUserIds: string[]
  testCreators: PilotCreator[]
  onChange: (updates: {
    is_test_mode: boolean
    test_user_ids: string[]
    test_creators: PilotCreator[]
  }) => void
}

const RECENT_TESTERS_STORAGE_KEY = 'pilot_recent_creators_v1'

export default function CampaignAudiencePicker({
  isTestMode = false,
  testUserIds = [],
  testCreators = [],
  onChange,
}: CampaignAudiencePickerProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<PilotCreator[]>([])
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [recentCreators, setRecentCreators] = useState<PilotCreator[]>([])

  const searchContainerRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const searchCacheRef = useRef<Map<string, PilotCreator[]>>(new Map())

  // ─── 1. Load Recent Testers (from LocalStorage & Fast-Search API) ───
  useEffect(() => {
    if (!isTestMode) return

    // 1. Try local storage first for instant display
    try {
      const stored = localStorage.getItem(RECENT_TESTERS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRecentCreators(parsed)
        }
      }
    } catch (e) {
      console.warn('Failed to parse recent creators from localStorage:', e)
    }

    // 2. Fetch recent pilot creators from campaigns table via fast-search API
    fetch('/api/admin/influencers/fast-search?recent=true&limit=10')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && Array.isArray(data.recentCreators) && data.recentCreators.length > 0) {
          setRecentCreators(prev => {
            const map = new Map<string, PilotCreator>()
            // Add server recent creators
            data.recentCreators.forEach((c: PilotCreator) => map.set(c.id, c))
            // Merge with existing
            prev.forEach(c => map.set(c.id, c))
            const merged = Array.from(map.values()).slice(0, 15)
            try {
              localStorage.setItem(RECENT_TESTERS_STORAGE_KEY, JSON.stringify(merged))
            } catch (err) {}
            return merged
          })
        }
      })
      .catch(err => {
        console.warn('Could not fetch recent testers from server:', err)
      })
  }, [isTestMode])

  // Helper to persist added creators to recent list
  const saveToRecent = useCallback((creatorsToAdd: PilotCreator[]) => {
    setRecentCreators(prev => {
      const map = new Map<string, PilotCreator>()
      creatorsToAdd.forEach(c => map.set(c.id, c))
      prev.forEach(c => map.set(c.id, c))
      const updated = Array.from(map.values()).slice(0, 15)
      try {
        localStorage.setItem(RECENT_TESTERS_STORAGE_KEY, JSON.stringify(updated))
      } catch (e) {}
      return updated
    })
  }, [])

  // ─── 2. Ultra-Fast Debounced Search with In-Memory Cache & AbortController ───
  useEffect(() => {
    const q = searchQuery.trim()
    if (!isTestMode || !q || q.length < 1) {
      setSearchResults([])
      setSearching(false)
      return
    }

    // Check memory cache for instant 0ms result
    if (searchCacheRef.current.has(q.toLowerCase())) {
      setSearchResults(searchCacheRef.current.get(q.toLowerCase())!)
      setIsDropdownOpen(true)
      setSearching(false)
      return
    }

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    const controller = new AbortController()
    abortControllerRef.current = controller

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `/api/admin/influencers/fast-search?search=${encodeURIComponent(q)}&limit=10`,
          { signal: controller.signal }
        )
        if (!res.ok) {
          setSearchResults([])
          return
        }
        const data = await res.json()
        const creators: PilotCreator[] = (data.creators || []).map((inf: any) => ({
          id: inf.id,
          name: inf.name || inf.full_name || 'Unnamed Creator',
          email: inf.email || '',
          instagram_username: inf.instagram_username || '',
          influencer_id: inf.influencer_id || '',
          followers: inf.followers || 0,
          avatar_url: inf.avatar_url || '',
        }))

        searchCacheRef.current.set(q.toLowerCase(), creators)
        setSearchResults(creators)
        setIsDropdownOpen(true)
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Creator search error:', err)
          setSearchResults([])
        }
      } finally {
        setSearching(false)
      }
    }, 150) // Ultra-snappy 150ms debounce

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [searchQuery, isTestMode])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleModeChange = (pilotMode: boolean) => {
    onChange({
      is_test_mode: pilotMode,
      test_user_ids: pilotMode ? testUserIds : [],
      test_creators: pilotMode ? testCreators : [],
    })
  }

  const handleAddCreator = (creator: PilotCreator) => {
    if (testUserIds.includes(creator.id)) return

    const updatedIds = [...testUserIds, creator.id]
    const updatedCreators = [...testCreators, creator]

    onChange({
      is_test_mode: true,
      test_user_ids: updatedIds,
      test_creators: updatedCreators,
    })

    saveToRecent([creator])
    setSearchQuery('')
    setIsDropdownOpen(false)
  }

  const handleBatchAddCreators = (creatorsToAdd: PilotCreator[]) => {
    const newItems = creatorsToAdd.filter(c => !testUserIds.includes(c.id))
    if (newItems.length === 0) return

    const updatedIds = [...testUserIds, ...newItems.map(c => c.id)]
    const updatedCreators = [...testCreators, ...newItems]

    onChange({
      is_test_mode: true,
      test_user_ids: updatedIds,
      test_creators: updatedCreators,
    })

    saveToRecent(newItems)
    setSearchQuery('')
    setIsDropdownOpen(false)
  }

  const handleRemoveCreator = (creatorId: string) => {
    const updatedIds = testUserIds.filter(id => id !== creatorId)
    const updatedCreators = testCreators.filter(c => c.id !== creatorId)

    onChange({
      is_test_mode: isTestMode,
      test_user_ids: updatedIds,
      test_creators: updatedCreators,
    })
  }

  const handleClearAll = () => {
    onChange({
      is_test_mode: isTestMode,
      test_user_ids: [],
      test_creators: [],
    })
  }

  // Quick-Add all recent creators not yet added
  const unaddedRecentCreators = useMemo(() => {
    return recentCreators.filter(c => !testUserIds.includes(c.id))
  }, [recentCreators, testUserIds])

  const handleAddAllRecent = () => {
    if (unaddedRecentCreators.length === 0) return
    handleBatchAddCreators(unaddedRecentCreators)
  }

  return (
    <div className={`rounded-2xl border border-white/10 bg-slate-900/60 p-5 shadow-xl backdrop-blur-xl space-y-5 transition-all ${
      isDropdownOpen ? 'relative z-50' : 'relative z-10'
    }`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Audience & Campaign Visibility
              {isTestMode ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider flex items-center gap-1">
                  <FlaskConical className="h-3 w-3" /> Pilot Mode
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Public Live
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Decide whether to launch directly to all platform creators or test first with designated pilot creators.
            </p>
          </div>
        </div>
      </div>

      {/* Segmented Audience Mode Selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Option A: Public Live */}
        <button
          type="button"
          onClick={() => handleModeChange(false)}
          className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
            !isTestMode
              ? 'border-emerald-500/50 bg-emerald-500/10 shadow-lg shadow-emerald-500/10 ring-1 ring-emerald-500/30'
              : 'border-white/5 bg-slate-950/40 hover:bg-slate-800/40 text-slate-400 hover:border-white/10'
          }`}
        >
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            !isTestMode
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-inner'
              : 'bg-slate-800 text-slate-400 border-white/5'
          }`}>
            <Globe className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${!isTestMode ? 'text-white' : 'text-slate-300'}`}>
                Public Campaign (All Creators)
              </span>
              {!isTestMode && <Check className="h-4 w-4 text-emerald-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Open to all creators on the platform who meet your target follower and location requirements.
            </p>
          </div>
        </button>

        {/* Option B: Pre-Launch Pilot Mode */}
        <button
          type="button"
          onClick={() => handleModeChange(true)}
          className={`flex items-start gap-3.5 p-4 rounded-xl border text-left transition-all cursor-pointer ${
            isTestMode
              ? 'border-amber-500/50 bg-amber-500/10 shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/30'
              : 'border-white/5 bg-slate-950/40 hover:bg-slate-800/40 text-slate-400 hover:border-white/10'
          }`}
        >
          <div className={`p-2.5 rounded-xl border shrink-0 ${
            isTestMode
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40 shadow-inner'
              : 'bg-slate-800 text-slate-400 border-white/5'
          }`}>
            <FlaskConical className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold ${isTestMode ? 'text-white' : 'text-slate-300'}`}>
                Pre-Launch Pilot Mode (Specific Creators)
              </span>
              {isTestMode && <Check className="h-4 w-4 text-amber-400 shrink-0" />}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Strictly hidden from public feed. Only chosen test accounts can view, test custom forms, and submit applications.
            </p>
          </div>
        </button>
      </div>

      {/* Pilot Mode Configuration Panel */}
      <AnimatePresence>
        {isTestMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4 pt-2"
          >
            {/* Informational Guidance Box */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-300">
              <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-200">Private Pilot Testing Environment Active</p>
                <p className="text-[11px] text-amber-300/80 leading-relaxed">
                  Add team member or designated creator accounts below. Once you verify the entire flow (questions, orders, payment requests), you can launch to all creators with 1 click!
                </p>
              </div>
            </div>

            {/* ⚡ Quick-Add Previously Used Testers */}
            {recentCreators.length > 0 && (
              <div className="p-3 rounded-xl bg-slate-950/70 border border-amber-500/20 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-amber-400" />
                    Previously Used Pilot Testers
                  </span>
                  {unaddedRecentCreators.length > 0 && (
                    <button
                      type="button"
                      onClick={handleAddAllRecent}
                      className="text-[11px] font-extrabold text-amber-300 hover:text-amber-200 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      <Sparkles className="h-3 w-3 text-amber-400" />
                      ⚡ Add All Recent ({unaddedRecentCreators.length})
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {recentCreators.slice(0, 10).map((creator) => {
                    const isAdded = testUserIds.includes(creator.id)
                    return (
                      <button
                        key={creator.id}
                        type="button"
                        onClick={() => {
                          if (!isAdded) handleAddCreator(creator)
                        }}
                        disabled={isAdded}
                        className={`text-[11px] px-2.5 py-1 rounded-lg border flex items-center gap-1.5 transition-all ${
                          isAdded
                            ? 'bg-amber-500/10 text-amber-300/60 border-amber-500/20 cursor-default'
                            : 'bg-slate-900/90 hover:bg-slate-800 text-slate-200 border-white/10 hover:border-amber-400/40 cursor-pointer shadow-sm hover:scale-[1.02]'
                        }`}
                      >
                        {isAdded ? (
                          <Check className="h-3 w-3 text-amber-400" />
                        ) : (
                          <UserPlus className="h-3 w-3 text-indigo-400" />
                        )}
                        <span className="font-medium">{creator.name}</span>
                        {creator.influencer_id && (
                          <span className="text-[9px] text-slate-400 font-mono">
                            {creator.influencer_id}
                          </span>
                        )}
                        {isAdded && (
                          <span className="text-[9px] text-amber-400 font-bold uppercase ml-0.5">Added</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Creator Search & Selector */}
            <div className="space-y-1.5" ref={searchContainerRef}>
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-300 flex items-center gap-2">
                  <span>Search & Add Pilot Creators</span>
                </Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors cursor-pointer hover:underline"
                  >
                    <SlidersHorizontal className="h-3 w-3" />
                    Browse All Creators in Modal
                  </button>
                </div>
              </div>

              <div className={`relative ${isDropdownOpen ? 'z-[60]' : ''}`}>
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (searchResults.length > 0) setIsDropdownOpen(true)
                  }}
                  placeholder="Type name, @instagram, email, or INF-XXXX..."
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  name="pilot_creator_search_prevent_autofill"
                  data-1p-ignore="true"
                  data-lpignore="true"
                  className="pl-9 pr-9 bg-slate-950/70 border-white/10 text-white h-10 text-xs rounded-xl focus-visible:ring-amber-500/50"
                />
                {searching && (
                  <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-400 animate-spin" />
                )}

                {/* Autocomplete Dropdown */}
                {isDropdownOpen && searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 z-[100] bg-slate-900/98 backdrop-blur-2xl border border-white/20 rounded-2xl shadow-2xl shadow-black/95 overflow-hidden flex flex-col ring-1 ring-amber-500/30">
                    {/* Dropdown Header */}
                    <div className="px-3.5 py-2 bg-slate-950/90 border-b border-white/10 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
                      <span>
                        Found <strong className="text-amber-300">{searchResults.length}</strong> creators matching &quot;{searchQuery}&quot;
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        5 visible • Scroll for more
                      </span>
                    </div>

                    {/* Scrollable List - Sized for 5 visible users */}
                    <div className="max-h-[360px] sm:max-h-[390px] overflow-y-auto divide-y divide-white/5">
                      {searchResults.map((creator) => {
                        const isAlreadySelected = testUserIds.includes(creator.id)
                        return (
                          <div
                            key={creator.id}
                            onClick={() => {
                              if (!isAlreadySelected) handleAddCreator(creator)
                            }}
                            className={`p-2.5 sm:p-3 flex items-center justify-between gap-3 transition-colors text-xs ${
                              isAlreadySelected
                                ? 'bg-amber-500/5 text-slate-400 cursor-not-allowed'
                                : 'hover:bg-white/5 cursor-pointer text-slate-200'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Avatar */}
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs shadow-inner">
                                {creator.avatar_url ? (
                                  <img
                                    src={creator.avatar_url}
                                    alt={creator.name}
                                    className="h-full w-full object-cover rounded-full"
                                    onError={(e) => {
                                      ;(e.target as HTMLElement).style.display = 'none'
                                    }}
                                  />
                                ) : (
                                  creator.name.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-white truncate">{creator.name}</p>
                                  {creator.influencer_id && (
                                    <span className="font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-white/10 shrink-0">
                                      {creator.influencer_id}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                  {creator.instagram_username && (
                                    <span className="flex items-center gap-1 text-pink-400">
                                      <Instagram className="h-3 w-3" />
                                      @{creator.instagram_username}
                                    </span>
                                  )}
                                  {creator.email && (
                                    <span className="truncate">{creator.email}</span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {creator.followers !== undefined && creator.followers > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                                  {formatFollowerCount(creator.followers)}
                                </span>
                              )}
                              {isAlreadySelected ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                                  <Check className="h-3 w-3" /> Added
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-all shadow-sm">
                                  <UserPlus className="h-3 w-3" /> Add Tester
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer: Open Modal for All Results */}
                    <div className="p-2.5 bg-slate-950/90 flex items-center justify-between text-xs border-t border-white/10 shrink-0">
                      <span className="text-[11px] text-slate-400">
                        Showing {Math.min(searchResults.length, 10)} of {searchResults.length} matches
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setIsDropdownOpen(false)
                          setIsModalOpen(true)
                        }}
                        className="text-[11px] font-bold text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        View all in popup modal →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selected Pilot Creators List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-amber-400" />
                  Selected Pilot Creators ({testCreators.length})
                </span>
                {testCreators.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-[11px] text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Clear All
                  </button>
                )}
              </div>

              {testCreators.length === 0 ? (
                <div className="p-4 rounded-xl border border-dashed border-amber-500/30 bg-amber-500/5 text-center space-y-1">
                  <FlaskConical className="h-6 w-6 text-amber-400 mx-auto opacity-70" />
                  <p className="text-xs font-semibold text-amber-200">No test creators added yet</p>
                  <p className="text-[11px] text-slate-400">
                    Use the search bar above or choose from previously used testers to add creators.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {testCreators.map((creator) => (
                    <div
                      key={creator.id}
                      className="p-2.5 rounded-xl border border-white/10 bg-slate-950/60 flex items-center justify-between gap-2.5 hover:border-amber-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold text-xs shadow-inner">
                          {creator.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{creator.name}</p>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            {creator.instagram_username ? (
                              <span className="text-pink-400 truncate">@{creator.instagram_username}</span>
                            ) : creator.influencer_id ? (
                              <span className="font-mono text-slate-400">{creator.influencer_id}</span>
                            ) : (
                              <span className="truncate">{creator.email}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCreator(creator.id)}
                        title={`Remove ${creator.name} from pilot`}
                        className="h-7 w-7 rounded-lg bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center cursor-pointer shrink-0"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Popup Modal for "Show All" / Browse Creators */}
      <PilotCreatorPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialSearch={searchQuery}
        initialResults={searchResults}
        existingUserIds={testUserIds}
        onAddCreators={handleBatchAddCreators}
        onRemoveCreator={handleRemoveCreator}
      />
    </div>
  )
}
