'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Plus, BookmarkPlus, Check, Loader2, Sparkles, FolderPlus, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SampleList } from '@/types/sample-roster'

interface CreatorTarget {
  id: string
  full_name: string
  instagram_username?: string | null
  followers?: number | null
  city?: string | null
  state?: string | null
  category?: string | null
  profile_photo?: string | null
  instagram_profile_pic?: string | null
}

interface AddToSampleListModalProps {
  isOpen: boolean
  creator: CreatorTarget | null
  onClose: () => void
  onSuccess?: (listTitle: string) => void
}

export function AddToSampleListModal({
  isOpen,
  creator,
  onClose,
  onSuccess,
}: AddToSampleListModalProps) {
  const [lists, setLists] = useState<SampleList[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Mode: select existing or create new
  const [showCreateNew, setShowCreateNew] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBrand, setNewBrand] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchLists()
      setShowCreateNew(false)
      setNewTitle('')
      setNewBrand('')
    }
  }, [isOpen])

  const fetchLists = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/sample-lists?status=active')
      const data = await res.json()
      if (res.ok) {
        setLists(data.lists || [])
      }
    } catch {
      // Non-fatal fallback
    } finally {
      setLoading(false)
    }
  }

  const handleAddToList = async (listId: string, listTitle: string) => {
    if (!creator) return
    setSubmittingId(listId)

    try {
      const res = await fetch('/api/admin/sample-lists/add-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sample_list_id: listId,
          user_id: creator.id,
          creator_name: creator.full_name,
          instagram_username: creator.instagram_username || creator.full_name,
          followers: creator.followers || 0,
          city: creator.city || creator.state || null,
          niche: creator.category || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add creator')

      if (data.alreadyExists) {
        toast.info(data.message)
      } else {
        toast.success(data.message || `Added to "${listTitle}"!`)
        onSuccess?.(listTitle)
      }
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to add creator to roster')
    } finally {
      setSubmittingId(null)
    }
  }

  const handleCreateAndAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!creator) return
    if (!newTitle.trim()) {
      return toast.error('Please enter a roster title')
    }

    setIsCreating(true)
    try {
      const res = await fetch('/api/admin/sample-lists/add-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_list_title: newTitle.trim(),
          new_list_brand_name: newBrand.trim() || 'General Pitch',
          user_id: creator.id,
          creator_name: creator.full_name,
          instagram_username: creator.instagram_username || creator.full_name,
          followers: creator.followers || 0,
          city: creator.city || creator.state || null,
          niche: creator.category || null,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create roster')

      toast.success(data.message || `Created roster and added ${creator.full_name}!`)
      onSuccess?.(data.list_title || newTitle)
      onClose()
    } catch (err: any) {
      toast.error(err.message || 'Failed to create and add')
    } finally {
      setIsCreating(false)
    }
  }

  if (!isOpen || !creator) return null

  const filteredLists = lists.filter(
    (l) =>
      l.title.toLowerCase().includes(search.toLowerCase()) ||
      l.brand_name.toLowerCase().includes(search.toLowerCase()) ||
      (l.category_niche && l.category_niche.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-slate-900 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 text-white overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30">
                <BookmarkPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add to Sample Roster</h3>
                <p className="text-xs text-slate-400">Curate creators for brand pitches & sample decks</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Creator Mini-Card */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-white/10 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 font-bold flex items-center justify-center border border-purple-500/30 shrink-0 text-sm overflow-hidden">
              {creator.profile_photo || creator.instagram_profile_pic ? (
                <img
                  src={creator.profile_photo || creator.instagram_profile_pic}
                  alt={creator.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLElement).style.display = 'none'
                  }}
                />
              ) : (
                creator.full_name?.charAt(0)?.toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white truncate">{creator.full_name}</h4>
              <p className="text-xs text-pink-400 truncate">
                @{creator.instagram_username || 'n/a'}{' '}
                <span className="text-slate-400">• {(creator.followers || 0).toLocaleString()} followers</span>
                {creator.city && <span className="text-slate-400"> • {creator.city}</span>}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-slate-300">
              {showCreateNew ? 'Create New Sample List' : 'Select Target Sample Roster'}
            </span>
            <button
              type="button"
              onClick={() => setShowCreateNew(!showCreateNew)}
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              {showCreateNew ? (
                '← Pick existing roster'
              ) : (
                <>
                  <Plus className="h-3.5 w-3.5" />
                  <span>Create new roster</span>
                </>
              )}
            </button>
          </div>

          {showCreateNew ? (
            /* Create New Roster Form */
            <form onSubmit={handleCreateAndAdd} className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Roster Title *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Q4 Festive Beauty Pitch"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Target Brand Name (Optional)
                </label>
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="e.g. Mamaearth, Nykaa, or General"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateNew(false)}
                  className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white border border-white/10"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white flex items-center gap-1.5 shadow-lg shadow-purple-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Creating & Adding...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      Create & Add Creator
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Existing Rosters List */
            <div className="space-y-2">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search existing sample rosters by brand or title..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {loading ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                    <span>Loading active rosters...</span>
                  </div>
                ) : filteredLists.length === 0 ? (
                  <div className="py-8 text-center space-y-2">
                    <FolderPlus className="h-8 w-8 text-slate-600 mx-auto" />
                    <p className="text-xs text-slate-400">
                      {search ? 'No matching rosters found' : 'No active sample rosters created yet'}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowCreateNew(true)}
                      className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                    >
                      + Create the first roster
                    </button>
                  </div>
                ) : (
                  filteredLists.map((list) => {
                    const isSubmitting = submittingId === list.id
                    return (
                      <button
                        key={list.id}
                        type="button"
                        disabled={Boolean(submittingId)}
                        onClick={() => handleAddToList(list.id, list.title)}
                        className="w-full text-left p-2.5 rounded-xl bg-slate-950/60 hover:bg-purple-950/30 border border-white/5 hover:border-purple-500/30 transition-all flex items-center justify-between group cursor-pointer disabled:opacity-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                            {list.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-slate-500" />
                              {list.brand_name}
                            </span>
                            <span>•</span>
                            <span>{list.items_count || 0} creators</span>
                            {list.category_niche && (
                              <>
                                <span>•</span>
                                <span className="text-pink-400">{list.category_niche}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="pl-3 shrink-0">
                          {isSubmitting ? (
                            <Loader2 className="h-4 w-4 animate-spin text-purple-400" />
                          ) : (
                            <div className="p-1 rounded-lg bg-white/5 group-hover:bg-purple-600 group-hover:text-white text-slate-400 transition-colors">
                              <Plus className="h-3.5 w-3.5" />
                            </div>
                          )}
                        </div>
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default AddToSampleListModal
